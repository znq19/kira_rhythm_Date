from __future__ import annotations

import inspect
import random

from core.adapter import IMCapability

from .models import KRDError
from .store import Store


class SessionPolicy:
    def __init__(self, store: Store, ctx):
        self.store = store
        self.ctx = ctx
        self.rng = random.Random()

    async def _im_sessions(self) -> list:
        getter = self.ctx.session_mgr.get_sessions
        try:
            parameters = inspect.signature(getter).parameters.values()
            supports_kind = any(param.name == "kind" or param.kind is inspect.Parameter.VAR_KEYWORD
                                for param in parameters)
        except (TypeError, ValueError):
            supports_kind = False
        if supports_kind:
            sessions = await getter(include_content=False, kind="im")
        else:
            # KiraAI 3.1.2 has get_sessions(*, include_content=True) only.
            sessions = await getter(include_content=False)
        result = []
        for session in sessions:
            parts = str(getattr(session, "sid", "")).split(":", 2)
            if len(parts) == 3 and parts[1] in {"dm", "gm"}:
                result.append(session)
        return result

    async def session_catalog(self, persona_id: str | None = None) -> list[dict[str, str]]:
        """Every IM session, before access or pool filters.

        The WebUI needs the full list so a blacklist can be edited (denied
        sessions must stay visible) and sessions can be added to a pool.
        """
        sessions = await self._im_sessions()
        return [{"sid": session.sid, "title": session.session_title or session.sid,
                 "adapter": session.adapter_name} for session in sessions]

    async def session_options(self, persona_id: str, kind: str = "execution", *,
                              config: dict | None = None) -> list[dict[str, str]]:
        config = config or await self.store.get_config(persona_id)
        sessions = await self._im_sessions()
        access = config["session_access"]
        listed = {str(v) for v in access.get("sessions", [])}
        pool = config[f"{kind}_pool"].get("sessions", [])
        pool_set = {str(v.get("sid") if isinstance(v, dict) else v) for v in pool}
        result = []
        for session in sessions:
            sid = session.sid
            if access["mode"] == "allow_list" and sid not in listed:
                continue
            if access["mode"] == "deny_list" and sid in listed:
                continue
            if pool_set and sid not in pool_set:
                continue
            result.append({"sid": sid, "title": session.session_title or sid, "adapter": session.adapter_name})
        return result

    async def is_allowed(self, persona_id: str, sid: str, kind: str = "execution", *, config: dict | None = None) -> bool:
        return any(item["sid"] == sid for item in await self.session_options(persona_id, kind, config=config))

    async def check_adapter_permission(self, sid: str) -> tuple[bool, str]:
        parts = sid.split(":", 2)
        if len(parts) != 3 or parts[1] not in {"dm", "gm"}:
            return False, "invalid_session"
        adapter = self.ctx.adapter_mgr.get_adapter(parts[0])
        if adapter is None or not getattr(adapter, "is_running", True):
            return False, "adapter_offline"
        try:
            capability = adapter.get_capability(IMCapability)
            permission = "im.direct.receive" if parts[1] == "dm" else "im.group.receive"
            allowed = capability.is_allowed(parts[2], permission=permission)
        except (AttributeError, ValueError):
            # Metadata is checked when constructing the event; a missing optional ACL
            # method is not treated as permission to bypass a framework adapter.
            allowed = True
        return (bool(allowed), "ok" if allowed else "adapter_denied")

    async def require_target(self, persona_id: str, target: str, kind: str = "execution", *,
                             options: list[dict[str, str]] | None = None, config: dict | None = None) -> str:
        if not target or target in {"pool", "auto", f"pool:{kind}"}:
            selected = await self.select_session(persona_id, kind, options=options, config=config)
            if not selected:
                raise KRDError("no_available_session", "No session is available for this persona and pool")
            return selected
        allowed = (any(item["sid"] == target for item in options) if options is not None else
                   await self.is_allowed(persona_id, target, kind, config=config))
        if not allowed:
            raise KRDError("session_denied", f"Session is not allowed: {target}")
        return target

    async def select_session(self, persona_id: str, kind: str, *, options: list[dict[str, str]] | None = None,
                             config: dict | None = None) -> str | None:
        options = await self.session_options(persona_id, kind, config=config) if options is None else options
        if not options:
            return None
        config = config or await self.store.get_config(persona_id)
        strategy = config[f"{kind}_pool"].get("strategy", "pure_random")
        state = await self.store.pool_state(persona_id, kind)
        sids = [item["sid"] for item in options]
        selected = None
        if strategy == "pure_random":
            selected = self.rng.choice(sids)
        elif strategy == "no_immediate_repeat":
            previous = state.get("last")
            candidates = [sid for sid in sids if sid != previous] or sids
            selected = self.rng.choice(candidates)
        elif strategy == "shuffle_bag":
            bag = [sid for sid in state.get("bag", []) if sid in sids]
            if not bag:
                bag = list(sids)
                self.rng.shuffle(bag)
            selected = bag.pop()
            state["bag"] = bag
        elif strategy == "round_robin":
            index = int(state.get("index", 0))
            selected = sids[index % len(sids)]
            state["index"] = index + 1
        elif strategy == "weighted_random":
            raw = config[f"{kind}_pool"].get("sessions", [])
            weights = []
            for sid in sids:
                entry = next((v for v in raw if isinstance(v, dict) and v.get("sid") == sid), None)
                weights.append(max(0.0, float((entry or {}).get("weight", 1))))
            if not any(weights):
                raise KRDError("invalid_weights", "At least one session weight must be positive")
            selected = self.rng.choices(sids, weights=weights, k=1)[0]
        state["last"] = selected
        await self.store.save_pool_state(persona_id, kind, state)
        return selected

    def timezone_name(self, config: dict) -> str:
        configured = config.get("timezone", "system")
        if configured != "system":
            return configured
        getter = getattr(self.ctx, "get_timezone", None)
        value = getter() if getter else None
        return getattr(value, "key", None) or (str(value) if value else "Asia/Shanghai")

    async def supported_elements(self, adapter_name: str) -> list[str]:
        adapter = self.ctx.adapter_mgr.get_adapter(adapter_name)
        if adapter is None:
            raise KRDError("adapter_offline", f"Adapter is unavailable: {adapter_name}")
        try:
            capability = adapter.get_capability(IMCapability)
            metadata = await capability.get_message_metadata()
            return list(metadata.supported_elements)
        except (AttributeError, ValueError):
            return ["text"]
