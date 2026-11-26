from __future__ import annotations

import copy
import random
import sqlite3
from datetime import datetime
from typing import Any

from .config import deep_merge, normalized
from .models import ACTIVE_ITEM_STATES, KRDError, TERMINAL_ITEM_STATES, new_id, now
from .policy import SessionPolicy
from .store import Store, dumps, loads
from .timeutils import compiled_windows, parse_date, sample_window, timezone, to_utc, window_utc

PLAN_FIELDS = ("title", "overview", "planned_appearance", "planned_mood")
ITEM_FIELDS = ("title", "intent", "instruction", "schedule", "target", "interaction", "category", "execution_probability", "thread_id")


def item_json(row: dict[str, Any]) -> dict[str, Any]:
    result = dict(row)
    result["schedule"] = loads(result.pop("schedule_json"), {})
    return result


class PlanService:
    def __init__(self, store: Store, policy: SessionPolicy):
        self.store = store
        self.policy = policy
        self.rng = random.Random()
        self.on_change = None
        self.calendar = None
        self.threads = None

    def _changed(self) -> None:
        # A new earlier item must interrupt the scheduler's current wait. The
        # callback is synchronous and never performs I/O on the request path.
        if self.on_change:
            self.on_change()

    async def current_date(self, persona_id: str) -> str:
        config = await self.store.get_config(persona_id)
        return datetime.now(timezone(self.policy.timezone_name(config))).date().isoformat()

    async def effective_config(self, persona_id: str, day_type_id: str) -> dict[str, Any]:
        base = await self.store.get_config(persona_id)
        if not day_type_id:
            return base
        entry = next((item for item in await self.store.list_day_types(persona_id) if item["id"] == day_type_id), None)
        overrides = (entry.get("config", {}).get("overrides", {}) if entry else {})
        return normalized(deep_merge(base, overrides))

    async def resolve_day_types(self, persona_id: str, day: str) -> list[dict[str, Any]]:
        """Return every active day type, ordered by effective priority.

        Built-in reference day types are opt-in. Custom day types are active by
        their rules and may coexist with the built-in reference type.
        """
        entries = await self.store.list_day_types(persona_id)
        config = await self.store.get_config(persona_id)
        enabled = config.get("base_day_types", {})
        custom_enabled = config.get("day_type_enabled", {})
        weekday = datetime.fromisoformat(day).weekday()
        candidates: dict[str, tuple[int, dict[str, Any]]] = {}
        for entry in entries:
            identifier = entry["id"]
            if entry.get("builtin") and not enabled.get(identifier):
                continue
            if not entry.get("builtin") and custom_enabled.get(identifier) is False:
                continue
            rules = entry.get("rules") or {}
            priority = int(rules.get("priority", 100))
            matched = False
            if day in rules.get("dates", []):
                matched, priority = True, priority - 1000
            for period in rules.get("date_ranges", []):
                if period.get("start", "9999") <= day <= period.get("end", "0000"):
                    matched, priority = True, priority - 500
            if weekday in rules.get("weekdays", []):
                matched = True
            if matched:
                candidates[identifier] = (priority, entry)
        if self.calendar is not None:
            try:
                calendar_day = await self.calendar.day(day, allow_network=False)
                base_id = calendar_day.get("suggested_day_type") or ("weekend" if weekday >= 5 else "weekday")
                if enabled.get(base_id) and base_id not in candidates:
                    base_entry = next((entry for entry in entries if entry["id"] == base_id), None)
                    if base_entry:
                        candidates[base_id] = (int((base_entry.get("rules") or {}).get("priority", 100)), base_entry)
            except Exception:
                pass
        return [{"id": identifier, "name": entry.get("name", identifier), "priority": priority, "entry": entry}
                for identifier, (priority, entry) in sorted(candidates.items(), key=lambda item: (item[1][0], item[0]))]

    async def resolve_day_type(self, persona_id: str, day: str) -> str:
        matches = await self.resolve_day_types(persona_id, day)
        return matches[0]["id"] if matches else ""

    @staticmethod
    def _assemble_plans(plan_rows: list[dict[str, Any]], block_rows: list[dict[str, Any]],
                        item_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Assemble a plan tree without per-block/per-day database round trips."""
        items_by_block: dict[str, list[dict[str, Any]]] = {}
        for row in item_rows:
            items_by_block.setdefault(row["block_id"], []).append(item_json(row))
        blocks_by_plan: dict[str, list[dict[str, Any]]] = {}
        for row in block_rows:
            block = dict(row)
            block["meta"] = loads(block.pop("meta_json"), {})
            block["items"] = items_by_block.get(block["id"], [])
            blocks_by_plan.setdefault(block["plan_id"], []).append(block)
        return [{**row, "blocks": blocks_by_plan.get(row["id"], [])} for row in plan_rows]

    async def get_plan(self, plan_id: str, persona_id: str | None = None, *,
                       include_deleted: bool = False) -> dict[str, Any] | None:
        row = await self.store.one("SELECT * FROM plans WHERE id=?", (plan_id,))
        if row is None or (persona_id is not None and row["persona_id"] != persona_id):
            return None
        if row["state"] == "deleted" and not include_deleted:
            return None
        blocks = await self.store.all("SELECT * FROM blocks WHERE plan_id=? ORDER BY position,id", (plan_id,))
        items = await self.store.all(
            "SELECT * FROM items WHERE plan_id=? ORDER BY position,scheduled_at,id", (plan_id,))
        plan = self._assemble_plans([row], blocks, items)[0]
        return plan if include_deleted else self._visible_plan(plan)

    async def get_plan_by_date(self, persona_id: str, day: str, *,
                               include_deleted: bool = False) -> dict[str, Any] | None:
        plans = await self.list_plans(persona_id, day, day, include_deleted=include_deleted)
        return plans[0] if plans else None

    @staticmethod
    def _visible_plan(plan: dict[str, Any]) -> dict[str, Any]:
        blocks = []
        for block in plan.get("blocks", []):
            if block.get("meta", {}).get("deleted"):
                continue
            block = {**block, "items": [item for item in block.get("items", []) if item.get("state") != "deleted"]}
            blocks.append(block)
        return {**plan, "blocks": blocks}

    async def list_plans(self, persona_id: str, start: str, end: str, *,
                         include_deleted: bool = False) -> list[dict[str, Any]]:
        start = parse_date(start).isoformat()
        end = parse_date(end).isoformat()
        if start > end or (parse_date(end) - parse_date(start)).days > 366:
            raise KRDError("invalid_plan_range", "Expected an ascending range of at most 367 days")
        where = "persona_id=? AND date BETWEEN ? AND ?"
        params: list[Any] = [persona_id, start, end]
        if not include_deleted:
            where += " AND state<>'deleted'"
        rows = await self.store.all(f"SELECT * FROM plans WHERE {where} ORDER BY date", tuple(params))
        if not rows:
            return []
        blocks = await self.store.all(
            "SELECT b.* FROM blocks b JOIN plans p ON p.id=b.plan_id "
            "WHERE p.persona_id=? AND p.date BETWEEN ? AND ? ORDER BY b.plan_id,b.position,b.id",
            (persona_id, start, end))
        items = await self.store.all(
            "SELECT i.* FROM items i JOIN plans p ON p.id=i.plan_id "
            "WHERE p.persona_id=? AND p.date BETWEEN ? AND ? ORDER BY i.plan_id,i.position,i.scheduled_at,i.id",
            (persona_id, start, end))
        plans = self._assemble_plans(rows, blocks, items)
        return plans if include_deleted else [self._visible_plan(plan) for plan in plans]

    @staticmethod
    def _resolve_plan_item_id(reference: str, existing_items: dict[str, dict[str, Any]]) -> str:
        """Resolve a full id or a short id within the plan being revised.

        The planning context exposes 8-character short ids. Matching is scoped
        to this plan so an id from another plan cannot be silently rewritten.
        """
        value = str(reference or "").strip().lstrip("#")
        if not value:
            return ""
        if value in existing_items:
            return value
        # Full ids remain valid for API clients that create items explicitly;
        # apply_plan still rejects an id owned by another plan.
        if value.startswith("itm_") and len(value) > 20:
            return value
        if len(value) < 4:
            raise KRDError("invalid_item_id", "Short item id must be at least 4 characters",
                           reference=value)
        prefix = value if value.startswith("itm_") else f"itm_{value}"
        matches = [identifier for identifier in existing_items if identifier.startswith(prefix)]
        if len(matches) == 1:
            return matches[0]
        if len(matches) > 1:
            raise KRDError(
                "ambiguous_item", "Short item id matches more than one item in this plan",
                reference=value, candidates=matches[:5])
        raise KRDError(
            "unknown_item_id", "Item id is not part of this plan", reference=value,
            hint="Use current_plan.blocks[].items[].id, or omit id when creating a new item.")

    async def _prepare_items(self, persona_id: str, payload: dict[str, Any], actor: str,
                             config_override: dict[str, Any] | None = None,
                             existing_items: dict[str, dict[str, Any]] | None = None) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        config = config_override or await self.store.get_config(persona_id)
        day = payload["date"]
        tz_name = self.policy.timezone_name(config)
        blocked = compiled_windows(day, config["blocked_execution_windows"], tz_name)
        quiet = compiled_windows(day, config["quiet_delivery_windows"], tz_name)
        previous_by_id = existing_items or {}
        raw_blocks = payload.get("blocks", [])
        if not raw_blocks:
            for alias in ("items", "entries", "schedule"):
                if isinstance(payload.get(alias), list) and payload[alias]:
                    grouped: dict[str, list[dict[str, Any]]] = {}
                    for item in payload[alias]:
                        key = str(item.get("block", "生活片段")).strip()[:80] if isinstance(item, dict) else "生活片段"
                        grouped.setdefault(key or "生活片段", []).append(item)
                    raw_blocks = [{"title": title, "items": items} for title, items in grouped.items()]
                    break
        if not isinstance(raw_blocks, list):
            raise KRDError("invalid_plan", "blocks must be a list")
        execution_options = None
        prepared = []
        for block_index, raw_block in enumerate(raw_blocks):
            if isinstance(raw_block, dict) and not raw_block.get("items") and isinstance(raw_block.get("entries"), list):
                raw_block["items"] = raw_block["entries"]
            if not isinstance(raw_block, dict) or not isinstance(raw_block.get("items", []), list):
                raise KRDError("invalid_plan", "Each block must be an object with an items list")
            block = {"id": str(raw_block.get("id") or new_id("blk")), "title": str(raw_block.get("title", "生活片段"))[:120],
                     "position": int(raw_block.get("position", block_index)), "color": str(raw_block.get("color", ""))[:32],
                     "cover_asset_id": str(raw_block.get("cover_asset_id", "")), "meta": raw_block.get("meta", {})}
            if len(block["id"]) > 128 or not isinstance(block["meta"], dict):
                raise KRDError("invalid_block", "Block identity or metadata is invalid")
            block["items"] = []
            for raw_item in raw_block.get("items", []):
                if not isinstance(raw_item, dict):
                    raise KRDError("invalid_item", "Each item must be an object")
                if not raw_item.get("target") and raw_item.get("session"):
                    raw_item["target"] = raw_item["session"]
                if "execution_probability" not in raw_item and "probability" in raw_item:
                    raw_item["execution_probability"] = raw_item["probability"]
                schedule = raw_item.get("schedule") or {}
                if not schedule:
                    if raw_item.get("at"):
                        schedule = {"type": "exact", "at": raw_item["at"]}
                    elif raw_item.get("start") and raw_item.get("end"):
                        schedule = {"type": "window", "start": raw_item["start"], "end": raw_item["end"]}
                        for key in ("occurrences", "window_mode", "interval_minutes", "interval_seconds"):
                            if key in raw_item:
                                schedule[key] = raw_item[key]
                    raw_item["schedule"] = schedule
                if not isinstance(schedule, dict):
                    raise KRDError("invalid_schedule", "schedule must be an object")
                if not schedule:
                    raise KRDError("invalid_time", "Item needs at or start+end", field="schedule")
                supplied_id = str(raw_item.get("id") or "").strip()
                if len(supplied_id) > 128:
                    raise KRDError("invalid_item", "Item ID is too long")
                if supplied_id and previous_by_id:
                    supplied_id = self._resolve_plan_item_id(supplied_id, previous_by_id)
                previous = previous_by_id.get(supplied_id)
                schedule_unchanged = bool(previous and schedule == previous.get("schedule"))
                kind = schedule.get("type", "exact")
                if kind == "exact" and not schedule.get("at"):
                    raise KRDError("invalid_time", "Exact item needs at", field="at")
                if kind == "window" and not (schedule.get("start") and schedule.get("end")):
                    raise KRDError("invalid_time", "Window item needs start and end", field="start")
                if kind == "exact" and not config["allow_exact"] and actor == "bot" and not schedule_unchanged:
                    raise KRDError("exact_disabled", "Exact schedules are disabled")
                if kind == "window" and not config["allow_window"] and actor == "bot" and not schedule_unchanged:
                    raise KRDError("window_disabled", "Window schedules are disabled")
                if schedule_unchanged:
                    # A revision is not a new random draw. This also permits an
                    # unrelated edit after the original wall time has passed.
                    timestamps = [float(previous["scheduled_at"])]
                elif kind == "exact":
                    timestamps = [to_utc(day, schedule.get("at"), tz_name)]
                elif kind == "window":
                    timestamps = sample_window(schedule, day, tz_name, self.rng)
                else:
                    raise KRDError("invalid_schedule", "Schedule type must be exact or window")
                probability = raw_item.get("execution_probability", config["default_probability"])
                try:
                    probability = float(probability)
                except (TypeError, ValueError) as exc:
                    raise KRDError("invalid_probability", "execution_probability must be numeric") from exc
                if actor == "bot" and probability < 1 and not config["allow_probability"]:
                    raise KRDError("probability_disabled", "Probabilistic schedules are disabled")
                if not 0 <= probability <= 1 or (actor == "bot" and probability < config["min_probability"]):
                    raise KRDError("probability_below_minimum", "Probability is outside the permitted range")
                thread_id = str(raw_item.get("thread_id", "") or "").strip()[:128]
                if thread_id and self.threads is not None:
                    # Existing items may legitimately keep a link to a thread
                    # that has since been completed/dropped. Only a *new* link
                    # requires an open thread; otherwise an unrelated plan edit
                    # would be blocked forever by the closed thread.
                    if not (previous and previous.get("thread_id") == thread_id):
                        thread_id = await self.threads.resolve_link(persona_id, thread_id)
                interaction = raw_item.get("interaction", "auto")
                if interaction not in {"auto", "must_message", "silent"}:
                    raise KRDError("invalid_interaction", "Unknown interaction mode")
                if not schedule_unchanged:
                    for timestamp in timestamps:
                        if timestamp < now() - 60:
                            raise KRDError("schedule_in_past", "Cannot create an item in the past")
                        if any(left <= timestamp < right for left, right in blocked):
                            raise KRDError("blocked_execution_window", "This item falls into a blocked execution window")
                        if interaction == "must_message" and any(left <= timestamp < right for left, right in quiet):
                            raise KRDError("quiet_delivery_window", "must_message cannot be scheduled in a quiet delivery window")
                if execution_options is None:
                    execution_options = await self.policy.session_options(persona_id, "execution", config=config)
                target = await self.policy.require_target(
                    persona_id, str(raw_item.get("target", "")), "execution", options=execution_options, config=config)
                series_id = (previous.get("series_id", "") if schedule_unchanged else
                             raw_item.get("series_id") or (new_id("ser") if len(timestamps) > 1 else ""))
                for occurrence, timestamp in enumerate(timestamps):
                    identifier = supplied_id if supplied_id and occurrence == 0 else new_id("itm")
                    item = {
                        "id": identifier, "series_id": series_id,
                        "title": str(raw_item.get("title", "未命名生活小项"))[:160],
                        "intent": str(raw_item.get("intent", ""))[:1000],
                        "instruction": str(raw_item.get("instruction", ""))[:6000],
                        "position": int(raw_item.get("position", len(block["items"]))),
                        "schedule": copy.deepcopy(schedule), "scheduled_at": timestamp,
                        "target": target, "interaction": interaction,
                        "category": str(raw_item.get("category", ""))[:60],
                        "thread_id": thread_id,
                        "execution_probability": probability,
                        "reason": str(raw_item.get("reason", ""))[:1000],
                        "state": raw_item.get("state", previous["state"] if previous else "scheduled"),
                    }
                    block["items"].append(item)
            prepared.append(block)
        return prepared, {"config": config, "blocked": blocked, "quiet": quiet}

    @staticmethod
    def _flatten(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
        result = []
        for block in blocks:
            for item in block["items"]:
                result.append({**item, "block_id": block["id"]})
        return result

    def _validate_coverage(self, blocks: list[dict[str, Any]], config: dict[str, Any], actor: str, day: str,
                           tz_name: str | None = None) -> None:
        items = [item for item in self._flatten(blocks) if item.get("state") not in {"cancelled", "deleted"}]
        block_ids = [block["id"] for block in blocks]
        if len(block_ids) != len(set(block_ids)):
            raise KRDError("duplicate_block_id", "Block IDs must be unique within a plan")
        identifiers = [item["id"] for item in self._flatten(blocks)]
        if len(identifiers) != len(set(identifiers)):
            raise KRDError("duplicate_item_id", "Item IDs must be unique within a plan")
        if actor == "bot" and not config["min_items"] <= len(items) <= config["max_items"]:
            raise KRDError(
                "item_count", f"Plan requires {config['min_items']}–{config['max_items']} items, got {len(items)}",
                actual=len(items), required_min=config["min_items"], required_max=config["max_items"],
                hint="Submit a replacement in the same rhythm_plan/rhythm_update revision, or use a full plan revision.")
        if len(items) > 500:
            raise KRDError("item_hard_limit", "A plan cannot contain more than 500 items")
        for requirement in config["required_coverage_windows"]:
            start, end = window_utc(day, requirement["start"], requirement["end"], tz_name or config["timezone"])
            matched = [item for item in items if start <= item["scheduled_at"] < end
                       and (not requirement.get("category") or item["category"] == requirement["category"])
                       and (not requirement.get("interaction") or item["interaction"] == requirement["interaction"])]
            minimum = int(requirement.get("min_items", 0))
            maximum = int(requirement.get("max_items", 500))
            if actor == "bot" and not minimum <= len(matched) <= maximum:
                raise KRDError(
                    "required_coverage",
                    f"Required window {requirement['start']}–{requirement['end']} expects {minimum}–{maximum} items, got {len(matched)}",
                    window=f"{requirement['start']}–{requirement['end']}", actual=len(matched),
                    required_min=minimum, required_max=maximum,
                    hint="Add or replace an item in the same revision before deleting.")

    async def apply_plan(self, persona_id: str, payload: dict[str, Any], *, actor: str = "bot",
                         mode: str = "revise", reason: str = "", expected_revision: int = 0) -> dict[str, Any]:
        if not persona_id:
            raise KRDError("persona_required", "An active persona is required")
        if not isinstance(payload, dict):
            raise KRDError("invalid_plan", "Plan must be an object")
        day = parse_date(str(payload.get("date", ""))).isoformat()
        current_date = await self.current_date(persona_id)
        config = await self.store.get_config(persona_id)
        if day < current_date or (parse_date(day) - parse_date(current_date)).days > config["max_horizon_days"]:
            raise KRDError("outside_horizon", "Plan date is outside the allowed horizon")
        existing = await self.get_plan_by_date(persona_id, day)
        existing_any = await self.get_plan_by_date(persona_id, day, include_deleted=True)
        deleted_existing = bool(existing_any and existing_any["state"] == "deleted")
        base = existing_any if deleted_existing else existing
        if existing and expected_revision != existing["revision"]:
            raise KRDError("revision_conflict", "Plan was changed concurrently", current_revision=existing["revision"],
                           hint=f"修订已有计划时传 plans[].expected_revision={existing['revision']}；不要用 revision 字段。")
        if deleted_existing and expected_revision not in {0, existing_any["revision"]}:
            raise KRDError("revision_conflict", "Plan was changed concurrently", current_revision=existing_any["revision"])
        if not existing and not deleted_existing and expected_revision:
            raise KRDError("revision_conflict", "Plan no longer exists", current_revision=0)
        if mode not in {"create", "create_missing", "revise", "merge", "replace"}:
            raise KRDError("invalid_mode", "Unknown planning mode")
        if existing and mode in {"create", "create_missing"}:
            if mode == "create_missing":
                return {"plan": existing, "revision": existing["revision"], "diff": [], "change_units": 0}
            raise KRDError("revision_conflict", "Plan already exists", current_revision=existing["revision"])
        day_type_id = (payload.get("day_type_id") if actor == "user" and payload.get("day_type_id") else
                       base["day_type_id"] if base else await self.resolve_day_type(persona_id, day))
        effective = await self.effective_config(persona_id, day_type_id)
        before_items = self._flatten(existing["blocks"]) if existing else []
        plan_id = base["id"] if base else new_id("pln")
        prepared, _ = await self._prepare_items(
            persona_id, payload, actor, config_override=effective,
            existing_items={item["id"]: item for item in before_items})
        # IDs are globally unique across plans, not merely unique inside one day.
        for block in prepared:
            existing_block = await self.store.one("SELECT plan_id FROM blocks WHERE id=?", (block["id"],))
            if existing_block and existing_block["plan_id"] != plan_id:
                raise KRDError("block_identity_conflict", "Block ID belongs to another plan")
            for item in block["items"]:
                other = await self.store.one("SELECT plan_id FROM items WHERE id=?", (item["id"],))
                if other and other["plan_id"] != plan_id:
                    raise KRDError("item_identity_conflict", "Item ID belongs to another plan")
        merged = copy.deepcopy(prepared)
        if existing:
            # Reuse block identity before retaining old history, preventing a same-title
            # block from being inserted twice while cancelled/triggered items are kept.
            for block in merged:
                match = next((old for old in existing["blocks"] if old["id"] == block["id"] or old["title"] == block["title"]), None)
                if match:
                    block["id"] = match["id"]
            incoming_ids = {item["id"] for item in self._flatten(merged)}
            old_blocks = copy.deepcopy(existing["blocks"])
            for old_block in old_blocks:
                retained = []
                for old_item in old_block["items"]:
                    if old_item["id"] in incoming_ids:
                        continue
                    if old_item["state"] in {"scheduled", "queued", "running"}:
                        old_item["state"] = "cancelled"
                        old_item["reason"] = reason or "Superseded by plan revision"
                    retained.append(old_item)
                target_block = next((block for block in merged if block["id"] == old_block["id"]), None)
                if target_block:
                    target_block["items"].extend(retained)
                else:
                    old_block["items"] = retained
                    old_block["meta"] = {**old_block.get("meta", {}), "archived": True}
                    merged.append(old_block)
        self._validate_coverage(merged, effective, actor, day, self.policy.timezone_name(effective))
        revision = (base["revision"] if base else 0) + 1
        timestamp = now()
        state = "draft" if config["approval_required"] and actor == "bot" else "active"
        plan_row = {
            "id": plan_id, "persona_id": persona_id, "date": day,
            "day_type_id": day_type_id,
            "title": str(payload.get("title", base["title"] if base else "这一天"))[:160],
            "overview": str(payload.get("overview", base["overview"] if base else ""))[:3000],
            "planned_appearance": str(payload.get("planned_appearance", base["planned_appearance"] if base else ""))[:1000],
            "planned_mood": str(payload.get("planned_mood", base["planned_mood"] if base else ""))[:1000],
            "state": state, "revision": revision,
        }
        async with self.store.transaction() as db:
            if existing or deleted_existing:
                guard = existing["revision"] if existing else existing_any["revision"]
                cursor = await db.execute(
                    "UPDATE plans SET day_type_id=?,title=?,overview=?,planned_appearance=?,planned_mood=?,state=?,revision=?,updated_at=? WHERE id=? AND revision=?",
                    (plan_row["day_type_id"], plan_row["title"], plan_row["overview"], plan_row["planned_appearance"],
                     plan_row["planned_mood"], state, revision, timestamp, plan_id, guard))
                if cursor.rowcount != 1:
                    raise KRDError("revision_conflict", "Plan was changed concurrently")
            else:
                try:
                    await db.execute(
                        "INSERT INTO plans(id,persona_id,date,day_type_id,title,overview,planned_appearance,planned_mood,state,revision,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        (plan_id, persona_id, day, plan_row["day_type_id"], plan_row["title"], plan_row["overview"],
                         plan_row["planned_appearance"], plan_row["planned_mood"], state, revision, actor, timestamp, timestamp))
                except sqlite3.IntegrityError as exc:
                    raise KRDError("revision_conflict", "Plan was created concurrently") from exc
            for block in merged:
                await db.execute(
                    "INSERT INTO blocks(id,plan_id,title,position,color,cover_asset_id,meta_json) VALUES(?,?,?,?,?,?,?) "
                    "ON CONFLICT(id) DO UPDATE SET title=excluded.title,position=excluded.position,color=excluded.color,cover_asset_id=excluded.cover_asset_id,meta_json=excluded.meta_json",
                    (block["id"], plan_id, block["title"], block["position"], block["color"], block["cover_asset_id"], dumps(block.get("meta", {}))))
                for item in block["items"]:
                    previous = next((old for old in before_items if old["id"] == item["id"]), None)
                    desired_state = item.get("state", "scheduled")
                    known_states = ACTIVE_ITEM_STATES | TERMINAL_ITEM_STATES | {"failed", "interrupted"}
                    if desired_state not in known_states:
                        raise KRDError("invalid_item_state", f"Unknown item state: {desired_state}")
                    if previous and previous["state"] in {"queued", "running"}:
                        changed = any(previous.get(field) != item.get(field) for field in ITEM_FIELDS)
                        if changed or desired_state != previous["state"] or previous["block_id"] != block["id"]:
                            raise KRDError("item_running", f"Cannot edit a running item: {item['id']}")
                    if previous and previous["state"] in TERMINAL_ITEM_STATES and previous["state"] != "cancelled":
                        changed = any(previous.get(field) != item.get(field) for field in (*ITEM_FIELDS, "scheduled_at"))
                        if changed or desired_state != previous["state"]:
                            raise KRDError("item_terminal", f"Cannot rewrite a triggered item: {item['id']}")
                        item["state"] = previous["state"]
                    elif previous and desired_state not in {"scheduled", "cancelled", "deleted", previous["state"]}:
                        raise KRDError("invalid_item_state", "Client cannot directly set an execution state")
                    elif not previous and desired_state not in {"scheduled", "cancelled"}:
                        raise KRDError("invalid_item_state", "New items must start as scheduled or cancelled")
                    item_revision = previous["revision"] + 1 if previous else 1
                    await db.execute(
                        "INSERT INTO items(id,plan_id,block_id,series_id,title,intent,instruction,position,schedule_json,scheduled_at,target,interaction,category,thread_id,execution_probability,state,revision,reason,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) "
                        "ON CONFLICT(id) DO UPDATE SET block_id=excluded.block_id,series_id=excluded.series_id,title=excluded.title,intent=excluded.intent,instruction=excluded.instruction,position=excluded.position,schedule_json=excluded.schedule_json,scheduled_at=excluded.scheduled_at,target=excluded.target,interaction=excluded.interaction,category=excluded.category,thread_id=excluded.thread_id,execution_probability=excluded.execution_probability,state=excluded.state,revision=excluded.revision,reason=excluded.reason,updated_at=excluded.updated_at",
                        (item["id"], plan_id, block["id"], item["series_id"], item["title"], item["intent"], item["instruction"],
                         item["position"], dumps(item["schedule"]), item["scheduled_at"], item["target"], item["interaction"],
                         item["category"], item["thread_id"], item["execution_probability"], item.get("state", "scheduled"), item_revision,
                         item["reason"], previous["created_at"] if previous else timestamp, timestamp))
            after = {"blocks": merged}
            diff = self._diff(before_items, self._flatten(merged))
            snapshot = {"plan": plan_row, **after}
            await db.execute(
                "INSERT INTO plan_revisions(plan_id,revision,snapshot_json,diff_json,actor,reason,created_at) VALUES(?,?,?,?,?,?,?)",
                (plan_id, revision, dumps(snapshot), dumps(diff), actor, reason, timestamp))
            units = sum(1 for change in diff if change["op"] != "unchanged")
            await db.execute(
                "INSERT INTO mutations(id,plan_id,revision,actor,reason,units,operation,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                (new_id("mut"), plan_id, revision, actor, reason, units, mode, dumps(before_items), dumps(self._flatten(merged)), timestamp))
            if actor == "bot" and config["max_change_units"] and existing:
                async with db.execute(
                    "SELECT COALESCE(SUM(m.units),0) AS used FROM mutations m JOIN plans p ON p.id=m.plan_id "
                    "WHERE m.actor='bot' AND p.persona_id=? AND m.created_at>=?",
                    (persona_id, timestamp - config["modify_window_seconds"])) as cursor:
                    used = (await cursor.fetchone())[0]
                if used > config["max_change_units"]:
                    raise KRDError(
                        "modify_budget", "The rolling modification budget is exhausted",
                        used=used, limit=config["max_change_units"],
                        hint="Reduce this batch, wait for the rolling window, or let the user raise max_change_units.")
            await db.execute(
                "INSERT OR IGNORE INTO day_states(persona_id,date,current_appearance,current_mood,current_location,current_activity,current_note,revision,source,updated_at) VALUES(?,?,?,?,?,?,?,1,?,?)",
                (persona_id, day, plan_row["planned_appearance"], plan_row["planned_mood"], "", "", plan_row["overview"], actor, timestamp))
        result = await self.get_plan(plan_id, persona_id)
        if not self.store.in_transaction:
            self._changed()
        return {"plan": result, "revision": revision, "diff": diff, "change_units": units}

    async def apply_many(self, persona_id: str, payloads: list[dict[str, Any]], *, actor: str = "bot",
                         mode: str = "revise", reason: str = "") -> list[dict[str, Any]]:
        if not payloads or len(payloads) > 31:
            raise KRDError("invalid_plan_range", "Provide 1–31 daily plans in one atomic request")
        results = []
        # The outer transaction makes every nested plan revision a savepoint. Any
        # validation or database error rolls back all days instead of leaving a half plan.
        async with self.store.transaction():
            for payload in payloads:
                if not isinstance(payload, dict):
                    raise KRDError("invalid_plan", "Each plan must be an object")
                try:
                    expected_revision = int(payload.get("expected_revision", payload.get("revision", 0)))
                except (TypeError, ValueError) as exc:
                    raise KRDError("invalid_revision", "expected_revision must be an integer") from exc
                results.append(await self.apply_plan(
                    persona_id, payload, actor=actor, mode=payload.get("mode", mode),
                    reason=payload.get("reason", reason), expected_revision=expected_revision))
        self._changed()
        return results

    @staticmethod
    def _diff(before: list[dict[str, Any]], after: list[dict[str, Any]]) -> list[dict[str, Any]]:
        old = {item["id"]: item for item in before}
        new = {item["id"]: item for item in after if item.get("state") != "deleted"}
        result = []
        for identifier in sorted(old.keys() - new.keys()):
            result.append({"op": "removed", "item_id": identifier, "title": old[identifier]["title"]})
        for identifier in sorted(new.keys() - old.keys()):
            result.append({"op": "added", "item_id": identifier, "title": new[identifier]["title"]})
        for identifier in sorted(old.keys() & new.keys()):
            changes = {field: {"from": old[identifier].get(field), "to": new[identifier].get(field)}
                       for field in (*ITEM_FIELDS, "state", "scheduled_at")
                       if old[identifier].get(field) != new[identifier].get(field)}
            if changes:
                result.append({"op": "changed", "item_id": identifier, "title": new[identifier]["title"], "changes": changes})
        return result

    async def _ensure_day_state(self, persona_id: str, day: str, plan: dict[str, Any], actor: str) -> None:
        await self.store.execute(
            "INSERT OR IGNORE INTO day_states(persona_id,date,current_appearance,current_mood,current_location,current_activity,current_note,revision,source,updated_at) VALUES(?,?,?,?,?,?,?,1,?,?)",
            (persona_id, day, plan["planned_appearance"], plan["planned_mood"], "", "", plan["overview"], actor, now()))

    async def day_state(self, persona_id: str, day: str) -> dict[str, Any]:
        day = parse_date(day).isoformat()
        row = await self.store.one("SELECT * FROM day_states WHERE persona_id=? AND date=?", (persona_id, day))
        if row:
            return row
        plan = await self.get_plan_by_date(persona_id, day)
        return {"persona_id": persona_id, "date": day, "current_appearance": plan["planned_appearance"] if plan else "",
                "current_mood": plan["planned_mood"] if plan else "", "current_location": "",
                "current_activity": "", "current_note": plan["overview"] if plan else "", "revision": 0, "source": "none"}

    async def update_day_state(self, persona_id: str, day: str, patch: dict[str, Any], *, actor: str,
                               reason: str = "", expected_revision: int | None = None) -> dict[str, Any]:
        if expected_revision is not None:
            current = await self.day_state(persona_id, day)
            if current["revision"] != expected_revision:
                raise KRDError("revision_conflict", "DayState was changed concurrently", current_revision=current["revision"])
        return await self.set_day_state(persona_id, day, patch, actor, reason)

    async def set_day_state(self, persona_id: str, day: str, patch: dict[str, Any], actor: str, reason: str = "") -> dict[str, Any]:
        day = parse_date(day).isoformat()
        if not isinstance(patch, dict):
            raise KRDError("invalid_day_state", "DayState patch must be an object")
        allowed = {"current_appearance", "current_mood", "current_location", "current_activity", "current_note"}
        if set(patch) - allowed:
            raise KRDError("invalid_day_state", "Unsupported DayState field")
        current = await self.day_state(persona_id, day)
        merged = {key: current.get(key, "") for key in allowed}
        merged.update({key: str(value)[:2000] for key, value in patch.items()})
        revision = current["revision"] + 1
        await self.store.execute(
            "INSERT INTO day_states(persona_id,date,current_appearance,current_mood,current_location,current_activity,current_note,revision,source,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) "
            "ON CONFLICT(persona_id,date) DO UPDATE SET current_appearance=excluded.current_appearance,current_mood=excluded.current_mood,current_location=excluded.current_location,current_activity=excluded.current_activity,current_note=excluded.current_note,revision=excluded.revision,source=excluded.source,updated_at=excluded.updated_at",
            (persona_id, day, merged["current_appearance"], merged["current_mood"], merged["current_location"],
             merged["current_activity"], merged["current_note"], revision, actor, now()))
        return await self.day_state(persona_id, day)

    async def record_experience(self, persona_id: str, day: str, content: str, *, kind: str = "note", item_id: str = "") -> dict[str, Any]:
        day = parse_date(day).isoformat()
        if not content.strip() or len(content) > 8000:
            raise KRDError("invalid_experience", "Experience must be non-empty and at most 8000 characters")
        if item_id:
            item_id = await self.resolve_item_id(persona_id, item_id)
            owner = await self.store.one(
                "SELECT p.persona_id FROM items i JOIN plans p ON p.id=i.plan_id WHERE i.id=?", (item_id,))
            if not owner or owner["persona_id"] != persona_id:
                raise KRDError("not_found", "Experience item not found in this persona")
        kind = str(kind)[:40]
        identifier = new_id("exp")
        await self.store.execute(
            "INSERT INTO experiences(id,persona_id,date,item_id,kind,content,created_at) VALUES(?,?,?,?,?,?,?)",
            (identifier, persona_id, day, item_id, kind, content.strip(), now()))
        return {"id": identifier, "date": day, "kind": kind, "item_id": item_id}

    async def experiences(self, persona_id: str, day: str | None = None, item_id: str = "", limit: int = 20) -> list[dict[str, Any]]:
        limit = max(1, min(100, int(limit)))
        if item_id:
            return await self.store.all("SELECT * FROM experiences WHERE persona_id=? AND item_id=? ORDER BY created_at DESC LIMIT ?", (persona_id, item_id, limit))
        if day:
            return await self.store.all("SELECT * FROM experiences WHERE persona_id=? AND date=? ORDER BY created_at DESC LIMIT ?", (persona_id, day, limit))
        return await self.store.all("SELECT * FROM experiences WHERE persona_id=? ORDER BY created_at DESC LIMIT ?", (persona_id, limit))

    async def revisions(self, plan_id: str, limit: int = 2, persona_id: str | None = None) -> list[dict[str, Any]]:
        if persona_id is None:
            rows = await self.store.all(
                "SELECT revision,diff_json,actor,reason,created_at FROM plan_revisions WHERE plan_id=? ORDER BY revision DESC LIMIT ?",
                (plan_id, max(1, min(20, limit))))
        else:
            rows = await self.store.all(
                "SELECT r.revision,r.diff_json,r.actor,r.reason,r.created_at FROM plan_revisions r "
                "JOIN plans p ON p.id=r.plan_id WHERE r.plan_id=? AND p.persona_id=? ORDER BY r.revision DESC LIMIT ?",
                (plan_id, persona_id, max(1, min(20, limit))))
        result = []
        for row in rows:
            diff = loads(row.pop("diff_json"), [])
            result.append({**row, "diff": diff})
        return result

    async def recent_changes(self, persona_id: str, day: str, limit: int = 3, *,
                             meaningful_only: bool = False) -> list[dict[str, Any]]:
        day = parse_date(day).isoformat()
        rows = await self.store.all(
            "SELECT p.id AS plan_id,p.state AS plan_state,r.revision,r.diff_json,r.actor,r.reason,r.created_at "
            "FROM plan_revisions r JOIN plans p ON p.id=r.plan_id "
            "WHERE p.persona_id=? AND p.date=? ORDER BY r.revision DESC LIMIT ?",
            (persona_id, day, max(1, min(10, limit))))
        result = []
        for row in rows:
            diff = loads(row.pop("diff_json"), [])
            if meaningful_only:
                meaningful = row["plan_state"] == "deleted" or any(
                    change.get("op") == "removed" or
                    (change.get("op") == "changed" and change.get("changes", {}).get("state", {}).get("to") in {"cancelled", "deleted"})
                    for change in diff)
                if not meaningful:
                    continue
            result.append({**row, "diff": diff})
        return result

    async def resolve_item_id(self, persona_id: str, reference: str) -> str:
        """Resolve a full item id or a short item-id prefix within a persona."""
        reference = str(reference or "").strip().lstrip("#")
        if not reference:
            raise KRDError("item_required", "item_id is required")
        row = await self.store.one(
            "SELECT i.id FROM items i JOIN plans p ON p.id=i.plan_id WHERE p.persona_id=? AND i.id=?",
            (persona_id, reference))
        if row:
            return row["id"]
        if not reference.startswith("itm_"):
            reference = f"itm_{reference}"
        # Prefer active workspaces so an old historical item cannot steal a short prefix.
        active_rows = await self.store.all(
            "SELECT i.id FROM items i JOIN plans p ON p.id=i.plan_id "
            "WHERE p.persona_id=? AND p.state<>'deleted' AND i.state<>'deleted' AND i.id LIKE ?",
            (persona_id, f"{reference}%"))
        if len(active_rows) == 1:
            return active_rows[0]["id"]
        if len(active_rows) > 1:
            raise KRDError("ambiguous_item", "Short item id matches more than one active item")
        rows = await self.store.all(
            "SELECT i.id FROM items i JOIN plans p ON p.id=i.plan_id WHERE p.persona_id=? AND i.id LIKE ?",
            (persona_id, f"{reference}%"))
        if len(rows) == 1:
            return rows[0]["id"]
        if len(rows) > 1:
            raise KRDError("ambiguous_item", "Short item id matches more than one item")
        raise KRDError("not_found", "Item not found")

    async def update_item(self, persona_id: str, item_id: str, patch: dict[str, Any], *, actor: str, reason: str = "") -> dict[str, Any]:
        item_id = await self.resolve_item_id(persona_id, item_id)
        row = await self.store.one("SELECT plan_id FROM items WHERE id=?", (item_id,))
        if not row:
            raise KRDError("not_found", "Item not found")
        plan = await self.get_plan(row["plan_id"], persona_id)
        if not plan:
            raise KRDError("permission_denied", "Item does not belong to this persona")
        if patch.get("action") == "cancel":
            patch = {"state": "cancelled"}
        if patch.get("action") == "skip":
            patch = {"state": "cancelled"}
        found = False
        for block in plan["blocks"]:
            for item in block["items"]:
                if item["id"] == item_id:
                    found = True
                    if item["state"] in {"queued", "running"}:
                        raise KRDError("item_running", "Cannot edit a running item")
                    for key in ("title", "intent", "instruction", "target", "interaction", "category", "execution_probability", "schedule", "state", "thread_id"):
                        if key in patch:
                            item[key] = patch[key]
                    item["reason"] = reason or patch.get("reason", "")
        if not found:
            raise KRDError("not_found", "Item not found")
        return await self.apply_plan(persona_id, plan, actor=actor, mode="revise", reason=reason, expected_revision=plan["revision"])

    async def delete_item(self, persona_id: str, item_id: str, *, actor: str, reason: str = "") -> dict[str, Any]:
        item_id = await self.resolve_item_id(persona_id, item_id)
        row = await self.store.one("SELECT plan_id FROM items WHERE id=?", (item_id,))
        if not row:
            raise KRDError("not_found", "Item not found")
        plan = await self.get_plan(row["plan_id"], persona_id)
        if not plan:
            raise KRDError("not_found", "Item not found in an active plan")
        target = None
        for block in plan["blocks"]:
            for item in block["items"]:
                if item["id"] == item_id:
                    target = item
                    break
        if target is None:
            raise KRDError("not_found", "Item not found")
        if target["state"] in {"queued", "running"}:
            raise KRDError("item_running", "Cannot delete a running item")
        if target["state"] not in {"scheduled", "cancelled"}:
            raise KRDError("item_terminal", "Cannot delete a completed item")
        target["state"] = "deleted"
        target["reason"] = reason or "Deleted"
        return await self.apply_plan(persona_id, plan, actor=actor, mode="revise", reason=reason,
                                     expected_revision=plan["revision"])

    async def delete_block(self, persona_id: str, block_ref: str, *, actor: str, reason: str = "") -> dict[str, Any]:
        plan = await self.get_plan_by_date(persona_id, await self.current_date(persona_id))
        # The front end may delete a block on a selected future date; resolve by id across active plans first.
        if plan is None:
            rows = await self.store.all(
                "SELECT p.date FROM blocks b JOIN plans p ON p.id=b.plan_id "
                "WHERE b.id=? AND p.persona_id=? AND p.state<>'deleted'", (block_ref, persona_id))
            if rows:
                plan = await self.get_plan_by_date(persona_id, rows[0]["date"])
        if plan is None:
            raise KRDError("not_found", "Block not found in an active plan")
        block = next((item for item in plan["blocks"] if item["id"] == block_ref), None)
        if block is None:
            block = next((item for item in plan["blocks"] if item["title"] == block_ref), None)
        if block is None:
            raise KRDError("not_found", "Block not found")
        if any(item["state"] in {"queued", "running"} for item in block["items"]):
            raise KRDError("item_running", "Cannot delete a block containing a running item")
        for item in block["items"]:
            if item["state"] in {"scheduled", "cancelled"}:
                item["state"] = "deleted"
                item["reason"] = reason or "Block deleted"
        block["meta"] = {**block.get("meta", {}), "deleted": True, "deleted_at": now()}
        return await self.apply_plan(persona_id, plan, actor=actor, mode="revise", reason=reason,
                                     expected_revision=plan["revision"])

    async def delete_day(self, persona_id: str, day: str, *, reason: str = "") -> dict[str, Any]:
        day = parse_date(day).isoformat()
        plan = await self.get_plan_by_date(persona_id, day)
        if plan is None:
            raise KRDError("not_found", "Plan not found")
        if any(item["state"] in {"queued", "running"} for block in plan["blocks"] for item in block["items"]):
            raise KRDError("item_running", "Cannot delete a plan containing a running item")
        before_items = self._flatten(plan["blocks"])
        blocks = copy.deepcopy(plan["blocks"])
        affected = 0
        timestamp = now()
        for block in blocks:
            block["meta"] = {**block.get("meta", {}), "deleted": True, "deleted_at": timestamp}
            for item in block["items"]:
                if item["state"] in {"scheduled", "queued", "cancelled"}:
                    item["state"] = "deleted"
                    item["reason"] = reason or "Deleted by user"
                    affected += 1
        revision = plan["revision"] + 1
        plan_row = {**plan, "state": "deleted", "revision": revision}
        diff = self._diff(before_items, self._flatten(blocks))
        async with self.store.transaction() as db:
            cursor = await db.execute(
                "UPDATE plans SET state='deleted',revision=?,updated_at=? WHERE id=? AND revision=?",
                (revision, timestamp, plan["id"], plan["revision"]))
            if cursor.rowcount != 1:
                raise KRDError("revision_conflict", "Plan was changed concurrently")
            for block in blocks:
                await db.execute("UPDATE blocks SET meta_json=? WHERE id=?", (dumps(block.get("meta", {})), block["id"]))
                for item in block["items"]:
                    if item["state"] == "deleted":
                        await db.execute(
                            "UPDATE items SET state='deleted',reason=?,revision=revision+1,updated_at=? WHERE id=?",
                            (item.get("reason", ""), timestamp, item["id"]))
            await db.execute(
                "INSERT INTO plan_revisions(plan_id,revision,snapshot_json,diff_json,actor,reason,created_at) VALUES(?,?,?,?,?,?,?)",
                (plan["id"], revision, dumps({"plan": plan_row, "blocks": blocks}), dumps(diff), "user", reason or "删除整天", timestamp))
            await db.execute(
                "INSERT INTO mutations(id,plan_id,revision,actor,reason,units,operation,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                (new_id("mut"), plan["id"], revision, "user", reason or "删除整天",
                 sum(1 for change in diff if change["op"] != "unchanged"), "delete_day",
                 dumps(before_items), dumps(self._flatten(blocks)), timestamp))
        return {"plan_id": plan["id"], "date": day, "deleted": True, "affected_items": affected,
                "history_preserved": True, "revision": revision}

    async def append_item(self, persona_id: str, plan_id: str, block_title: str, raw_item: dict[str, Any], *, actor: str, reason: str = "") -> dict[str, Any]:
        plan = await self.get_plan(plan_id, persona_id)
        if not plan:
            raise KRDError("not_found", "Plan not found")
        block = next((b for b in plan["blocks"] if b["title"] == block_title), None)
        if block is None:
            block = {"id": new_id("blk"), "title": block_title or "生活片段", "position": len(plan["blocks"]), "items": []}
            plan["blocks"].append(block)
        block["items"].append(raw_item)
        return await self.apply_plan(persona_id, plan, actor=actor, mode="revise", reason=reason, expected_revision=plan["revision"])
