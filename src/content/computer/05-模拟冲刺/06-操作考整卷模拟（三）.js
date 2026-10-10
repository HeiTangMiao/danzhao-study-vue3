/**
 * 内容页面数据（content-schema 的实例）
 * 页面：操作考整卷模拟（三）
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》编制
 * 结构：必考模块（程序设计技能 75 分）+ 选考模块（网络技术 / 数字媒体 各 75 分）
 * 定位：以「操作简答（solve）」为主，直击「会做但做不全」的主要失分形态
 * 与卷（一）（二）零重复：考点轮换到字典/列表/文件/字符串、子网划分/静态路由/PT 操作、
 *          图层蒙版/混合模式/时间线/导出参数等未覆盖内容
 */
export default {
  blocks: [
    // ---------- 考试说明 ----------
    {
      type: "warning",
      text: "考试说明：① 考试前新建以准考证号为名称的考生文件夹，素材先复制进考生文件夹再操作；② 答题过程中随做随存（Ctrl+S），重大步骤后另存备份；③ 提交前逐项核对每个文件名、扩展名与内容是否齐全；④ 考试结束不得关闭计算机。满分 150 分，必考 75 分 + 选考 75 分，各模块 45 分及以上合格。"
    },
    // ---------- 必考模块：程序设计技能 ----------
    {
      type: "exam",
      title: "必考模块 · 程序设计技能（75 分）",
      duration: 45,
      totalScore: 75,
      passingScore: 45,
      items: [
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "执行以下代码，输出结果是（　）\n```\nd = {\"语文\": 90, \"数学\": 85}\nprint(d[\"数学\"])\n```",
          options: ["A. 85", "B. 90", "C. 数学", "D. 程序报错"],
          correctIndex: 0,
          answer: "答案：A。字典按「键」取值，`d[\"数学\"]` 取出对应的值 85。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "向列表 `nums` 的末尾追加一个元素 7，应使用（　）",
          options: ["A. `nums.add(7)`", "B. `nums.append(7)`", "C. `nums.push(7)`", "D. `nums.insert(7)`"],
          correctIndex: 1,
          answer: "答案：B。Python 列表用 `append()` 追加到末尾；`add` 是集合的方法，`push` 是其他语言的写法，`insert` 需指定插入位置。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "执行 `print(len(\"hello\"))` 的输出结果是（　）",
          options: ["A. 4", "B. 5", "C. hello", "D. 程序报错"],
          correctIndex: 1,
          answer: "答案：B。`len()` 返回序列长度，字符串 `\"hello\"` 共 5 个字符。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "以「写入」方式打开文件（会清空原内容），open 函数的 mode 参数应填（　）",
          options: ["A. `\"r\"`", "B. `\"w\"`", "C. `\"rb\"`", "D. `\"a+\"`"],
          correctIndex: 1,
          answer: "答案：B。`\"w\"` 为写入模式（文件不存在则创建、存在则清空）；`\"r\"` 只读，`\"a\"` 追加不清空。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "执行以下代码，输出结果是（　）\n```\ns = \"Python\"\nprint(s[0:2])\n```",
          options: ["A. Py", "B. Pyt", "C. thon", "D. P"],
          correctIndex: 0,
          answer: "答案：A。切片 `[0:2]` 含头不含尾，取下标 0、1 两个字符，即 `Py`。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "执行以下代码，输出结果是（　）\n```\nnums = [1, 2, 3, 4]\ntotal = 0\nfor n in nums:\n    total += n\nprint(total)\n```",
          options: ["A. 4", "B. 10", "C. 1234", "D. 24"],
          correctIndex: 1,
          answer: "答案：B。依次累加 1+2+3+4=10；`for n in nums` 逐个取出列表元素。"
        },
        {
          difficulty: "medium",
          type: "fill",
          score: 5,
          question: "补全代码，读取 data.txt 的全部内容并打印：\n```\nf = open(\"data.txt\", \"r\")\nprint(f.______())\nf.close()\n```",
          answer: "答案：`read`。`f.read()` 读取文件全部内容；读取一行用 `readline()`，读取所有行到列表用 `readlines()`。"
        },
        {
          difficulty: "basic",
          type: "judge",
          score: 5,
          question: "判断：Python 中列表和字符串的下标都从 0 开始计数。",
          answer: "**正确。**列表、字符串等序列的下标均从 0 开始，第一个元素或字符的下标为 0。"
        },
        {
          difficulty: "medium",
          type: "judge",
          score: 5,
          question: "判断：Python 字典用数字下标来存取元素，例如 `d[0]` 表示取字典的第一个元素。",
          answer: "**错误。**字典按「键」存取元素，`d[0]` 只有当键 `0` 存在时才有效；用数字下标访问是列表、字符串等序列的用法。"
        },
        {
          difficulty: "medium",
          type: "solve",
          score: 10,
          question: "编写程序：从键盘循环输入 5 个整数存入列表，输出其中的最大值、最小值与平均值（平均值保留 1 位小数）。请写出完整代码。",
          answer: "答案：\n```\nnums = []\nfor i in range(5):\n    nums.append(int(input(\"请输入第 %d 个整数：\" % (i + 1))))\nprint(\"最大值：\", max(nums))\nprint(\"最小值：\", min(nums))\nprint(\"平均值：\", round(sum(nums) / len(nums), 1))\n```\n验收点：① 用 `append` 逐个收集 5 个数；② 正确使用 `max`/`min`/`sum`/`len` 内置函数；③ 平均值用 `round(..., 1)` 保留 1 位小数。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "编写程序：输入一个字符串，统计其中每个字符出现的次数，用字典保存统计结果并输出。请写出完整代码。",
          answer: "答案：\n```\ns = input(\"请输入一个字符串：\")\ncounter = {}\nfor ch in s:\n    counter[ch] = counter.get(ch, 0) + 1\nprint(counter)\n```\n验收点：① 用 `counter.get(ch, 0)` 处理键不存在的情况；② `for ch in s` 遍历字符串的每个字符；③ 输出为「字符: 次数」形式的字典。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "编写程序：先向文件 score.txt 写入三行内容「语文 90」「数学 85」「英语 88」，再读回该文件并逐行打印。请写出完整代码。",
          answer: "答案：\n```\nlines = [\"语文 90\", \"数学 85\", \"英语 88\"]\nwith open(\"score.txt\", \"w\", encoding=\"utf-8\") as f:\n    for line in lines:\n        f.write(line + \"\\n\")\nwith open(\"score.txt\", \"r\", encoding=\"utf-8\") as f:\n    for line in f:\n        print(line.strip())\n```\n验收点：① 写入用 `\"w\"` 模式，每行末尾补 `\\n` 才能换行；② 读回时用 `strip()` 去掉行末换行符；③ 用 `with open(...)` 可自动关闭文件。"
        }
      ]
    },
    // ---------- 选考模块：计算机网络技术 ----------
    {
      type: "exam",
      title: "选考模块 · 计算机网络技术（75 分）",
      duration: 45,
      totalScore: 75,
      passingScore: 45,
      items: [
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "IP 地址 192.168.1.100/26 对应的子网掩码是（　）",
          options: ["A. 255.255.255.0", "B. 255.255.255.128", "C. 255.255.255.192", "D. 255.255.255.224"],
          correctIndex: 2,
          answer: "答案：C。/26 表示网络位 26 位，掩码前 26 位为 1，即 255.255.255.192（最后一段 11000000 = 192）。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "子网掩码 255.255.255.224 划分出的每个子网，可用主机地址数为（　）",
          options: ["A. 30", "B. 32", "C. 62", "D. 16"],
          correctIndex: 0,
          answer: "答案：A。224 = 11100000，主机位剩 5 位，2^5=32，减去网络地址与广播地址，可用主机 30 个。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "关于交换机端口模式，下列说法正确的是（　）",
          options: ["A. access 端口可承载多个 VLAN 的带标签数据", "B. trunk 端口多用于交换机之间，可承载多个 VLAN 的数据", "C. access 端口用于连接路由器以互连多个 VLAN", "D. trunk 端口只能属于一个 VLAN"],
          correctIndex: 1,
          answer: "答案：B。access 端口只属于一个 VLAN，用于接终端设备；trunk 端口承载多个 VLAN 的带标签数据，多用于交换机之间级联。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "配置到目标网络 192.168.3.0/24、下一跳为 192.168.2.2 的静态路由，正确命令是（　）",
          options: ["A. `ip route 192.168.3.0 255.255.255.0 192.168.2.2`", "B. `ip route 192.168.2.2 255.255.255.0 192.168.3.0`", "C. `route add 192.168.3.0 192.168.2.2`", "D. `static route 192.168.3.0 192.168.2.2`"],
          correctIndex: 0,
          answer: "答案：A。静态路由格式为 `ip route 目标网络 子网掩码 下一跳`：先写目标网络与掩码，再写下一跳地址。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "下列 IP 地址中属于 A 类地址的是（　）",
          options: ["A. 10.1.1.1", "B. 172.16.0.1", "C. 192.168.1.1", "D. 224.0.0.1"],
          correctIndex: 0,
          answer: "答案：A。A 类首字节范围 1~126（10.x.x.x 属 A 类）；172.x 属 B 类，192.x 属 C 类，224.x 为组播地址。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 PacketTracer 中为路由器添加 WIC-1T 模块，正确的操作是（　）",
          options: ["A. 直接把模块拖入扩展槽", "B. 先点击电源开关关闭路由器，拖入模块后再开机", "C. 重启 PacketTracer 软件后添加", "D. 在 CLI 中输入命令添加模块"],
          correctIndex: 1,
          answer: "答案：B。PT 中增删硬件模块必须先给设备断电，拖入模块后再重新开机，否则无法添加。"
        },
        {
          difficulty: "medium",
          type: "fill",
          score: 5,
          question: "完成命令填空：\n`RA(config)#______`（配置到 10.0.0.0/8、下一跳 192.168.1.2 的静态路由）\n`RA#______`（查看路由表）",
          answer: "`ip route 10.0.0.0 255.0.0.0 192.168.1.2`；`show ip route`。/8 的掩码为 255.0.0.0；配置静态路由用 `ip route 目标网络 掩码 下一跳`，查看路由表用 `show ip route`。"
        },
        {
          difficulty: "basic",
          type: "judge",
          score: 5,
          question: "判断：交换机之间用于级联、承载多个 VLAN 数据的端口通常配置为 access 模式。",
          answer: "**错误。**承载多个 VLAN 数据的级联端口应配置为 trunk 模式；access 模式只承载单个 VLAN，用于连接终端。"
        },
        {
          difficulty: "medium",
          type: "judge",
          score: 5,
          question: "判断：把一个 C 类网络平均划分为多个子网后，每个子网可用的主机数会减少。",
          answer: "**正确。**划分子网借用了部分主机位作网络位，剩余主机位减少，故每个子网的可用主机数随之减少。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "某公司为技术部分配网络 192.168.10.0/24，需划分出至少 6 个子网、每个子网容纳 25 台主机。请算出合适的子网掩码与每个子网可用主机数，并列出前 3 个子网的网络地址与可用地址范围。",
          answer: "答案：① 需 ≥6 个子网，借 3 位网络位可产生 2^3=8 个子网（满足）；② 剩余主机位 5 位，2^5−2=30 台可用主机（≥25，满足）；③ 子网掩码 = 255.255.255.224（/27）；④ 子网步长 32：\n- 子网 1：网络地址 192.168.10.0，可用 192.168.10.1 ~ 192.168.10.30\n- 子网 2：网络地址 192.168.10.32，可用 192.168.10.33 ~ 192.168.10.62\n- 子网 3：网络地址 192.168.10.64，可用 192.168.10.65 ~ 192.168.10.94\n验收点：掩码 255.255.255.224；每子网 30 台可用；子网步长为 32。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "写出在路由器 R1 上配置「到 192.168.20.0/24、下一跳为 192.168.10.2」的静态路由，并验证配置是否生效的完整命令序列。",
          answer: "答案：\n```\nR1> enable\nR1# configure terminal\nR1(config)# ip route 192.168.20.0 255.255.255.0 192.168.10.2\nR1(config)# end\nR1# show ip route\n```\n验收点：① 静态路由格式为 `ip route 目标网络 子网掩码 下一跳`；② `show ip route` 的路由表中应出现 `S 192.168.20.0/24` 条目（S 表示静态）；③ 再用 `ping 192.168.20.x` 测试连通性。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "在 PacketTracer 中搭建「两台 PC → 一台交换机 → 一台路由器」的小型网络，使两台 PC 互通并都能与路由器连通。请写出主要操作步骤与关键配置。",
          answer: "答案：① 从设备区拖入 2 台 PC、1 台交换机、1 台路由器；② 用直通线连接 PC-交换机、交换机-路由器；③ 打开 PC 的 Desktop → IP Configuration，配置 IP、子网掩码与网关（如 PC1 192.168.1.10/24、PC2 192.168.1.11/24，网关均为 192.168.1.1）；④ 在路由器 CLI 配置接口：`interface f0/0` → `ip address 192.168.1.1 255.255.255.0` → `no shutdown`；⑤ 打开 PC 的命令行执行 `ping 192.168.1.11` 与 `ping 192.168.1.1` 验证连通；⑥ 保存文件（.pkt）。\n验收点：接口配置后必须执行 `no shutdown`，否则接口处于关闭状态，ping 不通。"
        }
      ]
    },
    // ---------- 选考模块：数字媒体技术 ----------
    {
      type: "exam",
      title: "选考模块 · 数字媒体技术（75 分）",
      duration: 45,
      totalScore: 75,
      passingScore: 45,
      items: [
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 Photoshop 图层蒙版中，用黑色画笔涂抹的部分会（　）",
          options: ["A. 完全显示", "B. 被隐藏", "C. 半透明显示", "D. 变为黑色"],
          correctIndex: 1,
          answer: "答案：B。蒙版中白色显示、黑色隐藏、灰色半透明，黑色涂抹处的图层内容被遮住。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "想让上层图像与下层产生「正片叠底」式的变暗叠加效果，应设置图层的（　）",
          options: ["A. 不透明度", "B. 混合模式", "C. 图层样式", "D. 填充"],
          correctIndex: 1,
          answer: "答案：B。图层面板顶部的「混合模式」下拉框可设置正常、正片叠底、滤色、叠加等混合效果。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "在 Premiere 时间线中用于切割片段的剃刀工具，其快捷键是（　）",
          options: ["A. V（选择工具）", "B. C（剃刀工具）", "C. H（手形工具）", "D. Z（缩放工具）"],
          correctIndex: 1,
          answer: "答案：B。剃刀工具快捷键为 C，用于切割、裁剪片段；选择工具为 V。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 Premiere 导出视频时，设置目标码率（比特率）主要影响（　）",
          options: ["A. 视频的时长", "B. 视频的画质与文件体积", "C. 音频的声道数", "D. 字幕的字体"],
          correctIndex: 1,
          answer: "答案：B。码率越高画质越好、文件体积越大，与时长、声道数、字幕无关。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 Photoshop 中查看或单独编辑图像的 R、G、B 三个颜色分量，应打开（　）面板",
          options: ["A. 图层", "B. 通道", "C. 路径", "D. 历史记录"],
          correctIndex: 1,
          answer: "答案：B。「通道」面板显示复合通道与红、绿、蓝三个颜色通道，可单独查看与编辑。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 Photoshop 中对整个图层做缩放、旋转等自由变换，正确的操作是（　）",
          options: ["A. 用移动工具直接拖动", "B. 按 Ctrl+T 调出自由变换，拖动控制点后回车确认", "C. 按 Ctrl+J 复制图层", "D. 按 Ctrl+E 合并图层"],
          correctIndex: 1,
          answer: "答案：B。Ctrl+T 进入自由变换：拖角点缩放、移到角外可旋转，回车或双击确认；Ctrl+J 复制图层，Ctrl+E 向下合并。"
        },
        {
          difficulty: "basic",
          type: "fill",
          score: 5,
          question: "补全操作：给图层添加蒙版后，用______色画笔涂抹可隐藏图层内容，用______色画笔涂抹可重新显示。",
          answer: "`黑`；`白`。蒙版中黑色隐藏、白色显示、灰色半透明；涂错可用反色画笔擦回。"
        },
        {
          difficulty: "basic",
          type: "judge",
          score: 5,
          question: "判断：图层蒙版通过灰度控制显示与隐藏，不会真正删除像素，可随时修改恢复。",
          answer: "**正确。**蒙版属于非破坏性编辑，原图像素仍保留，可反复修改或删除蒙版恢复原状。"
        },
        {
          difficulty: "medium",
          type: "judge",
          score: 5,
          question: "判断：在 Premiere 中导出视频时，帧率必须与序列帧率完全相同，不能修改。",
          answer: "**错误。**导出设置中可单独指定帧率；一般建议与序列帧率一致以避免卡顿或重复帧，但并非不能修改。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "在 Photoshop 中利用图层蒙版把一张人物照片的背景替换为另一张风景照片。请写出主要操作步骤。",
          answer: "答案：① 打开人物图与风景图，用移动工具把风景图拖入人物文档生成新图层，并将其置于人物图层下方；② 选中人物图层，点击图层面板底部「添加图层蒙版」按钮；③ 选择画笔工具，前景色设为黑色，涂抹人物以外的背景区域将其隐藏，露出下方风景；④ 若误涂到人物，切换前景色为白色擦回；⑤ 用柔边画笔并适当降低不透明度，使边缘过渡自然；⑥ 文件 → 存储为 PSD 保留图层。\n验收点：蒙版中黑色隐藏、白色显示；原图像素未被破坏，可反复修改。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "在 Premiere 中把两段视频按顺序拼接、裁掉多余片段、在接缝处添加一个交叉溶解过渡并调整其时长。请写出主要操作步骤。",
          answer: "答案：① 新建序列，把两段素材依次拖入视频轨道 V1 并前后相接；② 选中剃刀工具（C），在需要裁剪处点击切割，删除多余片段；③ 在「效果」面板搜索「交叉溶解」，拖到两段素材的接缝处；④ 拖动过渡图标边缘调整过渡时长与位置；⑤ 按空格键预览，确认后保存项目。\n验收点：剃刀工具快捷键为 C；交叉溶解需落在接缝处；过渡长度可通过拖动边缘调整。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "在 Premiere 中把序列导出为适合网络发布的高清视频。请写出导出设置的主要步骤与关键参数。",
          answer: "答案：① 执行 文件 → 导出 → 媒体（或 Ctrl+M）；② 格式选择 H.264（输出 mp4）；③ 预设选择「匹配源 - 高比特率」或「YouTube 1080p」，分辨率设为 1920×1080；④ 帧率与序列保持一致（如 25fps）；⑤ 码率保持默认或按需调高（码率越高画质越好、体积越大）；⑥ 设置输出文件名与保存路径，点击导出。\n验收点：格式为 H.264/mp4；分辨率 1920×1080；帧率与序列一致。"
        }
      ]
    }
  ]
}
