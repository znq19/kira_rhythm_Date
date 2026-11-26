import { fmt } from './store.js?v=1.3.7'
import { buildPetChatter, buildPetInteraction } from './pet-talk.js?v=1.3.7'

const VOICE = {
  tomato: {
    event: ['要出发了', '时间到了'],
    crouch: ['蹲低一点，我也安全', '从下面看世界'],
    drink: ['番茄汁也不错', '先喝一口'],
    idle: ['我在这里。', '今天也不想动……'],
    look: ['那边红红的，是番茄吗？', '城市好吵，但还可以。'],
    stretch: ['伸个懒腰，我不会掉。', '骨头在响。'],
    dance: ['我也会跳舞吗？', '只跳一下。'],
    phone: ['红红的图标，像番茄。', '消息好多，不想回。'],
    sleep: ['梦里有番茄城堡……先睡一下。', '三分钟，再睡三分钟。'],
    read: ['这一页有番茄的味道。', '读完就睡。'],
    eat: ['番茄酱是我的。', '这个可以蘸番茄吗？'],
    work: ['好麻烦……但会做完。', '别催，我在想。'],
    music: ['耳机里的歌很轻。', '我也在听。'],
    run: ['要出发了吗？', '我跟上。'],
    pat: ['摸头可以，别把我拿走。', '再摸一下也可以。'],
    held: ['放我下来，我要掉了。', '我抓着你的袖子。'],
    thrown: ['不要转圈。', '我会飞吗？'],
    land: ['我安全着陆。', '脚先落地。'],
    dizzy: ['我在晃。', '世界转得慢一点。'],
    default: ['我在这里。', '……嗯。'],
  },
  mint: {
    event: ['该出门了', '我准备好啦'],
    crouch: ['猫蹲好了', '尾巴收起来'],
    drink: ['气泡水在冒泡', '这杯很清凉'],
    idle: ['今天也精神满满。', '尾巴自己动了。'],
    look: ['海风的方向在那边。', '那家店在卖什么？'],
    stretch: ['喵——伸展开。', '尾巴也要伸。'],
    dance: ['这个节拍不错。', '跟着跳两下。'],
    phone: ['有人发了新消息。', '这张图好可爱。'],
    sleep: ['尾巴借你当抱枕。', '睡一小会儿。'],
    read: ['这本讲海边的故事。', '看完就伸个懒腰。'],
    eat: ['苏打气泡在跳。', '这个甜甜的。'],
    work: ['先把这件事做好。', '做完就去玩。'],
    music: ['耳机分你一只。', '这个歌单很适合海边。'],
    run: ['要追上去吗？', '我跑得很快。'],
    pat: ['耳朵不能一直摸……', '再摸一下。'],
    held: ['我的尾巴！', '轻一点。'],
    thrown: ['好高。', '我会不会飞起来？'],
    land: ['稳稳落地。', '猫是这样落地的。'],
    dizzy: ['世界在打转。', '尾巴找不到方向了。'],
    default: ['薄荷在这里。', '喵。'],
  },
  garnet: {
    event: ['时间到了', '先走一步'],
    crouch: ['低一点，风小', '别管我'],
    drink: ['咖啡不加糖', '喝一口再继续'],
    idle: ['风有点大。', '别站太近。'],
    look: ['云压得很低。', '那边有人。'],
    stretch: ['肩膀有点僵。', '活动一下。'],
    dance: ['不跳。', '……只一下。'],
    phone: ['等我回个消息。', '看到一点有用的。'],
    sleep: ['闭目养神。', '别吵。'],
    read: ['这页写得还行。', '再翻一页。'],
    eat: ['先吃饭。', '别浪费。'],
    work: ['先把事情做完。', '专注一会儿。'],
    music: ['这首歌可以。', '音量小一点。'],
    run: ['我先过去。', '别掉队。'],
    pat: ['只准一下。', '手拿开。'],
    held: ['放我下来。', '别拎衣领。'],
    thrown: ['别扔。', '我鞋跟很高。'],
    land: ['落地了。', '下次别这样。'],
    dizzy: ['……有点晕。', '站稳。'],
    default: ['我在。', '有事说。'],
  },
  xun: {
    event: ['该动身了', '客人，失陪'],
    crouch: ['蹲下来看看花', '膝盖还好'],
    drink: ['茶要趁热', '先润润嗓子'],
    idle: ['店面今天照常营业。', '茶还热着。'],
    look: ['这条街，我熟。', '灯笼亮得早。'],
    stretch: ['年纪大了，要活动。', '肩颈。'],
    dance: ['年轻时倒是常跳。', '看心情。'],
    phone: ['客人来消息了。', '等我回一下。'],
    sleep: ['打烊前小睡。', '别把客人吵醒。'],
    read: ['旧账本，翻一翻。', '这页记着旧城。'],
    eat: ['坐下，先吃点热的。', '汤要趁热。'],
    work: ['今天账还没对。', '做完就收摊。'],
    music: ['留声机还能转。', '这首听过。'],
    run: ['要出门？', '路上小心。'],
    pat: ['老板娘可不是随便摸的。', '……下不为例。'],
    held: ['放我下来。', '衣服会皱。'],
    thrown: ['别闹。', '会摔。'],
    land: ['站稳了。', '毛手毛脚。'],
    dizzy: ['老了，经不起转。', '缓一缓。'],
    default: ['客人，慢慢看。', '我在店里。'],
  },
  hathor: {
    event: ['目标时间到', '行动开始'],
    crouch: ['低姿态观察', '检查脚下'],
    drink: ['咖啡，提神', '补给完成'],
    idle: ['今天也照常配送。', '路线确认。'],
    look: ['目标在那边。', '城市的路我熟。'],
    stretch: ['翅膀有点僵。', '活动一下。'],
    dance: ['不跳，影响配送。', '……节拍还行。'],
    phone: ['新单。', '等我确认地址。'],
    sleep: ['闭眼十分钟。', '别超时。'],
    read: ['配送条例。', '这页有必要看。'],
    eat: ['先补充能量。', '咖啡就好。'],
    work: ['按路线执行。', '目标出现。'],
    music: ['头盔里放点歌。', '这首适合夜路。'],
    run: ['目标出现，开始行动。', '我先过去，你跟上。'],
    pat: ['翅膀不可以乱碰。', '只准一下。'],
    held: ['放我下来，还有单。', '别抓翅膀。'],
    thrown: ['这不安全。', '我在赶时间。'],
    land: ['落地稳定。', '下次别扔。'],
    dizzy: ['路线在转。', '重新校准。'],
    default: ['天使，随时出发。', '收到。'],
  },
}


const VOICE_TAILS = {
  tomato: ['我看完了', '梦里的番茄城堡今天也开着', '番茄酱要留一点', '再等一下下', '我在这里', '今天慢慢来'],
  mint: ['尾巴说好', '海风刚好', '猫耳朵听见了', '气泡还在跳', '今天也精神满满', '再来一次'],
  garnet: ['风有点大', '就这样', '我在听', '别靠太近', '这件事有意思', '稳住'],
  xun: ['茶还热着', '店里照常', '慢慢来', '我听着呢', '雨还没停', '客人先请'],
  hathor: ['路线确认', '收到', '时间刚好', '目标不变', '注意安全', '我在赶路'],
}

const RANDOM_ACTION_WEIGHTS = [
  ['idle', 18], ['look', 12], ['stretch', 10], ['dance', 10],
  ['crouch', 16], ['phone', 10], ['jump', 18],
]

const ACTIONS = {
  idle: '发呆', jump: '运动中', read: '看书', eat: '吃点东西', drink: '喝点东西', phone: '看手机', crouch: '蹲一会儿',
  work: '专注', music: '听歌', sleep: '打盹',
  run: '赶路', happy: '开心', stretch: '伸懒腰', dance: '跳舞', look: '看风景',
  held: '被拿起', thrown: '被丢起来', land: '落地', dizzy: '晕乎乎',
}

export const PetCompanion = {
  props: {
    variant: { type: String, default: 'mono' },
    nextItem: { type: Object, default: null },
    weather: { type: String, default: 'off' },
    phase: { type: String, default: 'day' },
    event: { type: String, default: 'quiet' },
    activity: { type: String, default: '' },
    plan: { type: Object, default: null },
    sessions: { type: Array, default: () => [] },
    now: { type: Number, default: () => Date.now() / 1000 },
    hour: { type: Number, default: () => new Date().getHours() },
    poses: { type: Object, default: () => ({}) },
    large: { type: Boolean, default: false },
  },
  data() {
    return {
      x: 77,
      facing: -1,
      action: 'idle',
      speech: '',
      speechUntil: 0,
      speechKind: 'none',
      speechParts: [],
      chatterTimer: null,
      chatterPreferred: '',
      chatterCooldownUntil: 0,
      lastChatterKey: '',
      lastChatterTemplateKey: '',
      lastInteractionKey: '',
      lastInteractionTemplateKey: '',
      recentChatterKeys: [],
      recentInteractionKeys: [],
      panel: false,
      hearts: 0,
      idleTimer: null,
      speechTimer: null,
      stickyAction: false,
      stickyUntil: 0,
      interactionLockUntil: 0,
      jumpLeft: 0,
      jumpTimer: null,
      jumpSchedule: false,
      dragging: false,
      dragStart: 0,
      dragStartY: 0,
      dragOrigin: 77,
      dragLift: 0,
      lift: 0,
      moved: false,
      holdTimer: null,
      suppressClick: false,
      actionLockUntil: 0,
      labelVisible: true,
      labelHint: true,
      careVisible: true,
      labelTimer: null,
      careTimer: null,
      sleepBias: 0,
      sleepSuppressedUntil: 0,
    }
  },
  computed: {
    petStyle() { return { left: this.x + '%', '--pet-lift': this.lift + 'px' } },
    currentSprite() {
      if (this.action === 'sleep') return this.poses.sleep || this.poses.idle
      if (this.action === 'read') return this.poses.read || this.poses.sit || this.poses.idle
      if (this.action === 'eat') return this.poses.eat || this.poses.sit || this.poses.idle
      if (this.action === 'drink') return this.poses.drink || this.poses.sit || this.poses.idle
      if (this.action === 'phone') return this.poses.phone || this.poses.idle
      if (this.action === 'look') return this.poses.look || this.poses.idle
      if (this.action === 'stretch') return this.poses.stretch || this.poses.idle
      if (this.action === 'dance') return this.poses.dance || this.poses.idle
      if (this.action === 'crouch') return this.poses.crouch || this.poses.idle
      return this.poses.idle
    },
    label() { return ACTIONS[this.action] || '发呆' },
    isBook() { return this.action === 'read' },
    isPhone() { return this.action === 'phone' },
    isCup() { return false },
    isWork() { return this.action === 'work' },
    isMusic() { return this.action === 'music' },
    isSleep() { return this.action === 'sleep' },
    petClass() {
      return `pet-${this.variant}`
    },
    planItems() {
      return (this.plan?.blocks || []).flatMap((block) => block.items || []).filter((item) => item.state !== 'deleted')
    },
    planTotal() { return this.planItems.filter((item) => item.state !== 'cancelled').length },
    planDone() { return this.planItems.filter((item) => ['triggered', 'triggered_silent'].includes(item.state)).length },
    planProgress() { return this.planTotal ? Math.round(this.planDone / this.planTotal * 100) : 0 },
    nextClock() { return this.nextItem ? fmt.time(this.nextItem.scheduled_at) : '—' },
    nextIn() { return this.nextItem ? fmt.countdown(this.nextItem.scheduled_at, this.now) : '今天留白' },
    statusLine() {
      if (this.event === 'imminent') return '下一件事快到了'
      if (this.weather === 'rain') return '正在听雨'
      if (this.weather === 'snow') return '雪落得很轻'
      if (this.phase === 'night') return '夜色刚好'
      return '今天也在陪你'
    },
  },
  watch: {
    nextItem() { this.chooseAction(true) },
    hour() { this.chooseAction(true) },
    weather(value) { if (value !== 'off') this.queueChatter(1400, 'weather') },
    phase() { this.chooseAction(false) },
    event() { this.queueChatter(1800) },
    activity() { this.chooseAction(true); this.queueChatter(1600) },
  },
  mounted() {
    if (window.innerWidth >= 1100) this.x = 90
    this.showLabel(true)
    this.showCare()
    this.chooseAction(true)
    this.idleTimer = setInterval(() => this.chooseAction(false), 7000)
    this.scheduleChatter(5200)
  },
  beforeUnmount() {
    clearInterval(this.idleTimer)
    clearTimeout(this.jumpTimer)
    clearTimeout(this.speechTimer)
    clearTimeout(this.chatterTimer)
    clearTimeout(this.labelTimer)
    clearTimeout(this.careTimer)
  },
  methods: {
    isLateNight() {
      return this.hour >= 23 || this.hour < 6
    },
    nightSleepEligible() {
      if (!this.isLateNight()) return false
      return !this.planItems.some((item) => ['scheduled', 'queued', 'running'].includes(item.state))
    },
    showLabel(hint = false, ms = 3000) {
      this.labelVisible = true
      this.labelHint = hint
      clearTimeout(this.labelTimer)
      this.labelTimer = setTimeout(() => { this.labelVisible = false }, ms)
    },
    showCare(ms = 3000) {
      this.careVisible = true
      clearTimeout(this.careTimer)
      this.careTimer = setTimeout(() => { this.careVisible = false }, ms)
    },
    setSpeech(input, ms = 4200, kind = 'action') {
      const parts = Array.isArray(input)
        ? input.filter((part) => part && String(part.text || '').trim())
        : (input ? [{ text: String(input), tone: 'plain' }] : [])
      if (!parts.length) return
      this.speechParts = parts
      this.speech = parts.map((part) => part.text).join('')
      this.speechUntil = Date.now() + ms
      this.speechKind = kind
      clearTimeout(this.speechTimer)
      this.speechTimer = setTimeout(() => this.clearSpeech(), ms)
    },
    clearSpeech() {
      this.speech = ''
      this.speechParts = []
      this.speechKind = 'none'
      this.speechUntil = 0
      clearTimeout(this.speechTimer)
    },
    rememberSpeechKey(kind, key) {
      const list = kind === 'chatter' ? this.recentChatterKeys : this.recentInteractionKeys
      if (!key || list.includes(key)) return
      list.push(key)
      if (list.length > 6) list.shift()
    },
    scheduleChatter(delay = null) {
      clearTimeout(this.chatterTimer)
      const wait = delay == null
        ? 9000 + Math.random() * 9000
        : Math.max(400, delay)
      this.chatterTimer = setTimeout(() => this.sayChatter(), wait)
    },
    queueChatter(delay = 1200, preferred = '') {
      this.chatterPreferred = preferred
      this.chatterCooldownUntil = Math.min(this.chatterCooldownUntil, Date.now())
      this.scheduleChatter(delay)
    },
    sayChatter() {
      if (this.dragging || this.panel || (typeof document !== 'undefined' && document.hidden)) {
        this.scheduleChatter(4000)
        return
      }
      if (Date.now() < this.speechUntil) {
        this.scheduleChatter(3200)
        return
      }
      if (Date.now() < this.chatterCooldownUntil) {
        this.scheduleChatter(4200)
        return
      }
      const preferred = this.chatterPreferred
      this.chatterPreferred = ''
      let payload = null
      try {
        payload = buildPetChatter({
          variant: this.variant,
          plan: this.plan,
          nextItem: this.nextItem,
          sessions: this.sessions,
          weather: this.weather,
          phase: this.phase,
          event: this.event,
          activity: this.activity,
          now: this.now,
          lastKey: this.lastChatterTemplateKey,
          preferredTopic: preferred,
          avoidKeys: this.recentChatterKeys,
        })
      } catch (_) {
        this.scheduleChatter(6000)
        return
      }
      if (payload?.parts?.length) {
        this.setSpeech(payload.parts, 5600, 'chatter')
        this.lastChatterKey = payload.key
        this.lastChatterTemplateKey = payload.templateKey || ''
        this.rememberSpeechKey('chatter', payload.templateKey || payload.key)
        this.chatterCooldownUntil = Date.now() + 5200
      }
      this.scheduleChatter()
    },
    keywordAction() {
      const running = this.planItems.find((item) => item.state === 'running')
      const item = running || this.nextItem || {}
      const text = `${item.title || ''} ${item.intent || ''} ${this.activity || ''}`
      if (/睡|梦|午休|休息/.test(text)) return 'sleep'
      if (/书|阅读|读|学习|复习/.test(text)) return 'read'
      if (/喝|饮|咖啡|茶|奶茶|苏打|果汁/.test(text)) return 'drink'
      if (/吃|餐|食|甜点|饭|面条|拉面|意面|面食|泡面|披萨|三明治|能量棒/.test(text)) return 'eat'
      if (/工作|专注|写|整理|开会|做事|查资料|资料|代码|编程|研究|开发|项目|排查|修复/.test(text)) return 'work'
      if (/音乐|听歌|耳机/.test(text)) return 'music'
      if (/散步|出门|走|逛|运动|活动/.test(text)) return 'jump'
      return ''
    },
    randomPool() {
      const pool = [...RANDOM_ACTION_WEIGHTS]
      let hint = this.keywordAction()
      if (hint === 'sleep' && Date.now() < this.sleepSuppressedUntil) hint = ''
      if (hint && hint !== 'jump') pool.push([hint, hint === 'sleep' ? 16 : 12])
      if (this.event === 'imminent') pool.push(['look', 8])
      if (this.event === 'live') pool.push(['work', 8])
      if (this.nightSleepEligible() && Date.now() >= this.sleepSuppressedUntil) {
        pool.push(['sleep', 14 + this.sleepBias * 5])
      }
      return pool
    },
    wakeFromSleep() {
      if (this.action === 'sleep') {
        this.action = 'idle'
        this.stickyAction = false
        this.stickyUntil = 0
      }
      this.sleepSuppressedUntil = Date.now() + 12000
      this.sleepBias = Math.min(6, this.sleepBias + 1)
    },
    chooseAction(force) {
      if (this.dragging || Date.now() < this.actionLockUntil) return
      if (this.stickyAction && !force && Date.now() < this.stickyUntil) return
      if (!force && Date.now() < this.interactionLockUntil) return
      if (force && this.event === 'imminent') {
        this.setAction('look', this.speechFor('event'), false)
        return
      }
      if (force && this.event === 'live') {
        this.setAction('work', this.speechFor('event'), false)
        return
      }
      let keyword = this.keywordAction()
      if (keyword === 'sleep' && Date.now() < this.sleepSuppressedUntil) keyword = ''
      if (force && keyword) {
        if (keyword === 'jump') { this.startJump('schedule'); return }
        this.setAction(keyword, this.speechFor(keyword), true)
        return
      }
      if (force && this.nightSleepEligible() && Date.now() >= this.sleepSuppressedUntil) {
        this.sleepBias = 0
        this.setAction('sleep', this.speechFor('sleep'), true)
        return
      }
      const idle = this.pickIdle(this.randomPool())
      if (idle === 'jump') { this.startJump(); return }
      if (idle === 'sleep') this.sleepBias = 0
      const contextual = ['read', 'drink', 'eat', 'work', 'music', 'sleep'].includes(idle)
      if (force || contextual) this.setAction(idle, this.speechFor(idle), idle === 'sleep')
      else { this.action = idle; this.stickyAction = false }
    },
    pickIdle(pool = RANDOM_ACTION_WEIGHTS) {
      const total = pool.reduce((sum, item) => sum + item[1], 0)
      let roll = Math.random() * total
      for (const [action, weight] of pool) {
        roll -= weight
        if (roll <= 0) return action
      }
      return 'idle'
    },
    setAction(action, text, sticky = false) {
      const changed = this.action !== action
      this.action = action
      this.stickyAction = sticky
      this.stickyUntil = sticky ? Date.now() + (action === 'sleep' ? 12000 : 15000) : 0
      if (action !== 'jump') { clearTimeout(this.jumpTimer); this.jumpTimer = null; this.jumpLeft = 0 }
      if (changed) { this.showLabel(true); if (text) this.setSpeech(text) }
    },
    speechFor(action) {
      const base = VOICE[this.variant]?.[action] || VOICE[this.variant]?.default || ['我在']
      const tails = VOICE_TAILS[this.variant] || []
      const variants = [...base]
      for (let i = 0; i < Math.min(6, tails.length); i += 1) {
        variants.push(`${base[i % base.length].replace(/[。！？]$/, '')}，${tails[i]}`)
      }
      const line = variants[Math.floor(Math.random() * variants.length)]
      return line.replace(/。$/, '')
    },
    startJump(source = 'random') {
      if (this.dragging || this.panel || this.action === 'jump') return
      this.stickyAction = source === 'schedule'
      this.jumpSchedule = source === 'schedule'
      this.jumpLeft = 3 + Math.floor(Math.random() * 4)
      this.action = 'jump'
      this.showLabel(false)
      this.setSpeech(this.speechFor('jump'))
      this.jumpHop()
    },
    jumpHop() {
      if (this.action !== 'jump') return
      const min = window.innerWidth < 700 ? 12 : 8
      const max = window.innerWidth < 700 ? 78 : 90
      this.x = Math.max(min, Math.min(max, this.x + (Math.random() * 16 - 8)))
      this.lift = 35 + Math.random() * 90
      clearTimeout(this.jumpTimer)
      this.jumpTimer = setTimeout(() => {
        if (this.action !== 'jump') return
        this.lift = 8 + Math.random() * 28
        this.jumpLeft -= 1
        if (this.jumpLeft > 0) this.jumpHop()
        else { this.action = 'idle'; this.stickyAction = false; this.stickyUntil = 0; this.jumpSchedule = false }
      }, 460)
    },
    interactionFor(kind) {
      try {
        return buildPetInteraction({
          kind,
          variant: this.variant,
          plan: this.plan,
          nextItem: this.nextItem,
          sessions: this.sessions,
          weather: this.weather,
          phase: this.phase,
          activity: this.activity,
          lastKey: this.lastInteractionTemplateKey,
          avoidKeys: this.recentInteractionKeys,
        })
      } catch (_) {
        return null
      }
    },
    pat() {
      if (this.dragging || this.suppressClick) return
      this.wakeFromSleep()
      clearTimeout(this.jumpTimer); this.jumpTimer = null; this.jumpLeft = 0
      this.panel = false
      this.showLabel(false)
      this.showCare()
      this.hearts = 4
      this.action = 'happy'
      this.stickyAction = false
      this.interactionLockUntil = 0
      const interaction = this.interactionFor('pat')
      if (interaction?.parts?.length) {
        this.setSpeech(interaction.parts, 5600, 'pat')
        this.lastInteractionKey = interaction.key
        this.lastInteractionTemplateKey = interaction.templateKey || ''
        this.rememberSpeechKey('interaction', interaction.templateKey || interaction.key)
      } else {
        this.setSpeech(this.speechFor('pat'))
      }
      setTimeout(() => { this.hearts = 0 }, 900)
      setTimeout(() => { if (this.action === 'happy') this.action = 'idle' }, 1400)
    },
    feed() {
      this.wakeFromSleep()
      this.setAction('eat', this.speechFor('eat'), false)
      this.interactionLockUntil = Date.now() + 4200
      this.panel = false
    },
    giveDrink() {
      this.wakeFromSleep()
      this.setAction('drink', this.speechFor('drink'), false)
      this.interactionLockUntil = Date.now() + 4200
      this.panel = false
    },
    talk() {
      this.wakeFromSleep()
      this.setAction('phone', '', false)
      this.interactionLockUntil = Date.now() + 5200
      this.panel = false
      const interaction = this.interactionFor('talk')
      if (interaction?.parts?.length) {
        this.setSpeech(interaction.parts, 6800, 'talk')
        this.lastInteractionKey = interaction.key
        this.lastInteractionTemplateKey = interaction.templateKey || ''
        this.rememberSpeechKey('interaction', interaction.templateKey || interaction.key)
      } else {
        this.setSpeech(this.speechFor('phone'))
      }
    },
    rest() {
      this.setAction('sleep', this.speechFor('sleep'), true)
      this.interactionLockUntil = 0
      this.panel = false
    },
    startDrag(event) {
      this.wakeFromSleep()
      clearTimeout(this.jumpTimer); this.jumpTimer = null; this.jumpLeft = 0
      this.stickyAction = false
      this.interactionLockUntil = 0
      const shell = this.$el.closest('.app-shell') || this.$el.parentElement
      const rect = shell.getBoundingClientRect()
      const startedAt = performance.now()
      this.dragging = false
      this.moved = false
      this.dragStart = event.clientX
      this.dragStartY = event.clientY
      this.dragOrigin = this.x
      this.dragLift = this.lift
      clearTimeout(this.holdTimer)
      this.holdTimer = setTimeout(() => {
        if (!this.moved) {
          this.dragging = true
          this.setAction('held', this.speechFor('held'))
        }
      }, 220)
      const move = (e) => {
        const dx = e.clientX - this.dragStart
        const dy = e.clientY - this.dragStartY
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this.moved = true
        if (!this.moved) return
        this.dragging = true
        const maxX = window.innerWidth < 700 ? 79 : 90
        this.x = Math.max(7, Math.min(maxX, this.dragOrigin + dx / rect.width * 100))
        this.lift = Math.max(0, Math.min(300, this.dragLift - dy))
        this.facing = dx > 0 ? 1 : -1
        if (this.lift > 8) this.setAction('held', this.speechFor('held'))
      }
      const up = () => {
        clearTimeout(this.holdTimer)
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        const heldLong = performance.now() - startedAt > 220
        const flew = this.lift > 36
        this.dragging = false
        if (flew) {
          this.suppressClick = true
          this.actionLockUntil = Date.now() + 2400
          this.setAction('thrown', this.speechFor('thrown'))
          setTimeout(() => { this.lift = 70 + Math.random() * 180; this.setAction('land', this.speechFor('land')) }, 420)
          setTimeout(() => { this.setAction('dizzy', this.speechFor('dizzy')) }, 820)
          setTimeout(() => { if (this.action === 'dizzy') this.action = 'idle' }, 2100)
        } else if (this.moved || heldLong) {
          this.suppressClick = true
          this.lift = this.lift > 6 ? 50 + Math.random() * 120 : 0
          this.setAction('land', this.speechFor('land'))
          setTimeout(() => { if (this.action === 'land') this.action = 'idle' }, 900)
        } else {
          this.lift = 0
        }
        this.showCare(3000)
        setTimeout(() => { this.suppressClick = false }, 260)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    openPanel() {
      if (!this.panel && this.action === 'jump') {
        clearTimeout(this.jumpTimer); this.jumpTimer = null; this.jumpLeft = 0
        this.action = 'idle'; this.stickyAction = false; this.lift = 8 + Math.random() * 28
      }
      this.panel = !this.panel
      this.showCare()
      if (this.panel) { this.showLabel(false); this.clearSpeech() }
    },
  },
  template: `
  <div class="pet-companion" :class="[petClass, 'pet-action-' + action, { 'pet-large': large, 'pet-panel-open': panel, 'pet-left': x < 45, 'pet-dragging': dragging, 'pet-facing-left': facing < 0 }]" :style="petStyle">
    <transition name="pet-bubble">
      <div v-if="speechParts.length" class="pet-bubble" @click="openPanel"><span v-for="(part, index) in speechParts" :key="index" :class="['talk-seg', 'talk-' + part.tone]">{{ part.text }}</span><i></i></div>
    </transition>
    <div class="pet-hearts" v-if="hearts"><span v-for="n in hearts" :key="n" :style="{left:(n*6-6)+'px', animationDelay:(n*.07)+'s'}"></span></div>
    <button class="pet-hit" @click="pat" @pointerdown="startDrag" aria-label="摸摸像素伙伴">
      <span class="pet-shadow"></span>
      <span class="pet-figure">
        <img class="pet-sprite" :src="currentSprite" alt="">
        <span class="pet-prop-cup" v-if="isCup"></span>
        <span class="pet-prop-laptop" v-if="isWork"><i></i></span>
        <span class="pet-notes" v-if="isMusic"><b></b><b></b></span>
        <span class="pet-zzz" v-if="isSleep"><b>Z</b><b>z</b></span>
      </span>
    </button>
    <span v-if="labelVisible" class="pet-shadow-label">{{ label }}<template v-if="labelHint"> · 可拖动</template></span>
    <button v-if="careVisible || panel" class="pet-care-toggle" @click="openPanel" :aria-expanded="panel" aria-label="打开陪伴面板"><span></span><span></span></button>
    <transition name="pet-panel">
      <div v-if="panel" class="pet-panel">
        <div class="pet-panel-head"><span>陪伴模式</span><button @click="panel = false" aria-label="关闭">×</button></div>
        <strong>{{ statusLine }}</strong>
        <p>点「聊天」或「摸摸」，她会说出当前事项、时间、内容与目标会话；直接摸小人也会回应。按住还能拖拽、提起或丢下。</p>
        <div class="pet-schedule">
          <div class="pet-schedule-head"><span>今日节奏</span><b>{{ planDone }}/{{ planTotal }}</b></div>
          <i class="pet-progress"><b :style="{width: planProgress + '%'}"></b></i>
          <div class="pet-schedule-stats"><span>已完成 {{ planDone }}</span><span>待发生 {{ planTotal - planDone }}</span></div>
          <div class="pet-next-card" v-if="nextItem"><span>下一项</span><strong>{{ nextItem.title }}</strong><div><b>{{ nextClock }}</b><small>{{ nextIn }}</small></div></div>
          <div class="pet-next-card empty" v-else><span>下一项</span><strong>今天留白</strong><small>没有需要赶的时间</small></div>
        </div>
        <div class="pet-buttons"><button @click="pat">摸摸</button><button @click="feed">投喂</button><button @click="giveDrink">饮品</button><button @click="talk">聊天</button><button @click="rest">休息</button></div>
      </div>
    </transition>
  </div>`,
}
