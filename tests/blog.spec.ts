import { test, expect } from "@playwright/test";
import { login, newPost } from "./helpers";

/**
 * /blog is the full archive: search + tag/year/sort filters, all applied
 * instantly in the browser (no navigation, no reload). This publishes real
 * posts and drives the filter UI the way a reader would.
 */
test("filters and searches the blog list instantly, with no navigation", async ({ page }) => {
  const stamp = Date.now();
  const markerA = `並び替えテストA-${stamp}`;
  const markerB = `並び替えテストB-${stamp}`;
  const sharedTerm = `並び替えテスト`;
  const tagName = `絞り込みタグ${stamp}`;

  // ── Publish two posts, B after A, both carrying a shared tag ─────
  await login(page);

  await newPost(page);
  await page.getByTestId("title-input").fill(markerA);
  await page.getByTestId("lead-input").fill("A のリード文です。");
  await page.getByTestId("tags-input").fill(tagName);
  await page.locator(".bn-editor[contenteditable='true']").first().click();
  await page.keyboard.type("本文A");
  await page.locator("button", { hasText: "いま保存" }).click();
  await expect(page.getByTestId("save-state")).toContainText("保存しました", { timeout: 15_000 });
  await page.locator("button", { hasText: "公開する" }).click();
  await page.waitForURL("**/admin/posts");

  await newPost(page);
  await page.getByTestId("title-input").fill(markerB);
  await page.getByTestId("lead-input").fill("B のリード文です。");
  await page.getByTestId("tags-input").fill(tagName);
  await page.locator(".bn-editor[contenteditable='true']").first().click();
  await page.keyboard.type("本文B");
  await page.locator("button", { hasText: "いま保存" }).click();
  await expect(page.getByTestId("save-state")).toContainText("保存しました", { timeout: 15_000 });
  await page.locator("button", { hasText: "公開する" }).click();
  await page.waitForURL("**/admin/posts");

  // ── A reader lands on /blog ───────────────────────────────────────
  await page.goto("/blog");
  const searchInput = page.locator("#blog-search");
  const rows = page.locator(".post-row");

  // Marks a global to prove filtering never triggers a navigation.
  await page.evaluate(() => {
    (window as unknown as { __noNav: boolean }).__noNav = true;
  });

  // ── Typing the shared term narrows to exactly these two, newest first ──
  await searchInput.fill(sharedTerm);
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText(markerB);
  await expect(rows.nth(1)).toContainText(markerA);
  await expect(page.locator(".blog-count")).toContainText("2 本");

  // ── Sort flips the order without touching count ─────────────────
  await page.locator("#blog-sort").selectOption("old");
  await expect(rows.nth(0)).toContainText(markerA);
  await expect(rows.nth(1)).toContainText(markerB);
  await page.locator("#blog-sort").selectOption("new");

  // ── A nonsense query shows the no-match state with an escape to /search ──
  const nonsense = `該当なし-${stamp}`;
  await searchInput.fill(nonsense);
  await expect(page.locator(".blog-nomatch")).toBeVisible();
  await expect(page.locator(".blog-nomatch a")).toHaveAttribute(
    "href",
    `/search?q=${encodeURIComponent(nonsense)}`,
  );

  // ── The shared tag chip filters to the same two posts ────────────
  await searchInput.fill("");
  await page
    .locator(".blog-filters__chip", { hasText: tagName })
    .click();
  await expect(rows).toHaveCount(2);
  await expect(page.locator(".blog-filters__chip", { hasText: tagName })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // ── Reset clears every filter ─────────────────────────────────────
  await page.locator(".blog-filters__reset").click();
  await expect(searchInput).toHaveValue("");
  await expect(page.locator(".blog-filters__chip", { hasText: tagName })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  // ── None of the above ever navigated away from /blog ──────────────
  expect(page.url()).toContain("/blog");
  expect(
    await page.evaluate(() => (window as unknown as { __noNav?: boolean }).__noNav),
  ).toBe(true);
});

test("composing Japanese text does not filter mid-conversion", async ({ page }) => {
  await page.goto("/blog");
  const searchInput = page.locator("#blog-search");
  const countBefore = await page.locator(".blog-count").innerText();

  // Simulate an IME composition: browsers fire compositionstart, then
  // input events for each provisional reading, then compositionend once
  // the reading is confirmed. Filtering must wait for compositionend.
  await searchInput.dispatchEvent("compositionstart");
  await searchInput.evaluate((el: HTMLInputElement) => {
    el.value = "けんさく";
  });
  await searchInput.dispatchEvent("input");
  // Give the debounce a chance to fire if the guard were missing.
  await page.waitForTimeout(250);
  await expect(page.locator(".blog-count")).toContainText(countBefore);

  await searchInput.dispatchEvent("compositionend");
  await expect(page.locator(".blog-count")).not.toContainText(countBefore);
});
