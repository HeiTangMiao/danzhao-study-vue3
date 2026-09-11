/**
 * 页面元信息推导（纯 ESM，零 import —— 浏览器与 Node 脚本共用同一条规则）
 *
 * 背景：页面元信息（id / unitNum / subject / title / subtitle）此前在每个内容文件里
 *      各手写一份，又在 site.js 里各写一份，两边会漂移
 *      （实测 19/139 页的 subtitle 已经不一致，页头与侧边栏显示的是两个版本）。
 *      这里把 site.js 定为唯一真相源：元信息一律由「学科配置 + fileIndex」推导。
 *
 * ⚠️ 本文件刻意不 import 任何模块。
 *    scripts/validate-content.mjs 与 scripts/build-search-index.mjs 会直接 import 它，
 *    复用同一条推导规则。一旦引入依赖链（哪怕是 getSubjectConfig），就会把站点配置、
 *    渲染组件甚至浏览器 API 拖进 Node 校验进程。
 */

/**
 * 内容文件中不得手写的顶层元信息键
 *
 * 这批键的唯一真相源是 site.js（id/unitNum/subject/title/subtitle 由 resolvePageMeta 推导，
 * icon 只属于站点配置的单元/页面注册项）。阶段 1B 的迁移脚本按此清单剥离，
 * 阶段 1C 的校验器按同一清单报错 —— 两边共用一份，避免再添一处漂移源。
 */
export const PAGE_META_KEYS = ['id', 'unitNum', 'subject', 'title', 'subtitle', 'icon']

/**
 * 由学科配置 + fileIndex 解析页面元信息
 * @param {object} site 学科站点配置（src/content/index.js 中 SUBJECTS 的一项）
 * @param {string} unitNum 单元编号，如 "01"
 * @param {number} fileIndex site.js 中 files[] 数组下标 —— 直接决定 URL 与历史进度语义
 * @returns {object|null} 单元不存在或下标越界时返回 null（调用方据此走「页面不存在」分支）
 */
export function resolvePageMeta(site, unitNum, fileIndex) {
  if (!site || !Array.isArray(site.units)) return null
  const idx = Number(fileIndex)
  // 非整数与负数一律视为越界：不做钳制，避免把 -1 静默当成第 0 页
  if (!Number.isInteger(idx) || idx < 0) return null
  const unit = site.units.find((u) => u.num === unitNum)
  const file = unit?.files?.[idx]
  if (!unit || !file) return null
  return {
    // ==== 内容元信息（阶段 1B 后不再手写进内容文件）====
    id: `${site.subject}-${unit.num}-${String(idx + 1).padStart(2, '0')}`,
    unitNum: unit.num,
    subject: site.subject,
    title: file.title,
    subtitle: file.subtitle || '',
    isTest: !!file.isTest,
    // ==== 运行时派生字段（供加载器 / 侧边栏消费）====
    unitTitle: unit.title,
    folder: unit.folder,
    name: file.name,
    fileIndex: idx
  }
}

/**
 * 包装成渲染层消费的页面对象
 *
 * 关键：meta 优先，页面文件自带的旧元信息字段一律忽略。
 * 正因如此，139 个内容文件在尚未剥离手写元信息（阶段 1B）时也能正确显示
 * site.js 的版本 —— 本阶段不改内容文件一个字。
 *
 * @param {object} rawModule 内容文件的 default 导出
 * @param {object} meta resolvePageMeta 的结果
 */
export function hydratePage(rawModule, meta) {
  return { ...meta, blocks: Array.isArray(rawModule?.blocks) ? rawModule.blocks : [] }
}
