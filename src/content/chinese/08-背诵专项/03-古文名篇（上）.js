/**
 * 内容页面数据（content-schema 的实例）
 * 页面：背诵专项 · 古文名篇（上）
 * 说明：每日背诵素材库（文言名篇 9 篇）—— 完整原文 + 难字注音，供朗读背诵。
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
      title: "三峡 · 郦道元",
      paragraphs: [
        "自三峡七百里中（zì sān xiá qī bǎi lǐ zhōng），两岸连山（liǎng àn lián shān），略无阙处（lüè wú quē chù）。\n重岩叠嶂（chóng yán dié zhàng），隐天蔽日（yǐn tiān bì rì）。\n自非亭午夜分（zì fēi tíng wǔ yè fēn），不见曦月（bú jiàn xī yuè）。\n至于夏水襄陵（zhì yú xià shuǐ xiāng líng），沿溯阻绝（yán sù zǔ jué）。\n或王命急宣（huò wáng mìng jí xuān），有时朝发白帝（yǒu shí zhāo fā bái dì），暮到江陵（mù dào jiāng líng），其间千二百里（qí jiān qiān èr bǎi lǐ），虽乘奔御风（suī chéng bēn yù fēng），不以疾也（bù yǐ jí yě）。\n春冬之时（chūn dōng zhī shí），则素湍绿潭（zé sù tuān lǜ tán），回清倒影（huí qīng dào yǐng）。\n绝巘多生怪柏（jué yǎn duō shēng guài bǎi），悬泉瀑布（xuán quán pù bù），飞漱其间（fēi shù qí jiān）。\n清荣峻茂（qīng róng jùn mào），良多趣味（liáng duō qù wèi）。\n每至晴初霜旦（měi zhì qíng chū shuāng dàn），林寒涧肃（lín hán jiàn sù），常有高猿长啸（cháng yǒu gāo yuán cháng xiào），属引凄异（zhǔ yǐn qī yì），空谷传响（kōng gǔ chuán xiǎng），哀转久绝（āi zhuǎn jiǔ jué）。\n故渔者歌曰（gù yú zhě gē yuē）：“巴东三峡巫峡长（bā dōng sān xiá wū xiá cháng），猿鸣三声泪沾裳（yuán míng sān shēng lèi zhān cháng）。”"
      ]
    },
    {
      type: "knowledge",
      title: "陋室铭 · 刘禹锡",
      paragraphs: [
        "山不在高（shān bù zài gāo），有仙则名（yǒu xiān zé míng）。水不在深（shuǐ bù zài shēn），有龙则灵（yǒu lóng zé líng）。\n斯是陋室（sī shì lòu shì），惟吾德馨（wéi wú dé xīn）。\n苔痕上阶绿（tái hén shàng jiē lǜ），草色入帘青（cǎo sè rù lián qīng）。\n谈笑有鸿儒（tán xiào yǒu hóng rú），往来无白丁（wǎng lái wú bái dīng）。\n可以调素琴（kě yǐ tiáo sù qín），阅金经（yuè jīn jīng）。\n无丝竹之乱耳（wú sī zhú zhī luàn ěr），无案牍之劳形（wú àn dú zhī láo xíng）。\n南阳诸葛庐（nán yáng zhū gě lú），西蜀子云亭（xī shǔ zǐ yún tíng）。\n孔子云（kǒng zǐ yún）：何陋之有（hé lòu zhī yǒu）？"
      ]
    },
    {
      type: "knowledge",
      title: "爱莲说 · 周敦颐",
      paragraphs: [
        "水陆草木之花（shuǐ lù cǎo mù zhī huā），可爱者甚蕃（kě ài zhě shèn fán）。\n晋陶渊明独爱菊（jìn táo yuān míng dú ài jú）。自李唐来（zì lǐ táng lái），世人甚爱牡丹（shì rén shèn ài mǔ dan）。\n予独爱莲之出淤泥而不染（yǔ dú ài lián zhī chū yū ní ér bù rǎn），濯清涟而不妖（zhuó qīng lián ér bù yāo），\n中通外直（zhōng tōng wài zhí），不蔓不枝（bù màn bù zhī），香远益清（xiāng yuǎn yì qīng），亭亭净植（tíng tíng jìng zhí），\n可远观而不可亵玩焉（kě yuǎn guān ér bù kě xiè wán yān）。\n予谓菊（yǔ wèi jú），花之隐逸者也（huā zhī yǐn yì zhě yě）；牡丹（mǔ dan），花之富贵者也（huā zhī fù guì zhě yě）；莲（lián），花之君子者也（huā zhī jūn zǐ zhě yě）。\n噫（yī）！菊之爱（jú zhī ài），陶后鲜有闻（táo hòu xiǎn yǒu wén）。\n莲之爱（lián zhī ài），同予者何人（tóng yǔ zhě hé rén）？牡丹之爱（mǔ dan zhī ài），宜乎众矣（yí hū zhòng yǐ）。"
      ]
    },
    {
      type: "knowledge",
      title: "记承天寺夜游 · 苏轼",
      paragraphs: [
        "元丰六年十月十二日夜（yuán fēng liù nián shí yuè shí èr rì yè），解衣欲睡（jiě yī yù shuì），月色入户（yuè sè rù hù），欣然起行（xīn rán qǐ xíng）。\n念无与为乐者（niàn wú yǔ wéi lè zhě），遂至承天寺寻张怀民（suì zhì chéng tiān sì xún zhāng huái mín）。\n怀民亦未寝（huái mín yì wèi qǐn），相与步于中庭（xiāng yǔ bù yú zhōng tíng）。\n庭下如积水空明（tíng xià rú jī shuǐ kōng míng），水中藻（shuǐ zhōng zǎo）、荇交横（xìng jiāo héng），盖竹柏影也（gài zhú bǎi yǐng yě）。\n何夜无月（hé yè wú yuè）？何处无竹柏（hé chù wú zhú bǎi）？但少闲人如吾两人者耳（dàn shǎo xián rén rú wú liǎng rén zhě ěr）。"
      ]
    },
    {
      type: "knowledge",
      title: "马说 / 师说 · 韩愈",
      paragraphs: [
        "《马说》（mǎ shuō）：世有伯乐（shì yǒu bó lè），然后有千里马（rán hòu yǒu qiān lǐ mǎ）。\n千里马常有（qiān lǐ mǎ cháng yǒu），而伯乐不常有（ér bó lè bù cháng yǒu）。\n故虽有名马（gù suī yǒu míng mǎ），祗辱于奴隶人之手（zhǐ rǔ yú nú lì rén zhī shǒu），骈死于槽枥之间（pián sǐ yú cáo lì zhī jiān），不以千里称也（bù yǐ qiān lǐ chēng yě）。\n马之千里者（mǎ zhī qiān lǐ zhě），一食或尽粟一石（yì shí huò jìn sù yí dàn）。\n食马者不知其能千里而食也（sì mǎ zhě bù zhī qí néng qiān lǐ ér sì yě）。\n是马也（shì mǎ yě），虽有千里之能（suī yǒu qiān lǐ zhī néng），食不饱（shí bù bǎo），力不足（lì bù zú），才美不外见（cái měi bù wài xiàn），且欲与常马等不可得（qiě yù yǔ cháng mǎ děng bù kě dé），安求其能千里也（ān qiú qí néng qiān lǐ yě）？\n策之不以其道（cè zhī bù yǐ qí dào），食之不能尽其材（sì zhī bù néng jìn qí cái），鸣之而不能通其意（míng zhī ér bù néng tōng qí yì），执策而临之（zhí cè ér lín zhī），曰（yuē）：“天下无马（tiān xià wú mǎ）！”\n呜呼（wū hū）！其真无马邪（qí zhēn wú mǎ yé）？其真不知马也（qí zhēn bù zhī mǎ yě）！\n《师说》（shī shuō）（节选）：古之学者必有师（gǔ zhī xué zhě bì yǒu shī）。\n师者（shī zhě），所以传道受业解惑也（suǒ yǐ chuán dào shòu yè jiě huò yě）。\n人非生而知之者（rén fēi shēng ér zhī zhī zhě），孰能无惑（shú néng wú huò）？\n惑而不从师（huò ér bù cóng shī），其为惑也（qí wéi huò yě），终不解矣（zhōng bù jiě yǐ）。\n……是故无贵无贱（shì gù wú guì wú jiàn），无长无少（wú zhǎng wú shào），道之所存（dào zhī suǒ cún），师之所存也（shī zhī suǒ cún yě）。"
      ]
    },
    {
      type: "knowledge",
      title: "劝学（节选） · 荀子",
      paragraphs: [
        "君子曰（jūn zǐ yuē）：学不可以已（xué bù kě yǐ yǐ）。\n青（qīng），取之于蓝（qǔ zhī yú lán），而青于蓝（ér qīng yú lán）；冰（bīng），水为之（shuǐ wéi zhī），而寒于水（ér hán yú shuǐ）。\n木直中绳（mù zhí zhòng shéng），輮以为轮（róu yǐ wéi lún），其曲中规（qí qū zhòng guī）。\n虽有槁暴（suī yǒu gǎo pù），不复挺者（bú fù tǐng zhě），輮使之然也（róu shǐ zhī rán yě）。\n故木受绳则直（gù mù shòu shéng zé zhí），金就砺则利（jīn jiù lì zé lì），君子博学而日参省乎己（jūn zǐ bó xué ér rì cān xǐng hū jǐ），则知明而行无过矣（zé zhì míng ér xíng wú guò yǐ）。\n……故不积跬步（gù bù jī kuǐ bù），无以至千里（wú yǐ zhì qiān lǐ）；不积小流（bù jī xiǎo liú），无以成江海（wú yǐ chéng jiāng hǎi）。\n骐骥一跃（qí jì yí yuè），不能十步（bù néng shí bù）；驽马十驾（nú mǎ shí jià），功在不舍（gōng zài bù shě）。\n锲而舍之（qiè ér shě zhī），朽木不折（xiǔ mù bù zhé）；锲而不舍（qiè ér bù shě），金石可镂（jīn shí kě lòu）。"
      ]
    },
    {
      type: "knowledge",
      title: "邹忌讽齐王纳谏 · 《战国策》",
      paragraphs: [
        "邹忌修八尺有余（zōu jì xiū bā chǐ yǒu yú），而形貌昳丽（ér xíng mào yì lì）。\n朝服衣冠（zhāo fú yī guān），窥镜（kuī jìng），谓其妻曰（wèi qí qī yuē）：“我孰与城北徐公美（wǒ shú yǔ chéng běi xú gōng měi）？”\n其妻曰（qí qī yuē）：“君美甚（jūn měi shèn），徐公何能及君也（xú gōng hé néng jí jūn yě）？”\n……明日徐公来（míng rì xú gōng lái），孰视之（shú shì zhī），自以为不如（zì yǐ wéi bù rú）；窥镜而自视（kuī jìng ér zì shì），又弗如远甚（yòu fú rú yuǎn shèn）。\n暮寝而思之（mù qǐn ér sī zhī），曰（yuē）：“吾妻之美我者（wú qī zhī měi wǒ zhě），私我也（sī wǒ yě）；妾之美我者（qiè zhī měi wǒ zhě），畏我也（wèi wǒ yě）；客之美我者（kè zhī měi wǒ zhě），欲有求于我也（yù yǒu qiú yú wǒ yě）。”\n于是入朝见威王（yú shì rù cháo jiàn wēi wáng），曰（yuē）：“……今齐地方千里（jīn qí dì fāng qiān lǐ），百二十城（bǎi èr shí chéng），宫妇左右莫不私王（gōng fù zuǒ yòu mò bù sī wáng），朝廷之臣莫不畏王（cháo tíng zhī chén mò bù wèi wáng），四境之内莫不有求于王（sì jìng zhī nèi mò bù yǒu qiú yú wáng）：由此观之（yóu cǐ guān zhī），王之蔽甚矣（wáng zhī bì shèn yǐ）。”"
      ]
    },
    {
      type: "knowledge",
      title: "曹刿论战 · 《左传》",
      paragraphs: [
        "十年春（shí nián chūn），齐师伐我（qí shī fá wǒ）。\n公将战（gōng jiāng zhàn），曹刿请见（cáo guì qǐng jiàn）。\n其乡人曰（qí xiāng rén yuē）：“肉食者谋之（ròu shí zhě móu zhī），又何间焉（yòu hé jiàn yān）？”\n刿曰（guì yuē）：“肉食者鄙（ròu shí zhě bǐ），未能远谋（wèi néng yuǎn móu）。”\n乃入见（nǎi rù jiàn）。问（wèn）：“何以战（hé yǐ zhàn）？”\n……公曰（gōng yuē）：“小大之狱（xiǎo dà zhī yù），虽不能察（suī bù néng chá），必以情（bì yǐ qíng）。”\n对曰（duì yuē）：“忠之属也（zhōng zhī shǔ yě）。可以一战（kě yǐ yí zhàn）。战则请从（zhàn zé qǐng cóng）。”\n……既克（jì kè），公问其故（gōng wèn qí gù）。\n对曰（duì yuē）：“夫战（fú zhàn），勇气也（yǒng qì yě）。一鼓作气（yì gǔ zuò qì），再而衰（zài ér shuāi），三而竭（sān ér jié）。\n彼竭我盈（bǐ jié wǒ yíng），故克之（gù kè zhī）。\n夫大国（fú dà guó），难测也（nán cè yě），惧有伏焉（jù yǒu fú yān）。\n吾视其辙乱（wú shì qí zhé luàn），望其旗靡（wàng qí qí mǐ），故逐之（gù zhú zhī）。”"
      ]
    },
    {
      type: "knowledge",
      title: "桃花源记 · 陶渊明",
      paragraphs: [
        "晋太元中（jìn tài yuán zhōng），武陵人捕鱼为业（wǔ líng rén bǔ yú wéi yè）。\n缘溪行（yuán xī xíng），忘路之远近（wàng lù zhī yuǎn jìn）。\n忽逢桃花林（hū féng táo huā lín），夹岸数百步（jiā àn shù bǎi bù），中无杂树（zhōng wú zá shù），芳草鲜美（fāng cǎo xiān měi），落英缤纷（luò yīng bīn fēn）。\n渔人甚异之（yú rén shèn yì zhī）。复前行（fù qián xíng），欲穷其林（yù qióng qí lín）。\n林尽水源（lín jìn shuǐ yuán），便得一山（biàn dé yì shān），山有小口（shān yǒu xiǎo kǒu），仿佛若有光（fǎng fú ruò yǒu guāng）。\n便舍船（biàn shě chuán），从口入（cóng kǒu rù）。初极狭（chū jí xiá），才通人（cái tōng rén）。\n复行数十步（fù xíng shù shí bù），豁然开朗（huò rán kāi lǎng）。\n土地平旷（tǔ dì píng kuàng），屋舍俨然（wū shè yǎn rán），有良田（yǒu liáng tián）、美池（měi chí）、桑竹之属（sāng zhú zhī shǔ）。\n阡陌交通（qiān mò jiāo tōng），鸡犬相闻（jī quǎn xiāng wén）。\n其中往来种作（qí zhōng wǎng lái zhòng zuò），男女衣着（nán nǚ yī zhuó），悉如外人（xī rú wài rén）。\n黄发垂髫（huáng fà chuí tiáo），并怡然自乐（bìng yí rán zì lè）。"
      ]
    }
  ]
}
