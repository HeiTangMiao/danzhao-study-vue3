/**
 * practice Store —— 练习会话状态（P6，prd-mobile §5）
 *
 * 职责分层（§1.5 高内聚低耦合）：
 *  - 题库加载：public/practice-bank/ 分片（fetch + JSON.parse，见 practiceBankClient）
 *  - 组卷：composePaper 纯函数（难度分布 / 单元加权 / 三条去重），本 store 只喂参数
 *  - 会话状态机：home / config / session / result 四层页面共享的单一真相源
 *  - 落库：一律走既有 studyDb —— recordAnswered（答题数）+ recordError（错题本，
 *    写 SM-2 初始字段，复习 Tab 的 loadDueReviews 会自动捞到）+ addAttempts（单题耗时
 *    question_attempt，P0-3 批写）；本 store 不写任何 SM-2 逻辑、不建新仓库
 *  - 归因（P0-4）：自评「不会」后置 pendingAttribution，由视图弹二级归因层，
 *    经 attributeError 回写 error_book.reason/kp（extra 透传，零迁移）
 *
 * 会话为内存态（未完成会话可在本页面续做，刷新后丢弃）——与 PRD §5.5 的决策一致：
 * 落库只剩两件事（答题数、错题本），其余状态不值得持久化（单题耗时随会话结束批写入库）。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStudyDbStore } from './studyDb'
import { loadBankIndex, loadSubjectBank } from '@/utils/practiceBankClient'
import { composePaper, weakAreasOf, weakWeightsFromErrors, WEIGHT_DIMENSIONS } from '@/utils/composePaper'
import { paperKeyOf } from '@/content/practiceBank'
import { isFillItem, answerMatches } from '@/content/answerNorm'
import { TIMEOUT_MS } from '@/utils/practiceMetrics'

/**
 * 限时仿真三档（P0-5）。单一真相源 —— 禁止视图 / 测试另写 25/50/150 或 10/20/60。
 *  - 150 档允许 includeExam（仿真需含真题卷）；25/50 档默认排除真题卷（去重规则 2）。
 *  - maxPerPage 为页级抽取上限（§7 P-D4 裁决：25=3 / 50=4 / 150=5），防 150 档堆在同一页/单元。
 *  - 与 draft.count（unit/weak/custom 题量档，PracticeConfig countOptions）互不干扰。
 */
export const TIMED_PRESETS = [
  { id: 't25', count: 25, durationMin: 10, includeExam: false, maxPerPage: 3, label: '25 题 · 10 分钟' },
  { id: 't50', count: 50, durationMin: 20, includeExam: false, maxPerPage: 4, label: '50 题 · 20 分钟' },
  { id: 't150', count: 150, durationMin: 60, includeExam: true, maxPerPage: 5, label: '150 题 · 60 分钟（仿真）' }
]

/** 上次限时仿真时间戳的存储键（P-D5：零 DB、可逆；会话开始写入、结算读旧值算间隔） */
const SIM_LAST_AT_KEY = 'sim_last_at'

/** 全科混卷的学科清单（150 档全科混卷口径：单科语文可判分仅 200，独卷 150 占比过高） */
const ALL_SUBJECTS = ['math', 'chinese', 'computer']

/**
 * 自评档位（P1-9 三档）—— **唯一取值来源**，禁止视图内联 'known'/'seen'/'unknown' 字符串。
 *  - known   会：只记答题数，**不入错题本**
 *  - seen    看答案才会：入错题本，组卷权重 ×0.5（中间态）
 *  - unknown 不会：入错题本，权重 ×1
 * ⚠️ resultStats 的 auto/self **二分口径不变**：三档均属「自评」侧，selfKnown 只计 known（H3）。
 * ⚠️ 适用边界（有意不一致，勿当缺陷修）：三档**只**作用于本 practice 链路（PracticeSession）。
 *   `ExamBlock.vue`（布尔答对/答错）与 `QuizBlock.vue`（页内自评）是**另一语义来源**，
 *   本批有意**不**三档化（P-E3）；勿在别处顺手合并或「补齐」。
 */
export const SELF_TIERS = { KNOWN: 'known', SEEN: 'seen', UNKNOWN: 'unknown' }

export const usePracticeStore = defineStore('practice', () => {
  const db = useStudyDbStore()

  // ===== 阶段机（PracticeView 壳据此切换四层页面）=====
  const phase = ref('home') // home | config | session | result

  // ===== 题库 =====
  const bankIndex = ref(null)
  /** 汇总索引按需加载（幂等；失败置 error 态由视图提示重试） */
  async function ensureIndex() {
    if (bankIndex.value) return bankIndex.value
    bankIndex.value = await loadBankIndex()
    return bankIndex.value
  }
  /** 学科分片按需加载（client 已带缓存，这里再挂到响应式树供视图判断就绪） */
  async function ensureBank(subject) {
    return loadSubjectBank(subject)
  }

  // ===== L2 组卷配置草稿 =====
  const draft = ref({
    mode: 'unit', // unit 单元练习 | weak 薄弱专项 | custom 自定义组卷
    subject: 'math',
    unitNums: [], // 空 = 全科（该学科全部单元）
    count: 10, // unit/weak：5/10/20 默认 10；custom：10/20/30/50 默认 20
    difficulty: '', // '' = 不限
    includeExam: false, // 含真题卷题目，默认关闭（prd-mobile §5.6 去重规则 2）
    // 加权维度（D-3，P1-14）：缺省 'kp' 让考点级加权生效（P-D2 裁决）；纯函数 composePaper 缺省仍 'unit'
    weightDimension: WEIGHT_DIMENSIONS.KP
  })

  /** 打开组卷配置（L1 三入口 / 薄弱专项预填都走这里） */
  function openConfig(patch = {}) {
    draft.value = {
      mode: 'unit',
      subject: 'math',
      unitNums: [],
      count: patch.mode === 'custom' ? 20 : 10,
      difficulty: '',
      includeExam: false,
      weightDimension: WEIGHT_DIMENSIONS.KP,
      ...patch
    }
    phase.value = 'config'
  }

  // ===== 薄弱专项口径（与 Dashboard weakAreas 同源聚合）=====
  const weakAreas = ref([])
  async function refreshWeakAreas() {
    const errors = await db.getAllErrors()
    weakAreas.value = weakAreasOf(errors)
    return errors
  }

  // ===== L3 做题会话 =====
  // session: { mode, title, subject, unitNums, questions, index, records,
  //            startedAt, finishedAt, newErrorIds, compose, attempts }
  // record:  { picked, revealed, assess, enterAt, elapsedMs, errorId }
  const session = ref(null)

  // 待归因（P0-4）：自评「我还不会」后置位，视图据此弹 ReasonChips；完成/跳过即清空
  const pendingAttribution = ref(null) // { index: number } | null

  const current = computed(() =>
    session.value ? session.value.questions[session.value.index] : null
  )
  const currentRecord = computed(() =>
    session.value ? session.value.records[session.value.index] : null
  )
  const answeredCount = computed(() =>
    session.value ? session.value.records.filter((r) => r.assess).length : 0
  )
  /** D2 强制规则：未自评不得进入下一题（按钮 disabled + 左滑手势无响应共用这一口径） */
  const canNext = computed(() => !!currentRecord.value?.assess)
  const isLast = computed(() =>
    session.value ? session.value.index >= session.value.questions.length - 1 : false
  )

  /**
   * 开启会话（题已组好；startFromDraft / startTimed / 「重做错题」都走这里）
   * @param {object} opt { mode, title, subject, unitNums, questions, compose, timed?, durationSec?, simPrevAt? }
   */
  function startSession({ mode, title, subject, unitNums, questions, compose, timed = false, durationSec = 0, simPrevAt = null }) {
    session.value = {
      mode,
      title: title || '练习',
      subject,
      unitNums: unitNums || [],
      questions,
      index: 0,
      records: questions.map(() => ({
        picked: null,
        revealed: false,
        assess: null,
        // fill 题（B-2）：typed=输入原文（判分与 recordError.userAnswer 共用）；
        // autoMatched: null=未自动判 / true=判对 / false=未命中（回落自评）
        typed: null,
        autoMatched: null,
        enterAt: Date.now(), // 进入该题的时间戳（切题时重设），用于结算 elapsedMs
        elapsedMs: null, // 结算后写入（毫秒）
        errorId: null // 若入错题本，记录其 id 供归因回写
      })),
      startedAt: Date.now(),
      finishedAt: null,
      newErrorIds: [],
      attempts: null, // finishSession 批写后的 question_attempt 行
      compose: compose || null,
      // 限时仿真（D-1）：timed 决定是否显示倒计时 / 结算页出「≤14 天」提示
      timed,
      durationSec, // 限时总秒数（0 = 不限时）
      // deadline 毫秒截止戳：计时用 deadline - Date.now() 校准（不用 timeLeft--，防节流漂移）
      deadline: timed ? Date.now() + durationSec * 1000 : null,
      simPrevAt // 上次仿真的时间戳（会话开始时读旧值 → 结算页据此算「距上次 N 天」）
    }
    phase.value = 'session'
  }

  /**
   * 按草稿组卷并开始会话（L2「开始」）
   * 单元权重来源 = 错题本聚合（weakAreas Top5 按错题数加权），哪里弱练哪里
   */
  async function startFromDraft() {
    const cfg = draft.value
    const items = await ensureBank(cfg.subject)
    const errors = await db.getAllErrors()
    const { questions } = composePaper(items, {
      count: cfg.count,
      seed: (Date.now() % 2147483647) || 1,
      difficulty: cfg.difficulty,
      includeExam: cfg.includeExam,
      // D-3：权重维度与权重表必须同维度 —— 用 cfg.weightDimension 决定两者口径
      weightDimension: cfg.weightDimension,
      unitWeights: weakWeightsFromErrors(errors, 5, cfg.weightDimension)
    })
    if (!questions.length) throw new Error('该范围内没有可用题目，请调整筛选条件')
    const unitLabel = cfg.unitNums.length ? `${cfg.unitNums.length} 个单元` : '全科'
    startSession({
      mode: cfg.mode,
      title: `${cfg.subject === 'math' ? '数学' : cfg.subject === 'chinese' ? '语文' : '计算机'} · ${unitLabel}`,
      subject: cfg.subject,
      unitNums: cfg.unitNums,
      questions,
      compose: { ...cfg, seed: undefined }
    })
  }

  /**
   * 读取上次限时仿真时间戳并写入本次（会话开始调用）。
   * 返回**旧值**（本次即成为「上次」）—— 结算页据此算「距上次仿真 N 天」。
   * localStorage 不可用（隐私模式 / 测试环境）时静默降级为 null，不阻断组卷。
   * @returns {number|null}
   */
  function touchSimLastAt() {
    let prev = null
    try {
      const raw = localStorage.getItem(SIM_LAST_AT_KEY)
      if (raw !== null) {
        const n = Number(raw)
        prev = Number.isFinite(n) ? n : null
      }
      localStorage.setItem(SIM_LAST_AT_KEY, String(Date.now()))
    } catch (e) {
      // 存储不可用：降级为「首次仿真」语义，不影响核心流程
    }
    return prev
  }

  /**
   * 开始限时仿真会话（P0-5）
   *  - 默认**全科混卷**（subject=null 时并拉三学科分片；150 档尤其必要 —— 语文可判分仅 200 题）
   *  - 单元/考点权重沿用 weakWeightsFromErrors（D-3 后为 kp 维度）
   *  - 题量档恒取 TIMED_PRESETS（不复用 draft.count，避免两套题量口径互相污染）
   * @param {string} presetId TIMED_PRESETS[].id
   * @param {{ subject?: string|null, seed?: number }} [scope] subject=null → 全科混卷
   */
  async function startTimed(presetId, scope = {}) {
    const preset = TIMED_PRESETS.find((p) => p.id === presetId)
    if (!preset) throw new Error(`未知限时档位：${presetId}`)
    const subject = scope.subject ?? null // null → 全科混卷
    let items
    if (subject) {
      items = await ensureBank(subject)
    } else {
      // 全科混卷：三学科分片并发加载后 concat（ensureBank 是单学科加载）
      const lists = await Promise.all(ALL_SUBJECTS.map((s) => ensureBank(s)))
      items = lists.flat()
    }
    const errors = await db.getAllErrors()
    const dimension = WEIGHT_DIMENSIONS.KP
    const { questions } = composePaper(items, {
      count: preset.count, // 恒取档位阈值，不参与 UI 二次编辑
      seed: scope.seed ?? ((Date.now() % 2147483647) || 1),
      includeExam: preset.includeExam,
      maxPerPage: preset.maxPerPage,
      weightDimension: dimension,
      unitWeights: weakWeightsFromErrors(errors, 5, dimension)
    })
    if (!questions.length) throw new Error('该范围内没有可用题目')
    // 会话开始即写 sim_last_at（本次 = 下次的「上次」），并把旧值挂到会话供结算页读
    const simPrevAt = touchSimLastAt()
    startSession({
      mode: 'timed',
      title: `限时仿真 · ${preset.label}`,
      subject: subject || 'all',
      unitNums: [],
      questions,
      timed: true,
      durationSec: preset.durationMin * 60,
      simPrevAt,
      compose: {
        mode: 'timed',
        presetId: preset.id,
        scopeSubject: subject, // 供「再来一组」按同档位重开
        count: preset.count,
        includeExam: preset.includeExam,
        maxPerPage: preset.maxPerPage,
        weightDimension: dimension,
        difficulty: ''
      }
    })
  }

  /** 续做未完成会话（L1 继续卡） */
  function resumeSession() {
    if (session.value) phase.value = 'session'
  }

  /** 退出会话：保留为未完成会话（答题数已逐题落库，不丢数据） */
  function quitSession() {
    phase.value = 'home'
  }

  /** 放弃未完成会话（L1 继续卡上的「放弃」） */
  function discardSession() {
    session.value = null
    phase.value = 'home'
  }

  // ===== 单题交互 =====

  /** 结构化题：点选即机器判定，并立即揭示参考答案（prd-mobile §5.3 流程 S3→S5） */
  function pickOption(optIndex) {
    const s = session.value
    if (!s) return
    const q = s.questions[s.index]
    const rec = s.records[s.index]
    if (!q.gradable || rec.picked !== null || rec.assess) return // 已判定/已自评后锁定
    rec.picked = optIndex
    rec.revealed = true
  }

  /**
   * fill 提交判分（B-2）：仅 isFillItem(q) 且未自评、未提交过时有效（幂等，防重复提交）。
   * - matched → autoMatched=true + 揭示参考答案（assess 仍为 null：自评才是单题完成唯一标志，
   *   D2 强制规则不动，判对后用户仍需点「我会了/我还不会」才能下一题）
   * - 未命中 → autoMatched=false + 揭示参考答案；UI 提示「未自动匹配，请对照答案自评」，
   *   回落点 = 现有 assess 流程（自评通路零改动，H3 二分保持）
   * - 不直接写 assess / 不落库
   * @param {string} input 学生输入原文
   */
  function submitFill(input) {
    const s = session.value
    if (!s) return
    const q = s.questions[s.index]
    const rec = s.records[s.index]
    if (!isFillItem(q) || rec.assess || rec.autoMatched !== null) return
    const typed = typeof input === 'string' ? input : ''
    rec.typed = typed
    rec.autoMatched = typed.trim() ? answerMatches(typed, q.answer).matched : false
    rec.revealed = true
  }

  /** 揭示参考答案（自由文本「看答案」；结构化题点选时已自动揭示） */
  function revealAnswer() {
    const s = session.value
    if (!s || s.records[s.index].assess) return
    s.records[s.index].revealed = true
  }

  /**
   * 自评（强制规则的唯一出口，P1-9 三档）：
   *  - 会（known）→ 只记答题数，不入错题本
   *  - 看答案才会（seen）→ 入错题本（中间态），selfTier='seen' → 组卷权重减半
   *  - 不会（unknown）→ 入错题本，selfTier='unknown'
   * seen/unknown 都要弹归因层（都需要开处方）。每题自评时逐题调 recordAnswered(1, {fileKey})——
   * 中途退出（验收 5.7-6）答题数也已计入。
   */
  async function assess(kind) {
    const s = session.value
    if (!s) return
    const q = s.questions[s.index]
    const rec = s.records[s.index]
    if (rec.assess || !rec.revealed) return // 未看答案不允许自评（防止跳过刷题）
    rec.assess = kind
    try {
      await db.recordAnswered(1, { fileKey: q.fileKey })
      // 中间态（seen）同样入本 —— 只有「会」不入本
      if (kind === SELF_TIERS.SEEN || kind === SELF_TIERS.UNKNOWN) {
        // fill 且有输入时，错题本记真实输入（B-2）；其余沿用既有口径
        const userAnswer =
          q.gradable && rec.picked !== null
            ? `选项 ${'ABCDEFGH'[rec.picked]}`
            : isFillItem(q) && rec.typed
              ? rec.typed
              : kind === SELF_TIERS.SEEN
                ? '自评：看答案才会'
                : '自评：我还不会'
        // fileKey 必须传：去重键是 subject+question+fileKey，缺了退化为单元粒度（§5.4 注意点 1）
        const r = await db.recordError(
          q.subject,
          q.unitNum,
          q.question,
          q.answer,
          userAnswer,
          `练习解析：${q.answer}`,
          {
            fileKey: q.fileKey,
            fileTitle: q.fileTitle,
            unitTitle: q.unitTitle,
            difficulty: q.difficulty || '',
            // selfTier：行内加字段（零迁移，随 engine 整行 LWW 同步），供组卷权重减半与校准率面板消费
            selfTier: kind
          }
        )
        rec.errorId = r.id // 供归因回写（新入本与被去重命中都指向同一行）
        if (!r.duplicated) s.newErrorIds.push(r.id)
        // 置待归因：视图弹二级归因层（可跳过，不阻塞继续答题）—— seen/unknown 都弹
        pendingAttribution.value = { index: s.index }
      }
    } catch (e) {
      // 落库失败不阻断做题：回滚自评态让用户可重试，避免整题数据丢失
      console.error('[practice] 落库失败:', e)
      rec.assess = null
      throw e
    }
  }

  /** 下一题（未自评时是 no-op —— 与 disabled 按钮和手势屏蔽三重保险） */
  function next() {
    const s = session.value
    if (!s || !canNext.value) return
    if (isLast.value) {
      finishSession()
    } else {
      settleRecord(s, s.index) // 结算上一题耗时
      s.index++
      const rec = s.records[s.index]
      if (rec) rec.enterAt = Date.now() // 进入下一题的时间戳
    }
  }

  /** 结算某题耗时（切题/收尾时调用；已结算则跳过），一律时间戳差值，不用计时器累加 */
  function settleRecord(s, i) {
    const rec = s && s.records[i]
    if (!rec || rec.elapsedMs != null) return
    rec.elapsedMs = Math.max(0, Date.now() - (rec.enterAt || Date.now()))
  }

  /**
   * 结束会话并进入结算（逐题容错后到这里时数据已全部落库）
   * 单题耗时批写异步进行：失败只记日志、不阻断结算（与 ExamBlock 逐题容错同款）
   */
  function finishSession() {
    const s = session.value
    if (!s) return
    settleRecord(s, s.index) // 结算最后一题
    s.finishedAt = Date.now()
    phase.value = 'result'
    persistAttempts(s).catch((e) => console.error('[practice] 单题耗时落库失败:', e))
  }

  /** 组装 question_attempt 行（只记已作答的题；source 固定 practice） */
  function buildAttempts(s) {
    const out = []
    s.questions.forEach((q, i) => {
      const r = s.records[i]
      if (!r || !r.assess) return
      const elapsedMs = r.elapsedMs == null ? 0 : r.elapsedMs
      out.push({
        subject: q.subject,
        unitNum: q.unitNum,
        fileKey: q.fileKey,
        questionKey: paperKeyOf(q),
        itemType: q.itemType || '',
        source: 'practice',
        picked: r.picked,
        assess: r.assess,
        correct: r.picked !== null ? r.picked === q.correctIndex : null,
        elapsedMs,
        timedOut: elapsedMs >= TIMEOUT_MS,
        reason: null,
        createdAt: Date.now(),
        createdAtDate: localDateStr()
      })
    })
    return out
  }

  /** 单事务批写本次会话的单题耗时；写入结果回挂 session.attempts 供结算页取用 */
  async function persistAttempts(s) {
    const attempts = buildAttempts(s)
    if (!attempts.length) {
      s.attempts = []
      return
    }
    s.attempts = await db.addAttempts(attempts)
  }

  /** 本地日期串 YYYY-MM-DD（与 studyDb.getDateStr 同口径） */
  function localDateStr(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // ===== 错题归因（P0-4） =====

  /**
   * 提交归因：把 reason/kp 回写到刚入本的错题行（ReasonChips 的「一点即完成」出口）
   * 跳过归因时勿传 reason/kp —— attributeError 只写非空值，不落空串
   * @param {{reason?: string, kp?: string}} patch
   */
  async function setAttribution({ reason, kp } = {}) {
    const pa = pendingAttribution.value
    pendingAttribution.value = null
    const s = session.value
    const rec = pa && s ? s.records[pa.index] : null
    if (!rec || !rec.errorId) return
    try {
      await db.attributeError(rec.errorId, { reason: reason || undefined, kp: kp || undefined })
    } catch (e) {
      console.error('[practice] 归因回写失败:', e)
    }
  }

  /** 跳过归因（不写任何字段） */
  function dismissAttribution() {
    pendingAttribution.value = null
  }

  /** question_attempt.questionKey 形如 `${fileKey}|${question}`，反解题干 */
  function questionOfAttempt(a) {
    const key = (a && a.questionKey) || ''
    const idx = key.indexOf('|')
    return idx >= 0 ? key.slice(idx + 1) : ''
  }

  /**
   * 一键归因超时（A-3.4）：把本次会话中 timedOut 的题标为「超时蒙猜」，
   * 同步回写 question_attempt.reason 与对应 error_book.reason（按 fileKey + question 关联）
   * @returns {Promise<number>} 归因的超时题数
   */
  async function attributeTimeouts() {
    const s = session.value
    if (!s || !Array.isArray(s.attempts) || !s.attempts.length) return 0
    const timedOut = s.attempts.filter((a) => a.timedOut)
    if (!timedOut.length) return 0
    let errors = []
    try {
      errors = await db.getAllErrorsRaw()
    } catch (e) {
      console.error('[practice] 读取错题失败:', e)
    }
    for (const a of timedOut) {
      try {
        await db.setAttemptReason(a.id, '超时蒙猜')
        a.reason = '超时蒙猜'
        const question = questionOfAttempt(a)
        const err = errors.find((e) => e.fileKey === a.fileKey && e.question === question)
        if (err && err.id) await db.attributeError(err.id, { reason: '超时蒙猜' })
      } catch (e) {
        console.error('[practice] 超时归因失败:', e)
      }
    }
    return timedOut.length
  }

  // ===== L4 结算 =====

  /**
   * 结算统计——判分口径必须二分（prd-mobile §5.2 D3，H3，B-2 扩展）：
   * 「自动判」（选择/判断点选 picked≠null ∪ fill 判对 autoMatched===true）与
   * 「自评」（其余，含 fill 未命中回落自评）分开统计，禁止合并。
   * P1-9 三档化**不破二分**：三档均落「自评」侧；selfKnown 只计 known（seen/unknown 不计「会」）。
   * selfSeen 是自评侧的**细分计数**（供结算页追加展示），非独立百分比、不与自动判合并。
   */
  const resultStats = computed(() => {
    const s = session.value
    if (!s) return null
    let autoCount = 0
    let autoCorrect = 0
    let selfCount = 0
    let selfKnown = 0
    let selfSeen = 0
    s.questions.forEach((q, i) => {
      const r = s.records[i]
      if (!r.assess) return
      if (r.picked !== null || r.autoMatched === true) {
        autoCount++
        if ((r.picked !== null && r.picked === q.correctIndex) || r.autoMatched === true) {
          autoCorrect++
        }
      } else {
        selfCount++
        if (r.assess === SELF_TIERS.KNOWN) selfKnown++
        else if (r.assess === SELF_TIERS.SEEN) selfSeen++
      }
    })
    return {
      total: s.questions.length,
      answered: autoCount + selfCount,
      autoCount,
      autoCorrect,
      selfCount,
      selfKnown,
      selfSeen,
      newErrors: s.newErrorIds.length,
      durationSec: Math.max(0, Math.round(((s.finishedAt || Date.now()) - s.startedAt) / 1000))
    }
  })

  /**
   * 结算页「重做错题」：本次答错/自评不会的题重开一组。
   * 重做恒为**非限时精练**（不传 timed → startSession 缺省 false）：故 mode/title 也必须用
   * 非限时口径，否则会出现「标题写『限时仿真 · N 分钟』、实则无倒计时」的自相矛盾（F2）。
   * session.mode 目前无消费者（仅此处写入），timed 源改用语义自洽的 'redo' 零功能副作用。
   */
  function redoErrors() {
    const s = session.value
    if (!s) return
    const wrong = s.questions.filter((q, i) => {
      const r = s.records[i]
      // 三档化后「看答案才会」（seen）也计入错题动作（否则中间态题不进「重做错题」）
      return (
        r.assess === SELF_TIERS.UNKNOWN ||
        r.assess === SELF_TIERS.SEEN ||
        (r.picked !== null && r.picked !== q.correctIndex)
      )
    })
    if (!wrong.length) return
    startSession({
      mode: s.timed ? 'redo' : s.mode, // 限时源 → 'redo'；非限时源沿用原非限时 mode
      title: s.timed ? `错题重做 · ${wrong.length} 题` : `${s.title} · 错题重做`,
      subject: s.subject,
      unitNums: s.unitNums,
      questions: wrong.map((q) => ({ ...q })),
      compose: null
    })
  }

  /** 结算页「再来一组」：同配置换新种子重组（不同 seed → 新卷） */
  async function againSameConfig() {
    const s = session.value
    if (!s || !s.compose) return
    const cfg = s.compose
    // 限时仿真：按同档位重开（口径与首次一致；全科混卷 scopeSubject 透传 null 亦正确）
    if (cfg.presetId) {
      await startTimed(cfg.presetId, { subject: cfg.scopeSubject ?? null })
      return
    }
    const items = await ensureBank(cfg.subject)
    const errors = await db.getAllErrors()
    const seed = (Date.now() % 2147483647) || 1
    // 沿用本组卷的加权维度（D-3）：权重维度与权重表同口径
    const dimension = cfg.weightDimension || WEIGHT_DIMENSIONS.KP
    const { questions } = composePaper(items, {
      count: cfg.count,
      seed,
      difficulty: cfg.difficulty,
      includeExam: cfg.includeExam,
      weightDimension: dimension,
      unitWeights: weakWeightsFromErrors(errors, 5, dimension)
    })
    if (!questions.length) return
    startSession({
      mode: cfg.mode,
      title: s.title,
      subject: cfg.subject,
      unitNums: cfg.unitNums || [],
      questions,
      compose: { ...cfg }
    })
  }

  /** 结算页「回看知识点」的目标页（第一道错题来源页；无错题则第一题） */
  const reviewTargetRoute = computed(() => {
    const s = session.value
    if (!s) return null
    const wrongIdx = s.records.findIndex((r, i) => {
      const q = s.questions[i]
      // 与 redoErrors 同判据：seen/unknown/答错都算错题（H7：错题口径单一来源）
      return (
        r.assess === SELF_TIERS.UNKNOWN ||
        r.assess === SELF_TIERS.SEEN ||
        (r.picked !== null && r.picked !== q.correctIndex)
      )
    })
    const q = s.questions[wrongIdx >= 0 ? wrongIdx : 0]
    if (!q) return null
    return `/study/${q.subject}/${q.unitNum}/${q.fileIndex}`
  })

  /** 本组卷的键集合（供跨组去重等扩展使用；当前会话内去重已由 composePaper 保证） */
  const sessionKeys = computed(() =>
    session.value ? session.value.questions.map((q) => paperKeyOf(q)) : []
  )

  return {
    // 状态
    phase,
    draft,
    bankIndex,
    weakAreas,
    session,
    current,
    currentRecord,
    answeredCount,
    canNext,
    isLast,
    resultStats,
    reviewTargetRoute,
    sessionKeys,
    pendingAttribution,
    // 动作
    ensureIndex,
    ensureBank,
    openConfig,
    refreshWeakAreas,
    startFromDraft,
    startTimed,
    startSession,
    resumeSession,
    quitSession,
    discardSession,
    pickOption,
    submitFill,
    revealAnswer,
    assess,
    next,
    finishSession,
    redoErrors,
    againSameConfig,
    setAttribution,
    dismissAttribution,
    attributeTimeouts
  }
})
