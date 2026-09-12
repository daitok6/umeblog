import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * Mints a short-lived client token so the browser can PUT the original photo
 * straight to Vercel Blob, bypassing this app's server entirely for the
 * (potentially large) upload itself. The route at ../route.ts then fetches
 * the object back server-side — where there is no request-body limit — to
 * run it through sharp exactly once. No `onUploadCompleted` here: that only
 * fires over a public URL and never reaches localhost during development.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "author") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Tokens are only ever minted for the temp holding area; anything
        // else would let a client aim a signed PUT at an arbitrary pathname.
        if (!pathname.startsWith("incoming/")) {
          throw new Error("invalid pathname");
        }
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
            "image/gif",
            "image/heic",
            "image/heif",
          ],
          maximumSizeInBytes: 25 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "could not issue upload token" },
      { status: 400 },
    );
  }
}
