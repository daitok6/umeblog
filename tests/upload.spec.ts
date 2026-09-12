import { test, expect } from "@playwright/test";
import { upload } from "@vercel/blob/client";
import { login } from "./helpers";

/**
 * Phone photos arrive at 3–5MB and in whatever orientation the camera chose.
 * Every upload is re-encoded, resized and stripped before it is stored, so
 * this checks the pipeline rather than just the HTTP status.
 *
 * The real flow is two hops: the browser PUTs the original straight to Vercel
 * Blob (via a token from POST /api/upload/token), then POSTs the resulting
 * URL to /api/upload, which fetches it back down and runs it through sharp.
 * `upload()` runs here in the test's Node process rather than inside
 * `page.evaluate` — it isn't bundled for the page — so its own request to
 * the token route is given the page's session cookie by hand.
 */

async function sessionCookie(page: import("@playwright/test").Page) {
  const cookies = await page.context().cookies();
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

/** A 2400×1200 PNG, larger than the 2000px cap, built in the browser. */
async function makeWideImage(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 2400;
    c.height = 1200;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 2400, 1200);
    grad.addColorStop(0, "#222");
    grad.addColorStop(1, "#ddd");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2400, 1200);
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
    const buf = new Uint8Array(await blob.arrayBuffer());
    return Array.from(buf);
  });
}

test("an oversized photo is accepted, resized and re-encoded", async ({ page }) => {
  await login(page);
  const origin = new URL(page.url()).origin;
  const cookie = await sessionCookie(page);

  const bytes = await makeWideImage(page);
  const temp = await upload(`incoming/${Date.now()}-photo.png`, Buffer.from(bytes), {
    access: "public",
    contentType: "image/png",
    handleUploadUrl: `${origin}/api/upload/token`,
    headers: { cookie },
  });

  const res = await page.request.post("/api/upload", { data: { url: temp.url } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  // Served directly from Vercel Blob's public CDN — no proxy route.
  expect(body.url).toMatch(/^https:\/\/.*\.public\.blob\.vercel-storage\.com\/.+\.webp$/);

  // Served back as webp, capped at 2000px on the long edge.
  const img = await page.request.get(body.url);
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toBe("image/webp");

  const dims = await page.evaluate(
    (url) =>
      new Promise<{ w: number; h: number }>((resolve) => {
        const i = new Image();
        i.onload = () => resolve({ w: i.naturalWidth, h: i.naturalHeight });
        i.src = url;
      }),
    body.url,
  );
  expect(dims.w).toBe(2000);
  expect(dims.h).toBe(1000);

  // The temp object handed off in the first hop is cleaned up, not left behind.
  const stale = await page.request.get(temp.url);
  expect(stale.status()).toBe(404);
});

test("both upload steps are refused when not signed in as the author", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/");

  const tokenRes = await page.request.post("/api/upload/token", { data: {} });
  expect(tokenRes.status()).toBe(401);

  const uploadRes = await page.request.post("/api/upload", {
    data: { url: "https://example.public.blob.vercel-storage.com/incoming/x.png" },
  });
  expect(uploadRes.status()).toBe(401);

  await ctx.close();
});

test("a url outside the blob store's incoming/ prefix is rejected", async ({ page }) => {
  await login(page);

  for (const url of [
    "https://evil.example.com/incoming/x.png",
    "https://a.public.blob.vercel-storage.com/uploads/already-processed.webp",
    "http://a.public.blob.vercel-storage.com/incoming/x.png",
  ]) {
    const res = await page.request.post("/api/upload", { data: { url } });
    expect(res.status()).toBe(400);
  }
});

test("malformed image bytes are rejected rather than stored", async ({ page }) => {
  await login(page);
  const origin = new URL(page.url()).origin;
  const cookie = await sessionCookie(page);

  // A valid content type, but bytes sharp can't decode — the token route
  // only gates the declared mime type, so this has to fail during processing.
  const temp = await upload(`incoming/${Date.now()}-bad.png`, Buffer.from("not an image"), {
    access: "public",
    contentType: "image/png",
    handleUploadUrl: `${origin}/api/upload/token`,
    headers: { cookie },
  });

  const res = await page.request.post("/api/upload", { data: { url: temp.url } });
  expect(res.status()).toBe(422);
});

test("a missing blob is not found, not a crash", async ({ page }) => {
  await login(page);
  const origin = new URL(page.url()).origin;
  const cookie = await sessionCookie(page);

  const bytes = await makeWideImage(page);
  const temp = await upload(`incoming/${Date.now()}-photo.png`, Buffer.from(bytes), {
    access: "public",
    contentType: "image/png",
    handleUploadUrl: `${origin}/api/upload/token`,
    headers: { cookie },
  });
  const res = await page.request.post("/api/upload", { data: { url: temp.url } });
  const body = await res.json();

  // Same store, a pathname that was never written.
  const missingUrl = (body.url as string).replace(/uploads\/[^/]+$/, "uploads/does-not-exist.webp");
  const missing = await page.request.get(missingUrl);
  expect(missing.status()).toBe(404);
});
