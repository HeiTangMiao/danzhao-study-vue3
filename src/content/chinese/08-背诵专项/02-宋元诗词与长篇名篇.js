/**
 * 内容页面数据（content-schema 的实例）
 * 页面：背诵专项 · 宋元诗词与长篇名篇
 * 说明：每日背诵素材库（宋元词曲 + 唐诗长篇与北朝民歌，23 篇）—— 完整原文 + 逐字注音。
 *
 * 形式约定（与 07-默写专项 刻意区分）：
 *   - 不做 cloze 挖空：背诵是「看着全篇诵读记忆」，不是「填空默写」
 *   - 诗词（诗/词/曲）逐字全注：注音随句标注，覆盖每字
 *   - 2026-11-02 起**全部篇目逐字全注**（原「文言文与长篇只注难字」废止）：
 *     每个分句后紧跟（pīn yīn），覆盖句中每一个字，多音字按句意取音
 *
 * ⚠️ 分页约定（2026-11-02 拆分）：08 单元按「时代 + 体裁」分 4 页，
 *    **不管分几页，每篇篇目仍是本页的一个顶层 `knowledge` 区块**。
 *    每日背诵构建脚本（scripts/build-recite-bank.mjs，功能侧）按「语文学科 + 08 单元」
 *    收全部 knowledge 区块，页数变化不影响篇数（仍为 64）；但**篇目增减必须先回函功能侧**
 *    改 BASELINE 硬断言，否则 `npm run build` 直接失败。
 */
export default {
  blocks: [
    {
      type: "layout",
      as: "hero",
      props: { align: "start", tone: "accent" },
      children: [
        {
          type: "objectives",
          title: "背诵目标",
          items: [
            "能读准词牌断句与长句节奏，通篇朗读不卡壳",
            "能在长篇名篇中借助难字注音通读全文，为分段成诵打底"
          ]
        }
      ]
    },
    {
      type: "knowledge",
      title: "念奴娇 · 赤壁怀古 · 苏轼",
      paragraphs: [
        "大江东去（dà jiāng dōng qù），浪淘尽（làng táo jìn），千古风流人物（qiān gǔ fēng liú rén wù）。\n故垒西边（gù lěi xī biān），人道是（rén dào shì），三国周郎赤壁（sān guó zhōu láng chì bì）。\n乱石穿空（luàn shí chuān kōng），惊涛拍岸（jīng tāo pāi àn），卷起千堆雪（juǎn qǐ qiān duī xuě）。\n江山如画（jiāng shān rú huà），一时多少豪杰（yī shí duō shǎo háo jié）。\n遥想公瑾当年（yáo xiǎng gōng jǐn dāng nián），小乔初嫁了（xiǎo qiáo chū jià liǎo），雄姿英发（xióng zī yīng fā）。\n羽扇纶巾（yǔ shàn guān jīn），谈笑间（tán xiào jiān），樯橹灰飞烟灭（qiáng lǔ huī fēi yān miè）。\n故国神游（gù guó shén yóu），多情应笑我（duō qíng yīng xiào wǒ），早生华发（zǎo shēng huá fà）。\n人生如梦（rén shēng rú mèng），一尊还酹江月（yī zūn huán lèi jiāng yuè）。"
      ]
    },
    {
      type: "knowledge",
      title: "水调歌头 · 明月几时有 · 苏轼",
      paragraphs: [
        "明月几时有（míng yuè jǐ shí yǒu）？把酒问青天（bǎ jiǔ wèn qīng tiān）。\n不知天上宫阙（bù zhī tiān shàng gōng què），今夕是何年（jīn xī shì hé nián）。\n我欲乘风归去（wǒ yù chéng fēng guī qù），又恐琼楼玉宇（yòu kǒng qióng lóu yù yǔ），高处不胜寒（gāo chù bù shèng hán）。\n起舞弄清影（qǐ wǔ nòng qīng yǐng），何似在人间（hé sì zài rén jiān）。\n转朱阁（zhuǎn zhū gé），低绮户（dī qǐ hù），照无眠（zhào wú mián）。\n不应有恨（bù yīng yǒu hèn），何事长向别时圆（hé shì cháng xiàng bié shí yuán）？\n人有悲欢离合（rén yǒu bēi huān lí hé），月有阴晴圆缺（yuè yǒu yīn qíng yuán quē），此事古难全（cǐ shì gǔ nán quán）。\n但愿人长久（dàn yuàn rén cháng jiǔ），千里共婵娟（qiān lǐ gòng chán juān）。"
      ]
    },
    {
      type: "knowledge",
      title: "江城子 · 密州出猎 · 苏轼",
      paragraphs: [
        "老夫聊发少年狂（lǎo fū liáo fā shào nián kuáng），左牵黄（zuǒ qiān huáng），右擎苍（yòu qíng cāng），锦帽貂裘（jǐn mào diāo qiú），千骑卷平冈（qiān qí juǎn píng gāng）。\n为报倾城随太守（wèi bào qīng chéng suí tài shǒu），亲射虎（qīn shè hǔ），看孙郎（kàn sūn láng）。\n酒酣胸胆尚开张（jiǔ hān xiōng dǎn shàng kāi zhāng）。鬓微霜（bìn wēi shuāng），又何妨（yòu hé fáng）！\n持节云中（chí jié yún zhōng），何日遣冯唐（hé rì qiǎn féng táng）？\n会挽雕弓如满月（huì wǎn diāo gōng rú mǎn yuè），西北望（xī běi wàng），射天狼（shè tiān láng）。"
      ]
    },
    {
      type: "knowledge",
      title: "破阵子 · 为陈同甫赋壮词以寄之 · 辛弃疾",
      paragraphs: [
        "醉里挑灯看剑（zuì lǐ tiǎo dēng kàn jiàn），梦回吹角连营（mèng huí chuī jiǎo lián yíng）。\n八百里分麾下炙（bā bǎi lǐ fēn huī xià zhì），五十弦翻塞外声（wǔ shí xián fān sài wài shēng），沙场秋点兵（shā chǎng qiū diǎn bīng）。\n马作的卢飞快（mǎ zuò dí lú fēi kuài），弓如霹雳弦惊（gōng rú pī lì xián jīng）。\n了却君王天下事（liǎo què jūn wáng tiān xià shì），赢得生前身后名（yíng dé shēng qián shēn hòu míng）。可怜白发生（kě lián bái fà shēng）！"
      ]
    },
    {
      type: "knowledge",
      title: "青玉案 · 元夕 · 辛弃疾",
      paragraphs: [
        "东风夜放花千树（dōng fēng yè fàng huā qiān shù）。更吹落（gèng chuī luò）、星如雨（xīng rú yǔ）。\n宝马雕车香满路（bǎo mǎ diāo chē xiāng mǎn lù）。\n凤箫声动（fèng xiāo shēng dòng），玉壶光转（yù hú guāng zhuǎn），一夜鱼龙舞（yī yè yú lóng wǔ）。\n蛾儿雪柳黄金缕（é ér xuě liǔ huáng jīn lǚ）。笑语盈盈暗香去（xiào yǔ yíng yíng àn xiāng qù）。\n众里寻他千百度（zhòng lǐ xún tā qiān bǎi dù）。\n蓦然回首（mò rán huí shǒu），那人却在（nà rén què zài），灯火阑珊处（dēng huǒ lán shān chù）。"
      ]
    },
    {
      type: "knowledge",
      title: "永遇乐 · 京口北固亭怀古 · 辛弃疾",
      paragraphs: [
        "千古江山（qiān gǔ jiāng shān），英雄无觅孙仲谋处（yīng xióng wú mì sūn zhòng móu chù）。\n舞榭歌台（wǔ xiè gē tái），风流总被雨打风吹去（fēng liú zǒng bèi yǔ dǎ fēng chuī qù）。\n斜阳草树（xié yáng cǎo shù），寻常巷陌（xún cháng xiàng mò），人道寄奴曾住（rén dào jì nú céng zhù）。\n想当年（xiǎng dāng nián），金戈铁马（jīn gē tiě mǎ），气吞万里如虎（qì tūn wàn lǐ rú hǔ）。\n元嘉草草（yuán jiā cǎo cǎo），封狼居胥（fēng láng jū xū），赢得仓皇北顾（yíng dé cāng huáng běi gù）。\n四十三年（sì shí sān nián），望中犹记（wàng zhōng yóu jì），烽火扬州路（fēng huǒ yáng zhōu lù）。\n可堪回首（kě kān huí shǒu），佛狸祠下（bì lí cí xià），一片神鸦社鼓（yī piàn shén yā shè gǔ）。\n凭谁问（píng shuí wèn）：廉颇老矣（lián pō lǎo yǐ），尚能饭否（shàng néng fàn fǒu）？"
      ]
    },
    {
      type: "knowledge",
      title: "如梦令 · 李清照",
      paragraphs: [
        "常记溪亭日暮（cháng jì xī tíng rì mù），沉醉不知归路（chén zuì bù zhī guī lù）。\n兴尽晚回舟（xìng jìn wǎn huí zhōu），误入藕花深处（wù rù ǒu huā shēn chù）。\n争渡（zhēng dù），争渡（zhēng dù），惊起一滩鸥鹭（jīng qǐ yī tān ōu lù）。"
      ]
    },
    {
      type: "knowledge",
      title: "渔家傲 · 李清照",
      paragraphs: [
        "天接云涛连晓雾（tiān jiē yún tāo lián xiǎo wù），星河欲转千帆舞（xīng hé yù zhuǎn qiān fān wǔ）。\n仿佛梦魂归帝所（fǎng fú mèng hún guī dì suǒ）。闻天语（wén tiān yǔ），殷勤问我归何处（yīn qín wèn wǒ guī hé chù）。\n我报路长嗟日暮（wǒ bào lù cháng jiē rì mù），学诗谩有惊人句（xué shī màn yǒu jīng rén jù）。\n九万里风鹏正举（jiǔ wàn lǐ fēng péng zhèng jǔ）。风休住（fēng xiū zhù），蓬舟吹取三山去（péng zhōu chuī qǔ sān shān qù）！"
      ]
    },
    {
      type: "knowledge",
      title: "一剪梅 · 李清照",
      paragraphs: [
        "红藕香残玉簟秋（hóng ǒu xiāng cán yù diàn qiū）。轻解罗裳（qīng jiě luó cháng），独上兰舟（dú shàng lán zhōu）。\n云中谁寄锦书来（yún zhōng shuí jì jǐn shū lái）？雁字回时（yàn zì huí shí），月满西楼（yuè mǎn xī lóu）。\n花自飘零水自流（huā zì piāo líng shuǐ zì liú）。一种相思（yī zhǒng xiāng sī），两处闲愁（liǎng chù xián chóu）。\n此情无计可消除（cǐ qíng wú jì kě xiāo chú），才下眉头（cái xià méi tóu），却上心头（què shàng xīn tóu）。"
      ]
    },
    {
      type: "knowledge",
      title: "雨霖铃 · 柳永",
      paragraphs: [
        "寒蝉凄切（hán chán qī qiè），对长亭晚（duì cháng tíng wǎn），骤雨初歇（zhòu yǔ chū xiē）。\n都门帐饮无绪（dū mén zhàng yǐn wú xù），留恋处（liú liàn chù），兰舟催发（lán zhōu cuī fā）。\n执手相看泪眼（zhí shǒu xiāng kàn lèi yǎn），竟无语凝噎（jìng wú yǔ níng yē）。\n念去去（niàn qù qù），千里烟波（qiān lǐ yān bō），暮霭沉沉楚天阔（mù ǎi chén chén chǔ tiān kuò）。\n多情自古伤离别（duō qíng zì gǔ shāng lí bié），更那堪（gèng nǎ kān），冷落清秋节（lěng luò qīng qiū jié）！\n今宵酒醒何处（jīn xiāo jiǔ xǐng hé chù）？杨柳岸（yáng liǔ àn），晓风残月（xiǎo fēng cán yuè）。\n此去经年（cǐ qù jīng nián），应是良辰好景虚设（yīng shì liáng chén hǎo jǐng xū shè）。\n便纵有千种风情（biàn zòng yǒu qiān zhǒng fēng qíng），更与何人说（gèng yǔ hé rén shuō）？"
      ]
    },
    {
      type: "knowledge",
      title: "泊船瓜洲 · 王安石",
      paragraphs: [
        "京口瓜洲一水间（jīng kǒu guā zhōu yī shuǐ jiān），钟山只隔数重山（zhōng shān zhǐ gé shù chóng shān）。\n春风又绿江南岸（chūn fēng yòu lǜ jiāng nán àn），明月何时照我还（míng yuè hé shí zhào wǒ huán）？"
      ]
    },
    {
      type: "knowledge",
      title: "游山西村 · 陆游",
      paragraphs: [
        "莫笑农家腊酒浑（mò xiào nóng jiā là jiǔ hún），丰年留客足鸡豚（fēng nián liú kè zú jī tún）。\n山重水复疑无路（shān chóng shuǐ fù yí wú lù），柳暗花明又一村（liǔ àn huā míng yòu yī cūn）。\n箫鼓追随春社近（xiāo gǔ zhuī suí chūn shè jìn），衣冠简朴古风存（yī guān jiǎn pǔ gǔ fēng cún）。\n从今若许闲乘月（cóng jīn ruò xǔ xián chéng yuè），拄杖无时夜叩门（zhǔ zhàng wú shí yè kòu mén）。"
      ]
    },
    {
      type: "knowledge",
      title: "过零丁洋 · 文天祥",
      paragraphs: [
        "辛苦遭逢起一经（xīn kǔ zāo féng qǐ yī jīng），干戈寥落四周星（gān gē liáo luò sì zhōu xīng）。\n山河破碎风飘絮（shān hé pò suì fēng piāo xù），身世浮沉雨打萍（shēn shì fú chén yǔ dǎ píng）。\n惶恐滩头说惶恐（huáng kǒng tān tóu shuō huáng kǒng），零丁洋里叹零丁（líng dīng yáng lǐ tàn líng dīng）。\n人生自古谁无死（rén shēng zì gǔ shuí wú sǐ）？留取丹心照汗青（liú qǔ dān xīn zhào hàn qīng）。"
      ]
    },
    {
      type: "knowledge",
      title: "天净沙 · 秋思 · 马致远",
      paragraphs: [
        "枯藤老树昏鸦（kū téng lǎo shù hūn yā），小桥流水人家（xiǎo qiáo liú shuǐ rén jiā），古道西风瘦马（gǔ dào xī fēng shòu mǎ）。\n夕阳西下（xī yáng xī xià），断肠人在天涯（duàn cháng rén zài tiān yá）。"
      ]
    },
    {
      type: "knowledge",
      title: "山坡羊 · 潼关怀古 · 张养浩",
      paragraphs: [
        "峰峦如聚（fēng luán rú jù），波涛如怒（bō tāo rú nù），山河表里潼关路（shān hé biǎo lǐ tóng guān lù）。\n望西都（wàng xī dū），意踌躇（yì chóu chú）。\n伤心秦汉经行处（shāng xīn qín hàn jīng xíng chù），宫阙万间都做了土（gōng què wàn jiān dōu zuò le tǔ）。\n兴（xīng），百姓苦（bǎi xìng kǔ）；亡（wáng），百姓苦（bǎi xìng kǔ）。"
      ]
    },
    {
      type: "knowledge",
      title: "将进酒 · 李白",
      paragraphs: [
        "君不见黄河之水天上来（jūn bú jiàn huáng hé zhī shuǐ tiān shàng lái），奔流到海不复回（bēn liú dào hǎi bú fù huí）。\n君不见高堂明镜悲白发（jūn bú jiàn gāo táng míng jìng bēi bái fà），朝如青丝暮成雪（zhāo rú qīng sī mù chéng xuě）。\n人生得意须尽欢（rén shēng dé yì xū jìn huān），莫使金樽空对月（mò shǐ jīn zūn kōng duì yuè）。\n天生我材必有用（tiān shēng wǒ cái bì yǒu yòng），千金散尽还复来（qiān jīn sàn jìn huán fù lái）。\n烹羊宰牛且为乐（pēng yáng zǎi niú qiě wéi lè），会须一饮三百杯（huì xū yì yǐn sān bǎi bēi）。\n岑夫子（cén fū zǐ），丹丘生（dān qiū shēng），将进酒（qiāng jìn jiǔ），杯莫停（bēi mò tíng）。\n与君歌一曲（yǔ jūn gē yì qǔ），请君为我倾耳听（qǐng jūn wèi wǒ qīng ěr tīng）。\n钟鼓馔玉不足贵（zhōng gǔ zhuàn yù bù zú guì），但愿长醉不愿醒（dàn yuàn cháng zuì bú yuàn xǐng）。\n古来圣贤皆寂寞（gǔ lái shèng xián jiē jì mò），惟有饮者留其名（wéi yǒu yǐn zhě liú qí míng）。\n陈王昔时宴平乐（chén wáng xī shí yàn píng lè），斗酒十千恣欢谑（dǒu jiǔ shí qiān zì huān xuè）。\n主人何为言少钱（zhǔ rén hé wèi yán shǎo qián），径须沽取对君酌（jìng xū gū qǔ duì jūn zhuó）。\n五花马（wǔ huā mǎ），千金裘（qiān jīn qiú），呼儿将出换美酒（hū ér jiāng chū huàn měi jiǔ），与尔同销万古愁（yǔ ěr tóng xiāo wàn gǔ chóu）。"
      ]
    },
    {
      type: "knowledge",
      title: "宣州谢朓楼饯别校书叔云 · 李白",
      paragraphs: [
        "弃我去者（qì wǒ qù zhě），昨日之日不可留（zuó rì zhī rì bù kě liú）；\n乱我心者（luàn wǒ xīn zhě），今日之日多烦忧（jīn rì zhī rì duō fán yōu）。\n长风万里送秋雁（cháng fēng wàn lǐ sòng qiū yàn），对此可以酣高楼（duì cǐ kě yǐ hān gāo lóu）。\n蓬莱文章建安骨（péng lái wén zhāng jiàn ān gǔ），中间小谢又清发（zhōng jiān xiǎo xiè yòu qīng fā）。\n俱怀逸兴壮思飞（jù huái yì xìng zhuàng sī fēi），欲上青天览明月（yù shàng qīng tiān lǎn míng yuè）。\n抽刀断水水更流（chōu dāo duàn shuǐ shuǐ gèng liú），举杯销愁愁更愁（jǔ bēi xiāo chóu chóu gèng chóu）。\n人生在世不称意（rén shēng zài shì bù chèn yì），明朝散发弄扁舟（míng cháo sàn fà nòng piān zhōu）。"
      ]
    },
    {
      type: "knowledge",
      title: "茅屋为秋风所破歌 · 杜甫",
      paragraphs: [
        "八月秋高风怒号（bā yuè qiū gāo fēng nù háo），卷我屋上三重茅（juǎn wǒ wū shàng sān chóng máo）。\n茅飞渡江洒江郊（máo fēi dù jiāng sǎ jiāng jiāo），高者挂罥长林梢（gāo zhě guà juàn cháng lín shāo），下者飘转沉塘坳（xià zhě piāo zhuǎn chén táng ào）。\n南村群童欺我老无力（nán cūn qún tóng qī wǒ lǎo wú lì），忍能对面为盗贼（rěn néng duì miàn wéi dào zéi）。\n公然抱茅入竹去（gōng rán bào máo rù zhú qù），唇焦口燥呼不得（chún jiāo kǒu zào hū bù dé），归来倚仗自叹息（guī lái yǐ zhàng zì tàn xī）。\n俄顷风定云墨色（é qǐng fēng dìng yún mò sè），秋天漠漠向昏黑（qiū tiān mò mò xiàng hūn hēi）。\n布衾多年冷似铁（bù qīn duō nián lěng sì tiě），娇儿恶卧踏里裂（jiāo ér wū wò tà lǐ liè）。\n床头屋漏无干处（chuáng tóu wū lòu wú gān chù），雨脚如麻未断绝（yǔ jiǎo rú má wèi duàn jué）。\n自经丧乱少睡眠（zì jīng sāng luàn shǎo shuì mián），长夜沾湿何由彻（cháng yè zhān shī hé yóu chè）！\n安得广厦千万间（ān dé guǎng shà qiān wàn jiān），大庇天下寒士俱欢颜（dà bì tiān xià hán shì jù huān yán），风雨不动安如山（fēng yǔ bú dòng ān rú shān）。\n呜呼（wū hū）！何时眼前突兀见此屋（hé shí yǎn qián tū wù xiàn cǐ wū），吾庐独破受冻死亦足（wú lú dú pò shòu dòng sǐ yì zú）！"
      ]
    },
    {
      type: "knowledge",
      title: "登高 · 杜甫",
      paragraphs: [
        "风急天高猿啸哀（fēng jí tiān gāo yuán xiào āi），渚清沙白鸟飞回（zhǔ qīng shā bái niǎo fēi huí）。\n无边落木萧萧下（wú biān luò mù xiāo xiāo xià），不尽长江滚滚来（bù jìn cháng jiāng gǔn gǔn lái）。\n万里悲秋常作客（wàn lǐ bēi qiū cháng zuò kè），百年多病独登台（bǎi nián duō bìng dú dēng tái）。\n艰难苦恨繁霜鬓（jiān nán kǔ hèn fán shuāng bìn），潦倒新停浊酒杯（liáo dǎo xīn tíng zhuó jiǔ bēi）。"
      ]
    },
    {
      type: "knowledge",
      title: "白雪歌送武判官归京 · 岑参",
      paragraphs: [
        "北风卷地白草折（běi fēng juǎn dì bái cǎo zhé），胡天八月即飞雪（hú tiān bā yuè jí fēi xuě）。\n忽如一夜春风来（hū rú yí yè chūn fēng lái），千树万树梨花开（qiān shù wàn shù lí huā kāi）。\n散入珠帘湿罗幕（sàn rù zhū lián shī luó mù），狐裘不暖锦衾薄（hú qiú bù nuǎn jǐn qīn bó）。\n将军角弓不得控（jiāng jūn jiǎo gōng bù dé kòng），都护铁衣冷难着（dū hù tiě yī lěng nán zhuó）。\n瀚海阑干百丈冰（hàn hǎi lán gān bǎi zhàng bīng），愁云惨淡万里凝（chóu yún cǎn dàn wàn lǐ níng）。\n中军置酒饮归客（zhōng jūn zhì jiǔ yìn guī kè），胡琴琵琶与羌笛（hú qín pí pá yǔ qiāng dí）。\n纷纷暮雪下辕门（fēn fēn mù xuě xià yuán mén），风掣红旗冻不翻（fēng chè hóng qí dòng bù fān）。\n轮台东门送君去（lún tái dōng mén sòng jūn qù），去时雪满天山路（qù shí xuě mǎn tiān shān lù）。\n山回路转不见君（shān huí lù zhuǎn bú jiàn jūn），雪上空留马行处（xuě shàng kōng liú mǎ xíng chù）。"
      ]
    },
    {
      type: "knowledge",
      title: "卖炭翁 · 白居易",
      paragraphs: [
        "卖炭翁（mài tàn wēng），伐薪烧炭南山中（fá xīn shāo tàn nán shān zhōng）。\n满面尘灰烟火色（mǎn miàn chén huī yān huǒ sè），两鬓苍苍十指黑（liǎng bìn cāng cāng shí zhǐ hēi）。\n卖炭得钱何所营（mài tàn dé qián hé suǒ yíng）？身上衣裳口中食（shēn shàng yī cháng kǒu zhōng shí）。\n可怜身上衣正单（kě lián shēn shàng yī zhèng dān），心忧炭贱愿天寒（xīn yōu tàn jiàn yuàn tiān hán）。\n夜来城外一尺雪（yè lái chéng wài yì chǐ xuě），晓驾炭车辗冰辙（xiǎo jià tàn chē niǎn bīng zhé）。\n牛困人饥日已高（niú kùn rén jī rì yǐ gāo），市南门外泥中歇（shì nán mén wài ní zhōng xiē）。\n翩翩两骑来是谁（piān piān liǎng qí lái shì shuí）？黄衣使者白衫儿（huáng yī shǐ zhě bái shān ér）。\n手把文书口称敕（shǒu bǎ wén shū kǒu chēng chì），回车叱牛牵向北（huí chē chì niú qiān xiàng běi）。\n一车炭（yì chē tàn），千余斤（qiān yú jīn），宫使驱将惜不得（gōng shǐ qū jiāng xī bù dé）。\n半匹红绡一丈绫（bàn pǐ hóng xiāo yí zhàng líng），系向牛头充炭直（jì xiàng niú tóu chōng tàn zhí）。"
      ]
    },
    {
      type: "knowledge",
      title: "琵琶行（节选） · 白居易",
      paragraphs: [
        "浔阳江头夜送客（xún yáng jiāng tóu yè sòng kè），枫叶荻花秋瑟瑟（fēng yè dí huā qiū sè sè）。\n主人下马客在船（zhǔ rén xià mǎ kè zài chuán），举酒欲饮无管弦（jǔ jiǔ yù yǐn wú guǎn xián）。\n醉不成欢惨将别（zuì bù chéng huān cǎn jiāng bié），别时茫茫江浸月（bié shí máng máng jiāng jìn yuè）。\n忽闻水上琵琶声（hū wén shuǐ shàng pí pá shēng），主人忘归客不发（zhǔ rén wàng guī kè bù fā）。\n……大弦嘈嘈如急雨（dà xián cáo cáo rú jí yǔ），小弦切切如私语（xiǎo xián qiè qiè rú sī yǔ）。\n嘈嘈切切错杂弹（cáo cáo qiè qiè cuò zá tán），大珠小珠落玉盘（dà zhū xiǎo zhū luò yù pán）。\n……银瓶乍破水浆迸（yín píng zhà pò shuǐ jiāng bèng），铁骑突出刀枪鸣（tiě jì tū chū dāo qiāng míng）。\n曲终收拨当心画（qǔ zhōng shōu bō dāng xīn huà），四弦一声如裂帛（sì xián yì shēng rú liè bó）。\n东船西舫悄无言（dōng chuán xī fǎng qiǎo wú yán），唯见江心秋月白（wéi jiàn jiāng xīn qiū yuè bái）。\n……同是天涯沦落人（tóng shì tiān yá lún luò rén），相逢何必曾相识（xiāng féng hé bì céng xiāng shí）。"
      ]
    },
    {
      type: "knowledge",
      title: "木兰诗",
      paragraphs: [
        "唧唧复唧唧（jī jī fù jī jī），木兰当户织（mù lán dāng hù zhī）。\n不闻机杼声（bù wén jī zhù shēng），惟闻女叹息（wéi wén nǚ tàn xī）。\n问女何所思（wèn nǚ hé suǒ sī），问女何所忆（wèn nǚ hé suǒ yì）。\n女亦无所思（nǚ yì wú suǒ sī），女亦无所忆（nǚ yì wú suǒ yì）。\n昨夜见军帖（zuó yè jiàn jūn tiě），可汗大点兵（kè hán dà diǎn bīng），军书十二卷（jūn shū shí èr juàn），卷卷有爷名（juàn juàn yǒu yé míng）。\n阿爷无大儿（ā yé wú dà ér），木兰无长兄（mù lán wú zhǎng xiōng），愿为市鞍马（yuàn wèi shì ān mǎ），从此替爷征（cóng cǐ tì yé zhēng）。\n东市买骏马（dōng shì mǎi jùn mǎ），西市买鞍鞯（xī shì mǎi ān jiān），南市买辔头（nán shì mǎi pèi tóu），北市买长鞭（běi shì mǎi cháng biān）。\n旦辞爷娘去（dàn cí yé niáng qù），暮宿黄河边（mù sù huáng hé biān）。\n不闻爷娘唤女声（bù wén yé niáng huàn nǚ shēng），但闻黄河流水鸣溅溅（dàn wén huáng hé liú shuǐ míng jiān jiān）。\n旦辞黄河去（dàn cí huáng hé qù），暮至黑山头（mù zhì hēi shān tóu），不闻爷娘唤女声（bù wén yé niáng huàn nǚ shēng），但闻燕山胡骑鸣啾啾（dàn wén yān shān hú jì míng jiū jiū）。\n万里赴戎机（wàn lǐ fù róng jī），关山度若飞（guān shān dù ruò fēi）。\n朔气传金柝（shuò qì chuán jīn tuò），寒光照铁衣（hán guāng zhào tiě yī）。\n将军百战死（jiāng jūn bǎi zhàn sǐ），壮士十年归（zhuàng shì shí nián guī）。\n归来见天子（guī lái jiàn tiān zǐ），天子坐明堂（tiān zǐ zuò míng táng）。\n策勋十二转（cè xūn shí èr zhuǎn），赏赐百千强（shǎng cì bǎi qiān qiáng）。\n可汗问所欲（kè hán wèn suǒ yù），木兰不用尚书郎（mù lán bú yòng shàng shū láng），愿驰千里足（yuàn chí qiān lǐ zú），送儿还故乡（sòng ér huán gù xiāng）。\n爷娘闻女来（yé niáng wén nǚ lái），出郭相扶将（chū guō xiāng fú jiāng）；阿姊闻妹来（ā zǐ wén mèi lái），当户理红妆（dāng hù lǐ hóng zhuāng）；小弟闻姊来（xiǎo dì wén zǐ lái），磨刀霍霍向猪羊（mó dāo huò huò xiàng zhū yáng）。\n开我东阁门（kāi wǒ dōng gé mén），坐我西阁床（zuò wǒ xī gé chuáng），脱我战时袍（tuō wǒ zhàn shí páo），著我旧时裳（zhuó wǒ jiù shí cháng）。\n当窗理云鬓（dāng chuāng lǐ yún bìn），对镜帖花黄（duì jìng tiē huā huáng）。\n出门看火伴（chū mén kàn huǒ bàn），火伴皆惊忙（huǒ bàn jiē jīng máng）：同行十二年（tóng háng shí èr nián），不知木兰是女郎（bù zhī mù lán shì nǚ láng）。\n雄兔脚扑朔（xióng tù jiǎo pū shuò），雌兔眼迷离（cí tù yǎn mí lí）；双兔傍地走（shuāng tù bàng dì zǒu），安能辨我是雄雌（ān néng biàn wǒ shì xióng cí）？"
      ]
    }
  ]
}
