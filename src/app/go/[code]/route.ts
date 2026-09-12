import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getShortLinkByCode } from "@/lib/repo/shortLinks";
import { recordEvent } from "@/lib/repo/events";
import { hashVisitor } from "@/lib/analytics/identity";
import { isBot } from "@/lib/analytics/classify";

export const runtime = "nodejs";

/**
 * Short-link redirector for placements a UTM-tagged URL can't reach cleanly
 * (an Instagram bio, a printed QR code). Unknown codes 404 — this route is
 * meant to be typed or scanned, not guessed, so there's no ambiguity to be
 * gentle about the way /api/track stays silent for readers.
 *
 * A bot still gets redirected (a link-preview crawler following the URL
 * should work exactly like a human's), it just isn't counted as a click.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const link = await getShortLinkByCode(code.toLowerCase());
  if (!link) notFound();

  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";
  if (!isBot(userAgent)) {
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
    await recordEvent({
      type: "click",
      postId: null,
      path: `/go/${link.code}`,
      visitorHash: hashVisitor(ip, userAgent),
      sessionId: "",
      source: "",
      referrerHost: "",
      campaign: "",
      medium: "",
      device: null,
      country: h.get("x-vercel-ip-country") ?? "",
      meta: JSON.stringify({ href: link.destination, code: link.code }),
    });
  }

  return NextResponse.redirect(link.destination, { status: 302 });
}
