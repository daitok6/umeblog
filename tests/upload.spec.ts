import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Phone photos arrive at 3–5MB and in whatever orientation the camera chose.
 * Every upload is re-encoded, resized and stripped before it is stored, so
 * this checks the pipeline rather than just the HTTP status.
 */

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

  const bytes = await makeWideImage(page);

  const result = await page.evaluate(async (data) => {
    const file = new File([new Uint8Array(data)], "photo.png", { type: "image/png" });
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    return { status: res.status, body: await res.json() };
  }, bytes);

  expect(result.status).toBe(200);
  // Served directly from Vercel Blob's public CDN — no proxy route.
  expect(result.body.url).toMatch(/^https:\/\/.*\.public\.blob\.vercel-storage\.com\/.+\.webp$/);

  // Served back as webp, capped at 2000px on the long edge.
  const img = await page.request.get(result.body.url);
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toBe("image/webp");

  const dims = await page.evaluate(
    (url) =>
      new Promise<{ w: number; h: number }>((resolve) => {
        const i = new Image();
        i.onload = () => resolve({ w: i.naturalWidth, h: i.naturalHeight });
        i.src = url;
      }),
    result.body.url,
  );
  expect(dims.w).toBe(2000);
  expect(dims.h).toBe(1000);
});

test("upload is refused when not signed in as the author", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/");

  const status = await page.evaluate(async () => {
    const fd = new FormData();
    fd.append("file", new File([new Uint8Array([1, 2, 3])], "x.png", { type: "image/png" }));
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    return res.status;
  });

  expect(status).toBe(401);
  await ctx.close();
});

test("a non-image is rejected rather than stored", async ({ page }) => {
  await login(page);

  const status = await page.evaluate(async () => {
    const fd = new FormData();
    fd.append("file", new File([new TextEncoder().encode("not an image")], "x.txt", {
      type: "text/plain",
    }));
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    return res.status;
  });

  expect(status).toBe(422);
});

test("a missing blob is not found, not a crash", async ({ page }) => {
  await login(page);

  const bytes = await makeWideImage(page);
  const result = await page.evaluate(async (data) => {
    const file = new File([new Uint8Array(data)], "photo.png", { type: "image/png" });
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    return { body: await res.json() };
  }, bytes);

  // Same store, a pathname that was never written.
  const missingUrl = (result.body.url as string).replace(/uploads\/[^/]+$/, "uploads/does-not-exist.webp");
  const res = await page.request.get(missingUrl);
  expect(res.status()).toBe(404);
});
