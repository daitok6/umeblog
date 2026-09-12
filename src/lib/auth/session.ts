import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// __Host- requires Secure + Path=/ + no Domain attribute, and browsers only
// honour it over HTTPS — so it's production-only; a dev http:// server would
// silently fail to set a __Host- cookie at all.
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-umeblog_session" : "umeblog_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters. See .env.example.");
  }
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "author" | "reader";
};

export async function createSession(userId: number): Promise<void> {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Returns the signed-in user, or null. Safe to call from any server component. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    const uid = Number(payload.uid);
    if (!Number.isFinite(uid)) return null;

    const row = await db.query.users.findFirst({ where: eq(schema.users.id, uid) });
    if (!row) return null;
    return { id: row.id, name: row.name, email: row.email, role: row.role };
  } catch {
    return null;
  }
}

/** Anyone signed in (author or trusted reader). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

/** Only the author may write, moderate, or change settings. */
export async function requireAuthor(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "author") throw new Error("FORBIDDEN");
  return user;
}

/**
 * For void/fire-and-forget server actions triggered from an already-gated
 * admin page (a button click, not a page load). The realistic failure here
 * is a session that expired while the tab was open — this sends the user
 * back to log in instead of surfacing a raw 500.
 */
export async function requireAuthorOrRedirect(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "author") redirect("/login");
  return user;
}

export async function requireUserOrRedirect(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
