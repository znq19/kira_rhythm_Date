from __future__ import annotations

import asyncio
import os
import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import httpx
from fastapi import FastAPI


def run(framework: Path, plugin_root: Path):
    os.chdir(framework)
    (framework / "data").mkdir(exist_ok=True)
    sys.path.insert(0, str(framework))
    from core.agent.func_tool_manager import FuncToolManager
    from core.config import KiraConfig
    from core.plugin import PluginManager

    class PersonaManager:
        async def get_active_persona(self): return SimpleNamespace(id="default", name="Default")
        async def get_persona(self): return SimpleNamespace(id="default", name="Default")
        async def list_personas(self): return [SimpleNamespace(id="default", name="Default")]
        async def get_reference_image(self, persona_id): return None

    class SessionManager:
        async def get_sessions(self, include_content=False, kind=None):
            return [SimpleNamespace(sid="qq:dm:10001", session_title="Chat", adapter_name="qq")]
        async def resolve_session(self, target):
            from core.chat import Session
            return Session(adapter_name="qq", session_type="dm", session_id="10001")

    class AdapterManager:
        def get_adapters(self): return {}
        def get_adapter(self, name): return None

    async def main():
        root = Path(tempfile.mkdtemp(prefix="krd-api-"))
        data_dir = root / "plugin_data" / "kira_rhythm_Date"
        data_dir.mkdir(parents=True)
        try:
            tool_manager = FuncToolManager()
        except TypeError:
            tool_manager = FuncToolManager(KiraConfig({}))
        ctx = SimpleNamespace(session_mgr=SessionManager(), persona_mgr=PersonaManager(), adapter_mgr=AdapterManager(),
                              event_bus=SimpleNamespace(publish=lambda event: asyncio.sleep(0)), tool_mgr=tool_manager,
                              plugin_mgr=None, get_plugin_data_dir=lambda: data_dir)
        manager = PluginManager(ctx)
        ctx.plugin_mgr = manager
        app = FastAPI()
        manager.set_web_app(app)
        loaded = await manager.load_plugin_from_dir(plugin_root, auto_install=False)
        for route in app.routes:
            for dependency in getattr(route, "dependencies", []):
                app.dependency_overrides[dependency.dependency] = lambda: None
        transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
        base = "/api/plugin/kira_rhythm_Date/v1"
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(f"{base}/bootstrap")
            assert response.status_code == 200, response.text
            boot = response.json()
            assert isinstance(boot["all_sessions"], list)
            sessions_all = await client.get(f"{base}/sessions?scope=all")
            assert sessions_all.status_code == 200 and isinstance(sessions_all.json(), list)
            avatar = await client.get(f"{base}/avatar?refresh=1")
            assert avatar.status_code == 200 and avatar.headers["cache-control"] == "no-store, max-age=0"
            calendar = await client.get(f"{base}/calendar?start=2026-02-17&end=2026-02-18")
            assert calendar.status_code == 200, calendar.text
            solar_days = calendar.json()["days"]
            assert solar_days[0]["holiday"] == {"name": "春节", "is_off_day": True}
            invalid = await client.put(f"{base}/config", json={"patch": {"weather": None}, "expected_revision": 0})
            assert invalid.status_code == 400 and invalid.json()["detail"]["code"] == "invalid_config"
            today = datetime.now().date().isoformat()
            day_state = await client.post(f"{base}/day-state/{today}", json={"current_mood": "平静"})
            assert day_state.status_code == 200 and day_state.json()["current_mood"] == "平静"
            readonly = await client.post(f"{base}/day-state/{today}", json={"current_mood": "x", "revision": 9})
            assert readonly.status_code == 400
            tomorrow = (datetime.now().date() + timedelta(days=1)).isoformat()
            payload = {"date": tomorrow, "expected_revision": 0, "blocks": [{"title": "组", "items": [{
                "title": "API 小项", "schedule": {"type": "exact", "at": "09:00"}, "target": "qq:dm:10001",
            }]}]}
            saved = await client.post(f"{base}/plans", json=payload)
            assert saved.status_code == 200, saved.text
            result = saved.json()
            assert result["plan"]["revision_actor"] == "user"
            assert result["plan"]["revision_reason"] == "WebUI edit"
            assert result["plan"]["planning_reason"] == ""
            item_id = result["plan"]["blocks"][0]["items"][0]["id"]
            patched = await client.patch(f"{base}/items/{item_id}", json={"title": "API 小项改名"})
            assert patched.status_code == 200, patched.text
            assert patched.json()["plan"]["revision_actor"] == "user"
            assert patched.json()["plan"]["revision_reason"] == "WebUI edit"
            plans = await client.get(f"{base}/plans?start={tomorrow}&end={tomorrow}")
            assert plans.status_code == 200 and len(plans.json()) == 1
            listed = plans.json()[0]
            assert listed["revision_reason"] == "WebUI edit" and listed["revision_actor"] == "user"
            diff = await client.get(f"{base}/plans/{result['plan']['id']}/diff?persona=other")
            assert diff.status_code == 200 and diff.json() == []
            run = await client.post(f"{base}/items/{item_id}/run")
            assert run.status_code == 400 and run.json()["detail"]["code"] == "dispatch_failed"
            template = await client.post(f"{base}/templates", json={
                "name": "API 模板", "prompt": "保持从容", "planning_prompt": "按模板规划",
                "icon": "moon", "plan": {"title": "模板", "blocks": []},
            })
            assert template.status_code == 200, template.text
            assert template.json()["prompt"] == "保持从容"
            assert template.json()["planning_prompt"] == "按模板规划"
            assert template.json()["icon"] == "moon"
            templates = await client.get(f"{base}/templates")
            assert templates.status_code == 200 and any(entry["id"] == template.json()["id"] for entry in templates.json())
            day_types = await client.get(f"{base}/day-types")
            holiday = next(entry for entry in day_types.json() if entry["id"] == "holiday")
            holiday["config"]["overrides"] = {"planning_prompt": "假日 API 提示"}
            holiday["rules"]["dates"] = ["2026-12-25"]
            saved_day_type = await client.post(f"{base}/day-types", json=holiday)
            assert saved_day_type.status_code == 200, saved_day_type.text
            refreshed = await client.get(f"{base}/day-types")
            holiday = next(entry for entry in refreshed.json() if entry["id"] == "holiday")
            assert holiday["config"]["overrides"]["planning_prompt"] == "假日 API 提示"
            assert holiday["rules"]["dates"] == ["2026-12-25"]
            created_thread = await client.post(f"{base}/threads", json={
                "kind": "goal", "title": "API 目标", "dossier": "API 档案",
                "priority": 2, "next_step": "下一步", "due_at": "",
            })
            assert created_thread.status_code == 200, created_thread.text
            thread = created_thread.json()
            assert thread["status"] == "open" and thread["title"] == "API 目标"
            assert thread["short_id"] and thread["dossier"] == "API 档案"
            threads = await client.get(f"{base}/threads?status=open")
            assert threads.status_code == 200 and any(row["id"] == thread["id"] for row in threads.json())
            detail = await client.get(f"{base}/threads/{thread['id']}")
            assert detail.status_code == 200 and detail.json()["logs"] == []
            touched = await client.post(f"{base}/threads/{thread['id']}/touch", json={
                "note": "API 打卡", "next_step": "继续走"})
            assert touched.status_code == 200, touched.text
            assert touched.json()["log"]["note"] == "API 打卡"
            updated = await client.patch(f"{base}/threads/{thread['id']}", json={
                "title": "API 目标更新", "status": "paused"})
            assert updated.status_code == 200, updated.text
            assert updated.json()["title"] == "API 目标更新" and updated.json()["status"] == "paused"
            removed = await client.delete(f"{base}/threads/{thread['id']}")
            assert removed.status_code == 200 and removed.json()["deleted"] is True
            credentials = await client.get(f"{base}/weather/credentials")
            assert credentials.status_code == 200
            assert credentials.json()["providers"]["weatherapi"]["weatherapi_key"] is False
            saved_credentials = await client.put(f"{base}/weather/credentials", json={
                "providers": {"weatherapi": {"weatherapi_key": "secret-weather-key"}},
            })
            assert saved_credentials.status_code == 200, saved_credentials.text
            assert saved_credentials.json()["providers"]["weatherapi"]["weatherapi_key"] is True
            assert "secret-weather-key" not in saved_credentials.text
            await client.put(f"{base}/weather/credentials", json={
                "providers": {"qweather": {"qweather_key": "second-key"}},
            })
            credentials = await client.get(f"{base}/weather/credentials")
            assert credentials.json()["providers"]["weatherapi"]["weatherapi_key"] is True
            assert credentials.json()["providers"]["qweather"]["qweather_key"] is True
        await manager.terminate(loaded)
        print("API INTEGRATION OK", framework.name, "bootstrap/config/day-state/plans/diff/dispatch")

    asyncio.run(main())


if __name__ == "__main__":
    run(Path(sys.argv[1]), Path(sys.argv[2]))
