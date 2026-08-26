/**
 * 内容页面数据（content-schema 的实例）
 * 页面：数字媒体技术 · 复习测验
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》数字媒体技术应用技能模块编制
 */
export default {
  id: "computer-04-06",
  unitNum: "04",
  subject: "computer",
  title: "数字媒体技术 · 复习测验",
  subtitle: "本单元知识综合检测",
  blocks: [
    // ---------- 测验信息说明 ----------
    {
      type: "warning",
      text: "建议用时 45 分钟，满分 100 分。请先独立作答，再点击「查看答案」核对解析。本测验覆盖 Photoshop 与 Premiere 常用操作。"
    },
    // ---------- 一、判断题（每题3分，共30分） ----------
    {
      type: "quiz",
      title: "一、判断题（每题 3 分，共 30 分）",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "屏幕显示用的图像分辨率一般为 72 像素/英寸。",
          answer: "**正确。**屏幕显示用 72，印刷用 300。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "使用椭圆选框工具绘制正圆，需要按住 Shift 键。",
          answer: "**正确。**Shift 键绘制正圆/正方形。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "Ctrl+D 用于取消选区。",
          answer: "**正确。**Ctrl+D 取消选区。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "psd 格式保留图层信息，jpg 格式不保留图层。",
          answer: "**正确。**psd 是源文件格式保留图层，jpg 是压缩图片。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "调整图层会直接修改原图像的像素。",
          answer: "**错误。**调整图层是独立图层，不直接修改原图。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "Premiere 中剃刀工具用于分割视频片段。",
          answer: "**正确。**剃刀工具（C）分割片段。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "帧速率 25 表示每秒播放 25 张画面。",
          answer: "**正确。**帧速率是每秒画面数。"
        },
        {
          difficulty: "advanced",
          type: "judge",
          question: "颜色键特效可以去除视频中的白色背景。",
          answer: "**正确。**颜色键去除指定颜色背景。"
        },
        {
          difficulty: "advanced",
          type: "judge",
          question: "恒定增益效果可以实现音频的淡入淡出。",
          answer: "**正确。**恒定增益是音频过渡效果。"
        },
        {
          difficulty: "advanced",
          type: "judge",
          question: "Premiere 字幕文件保存的扩展名是 .prtl。",
          answer: "**正确。**Premiere 字幕扩展名为 .prtl。"
        }
      ]
    },
    // ---------- 二、单选题（每题4分，共40分） ----------
    {
      type: "quiz",
      title: "二、单选题（每题 4 分，共 40 分）",
      items: [
        {
          difficulty: "basic",
          type: "single",
          question: "Photoshop 中新建图层的快捷键是（　）",
          options: ["A. Ctrl+N", "B. Ctrl+Shift+N", "C. Ctrl+J", "D. Ctrl+T"],
          correctIndex: 1,
          answer: "答案：B。Ctrl+Shift+N 新建图层。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "选择图像中颜色相近区域的工具是（　）",
          options: ["A. 矩形选框", "B. 魔棒工具", "C. 画笔工具", "D. 橡皮擦"],
          correctIndex: 1,
          answer: "答案：B。魔棒工具按颜色选取。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "将图片定义为图案，应使用（　）",
          options: ["A. 编辑→定义图案", "B. 滤镜→模糊", "C. 图像→调整", "D. 图层→复制"],
          correctIndex: 0,
          answer: "答案：A。编辑→定义图案。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "文字竖排显示应使用（　）",
          options: ["A. 横排文字工具", "B. 直排文字工具", "C. 段落文字", "D. 钢笔工具"],
          correctIndex: 1,
          answer: "答案：B。直排文字工具。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "自由变换的快捷键是（　）",
          options: ["A. Ctrl+T", "B. Ctrl+D", "C. Ctrl+Z", "D. Ctrl+S"],
          correctIndex: 0,
          answer: "答案：A。Ctrl+T 自由变换。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "Premiere 中分割视频片段的工具是（　）",
          options: ["A. 选择工具", "B. 剃刀工具", "C. 钢笔工具", "D. 抓手工具"],
          correctIndex: 1,
          answer: "答案：B。剃刀工具（C）。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "在效果控件中开启属性动画，应点击（　）",
          options: ["A. 秒表图标", "B. 眼睛图标", "C. 锁图标", "D. 垃圾桶"],
          correctIndex: 0,
          answer: "答案：A。秒表图标开启关键帧。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "去除视频中白色背景应使用（　）特效",
          options: ["A. 颜色键", "B. 亮度与对比度", "C. 模糊", "D. 锐化"],
          correctIndex: 0,
          answer: "答案：A。颜色键去背景。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "带状擦除属于（　）效果",
          options: ["A. 视频过渡", "B. 视频效果", "C. 音频效果", "D. 字幕效果"],
          correctIndex: 0,
          answer: "答案：A。带状擦除是转场效果。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "实现音频淡入淡出的效果是（　）",
          options: ["A. 恒定增益", "B. 颜色键", "C. 带状擦除", "D. 亮度调整"],
          correctIndex: 0,
          answer: "答案：A。恒定增益实现音量渐变。"
        }
      ]
    },
    // ---------- 三、操作步骤题（每题10分，共30分） ----------
    {
      type: "example",
      title: "三、操作步骤题（每题 10 分，共 30 分）",
      items: [
        {
          title: "第1题（10分）",
          difficulty: "medium",
          question: "在 Photoshop 中新建 700×1000 像素、分辨率 72 的画布，命名为\"剪纸\"，并添加从 #a79485 到 #c5b29b 的渐变映射调整图层。请写出完整操作步骤。",
          solution: "**解：**\n① 文件→新建，设置宽度 700 像素、高度 1000 像素、分辨率 72，命名\"剪纸\"，确定；\n② 图层→新建调整图层→渐变映射；\n③ 在渐变映射属性面板点击渐变条，打开渐变编辑器；\n④ 设置渐变色：起点 #a79485，终点 #c5b29b；\n⑤ 确定完成。",
          answer: "新建画布 → 新建调整图层渐变映射 → 设置渐变 #a79485→#c5b29b。"
        },
        {
          title: "第2题（10分）",
          difficulty: "medium",
          question: "在 Premiere 中建立自定义大小 640×360 像素、帧速率 25 的项目，命名为\"剪纸.prproj\"，并将 sucai.mp4 拖入视频 1 轨道 0 秒处。请写出操作步骤。",
          solution: "**解：**\n① 文件→新建→项目，命名\"剪纸\"，选择保存位置；\n② 文件→新建→序列，在设置中自定义帧大小 640×360，帧速率 25；\n③ 保存项目为\"剪纸.prproj\"；\n④ 文件→导入 sucai.mp4；\n⑤ 将 sucai.mp4 从项目面板拖入视频 1 轨道 0 秒处。",
          answer: "新建项目 → 新建序列设 640×360 帧速率 25 → 保存 → 导入素材 → 拖入 V1 轨道。"
        },
        {
          title: "第3题（10分）",
          difficulty: "advanced",
          question: "在 Premiere 中新建字幕，内容\"民间手艺 剪纸\"，隶书，字体大小 65，字距 -10，线性渐变 #FDFDC8 到 #FDC177，并添加阴影。请写出操作步骤。",
          solution: "**解：**\n① 文件→新建→字幕，打开字幕编辑器；\n② 输入文字\"民间手艺 剪纸\"；\n③ 设置字体隶书、字号 65、字距 -10；\n④ 填充类型选线性渐变，颜色 #FDFDC8 到 #FDC177；\n⑤ 勾选阴影并设置参数；\n⑥ 保存字幕为\"字幕.prtl\"。",
          answer: "新建字幕 → 输入文字 → 设隶书 65 字距 -10 → 线性渐变 → 加阴影 → 保存 .prtl。"
        }
      ]
    }
  ]
}
