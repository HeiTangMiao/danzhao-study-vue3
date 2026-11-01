/**
 * 内容页面数据（content-schema 的实例）
 * 页面：背诵专项 · 先秦至唐诗词
 * 说明：每日背诵素材库（先秦至晚唐诗词，24 篇）—— 完整原文 + 逐字注音，供朗读背诵。
 *
 * 形式约定（与 07-默写专项 刻意区分）：
 *   - 不做 cloze 挖空：背诵是「看着全篇诵读记忆」，不是「填空默写」
 *   - 诗词（诗/词/曲）逐字全注：注音随句标注，覆盖每字
 *   - 文言文与长篇（>150 字）只注难字：多音字、生僻字、通假字
 *
 * ⚠️ 分页约定（2026-10-30 拆分）：08 单元按「时代 + 体裁」分 4 页，
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
            "能借助注音准确朗读全篇，读准多音字、生僻字与通假字",
            "能在理解句意的基础上熟读成诵，逐篇打卡自评"
          ]
        }
      ]
    },
    {
      type: "knowledge",
      title: "登幽州台歌 · 陈子昂",
      paragraphs: [
        "前不见古人（qián bù jiàn gǔ rén），后不见来者（hòu bù jiàn lái zhě）。\n念天地之悠悠（niàn tiān dì zhī yōu yōu），独怆然而涕下（dú chuàng rán ér tì xià）。"
      ]
    },
    {
      type: "knowledge",
      title: "泊秦淮 · 杜牧",
      paragraphs: [
        "烟笼寒水月笼沙（yān lǒng hán shuǐ yuè lǒng shā），夜泊秦淮近酒家（yè bó qín huái jìn jiǔ jiā）。\n商女不知亡国恨（shāng nǚ bù zhī wáng guó hèn），隔江犹唱后庭花（gé jiāng yóu chàng hòu tíng huā）。"
      ]
    },
    {
      type: "knowledge",
      title: "《诗经》 · 关雎",
      paragraphs: [
        "关关雎鸠（guān guān jū jiū），在河之洲（zài hé zhī zhōu）。\n窈窕淑女（yǎo tiǎo shū nǚ），君子好逑（jūn zǐ hǎo qiú）。\n参差荇菜（cēn cī xìng cài），左右流之（zuǒ yòu liú zhī）。\n窈窕淑女（yǎo tiǎo shū nǚ），寤寐求之（wù mèi qiú zhī）。\n求之不得（qiú zhī bù dé），寤寐思服（wù mèi sī fú）。\n悠哉悠哉（yōu zāi yōu zāi），辗转反侧（zhǎn zhuǎn fǎn cè）。\n参差荇菜（cēn cī xìng cài），左右采之（zuǒ yòu cǎi zhī）。\n窈窕淑女（yǎo tiǎo shū nǚ），琴瑟友之（qín sè yǒu zhī）。\n参差荇菜（cēn cī xìng cài），左右芼之（zuǒ yòu mào zhī）。\n窈窕淑女（yǎo tiǎo shū nǚ），钟鼓乐之（zhōng gǔ lè zhī）。"
      ]
    },
    {
      type: "knowledge",
      title: "《诗经》 · 蒹葭",
      paragraphs: [
        "蒹葭苍苍（jiān jiā cāng cāng），白露为霜（bái lù wéi shuāng）。\n所谓伊人（suǒ wèi yī rén），在水一方（zài shuǐ yī fāng）。\n溯洄从之（sù huí cóng zhī），道阻且长（dào zǔ qiě cháng）。\n溯游从之（sù yóu cóng zhī），宛在水中央（wǎn zài shuǐ zhōng yāng）。\n蒹葭萋萋（jiān jiā qī qī），白露未晞（bái lù wèi xī）。\n所谓伊人（suǒ wèi yī rén），在水之湄（zài shuǐ zhī méi）。\n溯洄从之（sù huí cóng zhī），道阻且跻（dào zǔ qiě jī）。\n溯游从之（sù yóu cóng zhī），宛在水中坻（wǎn zài shuǐ zhōng chí）。\n蒹葭采采（jiān jiā cǎi cǎi），白露未已（bái lù wèi yǐ）。\n所谓伊人（suǒ wèi yī rén），在水之涘（zài shuǐ zhī sì）。\n溯洄从之（sù huí cóng zhī），道阻且右（dào zǔ qiě yòu）。\n溯游从之（sù yóu cóng zhī），宛在水中沚（wǎn zài shuǐ zhōng zhǐ）。"
      ]
    },
    {
      type: "knowledge",
      title: "观沧海 · 曹操",
      paragraphs: [
        "东临碣石（dōng lín jié shí），以观沧海（yǐ guān cāng hǎi）。\n水何澹澹（shuǐ hé dàn dàn），山岛竦峙（shān dǎo sǒng zhì）。\n树木丛生（shù mù cóng shēng），百草丰茂（bǎi cǎo fēng mào）。\n秋风萧瑟（qiū fēng xiāo sè），洪波涌起（hóng bō yǒng qǐ）。\n日月之行（rì yuè zhī xíng），若出其中（ruò chū qí zhōng）。\n星汉灿烂（xīng hàn càn làn），若出其里（ruò chū qí lǐ）。\n幸甚至哉（xìng shèn zhì zāi），歌以咏志（gē yǐ yǒng zhì）。"
      ]
    },
    {
      type: "knowledge",
      title: "龟虽寿 · 曹操",
      paragraphs: [
        "神龟虽寿（shén guī suī shòu），犹有竟时（yóu yǒu jìng shí）。\n腾蛇乘雾（téng shé chéng wù），终为土灰（zhōng wéi tǔ huī）。\n老骥伏枥（lǎo jì fú lì），志在千里（zhì zài qiān lǐ）。\n烈士暮年（liè shì mù nián），壮心不已（zhuàng xīn bù yǐ）。\n盈缩之期（yíng suō zhī qī），不但在天（bù dàn zài tiān）。\n养怡之福（yǎng yí zhī fú），可得永年（kě dé yǒng nián）。\n幸甚至哉（xìng shèn zhì zāi），歌以咏志（gē yǐ yǒng zhì）。"
      ]
    },
    {
      type: "knowledge",
      title: "饮酒（其五） · 陶渊明",
      paragraphs: [
        "结庐在人境（jié lú zài rén jìng），而无车马喧（ér wú chē mǎ xuān）。\n问君何能尔（wèn jūn hé néng ěr）？心远地自偏（xīn yuǎn dì zì piān）。\n采菊东篱下（cǎi jú dōng lí xià），悠然见南山（yōu rán jiàn nán shān）。\n山气日夕佳（shān qì rì xī jiā），飞鸟相与还（fēi niǎo xiāng yǔ huán）。\n此中有真意（cǐ zhōng yǒu zhēn yì），欲辨已忘言（yù biàn yǐ wàng yán）。"
      ]
    },
    {
      type: "knowledge",
      title: "归园田居（其一） · 陶渊明",
      paragraphs: [
        "少无适俗韵（shào wú shì sú yùn），性本爱丘山（xìng běn ài qiū shān）。\n误落尘网中（wù luò chén wǎng zhōng），一去三十年（yī qù sān shí nián）。\n羁鸟恋旧林（jī niǎo liàn jiù lín），池鱼思故渊（chí yú sī gù yuān）。\n开荒南野际（kāi huāng nán yě jì），守拙归园田（shǒu zhuō guī yuán tián）。\n方宅十余亩（fāng zhái shí yú mǔ），草屋八九间（cǎo wū bā jiǔ jiān）。\n榆柳荫后檐（yú liǔ yīn hòu yán），桃李罗堂前（táo lǐ luó táng qián）。\n暧暧远人村（ài ài yuǎn rén cūn），依依墟里烟（yī yī xū lǐ yān）。\n狗吠深巷中（gǒu fèi shēn xiàng zhōng），鸡鸣桑树颠（jī míng sāng shù diān）。\n户庭无尘杂（hù tíng wú chén zá），虚室有余闲（xū shì yǒu yú xián）。\n久在樊笼里（jiǔ zài fán lóng lǐ），复得返自然（fù dé fǎn zì rán）。"
      ]
    },
    {
      type: "knowledge",
      title: "送杜少府之任蜀州 · 王勃",
      paragraphs: [
        "城阙辅三秦（chéng què fǔ sān qín），风烟望五津（fēng yān wàng wǔ jīn）。\n与君离别意（yǔ jūn lí bié yì），同是宦游人（tóng shì huàn yóu rén）。\n海内存知己（hǎi nèi cún zhī jǐ），天涯若比邻（tiān yá ruò bǐ lín）。\n无为在歧路（wú wéi zài qí lù），儿女共沾巾（ér nǚ gòng zhān jīn）。"
      ]
    },
    {
      type: "knowledge",
      title: "闻王昌龄左迁龙标遥有此寄 · 李白",
      paragraphs: [
        "杨花落尽子规啼（yáng huā luò jǐn zǐ guī tí），闻道龙标过五溪（wén dào lóng biāo guò wǔ xī）。\n我寄愁心与明月（wǒ jì chóu xīn yǔ míng yuè），随君直到夜郎西（suí jūn zhí dào yè láng xī）。"
      ]
    },
    {
      type: "knowledge",
      title: "望岳 · 杜甫",
      paragraphs: [
        "岱宗夫如何（dài zōng fú rú hé）？齐鲁青未了（qí lǔ qīng wèi liǎo）。\n造化钟神秀（zào huà zhōng shén xiù），阴阳割昏晓（yīn yáng gē hūn xiǎo）。\n荡胸生曾云（dàng xiōng shēng céng yún），决眦入归鸟（jué zì rù guī niǎo）。\n会当凌绝顶（huì dāng líng jué dǐng），一览众山小（yī lǎn zhòng shān xiǎo）。"
      ]
    },
    {
      type: "knowledge",
      title: "春望 · 杜甫",
      paragraphs: [
        "国破山河在（guó pò shān hé zài），城春草木深（chéng chūn cǎo mù shēn）。\n感时花溅泪（gǎn shí huā jiàn lèi），恨别鸟惊心（hèn bié niǎo jīng xīn）。\n烽火连三月（fēng huǒ lián sān yuè），家书抵万金（jiā shū dǐ wàn jīn）。\n白头搔更短（bái tóu sāo gèng duǎn），浑欲不胜簪（hún yù bù shèng zān）。"
      ]
    },
    {
      type: "knowledge",
      title: "使至塞上 · 王维",
      paragraphs: [
        "单车欲问边（dān chē yù wèn biān），属国过居延（shǔ guó guò jū yán）。\n征蓬出汉塞（zhēng péng chū hàn sài），归雁入胡天（guī yàn rù hú tiān）。\n大漠孤烟直（dà mò gū yān zhí），长河落日圆（cháng hé luò rì yuán）。\n萧关逢候骑（xiāo guān féng hòu qí），都护在燕然（dū hù zài yān rán）。"
      ]
    },
    {
      type: "knowledge",
      title: "次北固山下 · 王湾",
      paragraphs: [
        "客路青山外（kè lù qīng shān wài），行舟绿水前（xíng zhōu lǜ shuǐ qián）。\n潮平两岸阔（cháo píng liǎng àn kuò），风正一帆悬（fēng zhèng yī fān xuán）。\n海日生残夜（hǎi rì shēng cán yè），江春入旧年（jiāng chūn rù jiù nián）。\n乡书何处达（xiāng shū hé chù dá）？归雁洛阳边（guī yàn luò yáng biān）。"
      ]
    },
    {
      type: "knowledge",
      title: "黄鹤楼 · 崔颢",
      paragraphs: [
        "昔人已乘黄鹤去（xī rén yǐ chéng huáng hè qù），此地空余黄鹤楼（cǐ dì kōng yú huáng hè lóu）。\n黄鹤一去不复返（huáng hè yī qù bù fù fǎn），白云千载空悠悠（bái yún qiān zǎi kōng yōu yōu）。\n晴川历历汉阳树（qíng chuān lì lì hàn yáng shù），芳草萋萋鹦鹉洲（fāng cǎo qī qī yīng wǔ zhōu）。\n日暮乡关何处是（rì mù xiāng guān hé chù shì）？烟波江上使人愁（yān bō jiāng shàng shǐ rén chóu）。"
      ]
    },
    {
      type: "knowledge",
      title: "行路难（其一） · 李白",
      paragraphs: [
        "金樽清酒斗十千（jīn zūn qīng jiǔ dǒu shí qiān），玉盘珍羞直万钱（yù pán zhēn xiū zhí wàn qián）。\n停杯投箸不能食（tíng bēi tóu zhù bù néng shí），拔剑四顾心茫然（bá jiàn sì gù xīn máng rán）。\n欲渡黄河冰塞川（yù dù huáng hé bīng sè chuān），将登太行雪满山（jiāng dēng tài háng xuě mǎn shān）。\n闲来垂钓碧溪上（xián lái chuí diào bì xī shàng），忽复乘舟梦日边（hū fù chéng zhōu mèng rì biān）。\n行路难（xíng lù nán），行路难（xíng lù nán），多歧路（duō qí lù），今安在（jīn ān zài）？\n长风破浪会有时（cháng fēng pò làng huì yǒu shí），直挂云帆济沧海（zhí guà yún fān jì cāng hǎi）。"
      ]
    },
    {
      type: "knowledge",
      title: "短歌行 · 曹操",
      paragraphs: [
        "对酒当歌（duì jiǔ dāng gē），人生几何（rén shēng jǐ hé）！\n譬如朝露（pì rú zhāo lù），去日苦多（qù rì kǔ duō）。\n慨当以慷（kǎi dāng yǐ kāng），忧思难忘（yōu sī nán wàng）。\n何以解忧（hé yǐ jiě yōu）？唯有杜康（wéi yǒu dù kāng）。\n青青子衿（qīng qīng zǐ jīn），悠悠我心（yōu yōu wǒ xīn）。\n但为君故（dàn wèi jūn gù），沉吟至今（chén yín zhì jīn）。\n呦呦鹿鸣（yōu yōu lù míng），食野之苹（shí yě zhī píng）。\n我有嘉宾（wǒ yǒu jiā bīn），鼓瑟吹笙（gǔ sè chuī shēng）。\n明明如月（míng míng rú yuè），何时可掇（hé shí kě duō）？\n忧从中来（yōu cóng zhōng lái），不可断绝（bù kě duàn jué）。\n越陌度阡（yuè mò dù qiān），枉用相存（wǎng yòng xiāng cún）。\n契阔谈讌（qì kuò tán yàn），心念旧恩（xīn niàn jiù ēn）。\n月明星稀（yuè míng xīng xī），乌鹊南飞（wū què nán fēi）。\n绕树三匝（rào shù sān zā），何枝可依（hé zhī kě yī）？\n山不厌高（shān bù yàn gāo），海不厌深（hǎi bù yàn shēn）。\n周公吐哺（zhōu gōng tǔ bǔ），天下归心（tiān xià guī xīn）。"
      ]
    },
    {
      type: "knowledge",
      title: "赤壁 · 杜牧",
      paragraphs: [
        "折戟沉沙铁未销（zhé jǐ chén shā tiě wèi xiāo），自将磨洗认前朝（zì jiāng mó xǐ rèn qián cháo）。\n东风不与周郎便（dōng fēng bù yǔ zhōu láng biàn），铜雀春深锁二乔（tóng què chūn shēn suǒ èr qiáo）。"
      ]
    },
    {
      type: "knowledge",
      title: "钱塘湖春行 · 白居易",
      paragraphs: [
        "孤山寺北贾亭西（gū shān sì běi jiǎ tíng xī），水面初平云脚低（shuǐ miàn chū píng yún jiǎo dī）。\n几处早莺争暖树（jǐ chù zǎo yīng zhēng nuǎn shù），谁家新燕啄春泥（shuí jiā xīn yàn zhuó chūn ní）。\n乱花渐欲迷人眼（luàn huā jiàn yù mí rén yǎn），浅草才能没马蹄（qiǎn cǎo cái néng mò mǎ tí）。\n最爱湖东行不足（zuì ài hú dōng xíng bù zú），绿杨阴里白沙堤（lǜ yáng yīn lǐ bái shā dī）。"
      ]
    },
    {
      type: "knowledge",
      title: "酬乐天扬州初逢席上见赠 · 刘禹锡",
      paragraphs: [
        "巴山楚水凄凉地（bā shān chǔ shuǐ qī liáng dì），二十三年弃置身（èr shí sān nián qì zhì shēn）。\n怀旧空吟闻笛赋（huái jiù kōng yín wén dí fù），到乡翻似烂柯人（dào xiāng fān sì làn kē rén）。\n沉舟侧畔千帆过（chén zhōu cè pàn qiān fān guò），病树前头万木春（bìng shù qián tóu wàn mù chūn）。\n今日听君歌一曲（jīn rì tīng jūn gē yī qǔ），暂凭杯酒长精神（zàn píng bēi jiǔ zhǎng jīng shén）。"
      ]
    },
    {
      type: "knowledge",
      title: "雁门太守行 · 李贺",
      paragraphs: [
        "黑云压城城欲摧（hēi yún yā chéng chéng yù cuī），甲光向日金鳞开（jiǎ guāng xiàng rì jīn lín kāi）。\n角声满天秋色里（jiǎo shēng mǎn tiān qiū sè lǐ），塞上燕脂凝夜紫（sài shàng yān zhī níng yè zǐ）。\n半卷红旗临易水（bàn juǎn hóng qí lín yì shuǐ），霜重鼓寒声不起（shuāng zhòng gǔ hán shēng bù qǐ）。\n报君黄金台上意（bào jūn huáng jīn tái shàng yì），提携玉龙为君死（tí xié yù lóng wèi jūn sǐ）。"
      ]
    },
    {
      type: "knowledge",
      title: "出塞 · 王昌龄",
      paragraphs: [
        "秦时明月汉时关（qín shí míng yuè hàn shí guān），万里长征人未还（wàn lǐ cháng zhēng rén wèi huán）。\n但使龙城飞将在（dàn shǐ lóng chéng fēi jiàng zài），不教胡马度阴山（bù jiào hú mǎ dù yīn shān）。"
      ]
    },
    {
      type: "knowledge",
      title: "夜雨寄北 · 李商隐",
      paragraphs: [
        "君问归期未有期（jūn wèn guī qī wèi yǒu qī），巴山夜雨涨秋池（bā shān yè yǔ zhǎng qiū chí）。\n何当共剪西窗烛（hé dāng gòng jiǎn xī chuāng zhú），却话巴山夜雨时（què huà bā shān yè yǔ shí）。"
      ]
    },
    {
      type: "knowledge",
      title: "无题 · 李商隐",
      paragraphs: [
        "相见时难别亦难（xiāng jiàn shí nán bié yì nán），东风无力百花残（dōng fēng wú lì bǎi huā cán）。\n春蚕到死丝方尽（chūn cán dào sǐ sī fāng jìn），蜡炬成灰泪始干（là jù chéng huī lèi shǐ gān）。\n晓镜但愁云鬓改（xiǎo jìng dàn chóu yún bìn gǎi），夜吟应觉月光寒（yè yín yīng jué yuè guāng hán）。\n蓬山此去无多路（péng shān cǐ qù wú duō lù），青鸟殷勤为探看（qīng niǎo yīn qín wèi tàn kàn）。"
      ]
    }
  ]
}
