import { test, expect } from "@playwright/test";
import { login, logout, newPost, READER } from "./helpers";

/**
 * One pass through the whole product: write, publish, read, answer.
 */
test("write a post, publish it, read it, and receive a reply", async ({ page }) => {
  const marker = `テスト投稿-${Date.now()}`;

  // ── She writes ───────────────────────────────────────────
  await login(page);
  await newPost(page);

  await page.getByTestId("title-input").fill(marker);
  await page.getByTestId("lead-input").fill("これはテストのリード文です。");
  await page.getByTestId("tags-input").fill("日々 テスト");

  const editable = page.locator(".bn-editor[contenteditable='true']").first();
  await editable.click();
  await page.keyboard.type("本文をここに書きます。");

  await page.locator("button", { hasText: "いま保存" }).click();
  await expect(page.getByTestId("save-state")).toContainText("保存しました", { timeout: 15_000 });

  // Draft is not public yet.
  const draftUrl = page.url();
  const postId = draftUrl.split("/").pop()!;

  // ── She publishes ────────────────────────────────────────
  await page.locator("button", { hasText: "公開する" }).click();
  await page.waitForURL("**/admin/posts");
  await expect(page.locator(".admin-table", { hasText: marker })).toContainText("公開中");

  // ── A reader reads it ────────────────────────────────────
  await page.goto("/");
  // The header no longer carries a search box — that moved to /blog's
  // instant filter (tests/blog.spec.ts) — and its "Blog" link now points
  // there instead of home.
  await expect(page.locator(".site-header").locator(".site-search__input")).toHaveCount(0);
  await expect(page.locator(".site-header .nav-link", { hasText: "Blog" })).toHaveAttribute(
    "href",
    "/blog",
  );

  await page.goto("/blog");
  await expect(page.locator(".blog-grid")).toContainText(marker);

  await page.locator(".blog-card__link", { hasText: marker }).click();
  await page.waitForURL(/\/p\//);
  await expect(page.locator(".article__title")).toContainText(marker);
  await expect(page.locator(".prose")).toContainText("本文をここに書きます。");
  // A serial number was assigned on publish.
  await expect(page.locator(".article__serial")).not.toBeEmpty();

  // ── He replies ───────────────────────────────────────────
  await page.goto("/admin");
  await logout(page);
  await login(page, READER);

  const before = await page.locator(".counter__n").nth(3).innerText();

  await page.goto(`/admin/posts/${postId}`);
  await page.getByTestId("reply-input").fill("読みました。いい話でした。");
  await page.locator("button", { hasText: "返事を送る" }).click();
  await expect(page.locator(".panel", { hasText: "往復" })).toContainText("読みました。いい話でした。");

  // ── 往復 has increased ───────────────────────────────────
  // Polled rather than read once: the dashboard queries a real network
  // database now, and this counter aggregates across every reply in the
  // table, so a reload immediately after the write can occasionally land a
  // beat ahead of it. The reply itself is already confirmed above — this is
  // purely tolerating that read's timing, not weakening what it checks.
  await expect
    .poll(
      async () => {
        await page.goto("/admin");
        return parseInt(await page.locator(".counter__n").nth(3).innerText(), 10);
      },
      { timeout: 10_000 },
    )
    .toBe(parseInt(before, 10) + 1);

  // ── And she sees the reply on her dashboard ──────────────
  await logout(page);
  await login(page);
  await expect(page.locator(".reply-card__body")).toContainText("読みました。いい話でした。");
});

test("a scheduled post stays hidden until its time passes", async ({ page }) => {
  await login(page);
  await newPost(page);

  const marker = `予約テスト-${Date.now()}`;
  await page.getByTestId("title-input").fill(marker);
  await page.locator("button", { hasText: "いま保存" }).click();
  await expect(page.getByTestId("save-state")).toContainText("保存しました", { timeout: 15_000 });

  // Schedule for tomorrow (the field defaults to +1 day).
  await page.locator("button", { hasText: "この日時に公開" }).click();
  await page.waitForURL("**/admin/posts");
  await expect(page.locator(".admin-table", { hasText: marker })).toContainText("予約済み");

  // Not on the public site yet — the visibility predicate compares publishAt
  // to now at read time, which is why no cron job is needed.
  await page.goto("/blog");
  await expect(page.locator(".blog-grid")).not.toContainText(marker);
});

test("unpublishing removes a post from the public site but keeps its number", async ({
  page,
}) => {
  const marker = `取消テスト-${Date.now()}`;

  await login(page);
  await newPost(page);
  await page.getByTestId("title-input").fill(marker);
  await page.locator("button", { hasText: "いま保存" }).click();
  await expect(page.getByTestId("save-state")).toContainText("保存しました", { timeout: 15_000 });

  const postUrl = page.url();
  await page.locator("button", { hasText: "公開する" }).click();
  await page.waitForURL("**/admin/posts");

  await page.goto("/blog");
  await expect(page.locator(".blog-grid")).toContainText(marker);

  // Capture the number it was given.
  await page.goto(postUrl);
  // Compare the number itself; innerText and textContent disagree on case
  // because .label is uppercased in CSS.
  const serialOf = async () =>
    ((await page.locator(".side-panel .label").first().textContent()) ?? "").replace(/\D/g, "");
  const serial = await serialOf();
  expect(serial).toMatch(/^\d+$/);

  await page.locator("button", { hasText: "公開を取り消す" }).click();
  await expect(page.locator(".status")).toContainText("下書き");

  await page.goto("/blog");
  await expect(page.locator(".blog-grid")).not.toContainText(marker);

  // Republishing must not renumber it — readers' links and the numbering they
  // see stay put.
  await page.goto(postUrl);
  await page.locator("button", { hasText: "公開する" }).click();
  await page.waitForURL("**/admin/posts");

  await page.goto(postUrl);
  expect(await serialOf()).toBe(serial);

  await page.goto("/blog");
  await expect(page.locator(".blog-grid")).toContainText(marker);
});
