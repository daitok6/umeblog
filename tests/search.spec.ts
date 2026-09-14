import { test, expect } from "@playwright/test";
import { login, newPost } from "./helpers";

/**
 * Publish a post with a unique marker, then find it through the /search
 * page's own search form — and confirm a nonsense query returns no results
 * instead of erroring or listing everything.
 *
 * The header no longer carries a search box (see tests/blog.spec.ts for the
 * instant title/tag filter on / that replaced it); /search remains the
 * one place that reaches into post bodies.
 */
test("search finds a published post by body text", async ({ page }) => {
  // Both this marker and `nonsense` below hit /search, which logs a `search`
  // event per query. scripts/cleanup-test-data.ts matches on these exact
  // prefixes to sweep them out of the events table — change one here and
  // update it there too.
  const marker = `検索テスト-${Date.now()}`;

  await login(page);
  await newPost(page);

  await page.getByTestId("title-input").fill(marker);
  await page.getByTestId("lead-input").fill("検索用のリード文です。");

  const editable = page.locator(".bn-editor[contenteditable='true']").first();
  await editable.click();
  await page.keyboard.type(marker);

  await page.locator("button", { hasText: "いま保存" }).click();
  await expect(page.getByTestId("save-state")).toContainText("保存しました", { timeout: 15_000 });

  await page.locator("button", { hasText: "公開する" }).click();
  await page.waitForURL("**/admin/posts");

  // ── A reader searches from the /search page itself ──────
  await page.goto("/search");
  await page.locator(".site-search__input").fill(marker);
  await page.locator(".site-search__submit").click();

  await page.waitForURL(/\/search\?q=/);
  await expect(page.locator(".blog-grid")).toContainText(marker);

  // ── A query matching nothing shows the no-results message ──
  const nonsense = `該当なし-${Date.now()}`;
  await page.goto(`/search?q=${encodeURIComponent(nonsense)}`);
  await expect(page.locator("main")).toContainText("一致する記事はありませんでした");
});
