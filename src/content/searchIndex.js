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

/** 正文上限（字符）：超过则截断，构建脚本会 console.warn 列出被截断的文件（把静默失败变成构建日志） */
export const BODY_LIMIT = 12000

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