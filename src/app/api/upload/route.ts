import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getSessionUser } from "@/lib/auth/session";
import { saveUpload } from "@/lib/repo/images";

export const runtime = "nodejs";

/** Same host next.config.ts already allowlists for next/image. */
const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/;

/**
 * Second half of the upload flow. The editor PUTs the original photo
 * straight to Vercel Blob (see ./token/route.ts) — this route just pulls it
 * back down server-side, where there is no request-body limit, and hands the
 * bytes to the same sharp pipeline that ran here before.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "author") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url) {
    return NextResponse.json({ error: "no url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  // The client picks the pathname, so re-check it here rather than trusting
  // it — otherwise this route would fetch and store whatever URL it's given.
  if (
    parsed.protocol !== "https:" ||
    !BLOB_HOST.test(parsed.hostname) ||
    !parsed.pathname.startsWith("/incoming/")
  ) {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "could not fetch upload" }, { status: 422 });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const name = decodeURIComponent(parsed.pathname.split("/").pop() ?? "image");
    const row = await saveUpload(buf, name);
    return NextResponse.json({ url: row.url, id: row.id });
  } catch {
    return NextResponse.json({ error: "could not process image" }, { status: 422 });
  } finally {
    await del(url).catch(() => {});
  }
}
