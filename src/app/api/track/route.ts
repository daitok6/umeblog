import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getPostIdBySlug, recordView } from "@/lib/repo/posts";
import { recordEvent, type EventType } from "@/lib/repo/events";
import { hashVisitor } from "@/lib/analytics/identity";
import { classifySource, isBot } from "@/lib/analytics/classify";

export const runtime = "nodejs";

const TYPES = new Set<EventType>(["view", "read"]);

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function clampInt(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.min(max, Math.max(min, Math.round(v)));
}

/**
 * General analytics ingest, replacing the old /api/view. Public, unauth,
 * silent about the outcome — same contract as before: a missing/unpublished
 * slug or a filtered bot request still returns 204, so a client can never
 * infer anything about the blog's internals from the response.
 *
 * Everything that matters for trust (visitor identity, bot detection,
 * geo, source classification) is derived server-side from headers, never
 * taken from the client body — the body only supplies what the server has
 * no way to know: which post, which session, how far they scrolled.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const type = b.type;
  if (typeof type !== "string" || !TYPES.has(type as EventType)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";
  if (isBot(userAgent)) {
    return new NextResponse(null, { status: 204 });
  }

  const slug = str(b.slug, 200);
  if (!slug) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }

  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const ownHost = h.get("host") ?? "";
  const country = h.get("x-vercel-ip-country") ?? "";
  const visitorHash = hashVisitor(ip, userAgent);

  const referrerHost = str(b.referrerHost, 200);
  const medium = str(b.medium, 50);
  const campaign = str(b.campaign, 100);
  const sessionId = str(b.sessionId, 64);
  const path = str(b.path, 300) || `/p/${slug}`;
  const device = b.device === "mobile" ? "mobile" : b.device === "desktop" ? "desktop" : null;

  const eventType = type as EventType;
  const postId = await getPostIdBySlug(slug);

  if (eventType === "view") {
    // Kept alongside the new event for now — see recordView()'s docstring
    // for why the home page's "よく読まれている" rail still reads this
    // column rather than an aggregate over `events`.
    await recordView(slug);
  }

  await recordEvent({
    type: eventType,
    postId,
    path,
    visitorHash,
    sessionId,
    scrollPct: eventType === "read" ? clampInt(b.scrollPct, 0, 100) : null,
    // Ceiling of 2h — anything longer is a tab left open, not a read.
    dwellMs: eventType === "read" ? clampInt(b.dwellMs, 0, 2 * 60 * 60 * 1000) : null,
    source: classifySource(referrerHost, medium, ownHost),
    referrerHost,
    campaign,
    medium,
    device,
    country,
  });

  return new NextResponse(null, { status: 204 });
}
