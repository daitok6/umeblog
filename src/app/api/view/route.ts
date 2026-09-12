import { NextResponse } from "next/server";
import { recordView } from "@/lib/repo/posts";

export const runtime = "nodejs";

/**
 * Fire-and-forget view counter, called by ViewBeacon on the client. Public,
 * unauthenticated (it records reader traffic, not author actions), and
 * intentionally silent about the outcome: a missing or already-unpublished
 * slug simply increments nothing.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const slug = (body as { slug?: unknown } | null)?.slug;
  if (typeof slug !== "string" || slug.length === 0 || slug.length > 200) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }

  await recordView(slug);
  return new NextResponse(null, { status: 204 });
}
