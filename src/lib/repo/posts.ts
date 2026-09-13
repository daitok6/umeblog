import { cache } from "react";
import type { RailConfig } from "@/lib/rails";
import { db, schema } from "@/lib/db";
import { and, desc, eq, ilike, inArray, isNotNull, lte, max, or, sql } from "drizzle-orm";

const { posts, tags, postTags, images, replies } = schema;

export type PostWithMeta = schema.Post & {
  tags: schema.Tag[];
  cover: schema.ImageRow | null;
  replyCount: number;
};

/**
 * The single predicate that defines "publicly visible".
 *
 * Scheduled posts are excluded by comparing publishAt to now at read time,
 * which is why this app needs no cron: a scheduled post simply becomes
 * visible on the next request after its time passes.
 */
function visible() {
  const now = Date.now();
  return or(
    eq(posts.status, "published"),
    and(eq(posts.status, "scheduled"), isNotNull(posts.publishAt), lte(posts.publishAt, now)),
  );
}

async function decorate(rows: schema.Post[]): Promise<PostWithMeta[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const tagRows = await db
    .select({ postId: postTags.postId, tag: tags })
    .from(postTags)
    .innerJoin(tags, eq(tags.id, postTags.tagId))
    .where(inArray(postTags.postId, ids));

  const coverIds = rows.map((r) => r.coverImageId).filter((x): x is number => x != null);
  const coverRows = coverIds.length
    ? await db.select().from(images).where(inArray(images.id, coverIds))
    : [];

  const replyRows = await db
    .select({ postId: replies.postId, n: sql<number>`count(*)::int` })
    .from(replies)
    .where(inArray(replies.postId, ids))
    .groupBy(replies.postId);

  return rows.map((r) => ({
    ...r,
    tags: tagRows.filter((t) => t.postId === r.id).map((t) => t.tag),
    cover: coverRows.find((c) => c.id === r.coverImageId) ?? null,
    replyCount: Number(replyRows.find((x) => x.postId === r.id)?.n ?? 0),
  }));
}

export async function listPublished(limit = 50, offset = 0): Promise<PostWithMeta[]> {
  const rows = await db
    .select()
    .from(posts)
    .where(visible())
    .orderBy(desc(posts.publishedAt), desc(posts.id))
    .limit(limit)
    .offset(offset);
  return decorate(rows);
}

/**
 * Route params arrive already decoded, while older rows may hold a
 * percent-encoded slug. Both forms are tried so neither can 404.
 */
function slugVariants(slug: string): string[] {
  const out = new Set<string>([slug]);
  try {
    out.add(decodeURIComponent(slug));
  } catch {
    /* malformed escape — the raw value is still worth trying */
  }
  out.add(encodeURIComponent(slug));
  return [...out];
}

/**
 * Wrapped in React's `cache()` so `generateMetadata` and the page body — both
 * called for the same request — share one query instead of two.
 */
export const getPublishedBySlug = cache(async (slug: string): Promise<PostWithMeta | null> => {
  const rows = await db
    .select()
    .from(posts)
    .where(and(inArray(posts.slug, slugVariants(slug)), visible()))
    .limit(1);
  return (await decorate(rows))[0] ?? null;
});

/**
 * Numeric id for a slug, for callers that only need the FK (the analytics
 * ingest route) and shouldn't pay for `decorate()`'s tag/cover/reply joins
 * on every tracked event. Returns null for a missing or unpublished slug —
 * events.postId is nullable specifically so this can be recorded as null
 * rather than the caller having to skip the event entirely.
 */
export async function getPostIdBySlug(slug: string): Promise<number | null> {
  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(inArray(posts.slug, slugVariants(slug)), visible()))
    .limit(1);
  return rows[0]?.id ?? null;
}

/**
 * Best-effort view increment, called from /api/track when a reader's browser
 * loads a post — never from the server-rendered page itself. That page is
 * `revalidate = 300`, so counting there would count cache regenerations
 * (roughly one per five minutes of traffic) instead of actual reads.
 *
 * One atomic UPDATE: the Neon HTTP driver has no transactions, so a
 * read-then-write here would race under concurrent requests.
 */
export async function recordView(slug: string): Promise<void> {
  await db
    .update(posts)
    .set({ views: sql`${posts.views} + 1` })
    .where(and(inArray(posts.slug, slugVariants(slug)), visible()));
}

export async function listByTag(tagSlug: string, limit?: number): Promise<PostWithMeta[]> {
  const variants = slugVariants(tagSlug);
  const tag = await db.query.tags.findFirst({ where: inArray(tags.slug, variants) });
  if (!tag) return [];
  let query = db
    .select({ p: posts })
    .from(posts)
    .innerJoin(postTags, eq(postTags.postId, posts.id))
    .where(and(eq(postTags.tagId, tag.id), visible()))
    .orderBy(desc(posts.publishedAt))
    .$dynamic();
  if (limit != null) query = query.limit(limit);
  const rows = await query;
  return decorate(rows.map((r) => r.p));
}

/** Home-page rail: newest reads first, straight off `views`. */
export async function listMostViewed(limit = 12): Promise<PostWithMeta[]> {
  const rows = await db
    .select()
    .from(posts)
    .where(visible())
    .orderBy(desc(posts.views), desc(posts.publishedAt))
    .limit(limit);
  return decorate(rows);
}

/** Home-page rail: posts with the most replies, ties broken by recency. */
export async function listMostDiscussed(limit = 12): Promise<PostWithMeta[]> {
  const rows = await db
    .select({ p: posts, n: sql<number>`count(${replies.id})::int` })
    .from(posts)
    .innerJoin(replies, eq(replies.postId, posts.id))
    .where(visible())
    .groupBy(posts.id)
    .having(sql`count(${replies.id}) > 0`)
    .orderBy(desc(sql`count(${replies.id})`), desc(posts.publishedAt))
    .limit(limit);
  return decorate(rows.map((r) => r.p));
}

/**
 * Escapes ILIKE metacharacters so a reader-typed `%` or `_` matches itself
 * instead of acting as a wildcard.
 */
export function escapeLike(raw: string): string {
  return raw.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Substring search across title, lead, body, and tag names.
 *
 * Postgres full-text search cannot segment Japanese without extensions Neon
 * doesn't offer (pgroonga / pg_bigm), so this uses ILIKE — the right tool for
 * CJK substring matching. `contentJson` is searched raw: BlockNote documents
 * are plain `JSON.stringify` output, which leaves non-ASCII text literal, so
 * Japanese body text matches directly (a query containing `"` or `\\` won't
 * match body text, since JSON escapes those — an accepted limitation).
 */
export async function searchPublished(q: string, limit = 50): Promise<PostWithMeta[]> {
  const trimmed = q.trim().slice(0, 80);
  if (!trimmed) return [];
  const pattern = `%${escapeLike(trimmed)}%`;

  const taggedPostIds = db
    .select({ postId: postTags.postId })
    .from(postTags)
    .innerJoin(tags, eq(tags.id, postTags.tagId))
    .where(ilike(tags.name, pattern));

  const rows = await db
    .select()
    .from(posts)
    .where(
      and(
        visible(),
        or(
          ilike(posts.title, pattern),
          ilike(posts.lead, pattern),
          ilike(posts.contentJson, pattern),
          inArray(posts.id, taggedPostIds),
        ),
      ),
    )
    .orderBy(desc(posts.publishedAt), desc(posts.id))
    .limit(limit);

  return decorate(rows);
}

/** Admin view — everything, any status. */
export async function listAll(sort: "updated" | "views" = "updated"): Promise<PostWithMeta[]> {
  const rows =
    sort === "views"
      ? await db.select().from(posts).orderBy(desc(posts.views), desc(posts.updatedAt))
      : await db.select().from(posts).orderBy(desc(posts.updatedAt));
  return decorate(rows);
}

export async function getById(id: number): Promise<PostWithMeta | null> {
  const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return (await decorate(rows))[0] ?? null;
}

export async function createDraft(authorId: number, isTiny = false): Promise<number> {
  const now = Date.now();
  const slug = `d-${now.toString(36)}`;
  const [row] = await db
    .insert(posts)
    .values({
      slug,
      title: "",
      contentJson: "[]",
      status: "draft",
      isTiny,
      authorId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: posts.id });
  return row.id;
}

export async function updatePost(
  id: number,
  patch: Partial<Pick<schema.Post, "title" | "lead" | "contentJson" | "coverImageId" | "slug" | "isTiny">>,
): Promise<void> {
  await db.update(posts).set({ ...patch, updatedAt: Date.now() }).where(eq(posts.id, id));
}

/**
 * Serial numbers are the visible proof that the work accumulates, so they are
 * assigned on FIRST publish only — drafts never consume one — and are never
 * reused once given.
 */
async function nextSerial(): Promise<number> {
  const [row] = await db.select({ m: max(posts.serial) }).from(posts);
  return Number(row?.m ?? 0) + 1;
}

export async function publishPost(id: number, at: number = Date.now()): Promise<void> {
  const existing = await db.query.posts.findFirst({ where: eq(posts.id, id) });
  if (!existing) return;
  const serial = existing.serial ?? (await nextSerial());
  await db
    .update(posts)
    .set({
      status: "published",
      serial,
      publishedAt: existing.publishedAt ?? at,
      publishAt: null,
      updatedAt: Date.now(),
    })
    .where(eq(posts.id, id));
}

export async function schedulePost(id: number, when: number): Promise<void> {
  const existing = await db.query.posts.findFirst({ where: eq(posts.id, id) });
  if (!existing) return;
  const serial = existing.serial ?? (await nextSerial());
  await db
    .update(posts)
    .set({ status: "scheduled", publishAt: when, serial, updatedAt: Date.now() })
    .where(eq(posts.id, id));
}

export async function setStatus(
  id: number,
  status: "draft" | "in_review",
): Promise<void> {
  await db.update(posts).set({ status, updatedAt: Date.now() }).where(eq(posts.id, id));
}

/** Unpublishing keeps the serial, so numbering never shifts under readers. */
export async function unpublish(id: number): Promise<void> {
  await db
    .update(posts)
    .set({ status: "draft", publishAt: null, updatedAt: Date.now() })
    .where(eq(posts.id, id));
}

export async function deletePost(id: number): Promise<void> {
  await db.delete(posts).where(eq(posts.id, id));
}

/**
 * Dispatches a single home-page rail's config to the query that fills it.
 * Kept here (rather than in rails.ts) since it needs the `db` connection;
 * rails.ts stays a plain, importable-from-anywhere module.
 */
export async function loadRail(rail: RailConfig, limit = 12): Promise<PostWithMeta[]> {
  switch (rail.kind) {
    case "recent":
      return listPublished(limit);
    case "viewed":
      return listMostViewed(limit);
    case "discussed":
      return listMostDiscussed(limit);
    case "tag":
      return rail.tag ? listByTag(rail.tag, limit) : [];
    default:
      return [];
  }
}
