import { db, schema } from "@/lib/db";
import { eq, sql, inArray } from "drizzle-orm";

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

export { slugify };
