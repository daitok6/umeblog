import { createHash } from "node:crypto";

/**
 * Visitor hashing for the analytics events table. Sibling to `hashIp()` in
 * src/lib/moderation.ts (which stays untouched — it is load-bearing for
 * comment and login rate limiting) rather than a change to it, because this
 * hash rotates a different way: it folds in the *day*, so the same person
 * hashes differently tomorrow.
 *
 * That is a deliberate privacy trade, not an oversight: it lets us dedupe
 * "one visitor, one post, one day" into a single view, and count same-day
 * uniques, while making it impossible to link one visitor across days from
 * this table alone. If returning-reader rate later turns out to matter more
 * than that extra margin, the fix is to drop `day` from the input here — a
 * one-line change, no schema migration.
 */
export function hashVisitor(ip: string, userAgent: string): string {
  const salt = process.env.SESSION_SECRET ?? "umeblog";
  const day = dayBucket(Date.now());
  return createHash("sha256")
    .update(salt + "|" + day + "|" + ip + "|" + userAgent)
    .digest("hex")
    .slice(0, 32);
}

/** 'YYYY-MM-DD' in JST, matching the blog's readership and publish-date logic elsewhere. */
export function dayBucket(ms: number): string {
  const jst = new Date(ms + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
