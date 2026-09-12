import { db, schema } from "@/lib/db";
import { desc, eq, isNotNull, sql } from "drizzle-orm";

const { posts, replies } = schema;

/**
 * Almost every figure here is DERIVED at read time. None is stored, with one
 * exception: `totalViews`, summed from `posts.views` (the one stored counter
 * in the app — see its column comment in the schema). It is still summed
 * fresh on every read rather than cached, so it can't drift out of step with
 * the posts it's counting.
 *
 * Stored counters drift the moment anything is edited, unpublished or
 * back-dated, and a motivation number that is quietly wrong is worse than no
 * number. Deriving them costs a couple of cheap queries and can never be
 * inconsistent with the posts themselves.
 *
 * What is deliberately absent: a current-streak counter. She previously
 * stopped blogging by missing a few days and never coming back, and a figure
 * that resets to zero is precisely the documented "quit moment". Every number
 * below can only ever go up, or is explicitly labelled as a past record.
 */

export type Stats = {
  /** 総本数 — published posts, all time. */
  total: number;
  /** 今月 — distinct days written in the current calendar month. */
  daysThisMonth: number;
  /** 最高記録 — the longest run of consecutive days EVER. A trophy, not a status. */
  bestRun: number;
  /** 往復 — posts that received at least one reply. One exchange = she wrote, someone answered. */
  exchanges: number;
  /** 閲覧 — total views across every post, all time. */
  totalViews: number;
  /** Epoch ms of the most recent publish, or null. Drives the おかえり greeting. */
  lastPublishedAt: number | null;
  /** Days since the last publish. Used only to soften the greeting, never to scold. */
  daysSinceLast: number | null;
};

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Longest consecutive-day run across all publish dates. */
function longestRun(dayStarts: number[]): number {
  if (dayStarts.length === 0) return 0;
  const unique = [...new Set(dayStarts)].sort((a, b) => a - b);
  const DAY = 86400000;
  let best = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    // Compare calendar days rather than exact 24h spans so DST cannot break the run.
    const gap = Math.round((unique[i] - unique[i - 1]) / DAY);
    run = gap === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

export async function getStats(): Promise<Stats> {
  const published = await db
    .select({ publishedAt: posts.publishedAt })
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt));

  const times = published
    .map((p) => p.publishedAt)
    .filter((t): t is number => typeof t === "number");

  const now = new Date();
  const monthKeys = new Set(
    times
      .filter((t) => {
        const d = new Date(t);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .map(dayKey),
  );

  const [exchangeRow] = await db
    .select({ n: sql<number>`count(distinct ${replies.postId})::int` })
    .from(replies);

  const [viewRow] = await db
    .select({ n: sql<number>`coalesce(sum(${posts.views}), 0)::int` })
    .from(posts);

  const lastPublishedAt = times.length ? Math.max(...times) : null;
  const daysSinceLast =
    lastPublishedAt == null
      ? null
      : Math.max(0, Math.round((startOfDay(Date.now()) - startOfDay(lastPublishedAt)) / 86400000));

  return {
    total: times.length,
    daysThisMonth: monthKeys.size,
    bestRun: longestRun(times.map(startOfDay)),
    exchanges: Number(exchangeRow?.n ?? 0),
    totalViews: Number(viewRow?.n ?? 0),
    lastPublishedAt,
    daysSinceLast,
  };
}

/**
 * One year of activity for the calendar grid.
 *
 * Returns a count per day. The UI renders written days in ink and unwritten
 * days pale — never red, never an X. A blank day is simply a day, not a failure.
 */
export async function getYearActivity(): Promise<Map<string, number>> {
  const yearAgo = Date.now() - 371 * 86400000;
  const rows = await db
    .select({ publishedAt: posts.publishedAt })
    .from(posts)
    .where(isNotNull(posts.publishedAt));

  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.publishedAt == null || r.publishedAt < yearAgo) continue;
    const k = dayKey(r.publishedAt);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

export { dayKey };
