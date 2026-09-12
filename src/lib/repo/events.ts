import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import { dayBucket } from "@/lib/analytics/identity";

const { events } = schema;

export type EventType = "view" | "read" | "search" | "click";

export type RecordEventInput = {
  type: EventType;
  /** null for non-post pages (search, home, etc). */
  postId: number | null;
  path: string;
  visitorHash: string;
  sessionId: string;
  /** type='read' only. */
  scrollPct?: number | null;
  dwellMs?: number | null;
  source: string;
  referrerHost: string;
  campaign: string;
  medium: string;
  device: "mobile" | "desktop" | null;
  country: string;
  /** JSON string, type-specific extras. */
  meta?: string;
};

/**
 * Writes one analytics event. The Neon HTTP driver has no transactions (see
 * recordView() in src/lib/repo/posts.ts), so dedupe has to happen in the
 * INSERT statement itself rather than via a read-then-write — the same
 * reasoning as recordView, applied with an ON CONFLICT clause instead of a
 * plain UPDATE.
 *
 * Dedupe key is (type, postId, visitorHash, dayBucket) for every type. For
 * 'read' a repeat (e.g. the reader switches tabs mid-article and comes back)
 * widens the existing row via GREATEST, so the stored scrollPct/dwellMs is
 * always the session's high-water mark, never a sum and never silently
 * overwritten by a shorter subsequent visit. Every other type (view, click,
 * search) simply drops a repeat within the same (post, visitor, day) —
 * this MUST use onConflictDoNothing rather than a bare insert: 'click' has
 * a real, non-null postId (the article the reader is on), so a second
 * outbound-link click from the same visitor on the same post on the same
 * day collides with the first on this exact unique index, and a plain
 * insert would throw instead of silently coalescing. ('search' happens to
 * always carry postId=null today, and Postgres never treats two NULLs as a
 * collision — so it would be safe either way — but it's routed through the
 * same guarded path for consistency rather than relying on that detail.)
 */
export async function recordEvent(input: RecordEventInput): Promise<void> {
  const now = Date.now();
  const row = {
    type: input.type,
    postId: input.postId,
    path: input.path,
    visitorHash: input.visitorHash,
    sessionId: input.sessionId,
    dayBucket: dayBucket(now),
    scrollPct: input.scrollPct ?? null,
    dwellMs: input.dwellMs ?? null,
    source: input.source,
    referrerHost: input.referrerHost,
    campaign: input.campaign,
    medium: input.medium,
    device: input.device,
    country: input.country,
    meta: input.meta ?? "",
    createdAt: now,
  };

  const target = [events.type, events.postId, events.visitorHash, events.dayBucket];

  if (input.type === "read") {
    await db
      .insert(events)
      .values(row)
      .onConflictDoUpdate({
        target,
        set: {
          scrollPct: sql`GREATEST(${events.scrollPct}, ${row.scrollPct ?? 0})`,
          dwellMs: sql`GREATEST(${events.dwellMs}, ${row.dwellMs ?? 0})`,
        },
      });
    return;
  }

  await db.insert(events).values(row).onConflictDoNothing({ target });
}
