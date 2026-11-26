from __future__ import annotations

import json
from fastapi import File, HTTPException, Response, UploadFile
from fastapi.responses import FileResponse
from core.plugin import PageMenu, PluginPage, register

from . import webapi
from .models import KRDError, new_id, now


class ApiMixin:
    async def _call(self, function, *args, **kwargs):
        try:
            return await function(*args, **kwargs)
        except KRDError as exc:
            status = 409 if "conflict" in exc.code or exc.code == "modify_budget" else 400
            raise HTTPException(status_code=status, detail=exc.as_dict()) from exc
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail={"code": type(exc).__name__, "message": str(exc)}) from exc

    async def _persona(self, persona: str = "") -> str:
        if self.runtime is None:
            raise KRDError("runtime_unavailable", "KRD is not initialized")
        return await self.runtime.active_persona_id() if not persona else persona

    async def _plan_result(self, result):
        """Keep mutation responses consistent with GET /plans for the UI."""
        plan = result.get("plan") if isinstance(result, dict) else None
        if isinstance(plan, dict) and plan.get("id"):
            result = {**result, "plan": (await webapi.attach_revision_info(self.runtime, [plan]))[0]}
        return result

    async def _notify(self, event_type: str, persona_id: str, **payload):
        await self.runtime.broadcast(event_type, {"persona_id": persona_id, **payload})

    @register.page("/dashboard", menu=PageMenu(label={"zh": "生活节律", "en": "Rhythm"}, icon="Calendar", order=70))
    def krd_page(self):
        return PluginPage.from_folder("./web")

    @register.static("/assets", "assets")
    def krd_static(self):
        return None

    @register.api(method="GET", path="/v1/bootstrap")
    async def api_bootstrap(self, persona: str = ""):
        return await self._call(lambda: webapi.bootstrap(self.runtime, persona))

    @register.api(method="GET", path="/v1/calendar")
    async def api_calendar(self, start: str, end: str):
        return await self._call(self.runtime.calendar.range, start, end, allow_network=False)

    @register.api(method="POST", path="/v1/calendar/refresh")
    async def api_calendar_refresh(self, payload: dict):
        async def refresh():
            year = int(payload.get("year", 0))
            if not 1900 <= year <= 2100:
                raise KRDError("invalid_calendar_year", "Year must be between 1900 and 2100")
            result = await self.runtime.calendar.year(year, force_refresh=True)
            await self.runtime.broadcast("calendar_changed", {"year": year, "status": result["status"]})
            return result
        return await self._call(refresh)

    @register.api(method="GET", path="/v1/plans")
    async def api_plans(self, start: str, end: str, persona: str = ""):
        persona_id = await self._persona(persona)
        async def load():
            plans = await self.runtime.plans.list_plans(persona_id, start, end)
            return await webapi.attach_revision_info(self.runtime, plans)
        return await self._call(load)

    @register.api(method="GET", path="/v1/plans/{plan_id}")
    async def api_plan(self, plan_id: str, persona: str = ""):
        persona_id = await self._persona(persona)
        async def load():
            plan = await self.runtime.plans.get_plan(plan_id, persona_id)
            if not plan:
                raise KRDError("not_found", "Plan not found")
            return (await webapi.attach_revision_info(self.runtime, [plan]))[0]
        return await self._call(load)

    @register.api(method="POST", path="/v1/plans")
    async def api_save_plan(self, payload: dict, persona: str = ""):
        persona_id = await self._persona(persona)
        async def save():
            result = await self.runtime.plans.apply_plan(
                persona_id, payload, actor="user", mode=payload.get("mode", "revise"),
                reason=payload.get("reason", "WebUI edit"), expected_revision=int(payload.get("expected_revision", 0)))
            await self._notify("plan_changed", persona_id, days=[result["plan"]["date"]])
            return await self._plan_result(result)
        return await self._call(save)

    @register.api(method="GET", path="/v1/plans/{plan_id}/diff")
    async def api_diff(self, plan_id: str, limit: int = 10, persona: str = ""):
        persona_id = await self._persona(persona)
        return await self._call(self.runtime.plans.revisions, plan_id, limit, persona_id)

    @register.api(method="POST", path="/v1/planning/run")
    async def api_run_planning(self, payload: dict, persona: str = ""):
        persona_id = await self._persona(persona)
        day = payload.get("date") or await self.runtime.plans.current_date(persona_id)
        return await self._call(self.runtime.scheduler.trigger_planning, persona_id, "manual", day,
                                payload.get("reason", "Manual planning from WebUI"))

    @register.api(method="PATCH", path="/v1/items/{item_id}")
    async def api_update_item(self, item_id: str, payload: dict, persona: str = ""):
        persona_id = await self._persona(persona)
        async def update():
            result = await self.runtime.plans.update_item(
                persona_id, item_id, payload, actor="user", reason=payload.get("reason", "WebUI edit"))
            await self._notify("plan_changed", persona_id, items=[item_id])
            return await self._plan_result(result)
        return await self._call(update)

    @register.api(method="POST", path="/v1/items/{item_id}/run")
    async def api_run_item(self, item_id: str, persona: str = ""):
        persona_id = await self._persona(persona)
        return await self._call(self.runtime.scheduler.run_now, persona_id, item_id)

    @register.api(method="POST", path="/v1/items/{item_id}/skip")
    async def api_skip_item(self, item_id: str, payload: dict | None = None, persona: str = ""):
        persona_id = await self._persona(persona)
        async def skip():
            reason = (payload or {}).get("reason", "Skipped by user")
            result = await self.runtime.plans.update_item(
                persona_id, item_id, {"action": "skip", "reason": reason}, actor="user", reason=reason)
            await self.runtime.scheduler.check_all_triggered(result["plan"]["id"])
            await self._notify("plan_changed", persona_id, items=[item_id])
            return await self._plan_result(result)
        return await self._call(skip)

    @register.api(method="POST", path="/v1/items/{item_id}/delete")
    async def api_delete_item(self, item_id: str, payload: dict | None = None, persona: str = ""):
        persona_id = await self._persona(persona)
        async def delete():
            reason = (payload or {}).get("reason", "Deleted by user")
            result = await self.runtime.plans.delete_item(persona_id, item_id, actor="user", reason=reason)
            await self._notify("plan_changed", persona_id, items=[item_id])
            return await self._plan_result(result)
        return await self._call(delete)

    @register.api(method="POST", path="/v1/blocks/{block_id}/delete")
    async def api_delete_block(self, block_id: str, payload: dict | None = None, persona: str = ""):
        persona_id = await self._persona(persona)
        async def delete():
            reason = (payload or {}).get("reason", "Deleted by user")
            result = await self.runtime.plans.delete_block(persona_id, block_id, actor="user", reason=reason)
            await self._notify("plan_changed", persona_id, days=[result["plan"]["date"]])
            return await self._plan_result(result)
        return await self._call(delete)

    @register.api(method="POST", path="/v1/plans/{day}/delete")
    async def api_delete_day(self, day: str, payload: dict | None = None, persona: str = ""):
        persona_id = await self._persona(persona)
        async def delete():
            reason = (payload or {}).get("reason", "Deleted by user")
            result = await self.runtime.plans.delete_day(persona_id, day, reason=reason)
            await self._notify("plan_changed", persona_id, days=[day])
            return result
        return await self._call(delete)

    @register.api(method="GET", path="/v1/day-state/{day}")
    async def api_day_state(self, day: str, persona: str = ""):
        persona_id = await self._persona(persona)
        return await self._call(self.runtime.plans.day_state, persona_id, day)

    @register.api(method="POST", path="/v1/day-state/{day}")
    async def api_save_day_state(self, day: str, payload: dict, persona: str = ""):
        persona_id = await self._persona(persona)
        result = await self._call(self.runtime.plans.set_day_state, persona_id, day, payload, "user", "WebUI edit")
        await self._notify("day_state_changed", persona_id, date=day)
        return result

    @register.api(method="GET", path="/v1/experiences")
    async def api_experiences(self, date: str = "", item_id: str = "", limit: int = 30, persona: str = ""):
        persona_id = await self._persona(persona)
        return await self._call(self.runtime.plans.experiences, persona_id, date or None, item_id, limit)

    @register.api(method="POST", path="/v1/experiences")
    async def api_add_experience(self, payload: dict, persona: str = ""):
        persona_id = await self._persona(persona)
        day = payload.get("date") or await self.runtime.plans.current_date(persona_id)
        result = await self._call(self.runtime.plans.record_experience, persona_id, day,
                                  str(payload.get("content", "")), kind=payload.get("kind", "note"),
                                  item_id=payload.get("item_id", ""))
        await self._notify("data_changed", persona_id, source="experience")
        return result

    @register.api(method="GET", path="/v1/config")
    async def api_config(self, persona: str = ""):
        persona_id = await self._persona(persona)
        return {"config": await self.runtime.store.get_config(persona_id),
                "revision": await self.runtime.store.config_revision(persona_id)}

    @register.api(method="PUT", path="/v1/config")
    async def api_update_config(self, payload: dict, persona: str = ""):
        persona_id = await self._persona(persona)
        patch = payload.get("patch") or {key: value for key, value in payload.items() if key != "expected_revision"}
        return await self._call(webapi.update_config, self.runtime, persona_id, patch,
                                int(payload.get("expected_revision", 0)))

    @register.api(method="GET", path="/v1/day-types")
    async def api_day_types(self, persona: str = ""):
        persona_id = await self._persona(persona)
        return await self.runtime.store.list_day_types(persona_id)

    @register.api(method="POST", path="/v1/day-types")
    async def api_save_day_type(self, payload: dict, persona: str = ""):
        persona_id = await self._persona(persona)
        result = await self._call(self.runtime.store.save_day_type, persona_id, payload)
        self.runtime.scheduler.wake()
        await self._notify("day_types_changed", persona_id)
        return result

    @register.api(method="DELETE", path="/v1/day-types/{identifier}")
    async def api_delete_day_type(self, identifier: str, persona: str = ""):
        persona_id = await self._persona(persona)
        result = await self._call(self.runtime.store.delete_day_type, persona_id, identifier)
        self.runtime.scheduler.wake()
        await self._notify("day_types_changed", persona_id)
        return result

    @register.api(method="GET", path="/v1/threads")
    async def api_threads(self, status: str = "", kind: str = "", limit: int = 50, persona: str = ""):
        persona_id = await self._persona(persona)
        return await self._call(self.runtime.threads.list, persona_id, status=status, kind=kind, limit=limit)

    @register.api(method="GET", path="/v1/threads/{thread_id}")
    async def api_thread(self, thread_id: str, persona: str = ""):
        persona_id = await self._persona(persona)
        async def load():
            result = await self.runtime.threads.get(persona_id, thread_id)
            if result is None:
                raise KRDError("thread_not_found", "Thread not found")
            return result
        return await self._call(load)

    @register.api(method="POST", path="/v1/threads")
    async def api_add_thread(self, payload: dict, persona: str = ""):
        persona_id = await self._persona(persona)
        async def save():
            result = await self.runtime.threads.add(persona_id, payload, actor="user")
            await self._notify("thread_changed", persona_id, thread_id=result["id"])
            return result
        return await self._call(save)

    @register.api(method="PATCH", path="/v1/threads/{thread_id}")
    async def api_update_thread(self, thread_id: str, payload: dict, persona: str = ""):
        persona_id = await self._persona(persona)
        async def save():
            result = await self.runtime.threads.update(persona_id, thread_id, payload, actor="user",
                                                       note=str(payload.get("note", "")))
            await self._notify("thread_changed", persona_id, thread_id=result["id"])
            return result
        return await self._call(save)

    @register.api(method="POST", path="/v1/threads/{thread_id}/touch")
    async def api_touch_thread(self, thread_id: str, payload: dict | None = None, persona: str = ""):
        persona_id = await self._persona(persona)
        async def save():
            data = payload or {}
            result = await self.runtime.threads.touch(
                persona_id, thread_id, str(data.get("note", "")),
                next_step=data.get("next_step"), item_id=data.get("item_id", ""), actor="user")
            await self._notify("thread_changed", persona_id, thread_id=result["id"])
            return result
        return await self._call(save)

    @register.api(method="DELETE", path="/v1/threads/{thread_id}")
    async def api_delete_thread(self, thread_id: str, persona: str = ""):
        persona_id = await self._persona(persona)
        async def remove():
            result = await self.runtime.threads.delete(persona_id, thread_id, actor="user")
            await self._notify("thread_changed", persona_id, thread_id=result["id"])
            return result
        return await self._call(remove)

    @register.api(method="GET", path="/v1/sessions")
    async def api_sessions(self, kind: str = "execution", scope: str = "pool", persona: str = ""):
        persona_id = await self._persona(persona)
        if scope == "all":
            return await self.runtime.policy.session_catalog(persona_id)
        return await self.runtime.policy.session_options(persona_id, kind)

    @register.api(method="GET", path="/v1/weather/current")
    async def api_weather(self, persona: str = ""):
        persona_id = await self._persona(persona)
        return await self.runtime.weather.summary(persona_id)

    @register.api(method="GET", path="/v1/weather/forecast")
    async def api_weather_forecast(self, start: str, end: str, persona: str = ""):
        persona_id = await self._persona(persona)
        async def load():
            from .timeutils import parse_date
            first, last = parse_date(start), parse_date(end)
            if last < first:
                raise KRDError("invalid_weather_range", "Forecast end must not be before start")
            days = min(16, (last - first).days + 1)
            return await self.runtime.weather.forecast(persona_id, first.isoformat(), days, allow_network=True)
        return await self._call(load)

    @register.api(method="POST", path="/v1/weather/geocode")
    async def api_geocode(self, payload: dict, persona: str = ""):
        persona_id = await self._persona(persona)
        return await self._call(self.runtime.weather.geocode, str(payload.get("name", "")), persona_id)

    @register.api(method="POST", path="/v1/weather/preview")
    async def api_weather_preview(self, payload: dict):
        async def preview():
            mode = payload.get("mode", "off")
            if mode == "off":
                return {"mode": "off", "status": "off"}
            if mode == "virtual":
                virtual = payload.get("virtual")
                if not isinstance(virtual, dict):
                    raise KRDError("invalid_weather_preview", "Virtual weather settings are missing")
                return self.runtime.weather.virtual(await self._persona(""), virtual)
            location = payload.get("location")
            if not isinstance(location, dict) or location.get("latitude") is None or location.get("longitude") is None:
                raise KRDError("weather_location_required", "请先选择并保存一个天气地点，再预览真实天气")
            provider = payload.get("provider")
            if not provider:
                raise KRDError("invalid_weather_preview", "Weather provider is missing")
            return await self.runtime.weather._fetch(provider, location, 5, await self._persona(""))
        return await self._call(preview)

    @register.api(method="GET", path="/v1/weather/credentials")
    async def api_weather_credentials(self, persona: str = ""):
        persona_id = await self._persona(persona)
        return await self._call(self.runtime.weather.credential_status, persona_id)

    @register.api(method="PUT", path="/v1/weather/credentials")
    async def api_save_weather_credentials(self, payload: dict, persona: str = ""):
        persona_id = await self._persona(persona)
        async def save():
            try:
                return await self.runtime.weather.save_credentials(persona_id, payload)
            except ValueError as exc:
                raise KRDError("invalid_weather_credentials", str(exc)) from exc
        result = await self._call(save)
        await self._notify("weather_changed", persona_id, credentials=True)
        return result

    @register.api(method="GET", path="/v1/avatar")
    async def api_avatar(self, response: Response, persona: str = "", refresh: bool = False):
        response.headers["Cache-Control"] = "no-store, max-age=0"
        persona_id = await self._persona(persona)
        result = await self.runtime.avatars.current(persona_id, force_refresh=refresh)
        if refresh:
            await self._notify("avatar_changed", persona_id)
        return result

    @register.api(method="POST", path="/v1/assets")
    async def api_upload(self, file: UploadFile = File(...), persona: str = ""):
        persona_id = await self._persona(persona)
        content = await file.read(5 * 1024 * 1024 + 1)
        return await self._call(webapi.asset_service(self.runtime).save_bytes, persona_id, content)

    @register.api(method="GET", path="/v1/assets/{identifier}")
    async def api_asset(self, identifier: str, persona: str = ""):
        persona_id = await self._persona(persona)
        async def load():
            row = await webapi.asset_service(self.runtime).get(persona_id, identifier)
            if not row:
                raise KRDError("not_found", "Asset not found")
            return FileResponse(row["resolved_path"], media_type=row["mime"], headers={
                "Cache-Control": "private, max-age=31536000, immutable", "ETag": f'"{row["hash"]}"'})
        return await self._call(load)

    @register.api(method="DELETE", path="/v1/assets/{identifier}")
    async def api_delete_asset(self, identifier: str, persona: str = ""):
        persona_id = await self._persona(persona)
        async def remove():
            row = await webapi.asset_service(self.runtime).get(persona_id, identifier)
            if not row:
                raise KRDError("not_found", "Asset not found")
            config = await self.runtime.store.get_config(persona_id)
            used_by_plan = await self.runtime.store.one("SELECT id FROM blocks WHERE cover_asset_id=? LIMIT 1", (identifier,))
            appearance = config["appearance"]
            if identifier in {appearance.get("avatar_asset_id"), appearance.get("banner_asset_id"), appearance.get("background_asset_id")} or used_by_plan:
                raise KRDError("asset_in_use", "Remove the avatar or block cover reference before deleting this image")
            await self.runtime.store.execute("DELETE FROM assets WHERE id=?", (identifier,))
            still_used = await self.runtime.store.one("SELECT 1 AS used FROM assets WHERE path=? LIMIT 1", (str(row["resolved_path"]),))
            if not still_used:
                row["resolved_path"].unlink(missing_ok=True)
            await self._notify("assets_changed", persona_id, identifier=identifier)
            return {"deleted": True}
        return await self._call(remove)

    @register.api(method="GET", path="/v1/templates")
    async def api_templates(self, persona: str = ""):
        persona_id = await self._persona(persona)
        return await self.runtime.store.get_setting(f"templates:{persona_id}", [])

    @register.api(method="POST", path="/v1/templates")
    async def api_save_template(self, payload: dict, persona: str = ""):
        persona_id = await self._persona(persona)
        async def save():
            name = str(payload.get("name", "")).strip()[:100]
            plan = payload.get("plan")
            if not name or not isinstance(plan, dict):
                raise KRDError("invalid_template", "Template requires a name and plan")
            templates = await self.runtime.store.get_setting(f"templates:{persona_id}", [])
            entry = {"id": payload.get("id") or new_id("tpl"), "name": name,
                     "description": str(payload.get("description", ""))[:500],
                     "prompt": str(payload.get("prompt", ""))[:50000],
                     "planning_prompt": str(payload.get("planning_prompt", ""))[:50000],
                     "execution_prompt": str(payload.get("execution_prompt", ""))[:50000],
                     "icon": str(payload.get("icon", "sparkle"))[:64],
                     "icon_url": str(payload.get("icon_url", ""))[:2000],
                     "icon_asset_id": str(payload.get("icon_asset_id", ""))[:128],
                     "plan": plan, "custom": True, "created_at": now()}
            templates = [item for item in templates if item["id"] != entry["id"]]
            templates.append(entry)
            if len(templates) > 100 or len(json.dumps(templates, ensure_ascii=False)) > 2000000:
                raise KRDError("template_limit", "Custom templates exceed the storage limit")
            await self.runtime.store.put_setting(f"templates:{persona_id}", templates)
            return entry
        return await self._call(save)

    @register.api(method="DELETE", path="/v1/templates/{identifier}")
    async def api_delete_template(self, identifier: str, persona: str = ""):
        persona_id = await self._persona(persona)
        async def remove():
            templates = await self.runtime.store.get_setting(f"templates:{persona_id}", [])
            remaining = [item for item in templates if item["id"] != identifier]
            if len(remaining) == len(templates):
                raise KRDError("not_found", "Template not found")
            await self.runtime.store.put_setting(f"templates:{persona_id}", remaining)
            return {"deleted": True}
        return await self._call(remove)

    @register.api(method="GET", path="/v1/runs")
    async def api_runs(self, limit: int = 50, persona: str = ""):
        persona_id = await self._persona(persona)
        return await self.runtime.store.all(
            "SELECT * FROM runs WHERE persona_id=? ORDER BY claimed_at DESC LIMIT ?",
            (persona_id, max(1, min(200, limit))))

    @register.api(method="GET", path="/v1/diagnostics")
    async def api_diagnostics(self):
        return await webapi.diagnostics(self.runtime)

    @register.api(method="GET", path="/v1/export")
    async def api_export(self, persona: str = ""):
        persona_id = await self._persona(persona)
        return await webapi.export_data(self.runtime, persona_id)

    @register.api(method="POST", path="/v1/import/preview")
    async def api_import_preview(self, payload: dict, persona: str = ""):
        persona_id = await self._persona(persona)
        return await self._call(webapi.import_preview, self.runtime, persona_id, payload)

    @register.api(method="POST", path="/v1/import/commit")
    async def api_import_commit(self, payload: dict, persona: str = ""):
        persona_id = await self._persona(persona)
        return await self._call(webapi.import_commit, self.runtime, persona_id, payload)

    @register.ws("/v1/events")
    async def api_events(self, websocket):
        await websocket.accept()
        self.runtime.ws_clients.add(websocket)
        try:
            await websocket.send_json({"type": "ready", "payload": {"time": __import__('time').time()}})
            while True:
                text = await websocket.receive_text()
                if text == "ping":
                    await websocket.send_json({"type": "pong", "payload": {"time": __import__('time').time()}})
        except Exception:
            pass
        finally:
            self.runtime.ws_clients.discard(websocket)
