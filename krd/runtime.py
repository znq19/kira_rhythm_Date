from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

from core.plugin import logger
from core.prompt_manager import Prompt
from core.provider import LLMRequest

from .context import ContextBuilder
from .hygiene import MemoryHygiene
from .plans import PlanService
from .policy import SessionPolicy
from .scheduler import Scheduler
from .store import Store
from .threads import ThreadService

STATIC_TOOL_GUIDE = """
[KRD 生活节律]

工具：rhythm_plan 创建/修订计划；rhythm_update 改日程/DayState/目标/梦与体验；rhythm_view 查询。
计划用 plans:[{date,title,items:[...]}]；items 扁平，block 为分组名（同名归组），时间 at 或 start/end（HH:MM[:SS]），不嵌套 blocks/schedule；规划优先 focus.date。
修订已有计划必须带 plans[].expected_revision=current_plan.revision，不重复新建；带 items[].id 可保留身份与采样。
有 threads_requiring_response 时先逐条 thread_response（advance/defer/waiting/no_change + 依据）；只有 threads_reference 时不要求。
普通响应即触发，<msg/> 合法；只执行 current_item.instruction；回顾非强制，不要为检查制造修改。
目标层启用时用 thread_add/thread_touch（执行小项带 item_id）；梦/体验用 record_experience 记录；遵守权限、数量、概率、日型、禁止/安静/必需覆盖规则。
[KRD Threads]/[KRD Agenda] 只读，#后8位短 ID 可直接给 rhythm_view/rhythm_update；Agenda 的 -> 是目标会话。
""".strip()


class Runtime:
    def __init__(self, ctx, data_dir: Path, debug: bool = False, plugin_cfg: dict | None = None):
        self.ctx = ctx
        self.data_dir = Path(data_dir)
        self.debug = debug
        self.plugin_cfg = plugin_cfg or {}
        self.store = Store(self.data_dir / "rhythm.db")
        self.policy = SessionPolicy(self.store, ctx)
        self.plans = PlanService(self.store, self.policy)
        self.threads = ThreadService(self.store, self.policy)
        self.plans.threads = self.threads
        self.hygiene = MemoryHygiene(self.ctx, self.store)
        self.weather = None
        self.avatars = None
        self.calendar = None
        self.context_builder = ContextBuilder(
            self.store, self.plans, None,
            host_timezone=lambda: getattr(self.ctx.get_timezone(), 'key', None),
            threads=self.threads,
        )
        self.scheduler = Scheduler(self)
        self.plans.on_change = self.scheduler.wake
        self.ws_clients: set[Any] = set()
        self._persona_cache: tuple[float, str] = (0, "")
        self._calendar_task: asyncio.Task | None = None

    async def initialize(self) -> None:
        await self.store.initialize()
        from .weather import WeatherService
        from .avatars import AvatarService
        from .calendar import CalendarService
        self.weather = WeatherService(self.store, self.ctx, self.plugin_cfg)
        self.avatars = AvatarService(self.store, self.ctx, self.data_dir)
        self.calendar = CalendarService(self.store)
        self.plans.calendar = self.calendar
        self.context_builder.weather = self.weather
        self.context_builder.calendar = self.calendar
        await self.scheduler.start()
        self._calendar_task = asyncio.create_task(self._calendar_auto_refresh(), name="krd_calendar_auto")

    async def close(self) -> None:
        if self._calendar_task is not None:
            self._calendar_task.cancel()
            await asyncio.gather(self._calendar_task, return_exceptions=True)
            self._calendar_task = None
        await self.scheduler.stop()
        clients = list(self.ws_clients)
        self.ws_clients.clear()
        for client in clients:
            try:
                await client.close()
            except Exception:
                pass
        if self.weather is not None:
            await self.weather.close()
        if self.calendar is not None:
            await self.calendar.close()
        await self.store.close()

    def log(self, level: str, event: str, **fields: Any) -> None:
        if level == "error" or self.debug or level == "warning":
            line = f"[KRD] {event} " + " ".join(f"{key}={value}" for key, value in fields.items())
            getattr(logger, level if level in {"debug", "info", "warning", "error"} else "info")(line)

    async def _calendar_auto_refresh(self) -> None:
        """Warm calendar years without ever blocking prompts or requests."""
        while True:
            try:
                active = await self.active_persona_id()
                if active:
                    config = await self.store.get_config(active)
                    hours = int(config.get("calendar_refresh_hours", 6))
                    if self.calendar is not None:
                        self.calendar.set_ttl(hours * 3600)
                    today = await self.plans.current_date(active)
                    year = int(today[:4])
                    years = {year, year + 1}
                    rows = await self.store.all(
                        "SELECT DISTINCT substr(date,1,4) AS year FROM plans WHERE persona_id=? AND date>=?",
                        (active, today),
                    )
                    for row in rows:
                        try:
                            if row.get("year"):
                                years.add(int(row["year"]))
                        except (TypeError, ValueError):
                            pass
                    for candidate in sorted(years):
                        self.calendar.refresh_soon(candidate)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self.log("warning", "calendar_auto_refresh_failed", error=repr(exc))
            await asyncio.sleep(300)

    async def active_persona_id(self) -> str:
        now = asyncio.get_running_loop().time()
        if now - self._persona_cache[0] < 1 and self._persona_cache[1]:
            return self._persona_cache[1]
        manager = self.ctx.persona_mgr
        persona = await manager.get_active_persona() if hasattr(manager, "get_active_persona") else await manager.get_persona()
        identifier = str(getattr(persona, "id", "") or "")
        self._persona_cache = (now, identifier)
        if identifier:
            await self.store.ensure_persona(identifier)
        return identifier

    async def broadcast(self, event_type: str, payload: dict[str, Any]) -> None:
        if not self.ws_clients:
            return
        dead = []
        for client in list(self.ws_clients):
            try:
                await client.send_json({"type": event_type, "payload": payload})
            except Exception:
                dead.append(client)
        for client in dead:
            self.ws_clients.discard(client)

    async def on_llm_request(self, event, req: LLMRequest) -> None:
        event._krd_runtime = self
        metadata = self.context_builder.metadata(event)
        active = await self.active_persona_id()
        base_config = await self.store.get_config(active) if active else None
        valid = [item for item in metadata if item["persona_id"] == active]
        if metadata and not valid and all((getattr(message, "extra", None) or {}).get("krd") for message in event.messages):
            event.stop()
            return
        if len(valid) != len(metadata) and req.tool_set:
            req.tool_set.remove("rhythm_plan", "rhythm_update", "rhythm_view")
        allowed_valid = []
        for item in valid:
            allowed = await self.policy.is_allowed(
                active, event.sid, "planning" if item["kind"] == "planning" else "execution", config=base_config)
            if not allowed:
                if req.tool_set:
                    req.tool_set.remove("rhythm_plan", "rhythm_update", "rhythm_view")
                continue
            allowed_valid.append(item)
            # Put the persisted template before the live context: the live
            # context carries the authoritative, mode-specific corrections
            # (optional targets, disabled layer, mixed user batch), so it must
            # be the last instruction the model reads.
            if base_config["history_mode"] == "full":
                template = (base_config["planning_review"]["prompt"] if item["kind"] == "review" else
                            base_config["planning_prompt"] if item["kind"] == "planning" else base_config["execution_prompt"])
                req.user_prompt.append(Prompt(
                    template, name="krd_full_template", source="kira_rhythm_Date", persist=True, render_template=False,
                ))
            if item["kind"] == "planning":
                content = await self.context_builder.planning_prompt(item)
            elif item["kind"] == "review":
                content = await self.context_builder.review_prompt(item)
            else:
                content = await self.context_builder.item_prompt(item)
            req.user_prompt.append(Prompt(
                content, name=f"krd_{item['kind']}_{item['run_id']}", source="kira_rhythm_Date",
                persist=False, render_template=False,
            ))
            if base_config["history_mode"] == "none":
                message_prompts = [p for p in req.user_prompt if isinstance(p, Prompt) and p.name == "message"]
                index = item.get("message_index", 0)
                if index < len(message_prompts):
                    message_prompts[index].persist = False
        event._krd_allowed_run_ids = {item["run_id"] for item in allowed_valid}
        await self.scheduler.on_request(event)
        normal_allowed = False
        if not metadata and active:
            normal_allowed = await self.policy.is_allowed(active, event.sid, "execution", config=base_config)
            if normal_allowed:
                if base_config.get("inject_day_state", True):
                    req.user_prompt.append(Prompt(
                        await self.context_builder.compact_state(active, config=base_config, current_sid=event.sid),
                        name="krd_day_state", source="kira_rhythm_Date", persist=False, render_template=False,
                    ))
                else:
                    weather_prompt = await self.context_builder.chat_weather(active, base_config)
                    if weather_prompt:
                        req.user_prompt.append(Prompt(
                            weather_prompt, name="krd_weather", source="kira_rhythm_Date",
                            persist=False, render_template=False,
                        ))
            elif req.tool_set:
                req.tool_set.remove("rhythm_plan", "rhythm_update", "rhythm_view")
        if allowed_valid or normal_allowed:
            for prompt in req.system_prompt:
                if prompt.name == "tools" and "KRD 生活节律" not in prompt.content:
                    prompt.content += "\n" + STATIC_TOOL_GUIDE
        elif req.tool_set:
            req.tool_set.remove("rhythm_plan", "rhythm_update", "rhythm_view")

    async def on_llm_response(self, event, response) -> None:
        active = await self.active_persona_id()
        filtered = [item for item in self.context_builder.metadata(event) if item["persona_id"] == active]
        if not filtered:
            return
        # Scheduler reads the same message metadata; inactive personas are never
        # allowed to close a different persona's run.
        await self.scheduler.on_response(event, response)

    async def on_final_result(self, event) -> None:
        await self.scheduler.on_final(event)
