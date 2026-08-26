/**
 * 站点级配置数据（site-schema 的实例）
 * 说明：
 *  - 由旧版 `assets/js/config.js` 的 `SITE_CONFIG` 迁移而来
 *  - 采用 ES Module 导出，供路由 / 首页 / 侧边栏统一消费
 *  - 数据结构与 `schema/site-schema.json` 保持一致，可被校验脚本检查
 *  - 已注册全部 12 个数学单元（含冲刺阶段）
 */

export const SITE_CONFIG = {
  title: "浙江单招单考数学学习之路",
  subtitle: "循序渐进的备考体系 | 公式 + 例题 + 练习 + 测验",
  subject: "math",
  themeKey: "math_theme",
  progressKey: "math_progress_v3",
  breadcrumbHome: "浙江单招数学",
  sidebarTitle: "数学学习导航",
  units: [
    {
      num: "01", title: "集合与逻辑", folder: "01-集合与逻辑", phase: 1, color: "#4f46e5", icon: "📐",
      files: [
        { name: "01-集合的概念与表示", title: "集合的概念与表示", subtitle: "理解集合三要素，掌握集合的表示方法" },
        { name: "02-集合间的基本关系", title: "集合间的基本关系", subtitle: "子集、真子集、集合相等与空集" },
        { name: "03-集合的基本运算", title: "集合的基本运算", subtitle: "交集、并集、补集与德摩根定律" },
        { name: "04-充分条件与必要条件", title: "充分条件与必要条件", subtitle: "充分条件、必要条件、充要条件" },
        { name: "05-命题与逻辑联结词", title: "命题与逻辑联结词", subtitle: "四种命题、且或非、复合命题真值判断" },
        { name: "06-量词与命题否定", title: "量词与命题否定", subtitle: "全称量词、存在量词与命题否定规则" },
        { name: "07-复习测验", title: "集合与逻辑 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "08-易错专项与冲刺", title: "集合与逻辑 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "02", title: "不等式", folder: "02-不等式", phase: 1, color: "#0d9488", icon: "⚖️",
      files: [
        { name: "01-不等式的基本性质", title: "不等式的基本性质", subtitle: "实数大小比较与不等式基本性质" },
        { name: "02-一元二次不等式", title: "一元二次不等式", subtitle: "三个二次关系与含参数讨论" },
        { name: "03-绝对值不等式与分式不等式", title: "绝对值不等式与分式不等式", subtitle: "绝对值不等式解法与分式不等式转化" },
        { name: "04-基本不等式与最值", title: "基本不等式与最值", subtitle: "均值不等式及最值应用" },
        { name: "05-复习测验", title: "不等式 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "06-易错专项与冲刺", title: "不等式 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "03", title: "函数与基本初等函数", folder: "03-函数与基本初等函数", phase: 1, color: "#7c3aed", icon: "📈",
      files: [
        { name: "01-函数的概念与性质", title: "函数的概念与性质", subtitle: "函数三要素、单调性、奇偶性" },
        { name: "02-一次函数与反比例函数", title: "一次函数与反比例函数", subtitle: "图像与性质、实际建模" },
        { name: "03-二次函数", title: "二次函数", subtitle: "三种解析式、图像性质、闭区间最值" },
        { name: "04-指数与指数函数", title: "指数与指数函数", subtitle: "指数幂运算与指数函数图像性质" },
        { name: "05-对数与对数函数", title: "对数与对数函数", subtitle: "对数运算、换底公式与对数函数" },
        { name: "06-幂函数", title: "幂函数", subtitle: "幂函数定义、5类常见幂函数图像与性质" },
        { name: "07-复习测验", title: "函数与基本初等函数 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "08-易错专项与冲刺", title: "函数与基本初等函数 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "04", title: "三角函数", folder: "04-三角函数", phase: 2, color: "#2563eb", icon: "📊",
      files: [
        { name: "01-任意角与弧度制", title: "任意角与弧度制", subtitle: "角度弧度换算、弧长与扇形面积" },
        { name: "02-三角函数定义与同角关系", title: "三角函数定义与同角关系", subtitle: "任意角三角函数定义、同角关系式" },
        { name: "03-诱导公式", title: "诱导公式", subtitle: "奇变偶不变，符号看象限" },
        { name: "04-三角恒等变换", title: "三角恒等变换", subtitle: "和差公式、倍角公式、辅助角公式" },
        { name: "05-三角函数图像与性质", title: "三角函数图像与性质", subtitle: "正弦余弦正切性质与y=Asin(ωx+φ)" },
        { name: "06-复习测验", title: "三角函数 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "07-易错专项与冲刺", title: "三角函数 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "05", title: "解三角形", folder: "05-解三角形", phase: 2, color: "#db2777", icon: "🔺",
      files: [
        { name: "01-正弦定理与余弦定理", title: "正弦定理与余弦定理", subtitle: "正弦定理、余弦定理及适用场景" },
        { name: "02-解三角形应用", title: "解三角形应用", subtitle: "面积公式与实际测量问题" },
        { name: "03-复习测验", title: "解三角形 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "04-易错专项与冲刺", title: "解三角形 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "06", title: "数列", folder: "06-数列", phase: 2, color: "#059669", icon: "🔢",
      files: [
        { name: "01-数列基础", title: "数列基础", subtitle: "数列定义、通项公式与Sn的关系" },
        { name: "02-等差数列", title: "等差数列", subtitle: "定义、通项公式、求和公式与性质" },
        { name: "03-等比数列", title: "等比数列", subtitle: "定义、通项公式、求和公式与性质" },
        { name: "04-数列求和方法", title: "数列求和方法", subtitle: "裂项相消、错位相减、分组求和" },
        { name: "05-复习测验", title: "数列 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "06-易错专项与冲刺", title: "数列 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "07", title: "平面向量", folder: "07-平面向量", phase: 2, color: "#0891b2", icon: "🧭",
      files: [
        { name: "01-向量的概念与线性运算", title: "向量的概念与线性运算", subtitle: "向量定义、加减法与数乘运算" },
        { name: "02-向量的坐标表示", title: "向量的坐标表示", subtitle: "坐标运算、模公式与共线条件" },
        { name: "03-向量的数量积", title: "向量的数量积", subtitle: "数量积定义、坐标运算与夹角公式" },
        { name: "04-空间向量", title: "空间向量", subtitle: "空间向量运算、建系求角与距离" },
        { name: "05-复习测验", title: "平面向量 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "06-易错专项与冲刺", title: "平面向量 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "08", title: "排列组合与二项式定理", folder: "08-排列组合与二项式定理", phase: 3, color: "#d97706", icon: "🎯",
      files: [
        { name: "01-计数原理", title: "计数原理", subtitle: "分类加法与分步乘法计数原理" },
        { name: "02-排列", title: "排列", subtitle: "排列数公式、捆绑法与插空法" },
        { name: "03-组合", title: "组合", subtitle: "组合数公式、性质与分组分配" },
        { name: "04-二项式定理", title: "二项式定理", subtitle: "通项公式与赋值法求系数和" },
        { name: "05-复习测验", title: "排列组合与二项式定理 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "06-易错专项与冲刺", title: "排列组合与二项式定理 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "09", title: "概率与统计", folder: "09-概率", phase: 3, color: "#dc2626", icon: "🎲",
      files: [
        { name: "01-随机事件与概率", title: "随机事件与概率", subtitle: "事件关系、概率加法公式与对立事件" },
        { name: "02-古典概型", title: "古典概型", subtitle: "古典概型两个特征与概率计算" },
        { name: "03-几何概型", title: "几何概型", subtitle: "长度型、面积型、体积型概率计算" },
        { name: "04-条件概率与独立性", title: "条件概率与独立性", subtitle: "条件概率公式与相互独立事件" },
        { name: "05-随机变量及其分布", title: "随机变量及其分布", subtitle: "分布列、二项分布、期望与方差" },
        { name: "06-抽样方法", title: "抽样方法", subtitle: "简单随机抽样、系统抽样、分层抽样" },
        { name: "07-统计图表与数据分布", title: "统计图表与数据分布", subtitle: "频率分布表、直方图、茎叶图" },
        { name: "08-样本数字特征", title: "样本数字特征", subtitle: "平均数、中位数、方差与标准差" },
        { name: "09-统计案例", title: "统计案例", subtitle: "线性回归与独立性检验" },
        { name: "10-复习测验", title: "概率与统计 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "11-易错专项与冲刺", title: "概率与统计 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "10", title: "立体几何", folder: "10-立体几何", phase: 4, color: "#4d7c0f", icon: "🧊",
      files: [
        { name: "01-空间几何体", title: "空间几何体", subtitle: "多面体与旋转体结构特征、三视图" },
        { name: "02-表面积与体积", title: "表面积与体积", subtitle: "各几何体表面积与体积公式" },
        { name: "03-空间点线面位置关系", title: "空间点线面位置关系", subtitle: "平面公理与异面直线所成角" },
        { name: "04-平行与垂直关系", title: "平行与垂直关系", subtitle: "线面平行垂直判定与性质定理" },
        { name: "05-复习测验", title: "立体几何 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "06-易错专项与冲刺", title: "立体几何 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "11", title: "平面解析几何", folder: "11-平面解析几何", phase: 4, color: "#9333ea", icon: "〰️",
      files: [
        { name: "01-直线方程", title: "直线方程", subtitle: "倾斜角斜率、五种方程与距离公式" },
        { name: "02-圆的方程", title: "圆的方程", subtitle: "标准方程一般方程与位置关系" },
        { name: "03-椭圆", title: "椭圆", subtitle: "定义、标准方程与几何性质" },
        { name: "04-双曲线", title: "双曲线", subtitle: "定义、标准方程与渐近线" },
        { name: "05-抛物线", title: "抛物线", subtitle: "定义、四种标准方程与焦点准线" },
        { name: "06-直线与圆锥曲线", title: "直线与圆锥曲线", subtitle: "位置关系判定与弦长公式" },
        { name: "07-曲线与方程", title: "曲线与方程", subtitle: "轨迹方程求法：直译法、定义法、代入法" },
        { name: "08-复习测验", title: "平面解析几何 · 复习测验", subtitle: "本单元知识综合检测", isTest: true },
        { name: "09-易错专项与冲刺", title: "平面解析几何 · 易错专项与冲刺", subtitle: "高频易错点 + 冲刺拔高题" }
      ]
    },
    {
      num: "12", title: "模拟冲刺", folder: "12-模拟冲刺", phase: 5, color: "#a855f7", icon: "🚀", sprint: true,
      files: [
        { name: "01-考试技巧", title: "考试技巧与得分策略", subtitle: "考场时间分配、抢分技巧与常见失分点" },
        { name: "02-真题模拟卷一", title: "真题模拟卷（一）", subtitle: "全真模拟 · 限时 120 分钟 · 满分 150 分", isTest: true },
        { name: "03-真题模拟卷二", title: "真题模拟卷（二）", subtitle: "全真模拟 · 限时 120 分钟 · 满分 150 分", isTest: true }
      ]
    }
  ],
  phases: {
    1: { name: "第一阶段 · 代数基础", color: "#4f46e5", icon: "🔰" },
    2: { name: "第二阶段 · 三角与向量", color: "#7c3aed", icon: "⚡" },
    3: { name: "第三阶段 · 计数与概率", color: "#f59e0b", icon: "🎲" },
    4: { name: "第四阶段 · 几何模块", color: "#059669", icon: "🏔️" },
    5: { name: "冲刺阶段 · 模拟实战", color: "#a855f7", icon: "🚀" }
  }
}

export default SITE_CONFIG