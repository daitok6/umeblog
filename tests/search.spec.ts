import { test, expect } from "@playwright/test";
import { login, newPost } from "./helpers";

/**
 * Publish a post with a unique marker, then find it through the header
 * search — and confirm a nonsense query returns no results instead of
 * erroring or listing everything.
 */
test("search finds a published post by body text", async ({ page }) => {
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

  // ── A reader searches from the header ───────────────────
  await page.goto("/");
  await page.locator(".site-search__input").fill(marker);
  await page.locator(".site-search__submit").click();

  await page.waitForURL(/\/search\?q=/);
  await expect(page.locator(".post-list")).toContainText(marker);

  // ── A query matching nothing shows the no-results message ──
  const nonsense = `該当なし-${Date.now()}`;
  await page.goto(`/search?q=${encodeURIComponent(nonsense)}`);
  await expect(page.locator("main")).toContainText("一致する記事はありませんでした");
});
