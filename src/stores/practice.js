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
import { composePaper, weakAreasOf, weakWeightsFromErrors } from '@/utils/composePaper'
import { paperKeyOf } from '@/content/practiceBank'
import { isFillItem, answerMatches } from '@/content/answerNorm'
import { TIMEOUT_MS } from '@/utils/practiceMetrics'

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
    includeExam: false // 含真题卷题目，默认关闭（prd-mobile §5.6 去重规则 2）
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
   * 开启会话（题已组好；startFromDraft 与「重做错题」都走这里）
   * @param {object} opt { mode, title, subject, unitNums, questions, compose }
   */
  function startSession({ mode, title, subject, unitNums, questions, compose }) {
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
      compose: compose || null
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
      unitWeights: weakWeightsFromErrors(errors)
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
   * 自评（强制规则的唯一出口）：
   *  - 「我会了」→ 只记答题数，不入错题本
   *  - 「我还不会」→ recordError 入错题本（SM-2 初始字段由 studyDb 负责）
   * 每题自评时逐题调 recordAnswered(1, {fileKey})——中途退出（验收 5.7-6）答题数也已计入
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
      if (kind === 'unknown') {
        // fill 且有输入时，错题本记真实输入（B-2）；其余沿用既有口径
        const userAnswer =
          q.gradable && rec.picked !== null
            ? `选项 ${'ABCDEFGH'[rec.picked]}`
            : isFillItem(q) && rec.typed
              ? rec.typed
              : '自评：我还不会'
        // fileKey 必须传：去重键是 subject+question+fileKey，缺了退化为单元粒度（§5.4 注意点 1）
        const r = await db.recordError(
          q.subject,
          q.unitNum,
          q.question,
          q.answer,
          userAnswer,
          `练习解析：${q.answer}`,
          { fileKey: q.fileKey, fileTitle: q.fileTitle, unitTitle: q.unitTitle, difficulty: q.difficulty || '' }
        )
        rec.errorId = r.id // 供归因回写（新入本与被去重命中都指向同一行）
        if (!r.duplicated) s.newErrorIds.push(r.id)
        // 置待归因：视图弹二级归因层（可跳过，不阻塞继续答题）
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
   * 「自评」（其余，含 fill 未命中回落自评）分开统计，禁止合并
   */
  const resultStats = computed(() => {
    const s = session.value
    if (!s) return null
    let autoCount = 0
    let autoCorrect = 0
    let selfCount = 0
    let selfKnown = 0
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
        if (r.assess === 'known') selfKnown++
      }
    })
    return {
      total: s.questions.length,
      answered: autoCount + selfCount,
      autoCount,
      autoCorrect,
      selfCount,
      selfKnown,
      newErrors: s.newErrorIds.length,
      durationSec: Math.max(0, Math.round(((s.finishedAt || Date.now()) - s.startedAt) / 1000))
    }
  })

  /** 结算页「重做错题」：本次答错/自评不会的题重开一组 */
  function redoErrors() {
    const s = session.value
    if (!s) return
    const wrong = s.questions.filter((q, i) => {
      const r = s.records[i]
      return r.assess === 'unknown' || (r.picked !== null && r.picked !== q.correctIndex)
    })
    if (!wrong.length) return
    startSession({
      mode: s.mode,
      title: `${s.title} · 错题重做`,
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
    const items = await ensureBank(cfg.subject)
    const errors = await db.getAllErrors()
    const seed = (Date.now() % 2147483647) || 1
    const { questions } = composePaper(items, {
      count: cfg.count,
      seed,
      difficulty: cfg.difficulty,
      includeExam: cfg.includeExam,
      unitWeights: weakWeightsFromErrors(errors)
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
      return r.assess === 'unknown' || (r.picked !== null && r.picked !== q.correctIndex)
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
