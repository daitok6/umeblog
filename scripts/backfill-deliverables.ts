/**
 * One-shot, idempotent backfill: for every existing ticket that already has
 * a linked blog post (`tickets.linkedPostId`), create the matching BLOG
 * platform deliverable if one doesn't already exist for that post.
 *
 * Run once after `pnpm db:push` adds the `ticket_deliverables` table. Safe
 * to re-run — it skips any ticket that already has a blog deliverable
 * linked to the same post.
 */
import { eq, isNotNull } from "drizzle-orm";
import { db } from "../src/lib/db";
import * as schema from "../src/lib/db/schema";

async function main() {
  const tickets = await db.query.tickets.findMany({
    where: isNotNull(schema.tickets.linkedPostId),
  });

  let created = 0;
  let skipped = 0;

  for (const ticket of tickets) {
    if (!ticket.linkedPostId) continue;

    const existing = await db.query.ticketDeliverables.findFirst({
      where: eq(schema.ticketDeliverables.linkedPostId, ticket.linkedPostId),
    });
    if (existing) {
      skipped++;
      continue;
    }

    const post = await db.query.posts.findFirst({ where: eq(schema.posts.id, ticket.linkedPostId) });
    if (!post) continue;

    const now = Date.now();
    await db.insert(schema.ticketDeliverables).values({
      ticketId: ticket.id,
      platform: "blog",
      format: "",
      role: "utility",
      workingTitle: post.title,
      angle: "",
      notes: "",
      status: post.status === "published" ? "published" : "in_progress",
      publishedAt: post.status === "published" ? post.publishedAt : null,
      linkedPostId: post.id,
      createdAt: now,
      updatedAt: now,
    });
    created++;
  }

  console.log(`backfill: created ${created} blog deliverable(s), skipped ${skipped} already-backfilled ticket(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
