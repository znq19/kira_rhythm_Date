import { fmt } from './store.js?v=1.3.7'
import { planTemplates, themeTemplates } from './templates.js?v=1.3.7'

const ICON_PATHS = {
  home: ['M3 11.5 12 4l9 7.5', 'M5.5 10.5V20h13v-9.5', 'M9.5 20v-6h5v6'],
  calendar: ['M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z', 'M8 3v4M16 3v4M4 9h16', 'M8 13h2M14 13h2M8 17h2M14 17h2'],
  changes: ['M4 7h11l-3-3M20 17H9l3 3', 'M15 7l5 5-5 5'],
  templates: ['M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z'],
  settings: ['M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z', 'M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.7 5.7l1.5 1.5M16.8 16.8l1.5 1.5M18.3 5.7l-1.5 1.5M7.2 16.8l-1.5 1.5'],
  plus: ['M12 5v14M5 12h14'],
  refresh: ['M20 7v5h-5', 'M4 17v-5h5', 'M6.2 8a7 7 0 0 1 11.3-.8L20 12M4 12l2.5 4.8A7 7 0 0 0 18 16'],
  clock: ['M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z', 'M12 8v4.5l3 2'],
  play: ['M8 5l11 7-11 7z'],
  skip: ['M6 5l9 7-9 7zM18 5v14'],
  edit: ['M4 20h4l11-11-4-4L4 16v4Z', 'M13 7l4 4'],
  close: ['M6 6l12 12M18 6 6 18'],
  left: ['M14.5 5 7.5 12l7 7'],
  right: ['M9.5 5l7 7-7 7'],
  sun: ['M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z', 'M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4'],
  cloud: ['M7 18h10a4 4 0 0 0 .2-8A6 6 0 0 0 5.6 12 3 3 0 0 0 7 18Z'],
  rain: ['M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.2 2A3 3 0 0 0 7 15Z', 'M8 18l-1 2M12 18l-1 2M16 18l-1 2'],
  snow: ['M12 3v18M4.5 7l15 10M19.5 7l-15 10', 'M9.5 5 12 7l2.5-2M9.5 19l2.5-2 2.5 2'],
  moon: ['M19 15.5A8 8 0 0 1 8.5 5 8 8 0 1 0 19 15.5Z'],
  flower: ['M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z', 'M12 9C9 8 8 4 12 4s3 4 0 5ZM15 12c1-3 5-3 5 0s-4 3-5 0ZM12 15c3 1 4 5 0 5s-3-4 0-5ZM9 12c-1 3-5 3-5 0s4-3 5 0Z'],
  sparkle: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z', 'M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z'],
  pin: ['M12 21s6-6.2 6-11a6 6 0 1 0-12 0c0 4.8 6 11 6 11Z', 'M12 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z'],
  message: ['M4 5h16v12H8l-4 4V5Z', 'M8 9h8M8 13h5'],
  stats: ['M5 19V9M12 19V5M19 19v-7'],
  check: ['M5 12.5 9.5 17 19 6.5'],
  alert: ['M12 3 2.8 20h18.4L12 3Z', 'M12 9v5M12 17v.2'],
  upload: ['M12 16V4M7 9l5-5 5 5', 'M4 16v4h16v-4'],
  download: ['M12 4v12M7 11l5 5 5-5', 'M4 16v4h16v-4'],
  trash: ['M5 7h14M9 7V4h6v3M8 7l1 13h6l1-13', 'M10 11v5M14 11v5'],
  chevron: ['M8 5l7 7-7 7'],
  heart: ['M12 20S4 15 4 9.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 3.5C20 15 12 20 12 20Z'],
}

export const UiIcon = {
  props: { name: { type: String, default: 'sparkle' }, size: { type: Number, default: 18 } },
  computed: {
    paths() { return ICON_PATHS[this.name] || ICON_PATHS.sparkle },
  },
  template: `<svg class="ui-icon" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path v-for="(d, index) in paths" :key="index" :d="d" /></svg>`,
}

export const PlanBrief = {
  props: ['plan'],
  computed: {
    itemCount() {
      return (this.plan?.blocks || []).reduce((sum, block) => sum +
        (block.items || []).filter((item) => !['deleted', 'cancelled'].includes(item.state)).length, 0)
    },
    revisionReason() {
      return this.cleanReason(this.plan?.revision_reason) || this.cleanReason(this.plan?.planning_reason)
    },
    revisionReasonLabel() {
      const current = this.cleanReason(this.plan?.revision_reason)
      if (!current) return '上次规划'
      return this.plan?.revision_actor === 'bot' ? '规划理由' : '调整理由'
    },
  },
  methods: {
    cleanReason(value) {
      const text = String(value || '').trim()
      if (!text) return ''
      // Technical defaults from WebUI edits would drown out the actual rationale.
      if (/^(webui|skipped by user|deleted by user|manual planning from webui)/i.test(text)) return ''
      return text === String(this.plan?.overview || '').trim() ? '' : text
    },
  },
  template: `
  <article v-if="plan" class="plan-brief">
    <div class="plan-brief-head">
      <div><span class="plan-brief-kicker">PLAN / 一天的总叙事</span><h3>{{ plan.title || '未命名的一天' }}</h3></div>
      <span class="plan-brief-rev">REV {{ plan.revision || 0 }}</span>
    </div>
    <p class="plan-brief-overview">{{ plan.overview || '没有写概述，留给现场。' }}</p>
    <p v-if="revisionReason" class="plan-brief-reason"><span class="plan-brief-reason-label">{{ revisionReasonLabel }}</span>{{ revisionReason }}</p>
    <div class="plan-brief-tags">
      <span v-if="plan.planned_appearance">服装 · {{ plan.planned_appearance }}</span>
      <span v-if="plan.planned_mood">心情 · {{ plan.planned_mood }}</span>
      <span>{{ itemCount }} 项</span>
    </div>
  </article>`,
}

export const ItemCard = {
  props: ['item', 'serverTime'],
  emits: ['edit', 'run', 'skip', 'delete'],
  computed: {
    itemStateClass() { return `state-${this.item.state}` },
    targetName() { return this.$root.sessionName(this.item.target) },
    scheduleText() {
      const schedule = this.item.schedule || {}
      if (schedule.type === 'window') return `${schedule.start}–${schedule.end} · ${fmt.time(this.item.scheduled_at)}`
      return fmt.time(this.item.scheduled_at)
    },
  },
  template: `
  <article class="item-card" :class="itemStateClass">
    <div class="item-rail"><span class="item-dot"></span><span class="item-line"></span></div>
    <div class="item-main">
      <div class="item-top">
        <div>
          <h4>{{ item.title }}</h4>
          <p v-if="item.intent" class="item-intent"><span class="item-label">意图</span>{{ item.intent }}</p>
        </div>
        <span class="state-pill">{{ $root.fmt.state(item.state) }}</span>
      </div>
      <div v-if="item.instruction" class="item-instruction">
        <span class="item-label">行动</span>
        <p>{{ item.instruction }}</p>
      </div>
      <p v-if="item.reason" class="item-reason"><span class="item-label">调整</span>{{ item.reason }}</p>
      <div class="item-meta">
        <span class="meta-icon"><ui-icon name="clock" :size="13" /> {{ scheduleText }}</span>
        <span v-if="item.execution_probability < 1">概率 {{ Math.round(item.execution_probability * 100) }}%</span>
        <span>{{ $root.fmt.interaction(item.interaction) }}</span>
        <span v-if="item.target" class="meta-icon item-target" :title="targetName ? targetName + ' · ' + item.target : item.target"><ui-icon name="message" :size="12" /><template v-if="targetName"><span class="target-name">{{ targetName }}</span><span class="target-sep">·</span></template><code class="target-id">{{ item.target }}</code></span>
        <span v-if="item.category" class="tag">{{ item.category }}</span>
        <span v-if="item.thread_id" class="tag thread-badge">目标 · {{ $root.threadTitle(item.thread_id) }}</span>
      </div>
      <div class="item-actions">
        <button v-if="item.state === 'scheduled'" class="text-button" @click="$emit('edit', item)">调整</button>
        <button v-if="item.state === 'scheduled'" class="text-button" :class="{ 'is-cooling': $root.runCooldownRemaining }" @click="$emit('run', item)">{{ $root.runCooldownRemaining ? '防抖 ' + $root.runCooldownRemaining + 's' : '立即触发' }}</button>
        <button v-if="item.state === 'scheduled'" class="text-button muted" @click="$emit('skip', item)">跳过本次</button>
        <button v-if="['scheduled', 'cancelled'].includes(item.state)" class="text-button danger" @click="$emit('delete', item)">删除</button>
      </div>
    </div>
  </article>`,
}

export const Timeline = {
  components: { ItemCard },
  props: ['plan', 'serverTime'],
  emits: ['edit', 'run', 'skip', 'delete', 'delete-block'],
  template: `
  <div class="timeline" v-if="plan && plan.blocks?.length">
    <section v-for="block in plan.blocks" :key="block.id" class="timeline-block" v-show="!block.meta?.archived && block.items.length">
      <div class="block-heading">
        <span class="block-swatch" :style="{background: block.color || 'var(--accent)'}"></span>
        <h3>{{ block.title }}</h3><span>{{ block.items.length }} 项</span>
        <button class="text-button muted block-delete" @click="$emit('delete-block', block)">删除时段</button>
      </div>
      <item-card v-for="item in block.items" :key="item.id" :item="item" :server-time="serverTime"
        @edit="$emit('edit', {item, block})" @run="$emit('run', $event)" @skip="$emit('skip', $event)" @delete="$emit('delete', $event)" />
    </section>
  </div>
  <div v-else class="empty-state">
    <span class="empty-orbit"><ui-icon name="sparkle" :size="27" /></span><h3>今天还没有安排</h3>
    <p>给生活留一点空白，或者让 bot 规划接下来的节奏。</p>
    <button class="primary" :class="{ 'is-cooling': $root.planningPending || $root.planningCooldownRemaining }" :disabled="$root.planningPending" @click="$root.runPlanning()">{{ $root.planningLabel('现在规划') }}</button>
  </div>`,
}

export const TodayView = {
  components: { Timeline, PlanBrief },
  computed: {
    nextTargetName() { return this.$root.sessionName(this.$root.nextItem?.target) },
  },
  template: `
  <div class="nte-today">
    <section class="scene-hero">
      <div class="scene-noise"></div><div class="scene-scan"></div>
      <div class="scene-topline">
        <span class="live-tag"><i></i> 当前人格 <b>{{ $root.data.personas?.find(p => p.id === $root.data.persona_id)?.name || '在线' }}</b></span>
        <span class="scene-coord">35.68N / 139.76E</span>
      </div>
      <span class="scene-index">01</span>
      <div class="phone-lock-clock"><strong>{{ $root.localClock }}</strong><span>{{ $root.data.date }} · {{ $root.dayTypeName }}</span></div>
      <div class="scene-title">
        <span class="kicker">DAILY NARRATIVE // 今日叙事</span>
        <h1><small>{{ $root.dayTypeName }}</small>{{ $root.data.day_state.current_activity || $root.data.plan?.title || '生活正在展开' }}</h1>
        <p>{{ $root.data.day_state.current_note || $root.data.plan?.overview || '没有安排也很好，让今天自然发生。' }}</p>
      </div>
      <div class="scene-identity">
        <div class="avatar-wrap"><img v-if="$root.avatarUrl && !$root.avatarBroken" :src="$root.avatarUrl" alt="生活头像" @error="$root.avatarBroken = true"><span v-else class="avatar-placeholder" aria-label="未设置头像">?</span><span class="avatar-status"></span><i></i></div>
        <div><span class="identity-label">CURRENT PERSONA / 当前人格</span><strong>{{ $root.data.personas?.find(p => p.id === $root.data.persona_id)?.name || '生活人格' }}</strong><small>{{ $root.data.day_state.current_location || '常驻城市 · 生活区' }}</small></div>
      </div>
      <div class="scene-status">
        <div class="scene-weather">
          <ui-icon :name="$root.weatherKind" :size="28" /><div><span>{{ $root.phaseLabel }}</span><strong>{{ $root.weatherText }}</strong><small>{{ $root.weatherDetail }}</small></div>
        </div>
        <div class="scene-tags">
          <span v-if="$root.data.day_state.current_appearance">{{ $root.data.day_state.current_appearance }}</span>
          <span v-if="$root.data.day_state.current_mood">情绪 / {{ $root.data.day_state.current_mood }}</span>
          <span>{{ $root.data.date }}<template v-if="$root.todayHoliday"> · {{ $root.todayHoliday }}</template></span>
        </div>
        <button class="scene-action" @click="$root.dayStateEditor = true"><span>更新此刻状态</span><ui-icon name="edit" :size="15" /></button>
      </div>
      <div class="scene-cut" aria-hidden="true"></div>
    </section>

    <aside class="mission-dock">
      <div class="dock-top"><span>MISSION CONTROL <b>/ 今日任务</b></span><strong>{{ $root.planStats.done }}<small>/{{ $root.planStats.total }}</small></strong></div>
      <div class="mission-main" v-if="$root.nextItem">
        <div class="mission-kicker"><i></i> 下一事件</div>
        <div class="mission-clock"><strong>{{ $root.fmt.time($root.nextItem.scheduled_at) }}</strong><span>{{ $root.fmt.countdown($root.nextItem.scheduled_at, $root.clockNow) }}</span></div>
        <h2>{{ $root.nextItem.title }}</h2>
        <p>{{ $root.nextItem.intent || '按照自己的想法继续今天。' }}</p>
        <p v-if="$root.nextItem.instruction" class="mission-instruction">{{ $root.nextItem.instruction }}</p>
        <div class="mission-meta"><span>{{ $root.fmt.interaction($root.nextItem.interaction) }}</span><span v-if="$root.nextItem.target" class="mission-target" :title="nextTargetName ? nextTargetName + ' · ' + $root.nextItem.target : $root.nextItem.target"><ui-icon name="message" :size="11" /><template v-if="nextTargetName">{{ nextTargetName }} · </template><code class="target-id">{{ $root.nextItem.target }}</code></span><span v-if="$root.nextItem.execution_probability < 1">概率 {{ Math.round($root.nextItem.execution_probability * 100) }}%</span></div>
        <div class="mission-queue" v-if="$root.upcomingItems.length"><span class="queue-label">随后</span><div v-for="item in $root.upcomingItems" :key="item.id"><b>{{ $root.fmt.time(item.scheduled_at) }}</b><span>{{ item.title }}</span></div></div>
        <div class="mission-telemetry">
          <span class="telemetry-label">SYSTEM TELEMETRY / 系统读数</span>
          <div class="telemetry-row"><span>日程密度</span><i><b :style="{width: Math.min(100, $root.planStats.total / Math.max(1, $root.data.config?.max_items || 12) * 100) + '%'}"></b></i><em>{{ Math.round(Math.min(1, $root.planStats.total / Math.max(1, $root.data.config?.max_items || 12)) * 100) }}%</em></div>
          <div class="telemetry-row"><span>完成进度</span><i><b :style="{width: ($root.planStats.total ? $root.planStats.done / $root.planStats.total * 100 : 0) + '%'}"></b></i><em>{{ $root.planStats.total ? Math.round($root.planStats.done / $root.planStats.total * 100) : 0 }}%</em></div>
          <div class="telemetry-row"><span>环境干扰</span><i><b :style="{width: ($root.weatherKind === 'rain' || $root.weatherKind === 'snow' ? 76 : $root.weatherKind === 'cloud' ? 38 : 18) + '%'}"></b></i><em>{{ $root.weatherKind === 'rain' || $root.weatherKind === 'snow' ? '偏高' : $root.weatherKind === 'cloud' ? '中' : '低' }}</em></div>
        </div>
        <button class="mission-run" :class="{ 'is-cooling': $root.runCooldownRemaining }" @click="$root.runItem($root.nextItem)"><span>{{ $root.runCooldownRemaining ? '防抖 ' + $root.runCooldownRemaining + 's' : '立即触发' }}</span><ui-icon name="play" :size="14" /></button>
      </div>
      <div class="mission-main empty" v-else>
        <div class="mission-kicker"><i></i> SIGNAL EMPTY <span>暂无下一项</span></div>
        <h2>让 bot 写下一段生活</h2><p>今天可以留白，也可以现在给 bot 一次规划机会。</p>
        <button class="mission-run" :class="{ 'is-cooling': $root.planningPending || $root.planningCooldownRemaining }" :disabled="$root.planningPending" @click="$root.runPlanning()"><span>{{ $root.planningLabel('开始规划') }}</span><ui-icon name="sparkle" :size="14" /></button>
      </div>
      <div class="mission-stats">
        <div><strong>{{ String($root.planStats.done).padStart(2, '0') }}</strong><span>已触发</span></div>
        <div><strong>{{ String($root.planStats.total - $root.planStats.done).padStart(2, '0') }}</strong><span>待发生</span></div>
        <div><strong>{{ $root.data.plan?.revision || 0 }}</strong><span>计划版本</span></div>
      </div>
      <div class="dock-footer">
        <button @click="$root.newItem()"><ui-icon name="plus" :size="15" /> 添加小项</button>
        <button @click="$root.setView('calendar')"><ui-icon name="calendar" :size="15" /> 查看日历</button>
      </div>
      <div class="dock-barcode" aria-hidden="true"><i v-for="n in 18" :key="n" :style="{height: (4 + (n * 7) % 15) + 'px'}"></i></div>
    </aside>

    <section class="timeline-console">
      <div class="console-heading"><div><span class="kicker">SCHEDULE / 行为序列</span><h2>今天的生活轨迹</h2></div><div class="console-actions"><span class="console-count">{{ $root.planStats.total }} ENTRIES</span><button v-if="$root.data.plan" class="text-button danger" @click="$root.deleteDay($root.data.date)">删除整天</button></div></div>
      <plan-brief v-if="$root.data.plan" :plan="$root.data.plan" />
      <timeline :plan="$root.data.plan" :server-time="$root.data.server_time" @edit="$root.openItem($event)" @run="$root.runItem($event)" @skip="$root.skipItem($event)" @delete="$root.deleteItem($event)" @delete-block="$root.deleteBlock($event)" />
    </section>

    <aside class="life-signal">
      <section class="signal-card identity-card">
        <div class="signal-heading"><span>STATE / 当前切片</span><ui-icon name="heart" :size="14" /></div>
        <div class="state-list">
          <div><span>地点</span><strong>{{ $root.data.day_state.current_location || '未记录' }}</strong></div>
          <div><span>服装</span><strong>{{ $root.data.day_state.current_appearance || '未记录' }}</strong></div>
          <div><span>心情</span><strong>{{ $root.data.day_state.current_mood || '未记录' }}</strong></div>
          <div><span>活动</span><strong>{{ $root.data.day_state.current_activity || '自由活动' }}</strong></div>
        </div>
        <button class="signal-link" @click="$root.dayStateEditor = true">调整此刻状态 <ui-icon name="chevron" :size="13" /></button>
      </section>
      <section class="signal-card changes-preview" v-if="$root.latestDiff.length">
        <div class="signal-heading"><span>CHANGE LOG / 变化</span><button @click="$root.setView('changes')">全部</button></div>
        <div v-for="change in $root.latestDiff.slice(0, 3)" :key="change.revision" class="change-row">
          <span class="revision-badge">第{{ change.revision }}版</span>
          <div><strong>{{ change.actor === 'bot' ? 'bot' : '你' }} · {{ change.reason || '调整了计划' }}</strong><p>{{ $root.diffSummary(change.diff) }}</p></div>
        </div>
      </section>
      <section class="signal-card environment-card">
        <div class="signal-heading"><span>ENVIRONMENT / 环境信号</span><i class="pulse"></i></div>
        <div class="anomaly-readout"><strong>{{ $root.weatherText }}</strong><span>{{ $root.phaseLabel.split(' · ')[0] }}</span></div>
        <p>界面光效、城市场景与信号强度会随时间、天气和事件状态实时变化。</p>
      </section>
    </aside>
  </div>`,
}

export const CalendarView = {
  components: { Timeline, PlanBrief },
  template: `
  <div class="calendar-layout">
    <section class="calendar-card glass">
      <div class="section-heading">
        <button class="icon-button" @click="$root.shiftMonth(-1)"><ui-icon name="left" :size="16" /></button>
        <h2>{{ $root.monthTitle }}</h2>
        <button class="icon-button" @click="$root.shiftMonth(1)"><ui-icon name="right" :size="16" /></button>
        <button class="soft-button today-button" @click="$root.selectDate($root.data.date)">回到今天</button>
        <button class="soft-button calendar-refresh-button" :disabled="$root.calendarSyncing" @click="$root.refreshCalendarData">{{ $root.calendarSyncing ? '正在更新…' : '更新法定假期数据' }}</button>
        <small class="calendar-sync-note">每 {{ $root.calendarRefreshHours }} 小时自动更新</small>
      </div>
      <div class="weekday-row"><span v-for="day in ['一','二','三','四','五','六','日']">周{{ day }}</span></div>
      <div class="month-grid">
        <button v-for="cell in $root.monthCells" :key="cell.key" class="day-cell" :class="{'other-month': !cell.current, 'is-today': cell.date === $root.data.date, 'is-selected': cell.date === $root.selectedDate, 'has-plan': cell.plan, 'is-holiday': $root.calendarFlags.holiday && cell.holiday?.is_off_day, 'is-workday': $root.calendarFlags.adjusted_workday && cell.holiday && !cell.holiday.is_off_day}"
          @click="$root.selectDate(cell.date)">
          <span class="day-top"><span class="day-number">{{ cell.day }}</span><span v-if="cell.holiday && ($root.calendarFlags.holiday || $root.calendarFlags.adjusted_workday)" class="holiday-mark" :class="{work: !cell.holiday.is_off_day}">{{ cell.holiday.is_off_day ? '休' : '班' }}</span></span>
          <span v-if="$root.calendarCellText(cell)" class="lunar-label" :class="{festival: $root.calendarFlags.festivals && (cell.calendar?.solar_festivals?.length || cell.calendar?.lunar_festivals?.length)}">{{ $root.calendarCellText(cell) }}</span>
          <small v-if="$root.forecastCellText(cell.forecast)" class="day-weather">{{ $root.forecastCellText(cell.forecast) }}</small>
          <small v-if="cell.plan" class="plan-count">{{ cell.count }} 项</small>
        </button>
      </div>
      <div class="calendar-legend"><span><i class="legend-dot"></i> 有计划</span><span><i class="legend-ring"></i> 今天</span><button class="text-button" @click="$root.newPlanForDate()">为 {{ $root.selectedDate }} 安排 →</button></div>
    </section>
    <section class="day-detail glass">
      <div class="section-heading"><div><span class="eyebrow">{{ $root.selectedDate }}</span><h2>{{ $root.selectedPlan?.title || '未安排的一天' }}</h2></div>
        <div class="console-actions"><button v-if="$root.selectedPlan" class="text-button danger" @click="$root.deleteDay($root.selectedDate)">删除整天</button><button class="soft-button" :class="{ 'is-cooling': $root.planningPending || $root.planningCooldownRemaining }" :disabled="$root.planningPending" @click="$root.runPlanning()"><ui-icon name="sparkle" :size="14" /> {{ $root.planningLabel('立即规划') }}</button><button class="soft-button" @click="$root.newItem()"><ui-icon name="plus" :size="15" /> 小项</button></div></div>
      <div v-if="$root.selectedCalendar" class="calendar-facts"><strong v-if="$root.calendarFlags.lunar_date">{{ $root.selectedCalendar.lunar?.text }}</strong><span v-if="$root.calendarFlags.solar_terms && $root.selectedCalendar.solar_term">{{ $root.selectedCalendar.solar_term }}</span><span v-if="($root.calendarFlags.holiday && $root.selectedCalendar.holiday?.is_off_day) || ($root.calendarFlags.adjusted_workday && $root.selectedCalendar.holiday && !$root.selectedCalendar.holiday.is_off_day)">{{ $root.selectedCalendar.holiday.name }} · {{ $root.selectedCalendar.holiday.is_off_day ? '放假' : '调班' }}</span><span v-if="$root.calendarFlags.festivals" v-for="name in $root.selectedCalendar.solar_festivals" :key="'s-'+name">{{ name }}</span><span v-if="$root.calendarFlags.festivals" v-for="name in $root.selectedCalendar.lunar_festivals" :key="'l-'+name">{{ name }}</span></div>
      <div v-if="$root.selectedForecast" class="calendar-weather-detail">
        <strong>预报</strong>
        <span>{{ $root.forecastDetailText($root.selectedForecast) }}</span>
      </div>
      <p v-if="$root.selectedDayTypes.length" class="day-types-line">日型：{{ $root.selectedDayTypes.join(' / ') }}</p>
      <plan-brief v-if="$root.selectedPlan" :plan="$root.selectedPlan" />
      <timeline :plan="$root.selectedPlan" :server-time="$root.data.server_time"
        @edit="$root.openItem($event)" @run="$root.runItem($event)" @skip="$root.skipItem($event)" @delete="$root.deleteItem($event)" @delete-block="$root.deleteBlock($event)" />
    </section>
  </div>`,
}

export const ChangesView = {
  template: `
  <div class="view-stack">
    <section class="section-card glass">
      <div class="section-heading"><div><span class="eyebrow">生活变化审计</span><h2>每一次调整都有来处</h2></div>
        <select v-model="$root.diffPlanId" @change="$root.loadDiff"><option v-for="plan in $root.recentPlans" :value="plan.id">{{ plan.date }} · {{ plan.title }}</option></select>
      </div>
      <div v-if="!$root.diffs.length" class="empty-inline">还没有变化记录，生活才刚刚开始。</div>
      <article v-for="change in $root.diffs" :key="change.revision" class="diff-card">
        <div class="diff-revision"><span>第{{ change.revision }}版</span><small>{{ change.actor === 'bot' ? 'bot' : '你' }}</small></div>
        <div class="diff-body"><h3>{{ change.reason || '调整生活安排' }}</h3><time>{{ $root.fmt.date(change.created_at) }}</time>
          <div v-for="entry in change.diff" class="diff-entry" :class="'op-' + entry.op">
            <strong>{{ entry.op === 'added' ? '+' : entry.op === 'removed' ? '-' : '~' }} {{ entry.title }}</strong>
            <span v-for="(value, field) in entry.changes">{{ $root.fmt.field(field) }}：{{ $root.fmt.humanValue(field, value.from) }} → {{ $root.fmt.humanValue(field, value.to) }}</span>
          </div>
        </div>
      </article>
    </section>
    <section class="section-card glass">
      <div class="section-heading"><div><span class="eyebrow">运行记录</span><h2>触发不是盲目发送</h2></div><button class="soft-button" @click="$root.loadRuns">刷新</button></div>
      <div class="run-table"><div class="run-row run-head"><span>小项</span><span>状态</span><span>概率</span><span>时间</span></div>
        <div v-for="run in $root.runs" class="run-row"><span>{{ $root.itemTitle(run.item_id) }}</span><span>{{ $root.fmt.runStatus(run.status) }}</span><span>{{ run.probability == null ? '—' : Math.round(run.probability * 100) + '%' }}</span><span>{{ $root.fmt.date(run.claimed_at) }}</span></div>
      </div>
    </section>
  </div>`,
}

export const ThreadsView = {
  template: `
  <div class="view-stack thread-page">
    <section class="section-card glass">
      <div class="section-heading">
        <div><span class="eyebrow">THREADS / 目标与约定</span><h2>长期的事，也要有地方落脚</h2></div>
        <button class="primary" @click="$root.newThread()"><ui-icon name="plus" :size="15" /> 新建目标 / 约定</button>
      </div>
      <p class="field-hint">目标、约定、项目、习惯、未完成的小事和长期悬念都在这里。开启强制回应时 bot 会在规划时逐条表态，也可以在聊天或执行后自己打卡；你随时可以新建、修改、暂停或删除。</p>
      <div class="thread-filters">
        <div class="thread-filter-tabs">
          <button v-for="filter in $root.threadFilters" :key="filter.id" :class="{active: $root.threadFilter === filter.id}" @click="$root.setThreadFilter(filter.id)">{{ filter.label }}</button>
        </div>
        <select v-model="$root.threadKind" @change="$root.loadThreads()" aria-label="按类型筛选">
          <option value="">全部类型</option>
          <option v-for="kind in $root.threadKinds" :key="kind.id" :value="kind.id">{{ kind.label }}</option>
        </select>
      </div>
      <div v-if="!$root.threads.length" class="empty-inline">还没有目标或约定。你可以新建一个，也可以等 bot 在聊天里记下它答应过的事。</div>
      <div class="thread-grid">
        <article v-for="thread in $root.threads" :key="thread.id" class="thread-card" :class="'thread-' + thread.status">
          <header>
            <span class="thread-state">{{ $root.threadStatusLabel(thread.status) }}</span>
            <span class="thread-kind">{{ $root.threadKindLabel(thread.kind) }}</span>
            <span class="thread-priority">P{{ thread.priority }}</span>
          </header>
          <h3>{{ thread.title }}</h3>
          <p class="thread-next"><span>下一步</span>{{ thread.next_step || '还没有写下一步' }}</p>
          <p class="thread-dossier">{{ thread.dossier || '还没有档案；可以在编辑里补充背景、约定细节和边界。' }}</p>
          <div class="thread-meta">
            <span v-if="thread.due">{{ $root.threadDueLabel(thread) }}</span>
            <span v-else>无截止</span>
            <span>{{ thread.stale_days ? thread.stale_days + ' 天没动' : '最近有进展' }}</span>
            <span>#{{ thread.short_id }}</span>
          </div>
          <div class="thread-actions">
            <button class="soft-button" @click="$root.openThread(thread)">查看 / 编辑</button>
            <button v-if="['open', 'paused'].includes(thread.status)" class="soft-button" @click="$root.openThreadTouch(thread)">打卡</button>
            <button v-if="thread.status === 'open'" class="text-button" @click="$root.closeThreadStatus(thread, 'done')">完成</button>
          </div>
        </article>
      </div>
    </section>
  </div>`,
}

export const ThreadEditor = {
  props: ['editor'],
  data() {
    const source = this.editor.thread || {}
    return {
      form: {
        id: source.id || '',
        kind: source.kind || 'goal',
        title: source.title || '',
        dossier: source.dossier || '',
        status: source.status || 'open',
        priority: source.priority ?? 1,
        next_step: source.next_step || '',
        due_at: source.due_at || '',
        note: '',
      },
      logs: source.logs || [],
    }
  },
  computed: {
    isNew() { return !this.form.id },
    statusOptions() {
      const allowed = this.isNew ? ['open', 'paused'] : null
      return this.$root.threadStatuses.filter((entry) => !allowed || allowed.includes(entry.id))
    },
    maxDossier() { return Number(this.$root.data?.config?.threads?.dossier_chars || 2000) },
    maxNextStep() { return Number(this.$root.data?.config?.threads?.next_step_chars || 200) },
    maxLog() { return Number(this.$root.data?.config?.threads?.log_chars || 500) },
  },
  template: `
  <div class="modal-backdrop" @click.self="$root.closeThreadEditor()"><div class="modal-card large thread-editor">
    <div class="modal-heading"><div><span class="eyebrow">THREAD / 目标与约定</span><h2>{{ isNew ? '新建目标 / 约定' : '编辑档案' }}</h2></div><button class="icon-button" @click="$root.closeThreadEditor()"><ui-icon name="close" :size="16" /></button></div>
    <div class="form-grid">
      <label><span>类型</span><select v-model="form.kind"><option v-for="kind in $root.threadKinds" :key="kind.id" :value="kind.id">{{ kind.label }}</option></select></label>
      <label><span>状态</span><select v-model="form.status"><option v-for="status in statusOptions" :key="status.id" :value="status.id">{{ status.label }}</option></select></label>
      <label class="wide-field"><span>标题</span><input v-model="form.title" maxlength="120" placeholder="例如：给阿岚画头像"></label>
      <label class="wide-field"><span>档案</span><textarea rows="8" v-model="form.dossier" :maxlength="maxDossier" placeholder="背景、约定细节、相关人、边界、历史摘要……"></textarea><small>规划时优先展示前几条（默认 5 条）的档案全文；其余给摘要。完整档案随时可在 rhythm_view 里查。</small></label>
      <label><span>下一步</span><input v-model="form.next_step" :maxlength="maxNextStep" placeholder="一句话，例如：修线稿"></label>
      <label><span>截止</span><input v-model="form.due_at" maxlength="19" placeholder="YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS"></label>
      <label><span>优先级</span><select v-model.number="form.priority"><option :value="0">0 · 低</option><option :value="1">1 · 普通</option><option :value="2">2 · 重要</option><option :value="3">3 · 很急</option></select></label>
      <label><span>状态变更备注</span><input v-model="form.note" :maxlength="maxLog" placeholder="完成/放弃/暂停时留一句原因"></label>
    </div>
    <div v-if="logs.length" class="thread-log-list"><h3>打卡记录</h3><div v-for="log in logs" :key="log.at + log.note" class="thread-log"><time>{{ $root.fmt.date(log.at) }}</time><p>{{ log.note }}</p><span v-if="log.item_id">来自小项</span></div></div>
    <div class="modal-actions">
      <button v-if="!isNew && form.status !== 'deleted'" class="text-button danger" @click="$root.deleteThread(form)">删除</button>
      <button v-if="!isNew && ['open', 'paused'].includes(form.status)" class="soft-button" @click="$root.openThreadTouch(form)">打卡</button>
      <button class="soft-button" @click="$root.closeThreadEditor()">取消</button>
      <button class="primary" @click="$root.saveThread(form)">保存</button>
    </div>
  </div></div>`,
}

export const ThreadTouch = {
  props: ['touch'],
  data() {
    return { note: '', next_step: this.touch.thread?.next_step || '' }
  },
  computed: {
    maxLog() { return Number(this.$root.data?.config?.threads?.log_chars || 500) },
    maxNextStep() { return Number(this.$root.data?.config?.threads?.next_step_chars || 200) },
  },
  template: `
  <div class="modal-backdrop" @click.self="$root.closeThreadTouch()"><div class="modal-card thread-touch">
    <div class="modal-heading"><div><span class="eyebrow">CHECK-IN / 打卡</span><h2>{{ touch.thread?.title }}</h2></div><button class="icon-button" @click="$root.closeThreadTouch()"><ui-icon name="close" :size="16" /></button></div>
    <label class="full-field"><span>这次做到哪 / 卡在哪</span><textarea rows="4" v-model="note" :maxlength="maxLog" placeholder="例如：线稿修完一半，脸的比例还要调"></textarea></label>
    <label class="full-field"><span>下一步（可留空）</span><input v-model="next_step" :maxlength="maxNextStep" placeholder="例如：调脸的比例"></label>
    <div class="modal-actions"><button class="soft-button" @click="$root.closeThreadTouch()">取消</button><button class="primary" @click="$root.saveThreadTouch({ note, next_step })">保存打卡</button></div>
  </div></div>`,
}

export const TemplatesView = {
  template: `
  <div class="view-stack">
    <section class="section-card glass">
      <div class="section-heading"><div><span class="eyebrow">我的模板</span><h2>把一种生活保存成可复用的骨架</h2></div><div class="template-actions"><button class="soft-button" @click="$root.newTemplate"><ui-icon name="plus" :size="14" /> 新建模板</button><button class="soft-button" @click="$root.saveCurrentTemplate">从当前计划新建</button></div></div>
      <p class="field-hint">应用模板会把固定分组和小项直接写入选中的日期；如果想让 bot 按模板重新规划，请用“按模板规划”。</p>
      <div v-if="$root.customPlanTemplates.length" class="template-grid">
        <article v-for="template in $root.customPlanTemplates" :key="template.id" class="template-card" :class="'tone-' + (template.tone || 'violet')">
          <span class="template-icon"><img v-if="template.icon_url" :src="template.icon_url" alt=""><ui-icon v-else :name="template.icon || 'sparkle'" :size="21" /></span><h3>{{ template.name }}</h3><p>{{ template.description }}</p>
          <div class="template-actions"><button class="soft-button" @click="$root.applyTemplate(template)">应用骨架到 {{ $root.selectedDate }}</button><button class="text-button" @click="$root.planWithTemplate(template)">按模板规划</button><button class="text-button" @click="$root.editTemplate(template)">编辑</button><button class="text-button" @click="$root.previewTemplate(template)">预览</button><button v-if="template.override || template.custom" class="text-button muted" @click="$root.deleteTemplate(template)">删除我的模板</button></div>
        </article>
      </div>
      <div v-else class="empty-inline">还没有自己的模板。可以先新建，或从当前计划保存一份。</div>
      <div class="preset-toggle"><button class="text-button" @click="$root.showPresetTemplates = !$root.showPresetTemplates">{{ $root.showPresetTemplates ? '收起预设模板' : '展开预设模板（参考）' }} · {{ $root.presetPlanTemplates.length }}</button><span>预设默认折叠，不会自动应用。</span></div>
      <div v-if="$root.showPresetTemplates" class="template-grid preset-grid">
        <article v-for="template in $root.presetPlanTemplates" :key="template.id" class="template-card" :class="'tone-' + (template.tone || 'violet')">
          <span class="template-icon"><img v-if="template.icon_url" :src="template.icon_url" alt=""><ui-icon v-else :name="template.icon || 'sparkle'" :size="21" /></span><h3>{{ template.name }}</h3><p>{{ template.description }}</p>
          <div class="template-actions"><button class="soft-button" @click="$root.applyTemplate(template)">应用骨架</button><button class="text-button" @click="$root.planWithTemplate(template)">按模板规划</button><button class="text-button" @click="$root.editTemplate(template)">编辑</button><button class="text-button" @click="$root.previewTemplate(template)">预览</button><button v-if="template.override" class="text-button muted" @click="$root.deleteTemplate(template)">恢复默认</button></div>
        </article>
      </div>
    </section>
    <section class="section-card glass">
      <div class="section-heading"><div><span class="eyebrow">我的日型</span><h2>给日子加上属于你的名字</h2></div><button class="soft-button" @click="$root.newDayType"><ui-icon name="plus" :size="14" /> 自定义日型</button></div>
      <p class="field-hint">日型可以多个同时生效；名称和提示词按优先级拼接，日历事实不会被日型覆盖。关闭开关只会停用该日型，记录仍保留，之后可随时重新开启。</p>
      <div class="day-type-grid"><article v-for="entry in $root.customDayTypes" class="day-type-card" :style="{'--day-color': entry.config.color || 'var(--accent)'}">
        <span class="day-type-color"></span><h3>{{ entry.name }}</h3><small>{{ $root.data.config.day_type_enabled?.[entry.id] === false ? '已停用 · 保留记录' : '自定义日型 · 已开启' }}</small>
        <label class="day-type-switch"><input type="checkbox" :checked="$root.data.config.day_type_enabled?.[entry.id] !== false" @change="$root.toggleCustomDayType(entry.id, $event.target.checked)"><span>启用</span></label>
        <button class="text-button" @click="$root.editDayType(entry)">编辑</button><button v-if="!entry.builtin" class="text-button muted" @click="$root.deleteDayType(entry)">删除</button>
      </article></div>
      <div v-if="!$root.customDayTypes.length" class="empty-inline">还没有自定义日型。比如可以创建“发薪日”“祈祷日”“考试周”。</div>
    </section>
    <div class="preset-toggle base-type-toggle"><button class="text-button" @click="$root.showBaseDayTypes = !$root.showBaseDayTypes">{{ $root.showBaseDayTypes ? '收起基础日型参考' : '展开基础日型参考' }} · {{ $root.baseDayTypes.length }}</button><span>默认折叠，不会自动应用。</span></div>
    <section v-if="$root.showBaseDayTypes" class="section-card glass">
      <div class="section-heading"><div><span class="eyebrow">基础日型参考</span><h2>内置模板，默认不启用</h2></div></div>
      <p class="field-hint">这些是内置参考模板，默认不开启以不额外发送提示词引导，它们的日子本身会被作为日历显示给 bot。只有这些模板正好符合你认为的 bot 的生活节律，并希望定义其提示词等时才打开。关闭不会影响日历事实，也不影响自定义日型。</p>
      <div class="base-day-grid"><label v-for="entry in $root.baseDayTypes" :key="entry.id" class="base-day-row" :style="{'--day-color': entry.config.color || 'var(--accent)'}">
        <span class="day-type-color"></span><span><strong>{{ entry.name }}</strong><small>默认关闭 · {{ entry.id === 'weekday' ? '普通工作日' : entry.id === 'weekend' ? '普通周末' : entry.id === 'holiday' ? '法定放假' : '调休补班' }}</small></span>
        <input type="checkbox" :checked="$root.data.config.base_day_types?.[entry.id] === true" @change="$root.toggleBaseDayType(entry.id, $event.target.checked)"><button class="text-button" @click="$root.editDayType(entry)">编辑</button>
      </label></div>
    </section>
    <section class="section-card glass">
      <div class="section-heading"><div><span class="eyebrow">外观与头像</span><h2>让界面也拥有生活感</h2></div></div>
      <div class="theme-grid"><button v-for="theme in $root.themeTemplates" class="theme-card" :class="{active: ($root.data.config.appearance.theme === 'random' ? theme.random : $root.data.config.appearance.theme === theme.id)}" @click="$root.setTheme(theme)">
        <span class="theme-preview" :data-theme-name="theme.id" :style="$root.themePreviewStyle(theme)"><i></i><i></i><i></i></span><strong>{{ theme.name }}</strong><small>{{ theme.description }}</small>
      </button></div>
      <div class="avatar-editor"><img v-if="$root.avatarUrl && !$root.avatarBroken" :src="$root.avatarUrl" alt="当前头像" @error="$root.avatarBroken = true"><span v-else class="avatar-placeholder" aria-label="未设置头像">?</span><div><h3>生活头像</h3><p>默认自动获取适配器头像，也可以为此人格上传专属图片。</p><label class="soft-button upload-button">上传头像<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="$root.uploadAvatar"></label></div></div>
      <div class="avatar-editor"><div><h3>全屏生活背景</h3><p>上传后会覆盖主题插画，手机和桌面均以全屏裁切适配；随时可恢复主题背景。</p><div class="data-actions"><label class="soft-button upload-button">上传背景<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="$root.uploadBackground"></label><button class="soft-button" @click="$root.clearBackground">恢复主题背景</button></div></div></div>
      <div class="avatar-editor"><div><h3>生活横幅与强调色</h3><p>图片只保存在本机；颜色会立即应用到当前人格的界面。</p><div class="data-actions"><label class="soft-button upload-button">上传横幅<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="$root.uploadBanner"></label><input type="color" v-model="$root.customAccent" style="width: 100px" @change="$root.applyCustomAccent"></div></div></div>
    </section>
  </div>`,
}

export const TemplateEditor = {
  props: ['template'],
  data() {
    const source = this.template ? JSON.parse(JSON.stringify(this.template)) : {
      name: '', description: '', icon: 'sparkle', plan: { title: '', overview: '', planned_appearance: '', planned_mood: '', blocks: [] },
    }
    source.plan ||= { title: '', overview: '', planned_appearance: '', planned_mood: '', blocks: [] }
    source.plan.blocks ||= []
    source.planning_prompt ||= source.prompt || ''
    source.execution_prompt ||= ''
    source.icon ||= 'sparkle'
    for (const block of source.plan.blocks) {
      block.items ||= []
      for (const item of block.items) {
        item.schedule ||= { type: 'exact', at: '09:00' }
        item.schedule.type ||= 'exact'
        item.interaction ||= 'auto'
        item.target ||= ''
        item.execution_probability ??= 1
        item.category ||= ''
      }
    }
    return {
      form: source,
      icons: ['home', 'calendar', 'cloud', 'moon', 'flower', 'sparkle', 'clock', 'pin', 'heart'],
    }
  },
  methods: {
    addBlock() {
      this.form.plan.blocks.push({ title: '生活片段', items: [] })
    },
    removeBlock(index) {
      this.form.plan.blocks.splice(index, 1)
    },
    addItem(block) {
      block.items ||= []
      block.items.push({ title: '新的小项', intent: '', instruction: '', schedule: { type: 'exact', at: '09:00' }, interaction: 'auto', target: '', execution_probability: 1, category: '' })
    },
    removeItem(block, index) {
      block.items.splice(index, 1)
    },
    async uploadIcon(event) {
      const file = event.target.files[0]
      if (!file) return
      try {
        const asset = await this.$root.uploadTemplateIcon(file)
        this.form.icon_url = asset.url
        this.form.icon_asset_id = asset.id
        this.form.icon = ''
        this.$root.notify('模板图标已上传')
      } catch (error) { this.$root.notify(error.message, 'error') } finally { event.target.value = '' }
    },
  },
  template: `
  <div class="modal-backdrop" @click.self="$root.closeTemplateEditor"><div class="modal-card large">
    <div class="modal-heading"><div><span class="eyebrow">生活模板</span><h2>{{ form.override || form.builtin ? '编辑内置模板' : form.custom ? '编辑我的模板' : '新建模板' }}</h2></div><button class="icon-button" @click="$root.closeTemplateEditor"><ui-icon name="close" :size="16" /></button></div>
    <div class="form-grid">
      <label class="wide"><span>模板名称</span><input v-model="form.name" placeholder="例如：从容工作日 / 发薪日 / 雨天宅家"></label>
      <label class="wide"><span>模板说明</span><textarea rows="2" v-model="form.description" placeholder="一句话说明这个模板适合什么样的日子。"></textarea></label>
      <div class="wide"><span class="field-label">模板图标</span><div class="icon-picker"><button v-for="icon in icons" :key="icon" class="icon-choice" :class="{active: form.icon === icon && !form.icon_url}" @click="form.icon = icon; form.icon_url = ''; form.icon_asset_id = ''"><ui-icon :name="icon" :size="20" /></button><label class="icon-choice upload-choice" title="上传自定义图标"><ui-icon name="upload" :size="18" /><input type="file" accept="image/png,image/jpeg,image/webp" @change="uploadIcon"></label><img v-if="form.icon_url" :src="form.icon_url" class="template-icon-preview" alt=""></div></div>
      <label class="wide"><span>规划引导词</span><textarea rows="3" v-model="form.planning_prompt" placeholder="希望 bot 在按此模板规划时记住什么？例如：先看天气和身体状态，不要排满。"></textarea><small class="field-hint">用于“按模板规划”；直接应用骨架时不会重新生成计划。</small></label>
      <label class="wide"><span>执行引导词</span><textarea rows="3" v-model="form.execution_prompt" placeholder="希望每个小项执行时遵循什么？例如：保持松弛，不要机械汇报。"></textarea><small class="field-hint">应用骨架时会附加到小项执行提示词；小项自己的说明仍保留。</small></label>
    </div>
    <div class="template-planner">
      <div class="section-heading"><div><span class="eyebrow">计划骨架</span><h3>按天分组，小项放在组里</h3></div><button class="soft-button" @click="addBlock"><ui-icon name="plus" :size="14" /> 添加分组</button></div>
      <div v-for="(block, blockIndex) in form.plan.blocks" :key="blockIndex" class="template-block">
        <div class="template-block-head"><input v-model="block.title" placeholder="分组名称，例如：上午 / 傍晚"><button class="text-button muted" @click="removeBlock(blockIndex)">删除分组</button></div>
        <div v-for="(item, itemIndex) in block.items" :key="itemIndex" class="template-item">
          <div class="form-grid">
            <label class="wide"><span>小项标题</span><input v-model="item.title" placeholder="例如：开始工作"></label>
            <label><span>为什么安排</span><input v-model="item.intent" placeholder="例如：进入节奏"></label>
            <label><span>时间模式</span><select v-model="item.schedule.type"><option value="exact">精确时间</option><option value="window">随机时间窗</option></select></label>
            <label v-if="item.schedule.type === 'exact'"><span>执行时间</span><input type="time" step="1" v-model="item.schedule.at"></label>
            <template v-else><label><span>窗口开始</span><input type="time" step="1" v-model="item.schedule.start"></label><label><span>窗口结束</span><input type="time" step="1" v-model="item.schedule.end"></label></template>
            <label><span>互动方式</span><select v-model="item.interaction"><option value="auto">自由决定</option><option value="must_message">需要发言</option><option value="silent">安静经历</option></select></label>
            <label><span>目标会话</span><select v-model="item.target"><option value="">执行池自动选择</option><option v-if="item.target && !$root.data.sessions.some(s => s.sid === item.target)" :value="item.target">{{ $root.sessionName(item.target) || '未加载的会话' }} · {{ item.target }}（当前）</option><option v-for="session in $root.data.sessions" :value="session.sid">{{ session.title }} · {{ session.sid }}</option></select></label>
            <label class="wide"><span>执行提示</span><textarea rows="2" v-model="item.instruction" placeholder="小项执行时真正要做什么。"></textarea></label>
          </div>
          <div class="template-item-actions"><button class="text-button muted" @click="removeItem(block, itemIndex)">删除小项</button></div>
        </div>
        <button class="soft-button add-item-button" @click="addItem(block)"><ui-icon name="plus" :size="13" /> 添加小项</button>
      </div>
      <div v-if="!form.plan.blocks.length" class="empty-inline">还没有分组。先添加一个分组，再在组里添加小项。</div>
    </div>
    <div class="modal-actions"><button v-if="form.override || form.custom" class="text-button muted" @click="$root.deleteTemplate(form)">恢复默认</button><button class="soft-button" @click="$root.closeTemplateEditor">取消</button><button class="primary" @click="$root.saveTemplate(form)">保存模板</button></div>
  </div></div>`,
}

export const SettingsView = {
  template: `
  <div class="settings-layout glass" v-if="$root.draft">
    <aside class="settings-tabs"><button v-for="tab in [['general','规划与数量'],['threads','目标与约定'],['time','时间与夜间'],['calendar','日历信息'],['sessions','会话权限'],['weather','天气与地点'],['data','数据与诊断']]" :class="{active: $root.settingsTab === tab[0]}" @click="$root.selectSettingsTab(tab[0])">{{ tab[1] }}</button></aside>
    <div class="settings-content">
      <section v-if="$root.settingsTab === 'general'" class="settings-section">
        <span class="eyebrow">规划与数量</span><h2>自主，但有清晰边界</h2>
        <p class="field-hint">这些规则决定 bot 能安排多少生活，以及日程在多大范围内变化。初次使用建议保持默认，先观察一两天再调整。</p>
        <div class="form-grid">
          <label><span>每日最少安排</span><small>太少会显得空，推荐 2 到 4 项。</small><input type="number" min="0" max="500" v-model.number="$root.draft.min_items"></label>
          <label><span>每日最多安排</span><small>避免日程过密，推荐 8 到 12 项。</small><input type="number" min="1" max="500" v-model.number="$root.draft.max_items"></label>
          <label><span>定时规划（可精确到秒）</span><small>每天到这个时间，bot 会检查并安排接下来的生活；默认 23:00 即可。</small><input type="time" step="1" v-model="$root.draft.planning_time"></label>
          <label><span>允许提前规划几天</span><small>默认 14 天已经足够，无需频繁修改。</small><input type="number" min="1" max="366" v-model.number="$root.draft.max_horizon_days"></label>
          <label><span>新日程默认执行概率</span><small>1 表示一定执行；0.8 表示偶尔会自然错过。</small><input type="number" min="0" max="1" step="0.05" v-model.number="$root.draft.default_probability"></label>
          <label><span>bot 可设置的最低概率</span><small>防止 bot 把所有安排设得太随意，推荐 0.2。</small><input type="number" min="0" max="1" step="0.05" v-model.number="$root.draft.min_probability"></label>
          <label><span>历史天数</span><small>给 bot 参考最近几天；0 表示不看历史。默认 3 天。</small><input type="number" min="0" max="30" v-model.number="$root.draft.history_days"></label>
          <label><span>每组保留的最近变更记录</span><small>只影响发送给 bot 的变化上下文，推荐 2。</small><input type="number" min="1" max="20" v-model.number="$root.draft.diff_revisions"></label>
        </div>
        <div class="switch-grid"><label class="switch-row"><span>自动规划<small>到设定时间自动安排。</small></span><input type="checkbox" v-model="$root.draft.auto_plan"></label>
          <label class="switch-row"><span>全项触发后再给规划机会<small>当天事项都结束后再规划一次。</small></span><input type="checkbox" v-model="$root.draft.plan_on_all_triggered"></label>
          <label class="switch-row"><span>精确时间<small>允许安排具体时刻。</small></span><input type="checkbox" v-model="$root.draft.allow_exact"></label>
          <label class="switch-row"><span>随机时间窗<small>允许在一个时间段内随机。</small></span><input type="checkbox" v-model="$root.draft.allow_window"></label>
          <label class="switch-row"><span>概率触发<small>允许按概率自然发生或跳过。</small></span><input type="checkbox" v-model="$root.draft.allow_probability"></label>
          <label class="switch-row"><span>普通聊天附带当前生活状态<small>发送状态、天气和待办。</small></span><input type="checkbox" v-model="$root.draft.inject_day_state"></label>
        </div>
        <p class="field-hint">自动规划：到点自动安排；全项触发后再规划：当天事项都结束后再给一次规划机会；精确时间 / 随机时间窗 / 概率触发：允许 bot 使用的时间与随机方式。普通聊天附带当前生活状态：控制下面的状态、天气和待办是否进入普通聊天。</p>
        <div class="settings-subsection">
          <h3>普通聊天里的待办清单</h3>
          <p class="field-hint">“普通聊天附带当前生活状态”是总开关；这里单独控制是否附带待办清单，以及清单最多占多少字。清单太长会截断，bot 仍可用 rhythm_view 查看完整计划。</p>
          <div class="switch-grid"><label class="switch-row"><span>普通聊天附带待办清单<small>只控制待办清单；上面的总开关关闭时无效。</small></span><input type="checkbox" v-model="$root.draft.inject_agenda"></label></div>
          <label class="full-field"><span>待办清单最多字符数</span><small>数值越小越省 token；默认 2400，推荐 1200 到 3000。仅在上面的开关开启时生效。</small><input type="number" min="300" max="12000" step="100" v-model.number="$root.draft.agenda_max_chars"></label>
        </div>
        <label class="full-field"><span>历史模式</span><small>普通聊天里保留多少过程提示；不确定就选“系统短标记（推荐）”。</small><select v-model="$root.draft.history_mode"><option value="notice">系统短标记（推荐）</option><option value="full">额外保留提示词模板</option><option value="none">完全不写入聊天历史</option></select></label>
        <label class="full-field"><span>全部小项结束后的规划会话</span><select v-model="$root.draft.all_triggered_target_mode"><option value="planning_pool">规划起始池（默认）</option><option value="last_session">最后一个实际完成的会话</option></select><small class="field-hint">推荐保持规划池。只有希望 bot 在刚完成对话的地方继续规划时，才选择“最后实际完成的会话”。</small></label>
        <div class="settings-subsection">
          <h3>给 bot 的上下文</h3>
          <p class="field-hint">规划时给最近 3 天完整计划和更早 4 天摘要；执行时给当天已发生的事；普通聊天默认给 top 5 目标。历史越长、档案越全，token 越高；不确定就保持默认。</p>
          <div class="form-grid">
            <label><span>更早的摘要天数</span><small>最近 3 天之后，再往前给几天摘要；默认 4 天。</small><input type="number" min="0" max="30" v-model.number="$root.draft.history_digest_days"></label>
            <label><span>历史上限字符数</span><small>规划上下文预算；超出时按摘要、历史、完整计划、档案依次降级，不会切断 JSON；最后最小对象仍保留必回应契约、当前小项/当前计划/约束等关键字段。默认 16000。</small><input type="number" min="500" max="100000" step="500" v-model.number="$root.draft.history_char_budget"></label>
            <label><span>历史小项说明最多字符</span><small>最近 3 天完整计划里每项 instruction 的上限；默认 200。</small><input type="number" min="0" max="2000" step="20" v-model.number="$root.draft.history_instruction_chars"></label>
            <label><span>最近实际结果天数</span><small>把最近几天真正发生了什么给 bot；默认 2 天。</small><input type="number" min="0" max="14" v-model.number="$root.draft.recent_outcomes_days"></label>
            <label><span>未完成事项回看天数</span><small>最近几天 missed/cancelled 的小项；默认 3 天。</small><input type="number" min="0" max="30" v-model.number="$root.draft.unfinished_days"></label>
            <label><span>未来安排预览天数</span><small>未来几天已有计划，避免撞车；默认 2 天。</small><input type="number" min="0" max="14" v-model.number="$root.draft.future_plan_days"></label>
          </div>
          <div class="switch-grid"><label class="switch-row"><span>历史里带 instruction<small>让 bot 看到上次具体打算怎么做；默认开。</small></span><input type="checkbox" v-model="$root.draft.history_include_instruction"></label></div>
          <label class="full-field"><span>规划记忆卫生</span><small>把历史规划回合压成一行摘要，避免 10 份完整计划 JSON 反复进入会话记忆；默认“摘要”。</small><select v-model="$root.draft.memory_hygiene"><option value="summary">摘要（推荐）</option><option value="off">不处理（保留原始工具调用）</option></select></label>
        </div>
        <label class="full-field"><span class="prompt-title">完整规划提示词<button class="text-button" @click="$root.resetPrompt('planning')">恢复默认</button></span><small>告诉 bot 怎样安排生活；不懂就保持默认，修改后保存即生效。</small><textarea rows="7" v-model="$root.draft.planning_prompt"></textarea></label>
        <label class="full-field"><span class="prompt-title">小项执行提示词<button class="text-button" @click="$root.resetPrompt('execution')">恢复默认</button></span><small>告诉 bot 执行单个安排时怎么说话、怎么行动；不懂就保持默认。</small><textarea rows="6" v-model="$root.draft.execution_prompt"></textarea></label>
      </section>
      <section v-if="$root.settingsTab === 'threads'" class="settings-section">
        <span class="eyebrow">目标与约定 / Threads</span><h2>长期的事，要求 bot 每天看见，但不强迫推进</h2>
        <p class="field-hint">目标、约定、项目、习惯、未完成的小事和长期悬念都存在这里。开启“规划时强制回应”后，bot 必须在规划回合逐条表态；回应可以是“推进 / 推迟 / 等待 / 保持不动”，所以它不会被强迫改变计划。</p>
        <div class="settings-subsection">
          <h3>开关</h3>
          <div class="switch-grid">
            <label class="switch-row"><span>启用目标与约定<small>关闭后 bot 不再自动写入、展示或要求回应；WebUI 仍可手动管理已有目标。</small></span><input type="checkbox" v-model="$root.draft.threads.enabled"></label>
            <label class="switch-row"><span>普通聊天显示 [KRD Threads]<small>默认显示 top 5 的标题/截止/下一步（可在下方调整条数），不显示档案全文。默认开；上面的“普通聊天附带当前生活状态”关闭时无效。</small></span><input type="checkbox" v-model="$root.draft.threads.chat_enabled"></label>
            <label class="switch-row"><span>规划时强制回应<small>开启后，若上下文包含 threads_requiring_response，规划回合必须先逐条回应；缺回应在 reject 模式会被拒绝，warn 模式只提醒。只要求表态，不要求推进。默认开。</small></span><input type="checkbox" v-model="$root.draft.threads.require_response"></label>
            <label class="switch-row"><span>执行后强制打卡<small>执行完关联小项后必须写一句进展，否则标记未打卡。默认关：执行回合不一定调用工具，强制容易变成形式主义。</small></span><input type="checkbox" v-model="$root.draft.threads.force_touch"></label>
            <label class="switch-row"><span>自动打卡<small>小项触发后自动写一条“执行了 X”。默认关：信息量低，让 bot 自己写“做到哪”更有用。</small></span><input type="checkbox" v-model="$root.draft.threads.auto_touch"></label>
          </div>
          <label class="full-field"><span>缺回应时的处理</span><small>“拒绝”会让 bot 补回应后再规划；“只提醒”会通过但标记缺失，下次再提。</small><select v-model="$root.draft.threads.response_mode"><option value="reject">拒绝并让 bot 补回应（推荐）</option><option value="warn">通过但标记缺失</option></select></label>
        </div>
        <div class="settings-subsection">
          <h3>空目标层</h3>
          <label class="full-field"><span>目标层为空时</span><small>只在规划触发时生效；普通聊天为空时不会显示空的 [KRD Threads] 标题。</small>
            <select v-model="$root.draft.threads.empty_mode">
              <option value="allow">允许为空</option>
              <option value="nudge">提醒 bot 尝试建立（推荐，默认）</option>
              <option value="require">要求至少 {{ $root.draft.threads.empty_min }} 条（严格）</option>
            </select>
          </label>
          <div class="form-grid">
            <label><span>空层至少</span><small>活动目标少于此数时触发提示/要求；默认 1 条。</small><input type="number" min="1" max="10" v-model.number="$root.draft.threads.empty_min"></label>
            <label><span>空层至多</span><small>提示 bot 建立时建议不要超过此数；不会强迫删除已有目标。默认 5 条。</small><input type="number" min="1" max="10" v-model.number="$root.draft.threads.empty_max"></label>
          </div>
          <p class="field-hint">“提醒”只给 bot 一个真实目标的邀请，不阻断规划；“要求”会在活动目标少于“至少”时暂缓 rhythm_plan，直到 thread_add 补足。至多只是建立建议，不会强迫删除已有目标；严格模式可能产生伪目标，默认不启用。</p>
        </div>
        <div class="settings-subsection">
          <h3>规划时展示多少</h3>
          <p class="field-hint">前几条给档案全文（默认 5 条），其余给摘要；执行时只显示当前小项关联的那条；聊天默认 top 5。完整档案始终可以用 rhythm_view(scope="thread") 查。</p>
          <div class="form-grid">
            <label><span>规划最多回应几条</span><small>按到期、停滞、优先级排序；默认 8 条。</small><input type="number" min="1" max="50" v-model.number="$root.draft.threads.response_limit"></label>
            <label><span>规划展示条数</span><small>默认 8 条；不得低于“规划最多回应几条”，保存时会自动提升到该值。</small><input type="number" min="1" max="50" v-model.number="$root.draft.threads.planning_limit"></label>
            <label><span>其中档案全文条数</span><small>默认 5 条；其余给摘要。</small><input type="number" min="0" max="20" v-model.number="$root.draft.threads.full_dossier_in_planning"></label>
            <label><span>档案摘要字数</span><small>没有全文的条目给多少字；默认 300。</small><input type="number" min="50" max="2000" step="50" v-model.number="$root.draft.threads.excerpt_chars"></label>
            <label><span>规划时展示打卡条数</span><small>每条目标最近几次打卡；默认 3 条。</small><input type="number" min="0" max="10" v-model.number="$root.draft.threads.logs_in_planning"></label>
            <label><span>档案总字数上限</span><small>单条档案最多多少字；默认 2000。</small><input type="number" min="100" max="8000" step="100" v-model.number="$root.draft.threads.dossier_chars"></label>
          </div>
        </div>
        <div class="settings-subsection">
          <h3>执行与聊天</h3>
          <div class="form-grid">
            <label><span>执行时档案摘要字数</span><small>只给关联小项的那条；默认 300。</small><input type="number" min="50" max="2000" step="50" v-model.number="$root.draft.threads.execution_excerpt_chars"></label>
            <label><span>执行时打卡条数</span><small>默认 2 条。</small><input type="number" min="0" max="10" v-model.number="$root.draft.threads.execution_logs"></label>
            <label><span>聊天展示条数</span><small>普通聊天 top N；默认 5。</small><input type="number" min="1" max="8" v-model.number="$root.draft.threads.chat_limit"></label>
            <label><span>聊天块字符上限</span><small>默认 600；超出时减少条目。</small><input type="number" min="100" max="2000" step="50" v-model.number="$root.draft.threads.chat_chars"></label>
            <label><span>停滞提醒天数</span><small>多少天没动在聊天里标为需要留意；默认 5 天。只提示，不拒绝。</small><input type="number" min="1" max="365" v-model.number="$root.draft.threads.stale_days"></label>
            <label><span>打卡正文字数</span><small>单次打卡最多多少字；默认 500。</small><input type="number" min="20" max="2000" step="20" v-model.number="$root.draft.threads.log_chars"></label>
            <label><span>下一步字数</span><small>默认 200。</small><input type="number" min="20" max="1000" step="20" v-model.number="$root.draft.threads.next_step_chars"></label>
          </div>
        </div>
        <p class="field-hint">为什么默认这样：强制回应默认开，因为长期目标最容易被每天重排时忘掉，而一句表态成本很低；强制打卡默认关，因为执行回合不一定调用工具，强制会让日常行动变成形式主义；自动打卡默认关，因为“执行了 X”没有信息量，让 bot 写“做到哪、卡在哪”更有用。</p>
      </section>
      <section v-if="$root.settingsTab === 'time'" class="settings-section">
        <span class="eyebrow">时间与夜间</span><h2>执行、打扰与覆盖，分别决定</h2>
        <p class="field-hint">跨午夜时段可直接填写，例如 23:00:00 至 07:00:00。三类时段含义不同，请按说明设置；时间支持到秒。</p>
        <div v-for="group in [['blocked_execution_windows','禁止执行时段','任何日程都不会在此唤醒'],['quiet_delivery_windows','安静投递时段','允许做梦与思考，但不发可见消息'],['required_coverage_windows','必需覆盖时段','设置时段内的最小/最大项数']]" class="window-group">
          <div class="section-heading"><div><h3>{{ group[1] }}</h3><p>{{ group[2] }}</p></div><button class="soft-button" @click="$root.addWindow(group[0])"><ui-icon name="plus" :size="14" /> 添加</button></div>
          <div v-for="(window, index) in $root.draft[group[0]]" class="window-row">
            <input type="time" step="1" v-model="window.start"><span>至</span><input type="time" step="1" v-model="window.end">
            <template v-if="group[0] === 'required_coverage_windows'"><input type="number" min="0" max="100" v-model.number="window.min_items" title="最小项数"><input type="number" min="0" max="100" v-model.number="window.max_items" title="最大项数"><input placeholder="分类（可选，例如阅读）" v-model="window.category"></template>
            <button class="icon-button danger" @click="$root.draft[group[0]].splice(index, 1)"><ui-icon name="close" :size="14" /></button>
          </div>
        </div>
        <div class="form-grid"><label><span>迟到多久仍可触发（秒）</span><small>推荐 600 秒；设备短暂休眠后仍有机会补触发。</small><input type="number" min="0" v-model.number="$root.draft.recovery_grace_seconds"></label><label><span>生活时区</span><small>决定所有日程使用的当地时钟，推荐跟随系统。</small><select v-model="$root.draft.timezone"><option v-for="zone in $root.timezoneOptions" :key="zone[0]" :value="zone[0]">{{ zone[1] }}</option></select></label></div>
        <div class="review-setting">
          <label class="switch-row"><span>计划中途检查提醒<small>开启后中途检查并调整计划。</small></span><input type="checkbox" v-model="$root.draft.planning_review.enabled"></label>
          <p class="field-hint">默认关闭。开启后向距离下一小项最近的会话提供完整计划与调整引导，不强制修改。</p>
          <div class="form-grid"><label><span>检查间隔（秒）</span><small>多久检查一次；默认 21600 秒（6 小时）。</small><input type="number" min="3600" max="604800" step="1" v-model.number="$root.draft.planning_review.interval_seconds"></label><label><span>触发前最小余量（秒）</span><small>距下一项至少还剩多久才提醒；默认 1800 秒（30 分钟）。</small><input type="number" min="300" max="14400" step="1" v-model.number="$root.draft.planning_review.min_lead_seconds"></label></div>
          <label class="full-field"><span class="prompt-title">检查提示词<button class="text-button" @click="$root.resetPrompt('review')">恢复默认</button></span><small>中途检查时告诉 bot 怎么判断、怎么调整；不懂就保持默认。</small><textarea rows="5" v-model="$root.draft.planning_review.prompt"></textarea></label>
        </div>
      </section>
      <section v-if="$root.settingsTab === 'calendar'" class="settings-section">
        <span class="eyebrow">日历信息</span><h2>哪些日期信息值得让 bot 知道</h2>
        <p class="field-hint">这里分成两组：发送给 bot 只影响模型上下文；前端显示只影响你自己的日历。普通农历初几不会发送给 bot，但可以在前端保留。</p>
        <div class="settings-subsection"><h3>发送给 bot</h3><p class="field-hint">只影响模型看到的日期信息；不确定就全开。普通农历初几默认不发送，以节省提示词。</p><div class="switch-grid">
          <label class="switch-row"><span>法定假期名称<small>发给 bot：例如春节、国庆。</small></span><input type="checkbox" v-model="$root.draft.calendar_context.holiday"></label>
          <label class="switch-row"><span>调休/补班（含名称）<small>发给 bot：调休上班日。</small></span><input type="checkbox" v-model="$root.draft.calendar_context.adjusted_workday"></label>
          <label class="switch-row"><span>节日（含不放假）<small>发给 bot：节日名称。</small></span><input type="checkbox" v-model="$root.draft.calendar_context.festivals"></label>
          <label class="switch-row"><span>节气<small>发给 bot：二十四节气。</small></span><input type="checkbox" v-model="$root.draft.calendar_context.solar_terms"></label>
        </div></div>
        <div class="settings-subsection"><h3>前端日历显示</h3><p class="field-hint">只影响你自己的日历页面，不会发给 bot。关掉只是界面少一行字，不影响日程执行。</p><div class="switch-grid">
          <label class="switch-row"><span>法定假期<small>日历里显示假期。</small></span><input type="checkbox" v-model="$root.draft.calendar_display.holiday"></label>
          <label class="switch-row"><span>调休/补班<small>日历里显示补班。</small></span><input type="checkbox" v-model="$root.draft.calendar_display.adjusted_workday"></label>
          <label class="switch-row"><span>节日<small>日历里显示节日。</small></span><input type="checkbox" v-model="$root.draft.calendar_display.festivals"></label>
          <label class="switch-row"><span>节气<small>日历里显示节气。</small></span><input type="checkbox" v-model="$root.draft.calendar_display.solar_terms"></label>
          <label class="switch-row"><span>普通农历日期<small>日历里显示农历初几。</small></span><input type="checkbox" v-model="$root.draft.calendar_display.lunar_date"></label>
        </div></div>
      </section>
      <section v-if="$root.settingsTab === 'sessions'" class="settings-section">
        <span class="eyebrow">会话权限</span><h2>允许生活在哪些地方发生</h2>
        <p class="field-hint">会话权限是总开关，会同时限制规划和执行两个池。两个池留空时，会自动使用权限范围内的全部会话；不需要把同一批会话再勾一遍。只有想进一步缩小某个池的范围时，才勾选该池；池中已被权限排除的会话不会生效。</p>
        <label class="full-field"><span>名单模式</span><small>黑名单：默认允许全部，只排除勾选会话；白名单：只有勾选的会话能参与。</small><select v-model="$root.draft.session_access.mode"><option value="deny_list">黑名单：默认全部允许</option><option value="allow_list">白名单：仅列表允许</option></select></label>
        <div class="session-picker"><label v-for="session in $root.allSessions" :class="{selected: $root.draft.session_access.sessions.includes(session.sid), missing: session.missing}"><input type="checkbox" :checked="$root.draft.session_access.sessions.includes(session.sid)" @change="$root.toggleAccess(session.sid)"><span>{{ session.title }}</span><small>{{ session.sid }}</small></label></div>
        <div v-for="kind in ['planning', 'execution']" class="pool-editor"><h3>{{ kind === 'planning' ? '规划起始会话池' : '小项执行会话池' }}</h3>
          <label class="full-field"><span>选择策略</span><small>会话池里有多个会话时如何挑一个；不确定选“完全随机”。</small><select v-model="$root.draft[kind + '_pool'].strategy"><option value="pure_random">完全随机</option><option value="no_immediate_repeat">避免连续重复</option><option value="shuffle_bag">一轮内不重复</option><option value="round_robin">顺序轮换</option><option value="weighted_random">加权随机</option></select></label>
          <p class="field-hint">留空 = 自动使用权限范围内的全部会话；勾选后只使用池内会话。权限外或已停用的会话不会生效。</p>
          <div class="session-picker"><label v-for="session in $root.allSessions" :class="{selected: $root.draft[kind + '_pool'].sessions.some(v => (v.sid || v) === session.sid), missing: session.missing}"><input type="checkbox" :checked="$root.draft[kind + '_pool'].sessions.some(v => (v.sid || v) === session.sid)" @change="$root.togglePool(kind, session.sid)"><span>{{ session.title }}</span><small>{{ session.sid }}</small></label></div>
        </div>
      </section>
      <section v-if="$root.settingsTab === 'weather'" class="settings-section">
        <span class="eyebrow">天气与地点</span><h2>真实或虚拟，都能参与生活</h2>
        <p class="field-hint">只想快速体验可选择虚拟气候；需要真实天气时再填写地点。没有注册密钥就优先使用无需账号的服务。</p>
        <div class="form-grid"><label><span>模式</span><small>关闭=不影响生活；真实=用实际天气；虚拟=体验用；真实+虚拟=真实失败时退回虚拟。</small><select v-model="$root.draft.weather.mode"><option value="off">关闭</option><option value="real">真实天气</option><option value="virtual">虚拟气候</option><option value="hybrid">真实 + 虚拟</option></select></label>
          <label><span>天气服务</span><small>不想注册账号就选 Open-Meteo；需要更细数据再换其他服务。</small><select v-model="$root.draft.weather.provider"><option value="open_meteo">Open-Meteo · 无需账号</option><option value="met_norway">MET Norway · 无需账号</option><option value="nws">US NWS · 美国</option><option value="bright_sky">Bright Sky · DWD</option><option value="weatherapi">WeatherAPI · 注册</option><option value="visualcrossing">Visual Crossing · 注册</option><option value="qweather">和风天气 · 注册</option><option value="weatherbit">Weatherbit · 注册</option><option value="openweather">OpenWeather · 注册</option></select></label></div>
        <div class="weather-context-panel">
          <div class="section-heading"><div><h3>天气如何使用</h3><p>当前天气与预报分开；预报只作为参考，不会写成确定事实。</p></div></div>
          <div class="switch-grid">
            <label class="switch-row"><span>普通聊天显示当前天气<small>聊天里带当前天气。</small></span><input type="checkbox" v-model="$root.draft.weather.chat_current"></label>
            <label class="switch-row"><span>普通聊天显示未来预报<small>聊天里带未来几天。</small></span><input type="checkbox" v-model="$root.draft.weather.chat_forecast"></label>
            <label class="switch-row"><span>目标日显示详细分时段<small>规划时显示当天分时天气。</small></span><input type="checkbox" v-model="$root.draft.weather.target_detail"></label>
            <label class="switch-row"><span>比目标更未来的日显示详细分时段<small>显示更远日期的分时天气。</small></span><input type="checkbox" v-model="$root.draft.weather.future_detail"></label>
            <label class="switch-row"><span>小项显示下一时段天气<small>执行小项时带下一时段天气。</small></span><input type="checkbox" v-model="$root.draft.weather.item_next"></label>
          </div>
          <p class="field-hint">普通聊天只给简短天气；“详细分时段”只用于规划/复盘。小项天气只给小项执行时的下一时段，不会额外刷屏。</p>
          <div class="form-grid">
            <label><span>普通聊天预报天数</span><input type="number" min="1" max="7" v-model.number="$root.draft.weather.chat_forecast_days"><small>默认 2 天；关闭未来预报时不会发送。</small></label>
            <label><span>法定假期自动更新间隔（小时）</span><input type="number" min="1" max="168" v-model.number="$root.draft.calendar_refresh_hours"><small>默认 6 小时；后台更新，不阻塞对话。</small></label>
          </div>
          <p class="field-hint">两个“详细”开关只影响规划/复盘的天气：目标日控制 focus.date，比目标更未来的日控制其后的 forecast。普通聊天只给日摘要；小项由自己的开关控制下一时段。</p>
        </div>
        <div v-if="$root.weatherCredentialFields.length" class="credential-panel">
          <div class="section-heading"><div><h3>接入凭据</h3><p>只保存在本机；切换服务不会清空其他服务的已保存信息。</p></div><span class="tag">已加密字段</span></div>
          <div class="form-grid"><label v-for="[field, label] in $root.weatherCredentialFields" :key="field"><span>{{ label }}</span><input type="password" autocomplete="new-password" :value="$root.weatherCredentialDraft[$root.draft.weather.provider]?.[field] || ''" :placeholder="$root.weatherCredentialStatus[$root.draft.weather.provider]?.[field] ? '已保存，留空保留' : '粘贴 API Key'" @input="$root.setWeatherCredential($root.draft.weather.provider, field, $event.target.value)"><small v-if="$root.weatherCredentialStatus[$root.draft.weather.provider]?.[field]">已配置；不清空就继续使用</small></label></div>
        </div>
        <div v-else-if="$root.weatherNeedsContact" class="credential-panel"><div class="section-heading"><div><h3>接入联系标识</h3><p>MET Norway / NWS 要求真实可联系 User-Agent，不能填写随机身份。</p></div></div><label class="full-field"><span>站点或联系邮箱</span><input :value="$root.weatherContactDraft" placeholder="https://your.site 或 you@example.com" @input="$root.setWeatherContact($event.target.value)"><small v-if="$root.weatherCredentialStatus.contact">已保存；留空保留</small></label></div>
        <p v-else class="field-hint">当前服务无需 API Key，保存后会直接使用无需账号的公共接口。</p>
        <div class="location-editor"><input v-model="$root.cityQuery" placeholder="搜索城市，例如 桂林 或 桂林 广西" @keyup.enter="$root.geocode"><button class="soft-button" @click="$root.geocode">查找地点</button></div>
        <div v-if="$root.cityResults.length" class="city-results"><button v-for="city in $root.cityResults" @click="$root.chooseCity(city)"><strong>{{ city.name }}</strong><span class="city-admin">{{ [city.country, city.admin1, city.admin2, city.admin3, city.admin4].filter(Boolean).join(' · ') }}</span><small>{{ city.latitude }}, {{ city.longitude }}</small></button></div>
        <div v-if="$root.currentLocation" class="current-location">当前地点：<strong>{{ $root.currentLocation.name }}</strong><span>{{ $root.currentLocation.latitude }}, {{ $root.currentLocation.longitude }}</span></div>
        <div class="weather-preview-actions" v-if="$root.draft.weather.mode !== 'off'">
          <button class="soft-button" :disabled="$root.weatherPreviewing" @click="$root.weatherPreview">{{ $root.weatherPreviewing ? '正在预览…' : '预览天气' }}</button>
          <small>虚拟模式无需地点；真实天气需要先保存地点。</small>
        </div>
        <div class="form-grid"><label><span>虚拟地点</span><small>只用于文字展示，可以随便写。</small><input v-model="$root.draft.weather.virtual.location"></label><label><span>虚拟气候</span><small>决定虚拟天气的性格；不影响真实天气。</small><select v-model="$root.draft.weather.virtual.climate"><option value="temperate">温带四季</option><option value="island">海岛</option><option value="rainforest">雨林</option><option value="snow">雪原</option><option value="desert">沙漠</option><option value="floating_city">幻想浮空城</option></select></label></div>
        <label class="full-field"><span>虚拟随机种子</span><small>同一个种子只固定“同一个人格 + 同一天”的天气：同一天重进或重算不会变；换一天会继续生成新的天气，不会每天重复同一种。改种子会换整段天气序列。</small><input v-model="$root.draft.weather.virtual.seed"></label>
        <pre v-if="$root.weatherResult" class="weather-preview">{{ $root.weatherResult }}</pre>
      </section>
      <section v-if="$root.settingsTab === 'data'" class="settings-section">
        <span class="eyebrow">数据与诊断</span><h2>可备份、可恢复、可解释</h2>
        <p class="field-hint">导出包含当前人格的计划、状态、体验和模板，不包含任何天气密钥。导入前会先预览并确认。</p>
        <div class="data-actions"><button class="soft-button" @click="$root.exportData">导出当前人格数据</button><label class="soft-button upload-button">导入备份<input type="file" accept="application/json" @change="$root.importData"></label><button class="soft-button" @click="$root.loadDiagnostics">刷新诊断</button></div>
        <p class="field-hint">“导入备份”只恢复当前人格的数据，上传后会先显示预览并要求确认；“刷新诊断”只查看运行状态，不会修改数据。</p>
        <pre v-if="$root.diagnostics" class="diagnostics">{{ JSON.stringify($root.diagnostics, null, 2) }}</pre>
      </section>
      <div class="settings-save"><button class="soft-button" @click="$root.resetAllPrompts()">全部提示词恢复默认</button><button class="primary" :disabled="$root.saving" @click="$root.saveSettings">{{ $root.saving ? '正在生效…' : '保存并热生效' }}</button><span>保存后立即生效；正在执行的日程仍使用启动时规则，新规则用于之后的日程。</span></div>
    </div>
  </div>`,
}

export const ItemEditor = {
  props: ['editor'],
  data() {
    const source = this.editor.item || { interaction: 'auto', execution_probability: 1, schedule: { type: 'exact', at: '09:00' }, target: '' }
    return { form: JSON.parse(JSON.stringify(source)) }
  },
  computed: {
    schedule() {
      if (!this.form.schedule) this.form.schedule = { type: 'exact', at: '09:00' }
      return this.form.schedule
    },
    intervalMin: {
      get() {
        const values = this.schedule.interval_seconds
        if (Array.isArray(values) && values.length === 2) return Number(values[0])
        const legacy = this.schedule.interval_minutes
        if (Array.isArray(legacy) && legacy.length === 2) return Math.round(Number(legacy[0]) * 60)
        return 300
      },
      set(value) { this.setInterval(0, value) },
    },
    intervalMax: {
      get() {
        const values = this.schedule.interval_seconds
        if (Array.isArray(values) && values.length === 2) return Number(values[1])
        const legacy = this.schedule.interval_minutes
        if (Array.isArray(legacy) && legacy.length === 2) return Math.round(Number(legacy[1]) * 60)
        return 1800
      },
      set(value) { this.setInterval(1, value) },
    },
  },
  methods: {
    setInterval(index, value) {
      const values = [Number(this.intervalMin), Number(this.intervalMax)]
      values[index] = Number(value)
      this.schedule.interval_seconds = values
    },
  },
  template: `
  <div class="modal-backdrop" @click.self="$root.closeEditor"><div class="modal-card large">
    <div class="modal-heading"><div><span class="eyebrow">生活小项</span><h2>{{ editor.item ? '调整安排' : '添加安排' }}</h2></div><button class="icon-button" @click="$root.closeEditor"><ui-icon name="close" :size="16" /></button></div>
    <div class="form-grid">
      <label class="wide"><span>标题</span><input v-model="form.title" autofocus></label>
      <label class="wide"><span>为什么安排</span><textarea rows="2" v-model="form.intent"></textarea></label>
      <label class="wide"><span>执行指令</span><textarea rows="4" v-model="form.instruction"></textarea></label>
      <label><span>时间模式</span><select v-model="schedule.type"><option value="exact">精确时间</option><option value="window">随机时间窗</option></select></label>
      <label><span>互动方式</span><select v-model="form.interaction"><option value="auto">自由决定</option><option value="must_message">需要发言</option><option value="silent">安静经历</option></select></label>
      <label v-if="schedule.type === 'exact'"><span>执行时间（可精确到秒）</span><input type="time" step="1" v-model="schedule.at"></label>
      <template v-else><label><span>窗口开始（秒）</span><input type="time" step="1" v-model="schedule.start"></label><label><span>窗口结束（秒）</span><input type="time" step="1" v-model="schedule.end"></label>
        <label><span>出现次数</span><input type="number" min="1" max="100" v-model.number="schedule.occurrences"></label>
        <label><span>窗口子模式</span><select v-model="schedule.window_mode"><option value="single_random">随机一次</option><option value="interval_random">随机间隔</option></select></label></template>
        <template v-if="schedule.window_mode === 'interval_random'"><label><span>最小间隔（秒）</span><input type="number" min="1" step="1" v-model.number="intervalMin"></label><label><span>最大间隔（秒）</span><input type="number" min="1" step="1" v-model.number="intervalMax"></label></template>
      <label><span>执行概率</span><input type="number" min="0" max="1" step="0.05" v-model.number="form.execution_probability"></label>
      <label><span>分类</span><input v-model="form.category" placeholder="例如：阅读、运动"></label>
      <label class="wide"><span>目标会话（留空使用执行池）</span><select v-model="form.target"><option value="">执行会话池自动选择</option><option v-if="form.target && !$root.data.sessions.some(s => s.sid === form.target)" :value="form.target">{{ $root.sessionName(form.target) || '未加载的会话' }} · {{ form.target }}（当前）</option><option v-for="session in $root.data.sessions" :value="session.sid">{{ session.title }} · {{ session.sid }}</option></select></label>
    </div>
    <div class="modal-actions"><button class="soft-button" @click="$root.closeEditor">取消</button><button class="primary" @click="$root.saveItem(form)">保存并校验</button></div>
  </div></div>`,
}

export const DayStateEditor = {
  data() { return { form: JSON.parse(JSON.stringify(this.$root.data.day_state)) } },
  template: `
  <div class="modal-backdrop" @click.self="$root.dayStateEditor = false"><div class="modal-card">
    <div class="modal-heading"><div><span class="eyebrow">当日状态</span><h2>此刻的我</h2></div><button class="icon-button" @click="$root.dayStateEditor = false"><ui-icon name="close" :size="16" /></button></div>
    <label class="full-field"><span>现在的服装</span><input v-model="form.current_appearance"></label>
    <label class="full-field"><span>现在的心情</span><input v-model="form.current_mood"></label>
    <label class="full-field"><span>现在的地点</span><input v-model="form.current_location"></label>
    <label class="full-field"><span>正在做什么</span><input v-model="form.current_activity"></label>
    <label class="full-field"><span>总体思路</span><textarea rows="4" v-model="form.current_note"></textarea></label>
    <div class="modal-actions"><button class="soft-button" @click="$root.dayStateEditor = false">取消</button><button class="primary" @click="$root.saveDayState(form)">更新此刻</button></div>
  </div></div>`,
}

export const DayTypeEditor = {
  props: ['entry'],
  data() {
    const value = this.entry || { id: '', name: '', builtin: false, rules: { weekdays: [], dates: [], date_ranges: [], priority: 100 }, config: { color: '#9b8cff' } }
    const copy = JSON.parse(JSON.stringify(value))
    copy.rules ||= {}
    copy.rules.weekdays = Array.isArray(copy.rules.weekdays) ? copy.rules.weekdays : []
    copy.rules.dates = Array.isArray(copy.rules.dates) ? copy.rules.dates : []
    copy.rules.date_ranges = Array.isArray(copy.rules.date_ranges) ? copy.rules.date_ranges : []
    copy.rules.priority = Number.isInteger(copy.rules.priority) ? copy.rules.priority : 100
    copy._dates = copy.rules.dates.join(', ')
    copy._ranges = copy.rules.date_ranges.map((range) => `${range.start || ''}~${range.end || ''}`).join(', ')
    copy.config ||= { color: '#9b8cff' }
    copy.config.overrides ||= {}
    copy.config.overrides.execution_pool ||= { strategy: 'pure_random', sessions: [] }
    return { form: copy }
  },
  template: `
  <div class="modal-backdrop" @click.self="$root.dayTypeEditor = null"><div class="modal-card">
    <div class="modal-heading"><div><span class="eyebrow">日型</span><h2>{{ entry ? '编辑日型' : '创建日型' }}</h2></div><button class="icon-button" @click="$root.dayTypeEditor = null"><ui-icon name="close" :size="16" /></button></div>
    <label class="full-field"><span>名称</span><input v-model="form.name" placeholder="考试周 / 旅行日 / 雨天宅家"></label>
    <label class="full-field"><span>日型标识（可选，创建后不可修改）</span><input v-model="form.id" :disabled="!!entry" placeholder="留空自动生成，例如 exam_week"><small class="field-hint">仅用于数据库和链接，bot 不会读取；留空会自动生成。只能用英文、数字、下划线、短横线。</small></label>
    <label class="full-field"><span>主题色</span><input type="color" v-model="form.config.color"></label>
    <label class="full-field"><span>此日型追加规划提示词（留空只使用全局）</span><textarea rows="3" v-model="form.config.overrides.planning_prompt"></textarea></label>
    <label class="full-field"><span>此日型追加执行提示词（留空只使用全局）</span><textarea rows="3" v-model="form.config.overrides.execution_prompt"></textarea></label>
    <div class="form-grid" style="margin-top: 17px">
      <label><span>每日最少安排</span><small>太少会显得空，推荐 2 到 4 项。</small><input type="number" min="0" max="500" v-model.number="form.config.overrides.min_items"></label>
      <label><span>每日最多安排</span><small>避免日程过密，推荐 8 到 12 项。</small><input type="number" min="1" max="500" v-model.number="form.config.overrides.max_items"></label>
    </div>
    <label class="full-field"><span>此日型执行会话策略</span><select v-model="form.config.overrides.execution_pool.strategy"><option value="pure_random">完全随机</option><option value="no_immediate_repeat">避免连续重复</option><option value="shuffle_bag">一轮内不重复</option><option value="round_robin">顺序轮换</option></select></label>
    <div class="weekday-picker"><span>周重复</span><label v-for="(name, index) in ['一','二','三','四','五','六','日']"><input type="checkbox" :checked="form.rules.weekdays.includes(index)" @change="$root.toggleDayTypeWeekday(form, index)">周{{ name }}</label></div>
    <label class="full-field"><span>指定日期（逗号分隔）</span><textarea rows="2" v-model="form._dates" placeholder="2026-11-20, 2026-12-01"></textarea></label>
    <label class="full-field"><span>日期范围（每项 start~end，逗号或换行分隔）</span><textarea rows="2" v-model="form._ranges" placeholder="2026-02-01~2026-02-07, 2026-10-01~2026-10-07"></textarea></label>
    <label class="full-field"><span>规则优先级（数字越小越优先）</span><input type="number" v-model.number="form.rules.priority"><small class="field-hint">精确日期比日期范围优先，日期范围比周重复优先；同一天多个日型会按这里的顺序拼接提示词。</small></label>
    <div class="modal-actions"><button class="soft-button" @click="$root.dayTypeEditor = null">取消</button><button class="primary" @click="$root.saveDayType(form)">保存日型</button></div>
  </div></div>`,
}
