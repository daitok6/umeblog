import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { saveUpload } from "@/lib/repo/images";

export const runtime = "nodejs";

/** Upload target for the editor. Re-encodes via sharp before anything is stored. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "author") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const row = await saveUpload(buf, file.name);
    return NextResponse.json({ url: row.url, id: row.id });
  } catch {
    return NextResponse.json({ error: "could not process image" }, { status: 422 });
  }
}
