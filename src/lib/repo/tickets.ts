import { db, schema } from "@/lib/db";
import { and, desc, eq, ilike, inArray, notInArray, or } from "drizzle-orm";
import { escapeLike } from "@/lib/repo/posts";
import { ensureTag } from "@/lib/repo/tags";
import { ACTIVE_STATUSES, type TicketStatus } from "@/lib/tickets";
import * as deliverablesRepo from "@/lib/repo/deliverables";
import type { ContentRole, DeliverableStatus, Platform } from "@/lib/deliverables";

const { tickets, ticketTags, tags, posts, ticketDeliverables } = schema;

export type TicketWithMeta = schema.Ticket & {
  tags: schema.Tag[];
  linkedPost: {
    id: number;
    title: string;
    slug: string;
    status: schema.Post["status"];
    serial: number | null;
  } | null;
  deliverables: schema.TicketDeliverable[];
};

async function decorate(rows: schema.Ticket[]): Promise<TicketWithMeta[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const tagRows = await db
    .select({ ticketId: ticketTags.ticketId, tag: tags })
    .from(ticketTags)
    .innerJoin(tags, eq(tags.id, ticketTags.tagId))
    .where(inArray(ticketTags.ticketId, ids));

  const postIds = rows.map((r) => r.linkedPostId).filter((x): x is number => x != null);
  const postRows = postIds.length
    ? await db
        .select({
          id: posts.id,
          title: posts.title,
          slug: posts.slug,
          status: posts.status,
          serial: posts.serial,
        })
        .from(posts)
        .where(inArray(posts.id, postIds))
    : [];

  const deliverableRows = await deliverablesRepo.listForTickets(ids);

  return rows.map((r) => ({
    ...r,
    tags: tagRows.filter((t) => t.ticketId === r.id).map((t) => t.tag),
    linkedPost: postRows.find((p) => p.id === r.linkedPostId) ?? null,
    deliverables: deliverableRows.filter((d) => d.ticketId === r.id),
  }));
}

export type TicketFilters = {
  status?: TicketStatus;
  pillar?: schema.Ticket["pillar"];
  topicType?: schema.Ticket["topicType"];
  priority?: schema.Ticket["priority"];
  tag?: string;
  evergreen?: boolean;
  seasonal?: boolean;
  q?: string;
  /** "active" (default) hides published/archived; "all" shows everything. */
  scope?: "active" | "all";
  platform?: Platform;
  deliverableStatus?: DeliverableStatus;
  role?: ContentRole;
  /** "with" -> has at least one deliverable; "without" -> has none. */
  plan?: "with" | "without";
  crossPlatform?: schema.Ticket["crossPlatformPotential"];
};

export async function list(filters: TicketFilters = {}): Promise<TicketWithMeta[]> {
  const conds = [];

  if (filters.status) {
    conds.push(eq(tickets.status, filters.status));
  } else if (filters.scope !== "all") {
    conds.push(inArray(tickets.status, ACTIVE_STATUSES));
  }
  if (filters.pillar) conds.push(eq(tickets.pillar, filters.pillar));
  if (filters.topicType) conds.push(eq(tickets.topicType, filters.topicType));
  if (filters.priority) conds.push(eq(tickets.priority, filters.priority));
  if (filters.evergreen) conds.push(eq(tickets.evergreen, true));
  if (filters.seasonal) conds.push(eq(tickets.seasonal, true));
  if (filters.crossPlatform) conds.push(eq(tickets.crossPlatformPotential, filters.crossPlatform));

  if (filters.q?.trim()) {
    const pattern = `%${escapeLike(filters.q.trim().slice(0, 80))}%`;
    conds.push(
      or(
        ilike(tickets.title, pattern),
        ilike(tickets.description, pattern),
        ilike(tickets.inspirationNotes, pattern),
        ilike(tickets.suggestedQuestions, pattern),
      ),
    );
  }

  if (filters.tag?.trim()) {
    const taggedIds = db
      .select({ ticketId: ticketTags.ticketId })
      .from(ticketTags)
      .innerJoin(tags, eq(tags.id, ticketTags.tagId))
      .where(eq(tags.name, filters.tag.trim()));
    conds.push(inArray(tickets.id, taggedIds));
  }

  // platform / deliverableStatus / role compose into one subquery so
  // "Instagram + in_progress" matches the SAME deliverable, not two
  // unrelated ones on the same ticket.
  if (filters.platform || filters.deliverableStatus || filters.role) {
    const dConds = [];
    if (filters.platform) dConds.push(eq(ticketDeliverables.platform, filters.platform));
    if (filters.deliverableStatus) dConds.push(eq(ticketDeliverables.status, filters.deliverableStatus));
    if (filters.role) dConds.push(eq(ticketDeliverables.role, filters.role));
    const matchingIds = db
      .select({ ticketId: ticketDeliverables.ticketId })
      .from(ticketDeliverables)
      .where(and(...dConds));
    conds.push(inArray(tickets.id, matchingIds));
  }

  if (filters.plan) {
    const anyDeliverable = db.select({ ticketId: ticketDeliverables.ticketId }).from(ticketDeliverables);
    conds.push(
      filters.plan === "with" ? inArray(tickets.id, anyDeliverable) : notInArray(tickets.id, anyDeliverable),
    );
  }

  const rows = await db
    .select()
    .from(tickets)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(tickets.updatedAt));

  return decorate(rows);
}

export async function countsByStatus(): Promise<Record<TicketStatus, number>> {
  const rows = await db.select({ status: tickets.status }).from(tickets);
  const counts = {
    idea: 0,
    interested: 0,
    selected: 0,
    in_progress: 0,
    draft_ready: 0,
    published: 0,
    archived: 0,
  } as Record<TicketStatus, number>;
  for (const r of rows) counts[r.status as TicketStatus]++;
  return counts;
}

export async function getById(id: number): Promise<TicketWithMeta | null> {
  const rows = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  return (await decorate(rows))[0] ?? null;
}

export type TicketInput = {
  title: string;
  description: string;
  pillar: schema.Ticket["pillar"];
  topicType: schema.Ticket["topicType"];
  priority: schema.Ticket["priority"];
  inspirationNotes: string;
  suggestedQuestions: string;
  creativeIdeas: string;
  seoPotential: schema.Ticket["seoPotential"];
  monetizationPotential: schema.Ticket["monetizationPotential"];
  socialPotential: schema.Ticket["socialPotential"];
  crossPlatformPotential: schema.Ticket["crossPlatformPotential"];
  evergreen: boolean;
  seasonal: boolean;
  targetPublishDate: number | null;
};

export async function create(createdById: number, input: TicketInput): Promise<number> {
  const now = Date.now();
  const [row] = await db
    .insert(tickets)
    .values({ ...input, createdById, createdAt: now, updatedAt: now })
    .returning({ id: tickets.id });
  return row.id;
}

export async function update(id: number, input: TicketInput): Promise<void> {
  await db
    .update(tickets)
    .set({ ...input, updatedAt: Date.now() })
    .where(eq(tickets.id, id));
}

export async function remove(id: number): Promise<void> {
  await db.delete(tickets).where(eq(tickets.id, id));
}

export async function setTicketTags(ticketId: number, names: string[]): Promise<void> {
  await db.delete(ticketTags).where(eq(ticketTags.ticketId, ticketId));
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(0, 8);
  for (const name of unique) {
    const tagId = await ensureTag(name);
    await db.insert(ticketTags).values({ ticketId, tagId }).onConflictDoNothing();
  }
}

/**
 * Stamps the workflow timestamp for a status the first time it's reached,
 * and never clears one on a later, "backwards" move — having started
 * something once isn't a fact that can be lost. Transitions are otherwise
 * unconstrained; idea -> in_progress is legal.
 */
export async function setStatus(id: number, status: TicketStatus): Promise<void> {
  const existing = await db.query.tickets.findFirst({ where: eq(tickets.id, id) });
  if (!existing) return;

  const now = Date.now();
  const patch: Partial<schema.Ticket> = { status, updatedAt: now };

  if (
    (status === "selected" || status === "in_progress" || status === "draft_ready") &&
    existing.claimedAt == null
  ) {
    patch.claimedAt = now;
  }
  if ((status === "in_progress" || status === "draft_ready") && existing.startedAt == null) {
    patch.startedAt = now;
  }
  if (status === "draft_ready" && existing.completedAt == null) {
    patch.completedAt = now;
  }

  await db.update(tickets).set(patch).where(eq(tickets.id, id));
}

export async function linkPost(ticketId: number, postId: number): Promise<void> {
  await db.update(tickets).set({ linkedPostId: postId, updatedAt: Date.now() }).where(eq(tickets.id, ticketId));
}

export async function unlinkPost(ticketId: number): Promise<void> {
  await db.update(tickets).set({ linkedPostId: null, updatedAt: Date.now() }).where(eq(tickets.id, ticketId));
}

/**
 * Called when a linked post publishes, so both the idea's stored status and
 * its matching blog deliverable (if any) follow along.
 */
export async function markPublishedForPost(postId: number): Promise<void> {
  await db
    .update(tickets)
    .set({ status: "published", updatedAt: Date.now() })
    .where(eq(tickets.linkedPostId, postId));
  await deliverablesRepo.markPublishedForPost(postId);
}

/** Distinct tag names currently used on any ticket, for the filter select. */
export async function listTagNames(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: tags.name })
    .from(ticketTags)
    .innerJoin(tags, eq(tags.id, ticketTags.tagId))
    .orderBy(tags.name);
  return rows.map((r) => r.name);
}

/** Reverse lookup for the post editor's "もとのアイデア" back-link. */

export async function ticketForPost(
  postId: number,
): Promise<{ id: number; title: string } | null> {
  const row = await db.query.tickets.findFirst({ where: eq(tickets.linkedPostId, postId) });
  return row ? { id: row.id, title: row.title } : null;
}
