import { db, schema } from "@/lib/db";
import { eq, sql, inArray, isNotNull, asc, and } from "drizzle-orm";

const { tags, postTags, posts } = schema;

/**
 * Slugs are stored in readable form, Japanese included — a URL may legally
 * contain it, and browsers display it decoded anyway. Storing the
 * percent-encoded form instead guarantees a lookup miss, because the router
 * hands route params over already decoded.
 */
function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[\s/?#\[\]@!$&'()*+,;=%"<>\\^`{|}~]+/g, "-")
      .replace(/^-+|-+$/g, "") || "post"
  );
}

/**
 * Route params arrive already decoded, while an older link may hold a
 * percent-encoded slug — same reasoning as `posts.ts`'s `slugVariants`.
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

export async function ensureTag(name: string): Promise<number> {
  const clean = name.trim().replace(/^#/, "");
  const existing = await db.query.tags.findFirst({ where: eq(tags.name, clean) });
  if (existing) return existing.id;
  const [row] = await db
    .insert(tags)
    .values({ name: clean, slug: slugify(clean) })
    .returning({ id: tags.id });
  return row.id;
}

export async function setPostTags(postId: number, names: string[]): Promise<void> {
  await db.delete(postTags).where(eq(postTags.postId, postId));
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(0, 8);
  for (const name of unique) {
    const tagId = await ensureTag(name);
    await db.insert(postTags).values({ postId, tagId }).onConflictDoNothing();
  }
}

/**
 * Tags with their published-post counts.
 *
 * The research was explicit that this blog should launch with tags only and
 * no categories: her subject is undecided, and empty categories look bleak
 * while tags can be promoted into categories later once a pattern emerges.
 */
export async function listWithCounts(): Promise<Array<schema.Tag & { count: number }>> {
  const rows = await db
    .select({ tag: tags, n: sql<number>`count(${postTags.postId})::int` })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .leftJoin(posts, eq(posts.id, postTags.postId))
    .where(eq(posts.status, "published"))
    .groupBy(tags.id)
    .orderBy(sql`count(${postTags.postId}) desc`);
  return rows.map((r) => ({ ...r.tag, count: Number(r.n) }));
}

export async function tagsForPost(postId: number): Promise<schema.Tag[]> {
  const rows = await db
    .select({ tag: tags })
    .from(postTags)
    .innerJoin(tags, eq(tags.id, postTags.tagId))
    .where(eq(postTags.postId, postId));
  return rows.map((r) => r.tag);
}

export async function getBySlug(slug: string): Promise<schema.Tag | null> {
  const row = await db.query.tags.findFirst({ where: inArray(tags.slug, slugVariants(slug)) });
  return row ?? null;
}

/**
 * The curated, ordered allowlist for the public filter chip row — the author
 * picks these explicitly in /admin/tags. Until anything has been picked
 * (a brand-new blog, or before the author's first visit there) this falls
 * back to the same top-6-by-count set the row showed before curation
 * existed, so an uncurated blog keeps looking exactly as it always did.
 */
export async function listChips(): Promise<schema.Tag[]> {
  const curated = await db.query.tags.findMany({
    where: isNotNull(tags.chipOrder),
    orderBy: asc(tags.chipOrder),
  });
  if (curated.length > 0) return curated;

  const fallback = await listWithCounts();
  return fallback.slice(0, 6);
}

/**
 * Every tag for /admin/tags: `count` is its published-post count (what the
 * author sees), `attached` is whether it's used by *any* post or ticket
 * regardless of status. These are deliberately different things — a tag
 * used only by a draft has `count: 0` (nothing published yet) but
 * `attached: true`, and must not be offered for deletion, since deleting it
 * would silently untag that draft. `deleteIfUnused` guards on the same
 * "any post_tags/ticket_tags row" definition as `attached`, so a shown
 * delete button always actually works.
 *
 * Unlike `listWithCounts`, this must include tags with zero published posts
 * (ticket-only and draft-only tags, plus orphans worth deleting) — so both
 * counts are conditional aggregates (`count(distinct case when …)`) rather
 * than a `where()` after the join, which would silently turn the left joins
 * into inner joins and drop exactly those rows.
 */
export async function listForCuration(): Promise<
  Array<schema.Tag & { count: number; attached: boolean }>
> {
  const { ticketTags } = schema;
  const rows = await db
    .select({
      tag: tags,
      published: sql<number>`count(distinct case when ${posts.status} = 'published' then ${postTags.postId} end)::int`,
      anyPost: sql<number>`count(distinct ${postTags.postId})::int`,
      anyTicket: sql<number>`count(distinct ${ticketTags.ticketId})::int`,
    })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .leftJoin(posts, eq(posts.id, postTags.postId))
    .leftJoin(ticketTags, eq(ticketTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(
      sql`${tags.chipOrder} is null`,
      asc(tags.chipOrder),
      sql`count(distinct case when ${posts.status} = 'published' then ${postTags.postId} end) desc`,
    );
  return rows.map((r) => ({
    ...r.tag,
    count: Number(r.published),
    attached: Number(r.anyPost) > 0 || Number(r.anyTicket) > 0,
  }));
}

/**
 * Replaces the whole curated set in one call, 1-based and dense in the given
 * order. No transactions (the Neon HTTP driver has none): clear every
 * existing chipOrder first, then assign the new ones, same
 * clear-then-insert shape as `setPostTags`.
 */
export async function setChips(slugs: string[]): Promise<void> {
  await db.update(tags).set({ chipOrder: null }).where(isNotNull(tags.chipOrder));
  for (let i = 0; i < slugs.length; i++) {
    await db
      .update(tags)
      .set({ chipOrder: i + 1 })
      .where(eq(tags.slug, slugs[i]));
  }
}

/**
 * Permanently removes a tag. Refuses if it's still attached to any post or
 * ticket — this is what makes the delete button in /admin/tags safe without
 * a confirmation dialog, since it can never take tagged content down with it.
 * Returns false (does nothing) when the tag is in use or doesn't exist.
 */
export async function deleteIfUnused(slug: string): Promise<boolean> {
  const tag = await db.query.tags.findFirst({ where: eq(tags.slug, slug) });
  if (!tag) return false;

  const [postUse] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(postTags)
    .where(eq(postTags.tagId, tag.id));
  if (Number(postUse.n) > 0) return false;

  const [ticketUse] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.ticketTags)
    .where(eq(schema.ticketTags.tagId, tag.id));
  if (Number(ticketUse.n) > 0) return false;

  await db.delete(tags).where(eq(tags.id, tag.id));
  return true;
}

export { slugify };
