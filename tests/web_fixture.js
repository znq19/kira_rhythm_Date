window.__errors = []
window.addEventListener('error', (event) => window.__errors.push(event.message))
window.addEventListener('unhandledrejection', (event) => window.__errors.push(String(event.reason)))
window.PluginPageContext = {
  ready: () => Promise.resolve({ isDark: true, locale: 'zh' }),
  onThemeChange: () => () => {},
  buildWsUrl: () => null,
}
const today = new Date()
const iso = today.toISOString().slice(0, 10)
const at = (hour, minute = 0) => Math.floor(new Date(`${iso}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`).getTime() / 1000)
const plan = {
  id: 'pln_demo', date: iso, day_type_id: 'weekday', title: '从容而有留白的一天', revision: 4, state: 'active',
  overview: '上午专注于喜欢的事，傍晚出去走一走，夜里给自己安静收尾。',
  planned_appearance: '雾蓝色针织衫，带一件轻便外套', planned_mood: '安静，也有一点期待',
  revision_actor: 'bot', revision_reason: '11-25 已经排得够满，这天减量，把唯一认真说话的时段放在傍晚。',
  planning_reason: '11-25 已经排得够满，这天减量，把唯一认真说话的时段放在傍晚。',
  blocks: [
    { id: 'b1', title: '早晨与上午', color: '#aa9af8', meta: {}, items: [
      { id: 'i1', title: '醒来后的第一句话', intent: '让今天有一个连续的起点', schedule: { type: 'window', start: '08:20', end: '09:00' }, scheduled_at: at(8, 42), execution_probability: 1, interaction: 'auto', target: 'qq:dm:10001', state: 'triggered', category: '' },
      { id: 'i2', title: '读一会儿书', intent: '在忙碌之前保留自己的空间', schedule: { type: 'exact', at: '10:00' }, scheduled_at: at(10), execution_probability: 1, interaction: 'silent', target: 'qq:dm:99999', state: 'triggered_silent', category: 'reading' },
    ] },
    { id: 'b2', title: '傍晚与夜里', color: '#77d6b3', meta: {}, items: [
      { id: 'i3', title: '随意走走', intent: '换一换节奏，看看外面', schedule: { type: 'window', start: '18:00', end: '19:00' }, scheduled_at: at(18, 36), execution_probability: .8, interaction: 'auto', target: 'qq:gm:70001', state: 'scheduled', category: '' },
      { id: 'i4', title: '整理今天', intent: '让今天完整地收尾', instruction: '', schedule: { type: 'exact', at: '22:20' }, scheduled_at: at(22, 20), execution_probability: 1, interaction: 'auto', target: 'qq:dm:10001', state: 'scheduled', category: '' },
    ] },
  ],
}
const config = {
  schema_version: 1, enabled: true, auto_plan: true, startup_plan: false, plan_on_all_triggered: true, all_triggered_target_mode: 'planning_pool', planning_review: { enabled: false, interval_minutes: 360, min_lead_minutes: 30, prompt: '检查当前计划是否仍然合适。' }, planning_time: '23:00', planning_mode: 'next_missing',
  min_items: 2, max_items: 12, max_horizon_days: 14, allow_exact: true, allow_window: true, allow_probability: true,
  default_probability: 1, min_probability: .2, session_access: { mode: 'allow_list', sessions: ['qq:dm:10001', 'qq:dm:99999'] },
  planning_pool: { sessions: [], strategy: 'pure_random' }, execution_pool: { sessions: [], strategy: 'pure_random' },
  modify_window_seconds: 86400, max_change_units: 0, history_days: 3, history_char_budget: 16000, diff_revisions: 2,
  recovery_grace_seconds: 600, history_mode: 'notice', inject_day_state: true, inject_agenda: true, agenda_max_chars: 2400, approval_required: false, timezone: 'system',
  blocked_execution_windows: [], quiet_delivery_windows: [{ start: '23:30', end: '07:00' }], required_coverage_windows: [],
  planning_prompt: '根据日型、天气与最近生活规划接下来的一天。', execution_prompt: '自然行动，也可保持安静。',
  calendar_context: { holiday: true, adjusted_workday: true, festivals: true, solar_terms: true }, calendar_display: { holiday: true, adjusted_workday: true, festivals: true, solar_terms: true, lunar_date: true },
  calendar_refresh_hours: 6, weather: { mode: 'real', provider: 'open_meteo', locations: {}, chat_current: true, chat_forecast: false, chat_forecast_days: 2, target_detail: true, future_detail: false, item_next: true, forecast_days: 7, current_ttl_seconds: 1800, forecast_ttl_seconds: 21600, timeout_seconds: 3, virtual: { seed: 'krd', climate: 'temperate', location: '' } },
  appearance: { theme: 'lacrimosa_dusk', effects: 'auto', avatar_source: 'auto', avatar_adapter_order: [], avatar_asset_id: '' }, retention_days: 180, per_persona: {},
}
const data = {
  ready: true, persona_id: 'aina', active_persona_id: 'aina', personas: [{ id: 'aina', name: '爱奈', active: true }, { id: 'mio', name: '美羽', active: false }],
  date: iso, calendar_today: { date: iso, lunar: { text: '二〇二六年十月初六' }, solar_term: '', solar_festivals: [], lunar_festivals: [], holiday: null, display: '初六', data_status: 'fresh' }, plan, day_state: { current_appearance: '雾蓝色针织衫', current_mood: '安静而期待', current_activity: '刚刚读完一章', current_note: '上午专注于喜欢的事，傍晚出去走一走。', revision: 2 },
  day_types: [{ id: 'weekday', name: '工作日', builtin: 1, rules: {}, config: { color: '#7c8cf8' } }, { id: 'weekend', name: '周末', builtin: 1, rules: {}, config: { color: '#ad7cf8' } }, { id: 'dream_day', name: '做梦的日子', builtin: 0, rules: {}, config: { color: '#77d6b3' } }],
  config, config_revision: 3, global_revision: 3,
  prompt_defaults: { planning_prompt: config.planning_prompt, execution_prompt: config.execution_prompt, planning_review_prompt: config.planning_review.prompt },
  sessions: [{ sid: 'qq:dm:10001', title: '与爱奈的夜晚', adapter: 'qq' }],
  all_sessions: [{ sid: 'qq:dm:10001', title: '与爱奈的夜晚', adapter: 'qq' }, { sid: 'qq:gm:70001', title: '小小读书会', adapter: 'qq' }, { sid: 'qq:dm:20002', title: '未加入权限的会话', adapter: 'qq' }],
  planning_sessions: [{ sid: 'qq:dm:10001', title: '与爱奈的夜晚', adapter: 'qq' }],
  weather: { mode: 'real', real: { source: 'real', location: '上海', condition: '局部多云', temperature: 23.4, status: 'fresh' } },
  weather_forecast: (() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + i)
      const date = d.toISOString().slice(0, 10)
      days.push({ date, condition: ['多云','小雨','晴','阴','阵雨','晴','多云'][i], temperature_min: 12 + i, temperature_max: 20 + i, precipitation_probability: [20,60,0,15,70,5,10][i], periods: [] })
    }
    return { mode: 'real', status: 'fresh', days }
  })(),
  avatar: { source: 'builtin', url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAgMTYwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgcng9IjQ4IiBmaWxsPSIjYTk5YWY4Ii8+PGNpcmNsZSBjeD0iODAiIGN5PSI3NSIgcj0iNDQiIGZpbGw9IiNmN2Y0ZmYiLz48L3N2Zz4=' },
  scheduler: { running: true, next_due: at(18, 36) }, server_time: Date.now() / 1000,
}
const response = (body) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
window.__requests = []
window.fetch = async (url, options = {}) => {
  const path = String(url)
  window.__requests.push({ path, method: options.method || 'GET', body: options.body || null, cache: options.cache })
  if (path.includes('/bootstrap')) {
    const snapshot = JSON.parse(JSON.stringify(data))
    const requested = new URL(path, location.origin).searchParams.get('persona')
    if (requested) snapshot.persona_id = requested
    return response(snapshot)
  }
  if (path.includes('/config') && options.method === 'PUT') {
    const payload = JSON.parse(options.body)
    const merge = (base, patch) => {
      for (const [key, value] of Object.entries(patch || {})) {
        if (value && typeof value === 'object' && !Array.isArray(value)) merge(base[key] ||= {}, value)
        else base[key] = value
      }
      return base
    }
    merge(data.config, payload.patch)
    data.config_revision += 1
    return response({ config: data.config, revision: data.config_revision })
  }
  if (path.includes('/avatar?')) return response(data.avatar)
  if (path.includes('/weather/forecast')) return response(data.weather_forecast)
  if (path.includes('/items/') && path.includes('/skip') && options.method === 'POST') {
    const itemId = path.split('/items/')[1].split('/skip')[0]
    if (data.plan) {
      for (const block of data.plan.blocks || []) {
        for (const item of block.items || []) {
          if (item.id === itemId) {
            item.state = 'cancelled'
            item.reason = JSON.parse(options.body || '{}').reason || 'WebUI 手动跳过'
          }
        }
      }
      data.plan.revision = (data.plan.revision || 0) + 1
    }
    return response({ plan: data.plan, revision: data.plan?.revision, diff: [{ op: 'changed', item_id: itemId, changes: { state: { to: 'cancelled' } } }] })
  }
  if (path.includes('/items/') && path.includes('/delete') && options.method === 'POST') {
    const itemId = path.split('/items/')[1].split('/delete')[0]
    if (data.plan) for (const block of data.plan.blocks || []) block.items = (block.items || []).filter((item) => item.id !== itemId)
    return response({ plan: data.plan, revision: (data.plan?.revision || 0) + 1, diff: [{ op: 'removed', item_id: itemId }] })
  }
  if (path.includes('/blocks/') && path.includes('/delete') && options.method === 'POST') {
    const blockId = path.split('/blocks/')[1].split('/delete')[0]
    if (data.plan) data.plan.blocks = (data.plan.blocks || []).filter((block) => block.id !== blockId)
    return response({ plan: data.plan, revision: (data.plan?.revision || 0) + 1, diff: [] })
  }
  if (path.includes('/plans/') && path.includes('/delete') && options.method === 'POST') {
    data.plan = null
    return response({ deleted: true, affected_items: 0, history_preserved: true })
  }
  if (path.includes('/weather/current')) return response(data.weather)
  if (path.includes('/calendar?')) {
    const params = new URL(path, location.origin).searchParams
    const start = new Date(`${params.get('start')}T12:00:00Z`)
    const end = new Date(`${params.get('end')}T12:00:00Z`)
    const days = []
    for (let d = new Date(start), i = 0; d <= end; d.setUTCDate(d.getUTCDate() + 1), i++) {
      const date = d.toISOString().slice(0, 10)
      const holiday = i === 14 ? { name: '法定假日', is_off_day: true } : (i === 16 ? { name: '调班', is_off_day: false } : null)
      days.push({ date, lunar: { text: `二〇二六年十月${['初一','初二','初三','初四','初五','初六','初七'][i % 7]}` }, solar_term: i === 5 ? '小雪' : '', solar_festivals: i === 15 ? ['测试节日'] : [], lunar_festivals: [], holiday, display: holiday?.name || (i === 5 ? '小雪' : ['初一','初二','初三','初四','初五','初六','初七'][i % 7]), data_status: 'fresh' })
    }
    return response({ start: params.get('start'), end: params.get('end'), days, sources: { 2026: { status: 'fresh', papers: [] } } })
  }
  if (path.includes('/calendar/refresh') && options.method === 'POST') return response(data.calendar_today)
  if (path.includes('/day-state/') && options.method === 'POST') {
    data.day_state = { ...data.day_state, ...JSON.parse(options.body), revision: data.day_state.revision + 1 }
    return response(data.day_state)
  }
  if (path.includes('/plans?')) return response(data.plan ? [data.plan] : [])
  if (path.includes('/diff')) return response([{ revision: 4, actor: 'bot', reason: '午后想留白一段时间', created_at: at(14, 30), diff: [{ op: 'changed', title: '随意走走', changes: { scheduled_at: { from: at(18), to: at(18, 36) } } }] }])
  if (path.includes('/runs')) return response([{ item_id: 'i1', status: 'finalized', probability: 1, claimed_at: at(8, 42) }, { item_id: 'i2', status: 'finalized', probability: 1, claimed_at: at(10) }])
  if (path.includes('/diagnostics')) return response({ counts: { plans: 8, items: 34, runs: 21 }, scheduler: { running: true }, database: 'SQLite WAL', websocket_clients: 1 })
  if (path.includes('/day-types')) return response(data.day_types)
  if (path.includes('/sessions')) return response(path.includes('scope=all') ? data.all_sessions : data.sessions)
  if (path.includes('/templates')) return response([])
  return response({ ok: true })
}
