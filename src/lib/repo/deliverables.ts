import { db, schema } from "@/lib/db";
import { and, eq, inArray } from "drizzle-orm";
import type { DeliverableStatus, Platform, ContentRole } from "@/lib/deliverables";

const { ticketDeliverables, posts } = schema;

/** Fixed order the platform plan always renders in, regardless of insert order. */
const PLATFORM_ORDER: Platform[] = ["instagram", "note", "blog"];

export async function listForTickets(
  ticketIds: number[],
): Promise<schema.TicketDeliverable[]> {
  if (ticketIds.length === 0) return [];
  const rows = await db
    .select()
    .from(ticketDeliverables)
    .where(inArray(ticketDeliverables.ticketId, ticketIds));

  return rows.sort((a, b) => {
    const p = PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform);
    return p !== 0 ? p : a.id - b.id;
  });
}

export async function getById(id: number): Promise<schema.TicketDeliverable | null> {
  const rows = await db.select().from(ticketDeliverables).where(eq(ticketDeliverables.id, id)).limit(1);
  return rows[0] ?? null;
}

export type DeliverableInput = {
  platform: Platform;
  format: string;
  role: ContentRole;
  workingTitle: string;
  angle: string;
  notes: string;
  status: DeliverableStatus;
  targetPublishDate: number | null;
  /** Manual for instagram/note. Left untouched by the general form for blog — see saveDeliverableAction. */
  publishedUrl: string;
  metadataJson: string;
  sourceDeliverableId: number | null;
};

export async function create(ticketId: number, input: DeliverableInput): Promise<number> {
  const now = Date.now();
  const [row] = await db
    .insert(ticketDeliverables)
    .values({ ...input, ticketId, createdAt: now, updatedAt: now })
    .returning({ id: ticketDeliverables.id });
  return row.id;
}

export async function update(id: number, input: DeliverableInput): Promise<void> {
  await db
    .update(ticketDeliverables)
    .set({ ...input, updatedAt: Date.now() })
    .where(eq(ticketDeliverables.id, id));
}

export async function remove(id: number): Promise<void> {
  await db.delete(ticketDeliverables).where(eq(ticketDeliverables.id, id));
}

/**
 * Stamps publishedAt the first time "published" is reached, and never clears
 * it on a later, "backwards" move — same rule as tickets.setStatus. Every
 * other transition is unconstrained: idea -> published is legal, and so is
 * idea -> skipped.
 */
export async function setStatus(id: number, status: DeliverableStatus): Promise<void> {
  const existing = await db.query.ticketDeliverables.findFirst({
    where: eq(ticketDeliverables.id, id),
  });
  if (!existing) return;

  const now = Date.now();
  const patch: Partial<schema.TicketDeliverable> = { status, updatedAt: now };
  if (status === "published" && existing.publishedAt == null) {
    patch.publishedAt = now;
  }
  await db.update(ticketDeliverables).set(patch).where(eq(ticketDeliverables.id, id));
}

export async function linkPost(id: number, postId: number): Promise<void> {
  await db
    .update(ticketDeliverables)
    .set({ linkedPostId: postId, updatedAt: Date.now() })
    .where(eq(ticketDeliverables.id, id));
}

/** Manual publish record for instagram/note — blog derives from the linked post instead. */
export async function setPublished(id: number, url: string, at: number | null): Promise<void> {
  const existing = await db.query.ticketDeliverables.findFirst({
    where: eq(ticketDeliverables.id, id),
  });
  if (!existing) return;

  await db
    .update(ticketDeliverables)
    .set({
      status: "published",
      publishedUrl: url,
      publishedAt: at ?? existing.publishedAt ?? Date.now(),
      updatedAt: Date.now(),
    })
    .where(eq(ticketDeliverables.id, id));
}

/** Called when a linked post publishes, so its blog deliverable follows along. */
export async function markPublishedForPost(postId: number): Promise<void> {
  const now = Date.now();
  const rows = await db
    .select({ id: ticketDeliverables.id, publishedAt: ticketDeliverables.publishedAt })
    .from(ticketDeliverables)
    .where(eq(ticketDeliverables.linkedPostId, postId));

  for (const row of rows) {
    await db
      .update(ticketDeliverables)
      .set({ status: "published", publishedAt: row.publishedAt ?? now, updatedAt: now })
      .where(eq(ticketDeliverables.id, row.id));
  }
}

/** For the deliverable form's "based on" select — the ticket's other deliverables. */
export async function listSiblings(
  ticketId: number,
  excludeId?: number,
): Promise<Array<{ id: number; platform: Platform; format: string; workingTitle: string }>> {
  const conds = [eq(ticketDeliverables.ticketId, ticketId)];
  const rows = await db
    .select({
      id: ticketDeliverables.id,
      platform: ticketDeliverables.platform,
      format: ticketDeliverables.format,
      workingTitle: ticketDeliverables.workingTitle,
    })
    .from(ticketDeliverables)
    .where(and(...conds));
  return rows.filter((r) => r.id !== excludeId);
}

/** Derived publish info for a BLOG deliverable, from its linked post. */
export async function blogPublishInfo(
  linkedPostId: number,
): Promise<{ status: schema.Post["status"]; publishedAt: number | null; slug: string; serial: number | null } | null> {
  const row = await db.query.posts.findFirst({ where: eq(posts.id, linkedPostId) });
  if (!row) return null;
  return { status: row.status, publishedAt: row.publishedAt, slug: row.slug, serial: row.serial };
}
