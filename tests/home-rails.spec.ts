import { test, expect } from "@playwright/test";
import { login, newPost } from "./helpers";

/**
 * Home page rails: manual horizontal scroll only, no auto-advance. Prev/next
 * buttons are absent unless a rail actually overflows, and a keyboard user
 * can scroll the track directly via its own tabIndex.
 */
test("a rail scrolls manually and its nav reflects scroll position", async ({ page }) => {
  // Ensure at least one rail has enough posts to overflow a narrow viewport.
  await login(page);
  for (let i = 0; i < 4; i++) {
    await newPost(page);
    await page.getByTestId("title-input").fill(`棚テスト-${Date.now()}-${i}`);
    await page.locator(".bn-editor[contenteditable='true']").first().click();
    await page.keyboard.type("本文");
    await page.locator("button", { hasText: "いま保存" }).click();
    await expect(page.getByTestId("save-state")).toContainText("保存しました", {
      timeout: 15_000,
    });
    await page.locator("button", { hasText: "公開する" }).click();
    await page.waitForURL("**/admin/posts");
  }

  await page.setViewportSize({ width: 500, height: 900 });
  await page.goto("/");

  const rail = page.locator(".rail").first();
  await expect(rail).toBeVisible();

  const track = rail.locator(".rail__track");
  const next = rail.locator(".rail__btn[aria-label='次へ']");
  await expect(next).toBeVisible();
  await expect(next).toBeEnabled();

  const before = await track.evaluate((el) => el.scrollLeft);
  await next.click();
  await expect
    .poll(async () => track.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(before);

  // The track itself is directly keyboard-focusable/scrollable.
  await expect(track).toHaveAttribute("tabindex", "0");
});

test("nav is absent when a rail does not overflow its viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/");

  const rails = page.locator(".rail");
  const count = await rails.count();
  for (let i = 0; i < count; i++) {
    const rail = rails.nth(i);
    const track = rail.locator(".rail__track");
    const overflowing = await track.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    const navCount = await rail.locator(".rail__nav").count();
    expect(navCount).toBe(overflowing ? 1 : 0);
  }
});
