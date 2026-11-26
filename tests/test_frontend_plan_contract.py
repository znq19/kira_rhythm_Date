from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web" / "js"


def test_plan_mutations_require_plan_payload():
    app = (WEB / "app.js").read_text(encoding="utf-8")
    for marker in ("跳过失败：服务器没有返回计划",
                   "删除失败：服务器没有返回计划",
                   "保存失败：服务器没有返回计划"):
        assert marker in app
    assert app.count("if (!result?.plan) throw new Error") >= 3


def test_preview_fixture_implements_skip_and_plan_list():
    fixture = (ROOT / "tests" / "web_fixture.js").read_text(encoding="utf-8")
    assert "path.includes('/skip')" in fixture
    assert "item.state = 'cancelled'" in fixture
    assert "plan: data.plan, revision: data.plan?.revision" in fixture
    assert "return response(data.plan ? [data.plan] : [])" in fixture


def test_delete_controls_are_wired():
    views = (WEB / "views.js").read_text(encoding="utf-8")
    assert "跳过本次" in views
    assert "@delete=\"$emit('delete', $event)\"" in views
    assert "删除时段" in views
    assert "删除整天" in views

def test_pet_sleep_and_random_context_actions():
    pet = (WEB / "pet.js").read_text(encoding="utf-8")
    assert "nightSleepEligible" in pet
    assert "sleepSuppressedUntil" in pet
    assert "this.hour >= 23" in pet
    assert "wakeFromSleep" in pet
    assert "randomPool" in pet
    assert "sleepiness" not in pet


def test_settings_draft_normalizes_preview_and_partial_config():
    app = (WEB / "app.js").read_text(encoding="utf-8")
    views = (WEB / "views.js").read_text(encoding="utf-8")
    fixture = (ROOT / "tests" / "web_fixture.js").read_text(encoding="utf-8")
    assert "calendar_context: { holiday: true" in app
    assert "this.draft.inject_agenda ??= true" in app
    assert "普通聊天附带待办清单" in views
    assert "待办清单最多字符数" in views
    assert "calendar_context" in fixture

def test_bottom_nav_uses_six_columns_without_wrapping():
    css = (ROOT / "web" / "css" / "nte.css").read_text(encoding="utf-8")
    assert ".main-nav { display:grid; grid-template-columns:repeat(6,minmax(0,1fr));" in css
    assert ".main-nav button:last-child" not in css
    views = (ROOT / "web" / "js" / "views.js").read_text(encoding="utf-8")
    assert "$root.draft.threads.empty_mode" in views
    assert "$root.draft.threads.empty_min" in views
    assert "$root.draft.threads.empty_max" in views
    assert "要求至少 {{ $root.draft.threads.empty_min }} 条（严格）" in views

def test_tool_prompts_are_compact_and_keep_contract_tokens():
    main = (ROOT / "main.py").read_text(encoding="utf-8")
    runtime = (ROOT / "krd" / "runtime.py").read_text(encoding="utf-8")
    descriptions = {}
    for name in ("rhythm_plan", "rhythm_update", "rhythm_view"):
        match = re.search(r'name="' + name + r'",\s*\n\s*description="(.*?)",\n\s*params=', main, re.S)
        assert match, name
        descriptions[name] = match.group(1)
    guide_match = re.search(r'STATIC_TOOL_GUIDE = """(.*?)"""\.strip\(\)', runtime, re.S)
    assert guide_match
    guide = guide_match.group(1)

    assert len(descriptions["rhythm_plan"]) <= 320
    assert len(descriptions["rhythm_update"]) <= 700
    assert len(guide) <= 680

    for token in ("expected_revision", "current_plan.revision", "threads_requiring_response",
                  "threads_reference", "at", "start/end", "items"):
        assert token in descriptions["rhythm_plan"] or token in guide, token
    for token in ("append_item", "plan_id", "date", "block", "thread_response",
                  "thread_add", "thread_touch", "update_item", "item_id", "梦"):
        assert token in descriptions["rhythm_update"], token
    assert "record_experience" in guide and "梦" in guide
    for token in ("expected_revision", "current_plan.revision", "threads_requiring_response",
                  "threads_reference", "current_item.instruction", "<msg/>",
                  "[KRD Threads]", "[KRD Agenda]"):
        assert token in guide, token

def test_narrative_preview_and_planning_refresh_contracts():
    app = (WEB / "app.js").read_text(encoding="utf-8")
    views = (WEB / "views.js").read_text(encoding="utf-8")
    css = (ROOT / "web" / "css" / "nte.css").read_text(encoding="utf-8")
    assert "export const PlanBrief" in views
    assert "plan-brief" in views and "item.instruction" in views and "item-target" in views
    assert "this.$root.sessionName(this.item.target)" in views
    assert "$root.planningLabel('立即规划')" in views
    assert "sessionName(target)" in app
    assert "planningPending" in app and "waitForPlanningUpdate" in app and "startPlanning" in app
    assert ".item-instruction" in css and ".plan-brief" in css
    assert "display:block !important" in css


def test_target_badge_shows_session_name_and_raw_id():
    app = (WEB / "app.js").read_text(encoding="utf-8")
    views = (WEB / "views.js").read_text(encoding="utf-8")
    css = (ROOT / "web" / "css" / "nte.css").read_text(encoding="utf-8")
    fixture = (ROOT / "tests" / "web_fixture.js").read_text(encoding="utf-8")

    assert "sessionEntry(target)" in app and "sessionName(target)" in app
    assert 'class="target-name"' in views and 'class="target-id"' in views
    assert "{{ item.target }}" in views
    assert "nextTargetName" in views and "$root.nextItem.target" in views
    assert ".item-target .target-name" in css and ".target-id" in css
    assert "target: 'qq:dm:10001'" in fixture and "target: 'qq:gm:70001'" in fixture


def test_plan_brief_shows_revision_reason():
    views = (WEB / "views.js").read_text(encoding="utf-8")
    css = (ROOT / "web" / "css" / "nte.css").read_text(encoding="utf-8")
    fixture = (ROOT / "tests" / "web_fixture.js").read_text(encoding="utf-8")
    assert "revision_reason" in views and "planning_reason" in views
    assert "revisionReasonLabel" in views
    assert "规划理由" in views and "调整理由" in views and "上次规划" in views
    assert "plan-brief-reason" in views and ".plan-brief-reason" in css
    assert '<plan-brief v-if="$root.selectedPlan"' in views
    assert "revision_reason" in fixture and "revision_actor" in fixture and "planning_reason" in fixture


def test_session_access_picker_uses_unfiltered_catalog():
    app = (WEB / "app.js").read_text(encoding="utf-8")
    views = (WEB / "views.js").read_text(encoding="utf-8")
    policy = (ROOT / "krd" / "policy.py").read_text(encoding="utf-8")
    webapi = (ROOT / "krd" / "webapi.py").read_text(encoding="utf-8")
    fixture = (ROOT / "tests" / "web_fixture.js").read_text(encoding="utf-8")

    assert "session_catalog" in policy and "all_sessions" in webapi
    assert "buildSessionCatalog" in app and "data.all_sessions" in app
    assert "未加载的会话" in app
    assert "missing: session.missing" in views
    assert "（当前）" in views
    assert "all_sessions" in fixture


def test_plan_item_id_and_block_prompt_contract():
    main = (ROOT / "main.py").read_text(encoding="utf-8")
    runtime = (ROOT / "krd" / "runtime.py").read_text(encoding="utf-8")
    assert '"block": {"type": "string", "description": "可选分组名；同一组的小项使用相同名称。"}' in main
    assert "省略时归入" not in main
    assert '"id": {"type": "string"' in main
    assert "8 位" in main and "短 ID" in main

    description = re.search(
        r'name="rhythm_plan",\s*\n\s*description="(.*?)",\n\s*params=', main, re.S).group(1)
    guide = re.search(r'STATIC_TOOL_GUIDE = """(.*?)"""\.strip\(\)', runtime, re.S).group(1)
    for text in (description, guide):
        assert "block 为分组名（同名归组）" in text
        assert "items[].id" in text
        assert "生活片段" not in text
