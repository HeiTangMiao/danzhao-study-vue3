/**
 * 志愿填报页（/guide）骨架数据 —— 批 F · F-1 / Fc6
 *
 * 归属：**独立顶层页**（P-F03=(b)）。不属于 math / chinese / computer 任一学科，也不经 site.js 注册，
 *      故以 src/content/guide/ 为「非学科页数据目录」（见 scripts/lib/load-content.mjs 的 NON_PAGE_DIRS）。
 *
 * 形态：纯数据 ESM、**零 import**（内容数据只描述结构，渲染交给 BlockRenderer）。
 *
 * ⚠️ P2-16 硬约束：本页**只**放「流程说明 + 官方入口」，
 *      **不得**出现院校名 / 分数线 / 投档 / 录取概率等任何结论性内容。
 * ⚠️ 正式流程文案**等待内容侧**补齐（roadmap §3 :308）；以下文本均为结构占位。
 */
export default {
  /**
   * 官方入口（浙江省教育考试院）——**全站唯一外链 URL 落点**。
   * 由 GuideView 读取后经 openExternal 交系统浏览器打开；本工具不硬编码 URL（H7）。
   * 注意：此 URL 位于 src 非内容排除目录，受 tests/csp-guard.test.js 的 L4 管辖，已在 HOST_ALLOWLIST 登记。
   */
  entry: {
    label: '浙江省教育考试院 · 官方入口',
    url: 'https://www.zjzs.net',
    note: '点击后由系统浏览器打开官网。本页不收集任何填报数据，也不提供任何院校或录取结论。'
  },

  /**
   * 骨架区块（复用既有区块类型，由 BlockRenderer 渲染）：
   * warning=流程要点 / steps=办理步骤 / table=材料清单。文案标注「等待内容侧」。
   */
  blocks: [
    {
      type: 'warning',
      title: '流程要点（文案等待内容侧）',
      text: '志愿填报一般分「了解政策 → 查看计划 → 网上填报 → 确认提交」四个阶段，各阶段时间节点以官方通知为准。'
    },
    {
      type: 'steps',
      title: '办理步骤（占位）',
      items: [
        { title: '了解政策与招生计划', content: '查阅当年招生政策与院校专业计划（文案等待内容侧）。' },
        { title: '网上填报志愿', content: '在规定时间内登录官方系统填报志愿（文案等待内容侧）。' },
        { title: '核对并确认提交', content: '仔细核对所填内容后确认提交，逾期不再补报（文案等待内容侧）。' }
      ]
    },
    {
      type: 'table',
      title: '材料清单（占位）',
      headers: ['材料', '说明'],
      rows: [
        ['准考证', '填报与录取各环节均需（文案等待内容侧）'],
        ['身份证', '用于身份核验'],
        ['其他', '以官方通知为准']
      ]
    }
  ]
}
