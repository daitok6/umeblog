import { test, expect } from "@playwright/test";
import { login, newPost } from "./helpers";

/**
 * /admin/tags curates which tags become filter chips (and in what order),
 * fixing the "too crowded" problem where every tag in use, however small,
 * showed up on the blog's chip row. A tag not picked here must never appear
 * as a chip or in the footer nav — that's the whole point of switching from
 * "every tag, biggest first" to an author-picked allowlist.
 */
test("curating a tag makes it a filter chip; leaving one unpicked keeps it hidden", async ({
  page,
}) => {
  const stamp = Date.now();
  const picked = `絞り込みタグ選択-${stamp}`;
  const unpicked = `絞り込みタグ非選択-${stamp}`;

  // ── Publish one post per tag ─────────────────────────────────────
  await login(page);

  await newPost(page);
  await page.getByTestId("title-input").fill(`タグ公開テストA-${stamp}`);
  await page.getByTestId("tags-input").fill(picked);
  await page.locator(".bn-editor[contenteditable='true']").first().click();
  await page.keyboard.type("本文A");
  await page.locator("button", { hasText: "いま保存" }).click();
  await expect(page.getByTestId("save-state")).toContainText("保存しました", { timeout: 15_000 });
  await page.locator("button", { hasText: "公開する" }).click();
  await page.waitForURL("**/admin/posts");

  await newPost(page);
  await page.getByTestId("title-input").fill(`タグ公開テストB-${stamp}`);
  await page.getByTestId("tags-input").fill(unpicked);
  await page.locator(".bn-editor[contenteditable='true']").first().click();
  await page.keyboard.type("本文B");
  await page.locator("button", { hasText: "いま保存" }).click();
  await expect(page.getByTestId("save-state")).toContainText("保存しました", { timeout: 15_000 });
  await page.locator("button", { hasText: "公開する" }).click();
  await page.waitForURL("**/admin/posts");

  // ── Curate only one of the two. A high order number (99) keeps this
  // test's tag out of the way of whatever the site's real curated order
  // already is, instead of assuming it lands first ────────────────────
  await page.goto("/admin/tags");
  await page.locator("tr", { hasText: picked }).locator('input[type="checkbox"]').check();
  await page.locator("tr", { hasText: picked }).locator('input[type="number"]').fill("99");
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.locator("button", { hasText: "保存する" }).click(),
  ]);

  // Persisted: reloading the admin page still shows it checked.
  await page.reload();
  await expect(
    page.locator("tr", { hasText: picked }).locator('input[type="checkbox"]'),
  ).toBeChecked();
  await expect(
    page.locator("tr", { hasText: unpicked }).locator('input[type="checkbox"]'),
  ).not.toBeChecked();

  // ── On the blog, only the curated tag is a chip ──────────────────
  await page.goto("/");
  await expect(page.locator(".blog-filters__chip", { hasText: picked })).toBeVisible();
  await expect(page.locator(".blog-filters__chip", { hasText: unpicked })).toHaveCount(0);

  // ── ...and the footer nav, driven by the same curated list, agrees ──
  await expect(page.locator(".site-footer__nav a", { hasText: unpicked })).toHaveCount(0);

  // ── A card's tag link jumps to /tag/[slug], landing pre-filtered ────
  await page.locator(".blog-card__tag", { hasText: picked }).first().click();
  await page.waitForURL(/\/tag\//);
  await expect(page.locator(".blog-filters__chip", { hasText: picked })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".blog-card")).toHaveCount(1);

  // The tag page carries the same instant search as home.
  await page.locator("#blog-search").fill(`該当なし-${stamp}`);
  await expect(page.locator(".blog-nomatch")).toBeVisible();
});

/**
 * The delete button in /admin/tags only ever appears for a tag with zero
 * posts or tickets attached (any status, not just published — deleting a
 * tag still used by a draft would silently untag it) — this is what lets
 * old Playwright fixtures (and any other stray tag) be cleared by hand
 * without risking a tag still attached to real content.
 */
test("an unused tag can be deleted; a tag with posts cannot", async ({ page }) => {
  const stamp = Date.now();
  const usedTag = `絞り込みタグ使用中-${stamp}`;
  const unusedTag = `絞り込みタグ未使用-${stamp}`;

  await login(page);

  // Published post, keeps the tag → still attached, never deletable.
  await newPost(page);
  await page.getByTestId("title-input").fill(`削除ガードテスト-${stamp}`);
  await page.getByTestId("tags-input").fill(usedTag);
  await page.locator(".bn-editor[contenteditable='true']").first().click();
  await page.keyboard.type("本文");
  await page.locator("button", { hasText: "いま保存" }).click();
  await expect(page.getByTestId("save-state")).toContainText("保存しました", { timeout: 15_000 });
  await page.locator("button", { hasText: "公開する" }).click();
  await page.waitForURL("**/admin/posts");

  // A second post is tagged, then immediately re-tagged to something else —
  // this is how a real orphan tag appears (an author changes a post's tags,
  // or a test's fixture post gets deleted): the tag row survives with zero
  // post_tags rows attached, published or not.
  await newPost(page);
  await page.getByTestId("title-input").fill(`削除対象-${stamp}`);
  await page.getByTestId("tags-input").fill(unusedTag);
  await page.locator(".bn-editor[contenteditable='true']").first().click();
  await page.keyboard.type("本文（一時的にタグ付け）");
  await page.locator("button", { hasText: "いま保存" }).click();
  await expect(page.getByTestId("save-state")).toContainText("保存しました", { timeout: 15_000 });

  await page.getByTestId("tags-input").fill(`日々`);
  await page.locator("button", { hasText: "いま保存" }).click();
  await expect(page.getByTestId("save-state")).toContainText("保存しました", { timeout: 15_000 });

  await page.goto("/admin/tags");
  await expect(page.locator("tr", { hasText: usedTag }).locator("button", { hasText: "削除" })).toHaveCount(0);

  const deleteBtn = page.locator("tr", { hasText: unusedTag }).locator("button", { hasText: "削除" });
  await expect(deleteBtn).toBeVisible();
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    deleteBtn.click(),
  ]);
  await expect(page.locator("tr", { hasText: unusedTag })).toHaveCount(0);
});
