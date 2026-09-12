/**
 * LOCAL DEV/DESIGN USE ONLY — not part of setup, and never meant to run
 * against a real deployment. This is not how the blog ships: it exists so a
 * developer working on layout/pagination/the calendar has something
 * realistic to look at locally, on their own database.
 *
 * Seeds a realistic year of writing into an EXISTING author/reader pair.
 *
 * Deliberately uneven: there are busy stretches and two multi-week gaps,
 * because the dashboard has to look right for a real person rather than for
 * a demo. The gaps are what prove the design rule — they must render as
 * quiet, never as failure.
 *
 * Account creation is a separate, explicit act (`pnpm create-user`) — this
 * script never creates or deletes login credentials, only content.
 */
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import * as schema from "../src/lib/db/schema";

const DAY = 86400000;

const ENTRIES: Array<{ title: string; lead: string; body: string[]; tags: string[]; tiny?: boolean }> = [
  {
    title: "六月、雨の匂いについて",
    lead: "雨が降る前の、あの匂いの名前をずっと知らないままでいる。",
    body: [
      "朝はいつも同じ道を歩く。角のパン屋が開くのは七時ちょうどで、それより早く着いてしまった日は、川沿いのベンチに座っている。",
      "水面がゆっくり明るくなっていくのを眺めながら、今日は何を書こうか、と考える。たいていは何も決まらないまま、家に帰って書きはじめる。",
      "雨の匂いには名前があると、あとから知った。ペトリコールというらしい。知ってしまうと少しつまらない。",
    ],
    tags: ["日々", "雨"],
  },
  {
    title: "週末に作ったスープ",
    lead: "玉ねぎを三十分炒める、という話をずっと疑っていた。",
    body: [
      "玉ねぎを三十分炒める。それだけで味が決まるという話を、ずっと疑っていました。",
      "実際にやってみると、二十分を過ぎたあたりで色が変わる。そこからが早い。目を離すと焦げる。",
      "結局、味が決まるのは時間ではなくて、その二十分を待てるかどうかなのだと思う。",
    ],
    tags: ["ごはん"],
  },
  {
    title: "新しい器を買った日",
    lead: "駅裏の古道具屋で、欠けた小皿を三枚。",
    body: [
      "駅の裏の古道具屋で、欠けた小皿を三枚買った。店主が包みながら産地の話をしてくれた。",
      "欠けているから安い、と言われたけれど、欠けているほうがいいと思ったから買った。",
    ],
    tags: ["日々", "うつわ"],
  },
  { title: "今日の空", lead: "", body: ["曇り。洗濯物は部屋の中。"], tags: ["日々"], tiny: true },
  {
    title: "駅裏の古本屋",
    lead: "店主が眠っている店で、本を選ぶ時間が好きだ。",
    body: [
      "その店はいつ行っても店主が眠っている。起こすのも悪いので、静かに棚を見る。",
      "背表紙だけを眺めて帰る日もある。それでも行く。",
    ],
    tags: ["さんぽ", "本"],
  },
  { title: "朝の川", lead: "", body: ["七時の川は、思っていたより音がする。"], tags: ["さんぽ"], tiny: true },
  {
    title: "紅茶の温度",
    lead: "熱すぎる紅茶は、味がしないことに気づいた。",
    body: [
      "淹れてすぐ飲むのをやめた。三分待つ。それだけで別のものになる。",
      "待つ、というのは最近のわたしの主題かもしれない。スープも紅茶も、待てば変わる。",
    ],
    tags: ["ごはん"],
  },
  {
    title: "冬のはじまり",
    lead: "コートを出す日を、毎年少しずつ間違える。",
    body: ["今年も一日早かった。暑かった。", "でも出してしまったから、もう着る。"],
    tags: ["日々"],
  },
  { title: "みかん", lead: "", body: ["こたつはないが、みかんはある。"], tags: ["ごはん"], tiny: true },
  {
    title: "掃除をした",
    lead: "捨てられないものの共通点について。",
    body: [
      "半日かけて棚を片づけた。捨てられないものには共通点がある。誰かがくれたものだ。",
      "自分で買ったものは、意外とすぐ捨てられる。",
    ],
    tags: ["日々"],
  },
  {
    title: "春の雪",
    lead: "積もらない雪は、降っている間だけのものだ。",
    body: ["朝起きたら白かった。昼にはもう消えていた。", "写真を撮っておいてよかった。"],
    tags: ["日々", "雨"],
  },
  { title: "桜、まだ", lead: "", body: ["三分咲き。来週また来る。"], tags: ["さんぽ"], tiny: true },
];

async function main() {
  // Ordered by id so this deterministically picks the first real account
  // created (via `create-user`) rather than a later test fixture, if both
  // happen to exist in the same database.
  const author = await db.query.users.findFirst({
    where: eq(schema.users.role, "author"),
    orderBy: (u, { asc }) => asc(u.id),
  });
  const reader = await db.query.users.findFirst({
    where: eq(schema.users.role, "reader"),
    orderBy: (u, { asc }) => asc(u.id),
  });

  if (!author || !reader) {
    console.error("No author/reader account found. Create both first, e.g.:");
    console.error(
      '  pnpm create-user -- --email you@example.com --name "うめ" --role author --password "…"',
    );
    console.error(
      '  pnpm create-user -- --email friend@example.com --name "だいと" --role reader --password "…"',
    );
    process.exit(1);
  }

  console.log("seeding content…");

  await db.delete(schema.postTags);
  await db.delete(schema.replies);
  await db.delete(schema.comments);
  await db.delete(schema.posts);
  await db.delete(schema.tags);
  await db.delete(schema.images);
  await db.delete(schema.blockedWords);
  await db.delete(schema.siteSettings);

  const now = Date.now();

  await db.insert(schema.siteSettings).values({
    id: 1,
    title: "うめ",
    bannerTitle: "",
    tagline: "日々の記録",
    aboutMd:
      "毎日のことを書いています。ごはんと、さんぽと、天気のことが多いです。\n\nテーマは決めていません。決めないまま続けるつもりです。",
  });

  // A self-authored Japanese list. English profanity lists catch nothing here.
  await db
    .insert(schema.blockedWords)
    .values(["死ね", "殺す", "バカ", "アホ", "詐欺", "稼げる", "副業"].map((word) => ({ word })));

  /**
   * Publish dates: an uneven year with two real gaps, so the calendar and the
   * 最高記録 figure are exercised by something like real behaviour.
   */
  const offsets = [
    330, 329, 328, 326, 322, 318, 317, 316, 310, 305, 301, 300,
    // gap ~5 weeks
    262, 261, 260, 259, 258, 250, 246, 240, 239, 232, 228, 220,
    215, 214, 213, 205, 200, 196,
    // gap ~7 weeks
    145, 144, 140, 136, 130, 129, 128, 127, 120, 116, 110, 105,
    100, 96, 90, 88, 80, 74, 70, 66, 60, 55, 48, 40, 33, 27, 20, 14, 9, 5, 2, 0,
  ];

  let serial = 0;
  const postIds: number[] = [];

  for (let i = 0; i < offsets.length; i++) {
    const e = ENTRIES[i % ENTRIES.length];
    const publishedAt = now - offsets[i] * DAY + 9 * 3600000;
    serial += 1;
    const suffix = i >= ENTRIES.length ? `-${i}` : "";
    // Repeats get the month prepended so no two posts share a title.
    const cycle = Math.floor(i / ENTRIES.length);
    const month = new Date(publishedAt).getMonth() + 1;
    const title = cycle === 0 ? e.title : `${month}月の${e.title}`;

    const content = e.body.map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text, styles: {} }],
    }));

    const [row] = await db
      .insert(schema.posts)
      .values({
        serial,
        slug: `${serial}-${title.slice(0, 14)}${suffix}`,
        title,
        lead: e.lead,
        contentJson: JSON.stringify(content),
        status: "published",
        isTiny: !!e.tiny,
        authorId: author.id,
        publishedAt,
        createdAt: publishedAt,
        updatedAt: publishedAt,
      })
      .returning({ id: schema.posts.id });

    postIds.push(row.id);

    for (const name of e.tags) {
      let tag = await db.query.tags.findFirst({ where: (t, { eq }) => eq(t.name, name) });
      if (!tag) {
        const [created] = await db
          .insert(schema.tags)
          .values({ name, slug: name })
          .returning();
        tag = created;
      }
      await db.insert(schema.postTags).values({ postId: row.id, tagId: tag.id }).onConflictDoNothing();
    }
  }

  // A draft and one awaiting review, so the admin has something in every state.
  await db.insert(schema.posts).values({
    slug: "draft-kaki",
    title: "柿をもらった",
    lead: "",
    contentJson: JSON.stringify([
      { type: "paragraph", content: [{ type: "text", text: "隣の家から。まだ硬い。", styles: {} }] },
    ]),
    status: "draft",
    authorId: author.id,
    createdAt: now - 2 * 3600000,
    updatedAt: now - 3600000,
  });

  await db.insert(schema.posts).values({
    slug: "review-fuyu",
    title: "冬支度のこと",
    lead: "毛布を出すのが毎年おそい。",
    contentJson: JSON.stringify([
      { type: "paragraph", content: [{ type: "text", text: "今年こそ早めに出そうと思っている。", styles: {} }] },
    ]),
    status: "in_review",
    authorId: author.id,
    createdAt: now - 26 * 3600000,
    updatedAt: now - 20 * 3600000,
  });

  // Replies — the 往復 count. Most recent posts have answers.
  const replyBodies = [
    "スープの写真、湯気まで写ってた。あれ何時ごろ？",
    "その古本屋、こんど一緒に行きたい。",
    "三分待つの、ぼくもやってみた。たしかに違った。",
    "小皿、見せてほしい。欠けてるところが見たい。",
    "今日の空、こっちも曇りだった。",
    "みかん、買って帰ります。",
  ];
  for (let i = 0; i < replyBodies.length; i++) {
    await db.insert(schema.replies).values({
      postId: postIds[postIds.length - 1 - i],
      userId: reader.id,
      body: replyBodies[i],
      createdAt: now - i * DAY - 3600000,
    });
  }

  // Comments across the moderation states.
  const latest = postIds[postIds.length - 1];
  await db.insert(schema.comments).values([
    {
      postId: latest,
      authorName: "とおりすがり",
      body: "はじめまして。文章の雰囲気が好きです。",
      status: "approved",
      ipHash: "seedhash1",
      createdAt: now - 2 * DAY,
    },
    {
      postId: latest,
      authorName: "みどり",
      body: "スープ、わたしも作ってみます。",
      status: "pending",
      ipHash: "seedhash2",
      createdAt: now - DAY,
    },
    {
      postId: latest,
      authorName: "spam",
      body: "稼げる副業はこちら http://example.com/xxx",
      status: "spam",
      ipHash: "seedhash3",
      flaggedReason: "リンクを含むため自動で保留しました",
      createdAt: now - 3600000,
    },
  ]);

  console.log(`  ${offsets.length} published + 2 unpublished posts`);
  console.log(`  ${replyBodies.length} replies, 3 comments`);
  console.log(`  content attributed to ${author.name} <${author.email}> (author)`);
  console.log(`  replies attributed to ${reader.name} <${reader.email}> (reader)`);
  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
