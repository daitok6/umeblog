import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";

const { replies, users, posts } = schema;

export type ReplyWithAuthor = schema.Reply & { authorName: string };

export async function listForPost(postId: number): Promise<ReplyWithAuthor[]> {
  const rows = await db
    .select({ r: replies, name: users.name })
    .from(replies)
    .innerJoin(users, eq(users.id, replies.userId))
    .where(eq(replies.postId, postId))
    .orderBy(replies.createdAt);
  return rows.map(({ r, name }) => ({ ...r, authorName: name }));
}

export async function addReply(postId: number, userId: number, body: string): Promise<void> {
  await db.insert(replies).values({ postId, userId, body, createdAt: Date.now() });
}

/**
 * The most recent reply, with the post it answers.
 *
 * This is the single most important query in the app for whether the blog
 * survives: it is the payoff the writer sees on her dashboard for having
 * written. It gets the best position on that page.
 */
export async function latestReply(): Promise<
  (ReplyWithAuthor & { postTitle: string; postSlug: string }) | null
> {
  const rows = await db
    .select({ r: replies, name: users.name, title: posts.title, slug: posts.slug })
    .from(replies)
    .innerJoin(users, eq(users.id, replies.userId))
    .innerJoin(posts, eq(posts.id, replies.postId))
    .orderBy(desc(replies.createdAt))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...row.r, authorName: row.name, postTitle: row.title, postSlug: row.slug };
}
