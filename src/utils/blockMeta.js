/**
 * 区块展示元数据（难度标签等）
 * 说明：难度标签的中文名与样式类原先在 ExampleBlock / QuizBlock / ExamBlock 各写一遍，
 *      此处收敛为唯一来源；对应样式定义在 src/assets/css/blocks.css
 */

/** 难度 → { 中文名, 样式类 }，取值必须与 content-schema 的 difficulty 枚举一致 */
export const DIFFICULTY = {
  basic: { label: '基础', cls: 'difficulty-basic' },
  medium: { label: '中等', cls: 'difficulty-medium' },
  advanced: { label: '提高', cls: 'difficulty-advanced' },
  sprint: { label: '冲刺', cls: 'difficulty-sprint' }
}

/** 未知难度回退到「基础」，与收敛前的行为一致 */
const FALLBACK = DIFFICULTY.basic

/**
 * 取难度的中文名
 * @param {string} d 难度标识
 */
export function diffLabel(d) {
  return (DIFFICULTY[d] || FALLBACK).label
}

/**
 * 取难度的样式类
 * @param {string} d 难度标识
 */
export function diffClass(d) {
  return (DIFFICULTY[d] || FALLBACK).cls
}
