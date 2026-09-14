import { test, expect, type Page } from "@playwright/test";
import { login, newPost } from "./helpers";

/**
 * The home hero now shares its first screen with a 注目 (featured) rail —
 * see src/app/(public)/page.tsx and src/components/FeaturedRail.tsx. This
 * exercises the whole path: give an article a thumbnail and tick 注目 in
 * the editor sidebar, publish it, and check the rail actually shows it.
 */

/** A tiny solid-colour PNG, same trick as tests/mobile.spec.ts's hero test. */
async function makeSwatch(page: Page, color: string) {
  const bytes = await page.evaluate(async (fill) => {
    const c = document.createElement("canvas");
    c.width = 40;
    c.height = 40;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, 40, 40);
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, color);
  return Buffer.from(bytes);
}

/**
 * Writes a post, gives it a thumbnail and the 注目 flag through the sidebar,
 * and publishes it. The thumbnail and 注目 toggle each fire their own server
 * action (PostSidebar's `onPick` / `onChange`), so each is paired with a
 * `waitForResponse` scoped to this page's own URL — loose enough to catch
 * the action, specific enough to skip the upload's own `/api/upload` hop
 * and any unrelated traffic.
 */
async function writeFeaturedPost(page: Page, marker: string, color: string) {
  await newPost(page);
  await page.getByTestId("title-input").fill(marker);
  await page.locator(".bn-editor[contenteditable='true']").first().click();
  await page.keyboard.type("本文です。");
  await page.locator("button", { hasText: "いま保存" }).click();
  await expect(page.getByTestId("save-state")).toContainText("保存しました", { timeout: 15_000 });

  const editUrl = page.url();
  const isThisPageAction = (r: import("@playwright/test").Response) =>
    r.request().method() === "POST" && r.url() === editUrl;

  await Promise.all([
    page.waitForResponse(isThisPageAction, { timeout: 15_000 }),
    page.locator(".editor-side .image-field input[type=file]").setInputFiles({
      name: `${marker}.png`,
      mimeType: "image/png",
      buffer: await makeSwatch(page, color),
    }),
  ]);
  await expect(page.locator(".editor-side .image-field input[type=hidden]")).not.toHaveValue("");

  await Promise.all([
    page.waitForResponse(isThisPageAction, { timeout: 15_000 }),
    page.locator(".editor-side .simple-toggle input[type=checkbox]").check(),
  ]);

  await page.locator("button", { hasText: "公開する" }).click();
  await page.waitForURL("**/admin/posts");
}

test("published, featured articles with thumbnails appear in the home 注目 rail", async ({
  page,
}) => {
  const stamp = Date.now();
  const markerA = `注目テストA-${stamp}`;
  const markerB = `注目テストB-${stamp}`;

  await login(page);
  // Two posts, not one — a single card never overflows its own track, so
  // there'd be nothing for the ‹ › arrows to actually move.
  await writeFeaturedPost(page, markerA, "#c0392b");
  await writeFeaturedPost(page, markerB, "#2980b9");

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");

  const rail = page.locator(".featured-rail");
  await expect(rail).toBeVisible();
  await expect(rail).toContainText(markerA);
  await expect(rail).toContainText(markerB);

  // The thumbnail actually resolved — not the empty-card placeholder. A
  // freshly navigated <img> can take a beat to pick a candidate, so this
  // polls (like mobile.spec.ts's hero currentSrc check) rather than reading
  // it once.
  const firstCover = rail.locator(".featured-card").first().locator("img");
  await expect(firstCover).toHaveCount(1);
  await expect(async () => {
    const coverSrc = await firstCover.evaluate((img: HTMLImageElement) => img.currentSrc);
    expect(coverSrc).not.toBe("");
  }).toPass({ timeout: 10_000 });

  // The hero gave up part of the screen instead of filling all of it.
  const heroHeight = await page
    .locator(".blog-hero")
    .evaluate((el) => el.getBoundingClientRect().height);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  expect(heroHeight).toBeLessThan(viewportHeight * 0.8);

  // The rail's own horizontal scroll never leaks into a page-wide one.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  // Two cards overflow a 375px screen — › should move the track.
  const track = rail.locator(".featured-rail__track");
  const before = await track.evaluate((el) => el.scrollLeft);
  await rail.getByRole("button", { name: "次の記事" }).click();
  await expect(async () => {
    const after = await track.evaluate((el) => el.scrollLeft);
    expect(after).toBeGreaterThan(before);
  }).toPass({ timeout: 5_000 });
});
