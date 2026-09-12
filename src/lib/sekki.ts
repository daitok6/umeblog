/**
 * 七十二候 — the 72 micro-seasons, each roughly five days.
 *
 * Used for two things: the writing prompt on the dashboard, and the small
 * season line on the public site. Its value is that it gives her an opening
 * on a day when nothing comes to mind, and it sets a five-day rhythm rather
 * than a daily one — a quiet day is then not a failure.
 *
 * Start dates drift by about a day from year to year, so lookup is by range
 * (the latest entry whose start is on or before today) rather than exact match.
 */

export type Kou = {
  /** 二十四節気 this belongs to. */
  sekki: string;
  /** 初候 / 次候 / 末候 */
  phase: "初候" | "次候" | "末候";
  name: string;
  reading: string;
  /** Approximate start, [month, day]. */
  start: [number, number];
  /** A short opening line, offered as a prompt. */
  hint: string;
};

export const KOU: Kou[] = [
  { sekki: "小寒", phase: "初候", name: "芹乃栄", reading: "せりすなわちさかう", start: [1, 5], hint: "芹が育ちはじめるころ。" },
  { sekki: "小寒", phase: "次候", name: "水泉動", reading: "しみずあたたかをふくむ", start: [1, 10], hint: "地中の水が動きはじめるころ。" },
  { sekki: "小寒", phase: "末候", name: "雉始雊", reading: "きじはじめてなく", start: [1, 15], hint: "雉が鳴きはじめるころ。" },
  { sekki: "大寒", phase: "初候", name: "款冬華", reading: "ふきのはなさく", start: [1, 20], hint: "ふきのとうが顔を出すころ。" },
  { sekki: "大寒", phase: "次候", name: "水沢腹堅", reading: "さわみずこおりつめる", start: [1, 25], hint: "沢の水が厚く凍るころ。" },
  { sekki: "大寒", phase: "末候", name: "鶏始乳", reading: "にわとりはじめてとやにつく", start: [1, 30], hint: "鶏が卵を産みはじめるころ。" },
  { sekki: "立春", phase: "初候", name: "東風解凍", reading: "はるかぜこおりをとく", start: [2, 4], hint: "春の風が氷をとかすころ。" },
  { sekki: "立春", phase: "次候", name: "黄鶯睍睆", reading: "うぐいすなく", start: [2, 9], hint: "うぐいすが鳴きはじめるころ。" },
  { sekki: "立春", phase: "末候", name: "魚上氷", reading: "うおこおりをいずる", start: [2, 14], hint: "割れた氷から魚が跳ねるころ。" },
  { sekki: "雨水", phase: "初候", name: "土脉潤起", reading: "つちのしょううるおいおこる", start: [2, 19], hint: "雨が土をうるおすころ。" },
  { sekki: "雨水", phase: "次候", name: "霞始靆", reading: "かすみはじめてたなびく", start: [2, 24], hint: "霞がたなびきはじめるころ。" },
  { sekki: "雨水", phase: "末候", name: "草木萌動", reading: "そうもくめばえいずる", start: [3, 1], hint: "草木が芽を出すころ。" },
  { sekki: "啓蟄", phase: "初候", name: "蟄虫啓戸", reading: "すごもりむしとをひらく", start: [3, 6], hint: "冬ごもりの虫が出てくるころ。" },
  { sekki: "啓蟄", phase: "次候", name: "桃始笑", reading: "ももはじめてさく", start: [3, 11], hint: "桃の花が咲きはじめるころ。" },
  { sekki: "啓蟄", phase: "末候", name: "菜虫化蝶", reading: "なむしちょうとなる", start: [3, 16], hint: "青虫が蝶になるころ。" },
  { sekki: "春分", phase: "初候", name: "雀始巣", reading: "すずめはじめてすくう", start: [3, 21], hint: "雀が巣をつくりはじめるころ。" },
  { sekki: "春分", phase: "次候", name: "桜始開", reading: "さくらはじめてひらく", start: [3, 26], hint: "桜が咲きはじめるころ。" },
  { sekki: "春分", phase: "末候", name: "雷乃発声", reading: "かみなりすなわちこえをはっす", start: [3, 31], hint: "遠くで雷が鳴りはじめるころ。" },
  { sekki: "清明", phase: "初候", name: "玄鳥至", reading: "つばめきたる", start: [4, 5], hint: "つばめが南から帰ってくるころ。" },
  { sekki: "清明", phase: "次候", name: "鴻雁北", reading: "こうがんかえる", start: [4, 10], hint: "雁が北へ帰っていくころ。" },
  { sekki: "清明", phase: "末候", name: "虹始見", reading: "にじはじめてあらわる", start: [4, 15], hint: "雨上がりに虹が出はじめるころ。" },
  { sekki: "穀雨", phase: "初候", name: "葭始生", reading: "あしはじめてしょうず", start: [4, 20], hint: "水辺の葦が芽を出すころ。" },
  { sekki: "穀雨", phase: "次候", name: "霜止出苗", reading: "しもやんでなえいずる", start: [4, 25], hint: "霜が終わり苗が育つころ。" },
  { sekki: "穀雨", phase: "末候", name: "牡丹華", reading: "ぼたんはなさく", start: [4, 30], hint: "牡丹が大きく咲くころ。" },
  { sekki: "立夏", phase: "初候", name: "蛙始鳴", reading: "かわずはじめてなく", start: [5, 5], hint: "蛙が鳴きはじめるころ。" },
  { sekki: "立夏", phase: "次候", name: "蚯蚓出", reading: "みみずいずる", start: [5, 10], hint: "みみずが土から出てくるころ。" },
  { sekki: "立夏", phase: "末候", name: "竹笋生", reading: "たけのこしょうず", start: [5, 15], hint: "たけのこが出るころ。" },
  { sekki: "小満", phase: "初候", name: "蚕起食桑", reading: "かいこおきてくわをはむ", start: [5, 21], hint: "蚕が桑を食べるころ。" },
  { sekki: "小満", phase: "次候", name: "紅花栄", reading: "べにばなさかう", start: [5, 26], hint: "紅花が咲きそろうころ。" },
  { sekki: "小満", phase: "末候", name: "麦秋至", reading: "むぎのときいたる", start: [5, 31], hint: "麦が黄金色に熟すころ。" },
  { sekki: "芒種", phase: "初候", name: "螳螂生", reading: "かまきりしょうず", start: [6, 6], hint: "かまきりが生まれるころ。" },
  { sekki: "芒種", phase: "次候", name: "腐草為蛍", reading: "くされたるくさほたるとなる", start: [6, 11], hint: "蛍が飛びはじめるころ。" },
  { sekki: "芒種", phase: "末候", name: "梅子黄", reading: "うめのみきばむ", start: [6, 16], hint: "梅の実が黄色く熟すころ。" },
  { sekki: "夏至", phase: "初候", name: "乃東枯", reading: "なつかれくさかるる", start: [6, 21], hint: "夏枯草が枯れていくころ。" },
  { sekki: "夏至", phase: "次候", name: "菖蒲華", reading: "あやめはなさく", start: [6, 26], hint: "あやめが咲くころ。" },
  { sekki: "夏至", phase: "末候", name: "半夏生", reading: "はんげしょうず", start: [7, 1], hint: "半夏が生えるころ。梅雨の終わり。" },
  { sekki: "小暑", phase: "初候", name: "温風至", reading: "あつかぜいたる", start: [7, 7], hint: "熱い風が吹きはじめるころ。" },
  { sekki: "小暑", phase: "次候", name: "蓮始開", reading: "はすはじめてひらく", start: [7, 12], hint: "蓮の花が開くころ。" },
  { sekki: "小暑", phase: "末候", name: "鷹乃学習", reading: "たかすなわちわざをならう", start: [7, 17], hint: "鷹の子が飛びかたを覚えるころ。" },
  { sekki: "大暑", phase: "初候", name: "桐始結花", reading: "きりはじめてはなをむすぶ", start: [7, 23], hint: "桐が実を結ぶころ。" },
  { sekki: "大暑", phase: "次候", name: "土潤溽暑", reading: "つちうるおうてむしあつし", start: [7, 28], hint: "土が湿って蒸し暑いころ。" },
  { sekki: "大暑", phase: "末候", name: "大雨時行", reading: "たいうときどきふる", start: [8, 2], hint: "夕立が降るころ。" },
  { sekki: "立秋", phase: "初候", name: "涼風至", reading: "すずかぜいたる", start: [8, 7], hint: "涼しい風が立ちはじめるころ。" },
  { sekki: "立秋", phase: "次候", name: "寒蝉鳴", reading: "ひぐらしなく", start: [8, 12], hint: "ひぐらしが鳴くころ。" },
  { sekki: "立秋", phase: "末候", name: "蒙霧升降", reading: "ふかききりまとう", start: [8, 17], hint: "深い霧が立ちこめるころ。" },
  { sekki: "処暑", phase: "初候", name: "綿柎開", reading: "わたのはなしべひらく", start: [8, 23], hint: "綿の実がはじけるころ。" },
  { sekki: "処暑", phase: "次候", name: "天地始粛", reading: "てんちはじめてさむし", start: [8, 28], hint: "暑さがようやくおさまるころ。" },
  { sekki: "処暑", phase: "末候", name: "禾乃登", reading: "こくものすなわちみのる", start: [9, 2], hint: "稲が実るころ。" },
  { sekki: "白露", phase: "初候", name: "草露白", reading: "くさのつゆしろし", start: [9, 7], hint: "草の露が白く光るころ。" },
  { sekki: "白露", phase: "次候", name: "鶺鴒鳴", reading: "せきれいなく", start: [9, 12], hint: "せきれいが鳴きはじめるころ。" },
  { sekki: "白露", phase: "末候", name: "玄鳥去", reading: "つばめさる", start: [9, 17], hint: "つばめが南へ帰るころ。" },
  { sekki: "秋分", phase: "初候", name: "雷乃収声", reading: "かみなりすなわちこえをおさむ", start: [9, 23], hint: "雷が鳴らなくなるころ。" },
  { sekki: "秋分", phase: "次候", name: "蟄虫坏戸", reading: "むしかくれてとをふさぐ", start: [9, 28], hint: "虫が土にこもるころ。" },
  { sekki: "秋分", phase: "末候", name: "水始涸", reading: "みずはじめてかるる", start: [10, 3], hint: "田の水を落とすころ。" },
  { sekki: "寒露", phase: "初候", name: "鴻雁来", reading: "こうがんきたる", start: [10, 8], hint: "雁が渡ってくるころ。" },
  { sekki: "寒露", phase: "次候", name: "菊花開", reading: "きくのはなひらく", start: [10, 13], hint: "菊が咲きはじめるころ。" },
  { sekki: "寒露", phase: "末候", name: "蟋蟀在戸", reading: "きりぎりすとにあり", start: [10, 18], hint: "戸口で虫が鳴くころ。" },
  { sekki: "霜降", phase: "初候", name: "霜始降", reading: "しもはじめてふる", start: [10, 23], hint: "初霜が降りるころ。" },
  { sekki: "霜降", phase: "次候", name: "霎時施", reading: "こさめときどきふる", start: [10, 28], hint: "小雨がときどき降るころ。" },
  { sekki: "霜降", phase: "末候", name: "楓蔦黄", reading: "もみじつたきばむ", start: [11, 2], hint: "もみじや蔦が色づくころ。" },
  { sekki: "立冬", phase: "初候", name: "山茶始開", reading: "つばきはじめてひらく", start: [11, 7], hint: "山茶花が咲きはじめるころ。" },
  { sekki: "立冬", phase: "次候", name: "地始凍", reading: "ちはじめてこおる", start: [11, 12], hint: "大地が凍りはじめるころ。" },
  { sekki: "立冬", phase: "末候", name: "金盞香", reading: "きんせんかさく", start: [11, 17], hint: "水仙が香りはじめるころ。" },
  { sekki: "小雪", phase: "初候", name: "虹蔵不見", reading: "にじかくれてみえず", start: [11, 22], hint: "虹を見かけなくなるころ。" },
  { sekki: "小雪", phase: "次候", name: "朔風払葉", reading: "きたかぜこのはをはらう", start: [11, 27], hint: "北風が葉を落とすころ。" },
  { sekki: "小雪", phase: "末候", name: "橘始黄", reading: "たちばなはじめてきばむ", start: [12, 2], hint: "橘の実が黄色くなるころ。" },
  { sekki: "大雪", phase: "初候", name: "閉塞成冬", reading: "そらさむくふゆとなる", start: [12, 7], hint: "空が閉ざされ冬になるころ。" },
  { sekki: "大雪", phase: "次候", name: "熊蟄穴", reading: "くまあなにこもる", start: [12, 12], hint: "熊が穴にこもるころ。" },
  { sekki: "大雪", phase: "末候", name: "鱖魚群", reading: "さけのうおむらがる", start: [12, 16], hint: "鮭が群れをなして遡るころ。" },
  { sekki: "冬至", phase: "初候", name: "乃東生", reading: "なつかれくさしょうず", start: [12, 21], hint: "夏枯草が芽を出すころ。" },
  { sekki: "冬至", phase: "次候", name: "麋角解", reading: "さわしかのつのおつる", start: [12, 26], hint: "鹿の角が落ちるころ。" },
  { sekki: "冬至", phase: "末候", name: "雪下出麦", reading: "ゆきわたりてむぎいづる", start: [12, 31], hint: "雪の下で麦が芽を出すころ。" },
];

/** Day-of-year ordinal used only for ordering; leap years are irrelevant at 5-day resolution. */
function ordinal(month: number, day: number): number {
  return month * 100 + day;
}

/**
 * The 候 covering a given date. Falls back to the final entry (雪下出麦, Dec 31)
 * for the first days of January, which is correct: it runs until 小寒 on Jan 5.
 */
export function kouFor(date: Date = new Date()): Kou {
  const target = ordinal(date.getMonth() + 1, date.getDate());
  let current = KOU[KOU.length - 1];
  for (const k of KOU) {
    if (ordinal(k.start[0], k.start[1]) <= target) current = k;
  }
  return current;
}

export function formatKou(k: Kou): string {
  return k.sekki + " " + k.phase + " — " + k.name + "（" + k.reading + "）";
}
