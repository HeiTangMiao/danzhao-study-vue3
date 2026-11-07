/**
 * 内容页面数据（content-schema 的实例）
 * 页面：背诵专项 · 古文名篇（下）
 * 说明：每日背诵素材库（文言名篇 8 篇）—— 完整原文 + 逐字注音，供朗读背诵。
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
            "能通读文言原文，读准标注的多音字、生僻字与通假字",
            "能结合句意串讲全文，在理解的基础上熟读"
          ]
        }
      ]
    },
    {
      type: "knowledge",
      title: "《论语》十二章",
      paragraphs: [
        "子曰（zǐ yuē）：“学而时习之（xué ér shí xí zhī），不亦说乎（bù yì yuè hū）？有朋自远方来（yǒu péng zì yuǎn fāng lái），不亦乐乎（bù yì lè hū）？人不知而不愠（rén bù zhī ér bù yùn），不亦君子乎（bù yì jūn zǐ hū）？”\n曾子曰（zēng zǐ yuē）：“吾日三省吾身（wú rì sān xǐng wú shēn）：为人谋而不忠乎（wèi rén móu ér bù zhōng hū）？与朋友交而不信乎（yǔ péng yǒu jiāo ér bù xìn hū）？传不习乎（chuán bù xí hū）？”\n子曰（zǐ yuē）：“吾十有五而志于学（wú shí yòu wǔ ér zhì yú xué），三十而立（sān shí ér lì），四十而不惑（sì shí ér bù huò），五十而知天命（wǔ shí ér zhī tiān mìng），六十而耳顺（liù shí ér ěr shùn），七十而从心所欲（qī shí ér cóng xīn suǒ yù），不逾矩（bù yú jǔ）。”\n子曰（zǐ yuē）：“温故而知新（wēn gù ér zhī xīn），可以为师矣（kě yǐ wéi shī yǐ）。”\n子曰（zǐ yuē）：“学而不思则罔（xué ér bù sī zé wǎng），思而不学则殆（sī ér bù xué zé dài）。”\n子曰（zǐ yuē）：“贤哉（xián zāi），回也（huí yě）！一箪食（yì dān shí），一瓢饮（yì piáo yǐn），在陋巷（zài lòu xiàng），人不堪其忧（rén bù kān qí yōu），回也不改其乐（huí yě bù gǎi qí lè）。贤哉（xián zāi），回也（huí yě）！”\n子曰（zǐ yuē）：“知之者不如好之者（zhī zhī zhě bù rú hào zhī zhě），好之者不如乐之者（hào zhī zhě bù rú lè zhī zhě）。”\n子曰（zǐ yuē）：“饭疏食（fàn shū shí），饮水（yǐn shuǐ），曲肱而枕之（qū gōng ér zhěn zhī），乐亦在其中矣（lè yì zài qí zhōng yǐ）。不义而富且贵（bù yì ér fù qiě guì），于我如浮云（yú wǒ rú fú yún）。”\n子曰（zǐ yuē）：“三人行（sān rén xíng），必有我师焉（bì yǒu wǒ shī yān）。择其善者而从之（zé qí shàn zhě ér cóng zhī），其不善者而改之（qí bù shàn zhě ér gǎi zhī）。”\n子在川上曰（zǐ zài chuān shàng yuē）：“逝者如斯夫（shì zhě rú sī fú），不舍昼夜（bù shě zhòu yè）。”\n子曰（zǐ yuē）：“三军可夺帅也（sān jūn kě duó shuài yě），匹夫不可夺志也（pǐ fū bù kě duó zhì yě）。”\n子夏曰（zǐ xià yuē）：“博学而笃志（bó xué ér dǔ zhì），切问而近思（qiè wèn ér jìn sī），仁在其中矣（rén zài qí zhōng yǐ）。”"
      ]
    },
    {
      type: "knowledge",
      title: "《老子》四章（节选）",
      paragraphs: [
        "上善若水（shàng shàn ruò shuǐ）。\n水善利万物而不争（shuǐ shàn lì wàn wù ér bù zhēng），处众人之所恶（chǔ zhòng rén zhī suǒ wù），故几于道（gù jī yú dào）。\n居善地（jū shàn dì），心善渊（xīn shàn yuān），与善仁（yǔ shàn rén），言善信（yán shàn xìn），正善治（zhèng shàn zhì），事善能（shì shàn néng），动善时（dòng shàn shí）。\n夫唯不争（fú wéi bù zhēng），故无尤（gù wú yóu）。\n曲则全（qū zé quán），枉则直（wǎng zé zhí），洼则盈（wā zé yíng），敝则新（bì zé xīn），少则得（shǎo zé dé），多则惑（duō zé huò）。\n是以圣人抱一为天下式（shì yǐ shèng rén bào yī wéi tiān xià shì）。\n不自见（bú zì xiàn），故明（gù míng）；不自是（bú zì shì），故彰（gù zhāng）；不自伐（bú zì fá），故有功（gù yǒu gōng）；不自矜（bú zì jīn），故长（gù zhǎng）。\n夫唯不争（fú wéi bù zhēng），故天下莫能与之争（gù tiān xià mò néng yǔ zhī zhēng）。\n企者不立（qǐ zhě bù lì），跨者不行（kuà zhě bù xíng），自见者不明（zì xiàn zhě bù míng），自是者不彰（zì shì zhě bù zhāng），自伐者无功（zì fá zhě wú gōng），自矜者不长（zì jīn zhě bù zhǎng）。"
      ]
    },
    {
      type: "knowledge",
      title: "《孟子》· 鱼我所欲也 / 生于忧患（节选）",
      paragraphs: [
        "鱼（yú），我所欲也（wǒ suǒ yù yě）；熊掌（xióng zhǎng），亦我所欲也（yì wǒ suǒ yù yě）。\n二者不可得兼（èr zhě bù kě dé jiān），舍鱼而取熊掌者也（shě yú ér qǔ xióng zhǎng zhě yě）。\n生（shēng），亦我所欲也（yì wǒ suǒ yù yě）；义（yì），亦我所欲也（yì wǒ suǒ yù yě）。二者不可得兼（èr zhě bù kě dé jiān），舍生而取义者也（shě shēng ér qǔ yì zhě yě）。\n生亦我所欲（shēng yì wǒ suǒ yù），所欲有甚于生者（suǒ yù yǒu shèn yú shēng zhě），故不为苟得也（gù bù wéi gǒu dé yě）；死亦我所恶（sǐ yì wǒ suǒ wù），所恶有甚于死者（suǒ wù yǒu shèn yú sǐ zhě），故患有所不辟也（gù huàn yǒu suǒ bù bì yě）。\n……是故所欲有甚于生者（shì gù suǒ yù yǒu shèn yú shēng zhě），所恶有甚于死者（suǒ wù yǒu shèn yú sǐ zhě）。\n非独贤者有是心也（fēi dú xián zhě yǒu shì xīn yě），人皆有之（rén jiē yǒu zhī），贤者能勿丧耳（xián zhě néng wù sàng ěr）。\n故天将降大任于是人也（gù tiān jiāng jiàng dà rèn yú shì rén yě），必先苦其心志（bì xiān kǔ qí xīn zhì），劳其筋骨（láo qí jīn gǔ），饿其体肤（è qí tǐ fū），空乏其身（kōng fá qí shēn），行拂乱其所为（xíng fú luàn qí suǒ wéi），所以动心忍性（suǒ yǐ dòng xīn rěn xìng），曾益其所不能（zēng yì qí suǒ bù néng）。\n……然后知生于忧患而死于安乐也（rán hòu zhī shēng yú yōu huàn ér sǐ yú ān lè yě）。"
      ]
    },
    {
      type: "knowledge",
      title: "答谢中书书 · 陶弘景 / 与朱元思书 · 吴均",
      paragraphs: [
        "《答谢中书书》（dá xiè zhōng shū shū）：山川之美（shān chuān zhī měi），古来共谈（gǔ lái gòng tán）。\n高峰入云（gāo fēng rù yún），清流见底（qīng liú jiàn dǐ）。两岸石壁（liǎng àn shí bì），五色交辉（wǔ sè jiāo huī）。\n青林翠竹（qīng lín cuì zhú），四时俱备（sì shí jù bèi）。\n晓雾将歇（xiǎo wù jiāng xiē），猿鸟乱鸣（yuán niǎo luàn míng）；夕日欲颓（xī rì yù tuí），沉鳞竞跃（chén lín jìng yuè）。\n实是欲界之仙都（shí shì yù jiè zhī xiān dū）。\n自康乐以来（zì kāng lè yǐ lái），未复有能与其奇者（wèi fù yǒu néng yǔ qí qí zhě）。\n《与朱元思书》（yǔ zhū yuán sī shū）（节选）：风烟俱净（fēng yān jù jìng），天山共色（tiān shān gòng sè）。\n从流飘荡（cóng liú piāo dàng），任意东西（rèn yì dōng xī）。\n自富阳至桐庐一百许里（zì fù yáng zhì tóng lú yì bǎi xǔ lǐ），奇山异水（qí shān yì shuǐ），天下独绝（tiān xià dú jué）。\n水皆缥碧（shuǐ jiē piǎo bì），千丈见底（qiān zhàng jiàn dǐ）。\n游鱼细石（yóu yú xì shí），直视无碍（zhí shì wú ài）。\n急湍甚箭（jí tuān shèn jiàn），猛浪若奔（měng làng ruò bēn）。\n……鸢飞戾天者（yuān fēi lì tiān zhě），望峰息心（wàng fēng xī xīn）；经纶世务者（jīng lún shì wù zhě），窥谷忘反（kuī gǔ wàng fǎn）。\n横柯上蔽（héng kē shàng bì），在昼犹昏（zài zhòu yóu hūn）；疏条交映（shū tiáo jiāo yìng），有时见日（yǒu shí jiàn rì）。"
      ]
    },
    {
      type: "knowledge",
      title: "岳阳楼记 · 范仲淹",
      paragraphs: [
        "庆历四年春（qìng lì sì nián chūn），滕子京谪守巴陵郡（téng zǐ jīng zhé shǒu bā líng jùn）。\n越明年（yuè míng nián），政通人和（zhèng tōng rén hé），百废具兴（bǎi fèi jù xīng）。\n乃重修岳阳楼（nǎi chóng xiū yuè yáng lóu），增其旧制（zēng qí jiù zhì），刻唐贤今人诗赋于其上（kè táng xián jīn rén shī fù yú qí shàng）。\n属予作文以记之（zhǔ yǔ zuò wén yǐ jì zhī）。\n予观夫巴陵胜状（yú guān fú bā líng shèng zhuàng），在洞庭一湖（zài dòng tíng yì hú）。\n衔远山（xián yuǎn shān），吞长江（tūn cháng jiāng），浩浩汤汤（hào hào shāng shāng），横无际涯（héng wú jì yá）；朝晖夕阴（zhāo huī xī yīn），气象万千（qì xiàng wàn qiān）。\n此则岳阳楼之大观也（cǐ zé yuè yáng lóu zhī dà guān yě），前人之述备矣（qián rén zhī shù bèi yǐ）。\n然则北通巫峡（rán zé běi tōng wū xiá），南极潇湘（nán jí xiāo xiāng），迁客骚人（qiān kè sāo rén），多会于此（duō huì yú cǐ），览物之情（lǎn wù zhī qíng），得无异乎（dé wú yì hū）？\n若夫霪雨霏霏（ruò fú yín yǔ fēi fēi），连月不开（lián yuè bù kāi），阴风怒号（yīn fēng nù háo），浊浪排空（zhuó làng pái kōng）；日星隐曜（rì xīng yǐn yào），山岳潜形（shān yuè qián xíng）；商旅不行（shāng lǚ bù xíng），樯倾楫摧（qiáng qīng jí cuī）；薄暮冥冥（bó mù míng míng），虎啸猿啼（hǔ xiào yuán tí）。\n登斯楼也（dēng sī lóu yě），则有去国怀乡（zé yǒu qù guó huái xiāng），忧谗畏讥（yōu chán wèi jī），满目萧然（mǎn mù xiāo rán），感极而悲者矣（gǎn jí ér bēi zhě yǐ）。\n至若春和景明（zhì ruò chūn hé jǐng míng），波澜不惊（bō lán bù jīng），上下天光（shàng xià tiān guāng），一碧万顷（yí bì wàn qǐng）；沙鸥翔集（shā ōu xiáng jí），锦鳞游泳（jǐn lín yóu yǒng）；岸芷汀兰（àn zhǐ tīng lán），郁郁青青（yù yù qīng qīng）。\n而或长烟一空（ér huò cháng yān yì kōng），皓月千里（hào yuè qiān lǐ），浮光跃金（fú guāng yuè jīn），静影沉璧（jìng yǐng chén bì），渔歌互答（yú gē hù dá），此乐何极（cǐ lè hé jí）！\n登斯楼也（dēng sī lóu yě），则有心旷神怡（zé yǒu xīn kuàng shén yí），宠辱偕忘（chǒng rǔ xié wàng），把酒临风（bǎ jiǔ lín fēng），其喜洋洋者矣（qí xǐ yáng yáng zhě yǐ）。\n嗟夫（jiē fú）！予尝求古仁人之心（yú cháng qiú gǔ rén rén zhī xīn），或异二者之为（huò yì èr zhě zhī wéi），何哉（hé zāi）？\n不以物喜（bù yǐ wù xǐ），不以己悲（bù yǐ jǐ bēi）；居庙堂之高则忧其民（jū miào táng zhī gāo zé yōu qí mín）；处江湖之远则忧其君（chǔ jiāng hú zhī yuǎn zé yōu qí jūn）。\n是进亦忧（shì jìn yì yōu），退亦忧（tuì yì yōu）。\n然则何时而乐耶（rán zé hé shí ér lè yé）？其必曰（qí bì yuē）“先天下之忧而忧（xiān tiān xià zhī yōu ér yōu），后天下之乐而乐（hòu tiān xià zhī lè ér lè）”乎（hū）！\n噫（yī）！微斯人（wēi sī rén），吾谁与归（wú shuí yǔ guī）？\n时六年九月十五日（shí liù nián jiǔ yuè shí wǔ rì）。"
      ]
    },
    {
      type: "knowledge",
      title: "醉翁亭记 · 欧阳修",
      paragraphs: [
        "环滁皆山也（huán chú jiē shān yě）。\n其西南诸峰（qí xī nán zhū fēng），林壑尤美（lín hè yóu měi），望之蔚然而深秀者（wàng zhī wèi rán ér shēn xiù zhě），琅琊也（láng yá yě）。\n山行六七里（shān xíng liù qī lǐ），渐闻水声潺潺而泻出于两峰之间者（jiàn wén shuǐ shēng chán chán ér xiè chū yú liǎng fēng zhī jiān zhě），酿泉也（niàng quán yě）。\n峰回路转（fēng huí lù zhuǎn），有亭翼然临于泉上者（yǒu tíng yì rán lín yú quán shàng zhě），醉翁亭也（zuì wēng tíng yě）。\n作亭者谁（zuò tíng zhě shuí）？山之僧智仙也（shān zhī sēng zhì xiān yě）。\n名之者谁（míng zhī zhě shuí）？太守自谓也（tài shǒu zì wèi yě）。\n太守与客来饮于此（tài shǒu yǔ kè lái yǐn yú cǐ），饮少辄醉（yǐn shǎo zhé zuì），而年又最高（ér nián yòu zuì gāo），故自号曰醉翁也（gù zì hào yuē zuì wēng yě）。\n醉翁之意不在酒（zuì wēng zhī yì bù zài jiǔ），在乎山水之间也（zài hū shān shuǐ zhī jiān yě）。\n山水之乐（shān shuǐ zhī lè），得之心而寓之酒也（dé zhī xīn ér yù zhī jiǔ yě）。\n若夫日出而林霏开（ruò fú rì chū ér lín fēi kāi），云归而岩穴暝（yún guī ér yán xué míng），晦明变化者（huì míng biàn huà zhě），山间之朝暮也（shān jiān zhī zhāo mù yě）。\n野芳发而幽香（yě fāng fā ér yōu xiāng），佳木秀而繁阴（jiā mù xiù ér fán yīn），风霜高洁（fēng shuāng gāo jié），水落而石出者（shuǐ luò ér shí chū zhě），山间之四时也（shān jiān zhī sì shí yě）。\n朝而往（zhāo ér wǎng），暮而归（mù ér guī），四时之景不同（sì shí zhī jǐng bù tóng），而乐亦无穷也（ér lè yì wú qióng yě）。\n至于负者歌于途（zhì yú fù zhě gē yú tú），行者休于树（xíng zhě xiū yú shù），前者呼（qián zhě hū），后者应（hòu zhě yìng），伛偻提携（yǔ lǚ tí xié），往来而不绝者（wǎng lái ér bù jué zhě），滁人游也（chú rén yóu yě）。\n临溪而渔（lín xī ér yú），溪深而鱼肥（xī shēn ér yú féi）；酿泉为酒（niàng quán wéi jiǔ），泉香而酒洌（quán xiāng ér jiǔ liè）；山肴野蔌（shān yáo yě sù），杂然而前陈者（zá rán ér qián chén zhě），太守宴也（tài shǒu yàn yě）。\n宴酣之乐（yàn hān zhī lè），非丝非竹（fēi sī fēi zhú），射者中（shè zhě zhòng），弈者胜（yì zhě shèng），觥筹交错（gōng chóu jiāo cuò），起坐而喧哗者（qǐ zuò ér xuān huá zhě），众宾欢也（zhòng bīn huān yě）；苍颜白发（cāng yán bái fà），颓然乎其间者（tuí rán hū qí jiān zhě），太守醉也（tài shǒu zuì yě）。\n已而夕阳在山（yǐ ér xī yáng zài shān），人影散乱（rén yǐng sǎn luàn），太守归而宾客从也（tài shǒu guī ér bīn kè cóng yě）。\n树林阴翳（shù lín yīn yì），鸣声上下（míng shēng shàng xià），游人去而禽鸟乐也（yóu rén qù ér qín niǎo lè yě）。\n然而禽鸟知山林之乐（rán ér qín niǎo zhī shān lín zhī lè），而不知人之乐（ér bù zhī rén zhī lè）；人知从太守游而乐（rén zhī cóng tài shǒu yóu ér lè），而不知太守之乐其乐也（ér bù zhī tài shǒu zhī lè qí lè yě）。\n醉能同其乐（zuì néng tóng qí lè），醒能述以文者（xǐng néng shù yǐ wén zhě），太守也（tài shǒu yě）。\n太守谓谁（tài shǒu wèi shuí）？庐陵欧阳修也（lú líng ōu yáng xiū yě）。"
      ]
    },
    {
      type: "knowledge",
      title: "出师表 · 诸葛亮",
      paragraphs: [
        "先帝创业未半而中道崩殂（xiān dì chuàng yè wèi bàn ér zhōng dào bēng cú），今天下三分（jīn tiān xià sān fēn），益州疲弊（yì zhōu pí bì），此诚危急存亡之秋也（cǐ chéng wēi jí cún wáng zhī qiū yě）。\n然侍卫之臣不懈于内（rán shì wèi zhī chén bú xiè yú nèi），忠志之士忘身于外者（zhōng zhì zhī shì wàng shēn yú wài zhě），盖追先帝之殊遇（gài zhuī xiān dì zhī shū yù），欲报之于陛下也（yù bào zhī yú bì xià yě）。\n诚宜开张圣听（chéng yí kāi zhāng shèng tīng），以光先帝遗德（yǐ guāng xiān dì yí dé），恢弘志士之气（huī hóng zhì shì zhī qì），不宜妄自菲薄（bù yí wàng zì fěi bó），引喻失义（yǐn yù shī yì），以塞忠谏之路也（yǐ sè zhōng jiàn zhī lù yě）。\n宫中府中（gōng zhōng fǔ zhōng），俱为一体（jù wéi yì tǐ），陟罚臧否（zhì fá zāng pǐ），不宜异同（bù yí yì tóng）。\n若有作奸犯科及为忠善者（ruò yǒu zuò jiān fàn kē jí wéi zhōng shàn zhě），宜付有司论其刑赏（yí fù yǒu sī lùn qí xíng shǎng），以昭陛下平明之理（yǐ zhāo bì xià píng míng zhī lǐ），不宜偏私（bù yí piān sī），使内外异法也（shǐ nèi wài yì fǎ yě）。\n侍中（shì zhōng）、侍郎郭攸之（shì láng guō yōu zhī）、费祎（fèi yī）、董允等（dǒng yǔn děng），此皆良实（cǐ jiē liáng shí），志虑忠纯（zhì lǜ zhōng chún），是以先帝简拔以遗陛下（shì yǐ xiān dì jiǎn bá yǐ wèi bì xià）。\n愚以为宫中之事（yú yǐ wéi gōng zhōng zhī shì），事无大小（shì wú dà xiǎo），悉以咨之（xī yǐ zī zhī），然后施行（rán hòu shī xíng），必能裨补阙漏（bì néng bì bǔ quē lòu），有所广益（yǒu suǒ guǎng yì）。\n将军向宠（jiāng jūn xiàng chǒng），性行淑均（xìng xíng shū jūn），晓畅军事（xiǎo chàng jūn shì），试用于昔日（shì yòng yú xī rì），先帝称之曰能（xiān dì chēng zhī yuē néng），是以众议举宠为督（shì yǐ zhòng yì jǔ chǒng wéi dū）。\n愚以为营中之事（yú yǐ wéi yíng zhōng zhī shì），悉以咨之（xī yǐ zī zhī），必能使行阵和睦（bì néng shǐ háng zhèn hé mù），优劣得所（yōu liè dé suǒ）。\n亲贤臣（qīn xián chén），远小人（yuǎn xiǎo rén），此先汉所以兴隆也（cǐ xiān hàn suǒ yǐ xīng lóng yě）；亲小人（qīn xiǎo rén），远贤臣（yuǎn xián chén），此后汉所以倾颓也（cǐ hòu hàn suǒ yǐ qīng tuí yě）。\n先帝在时（xiān dì zài shí），每与臣论此事（měi yǔ chén lùn cǐ shì），未尝不叹息痛恨于桓（wèi cháng bù tàn xī tòng hèn yú huán）、灵也（líng yě）。\n侍中（shì zhōng）、尚书（shàng shū）、长史（zhǎng shǐ）、参军（cān jūn），此悉贞良死节之臣（cǐ xī zhēn liáng sǐ jié zhī chén），愿陛下亲之信之（yuàn bì xià qīn zhī xìn zhī），则汉室之隆（zé hàn shì zhī lóng），可计日而待也（kě jì rì ér dài yě）。\n臣本布衣（chén běn bù yī），躬耕于南阳（gōng gēng yú nán yáng），苟全性命于乱世（gǒu quán xìng mìng yú luàn shì），不求闻达于诸侯（bù qiú wén dá yú zhū hóu）。\n先帝不以臣卑鄙（xiān dì bù yǐ chén bēi bǐ），猥自枉屈（wěi zì wǎng qū），三顾臣于草庐之中（sān gù chén yú cǎo lú zhī zhōng），咨臣以当世之事（zī chén yǐ dāng shì zhī shì），由是感激（yóu shì gǎn jī），遂许先帝以驱驰（suì xǔ xiān dì yǐ qū chí）。\n后值倾覆（hòu zhí qīng fù），受任于败军之际（shòu rèn yú bài jūn zhī jì），奉命于危难之间（fèng mìng yú wēi nàn zhī jiān），尔来二十有一年矣（ěr lái èr shí yòu yī nián yǐ）。\n先帝知臣谨慎（xiān dì zhī chén jǐn shèn），故临崩寄臣以大事也（gù lín bēng jì chén yǐ dà shì yě）。\n受命以来（shòu mìng yǐ lái），夙夜忧叹（sù yè yōu tàn），恐托付不效（kǒng tuō fù bú xiào），以伤先帝之明（yǐ shāng xiān dì zhī míng），故五月渡泸（gù wǔ yuè dù lú），深入不毛（shēn rù bù máo）。\n今南方已定（jīn nán fāng yǐ dìng），兵甲已足（bīng jiǎ yǐ zú），当奖率三军（dāng jiǎng shuài sān jūn），北定中原（běi dìng zhōng yuán），庶竭驽钝（shù jié nú dùn），攘除奸凶（rǎng chú jiān xiōng），兴复汉室（xīng fù hàn shì），还于旧都（huán yú jiù dū）。\n此臣所以报先帝而忠陛下之职分也（cǐ chén suǒ yǐ bào xiān dì ér zhōng bì xià zhī zhí fèn yě）。\n至于斟酌损益（zhì yú zhēn zhuó sǔn yì），进尽忠言（jìn jìn zhōng yán），则攸之（zé yōu zhī）、祎（yī）、允之任也（yǔn zhī rèn yě）。\n愿陛下托臣以讨贼兴复之效（yuàn bì xià tuō chén yǐ tǎo zéi xīng fù zhī xiào），不效（bú xiào），则治臣之罪（zé zhì chén zhī zuì），以告先帝之灵（yǐ gào xiān dì zhī líng）。\n若无兴德之言（ruò wú xīng dé zhī yán），则责攸之（zé zé yōu zhī）、祎（yī）、允等之慢（yǔn děng zhī màn），以彰其咎（yǐ zhāng qí jiù）。\n陛下亦宜自谋（bì xià yì yí zì móu），以咨诹善道（yǐ zī zōu shàn dào），察纳雅言（chá nà yǎ yán），深追先帝遗诏（shēn zhuī xiān dì yí zhào）。\n臣不胜受恩感激（chén bú shèng shòu ēn gǎn jī）。\n今当远离（jīn dāng yuǎn lí），临表涕零（lín biǎo tì líng），不知所言（bù zhī suǒ yán）。"
      ]
    },
    {
      type: "knowledge",
      title: "赤壁赋 · 苏轼",
      paragraphs: [
        "壬戌之秋（rén xū zhī qiū），七月既望（qī yuè jì wàng），苏子与客泛舟游于赤壁之下（sū zǐ yǔ kè fàn zhōu yóu yú chì bì zhī xià）。\n清风徐来（qīng fēng xú lái），水波不兴（shuǐ bō bù xīng）。\n举酒属客（jǔ jiǔ zhǔ kè），诵明月之诗（sòng míng yuè zhī shī），歌窈窕之章（gē yǎo tiǎo zhī zhāng）。\n少焉（shǎo yān），月出于东山之上（yuè chū yú dōng shān zhī shàng），徘徊于斗牛之间（pái huái yú dǒu niú zhī jiān）。\n白露横江（bái lù héng jiāng），水光接天（shuǐ guāng jiē tiān）。\n纵一苇之所如（zòng yì wěi zhī suǒ rú），凌万顷之茫然（líng wàn qǐng zhī máng rán）。\n浩浩乎如冯虚御风（hào hào hū rú píng xū yù fēng），而不知其所止（ér bù zhī qí suǒ zhǐ）；飘飘乎如遗世独立（piāo piāo hū rú yí shì dú lì），羽化而登仙（yǔ huà ér dēng xiān）。\n于是饮酒乐甚（yú shì yǐn jiǔ lè shèn），扣舷而歌之（kòu xián ér gē zhī）。\n歌曰（gē yuē）：“桂棹兮兰桨（guì zhào xī lán jiǎng），击空明兮溯流光（jī kōng míng xī sù liú guāng）。渺渺兮予怀（miǎo miǎo xī yú huái），望美人兮天一方（wàng měi rén xī tiān yì fāng）。”\n客有吹洞箫者（kè yǒu chuī dòng xiāo zhě），倚歌而和之（yǐ gē ér hè zhī）。\n其声呜呜然（qí shēng wū wū rán），如怨如慕（rú yuàn rú mù），如泣如诉（rú qì rú sù），余音袅袅（yú yīn niǎo niǎo），不绝如缕（bù jué rú lǚ），舞幽壑之潜蛟（wǔ yōu hè zhī qián jiāo），泣孤舟之嫠妇（qì gū zhōu zhī lí fù）。\n苏子愀然（sū zǐ qiǎo rán），正襟危坐而问客曰（zhèng jīn wēi zuò ér wèn kè yuē）：“何为其然也（hé wéi qí rán yě）？”\n客曰（kè yuē）：“月明星稀（yuè míng xīng xī），乌鹊南飞（wū què nán fēi），此非曹孟德之诗乎（cǐ fēi cáo mèng dé zhī shī hū）？西望夏口（xī wàng xià kǒu），东望武昌（dōng wàng wǔ chāng），山川相缪（shān chuān xiāng liáo），郁乎苍苍（yù hū cāng cāng），此非孟德之困于周郎者乎（cǐ fēi mèng dé zhī kùn yú zhōu láng zhě hū）？\n方其破荆州（fāng qí pò jīng zhōu），下江陵（xià jiāng líng），顺流而东也（shùn liú ér dōng yě），舳舻千里（zhú lú qiān lǐ），旌旗蔽空（jīng qí bì kōng），酾酒临江（shī jiǔ lín jiāng），横槊赋诗（héng shuò fù shī），固一世之雄也（gù yí shì zhī xióng yě），而今安在哉（ér jīn ān zài zāi）？\n况吾与子渔樵于江渚之上（kuàng wú yǔ zǐ yú qiáo yú jiāng zhǔ zhī shàng），侣鱼虾而友麋鹿（lǚ yú xiā ér yǒu mí lù），驾一叶之扁舟（jià yí yè zhī piān zhōu），举匏樽以相属（jǔ páo zūn yǐ xiāng zhǔ）。\n寄蜉蝣于天地（jì fú yóu yú tiān dì），渺沧海之一粟（miǎo cāng hǎi zhī yí sù）。\n哀吾生之须臾（āi wú shēng zhī xū yú），羡长江之无穷（xiàn cháng jiāng zhī wú qióng）。\n挟飞仙以遨游（xié fēi xiān yǐ áo yóu），抱明月而长终（bào míng yuè ér cháng zhōng）。\n知不可乎骤得（zhī bù kě hū zhòu dé），托遗响于悲风（tuō yí xiǎng yú bēi fēng）。\n苏子曰（sū zǐ yuē）：“客亦知夫水与月乎（kè yì zhī fú shuǐ yǔ yuè hū）？逝者如斯（shì zhě rú sī），而未尝往也（ér wèi cháng wǎng yě）；盈虚者如彼（yíng xū zhě rú bǐ），而卒莫消长也（ér zú mò xiāo zhǎng yě）。\n盖将自其变者而观之（gài jiāng zì qí biàn zhě ér guān zhī），则天地曾不能以一瞬（zé tiān dì zēng bù néng yǐ yí shùn）；自其不变者而观之（zì qí bú biàn zhě ér guān zhī），则物与我皆无尽也（zé wù yǔ wǒ jiē wú jìn yě），而又何羡乎（ér yòu hé xiàn hū）！”\n且夫天地之间（qiě fú tiān dì zhī jiān），物各有主（wù gè yǒu zhǔ），苟非吾之所有（gǒu fēi wú zhī suǒ yǒu），虽一毫而莫取（suī yì háo ér mò qǔ）。\n惟江上之清风（wéi jiāng shàng zhī qīng fēng），与山间之明月（yǔ shān jiān zhī míng yuè），耳得之而为声（ěr dé zhī ér wéi shēng），目遇之而成色（mù yù zhī ér chéng sè），取之无禁（qǔ zhī wú jìn），用之不竭（yòng zhī bù jié）。\n是造物者之无尽藏也（shì zào wù zhě zhī wú jìn zàng yě），而吾与子之所共适（ér wú yǔ zǐ zhī suǒ gòng shì）。\n客喜而笑（kè xǐ ér xiào），洗盏更酌（xǐ zhǎn gēng zhuó）。\n肴核既尽（yáo hé jì jìn），杯盘狼籍（bēi pán láng jí）。\n相与枕藉乎舟中（xiāng yǔ zhěn jiè hū zhōu zhōng），不知东方之既白（bù zhī dōng fāng zhī jì bái）。"
      ]
    }
  ]
}
