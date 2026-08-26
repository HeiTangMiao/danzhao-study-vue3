/**
 * 多学科内容索引
 * 统一管理数学、语文、计算机三个学科的站点配置
 * 供路由、首页、内容页统一消费
 */
import SITE_CONFIG from './site'
import CHINESE_CONFIG from './chinese/site'
import COMPUTER_CONFIG from './computer/site'

/** 全部学科配置映射 */
export const SUBJECTS = {
  math: SITE_CONFIG,
  chinese: CHINESE_CONFIG,
  computer: COMPUTER_CONFIG
}

/** 学科列表（供首页渲染学科选择卡片） */
export const SUBJECT_LIST = [
  { key: 'math', ...SITE_CONFIG },
  { key: 'chinese', ...CHINESE_CONFIG },
  { key: 'computer', ...COMPUTER_CONFIG }
]

/**
 * 学科展示元信息（名称/图标）
 * 供仪表盘、错题本等跨学科界面统一使用，避免各处二元判断把 computer 误显示为语文
 */
export const SUBJECT_META = {
  math: { name: '数学', icon: '📐' },
  chinese: { name: '语文', icon: '✍️' },
  computer: { name: '计算机', icon: '💻' }
}

/**
 * 根据学科 key 获取配置
 * @param {string} subject - 'math' | 'chinese' | 'computer'
 * @returns {object} 学科配置
 */
export function getSubjectConfig(subject) {
  return SUBJECTS[subject] || SITE_CONFIG
}

export default SUBJECTS
