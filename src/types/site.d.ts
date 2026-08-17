/**
 * 站点配置类型定义
 * 对应 schema/site-schema.json，供 IDE 智能提示与类型检查使用
 */

/** 学科类型 */
export type Subject = 'math' | 'chinese'

/** 文件（页面）配置 */
export interface SiteFile {
  name: string          // 文件名（不含扩展名）
  title: string         // 页面标题
  subtitle: string      // 页面副标题
  isTest?: boolean      // 是否为测验页
}

/** 单元配置 */
export interface SiteUnit {
  num: string           // 单元编号，如 '01'
  title: string         // 单元标题
  folder: string        // 内容文件夹名
  phase: number         // 所属阶段
  color: string         // 主题色
  icon: string          // 图标（emoji）
  files: SiteFile[]     // 页面文件列表
}

/** 学习阶段 */
export interface Phase {
  name: string          // 阶段名称
  color: string         // 主题色
  icon: string          // 图标
}

/** 站点配置 */
export interface SiteConfig {
  title: string                    // 站点标题
  subtitle: string                 // 站点副标题
  subject: Subject                 // 学科
  themeKey: string                 // 主题 localStorage 键名
  progressKey: string              // 进度 localStorage 键名
  breadcrumbHome: string           // 面包屑首页文案
  sidebarTitle: string             // 侧边栏标题
  units: SiteUnit[]                // 单元列表
  phases: Record<number, Phase>    // 阶段映射
}

declare const siteConfig: SiteConfig
export default siteConfig