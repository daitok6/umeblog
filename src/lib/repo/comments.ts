import { db, schema } from "@/lib/db";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { hashIp, isRateLimited, screenComment, RATE_LIMIT } from "@/lib/moderation";

const { comments, blockedWords, posts } = schema;

export type CommentWithPost = schema.Comment & { postTitle: string; postSlug: string };

/** Only approved comments are ever returned to the public side. */
export async function listApproved(postId: number): Promise<schema.Comment[]> {
  return db
    .select()
    .from(comments)
    .where(and(eq(comments.postId, postId), eq(comments.status, "approved")))
    .orderBy(comments.createdAt);
}

export async function listForModeration(
  status: "pending" | "approved" | "rejected" | "spam" = "pending",
): Promise<CommentWithPost[]> {
  const rows = await db
    .select({ c: comments, title: posts.title, slug: posts.slug })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .where(eq(comments.status, status))
    .orderBy(desc(comments.createdAt));
  return rows.map(({ c, title, slug }) => ({ ...c, postTitle: title, postSlug: slug }));
}

export async function countByStatus(): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: comments.status, n: sql<number>`count(*)::int` })
    .from(comments)
    .groupBy(comments.status);
  const out: Record<string, number> = { pending: 0, approved: 0, rejected: 0, spam: 0 };
  for (const r of rows) out[r.status] = Number(r.n);
  return out;
}

export type SubmitResult = { ok: true } | { ok: false; error: string };

/**
 * Public submission path.
 *
 * Nothing submitted here is ever visible to a reader until a human approves
 * it — the screening rules only decide whether it lands as `pending` (worth
 * a look) or `spam` (filtered out of the default queue).
 */
export async function submitComment(input: {
  postId: number;
  authorName: string;
  body: string;
  ip: string;
}): Promise<SubmitResult> {
  const name = input.authorName.trim().slice(0, 40) || "名無し";
  const body = input.body.trim().slice(0, 2000);
  if (body.length < 2) return { ok: false, error: "本文を入力してください。" };

  const ipHash = hashIp(input.ip);
  const since = Date.now() - RATE_LIMIT.windowMs;
  const [recent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(eq(comments.ipHash, ipHash), gt(comments.createdAt, since)));

  if (isRateLimited(Number(recent?.n ?? 0))) {
    return { ok: false, error: "しばらく時間をおいてからお試しください。" };
  }

  const blocked = (await db.select({ word: blockedWords.word }).from(blockedWords)).map(
    (r) => r.word,
  );
  const screened = screenComment(body, blocked);

  await db.insert(comments).values({
    postId: input.postId,
    authorName: name,
    body,
    status: screened.status,
    ipHash,
    flaggedReason: screened.reason,
    createdAt: Date.now(),
  });

  return { ok: true };
}

export async function setCommentStatus(
  id: number,
  status: "pending" | "approved" | "rejected" | "spam",
): Promise<void> {
  await db.update(comments).set({ status }).where(eq(comments.id, id));
}

export async function deleteComment(id: number): Promise<void> {
  await db.delete(comments).where(eq(comments.id, id));
}
