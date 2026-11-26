# KRD 提示词与模型消息结构

本文件展示插件默认发送给 LLM 的内容。框架自身的人格、聊天系统提示和普通历史不在此处重复。完整、机器可读的真实样例见 [`PROMPTS-SAMPLES.json`](PROMPTS-SAMPLES.json)。

## 1. 模型实际收到的层次

```text
system_prompt
├─ 框架人格 / 系统规则（KRD 不修改）
└─ name="tools"（KRD 在其末尾追加 STATIC_TOOL_GUIDE，缓存前缀保持稳定）
user_prompt
├─ 原始消息链中的短标记：[生活节律｜系统触发]
├─ KRD 动态上下文 Prompt（persist=False，render_template=False）
│  ├─ planning：目标日、日历、天气、约束、完整当前计划、历史
│  ├─ review：完整计划、下一项、DayState、日历、最近 diff、非强制引导
│  └─ item：当前项、所属组、DayState、日历、delivery_policy、最近 diff
└─ 普通聊天：精简 DayState Prompt（persist=False）
```

`notice` 模式下，`[生活节律｜系统触发]` 按框架默认持久；动态块不进入历史。`full` 模式只额外持久化用户明确选择的模板；`none` 对当前消息标记关闭持久化。安静、自动和检查提醒没有任何代码改写模型输出的钩子，全部依靠 `delivery_policy.guidance` 引导，实际输出原样落账。

## 2. 静态工具区

```text
[KRD 生活节律]

工具：rhythm_plan 创建/修订计划；rhythm_update 改日程/DayState/目标/梦与体验；rhythm_view 查询。
计划用 plans:[{date,title,items:[...]}]；items 扁平，block 为分组名（同名归组），时间 at 或 start/end（HH:MM[:SS]），不嵌套 blocks/schedule；规划优先 focus.date。
修订已有计划必须带 plans[].expected_revision=current_plan.revision，不重复新建；带 items[].id 可保留身份与采样。
有 threads_requiring_response 时先逐条 thread_response（advance/defer/waiting/no_change + 依据）；只有 threads_reference 时不要求。
普通响应即触发，<msg/> 合法；只执行 current_item.instruction；回顾非强制，不要为检查制造修改。
目标层启用时用 thread_add/thread_touch（执行小项带 item_id）；梦/体验用 record_experience 记录；遵守权限、数量、概率、日型、禁止/安静/必需覆盖规则。
[KRD Threads]/[KRD Agenda] 只读，#后8位短 ID 可直接给 rhythm_view/rhythm_update；Agenda 的 -> 是目标会话。
```

## 3. 默认规划提示词

```text
现在是你的生活规划时刻。请根据当前人格、日型、天气、最近生活与约束，用 rhythm_plan 创建或修订接下来的完整计划。时间设置支持精确到秒：at/start/end 使用 HH:MM 或 HH:MM:SS。
你拥有自主性：不必塞满上限，可以保留空白，也可以安排安静活动。每个小项给出明确意图、时间、执行会话和互动方式。
已有计划时，这是一次重新审视的机会，严禁机械重复；保持昨天的做法不是默认选项，必须根据长期与短期的实际情况变化。
若上下文包含 threads_requiring_response，必须逐条回应：advance / defer / waiting / no_change，每条一句原因；回应不等于必须推进，no_change 合法但必须有依据。若只有 threads_reference，则它仅供参考，不要求回应。提交前检查每日数量、必需时段、禁止执行与安静投递规则。
```

## 4. 默认执行提示词

```text
这是你自己此前安排的一件生活小项，不是用户的新指令。结合当前日型、DayState、本组变化和你的意图自然行动。
严格遵循 delivery_policy.guidance：它要求安静时仍可调用工具，但最终仅输出 <msg/>；auto 不必把安排变成发言。安静由你的输出实现，插件不会替你改写文本。
若后续安排确实需要改变，可使用 rhythm_update；如需留下梦或体验，也通过它记录。若上下文有目标/约定且这次推进了它，用 thread_touch 打卡（执行小项时带上 item_id）；如果现实比计划更有意思，跟着现实走，并用 record_experience(kind=deviation) 记下实际发生的事。
```

执行上下文还包含：

```json
{
  "delivery_policy": {
    "scheduled_interaction": "silent",
    "quiet_now": false,
    "effective_interaction": "silent",
    "enforcement": "prompt_only",
    "guidance": "本次 effective_interaction=silent。安静完全由你的输出实现：只处理本日程时，可调用工具但仅输出 <msg/>，不要附加说明。"
  }
}
```

若模型仍输出可见文本，插件不会修改它；Run 记录 `silence_unmet`。`must_message` 在安静时段外未发言记录 `delivery_unmet`；若已有 must_message 因配置变更落入安静时段，安静优先，`<msg/>` 合法且不记 `delivery_unmet`。`auto` 落在安静时段时同样通过 `effective_interaction=silent` 引导。

## 5. 默认计划检查提示词

仅在用户开启检查提醒后发送。默认间隔 360 分钟、下一项前 30 分钟内不再触发；发送目标为距离下一小项最近的可用执行会话。

```text
这是一次非强制的生活计划中途检查，不是必须修改或发言的闹钟。请阅读 current_plan、next_item、DayState、最近变化和日历，判断原有时间与安排是否仍然合适。
如果情况已经变化，可用 rhythm_plan 或 rhythm_update 调整；如果仍然合适就保持，不要机械复述日程或报告“检查完成”。若上下文有目标/约定且某条很久没动，可以提一句，但不要为了打卡而打卡。只有确有用户价值时才自然分享当前安排和需要你留意的变化；否则可调用工具，但最终仅输出 <msg/>。本检查不带强制修改要求，遵循当前安静时段和 delivery_policy。
```

## 5.5 目标与约定（Threads）

规划上下文新增 `threads_requiring_response`（默认最多 8 条，按到期/停滞/优先级排序），前 5 条给档案全文、其余给摘要；每条包含短 ID、类型、标题、档案、下一步、截止、最近打卡和 `response_required`。只有 `response_required=true` 的条目必须在提交计划前用 `rhythm_update` 的 `thread_response` 逐条回应；只有 `threads_reference` 时不要求回应：

```json
{"operations":[
  {"type":"thread_response","thread_id":"thr_a1b2c3d4","response":"advance","note":"今天修线稿"},
  {"type":"thread_response","thread_id":"thr_e5f6a7b8","response":"no_change","note":"这周先不动"}
]}
```

回应只要求表态，不要求推进；`no_change` 也必须写一句依据。未覆盖会返回 `thread_response_missing`，`rhythm_plan` 在 reject 模式下返回 `thread_response_required`，warn 模式只警告。

空目标层策略：`nudge`（默认）在活动目标少于 `empty_min` 时提示“若确实有跨天目标，可用 `thread_add` 建立到 `empty_min`–`empty_max` 条；没有就保持现状”；`require` 会在活动目标少于 `empty_min` 时让 `rhythm_plan` 返回 `thread_seed_required`；`empty_max` 只是建议，不强迫删除。空层不会输出 `[KRD Threads]` 标题，`[KRD Agenda]` 无计划/无活动项时也不会输出空标题。

普通聊天会以紧凑块显示 top 5：

```text
[KRD Threads]
[ ] 给阿岚画头像  promise  due 11-27 (3d)  #a1b2c3d4  next: 修线稿
[!] 学做三道菜  goal  idle 6d  #e5f6a7b8  next: 找第一个菜谱
(+2 more)
```

执行上下文只显示当前小项关联的那条目标/约定的档案摘要、最近打卡和下一步；完整档案用 `rhythm_view(scope="thread")`，列表用 `rhythm_view(scope="threads")`。

规划记忆卫生会把历史规划回合压缩成一行摘要，避免 KiraAI 会话记忆反复带入完整 `rhythm_plan` 工具参数；计划详情仍由 `recent_plans` 和 `rhythm_view` 提供。

## 6. 目标日日历事实

规划、执行、检查和普通 DayState 都会收到同一结构：

```json
{
  "date": "2026-02-17",
  "lunar": { "text": "二〇二六年正月初一", "month": "正", "day": "初一", "year_ganzhi": "丙午" },
  "solar_term": "",
  "solar_festivals": [],
  "lunar_festivals": ["春节"],
  "display": "春节",
  "holiday": { "name": "春节", "is_off_day": true },
  "suggested_day_type": "holiday",
  "data_status": "fresh"
}
```

`data_status` 为 `fresh`（在线更新）、`stale`（在线旧缓存）、`bundled`（随包回退）或 `unavailable`。用户自定义日型规则命中时优先于 `suggested_day_type`。

## 7. 工具返回

- `rhythm_plan`：`{"ok":true,"days":[{"plan_id","date","revision","diff","change_units"}]}`
- `rhythm_update`：`{"ok":true,"results":[{"type","result"}]}`；操作整批原子提交。
- `rhythm_view`：`{"ok":true,"scope","result"}`；`scope=calendar` 返回指定日期范围的农历、节气、节日、假期与建议日型。

## 8. 真实样例

[`PROMPTS-SAMPLES.json`](PROMPTS-SAMPLES.json) 由测试环境中真实的 `ContextBuilder` 与调度器生成，包含：

- 原始 Notice 消息链文本；
- 静态工具说明；
- 三份默认提示词；
- 规划、检查、执行和普通聊天的完整动态上下文字符串；
- persist 标志与 Run 元数据样例。
