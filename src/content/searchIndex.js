/**
 * 搜索索引的形状定义（纯 ESM，零 import —— 构建脚本与浏览器两端共用）
 *
 * 背景（阶段 7.4）：索引原先是「一份单文件、正文统一截断到 800 字符」，
 * 实测 139/139 条 keywords 都恰好停在 800，而中位页面正文 3387 字符
 * —— 77% 的内容搜不到，且没有任何告警。现在拆成两级：
 * 小的 `search-meta.json`（标题级，始终加载）+ 按学科分片的正文 `search-body/{学科}.json`（按需加载）。
 *
 * ⚠️ 本文件刻意不 import 任何模块：scripts/build-search-index.mjs 会直接 import 它，
 *    一旦引入依赖链就会把浏览器侧代码拖进 Node 构建进程。
 *
 * ⚠️ 三方（构建脚本 / 搜索工具函数 / 面板）必须对下面三件事看法一致：
 *    正文上限、分片文件名、正文条目的键。一旦分叉，前端就会 fetch 一个不存在的分片，
 *    或者对拿到的分片查不到键 —— 所以它们只在这里定义一次。
 */

/**
 * 正文上限（字符）：超过则截断，构建脚本会 console.warn 列出被截断的文件（把静默失败变成构建日志）
 *
 * E-4：并入题库题干后，最重的一页（computer/05-模拟冲刺/05-操作考实战任务卡，含大量题目）
 * 从 11909 → 12257 字符，原 12000 上限会截掉尾部题目。故抬到 14000（对当前最大页约 14% 余量），
 * 以维持「无页面被静默截断」这条不变量。
 */
export const BODY_LIMIT = 14000

/**
 * 正文分片合计体积预算（字节）—— 超限时构建脚本 console.warn 点名（对齐「超限必报告」纪律）。
 * P1-13：题库题干并入正文后体积约 +9%（实测 ~1.27MB → ~1.37MB），此预算留 ~15% 余量。
 * 值为「三学科分片 JSON 序列化后的字节合计」。
 */
export const BODY_BUDGET_BYTES = 1.6 * 1024 * 1024

/**
 * 题干分段标记：构建期在「页面正文」与「并入的题库题干」之间插入，供运行期判断
 * 一次命中是否来自题干（结果条目标「题目」）。三方（构建脚本 / 搜索工具 / 面板）共用此常量。
 */
export const QUESTION_MARKER = '【题目】'

/** meta 索引文件名（public/ 下的相对路径） */
export const META_FILE = 'search-meta.json'

/**
 * 正文分片路径（public/ 下的相对路径）
 * @param {string} subject 学科 key（math / chinese / computer）
 */
export function bodyShardPath(subject) {
  return `search-body/${subject}.json`
}

/**
 * 正文条目的键
 * 说明：unitNum + fileIndex 就是页面的路由身份，在学科内唯一，故分片内无需再带学科前缀
 * @param {{unitNum: string, fileIndex: number}} meta 索引条目
 */
export function bodyKeyOf(meta) {
  return `${meta.unitNum}/${meta.fileIndex}`
}