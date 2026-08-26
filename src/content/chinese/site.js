/**
 * 语文学科站点配置
 * 由旧版 语文学习之路/assets/js/config.js 迁移
 * 文件名去除 .html 后缀，测验页统一加数字前缀
 */

export const CHINESE_CONFIG = {
  title: "浙江单招单考语文学习之路",
  subtitle: "循序渐进的备考体系 | 基础知识 + 阅读 + 写作",
  subject: "chinese",
  themeKey: "chinese_theme",
  progressKey: "chinese_progress_v1",
  breadcrumbHome: "浙江单招语文",
  sidebarTitle: "语文学习导航",
  units: [
    {
      num: "01", title: "语言文字运用", folder: "01-语言文字运用", phase: 1, color: "#dc2626", icon: "✍️",
      files: [
        { name: "01-字音字形", title: "字音字形", subtitle: "多音字、形近字、易错字音形辨析" },
        { name: "02-词语与成语运用", title: "词语与成语运用", subtitle: "实词虚词辨析、成语七大误用类型" },
        { name: "03-标点符号", title: "标点符号", subtitle: "顿号、冒号、问号、引号等规范用法" },
        { name: "04-病句修改", title: "病句修改", subtitle: "六大病句类型辨析与修改方法" },
        { name: "05-句式变换与修辞手法", title: "句式变换与修辞手法", subtitle: "主动被动转换、12种修辞全覆盖" },
        { name: "06-语言得体与口语交际", title: "语言得体与口语交际", subtitle: "谦辞敬辞、场合得体、职场用语" },
        { name: "07-复习测验", title: "语言文字运用 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "08-易错专项与冲刺", title: "语言文字运用 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "02", title: "现代文阅读", folder: "02-现代文阅读", phase: 2, color: "#2563eb", icon: "📖",
      files: [
        { name: "01-记叙文阅读", title: "记叙文阅读", subtitle: "六要素、叙事顺序、描写方法" },
        { name: "02-散文阅读", title: "散文阅读", subtitle: "形散神不散、线索、意象赏析" },
        { name: "03-小说阅读", title: "小说阅读", subtitle: "三要素、情节结构、人物分析" },
        { name: "04-说明文阅读", title: "说明文阅读", subtitle: "说明顺序、说明方法、语言特点" },
        { name: "05-议论文阅读", title: "议论文阅读", subtitle: "论点论据、论证方法、论证结构" },
        { name: "06-实用类文本阅读", title: "实用类文本阅读", subtitle: "新闻、传记、科普、职场文书" },
        { name: "07-复习测验", title: "现代文阅读 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "08-易错专项与冲刺", title: "现代文阅读 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "03", title: "古诗文阅读", folder: "03-古诗文阅读", phase: 2, color: "#059669", icon: "🏮",
      files: [
        { name: "01-古诗词鉴赏", title: "古诗词鉴赏", subtitle: "八大题材、意象、表现手法" },
        { name: "02-文言文实词与虚词", title: "文言文实词与虚词", subtitle: "120个实词、18个虚词、一词多义" },
        { name: "03-文言文特殊句式与翻译", title: "文言文特殊句式与翻译", subtitle: "判断句、被动句、倒装句、翻译标准" },
        { name: "04-古代文化常识", title: "古代文化常识", subtitle: "称谓、官职、历法、科举制度" },
        { name: "05-复习测验", title: "古诗文阅读 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "06-易错专项与冲刺", title: "古诗文阅读 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "04", title: "写作", folder: "04-写作", phase: 3, color: "#7c3aed", icon: "🖊️",
      files: [
        { name: "01-基础文体写作", title: "基础文体写作", subtitle: "记叙文、议论文、抒情散文写作" },
        { name: "02-应用文写作", title: "应用文写作", subtitle: "条据、通知、书信、职场文书" },
        { name: "03-通用写作技巧", title: "通用写作技巧", subtitle: "审题立意、结构模板、素材积累" },
        { name: "04-复习测验", title: "写作 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "05-易错专项与冲刺", title: "写作 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "05", title: "文学常识", folder: "05-文学常识", phase: 3, color: "#d97706", icon: "📚",
      files: [
        { name: "01-中国文学史", title: "中国文学史", subtitle: "先秦至清代文学脉络与代表作家" },
        { name: "02-外国文学与名著导读", title: "外国文学与名著导读", subtitle: "欧美经典作家作品与名著考点" },
        { name: "03-复习测验", title: "文学常识 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "04-易错专项与冲刺", title: "文学常识 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "06", title: "模拟冲刺", folder: "06-模拟冲刺", phase: 4, color: "#a855f7", icon: "🚀", sprint: true,
      files: [
        { name: "01-考试技巧", title: "考试技巧与得分策略", subtitle: "考场时间分配、抢分技巧与常见失分点" },
        { name: "02-真题模拟卷一", title: "真题模拟卷（一）", subtitle: "全真模拟 · 限时 120 分钟 · 满分 150 分", isTest: true }
      ]
    }
  ],
  phases: {
    1: { name: "第一阶段 · 基础知识", color: "#dc2626", icon: "🔰" },
    2: { name: "第二阶段 · 阅读理解", color: "#2563eb", icon: "📖" },
    3: { name: "第三阶段 · 写作与文学常识", color: "#7c3aed", icon: "🖊️" },
    4: { name: "冲刺阶段 · 模拟实战", color: "#a855f7", icon: "🚀" }
  }
}

export default CHINESE_CONFIG
