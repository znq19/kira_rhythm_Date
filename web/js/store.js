import { get, put } from './api.js?v=1.3.7'

export const state = Vue.reactive({
  loading: true,
  saving: false,
  view: 'today',
  data: null,
  selectedPersona: '',
  selectedDate: '',
  selectedPlan: null,
  runs: [],
  diagnostics: null,
  notices: [],
  editor: null,
  threadEditor: null,
  threadTouch: null,
  threads: [],
  dayStateEditor: false,
  dayTypeEditor: null,
  templateEditor: null,
  settingsTab: 'general',
  theme: 'tomato_rain',
  loadError: '',
})

export function notify(text, type = 'success') {
  const id = Date.now() + Math.random()
  state.notices.push({ id, text, type })
  setTimeout(() => {
    const index = state.notices.findIndex((item) => item.id === id)
    if (index >= 0) state.notices.splice(index, 1)
  }, 4200)
}

let bootstrapEpoch = 0
let planEpoch = 0

export async function loadBootstrap(persona = '', { reset = true } = {}) {
  const epoch = ++bootstrapEpoch
  const showLoading = reset || !state.data
  if (showLoading) state.loading = true
  try {
    const data = await get(`/bootstrap${persona ? `?persona=${encodeURIComponent(persona)}` : ''}`)
    if (epoch !== bootstrapEpoch) return null
    state.loadError = ''
    state.data = data
    state.selectedPersona = data.persona_id || persona
    if (reset || !state.selectedDate) {
      state.selectedDate = data.date || ''
      state.selectedPlan = data.plan
    } else if (state.selectedDate === data.date) {
      state.selectedPlan = data.plan
    }
    document.documentElement.dataset.themeName = data.config?.appearance?.theme || 'tomato_rain'
    return data
  } catch (error) {
    if (epoch === bootstrapEpoch) state.loadError = error.message
    throw error
  } finally {
    if (epoch === bootstrapEpoch && showLoading) state.loading = false
  }
}

export async function loadPlan(date, persona = state.selectedPersona) {
  if (!date) return null
  const epoch = ++planEpoch
  const plans = await get(`/plans?start=${encodeURIComponent(date)}&end=${encodeURIComponent(date)}&persona=${encodeURIComponent(persona)}`)
  if (epoch !== planEpoch || persona !== state.selectedPersona) return null
  state.selectedPlan = plans[0] || null
  state.selectedDate = date
  return state.selectedPlan
}

export async function saveConfig(patch, expectedRevision = state.data.config_revision) {
  state.saving = true
  try {
    const result = await put(`/config?persona=${encodeURIComponent(state.selectedPersona)}`, {
      patch,
      expected_revision: expectedRevision,
    })
    state.data.config = result.config
    state.data.config_revision = result.revision
    notify('设置已热生效')
    return result
  } catch (error) {
    notify(error.message, 'error')
    throw error
  } finally {
    state.saving = false
  }
}

export const fmt = {
  time(value, withSeconds = null) {
    if (!value) return '—'
    const date = new Date(Number(value) * 1000)
    const includeSeconds = withSeconds === true || (withSeconds !== false && date.getSeconds() !== 0)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', ...(includeSeconds ? { second: '2-digit' } : {}) })
  },
  date(value) {
    if (!value) return '—'
    const date = new Date(Number(value) * 1000)
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', ...(date.getSeconds() !== 0 ? { second: '2-digit' } : {}) })
  },
  dateOnly(value) {
    if (!value) return '—'
    const parts = String(value).split('-')
    return `${parts[1]}/${parts[2]}`
  },
  state(value) {
    return ({
      scheduled: '待触发', queued: '已排队', running: '执行中', triggered: '已触发',
      triggered_silent: '安静经历', skipped_probability: '概率跳过', missed: '已错过',
      cancelled: '已取消', failed: '失败', interrupted: '已中断', delivery_unmet: '投递未达成',
    })[value] || value
  },
  interaction(value) {
    return ({ auto: '自由', must_message: '需发言', silent: '安静' })[value] || value
  },
  runStatus(value) {
    return ({ prepared: '已准备', queued: '已排队', running: '执行中', responded: '已回应', finalized: '已归档', skipped_probability: '概率跳过', failed: '失败', interrupted: '已中断' })[value] || value
  },
  field(value) {
    return ({
      title: '标题', intent: '意图', instruction: '执行说明', schedule: '时间', interaction: '互动方式',
      target: '目标会话', execution_probability: '执行概率', state: '状态', category: '分类',
      planned_appearance: '预计服装', planned_mood: '预计心情', overview: '整体概述',
      day_type_id: '日型', start: '开始', end: '结束', at: '时刻', type: '时间类型',
      current_appearance: '当前服装', current_mood: '当前心情', current_location: '当前位置',
      current_activity: '当前活动', current_note: '当前备注', blocks: '日程分组', items: '小项',
      scheduled_at: '计划时间', created_at: '创建时间', updated_at: '更新时间', plan_id: '所属计划', block_id: '所属分组',
    })[value] || '计划内容'
  },
  humanValue(field, value) {
    if (value == null || value === '') return '未设置'
    if (typeof value === 'boolean') return value ? '开启' : '关闭'
    if (field === 'state') return this.state(value)
    if (field === 'interaction') return this.interaction(value)
    if (field === 'execution_probability') return `${Math.round(Number(value) * 100)}%`
    if (field === 'type') return ({ exact: '精确时间', window: '时间窗' })[value] || '时间设置'
    if (field === 'schedule' && typeof value === 'object') {
      if (value.type === 'window') return `${value.start}—${value.end}`
      return value.at || '时间待定'
    }
    if (field.endsWith('_at') && Number(value)) return this.date(value)
    if (Array.isArray(value)) return value.length ? `${value.length} 项设置` : '无'
    if (typeof value === 'object') return '已调整'
    return String(value)
  },
  countdown(value, serverTime) {
    if (!value) return ''
    const seconds = Math.round(value - serverTime)
    if (seconds <= 0) return '已到时间'
    if (seconds < 60) return `${seconds} 秒后`
    if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟后`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时 ${Math.floor((seconds % 3600) / 60)} 分后`
    return `${Math.floor(seconds / 86400)} 天后`
  },
}
