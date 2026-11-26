import { get, post, put, patch, upload, socket, ready } from './api.js?v=1.3.7'
import { state, loadBootstrap, loadPlan, saveConfig, notify, fmt } from './store.js?v=1.3.7'
import { UiIcon, TodayView, CalendarView, ChangesView, ThreadsView, TemplatesView, SettingsView, ItemEditor, DayStateEditor, DayTypeEditor, TemplateEditor, ThreadEditor, ThreadTouch, PlanBrief } from './views.js?v=1.3.7'
import { planTemplates, themeTemplates } from './templates.js?v=1.3.7'
import { PetCompanion } from './pet.js?v=1.3.7'

const clone = (value) => JSON.parse(JSON.stringify(value))
const typeOfSeconds = (value) => !Number.isInteger(value)
const MIN_REFRESH_SPIN_MS = 420
const ASSET_VERSION = '1.3.7'
const assetBase = window.PluginPageContext?.assetBase || '/static/plugin/kira_rhythm_Date/assets'
const dateShift = (date, days) => {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

const app = Vue.createApp({
  components: { UiIcon, TodayView, CalendarView, ChangesView, ThreadsView, TemplatesView, SettingsView, ItemEditor, DayStateEditor, DayTypeEditor, TemplateEditor, ThreadEditor, ThreadTouch, PlanBrief, PetCompanion },
  data() {
    return {
      state,
      fmt,
      planTemplates,
      themeTemplates,
      assetBase,
      booted: false,
      bootTimer: null,
      motionLevel: (typeof document !== 'undefined' && document.documentElement.dataset.motion === 'reduced') ? 'reduced' : 'full',
      navItems: [
        { id: 'today', label: '此刻', icon: 'home' },
        { id: 'calendar', label: '日历', icon: 'calendar' },
        { id: 'changes', label: '变化', icon: 'changes' },
        { id: 'threads', label: '目标', icon: 'pin' },
        { id: 'templates', label: '模板', icon: 'templates' },
        { id: 'settings', label: '设置', icon: 'settings' },
      ],
      diffs: [],
      threads: [],
      threadFilter: 'open',
      threadKind: '',
      threadFilters: [
        { id: 'open', label: '进行中' },
        { id: 'paused', label: '已暂停' },
        { id: 'done', label: '已完成' },
        { id: 'dropped', label: '已放弃' },
        { id: 'deleted', label: '已删除' },
        { id: 'all', label: '全部' },
      ],
      threadKinds: [
        { id: 'goal', label: '长期目标' },
        { id: 'promise', label: '约定 / 承诺' },
        { id: 'project', label: '手头项目' },
        { id: 'habit', label: '习惯' },
        { id: 'open_loop', label: '未完成小事' },
        { id: 'mystery', label: '长期悬念' },
      ],
      threadStatuses: [
        { id: 'open', label: '进行中' },
        { id: 'paused', label: '已暂停' },
        { id: 'done', label: '已完成' },
        { id: 'dropped', label: '已放弃' },
        { id: 'deleted', label: '已删除' },
      ],
      diffPlanId: '',
      recentPlans: [],
      monthPlans: [],
      monthCalendar: {},
      monthForecast: {},
      calendarSyncing: false,
      calendarSyncMessage: "",
      draft: null,
      allSessions: [],
      cityQuery: '',
      cityResults: [],
      weatherResult: '',
      weatherPreviewing: false,
      diagnostics: null,
      liveTimer: null,
      refreshing: false,
      refreshQueued: false,
      monthAnchor: '',
      customTemplates: [],
      customAccent: '',
      weatherCredentialDraft: {},
      weatherCredentialStatus: {},
      weatherCredentialDirty: {},
      weatherContactDraft: '',
      weatherContactDirty: false,
      showPresetTemplates: false,
      showBaseDayTypes: false,
      clockNow: Date.now() / 1000,
      randomThemeId: themeTemplates.filter((entry) => !entry.random)[Math.floor(Math.random() * themeTemplates.filter((entry) => !entry.random).length)].id,
      clockTimer: null,
      batteryLevel: null,
      batteryCharging: false,
      online: typeof navigator === 'undefined' ? true : navigator.onLine,
      networkLabel: '—',
      signalBars: 0,
      deviceCleanup: [],
      avatarNonce: 0,
      avatarBroken: false,
      settingsBaseRevision: 0,
      refreshEpoch: 0,
      viewEpoch: 0,
      monthEpoch: 0,
      forecastEpoch: 0,
      diffEpoch: 0,
      confirmDialog: null,
      confirmResolver: null,
      planningCooldownUntil: 0,
      planningPending: false,
      runCooldownUntil: 0,
    }
  },
  computed: {
    timezoneOptions() {
      const options = [
        ['system', '跟随宿主系统'], ['Asia/Shanghai', '中国标准时间 · 上海'], ['Asia/Hong_Kong', '香港时间'],
        ['Asia/Taipei', '台北时间'], ['Asia/Tokyo', '日本标准时间 · 东京'], ['Asia/Seoul', '韩国标准时间 · 首尔'],
        ['Asia/Singapore', '新加坡时间'], ['Asia/Bangkok', '曼谷时间'], ['Asia/Kolkata', '印度标准时间'],
        ['Europe/London', '伦敦时间'], ['Europe/Paris', '巴黎时间'], ['Europe/Berlin', '柏林时间'],
        ['America/New_York', '纽约时间'], ['America/Chicago', '芝加哥时间'], ['America/Los_Angeles', '洛杉矶时间'],
        ['Australia/Sydney', '悉尼时间'], ['Pacific/Auckland', '奥克兰时间'], ['UTC', '协调世界时 UTC'],
      ]
      const current = this.draft?.timezone
      if (current && !options.some(([id]) => id === current)) options.push([current, `当前自定义 · ${current}`])
      return options
    },
    configuredHour() {
      const date = new Date(this.clockNow * 1000)
      const timezone = this.data.config?.timezone
      if (!timezone || timezone === 'system') return date.getHours()
      try { return Number(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', hourCycle: 'h23' }).format(date)) % 24 }
      catch (_) { return date.getHours() }
    },
    planningCooldownRemaining() {
      return Math.min(5, Math.max(0, Math.ceil((this.planningCooldownUntil - this.clockNow * 1000) / 1000)))
    },
    runCooldownRemaining() {
      return Math.min(5, Math.max(0, Math.ceil((this.runCooldownUntil - this.clockNow * 1000) / 1000)))
    },
    localClock() {
      const date = new Date(this.clockNow * 1000)
      const timezone = this.data.config?.timezone
      try { return new Intl.DateTimeFormat('zh-CN', { timeZone: timezone && timezone !== 'system' ? timezone : undefined, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(date) }
      catch (_) { return fmt.time(this.clockNow) }
    },
    timePhase() {
      const hour = this.configuredHour
      if (hour >= 5 && hour < 8) return 'dawn'
      if (hour >= 8 && hour < 16) return 'day'
      if (hour >= 16 && hour < 19) return 'dusk'
      return 'night'
    },
    phaseLabel() {
      return ({ dawn: '黎明 · 05:00—08:00', day: '白昼 · 08:00—16:00', dusk: '黄昏 · 16:00—19:00', night: '深夜 · 19:00—05:00' })[this.timePhase]
    },
    sceneBackground() {
      const scene = ({ dawn: 'dusk', day: 'day', dusk: 'dusk', night: 'night' })[this.timePhase]
      return `linear-gradient(90deg, rgba(5,8,14,.78) 0%, rgba(5,8,14,.28) 50%, rgba(5,8,14,.5) 100%), url("${this.assetUrl(`scenes/${scene}.webp`)}")`
    },
    eventState() {
      if (this.nextItem && this.nextItem.scheduled_at - this.clockNow <= 900) return 'imminent'
      if ((this.data.plan?.blocks || []).some((block) => (block.items || []).some((item) => item.state === 'running'))) return 'live'
      return 'quiet'
    },
    networkSignal() {
      if (!this.online || this.signalBars === 0) return 0
      return Math.max(1, Math.min(4, this.signalBars))
    },
    batteryText() { return this.batteryLevel == null ? '—' : `${this.batteryLevel}%` },
    eventLabel() {
      return ({ imminent: '事件临近', live: '事件执行中', quiet: '城市信号稳定' })[this.eventState]
    },
    activeTheme() {
      const actual = themeTemplates.filter((entry) => !entry.random)
      const id = this.data.config?.appearance?.theme || 'random'
      const chosen = id === 'random' ? this.randomThemeId : id
      return actual.find((entry) => entry.id === chosen) || actual.find((entry) => entry.id === this.randomThemeId) || actual[0]
    },
    petVariant() { return this.activeTheme?.character || 'tomato' },
    petPoses() {
      const char = this.activeTheme?.character || 'tomato'
      return { idle: this.assetUrl(`pets/${char}_idle.webp`), sit: this.assetUrl(`pets/${char}_sit.webp`), read: this.assetUrl(`pets/${char}_read.webp`), eat: this.assetUrl(`pets/${char}_eat.webp`), drink: this.assetUrl(`pets/${char}_drink.webp`), sleep: this.assetUrl(`pets/${char}_sleep.webp`), phone: this.assetUrl(`pets/${char}_phone.webp`), look: this.assetUrl(`pets/${char}_look.webp`), stretch: this.assetUrl(`pets/${char}_stretch.webp`), dance: this.assetUrl(`pets/${char}_dance.webp`), crouch: this.assetUrl(`pets/${char}_crouch.webp`) }
    },
    currentView() {
      const name = { today: 'TodayView', calendar: 'CalendarView', changes: 'ChangesView', threads: 'ThreadsView', templates: 'TemplatesView', settings: 'SettingsView' }[state.view] || 'TodayView'
      return this.$options.components[name]
    },
    selectedDate: { get() { return state.selectedDate }, set(value) { state.selectedDate = value } },
    selectedPlan: { get() { return state.selectedPlan }, set(value) { state.selectedPlan = value } },
    settingsTab: { get() { return state.settingsTab }, set(value) { state.settingsTab = value } },
    dayStateEditor: { get() { return state.dayStateEditor }, set(value) { state.dayStateEditor = value } },
    dayTypeEditor: { get() { return state.dayTypeEditor }, set(value) { state.dayTypeEditor = value } },
    runs() { return state.runs },
    data() { return state.data || {} },
    saving() { return state.saving },
    dayTypeName() {
      const id = this.data.plan?.day_type_id
      return this.data.day_types?.find((entry) => entry.id === id)?.name || '自由日'
    },
    nextItem() {
      const items = (this.data.plan?.blocks || []).flatMap((block) => block.items || [])
      return items.filter((item) => item.state === 'scheduled').sort((a, b) => a.scheduled_at - b.scheduled_at)[0] || null
    },
    upcomingItems() {
      return (this.data.plan?.blocks || []).flatMap((block) => block.items || []).filter((item) => item.state === 'scheduled').sort((a, b) => a.scheduled_at - b.scheduled_at).slice(1, 4)
    },
    planStats() {
      const items = (this.data.plan?.blocks || []).flatMap((block) => block.items || []).filter((item) => !['cancelled', 'deleted'].includes(item.state))
      return { total: items.length, done: items.filter((item) => ['triggered', 'triggered_silent'].includes(item.state)).length }
    },
    latestDiff() { return this.diffs },
    allPlanTemplates() {
      const custom = new Map(this.customTemplates.map((template) => [template.id, template]))
      const builtins = this.planTemplates.map((base) => {
        const override = custom.get(base.id)
        return override ? { ...base, ...override, builtin: true, override: true, custom: false } : { ...base, builtin: true }
      })
      const extras = this.customTemplates.filter((template) => !this.planTemplates.some((base) => base.id === template.id)).map((template) => ({ ...template, custom: true }))
      return [...builtins, ...extras]
    },
    presetPlanTemplates() { return this.allPlanTemplates.filter((template) => template.builtin) },
    customPlanTemplates() { return this.allPlanTemplates.filter((template) => !template.builtin) },
    baseDayTypes() { return (this.data.day_types || []).filter((entry) => entry.builtin) },
    calendarFlags() {
      return { holiday: true, adjusted_workday: true, festivals: true, solar_terms: true, lunar_date: true,
               ...(this.data.config?.calendar_display || {}) }
    },
    selectedDayTypes() { return this.activeDayTypeNames(this.selectedDate) },
    customDayTypes() { return (this.data.day_types || []).filter((entry) => !entry.builtin) },
    heroStyle() {
      const banner = this.data.banner?.url
      return banner ? { backgroundImage: `linear-gradient(90deg, var(--panel-solid) 0%, transparent 100%), url("${banner}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}
    },
    avatarUrl() {
      if (this.data.avatar?.source === 'builtin') return ''
      const url = this.data.avatar?.url || ''
      if (!url) return ''
      if (!url.startsWith('/') || !this.avatarNonce) return url
      return `${url}${url.includes('?') ? '&' : '?'}entry=${this.avatarNonce}`
    },
    weatherInfo() {
      const weather = this.data.weather || {}
      return weather.real || weather.virtual || null
    },
    weatherText() {
      if (!this.weatherInfo) return this.data.weather?.mode === 'off' ? '天气未启用' : '等待天气配置'
      if (this.weatherInfo.status === 'location_required') return '尚未设置地点'
      if (this.weatherInfo.status === 'pending') return '正在后台更新天气'
      if (this.weatherInfo.status === 'unavailable') return '天气暂时不可用'
      return this.weatherInfo.condition || '天气未知'
    },
    weatherDetail() {
      if (!this.weatherInfo) return '可在设置中开启真实或虚拟天气'
      const info = this.weatherInfo
      const temperature = info.temperature != null ? `${info.temperature}°C` : ''
      return `${info.location || ''} ${temperature} ${info.status === 'stale' ? '· 缓存' : ''}`.trim()
    },
    weatherCredentialFields() {
      const provider = this.draft?.weather?.provider || this.data.weather?.provider || 'open_meteo'
      return ({
        weatherapi: [['weatherapi_key', 'WeatherAPI API Key']],
        visualcrossing: [['visualcrossing_key', 'Visual Crossing API Key']],
        qweather: [['qweather_key', '和风天气 API Key']],
        weatherbit: [['weatherbit_key', 'Weatherbit API Key']],
        openweather: [['openweather_key', 'OpenWeather API Key']],
      })[provider] || []
    },
    weatherNeedsContact() {
      const provider = this.draft?.weather?.provider || this.data.weather?.provider
      return ['met_norway', 'nws'].includes(provider)
    },
    weatherKind() {
      if (!this.weatherInfo) return 'off'
      const text = this.weatherText
      if (/雪/.test(text)) return 'snow'
      if (/雨|雷/.test(text)) return 'rain'
      if (/云|阴|雾/.test(text)) return 'cloud'
      if (/晴/.test(text)) return 'sun'
      return this.isNight ? 'moon' : 'sun'
    },
    isNight() { return new Date().getHours() >= 19 || new Date().getHours() < 6 },
    currentLocation() {
      const locations = this.draft?.weather?.locations || {}
      return locations[state.selectedPersona] || locations.default || null
    },
    monthTitle() {
      if (!this.monthAnchor) return ''
      const [year, month] = this.monthAnchor.split('-')
      return `${year} 年 ${Number(month)} 月`
    },
    selectedCalendar() {
      return this.monthCalendar[state.selectedDate] ||
        (state.selectedDate === this.data.date ? this.data.calendar_today : null)
    },
    todayCalendar() { return this.data.calendar_today || null },
    todayHoliday() {
      const day = this.data.calendar_today
      return day?.holiday ? `${day.holiday.name}${day.holiday.is_off_day ? '' : ' · 调班'}` : ''
    },
    selectedForecast() {
      return this.monthForecast[this.selectedDate] || null
    },
    calendarRefreshHours() {
      return Number(this.data.config?.calendar_refresh_hours || 6)
    },
    monthCells() {
      if (!this.monthAnchor) return []
      const [year, month] = this.monthAnchor.split('-').map(Number)
      const first = new Date(Date.UTC(year, month - 1, 1, 12))
      const startOffset = (first.getUTCDay() + 6) % 7
      const cells = []
      for (let index = 0; index < 42; index++) {
        const date = new Date(first)
        date.setUTCDate(first.getUTCDate() + index - startOffset)
        const iso = date.toISOString().slice(0, 10)
        const plan = this.monthPlans.find((entry) => entry.date === iso)
        const count = plan ? plan.blocks.reduce((sum, block) => sum + block.items.length, 0) : 0
        const calendar = this.monthCalendar[iso]
        cells.push({ key: iso, date: iso, day: date.getUTCDate(), current: date.getUTCMonth() === month - 1, plan, count,
          calendar, lunar: calendar?.display || '', holiday: calendar?.holiday, forecast: this.monthForecast[iso] || null,
          color: this.data.day_types?.find((entry) => entry.id === plan?.day_type_id)?.config?.color })
      }
      return cells
    },
  },
  watch: {
    avatarUrl() { this.avatarBroken = false },
    timePhase: { immediate: true, handler(value) { document.documentElement.dataset.phase = value } },
    weatherKind: { immediate: true, handler(value) { document.documentElement.dataset.weather = value } },
    eventState: { immediate: true, handler(value) { document.documentElement.dataset.event = value } },
  },
  methods: {
    notify(text, type = 'success') { notify(text, type) },
    toggleMotion() {
      const next = this.motionLevel === 'full' ? 'reduced' : 'full'
      this.motionLevel = next
      document.documentElement.dataset.motion = next
      try { localStorage.setItem('krd_motion', next) } catch (_) {}
      this.notify(next === 'full' ? '完整特效已开启' : '已切换为精简特效')
    },
    openWeatherSettings() {
      this.setView('settings')
      this.settingsTab = 'weather'
    },
    updateNetwork() {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      this.online = navigator.onLine
      const type = conn?.effectiveType || (this.online ? '4g' : 'offline')
      this.networkLabel = this.online ? ({ 'slow-2g': '2G', '2g': '2G', '3g': '3G', '4g': '4G' })[type] || '网络' : '离线'
      this.signalBars = !this.online ? 0 : type === 'slow-2g' ? 1 : type === '2g' ? 2 : type === '3g' ? 3 : 4
    },
    finishBoot(delay = 1200) {
      if (this.bootTimer) return
      this.bootTimer = setTimeout(() => { this.booted = true }, delay)
    },
    async initDeviceStatus() {
      this.updateNetwork()
      const onOnline = () => this.updateNetwork()
      const onOffline = () => this.updateNetwork()
      window.addEventListener('online', onOnline)
      window.addEventListener('offline', onOffline)
      this.deviceCleanup.push(() => window.removeEventListener('online', onOnline), () => window.removeEventListener('offline', onOffline))
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      if (conn?.addEventListener) {
        conn.addEventListener('change', onOnline)
        this.deviceCleanup.push(() => conn.removeEventListener('change', onOnline))
      }
      if (navigator.getBattery) {
        try {
          const battery = await navigator.getBattery()
          const sync = () => {
            this.batteryLevel = Math.round(battery.level * 100)
            this.batteryCharging = !!battery.charging
          }
          sync()
          const events = ['levelchange', 'chargingchange']
          for (const event of events) {
            battery.addEventListener(event, sync)
            this.deviceCleanup.push(() => battery.removeEventListener(event, sync))
          }
        } catch (_) { this.batteryLevel = null }
      }
    },
    assetUrl(path) {
      const inline = window.__KRD_INLINE_ASSETS__?.[path]
      if (inline) return inline
      const separator = assetBase.includes('?') ? '&' : '?'
      return `${assetBase}/${path}${separator}v=${ASSET_VERSION}`
    },
    themePreviewStyle(theme) {
      if (theme?.random) return { backgroundImage: 'radial-gradient(circle at 30% 25%, #ff3f6e 0, transparent 32%), radial-gradient(circle at 70% 70%, #45d9cf 0, transparent 34%), linear-gradient(135deg,#171427,#0a0d16)' }
      if (theme?.art || theme?.customArt) return { backgroundImage: `linear-gradient(180deg, transparent, rgba(5,8,18,.6)), url("${this.themeArt(theme)}")` }
      return {}
    },
    themeArt(theme) { return this.assetUrl(theme?.customArt || `themes/${theme?.art || 'tomato_rain'}.webp`) },
    async setView(view) {
      state.view = view
      const epoch = ++this.viewEpoch
      try {
        if (view === 'today') {
          state.selectedDate = this.data.date
          state.selectedPlan = this.data.plan
          this.diffPlanId = this.data.plan?.id || ''
          await this.loadDiff()
        }
        if (view === 'changes') await Promise.all([this.loadRecentPlans(), this.loadRuns(), this.loadDiff()])
        if (view === 'threads') await this.loadThreads()
        if (view === 'settings') this.prepareSettings()
        if (view === 'calendar') await this.loadMonth()
        if (view === 'templates') await this.loadCustomTemplates()
      } catch (error) {
        if (epoch === this.viewEpoch) notify(error.message, 'error')
      }
    },
    async refresh({ persona = state.selectedPersona, reset = false, entry = true } = {}) {
      if (this.refreshing) { this.refreshQueued = true; return }
      this.refreshing = true
      const refreshStartedAt = performance.now()
      try {
      const epoch = ++this.refreshEpoch
      const data = await loadBootstrap(persona, { reset })
      if (!data || epoch !== this.refreshEpoch || !data.ready) return
      this.applyAppearance()
      this.clockNow = Date.now() / 1000
      if (reset) {
        this.monthAnchor = state.selectedDate.slice(0, 7)
        this.diffPlanId = state.selectedPlan?.id || ''
        this.prepareSettings()
        state.editor = null
        state.threadEditor = null
        state.threadTouch = null
        state.dayStateEditor = false
        state.dayTypeEditor = null
      }
      const jobs = []
      if (state.view === 'today') jobs.push(this.loadDiff(), this.loadThreads())
      if (state.view === 'calendar') jobs.push(this.loadMonth(), this.loadThreads())
      if (state.view === 'changes') jobs.push(this.loadRecentPlans(), this.loadRuns(), this.loadDiff())
      if (state.view === 'threads') jobs.push(this.loadThreads())
      if (state.view === 'templates') jobs.push(this.loadCustomTemplates())
      await Promise.all(jobs)
      if (entry) {
        this.avatarNonce = Date.now()
        // Deliberately after first paint: remote refresh must not hold bootstrap.
        this.refreshAvatar(data.persona_id).catch(() => {})
        this.loadWeather(data.persona_id).catch(() => {})
      }
      } finally {
        const remaining = MIN_REFRESH_SPIN_MS - (performance.now() - refreshStartedAt)
        if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining))
        this.refreshing = false
        if (this.refreshQueued) {
          this.refreshQueued = false
          this.refresh({ persona: state.selectedPersona, reset: false, entry: false }).catch((error) => notify(error.message, 'error'))
        }
      }
    },
    async selectPersona() {
      try {
        await this.refresh({ persona: state.selectedPersona, reset: true, entry: true })
      } catch (error) { notify(error.message, 'error') }
    },
    async selectDate(date) {
      try {
        state.selectedDate = date
        this.monthAnchor = date.slice(0, 7)
        await loadPlan(date)
        this.diffPlanId = state.selectedPlan?.id || ''
        await this.loadDiff()
      } catch (error) { notify(error.message, 'error') }
    },
    async shiftMonth(delta) {
      const [year, month] = this.monthAnchor.split('-').map(Number)
      const date = new Date(Date.UTC(year, month - 1 + delta, 1, 12))
      this.monthAnchor = date.toISOString().slice(0, 7)
      await this.loadMonth()
    },
    async loadMonth() {
      if (!this.monthAnchor) return
      const epoch = ++this.monthEpoch
      const anchor = String(this.monthAnchor).slice(0, 7)
      const persona = state.selectedPersona
      const [year, month] = anchor.split('-').map(Number)
      const start = `${anchor}-01`
      const end = new Date(Date.UTC(year, month, 0, 12)).toISOString().slice(0, 10)
      const [plans, calendar] = await Promise.all([
        get(`/plans?start=${start}&end=${end}&persona=${encodeURIComponent(persona)}`),
        get(`/calendar?start=${start}&end=${end}`),
      ])
      if (epoch === this.monthEpoch && persona === state.selectedPersona && anchor === this.monthAnchor) {
        this.monthPlans = plans
        this.monthCalendar = Object.fromEntries(calendar.days.map((day) => [day.date, day]))
      }
      this.loadMonthForecast(start, end, epoch, persona, anchor).catch(() => {})
    },
    async loadMonthForecast(start, end, epoch, persona, anchor) {
      const forecastEpoch = ++this.forecastEpoch
      if (epoch === this.monthEpoch && persona === state.selectedPersona && anchor === this.monthAnchor) {
        this.monthForecast = {}
      }
      const data = await get(`/weather/forecast?start=${start}&end=${end}&persona=${encodeURIComponent(persona)}`)
      if (forecastEpoch !== this.forecastEpoch || epoch !== this.monthEpoch ||
          persona !== state.selectedPersona || anchor !== this.monthAnchor) return
      const next = {}
      for (const day of data.days || []) {
        if (day?.date) next[day.date] = day
      }
      this.monthForecast = next
    },
    async refreshCalendarData() {
      if (this.calendarSyncing) return
      this.calendarSyncing = true
      this.calendarSyncMessage = '正在更新…'
      const year = Number((this.monthAnchor || this.selectedDate).slice(0, 4))
      try {
        await post('/calendar/refresh', { year })
        await this.loadMonth()
        this.calendarSyncMessage = '已更新'
        notify('法定假期数据已更新')
      } catch (error) {
        this.calendarSyncMessage = '更新失败'
        notify(error.message || '法定假期数据更新失败', 'error')
      } finally {
        this.calendarSyncing = false
      }
    },
    forecastCellText(day) {
      if (!day) return ''
      const condition = day.condition || ''
      const min = day.temperature_min
      const max = day.temperature_max
      const range = min != null && max != null ? `${min}~${max}°` : max != null ? `${max}°` : min != null ? `${min}°` : ''
      return [condition, range].filter(Boolean).join(' ')
    },
    forecastDetailText(day) {
      if (!day) return ''
      const text = this.forecastCellText(day)
      return day.precipitation_probability ? `${text} · 降水 ${day.precipitation_probability}%` : text
    },
    async loadThreads() {
      const persona = state.selectedPersona
      const filter = this.threadFilter
      const kind = this.threadKind
      const status = filter === 'all' ? '' : filter
      const query = new URLSearchParams({ persona, limit: '200' })
      if (status) query.set('status', status)
      if (kind) query.set('kind', kind)
      const threads = await get(`/threads?${query.toString()}`)
      if (persona === state.selectedPersona && filter === this.threadFilter && kind === this.threadKind) {
        this.threads = threads
      }
    },
    setThreadFilter(id) {
      this.threadFilter = id
      this.loadThreads().catch((error) => notify(error.message, 'error'))
    },
    newThread() {
      state.threadEditor = { thread: null }
    },
    async openThread(thread) {
      const persona = state.selectedPersona
      try {
        const detail = await get(`/threads/${encodeURIComponent(thread.id)}?persona=${encodeURIComponent(persona)}`)
        if (persona !== state.selectedPersona) return
        state.threadEditor = { thread: detail }
      } catch (error) { notify(error.message, 'error') }
    },
    closeThreadEditor() { state.threadEditor = null },
    async saveThread(form) {
      try {
        const payload = {
          kind: form.kind, title: form.title, dossier: form.dossier, status: form.status,
          priority: Number(form.priority), next_step: form.next_step, due_at: form.due_at,
          note: form.note,
        }
        if (form.id) await patch(`/threads/${encodeURIComponent(form.id)}?persona=${encodeURIComponent(state.selectedPersona)}`, payload)
        else await post(`/threads?persona=${encodeURIComponent(state.selectedPersona)}`, payload)
        state.threadEditor = null
        await this.loadThreads()
        notify(form.id ? '目标/约定已更新' : '目标/约定已创建')
      } catch (error) { notify(error.message, 'error') }
    },
    async deleteThread(thread) {
      if (!await this.askConfirm({
        title: '删除目标 / 约定',
        message: `删除「${thread.title}」？

删除后不再出现在规划与聊天上下文，打卡记录仍保留在数据库。`,
        confirmText: '删除', danger: true,
      })) return
      try {
        await requestDelete(`/threads/${encodeURIComponent(thread.id || thread)}?persona=${encodeURIComponent(state.selectedPersona)}`)
        state.threadEditor = null
        state.threadTouch = null
        await this.loadThreads()
        notify('目标/约定已删除')
      } catch (error) { notify(error.message, 'error') }
    },
    async closeThreadStatus(thread, status) {
      if (!await this.askConfirm({
        title: status === 'done' ? '标记完成' : '放弃目标',
        message: `确认把「${thread.title}」标记为${status === 'done' ? '完成' : '放弃'}？`,
        confirmText: status === 'done' ? '完成' : '放弃', danger: status !== 'done',
      })) return
      try {
        await patch(`/threads/${encodeURIComponent(thread.id)}?persona=${encodeURIComponent(state.selectedPersona)}`, {
          status, note: status === 'done' ? 'WebUI 标记完成' : 'WebUI 放弃',
        })
        await this.loadThreads()
        notify(status === 'done' ? '已标记完成' : '已放弃')
      } catch (error) { notify(error.message, 'error') }
    },
    openThreadTouch(thread) { state.threadTouch = { thread } },
    closeThreadTouch() { state.threadTouch = null },
    async saveThreadTouch(form) {
      const thread = state.threadTouch?.thread
      if (!thread) return
      try {
        await post(`/threads/${encodeURIComponent(thread.id)}/touch?persona=${encodeURIComponent(state.selectedPersona)}`, {
          note: form.note, next_step: form.next_step,
        })
        state.threadTouch = null
        state.threadEditor = null
        await this.loadThreads()
        notify('打卡已记录')
      } catch (error) { notify(error.message, 'error') }
    },
    threadTitle(identifier) {
      const value = String(identifier || '')
      const pool = [...(this.data.threads || []), ...(this.threads || [])]
      const found = pool.find((entry) => entry.id === value || value.startsWith(entry.id) || entry.id.startsWith(value))
      return found?.title || '目标/约定'
    },
    threadKindLabel(value) {
      return this.threadKinds.find((entry) => entry.id === value)?.label || value
    },
    threadStatusLabel(value) {
      return this.threadStatuses.find((entry) => entry.id === value)?.label || value
    },
    threadDueLabel(thread) {
      if (!thread.due) return '无截止'
      const days = thread.due_in_days
      if (days == null) return thread.due
      if (thread.overdue) return `已过期 ${Math.abs(days || 0)} 天 · ${thread.due}`
      if (days === 0) return `今天到期 · ${thread.due}`
      return `${days} 天后 · ${thread.due}`
    },
    async loadRecentPlans() {
      const persona = state.selectedPersona
      const start = dateShift(state.selectedDate, -14)
      const end = dateShift(state.selectedDate, 14)
      const plans = await get(`/plans?start=${start}&end=${end}&persona=${encodeURIComponent(persona)}`)
      if (persona === state.selectedPersona) this.recentPlans = plans
    },
    async loadRuns() {
      const persona = state.selectedPersona
      const runs = await get(`/runs?limit=60&persona=${encodeURIComponent(persona)}`)
      if (persona === state.selectedPersona) state.runs = runs
    },
    async loadDiff() {
      const id = this.diffPlanId || state.selectedPlan?.id || this.data.plan?.id
      const epoch = ++this.diffEpoch
      if (!id) { this.diffs = []; return }
      const persona = state.selectedPersona
      this.diffPlanId = id
      const diffs = await get(`/plans/${encodeURIComponent(id)}/diff?limit=20&persona=${encodeURIComponent(persona)}`)
      if (epoch === this.diffEpoch && persona === state.selectedPersona) this.diffs = diffs
    },
    async refreshAvatar(persona) {
      const avatar = await get(`/avatar?refresh=1&persona=${encodeURIComponent(persona)}&entry=${Date.now()}`)
      if (persona === state.selectedPersona) this.data.avatar = avatar
    },
    async loadWeather(persona) {
      const weather = await get(`/weather/current?persona=${encodeURIComponent(persona)}`)
      if (persona === state.selectedPersona) this.data.weather = weather
    },
    sessionEntry(target) {
      const value = String(target || '').trim()
      if (!value) return null
      const pool = [...(this.data.sessions || []), ...(this.data.planning_sessions || []), ...(this.data.all_sessions || [])]
      return pool.find((entry) => {
        const id = typeof entry === 'string' ? entry : entry?.sid || entry?.id
        return id === value
      }) || null
    },
    sessionName(target) {
      const found = this.sessionEntry(target)
      if (!found || typeof found === 'string') return ''
      return String(found.session_title || found.title || found.name || '').trim()
    },
    itemTitle(id) {
      const item = (this.data.plan?.blocks || []).flatMap((block) => block.items || []).find((entry) => entry.id === id)
      return item?.title || '已移除的小项'
    },
    diffSummary(diff) {
      return (diff || []).slice(0, 3).map((entry) => `${entry.op === 'added' ? '新增' : entry.op === 'removed' ? '移除' : '调整'}「${entry.title}」`).join('；') || '保持原计划'
    },
    shortValue(value) {
      if (value == null || value === '') return '空'
      const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
      return text.length > 42 ? `${text.slice(0, 42)}…` : text
    },
    planningLabel(text) {
      if (this.planningPending) return '等待规划…'
      const wait = this.planningCooldownRemaining
      return wait > 0 ? `防抖 ${wait}s` : text
    },
    async fetchPlanForDate(date, persona = state.selectedPersona) {
      const plans = await get(`/plans?start=${encodeURIComponent(date)}&end=${encodeURIComponent(date)}&persona=${encodeURIComponent(persona)}`)
      return (plans || []).find((plan) => plan.date === date) || null
    },
    async applyPlanningUpdate(date, persona, plan) {
      if (persona !== state.selectedPersona) return
      if (date === this.data.date) this.data.plan = plan
      if (state.selectedDate === date) state.selectedPlan = plan
      this.diffPlanId = plan.id
      await Promise.all([
        this.loadMonth().catch(() => {}),
        this.loadDiff().catch(() => {}),
        this.loadThreads().catch(() => {}),
      ])
    },
    async waitForPlanningUpdate(date, persona, baselineRevision) {
      const deadline = Date.now() + 60000
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 1200))
        if (persona !== state.selectedPersona) return false
        try {
          const plan = await this.fetchPlanForDate(date, persona)
          if (plan && (plan.revision || 0) > baselineRevision) {
            await this.applyPlanningUpdate(date, persona, plan)
            return true
          }
        } catch (_) {
          // Keep polling through transient API errors until the deadline.
        }
      }
      return false
    },
    async startPlanning(date, reason) {
      if (this.planningPending) { notify('规划正在进行中', 'error'); return }
      const wait = this.planningCooldownRemaining
      if (wait > 0) { notify(`操作防抖中，${wait} 秒后可再次规划`, 'error'); return }
      this.planningCooldownUntil = Date.now() + 5000
      this.planningPending = true
      const persona = state.selectedPersona
      let baselineRevision = 0
      try {
        const current = await this.fetchPlanForDate(date, persona)
        baselineRevision = current?.revision || 0
      } catch (_) { /* planning can still proceed */ }
      try {
        await post(`/planning/run?persona=${encodeURIComponent(persona)}`, {
          date,
          reason,
          focus_date: date,
        })
        notify(`已把 ${date} 的规划机会交给 bot`)
        const updated = await this.waitForPlanningUpdate(date, persona, baselineRevision)
        if (updated) notify(`${date} 的规划已更新`)
        else notify(`规划仍在进行；${date} 暂未出现新版本，可稍后刷新`)
      } catch (error) {
        notify(error.message, 'error')
      } finally {
        this.planningPending = false
      }
    },
    async runPlanning() {
      const date = state.selectedDate || this.data.date
      await this.startPlanning(
        date,
        `WebUI 手动请求优先规划 ${date}；先处理这一天，同时仍可在配置允许的日期范围内调整其他日期。`,
      )
    },
    newItem() {
      state.editor = { item: null, block: null }
    },
    openItem(payload) {
      state.editor = { item: payload.item, block: payload.block }
    },
    newPlanForDate() { state.editor = { item: null, block: null } },
    closeEditor() { state.editor = null },
    async saveItem(form) {
      try {
        const plan = state.selectedPlan ? clone(state.selectedPlan) : {
          date: state.selectedDate, title: '这一天', overview: '', planned_appearance: '', planned_mood: '', blocks: [], expected_revision: 0,
        }
        const sourceBlock = state.editor?.block
        let block = sourceBlock ? plan.blocks.find((entry) => entry.id === sourceBlock.id) : plan.blocks[0]
        if (!block) {
          block = { id: '', title: '生活片段', items: [] }
          plan.blocks.push(block)
        }
        const existingIndex = block.items.findIndex((item) => item.id === form.id)
        if (existingIndex >= 0) block.items[existingIndex] = form
        else block.items.push(form)
        plan.expected_revision = plan.revision || 0
        const result = await post(`/plans?persona=${encodeURIComponent(state.selectedPersona)}`, plan)
        if (!result?.plan) throw new Error('保存失败：服务器没有返回计划')
        state.selectedPlan = result.plan
        this.diffPlanId = result.plan.id
        if (state.selectedDate === this.data.date) this.data.plan = result.plan
        state.editor = null
        notify('计划已保存')
        await Promise.all([this.loadMonth(), this.loadRecentPlans(), this.loadDiff()])
      } catch (error) { notify(error.message, 'error') }
    },
    async runItem(item) {
      const wait = this.runCooldownRemaining
      if (wait > 0) { notify(`操作防抖中，${wait} 秒后可再次触发`, 'error'); return }
      this.runCooldownUntil = Date.now() + 5000
      try { await post(`/items/${item.id}/run?persona=${encodeURIComponent(state.selectedPersona)}`); notify('已交给框架触发') }
      catch (error) { notify(error.message, 'error') }
    },
    async skipItem(item) {
      try {
        const result = await post(`/items/${item.id}/skip?persona=${encodeURIComponent(state.selectedPersona)}`, { reason: 'WebUI 手动跳过' })
        if (!result?.plan) throw new Error('跳过失败：服务器没有返回计划')
        state.selectedPlan = result.plan
        if (state.selectedDate === this.data.date) this.data.plan = result.plan
        await Promise.all([this.loadMonth(), this.loadDiff()])
      } catch (error) { notify(error.message, 'error') }
    },
    askConfirm({ title = '确认操作', message = '', confirmText = '确定', cancelText = '取消', danger = false } = {}) {
      if (this.confirmResolver) this.confirmResolver(false)
      return new Promise((resolve) => {
        this.confirmResolver = resolve
        this.confirmDialog = { title, message, confirmText, cancelText, danger }
      })
    },
    resolveConfirm(ok) {
      const resolve = this.confirmResolver
      this.confirmResolver = null
      this.confirmDialog = null
      if (resolve) resolve(Boolean(ok))
    },
    async deleteItem(item) {
      if (!item) return
      if (!await this.askConfirm({
        title: '删除小项',
        message: `删除「${item.title}」？\n\n删除后从当前计划移除；以前的版本仍保留在「变化」中。`,
        confirmText: '删除',
        danger: true,
      })) return
      try {
        const result = await post(`/items/${item.id}/delete?persona=${encodeURIComponent(state.selectedPersona)}`, { reason: 'WebUI 删除小项' })
        if (!result?.plan) throw new Error('删除失败：服务器没有返回计划')
        state.selectedPlan = result.plan
        if (state.selectedDate === this.data.date) this.data.plan = result.plan
        await Promise.all([this.loadMonth(), this.loadDiff()])
        notify('小项已删除')
      } catch (error) { notify(error.message, 'error') }
    },
    async deleteBlock(block) {
      if (!block) return
      const count = (block.items || []).filter((item) => ['scheduled', 'cancelled'].includes(item.state)).length
      if (!await this.askConfirm({
        title: '删除时段',
        message: `删除「${block.title}」？\n\n删除后此时段和未执行项从当前计划移除；已完成记录和以前的版本仍保留。`,
        confirmText: '删除',
        danger: true,
      })) return
      try {
        const result = await post(`/blocks/${block.id}/delete?persona=${encodeURIComponent(state.selectedPersona)}`, { reason: 'WebUI 删除时段' })
        if (!result?.plan) throw new Error('删除失败：服务器没有返回计划')
        state.selectedPlan = result.plan
        if (state.selectedDate === this.data.date) this.data.plan = result.plan
        await Promise.all([this.loadMonth(), this.loadDiff()])
        notify('时段已删除')
      } catch (error) { notify(error.message, 'error') }
    },
    async deleteDay(date) {
      if (!date) return
      if (!await this.askConfirm({
        title: '删除整天计划',
        message: `删除 ${date} 的整天计划？\n\n删除后当天计划移入历史，当前显示无计划；以前的版本仍保留。定时规划仍照常运行，删除不会立即触发规划。`,
        confirmText: '删除',
        danger: true,
      })) return
      try {
        await post(`/plans/${date}/delete?persona=${encodeURIComponent(state.selectedPersona)}`, { reason: 'WebUI 删除整天' })
        await this.refresh()
        notify('整天计划已删除')
      } catch (error) { notify(error.message, 'error') }
    },
    async saveDayState(form) {
      try {
        const allowed = ['current_appearance', 'current_mood', 'current_location', 'current_activity', 'current_note']
        const payload = Object.fromEntries(allowed.map((key) => [key, form[key] || '']))
        this.data.day_state = await post(`/day-state/${this.data.date}?persona=${encodeURIComponent(state.selectedPersona)}`, payload)
        state.dayStateEditor = false
        notify('此刻状态已更新')
      } catch (error) { notify(error.message, 'error') }
    },
    newTemplate() { state.templateEditor = { template: null } },
    editTemplate(template) { state.templateEditor = { template } },
    activeDayTypeNames(date) {
      if (!date || !this.data.day_types) return []
      const config = this.data.config || {}
      const selectedCalendar = this.selectedCalendar || {}
      const baseId = selectedCalendar.suggested_day_type || (() => {
        const weekday = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7
        return weekday >= 5 ? 'weekend' : 'weekday'
      })()
      const entries = this.data.day_types
      const candidates = []
      for (const entry of entries) {
        const rules = entry.rules || {}
        const weekday = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7
        let priority = Number.isInteger(rules.priority) ? rules.priority : 100
        let matched = false
        if ((rules.dates || []).includes(date)) { matched = true; priority -= 1000 }
        if ((rules.date_ranges || []).some((range) => range.start && range.end && range.start <= date && date <= range.end)) { matched = true; priority -= 500 }
        if ((rules.weekdays || []).includes(weekday)) matched = true
        if (entry.builtin && config.base_day_types?.[entry.id] !== true) matched = false
        if (matched) candidates.push({ name: entry.name, priority, id: entry.id })
      }
      if (config.base_day_types?.[baseId] === true && !candidates.some((entry) => entry.id === baseId)) {
        const base = entries.find((entry) => entry.id === baseId)
        if (base) candidates.push({ name: base.name, priority: Number((base.rules || {}).priority || 100), id: base.id })
      }
      return candidates.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id)).map((entry) => entry.name)
    },
    calendarCellText(cell) {
      const flags = this.calendarFlags
      const calendar = cell.calendar || {}
      const festivals = [...(calendar.solar_festivals || []), ...(calendar.lunar_festivals || [])]
      if (flags.festivals && festivals.length) return festivals[0]
      if (flags.solar_terms && calendar.solar_term) return calendar.solar_term
      if (flags.lunar_date && calendar.lunar?.day) return calendar.lunar.day
      return ''
    },
    async toggleCustomDayType(identifier, enabled) {
      try {
        const map = { ...(this.data.config.day_type_enabled || {}), [identifier]: Boolean(enabled) }
        await saveConfig({ day_type_enabled: map })
        this.data.config.day_type_enabled = map
        notify(enabled ? '自定义日型已开启' : '自定义日型已停用，记录仍保留')
      } catch (_) { /* saveConfig already notifies */ }
    },
    async toggleBaseDayType(identifier, enabled) {
      try {
        const map = { ...(this.data.config.base_day_types || {}), [identifier]: Boolean(enabled) }
        await saveConfig({ base_day_types: map })
        this.data.config.base_day_types = map
        notify(enabled ? '基础日型已加入参考' : '基础日型已关闭')
      } catch (_) { /* saveConfig already notifies */ }
    },
    closeTemplateEditor() { state.templateEditor = null },
    newDayType() { state.dayTypeEditor = { entry: null } },
    editDayType(entry) { state.dayTypeEditor = { entry } },
    toggleDayTypeWeekday(form, index) {
      form.rules ||= {}
      const values = (form.rules.weekdays ||= [])
      values.includes(index) ? values.splice(values.indexOf(index), 1) : values.push(index)
    },
    dayTypeMatches(entry, date) {
      const rules = entry.rules || {}
      if ((rules.dates || []).includes(date)) return true
      if ((rules.date_ranges || []).some((range) => range.start && range.end && range.start <= date && date <= range.end)) return true
      const weekday = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7
      return (rules.weekdays || []).includes(weekday)
    },
    dayTypeConflicts(entry) {
      const today = new Date(`${this.data.date}T12:00:00Z`)
      const conflicts = []
      for (let offset = 0; offset < Math.max(31, Number(this.data.config.max_horizon_days || 14)); offset++) {
        const date = new Date(today)
        date.setUTCDate(today.getUTCDate() + offset)
        const iso = date.toISOString().slice(0, 10)
        if (!this.dayTypeMatches(entry, iso)) continue
        const matches = (this.data.day_types || []).filter((other) => {
          if (other.id === entry.id) return false
          if (other.builtin) return this.data.config.base_day_types?.[other.id] === true && this.dayTypeMatches(other, iso)
          return this.dayTypeMatches(other, iso)
        })
        if (matches.length) conflicts.push({ date: iso, names: matches.map((other) => other.name).join('、') })
      }
      return conflicts
    },
    async saveDayType(form) {
      try {
        const payload = clone(form)
        delete payload._dates
        delete payload._ranges
        if (!payload.id) payload.id = `day_${Date.now().toString(36)}`
        payload.rules ||= {}
        payload.rules.weekdays = (payload.rules.weekdays || []).map(Number).filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
        payload.rules.dates = (form._dates || '').split(',').map((value) => value.trim()).filter(Boolean)
        payload.rules.date_ranges = (form._ranges || '').split(/[,，\n]/).map((value) => value.trim()).filter(Boolean).map((value) => {
          const [start, end] = value.split('~').map((part) => part.trim())
          return { start, end }
        }).filter((range) => range.start && range.end)
        const overrides = payload.config?.overrides || {}
        for (const key of Object.keys(overrides)) {
          if (overrides[key] === '' || overrides[key] == null) delete overrides[key]
        }
        const conflicts = this.dayTypeConflicts(payload)
        if (conflicts.length) {
          const preview = conflicts.slice(0, 8).map((item) => `${item.date}：${item.names}`).join('\n')
          const more = conflicts.length > 8 ? `\n……另有 ${conflicts.length - 8} 天` : ''
          if (!await this.askConfirm({
            title: '日型冲突',
            message: `这个日型会和其他日型在同一天生效：\n${preview}${more}\n\n名称和提示词会按优先级拼接。仍要保存吗？`,
            confirmText: '继续保存',
          })) return
        }
        await post(`/day-types?persona=${encodeURIComponent(state.selectedPersona)}`, payload)
        state.dayTypeEditor = null
        this.data.day_types = await get(`/day-types?persona=${encodeURIComponent(state.selectedPersona)}`)
        notify('日型已保存')
      } catch (error) { notify(error.message, 'error') }
    },
    async deleteDayType(entry) {
      if (!await this.askConfirm({ title: '删除日型', message: `删除日型「${entry.name}」？`, confirmText: '删除', danger: true })) return
      try {
        await requestDelete(`/day-types/${encodeURIComponent(entry.id)}?persona=${encodeURIComponent(state.selectedPersona)}`)
        this.data.day_types = await get(`/day-types?persona=${encodeURIComponent(state.selectedPersona)}`)
      } catch (error) { notify(error.message, 'error') }
    },
    async applyTemplate(template) {
      try {
        const payload = clone(template.plan)
        if (template.execution_prompt || template.prompt) {
          const guidance = template.execution_prompt || template.prompt
          for (const block of payload.blocks || []) for (const item of block.items || []) item.instruction = [guidance, item.instruction].filter(Boolean).join('\n\n')
        }
        payload.date = state.selectedDate
        payload.expected_revision = state.selectedPlan?.revision || 0
        const result = await post(`/plans?persona=${encodeURIComponent(state.selectedPersona)}`, payload)
        if (!result?.plan) throw new Error('应用模板失败：服务器没有返回计划')
        state.selectedPlan = result.plan
        this.diffPlanId = result.plan.id
        if (state.selectedDate === this.data.date) this.data.plan = result.plan
        await this.refresh({ entry: false })
        notify(`已应用「${template.name}」`)
        this.setView(state.selectedDate === this.data.date ? 'today' : 'calendar')
      } catch (error) { notify(error.message, 'error') }
    },
    previewTemplate(template) {
      const blocks = template.plan?.blocks || []
      const count = blocks.reduce((sum, block) => sum + (block.items || []).length, 0)
      notify(`${template.name}：${blocks.length} 组、${count} 项；${template.plan?.overview || ''}`)
    },
    async loadCustomTemplates() {
      this.customTemplates = await get(`/templates?persona=${encodeURIComponent(state.selectedPersona)}`)
    },
    saveCurrentTemplate() {
      if (!state.selectedPlan) return notify('请先选择或创建一个计划', 'error')
      const plan = clone(state.selectedPlan)
      for (const key of ['id', 'revision', 'expected_revision', 'state', 'created_at', 'updated_at', 'created_by', 'persona_id', 'revision_actor', 'revision_reason', 'planning_reason']) delete plan[key]
      for (const block of plan.blocks || []) {
        delete block.id
        delete block.meta
        for (const item of block.items || []) {
          for (const key of ['id', 'series_id', 'scheduled_at', 'state', 'revision', 'reason', 'created_at', 'updated_at', 'plan_id', 'block_id']) delete item[key]
        }
      }
      state.templateEditor = { template: { name: state.selectedPlan.title || '我的生活模板', description: '', plan, planning_prompt: '', execution_prompt: '', icon: 'sparkle' } }
    },
    async planWithTemplate(template) {
      const date = state.selectedDate || this.data.date
      const guidance = String(template.planning_prompt || template.prompt || template.description || '').trim()
      const reason = `按模板「${template.name}」优先规划 ${date}。${guidance ? `\n模板引导：${guidance}` : ''}`
      await this.startPlanning(date, reason)
    },
    async saveTemplate(form) {
      try {
        const plan = JSON.parse(JSON.stringify(form.plan || {}))
        if (!plan || typeof plan !== 'object' || Array.isArray(plan) || !Array.isArray(plan.blocks)) return notify('计划骨架必须包含分组', 'error')
        const payload = {
          name: String(form.name || '').trim(),
          description: String(form.description || '').trim(),
          planning_prompt: String(form.planning_prompt || '').trim(),
          execution_prompt: String(form.execution_prompt || '').trim(),
          icon: String(form.icon || 'sparkle'),
          icon_url: String(form.icon_url || ''),
          icon_asset_id: String(form.icon_asset_id || ''),
          plan,
        }
        if (!payload.name) return notify('请填写模板名称', 'error')
        if (form.id) payload.id = form.id
        await post(`/templates?persona=${encodeURIComponent(state.selectedPersona)}`, payload)
        state.templateEditor = null
        await this.loadCustomTemplates()
        notify('模板已保存')
      } catch (error) { notify(error.message, 'error') }
    },
    async uploadTemplateIcon(file) {
      return upload(`/assets?persona=${encodeURIComponent(state.selectedPersona)}`, file)
    },
    async deleteTemplate(template) {
      if (!await this.askConfirm({ title: '删除模板', message: `删除模板「${template.name}」？`, confirmText: '删除', danger: true })) return
      try {
        await requestDelete(`/templates/${encodeURIComponent(template.id)}?persona=${encodeURIComponent(state.selectedPersona)}`)
        await this.loadCustomTemplates()
      } catch (error) { notify(error.message, 'error') }
    },
    applyAppearance() {
      const appearance = this.data.config?.appearance || {}
      if (!themeTemplates.some((entry) => entry.id === appearance.theme) || appearance.theme === 'random') {
        this.data.config.appearance.theme = 'random'
      }
      const theme = this.activeTheme
      document.documentElement.dataset.themeName = theme.id
      document.documentElement.dataset.theme = theme.mode || 'dark'
      try { localStorage.setItem('krd_theme', theme.id) } catch (_) {}
      const root = document.documentElement.style
      const customBackground = this.data.background?.url
      if (customBackground || theme.art || theme.customArt) {
        root.setProperty('--theme-art', `url("${customBackground || this.themeArt(theme)}")`)
      } else {
        root.removeProperty('--theme-art')
      }
      this.customAccent = appearance.custom_accent || ''
      if (appearance.custom_accent) {
        document.documentElement.style.setProperty('--accent', appearance.custom_accent)
        document.documentElement.style.setProperty('--accent-strong', appearance.custom_accent)
      } else {
        document.documentElement.style.removeProperty('--accent')
        document.documentElement.style.removeProperty('--accent-strong')
      }
    },
    async applyCustomAccent() {
      try { await saveConfig({ appearance: { custom_accent: this.customAccent } }); this.applyAppearance() }
      catch (_) { /* already notified */ }
    },
    async uploadBanner(event) {
      const file = event.target.files[0]
      if (!file) return
      try {
        const asset = await upload(`/assets?persona=${encodeURIComponent(state.selectedPersona)}`, file)
        await saveConfig({ appearance: { banner_asset_id: asset.id } })
        this.data.banner = asset
        notify('生活横幅已更新')
      } catch (error) { notify(error.message, 'error') } finally { event.target.value = '' }
    },
    async uploadBackground(event) {
      const file = event.target.files[0]
      if (!file) return
      try {
        const asset = await upload(`/assets?persona=${encodeURIComponent(state.selectedPersona)}`, file)
        this.data.background = asset
        await saveConfig({ appearance: { background_asset_id: asset.id } })
        this.applyAppearance()
        notify('全屏生活背景已更新')
      } catch (error) { notify(error.message, 'error') } finally { event.target.value = '' }
    },
    async clearBackground() {
      try {
        this.data.background = null
        await saveConfig({ appearance: { background_asset_id: '' } })
        this.applyAppearance()
        notify('已恢复主题插画背景')
      } catch (error) { notify(error.message, 'error') }
    },
    resetPrompt(kind) {
      const defaults = this.data.prompt_defaults || {}
      if (kind === 'planning') this.draft.planning_prompt = defaults.planning_prompt
      if (kind === 'execution') this.draft.execution_prompt = defaults.execution_prompt
      if (kind === 'review') this.draft.planning_review.prompt = defaults.planning_review_prompt
      notify('已恢复默认提示词，保存后生效')
    },
    resetAllPrompts() {
      this.resetPrompt('planning')
      this.resetPrompt('execution')
      this.resetPrompt('review')
    },
    async setTheme(theme) {
      try {
        if (theme.id === 'random') {
          const actual = themeTemplates.filter((entry) => !entry.random)
          this.randomThemeId = actual[Math.floor(Math.random() * actual.length)].id
        }
        await saveConfig({ appearance: { theme: theme.id } })
        this.data.config.appearance.theme = theme.id
        this.applyAppearance()
      } catch (_) { /* notification is handled by saveConfig */ }
    },
    async uploadAvatar(event) {
      const file = event.target.files[0]
      if (!file) return
      try {
        const asset = await upload(`/assets?persona=${encodeURIComponent(state.selectedPersona)}`, file)
        await saveConfig({ appearance: { avatar_asset_id: asset.id } })
        this.data.avatar = { source: 'upload', ...asset }
        notify('头像已更新')
      } catch (error) { notify(error.message, 'error') } finally { event.target.value = '' }
    },
    selectSettingsTab(tab) {
      this.settingsTab = tab
      if (tab === 'weather') this.loadWeatherCredentials().catch(() => {})
    },
    async loadWeatherCredentials() {
      const data = await get(`/weather/credentials?persona=${encodeURIComponent(state.selectedPersona)}`)
      this.weatherCredentialStatus = data.providers || {}
      for (const provider of ['weatherapi', 'visualcrossing', 'qweather', 'weatherbit', 'openweather']) {
        this.weatherCredentialDraft[provider] ||= {}
        const fields = { weatherapi: ['weatherapi_key'], visualcrossing: ['visualcrossing_key'], qweather: ['qweather_key'], weatherbit: ['weatherbit_key'], openweather: ['openweather_key'] }[provider]
        for (const field of fields) if (this.weatherCredentialDraft[provider][field] === undefined) this.weatherCredentialDraft[provider][field] = ''
      }
      if (this.weatherContactDraft === '') this.weatherContactDraft = ''
    },
    setWeatherCredential(provider, field, value) {
      this.weatherCredentialDraft[provider] ||= {}
      this.weatherCredentialDraft[provider][field] = value
      this.weatherCredentialDirty[provider] ||= {}
      this.weatherCredentialDirty[provider][field] = true
    },
    setWeatherContact(value) {
      this.weatherContactDraft = value
      this.weatherContactDirty = true
    },
    async saveWeatherCredentials() {
      const providers = {}
      for (const [provider, fields] of Object.entries(this.weatherCredentialDirty)) {
        for (const [field, dirty] of Object.entries(fields)) {
          if (!dirty) continue
          providers[provider] ||= {}
          providers[provider][field] = this.weatherCredentialDraft[provider]?.[field] || ''
        }
      }
      if (!Object.keys(providers).length && !this.weatherContactDirty) return
      const payload = { providers }
      if (this.weatherContactDirty) payload.contact = this.weatherContactDraft
      await put(`/weather/credentials?persona=${encodeURIComponent(state.selectedPersona)}`, payload)
      this.weatherCredentialDirty = {}
      this.weatherContactDirty = false
      await this.loadWeatherCredentials()
    },
    prepareSettings() {
      this.draft = clone(this.data.config || {})
      const nested = {
        calendar_context: { holiday: true, adjusted_workday: true, festivals: true, solar_terms: true },
        calendar_display: { holiday: true, adjusted_workday: true, festivals: true, solar_terms: true, lunar_date: true },
        session_access: { mode: 'deny_list', sessions: [] },
        planning_pool: { sessions: [], strategy: 'pure_random' },
        execution_pool: { sessions: [], strategy: 'pure_random' },
        planning_review: {},
        weather: { mode: 'off', provider: 'open_meteo', chat_current: true, chat_forecast: false, locations: {}, virtual: {} },
        threads: { enabled: true, chat_enabled: true, empty_mode: 'nudge', empty_min: 1, empty_max: 5, planning_limit: 8, chat_limit: 5, full_dossier_in_planning: 5,
          dossier_chars: 2000, excerpt_chars: 300, next_step_chars: 200, log_chars: 500, logs_in_planning: 3,
          execution_excerpt_chars: 300, execution_logs: 2, require_response: true, response_mode: 'reject',
          response_limit: 8, force_touch: false, auto_touch: false, stale_days: 5, chat_chars: 600 },
        appearance: { theme: 'random', effects: 'auto' },
      }
      for (const [key, defaults] of Object.entries(nested)) {
        this.draft[key] = { ...defaults, ...(this.draft[key] || {}) }
      }
      this.draft.weather.virtual = { seed: 'krd', climate: 'temperate', location: '', ...(this.draft.weather.virtual || {}) }
      this.draft.weather.locations = { ...(this.draft.weather.locations || {}) }
      this.draft.session_access.sessions = Array.isArray(this.draft.session_access.sessions) ? this.draft.session_access.sessions : []
      this.draft.planning_pool.sessions = Array.isArray(this.draft.planning_pool.sessions) ? this.draft.planning_pool.sessions : []
      this.draft.execution_pool.sessions = Array.isArray(this.draft.execution_pool.sessions) ? this.draft.execution_pool.sessions : []
      for (const key of ['blocked_execution_windows', 'quiet_delivery_windows', 'required_coverage_windows']) {
        if (!Array.isArray(this.draft[key])) this.draft[key] = []
      }
      this.draft.inject_day_state ??= true
      this.draft.inject_agenda ??= true
      this.draft.agenda_max_chars ??= 2400
      this.draft.history_digest_days ??= 4
      this.draft.history_include_instruction ??= true
      this.draft.history_instruction_chars ??= 200
      this.draft.recent_outcomes_days ??= 2
      this.draft.unfinished_days ??= 3
      this.draft.future_plan_days ??= 2
      this.draft.memory_hygiene ??= 'summary'
      if (!themeTemplates.some((entry) => entry.id === this.draft.appearance.theme)) this.draft.appearance.theme = 'random'
      const review = this.draft.planning_review
      if (typeOfSeconds(review.interval_seconds)) review.interval_seconds = Math.round(Number(review.interval_minutes) * 60)
      if (typeOfSeconds(review.min_lead_seconds)) review.min_lead_seconds = Math.round(Number(review.min_lead_minutes) * 60)
      this.settingsBaseRevision = this.data.config_revision || 0
      this.allSessions = this.buildSessionCatalog()
      this.diagnostics = null
      this.loadWeatherCredentials().catch(() => {})
    },
    buildSessionCatalog() {
      const catalog = [...(this.data.all_sessions || this.data.sessions || [])]
      const seen = new Set(catalog.map((entry) => entry.sid))
      const configured = [
        ...(this.draft.session_access?.sessions || []).map((value) => value?.sid || value),
        ...(this.draft.planning_pool?.sessions || []).map((value) => value?.sid || value),
        ...(this.draft.execution_pool?.sessions || []).map((value) => value?.sid || value),
      ]
      for (const raw of configured) {
        const sid = String(raw || '').trim()
        if (!sid || seen.has(sid)) continue
        seen.add(sid)
        catalog.push({ sid, title: '未加载的会话', adapter: '', missing: true })
      }
      return catalog
    },
    toggleAccess(sid) {
      const values = this.draft.session_access.sessions
      values.includes(sid) ? values.splice(values.indexOf(sid), 1) : values.push(sid)
    },
    togglePool(kind, sid) {
      const values = this.draft[`${kind}_pool`].sessions
      const index = values.findIndex((value) => (value.sid || value) === sid)
      index >= 0 ? values.splice(index, 1) : values.push(sid)
    },
    addWindow(kind) {
      const entry = { start: '23:00', end: '07:00' }
      if (kind === 'required_coverage_windows') Object.assign(entry, { min_items: 1, max_items: 12, category: '' })
      this.draft[kind].push(entry)
    },
    async saveSettings() {
      try {
        const payload = clone(this.draft)
        delete payload.schema_version
        delete payload.per_persona
        await saveConfig(payload, this.settingsBaseRevision)
        await this.saveWeatherCredentials()
        this.prepareSettings()
        this.applyAppearance()
        this.loadWeather(state.selectedPersona).catch(() => {})
      } catch (error) { if (!String(error?.message || '').includes('设置已')) notify(error.message || '设置保存失败', 'error') }
    },
    async geocode() {
      if (!this.cityQuery.trim()) return
      try { this.cityResults = await post(`/weather/geocode?persona=${encodeURIComponent(state.selectedPersona)}`, { name: this.cityQuery }) }
      catch (error) { notify(error.message, 'error') }
    },
    chooseCity(city) {
      this.draft.weather.locations[state.selectedPersona] = city
      this.cityResults = []
      this.cityQuery = city.name
    },
    async weatherPreview() {
      if (this.weatherPreviewing) return
      const mode = this.draft.weather.mode
      if (mode === 'off') {
        this.weatherResult = '天气服务已关闭'
        notify('天气服务已关闭')
        return
      }
      if (mode !== 'virtual' && !this.currentLocation) {
        notify('请先选择并保存天气地点，再预览真实天气', 'error')
        return
      }
      this.weatherPreviewing = true
      try {
        const result = await post('/weather/preview', {
          mode,
          provider: this.draft.weather.provider,
          location: this.currentLocation,
          virtual: this.draft.weather.virtual,
        })
        this.weatherResult = JSON.stringify(result, null, 2)
        notify('天气预览已更新')
        this.$nextTick(() => document.querySelector('.weather-preview')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
      } catch (error) { notify(error.message, 'error') }
      finally { this.weatherPreviewing = false }
    },
    async exportData() {
      try {
        const data = await get(`/export?persona=${encodeURIComponent(state.selectedPersona)}`)
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `KRD-${state.selectedPersona}-${state.selectedDate}.json`
        link.click()
        URL.revokeObjectURL(link.href)
      } catch (error) { notify(error.message, 'error') }
    },
    async importData(event) {
      const file = event.target.files[0]
      if (!file) return
      try {
        const data = JSON.parse(await file.text())
        const preview = await post(`/import/preview?persona=${encodeURIComponent(state.selectedPersona)}`, data)
        if (!await this.askConfirm({
          title: '导入数据',
          message: `将导入 ${preview.plans} 个计划${preview.threads ? `、${preview.threads} 条目标/约定` : ''}；运行不会重放。继续？`,
          confirmText: '继续导入',
        })) return
        const result = await post(`/import/commit?persona=${encodeURIComponent(state.selectedPersona)}`, data)
        notify(`导入完成：${result.imported_plans} 个新计划`)
        await this.refresh()
      } catch (error) { notify(error.message, 'error') } finally { event.target.value = '' }
    },
    async loadDiagnostics() { this.diagnostics = await get('/diagnostics') },
  },
  async mounted() {
    try {
      await ready()
      await this.refresh({ reset: true, entry: true })
      this.finishBoot(1200)
      this.disconnect = socket(() => {
        clearTimeout(this.liveTimer)
        this.liveTimer = setTimeout(() => {
          this.refresh({ reset: false, entry: false }).catch((error) => notify(error.message, 'error'))
        }, 400)
      })
      this.clockTimer = setInterval(() => { this.clockNow = Date.now() / 1000 }, 1000)
      this.initDeviceStatus().catch(() => {})
      this.stopTheme = window.PluginPageContext?.onThemeChange?.((dark) => {
        if (document.documentElement.dataset.themeName === 'kira_mist') {
          document.documentElement.dataset.theme = dark ? 'dark' : 'light'
        }
      })
    } catch (error) {
      state.loading = false
      notify(error.message, 'error')
      this.finishBoot(700)
    }
  },
  beforeUnmount() {
    this.disconnect?.()
    this.stopTheme?.()
    clearTimeout(this.liveTimer)
    clearTimeout(this.bootTimer)
    for (const cleanup of this.deviceCleanup || []) cleanup()
    clearInterval(this.clockTimer)
  },
})

// Keep the delete helper out of the component's public API surface.
import { del as requestDelete } from './api.js?v=1.3.7'

app.component('UiIcon', UiIcon)
app.config.errorHandler = (err, vm, info) => { window.__krdVueError = String(err?.stack || err) + '\n' + info + '\nvm=' + (vm?.$options?.name || vm?.$?.type?.__name || vm?.$?.type?.name || 'unknown'); console.error(err, info, vm) }
const mounted = app.mount('#app')
if (location.search.includes('debug')) window.__krdApp = mounted
