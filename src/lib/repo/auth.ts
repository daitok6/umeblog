import { db, schema } from "@/lib/db";
import { and, eq, gt, sql } from "drizzle-orm";
import { hashIp } from "@/lib/moderation";

const { loginAttempts } = schema;

/**
 * DB-backed login rate limiting — an in-memory map would not survive a
 * serverless instance recycling between requests. Only failed attempts are
 * recorded (see loginAction): this guards against guessing, not against a
 * real person logging in repeatedly, and rows simply age out of the window
 * rather than being deleted.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export async function isLoginRateLimited(ip: string): Promise<boolean> {
  const ipHash = hashIp(ip);
  const since = Date.now() - WINDOW_MS;
  const [recent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.ipHash, ipHash), gt(loginAttempts.createdAt, since)));
  return Number(recent?.n ?? 0) >= MAX_ATTEMPTS;
}

export async function recordLoginAttempt(ip: string): Promise<void> {
  await db.insert(loginAttempts).values({ ipHash: hashIp(ip), createdAt: Date.now() });
}
