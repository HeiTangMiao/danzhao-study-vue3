/**
 * 内容页面数据（content-schema 的实例）
 * 页面：数字媒体技术 · 复习测验
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》数字媒体技术应用技能模块编制
 * 补充：附录含理论考「数字媒体技术」概念考点补充练习（供理论考自测，不计入上卷 100 分）
 */
export default {
  blocks: [
    // ---------- 测验信息说明 ----------
    {
      type: "warning",
      text: "建议用时 45 分钟，满分 100 分（文末另附理论考点补充练习，不计入 100 分）。请先独立作答，再点击「查看答案」核对解析。本测验覆盖 Photoshop 与 Premiere 常用操作，并含理论考「数字媒体技术」概念考点。"
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
          question: "视频帧速率越高，画面越流畅，但同等时长下文件通常也越大。",
          answer: "**正确。**帧速率决定每秒画面张数：越高越流畅，数据量也相应增加。"
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
          question: "在 Photoshop 中要将当前选区反选，应执行（　）",
          options: ["A. 选择 → 全选", "B. 选择 → 反选", "C. 选择 → 取消选择", "D. 选择 → 修改 → 羽化"],
          correctIndex: 1,
          answer: "答案：B。「选择 → 反选」（Ctrl+Shift+I）用于选中原选区之外的部分。"
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
          question: "要让文字以选区形式出现（而非新建文字图层），应使用（　）",
          options: ["A. 横排文字工具", "B. 文字蒙版工具", "C. 直排文字工具", "D. 油漆桶工具"],
          correctIndex: 1,
          answer: "答案：B。文字蒙版工具输入的文字直接成为选区，可用于填充或剪裁。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "在 Photoshop 中「通过拷贝的图层」的快捷键是（　）",
          options: ["A. Ctrl+J", "B. Ctrl+E", "C. Ctrl+D", "D. Ctrl+T"],
          correctIndex: 0,
          answer: "答案：A。Ctrl+J 复制当前图层；Ctrl+E 向下合并；Ctrl+D 取消选择；Ctrl+T 自由变换。"
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
          question: "要让两个相邻视频片段之间平滑过渡，应添加（　）",
          options: ["A. 视频过渡（如交叉溶解）", "B. 视频效果（如颜色键）", "C. 音频过渡", "D. 字幕"],
          correctIndex: 0,
          answer: "答案：A。片段之间的切换用视频过渡；颜色键属于抠像效果，不改变片段衔接。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "下列属于 Premiere「视频效果」（而非转场）的是（　）",
          options: ["A. 交叉溶解", "B. 带状擦除", "C. 颜色键", "D. 黑场过渡"],
          correctIndex: 2,
          answer: "答案：C。颜色键是抠像类的视频效果；交叉溶解、带状擦除、黑场过渡都是转场。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "在 Premiere 中整体调整片段音量（如统一降低 6 dB），应使用（　）",
          options: ["A. 音频增益", "B. 恒定增益", "C. 交叉溶解", "D. 降噪"],
          correctIndex: 0,
          answer: "答案：A。音频增益用于整体加减分贝；恒定增益是音频过渡，用于淡入淡出。"
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
    },
    // ---------- 四、理论考点补充练习（供理论考自测，不计入上卷 100 分） ----------
    {
      type: "quiz",
      title: "四、理论考点补充练习（供理论考自测，不计入上卷 100 分）",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "位图图像放大后会出现马赛克现象，而矢量图放大后不会失真。",
          answer: "**正确。**位图由像素点组成、放大会出现锯齿；矢量图由数学公式描述、缩放不失真。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "MIDI 格式记录的是真实声音的波形数据。",
          answer: "**错误。**MIDI 记录的是演奏指令（音高、时长、力度等），不是声音波形本身；WAV 等格式才记录波形。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "为印刷品准备图像时，通常应使用 CMYK 色彩模式。",
          answer: "**正确。**印刷用 CMYK（青、品红、黄、黑），屏幕显示用 RGB——这是高频考点。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "下列不属于数字媒体的是（　）",
          options: ["A. 数字照片", "B. 纸质书籍", "C. 数字视频", "D. 数字音频"],
          correctIndex: 1,
          answer: "答案：B。纸质书籍以纸张为载体，不是数字（二进制）形式；其余三项都是典型数字媒体。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "视频每秒播放的画面张数称为（　）",
          options: ["A. 分辨率", "B. 帧率", "C. 码率", "D. 采样率"],
          correctIndex: 1,
          answer: "答案：B。帧率（fps）是每秒播放的帧数；采样率是音频参数，分辨率指画面尺寸。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "关于数字媒体作品的创作流程，正确的顺序是（　）",
          options: [
            "A. 素材准备 → 需求分析 → 制作合成 → 设计构思 → 测试输出",
            "B. 需求分析 → 设计构思 → 素材准备 → 制作合成 → 测试输出",
            "C. 设计构思 → 需求分析 → 制作合成 → 素材准备 → 测试输出",
            "D. 需求分析 → 制作合成 → 设计构思 → 素材准备 → 测试输出"
          ],
          correctIndex: 1,
          answer: "答案：B。先需求分析、再设计构思、然后备素材、制作合成，最后测试输出。"
        }
      ]
    }
  ]
}
