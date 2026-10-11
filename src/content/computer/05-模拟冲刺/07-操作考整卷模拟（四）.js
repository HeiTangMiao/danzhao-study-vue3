/**
 * 内容页面数据（content-schema 的实例）
 * 页面：操作考整卷模拟（四）
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》编制
 * 结构：模块一 PS 图像处理（75 分）+ 模块二 PR 影视后期（75 分）+ 模块三 网络配置（75 分）
 * 定位：卷（四）为**操作考专项整卷**，三模块全部出在「数媒 + 网络」的操作面上，
 *      与卷（一）（二）（三）考点轮换：PS 侧走抠图/调色/非破坏性编辑，PR 侧走时间线编辑
 *      与统一调色，网络侧走跨网段互联、设备管理配置与改错。
 * 与全库零重复：钢笔抠图、羽化、曲线/色彩平衡调整图层、剪贴蒙版、约束比例、画布大小、
 *      波纹删除、插入/覆盖编辑、节目监视器、嵌套、取消链接、调整图层（PR）、
 *      show mac address-table、trunk allowed vlan、clock rate、show ip interface brief、
 *      ipconfig /renew、/28 掩码等考点均为首次出现。
 */
export default {
  blocks: [
    // ---------- 整卷说明 ----------
    {
      type: "warning",
      text: "整卷说明：本卷为操作考冲刺整卷，共 3 模块 36 题，每模块 75 分（单选 6×5 + 填空 1×5 + 判断 2×5 + 操作简答 3×10）。用时建议：模块一 40 分钟、模块二 40 分钟、模块三 40 分钟，合计约 120 分钟，最后留 10 分钟做交卷检查。交卷前检查清单：① 每个模块的输出文件是否都生成（PS 为 .psd + .jpg，PR 为 .prproj + .mp4，PT 为 .pkt）；② 文件名与扩展名是否与题目要求的完全一致，不得有空格或多余后缀；③ 素材是否先复制到以准考证号命名的考生文件夹再操作；④ 需要「保留图层」的是否存成了 .psd 而非 .jpg；⑤ 网络题的所有接口是否都执行了 no shutdown、配置是否保存；⑥ 成品是否回放确认（画面比例、声音、字幕位置）；⑦ 考试结束不得关闭计算机。"
    },
    // ---------- 模块一：PS 图像处理 ----------
    {
      type: "exam",
      title: "模块一 · PS 图像处理（75 分）",
      duration: 40,
      totalScore: 75,
      passingScore: 45,
      items: [
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 Photoshop 中要沿人物边缘精确抠出主体，希望轮廓平滑、可反复微调后再转为选区，最适合使用的工具是（　）",
          options: ["A. 矩形选框工具", "B. 钢笔工具", "C. 魔棒工具", "D. 裁剪工具"],
          correctIndex: 1,
          answer: "**B。**钢笔工具绘制的是矢量路径，可用锚点与控制柄反复微调轮廓，闭合后按 `Ctrl+回车` 转为选区；魔棒适合纯色背景的快速选取，矩形选框只适合规则形状，裁剪工具用于裁切画布。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "在 Photoshop 中为选区设置「羽化」参数，其作用是（　）",
          options: ["A. 让选区边缘产生柔和过渡，避免边界生硬", "B. 把选区整体放大", "C. 把当前选区反选", "D. 把选区保存为通道"],
          correctIndex: 0,
          answer: "**A。**羽化值越大，选区边缘的过渡带越宽，填充或抠图后边界越柔和；羽化不改变选区范围大小，也不具备反选或存储选区的功能。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "素材 `photo.jpg` 整体偏暗、对比不足，要求在不破坏原图像素的前提下提亮并增强对比，最佳做法是（　）",
          options: ["A. 直接执行「图像 → 调整 → 亮度/对比度」菜单命令", "B. 添加「曲线」调整图层并在其中拖动曲线", "C. 用橡皮擦擦掉画面暗部", "D. 先合并所有图层再执行调整命令"],
          correctIndex: 1,
          answer: "**B。**调整图层属于非破坏性编辑，参数可随时改回、图层可单独删除；直接使用「图像 → 调整」下的菜单命令会直接改写当前图层的像素，关闭文件后无法还原。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 Photoshop 中要对文字图层应用「模糊」类滤镜，必须先做的操作是（　）",
          options: ["A. 栅格化文字图层", "B. 复制一份图层", "C. 添加图层蒙版", "D. 合并可见图层"],
          correctIndex: 0,
          answer: "**A。**文字图层属于矢量图层，滤镜只能作用于像素，必须先「栅格化」转为普通像素图层才能加滤镜；注意栅格化后不能再直接修改文字内容与字体，因此建议先复制一份文字图层作备份。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在「图像大小」对话框中勾选「约束比例」（锁链图标），其作用是（　）",
          options: ["A. 改动宽度时高度按原比例同步变化，图像不变形", "B. 锁定像素总数不变", "C. 锁定分辨率不变", "D. 同时改变画布大小"],
          correctIndex: 0,
          answer: "**A。**约束比例保持宽高比，只改一边时另一边自动换算；取消勾选后可分别设定宽高，但画面会被拉伸变形，是「图被拉扁/拉长」类失分的典型原因。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "要在图像四周各增加 100 像素的白色留白，且不缩放画面内容，应使用（　）",
          options: ["A. 图像 → 图像大小", "B. 图像 → 画布大小", "C. Ctrl+T 自由变换", "D. 裁剪工具"],
          correctIndex: 1,
          answer: "**B。**「画布大小」只改变画布范围，原有图像内容尺寸不变，新增区域按背景色填充；「图像大小」会重采样并整体缩放画面内容，自由变换只作用于当前图层。"
        },
        {
          difficulty: "medium",
          type: "fill",
          score: 5,
          question: "补全操作：在 Photoshop 中用钢笔工具勾好闭合路径后，按 `Ctrl + ______` 可把路径载入选区；若要把当前选区保存下来供以后反复调用，应执行「选择 → 存储选区」，选区会保存在______面板中。",
          answer: "`回车（Enter）`；`通道`。路径转选区的快捷键是 `Ctrl+回车`；存储的选区以 Alpha 通道形式保存在「通道」面板，之后按住 `Ctrl` 单击该通道缩览图即可重新载入选区。"
        },
        {
          difficulty: "medium",
          type: "judge",
          score: 5,
          question: "判断：在 Photoshop 中执行「图像 → 调整 → 亮度/对比度」菜单命令，会直接改变当前图层的像素值，属于破坏性编辑。",
          answer: "**正确。**菜单式调整命令直接改写当前图层像素，关闭文件后不能还原；若需要反复修改，应改用「亮度/对比度」或「曲线」调整图层，它属于非破坏性编辑。"
        },
        {
          difficulty: "medium",
          type: "judge",
          score: 5,
          question: "判断：执行「图像 → 画布大小」并把尺寸调大后，画面中的图像内容会随之等比放大。",
          answer: "**错误。**「画布大小」只扩展或裁切画布范围，图像内容本身尺寸不变，新增区域按背景色填充；要整体缩放画面内容应使用「图像大小」或自由变换。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "任务：把素材 `zhengjian.jpg`（蓝底证件照）处理成白底证件照。要求：人物边缘干净、不破坏原图；输出 `zhengjian_ok.psd`（保留图层与蒙版）与 `zhengjian_ok.jpg` 两个文件。请写出完整操作步骤。",
          answer: "答案：① 打开 `zhengjian.jpg`，在图层面板双击「背景」图层，解锁为「图层 0」；② 新建图层并拖到「图层 0」下方，编辑 → 填充 → 颜色填 #FFFFFF（或白色）；③ 选中「图层 0」，用魔棒工具（容差 30 左右、勾选「连续」）点选蓝色背景，再执行「选择 → 修改 → 羽化」设 1~2 像素使边缘柔和；④ 保持选区，点击图层面板底部「添加图层蒙版」按钮，选区自动转为蒙版，蓝色背景被隐藏并露出下方白色图层；⑤ 放大到 200% 用黑色柔边画笔补涂残余蓝边，误涂到人物则切换前景色为白色擦回；⑥ 文件 → 存储为 `zhengjian_ok.psd` 保留图层，再执行「文件 → 导出 → 导出为（或存储为副本）」输出 `zhengjian_ok.jpg`。\n验收点：① 源文件为 .psd 且图层、蒙版齐全；② 背景为纯白 #FFFFFF；③ 头发与肩部边缘无蓝边残留。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "任务：制作「校园技能节」竖版海报。要求：新建 750×1000 像素、分辨率 72 像素/英寸、RGB 模式、背景内容为白色的文档；置入素材 `bg.jpg` 并铺满画布；用横排文字工具添加主标题「校园技能节」，黑体、字号 72 点、颜色 #1e2d4c，并为文字图层添加投影（距离 5 像素、大小 10 像素）；最后保存 `poster.psd` 与 `poster.jpg`。请写出完整操作步骤。",
          answer: "答案：① 文件 → 新建，宽度 750 像素、高度 1000 像素、分辨率 72 像素/英寸、颜色模式 RGB、背景内容白色，确定；② 文件 → 置入嵌入对象，选中 `bg.jpg`，按住 Shift 拖动角点等比例放大至铺满画布，回车确认；③ 选横排文字工具（快捷键 T），在画面上方单击并输入「校园技能节」；④ 在选项栏或「字符」面板设字体为黑体、字号 72 点，点击颜色色块在拾色器中输入 `#1e2d4c` 并确定；⑤ 双击文字图层空白处打开「图层样式」，勾选「投影」，设距离 5 像素、大小 10 像素，其余保持默认，确定；⑥ 文件 → 存储为 `poster.psd`，再导出一份 `poster.jpg`（品质 10~12）。\n验收点：① 文档尺寸 750×1000、分辨率 72、RGB；② 主标题字体黑体、字号 72 点、颜色 #1e2d4c；③ 投影距离 5、大小 10；④ `poster.psd` 与 `poster.jpg` 两个文件齐全。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "任务：`photo.jpg` 中人物偏暗且整体偏黄。要求：用「曲线」调整图层提亮并拉开对比，用「色彩平衡」调整图层校正偏黄，且两个调整效果**只作用于人物图层**、不影响背景；最后保留图层另存为 `photo_ok.psd`。请写出完整操作步骤。",
          answer: "答案：① 打开 `photo.jpg`，确认人物与背景分处两个图层（若只有一个图层，先复制一份，分别命名「人物」「背景」并调整上下顺序）；② 选中「人物」图层，点击图层面板底部「创建新的填充或调整图层」→「曲线」，在属性面板中把曲线中点向上拖动提亮、左下角略向下压加深暗部，形成 S 形以拉开对比；③ 再添加「色彩平衡」调整图层，在「中间调」下把黄色—蓝色滑块向蓝色方向拖动，抵消偏黄；④ 分别选中这两个调整图层，执行「图层 → 创建剪贴蒙版」（或按 `Ctrl+Alt+G`），调整图层缩览图左侧出现向下箭头，效果即被限定只作用于下方的人物图层；⑤ 可随时双击调整图层图标改参数，原图像素始终未被破坏；⑥ 文件 → 存储为 `photo_ok.psd`。\n验收点：① 使用了「曲线」+「色彩平衡」两个调整图层；② 两个调整图层都创建了剪贴蒙版（缩览图左侧有向下箭头）；③ 背景不受调色影响；④ 输出为 .psd 且图层保留。"
        }
      ]
    },
    // ---------- 模块二：PR 影视后期 ----------
    {
      type: "exam",
      title: "模块二 · PR 影视后期（75 分）",
      duration: 40,
      totalScore: 75,
      passingScore: 45,
      items: [
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 Premiere 时间线上以「插入」方式把一段素材放到播放头位置，结果是（　）",
          options: ["A. 覆盖掉该位置原有的画面", "B. 该位置及其之后的所有片段整体向后移动，让出空位", "C. 该位置原有的片段被删除", "D. 素材只能加在序列末尾，不影响其他片段"],
          correctIndex: 1,
          answer: "**B。**插入（Insert）会把播放头之后的所有片段整体后移为新素材让位；覆盖（Overwrite）才是直接盖掉该位置的原有画面。两种方式都不会删除素材本身。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 Premiere 时间线上要删除某段片段，并让后面的片段自动前移填补空隙，应使用（　）",
          options: ["A. 选中片段后按 Delete", "B. 选中片段后按 Shift+Delete（波纹删除）", "C. 选中片段后按 Ctrl+X", "D. 使用「提升（Lift）」命令"],
          correctIndex: 1,
          answer: "**B。**波纹删除在删除片段的同时把后续片段整体前移、闭合空隙；普通 Delete 与「提升」都只删除内容并留下一段黑场空隙。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "Premiere 中「节目监视器」的作用是（　）",
          options: ["A. 预览时间线上各轨道合成后的最终画面", "B. 预览项目面板中单个素材的原始内容", "C. 显示项目文件的保存路径", "D. 调整素材的音量电平"],
          correctIndex: 0,
          answer: "**A。**节目监视器显示时间线的合成结果，用于预览成片；源监视器才是用来预览和打点裁剪单个素材的，两者的分工是操作考的常考区分点。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "新建序列时把「帧大小」设为 1920×1080，而素材实际分辨率只有 1280×720，直接拖入时间线最可能出现（　）",
          options: ["A. 画面被放大后出现黑边或被裁切，且清晰度下降", "B. 音频轨道丢失", "C. 无法导出任何文件", "D. 素材时长自动变短"],
          correctIndex: 0,
          answer: "**A。**序列帧大小决定画布尺寸：素材分辨率低于序列时会被放大而变虚，宽高比不一致时会出现黑边或被裁切；可右键素材选「缩放为帧大小」快速适配。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "Premiere 保存的项目（工程）文件，其扩展名是（　）",
          options: ["A. `.mp4`", "B. `.prproj`", "C. `.prtl`", "D. `.psd`"],
          correctIndex: 1,
          answer: "**B。**工程文件为 `.prproj`，只记录素材引用与编辑信息，不含媒体数据本身；`.prtl` 是字幕文件，`.mp4` 是导出成品，`.psd` 是 Photoshop 源文件。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 Premiere 中希望把多个片段组合成一个整体，以便统一添加同一个效果或统一移动位置，应使用（　）",
          options: ["A. 把相关片段全部锁定", "B. 选中后右键「嵌套」生成嵌套序列", "C. 全部放到同一轨道并删掉空隙", "D. 对每个片段分别添加相同效果"],
          correctIndex: 1,
          answer: "**B。**执行「嵌套」后生成一段嵌套序列，对它添加效果等于对内部所有片段生效，且可整体移动；双击嵌套序列可随时进入修改内部内容。"
        },
        {
          difficulty: "medium",
          type: "fill",
          score: 5,
          question: "完成操作填空：在 Premiere 时间线中要单独移动某个片段的视频部分而保持音频位置不动，应先右键单击该片段选择______解除视音频关联；解除后按住______键再拖动，即可只移动视频或只移动音频。",
          answer: "`取消链接（Unlink）`；`Alt`。默认状态下视频与音频是链接的、会一起移动；执行「取消链接」后二者分离，按住 `Alt` 再拖动可只移动其中一部分，避免误拖造成声画不同步。"
        },
        {
          difficulty: "medium",
          type: "judge",
          score: 5,
          question: "判断：在 Premiere 时间线上删除某个片段后，项目面板中引用的源素材文件也会一并从磁盘上删除。",
          answer: "**错误。**时间线上的片段只是对磁盘素材的引用，删除片段只移除引用，磁盘上的原始素材完好无损，项目面板中仍可再次拖用。"
        },
        {
          difficulty: "medium",
          type: "judge",
          score: 5,
          question: "判断：在 Premiere 的「导出设置」窗口中取消勾选「导出音频」后，生成的视频文件将没有声音。",
          answer: "**正确。**「导出视频」与「导出音频」是两个独立选项，取消勾选音频后成品无声；交卷前必须完整回放一遍确认声音正常，这是操作考最常见的漏分项之一。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "任务：用素材 `sucai2.mp4`（时长约 20 秒）制作一段 12 秒短片并导出。要求：① 新建序列「技能节」，帧大小 1280×720、帧速率 25fps；② 把 `sucai2.mp4` 放到 V1 轨道 0 秒处；③ 用剃刀工具在 12 秒处切断并删除后面的部分（后面不留空隙）；④ 在 0~1 秒给音频添加淡入；⑤ 导出 `技能节.mp4`（H.264，1280×720，25fps，含音频）。请写出完整操作步骤。",
          answer: "答案：① 文件 → 新建 → 序列，名称填「技能节」，在「设置」页把帧大小设为 1280×720（水平 1280、垂直 720）、帧速率 25 帧/秒，确定；② 在项目面板把 `sucai2.mp4` 拖到 V1 轨道的 0 秒位置；③ 按 `C` 切换到剃刀工具，把播放头移到 12 秒处单击切断，选中 12 秒之后的片段按 `Shift+Delete`（波纹删除），后面不留黑场空隙；④ 展开 A1 轨道，选中音频片段，在「效果控件」中添加「恒定增益」效果，在 0 秒处把级别设为最低、1 秒处设为 0 dB，形成淡入；⑤ 文件 → 导出 → 媒体（Ctrl+M），格式选 H.264，确认帧大小 1280×720、帧速率 25，勾选「导出音频」，输出名称填 `技能节.mp4`，点击导出。\n验收点：① 帧大小 1280×720、帧速率 25；② 成片时长 12 秒且无黑场空隙；③ 开头 1 秒音频淡入；④ 格式为 H.264/mp4 且含音频。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "任务：为 1280×720 的短片制作片头字幕动画。要求：① 新建字幕「匠心筑梦」，黑体、字号 90、字距 10、填充 #FFFFFF、黑色描边；② 放到 V2 轨道 0 秒处，持续 4 秒；③ 用「运动 → 位置」关键帧实现从画面左侧飞入：0 秒 x=200，2 秒 x=640（y 保持居中不变）；④ 3~4 秒不透明度由 100% 渐变为 0% 实现淡出。请写出完整操作步骤。",
          answer: "答案：① 文件 → 新建 → 旧版标题（字幕），名称填「匠心筑梦」；② 用文字工具输入「匠心筑梦」，在属性区设字体黑体、字号 90、字距 10，填充色设为 #FFFFFF，勾选并添加黑色描边，关闭字幕窗口；③ 从项目面板把字幕拖到 V2 轨道 0 秒处，把片段末端拖到 4 秒；④ 选中该片段打开「效果控件」，展开「运动」，播放头移到 0 秒并点击「位置」前的秒表开启关键帧，设 x=200、y=360；再把播放头移到 2 秒设 x=640、y=360，形成飞入动画；⑤ 播放头移到 3 秒点击「不透明度」前的秒表设 100%，移到 4 秒设 0%，形成淡出；⑥ 按空格键预览，确认字幕居中且不越出动作安全框。\n验收点：① 字幕黑体、字号 90、字距 10、填充 #FFFFFF 且有黑色描边；② 位置关键帧 0 秒 x=200、2 秒 x=640；③ 不透明度 3 秒 100% → 4 秒 0%；④ 字幕片段时长 4 秒。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "任务：给整段 30 秒成片统一添加「提亮 + 暗角」效果。要求：不改动任何原有片段，在 V2 轨道新建一个覆盖全片（0~30 秒）的调整图层，对其添加「亮度与对比度」（亮度 10、对比度 15）与「暗角」效果，并说明这种做法相对逐片段添加效果的好处。请写出完整操作步骤。",
          answer: "答案：① 在项目面板点击「新建项」→「调整图层」，参数与序列保持一致（1280×720、25fps），确定；② 把调整图层拖到 V2 轨道 0 秒处，右端拖到 30 秒，确保完整覆盖全片；③ 选中调整图层，在「效果」面板搜索「亮度与对比度」并拖入其效果控件，设亮度 10、对比度 15；④ 再搜索「暗角」效果拖入，适当调整数量与羽化值；⑤ 好处：一是效果统一作用于其下方所有轨道的画面，新增或替换片段时无需重复添加；二是参数集中在一处，便于整体修改与统一风格；三是完全不改动原有片段，避免逐片段操作造成的遗漏与不一致；⑥ 空格键预览后保存项目。\n验收点：① 调整图层位于最上层轨道且时长覆盖全片；② 亮度 10、对比度 15；③ 说明「统一作用、便于修改、不破坏原片段」三点。"
        }
      ]
    },
    // ---------- 模块三：网络配置 ----------
    {
      type: "exam",
      title: "模块三 · 网络配置（75 分）",
      duration: 40,
      totalScore: 75,
      passingScore: 45,
      items: [
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在交换机特权模式下，查看 MAC 地址表（端口与 MAC 地址对应关系）的命令是（　）",
          options: ["A. `show mac address-table`", "B. `show ip route`", "C. `show vlan brief`", "D. `show running-config`"],
          correctIndex: 0,
          answer: "**A。**`show mac address-table` 查看交换机学习到的 MAC 地址与端口的对应关系；`show ip route` 是路由表，`show vlan brief` 是 VLAN 与端口归属，`show running-config` 是当前运行配置。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "交换机端口 Fa0/24 已配置为 trunk，若要只允许 VLAN 10 和 VLAN 20 的数据通过该 trunk，应执行的命令是（　）",
          options: ["A. `switchport mode access`", "B. `switchport trunk allowed vlan 10,20`", "C. `switchport access vlan 10`", "D. `switchport trunk encapsulation dot1q`"],
          correctIndex: 1,
          answer: "**B。**`switchport trunk allowed vlan 10,20` 用于限制 trunk 上允许通过的 VLAN（默认允许全部）；`switchport mode access` 会把端口改回接入模式，`switchport access vlan` 是给接入端口划分 VLAN 的命令。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "某主机 IP 地址为 172.16.8.20，子网掩码为 255.255.0.0，它所在网络的网络地址是（　）",
          options: ["A. 172.16.0.0", "B. 172.0.0.0", "C. 172.16.8.0", "D. 172.16.255.255"],
          correctIndex: 0,
          answer: "**A。**掩码 255.255.0.0 表示前 16 位为网络位，把主机位（后 16 位）全部置 0 得网络地址 172.16.0.0；172.16.255.255 是该网络的广播地址，不能分配给主机。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "客户机设置为「自动获得 IP 地址」后，若想立刻释放当前租约并重新向 DHCP 服务器申请地址，应执行的命令是（　）",
          options: ["A. `ipconfig /all`", "B. `ipconfig /release` 后再执行 `ipconfig /renew`", "C. `ping 192.168.1.1`", "D. `tracert 192.168.1.1`"],
          correctIndex: 1,
          answer: "**B。**`/release` 释放当前租约，`/renew` 重新向 DHCP 服务器申请；`ipconfig /all` 只用于查看配置，`ping` 测连通性，`tracert` 跟踪数据包经过的路径。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "子网前缀长度 /28 对应的点分十进制子网掩码是（　）",
          options: ["A. 255.255.255.0", "B. 255.255.255.192", "C. 255.255.255.240", "D. 255.255.255.248"],
          correctIndex: 2,
          answer: "**C。**/28 表示前 28 位为网络位，最后一段为 11110000 = 240，即 255.255.255.240；主机位剩 4 位，每个子网可用主机数为 2^4−2 = 14 台。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在路由器特权模式下，想快速查看所有接口的 IP 地址与物理/协议状态摘要，应使用的命令是（　）",
          options: ["A. `show ip interface brief`", "B. `show ip route`", "C. `show version`", "D. `show cdp neighbors`"],
          correctIndex: 0,
          answer: "**A。**`show ip interface brief` 以表格列出各接口的 IP 地址与 up/down 状态，是配置完接口后的首选自检命令；`show ip route` 看路由表，`show version` 看 IOS 版本与寄存器值。"
        },
        {
          difficulty: "advanced",
          type: "fill",
          score: 5,
          question: "完成命令填空（两台路由器通过串口背靠背互联，本端为 DCE）：\n`RA(config)#______ s0/0/0`（进入串行接口）\n`RA(config-if)#ip address 10.0.12.1 255.255.255.0`（配置 IP）\n`RA(config-if)#______ ______ 64000`（DCE 端必须配置时钟频率）\n`RA(config-if)#no ______`（开启接口）",
          answer: "`interface`；`clock rate`；`shutdown`。进入接口用 `interface 接口名`；DCE 一端必须配 `clock rate 64000`，否则链路协议层会处于 down 状态；配完 IP 必须执行 `no shutdown`，否则接口处于 administratively down 状态无法转发数据。"
        },
        {
          difficulty: "medium",
          type: "judge",
          score: 5,
          question: "判断：在 Windows 命令行中执行 `ipconfig /all`，只能看到 IP 地址和子网掩码，看不到本机网卡的 MAC（物理）地址。",
          answer: "**错误。**`ipconfig /all` 会输出完整配置，包括网卡的物理地址（Physical Address，即 MAC 地址）、IP 地址、子网掩码、默认网关、DNS 服务器与 DHCP 信息等。"
        },
        {
          difficulty: "medium",
          type: "judge",
          score: 5,
          question: "判断：把两台 PC 的 IP 分别设为 192.168.1.10/24 与 192.168.2.10/24 后直接相连，它们不在同一网段，互相 ping 不通。",
          answer: "**正确。**/24 掩码下两者的网络地址分别为 192.168.1.0 与 192.168.2.0，属不同网段；跨网段通信必须由三层设备（路由器或三层交换机）转发，且主机要正确配置网关。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "任务：在 PacketTracer 中搭建跨网段网络并调通。拓扑：PC1、PC2 接交换机 SWA，PC3 接交换机 SWB，SWA 与 SWB 分别接路由器 R1 的 f0/0 与 f0/1。要求：PC1=192.168.1.10/24、PC2=192.168.1.11/24（网关 192.168.1.254），PC3=192.168.2.10/24（网关 192.168.2.254）；R1 的 f0/0 配 192.168.1.254/24、f0/1 配 192.168.2.254/24；最后用 PC1 ping 通 PC3。请写出完整操作步骤与关键命令。",
          answer: "答案：① 从设备区拖入 3 台 PC、2 台 2960 交换机、1 台 2911 路由器，用直通线连接 PC—交换机、交换机—路由器；② 依次打开 PC1、PC2 的 Desktop → IP Configuration，填 IP、子网掩码 255.255.255.0、默认网关 192.168.1.254；PC3 填 192.168.2.10 / 255.255.255.0 / 网关 192.168.2.254；③ 在 R1 的 CLI 中配置：\n```\nR1> enable\nR1# configure terminal\nR1(config)# interface f0/0\nR1(config-if)# ip address 192.168.1.254 255.255.255.0\nR1(config-if)# no shutdown\nR1(config-if)# exit\nR1(config)# interface f0/1\nR1(config-if)# ip address 192.168.2.254 255.255.255.0\nR1(config-if)# no shutdown\nR1(config-if)# end\nR1# show ip interface brief\n```\n④ 在 PC1 的 Desktop → Command Prompt 先执行 `ping 192.168.1.254` 验证到网关，再执行 `ping 192.168.2.10` 验证跨网段；⑤ 保存工程为 .pkt 文件。\n验收点：① 两个接口都执行了 `no shutdown`，`show ip interface brief` 中两接口均为 up/up；② 三台 PC 的网关填写正确且指向路由器对应接口；③ PC1 能 ping 通 PC3；④ 工程保存为 .pkt。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "任务：在交换机 SWA 上完成基本管理配置，使其可被远程管理，且重启后配置不丢失。要求：① 设备名改为 SWA；② 特权模式加密口令设为 `admin123`；③ 配置管理 IP 192.168.1.200/24 与默认网关 192.168.1.1；④ 保存配置。请写出完整命令序列。",
          answer: "答案：\n```\nSwitch> enable\nSwitch# configure terminal\nSwitch(config)# hostname SWA\nSWA(config)# enable secret admin123\nSWA(config)# interface vlan 1\nSWA(config-if)# ip address 192.168.1.200 255.255.255.0\nSWA(config-if)# no shutdown\nSWA(config-if)# exit\nSWA(config)# ip default-gateway 192.168.1.1\nSWA(config)# end\nSWA# copy running-config startup-config\n```\n说明：① 二层交换机通过 VLAN 1 的 SVI 接口获得管理 IP，配完要 `no shutdown`，否则管理接口不可用；② `ip default-gateway` 让交换机能被非本网段的管理主机访问；③ `copy running-config startup-config`（或 `write`）把运行配置写入启动配置，否则断电重启后配置全部丢失。\n验收点：设备名为 SWA、`enable secret` 设置加密口令、管理 IP 192.168.1.200/24、默认网关 192.168.1.1、最后执行了保存命令。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "改错题：某考生想把交换机端口 Fa0/1 划入 VLAN 10，输入了以下命令，结果 Fa0/1 并未真正成为 VLAN 10 的成员。请指出错误原因、写出正确命令，并给出验证方法。\n```\nSwitch(config)# vlan 10\nSwitch(config-vlan)# exit\nSwitch(config)# interface f0/1\nSwitch(config-if)# switchport mode trunk\nSwitch(config-if)# switchport access vlan 10\n```",
          answer: "答案：① 错误原因：端口被设成了 trunk 模式。trunk 端口用于承载多个 VLAN 的带标签数据，在 trunk 模式下 `switchport access vlan 10` 不生效，端口不会成为 VLAN 10 的成员；连接终端的端口必须先设为 access 模式，再划分 VLAN。\n② 正确命令：\n```\nSwitch(config)# interface f0/1\nSwitch(config-if)# switchport mode access\nSwitch(config-if)# switchport access vlan 10\nSwitch(config-if)# end\nSwitch# show vlan brief\n```\n③ 验证方法：执行 `show vlan brief`，在 VLAN 10 一行应能看到 Fa0/1；若端口仍列在 VLAN 1 下，说明划分未生效。\n验收点：① 指出「trunk 模式下 access vlan 无效，必须先执行 switchport mode access」；② 给出正确的两行命令；③ 用 `show vlan brief` 验证端口归属。"
        }
      ]
    },
    // ---------- 整卷速记 ----------
    {
      type: "summary",
      title: "整卷速记 · 三模块高频卡点",
      points: [
        "PS 侧：抠图首选钢笔（路径可微调，Ctrl+回车转选区），纯色背景用魔棒；选区一律先羽化 1~2 像素再出图，边缘才不生硬。",
        "PS 侧：凡要求「保留图层 / 可继续编辑」的一律存 .psd，另存一份 .jpg 作成品，两个文件都要交。",
        "PR 侧：序列帧大小与帧速率按题目要求先行设定，素材分辨率不匹配时用「缩放为帧大小」适配，避免黑边与裁切。",
        "PR 侧：删片段用 Shift+Delete（波纹删除）才不留黑场；加新片段分清「插入」（后移）与「覆盖」（盖住）两种编辑方式。",
        "网络侧：接口配完 IP 必须 `no shutdown`；串口互联时 DCE 端必须配 `clock rate`，否则链路协议层 down。",
        "网络侧：端口划 VLAN 的正确顺序是 `switchport mode access` → `switchport access vlan 编号`；trunk 模式下 access vlan 无效。",
        "网络侧：所有配置最后必须 `copy running-config startup-config`（或 write）保存，否则重启即失效。"
      ],
      formulas: [
        "可用主机数 = 2^{主机位数} - 2（减去网络地址与广播地址）",
        "网络地址 = IP 地址 与 子网掩码 逐位相与（主机位全置 0）"
      ],
      mustKnow: [
        "PS 破坏性 vs 非破坏性：菜单式「图像 → 调整」直接改像素，调整图层不改像素、可随时改参数。",
        "PS「图像大小」缩放画面内容，「画布大小」只改画布范围、内容尺寸不变。",
        "PR 项目文件是 .prproj（工程），字幕文件是 .prtl，成品是 .mp4，三者不要混淆。",
        "PR 导出设置中「导出视频」与「导出音频」是独立选项，取消音频则成品无声。",
        "PR 调整图层统一作用于其下方所有轨道，是给全片统一调色的最佳做法。",
        "网络排障口诀：先看接口 `show ip interface brief`（是否 up/up），再看地址与网关，最后 ping 逐级验证。",
        "Windows 网络命令：`ipconfig /all` 看全部配置（含 MAC 地址），`/release` + `/renew` 重新申请 DHCP 地址。"
      ]
    }
  ]
}
