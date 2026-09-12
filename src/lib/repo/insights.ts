import { db, schema } from "@/lib/db";
import { sql, eq, and, gte, desc, inArray } from "drizzle-orm";

const { events, posts } = schema;

/**
 * Threshold for what counts as a "read" rather than a skim. A judgement
 * call, not a fact — kept as a query-time predicate (not a stored flag) so
 * it can be re-tuned freely against real data without a migration. See the
 * `events` table's schema comment for why scrollPct/dwellMs are stored raw.
 */
const READ_SCROLL_MIN = 60;
const READ_DWELL_MIN_MS = 20_000;

function isQualifyingRead() {
  return and(
    eq(events.type, "read"),
    sql`${events.scrollPct} >= ${READ_SCROLL_MIN}`,
    sql`${events.dwellMs} >= ${READ_DWELL_MIN_MS}`,
  );
}

export type PostInsight = {
  postId: number;
  slug: string;
  title: string;
  views: number;
  reads: number;
  /** 0..1. null when there are no views yet, rather than a misleading 0%. */
  readRate: number | null;
  medianDwellMs: number | null;
  /** 10 buckets, 0-9, each counting `read` rows whose max scrollPct fell in that decile. */
  scrollBuckets: number[];
};

/**
 * Per-post read-through and drop-off, for the most recently published
 * posts. Three separate grouped queries rather than one join-with-post,
 * because views/reads/scroll-buckets are independent aggregations over the
 * same table — joining them in SQL would multiply rows across each other.
 */
export async function getPostInsights(limit = 30): Promise<PostInsight[]> {
  const postRows = await db
    .select({ id: posts.id, slug: posts.slug, title: posts.title })
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);

  if (postRows.length === 0) return [];
  const ids = postRows.map((p) => p.id);

  const viewRows = await db
    .select({ postId: events.postId, n: sql<number>`count(*)::int` })
    .from(events)
    .where(and(eq(events.type, "view"), inArray(events.postId, ids)))
    .groupBy(events.postId);

  const readRows = await db
    .select({
      postId: events.postId,
      n: sql<number>`count(*)::int`,
      medianDwell: sql<number | null>`percentile_cont(0.5) within group (order by ${events.dwellMs})`,
    })
    .from(events)
    .where(and(isQualifyingRead(), inArray(events.postId, ids)))
    .groupBy(events.postId);

  const bucketRows = await db
    .select({
      postId: events.postId,
      bucket: sql<number>`floor(coalesce(${events.scrollPct}, 0) / 10)::int`,
      n: sql<number>`count(*)::int`,
    })
    .from(events)
    .where(and(eq(events.type, "read"), inArray(events.postId, ids)))
    .groupBy(events.postId, sql`floor(coalesce(${events.scrollPct}, 0) / 10)`);

  return postRows.map((p): PostInsight => {
    const views = viewRows.find((r) => r.postId === p.id)?.n ?? 0;
    const readRow = readRows.find((r) => r.postId === p.id);
    const reads = readRow?.n ?? 0;
    const buckets = Array(10).fill(0);
    for (const b of bucketRows) {
      if (b.postId !== p.id) continue;
      buckets[Math.min(9, Math.max(0, b.bucket))] += b.n;
    }
    return {
      postId: p.id,
      slug: p.slug,
      title: p.title || "無題",
      views,
      reads,
      readRate: views > 0 ? reads / views : null,
      medianDwellMs: readRow?.medianDwell != null ? Math.round(Number(readRow.medianDwell)) : null,
      scrollBuckets: buckets,
    };
  });
}

export type SourceRow = { source: string; views: number };

/** Site-wide traffic-source breakdown over the trailing window. */
export async function getSourceBreakdown(sinceMs: number): Promise<SourceRow[]> {
  const rows = await db
    .select({ source: events.source, n: sql<number>`count(*)::int` })
    .from(events)
    .where(and(eq(events.type, "view"), gte(events.createdAt, sinceMs)))
    .groupBy(events.source)
    .orderBy(desc(sql`count(*)`));
  return rows.map((r) => ({ source: r.source || "direct", views: r.n }));
}

export type CampaignRow = { campaign: string; medium: string; views: number; reads: number };

/** UTM campaign performance over the trailing window — the free substitute for Web Analytics Plus. */
export async function getCampaignBreakdown(sinceMs: number): Promise<CampaignRow[]> {
  const rows = await db
    .select({
      campaign: events.campaign,
      medium: events.medium,
      views: sql<number>`count(*) filter (where ${events.type} = 'view')::int`,
      reads: sql<number>`count(*) filter (where ${events.type} = 'read')::int`,
    })
    .from(events)
    .where(and(sql`${events.campaign} != ''`, gte(events.createdAt, sinceMs)))
    .groupBy(events.campaign, events.medium)
    .orderBy(desc(sql`count(*) filter (where ${events.type} = 'view')`));
  return rows;
}

export type TrendPoint = { day: string; views: number; reads: number };

/** Daily view/read counts for the trailing `days` days, oldest first. */
export async function getDailyTrend(days: number): Promise<TrendPoint[]> {
  const since = Date.now() - days * 86_400_000;
  const rows = await db
    .select({
      day: events.dayBucket,
      views: sql<number>`count(*) filter (where ${events.type} = 'view')::int`,
      reads: sql<number>`count(*) filter (where ${events.type} = 'read')::int`,
    })
    .from(events)
    .where(gte(events.createdAt, since))
    .groupBy(events.dayBucket)
    .orderBy(events.dayBucket);
  return rows;
}

export type SearchInsights = {
  /** Most recent distinct zero-result queries — a literal list of what to write next. */
  recentZeroResult: { q: string; at: number; times: number }[];
  /** Queries repeated at least twice, most frequent first — a single one-off
   *  search isn't a trend, so it's excluded rather than padding the list. */
  topQueries: { q: string; count: number }[];
  totalSearches: number;
  /** How many recent rows were scanned to build the above (see `limit`). */
  windowSize: number;
};

/**
 * Aggregated in JS rather than SQL: `meta` is a JSON string (see the
 * `events` table's column comment), and a personal blog's search volume is
 * low enough that parsing a few hundred rows in the request is simpler and
 * far less brittle than grouping by a JSON blob in Postgres.
 */
export async function getSearchInsights(limit = 300): Promise<SearchInsights> {
  const rows = await db
    .select({ meta: events.meta, createdAt: events.createdAt })
    .from(events)
    .where(eq(events.type, "search"))
    .orderBy(desc(events.createdAt))
    .limit(limit);

  const parsed: { q: string; count: number; at: number }[] = [];
  for (const r of rows) {
    try {
      const m = JSON.parse(r.meta) as { q?: unknown; count?: unknown };
      if (typeof m.q === "string" && typeof m.count === "number") {
        parsed.push({ q: m.q, count: m.count, at: r.createdAt });
      }
    } catch {
      // malformed/legacy row — skip rather than fail the whole dashboard
    }
  }

  // Same query typed with different casing/whitespace ("Neko " vs "neko")
  // should count as one query — normalize for grouping, but keep the first
  // (most recent, since rows are newest-first) raw form for display.
  const normalize = (q: string) => q.trim().normalize("NFKC");

  const freq = new Map<string, number>();
  for (const p of parsed) {
    const key = normalize(p.q);
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }

  const zeroResultByKey = new Map<string, { q: string; at: number; times: number }>();
  for (const p of parsed) {
    if (p.count !== 0) continue;
    const key = normalize(p.q);
    const existing = zeroResultByKey.get(key);
    if (existing) {
      existing.times += 1;
    } else {
      zeroResultByKey.set(key, { q: p.q, at: p.at, times: 1 });
    }
  }

  const displayQuery = new Map<string, string>();
  for (const p of parsed) {
    const key = normalize(p.q);
    if (!displayQuery.has(key)) displayQuery.set(key, p.q);
  }

  return {
    recentZeroResult: [...zeroResultByKey.values()].slice(0, 12),
    topQueries: [...freq.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([key, count]) => ({ q: displayQuery.get(key) ?? key, count })),
    totalSearches: parsed.length,
    windowSize: limit,
  };
}

/** code -> click count, for every /go/<code> short link that has ever been clicked. */
export async function getShortLinkClicks(): Promise<Map<string, number>> {
  const rows = await db
    .select({ path: events.path, n: sql<number>`count(*)::int` })
    .from(events)
    .where(and(eq(events.type, "click"), sql`${events.path} like '/go/%'`))
    .groupBy(events.path);

  const map = new Map<string, number>();
  for (const r of rows) map.set(r.path.slice("/go/".length), r.n);
  return map;
}

export type ClickRow = { href: string; clicks: number };

/** Outbound-link clicks over the trailing window, most-clicked first. */
export async function getOutboundClicks(sinceMs: number, limit = 20): Promise<ClickRow[]> {
  const rows = await db
    .select({ meta: events.meta })
    .from(events)
    .where(and(eq(events.type, "click"), gte(events.createdAt, sinceMs)))
    .limit(2000);

  const freq = new Map<string, number>();
  for (const r of rows) {
    try {
      const m = JSON.parse(r.meta) as { href?: unknown };
      if (typeof m.href === "string" && m.href) freq.set(m.href, (freq.get(m.href) ?? 0) + 1);
    } catch {
      // malformed row — skip
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([href, clicks]) => ({ href, clicks }));
}
