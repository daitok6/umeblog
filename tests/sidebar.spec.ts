import { test, expect, type Page } from "@playwright/test";
import { login, newPost } from "./helpers";

/**
 * Desktop-only sidebar on the article page: 目次 (table of contents),
 * 関連記事 (related), 話題 (topics), and 最近の記事 (recent) — sticky, and
 * built entirely from space .prose never used (see public.css's
 * .article__aside / .article__sidebar). Below 768px it's replaced by a
 * collapsed <details> TOC and a related-articles block at the end of the
 * article (.article__toc-m / .related-tail) — see tests/mobile.spec.ts for
 * the general no-overflow/tap-target sweep this only supplements.
 */

async function publish(
  page: Page,
  { title, tag, body }: { title: string; tag?: string; body: () => Promise<void> },
) {
  await newPost(page);
  await page.getByTestId("title-input").fill(title);
  if (tag) await page.getByTestId("tags-input").fill(tag);
  await page.locator(".bn-editor[contenteditable='true']").first().click();
  await body();
  await page.locator("button", { hasText: "いま保存" }).click();
  await expect(page.getByTestId("save-state")).toContainText("保存しました", { timeout: 15_000 });
  await page.locator("button", { hasText: "公開する" }).click();
  await page.waitForURL("**/admin/posts");
}

/** A two-heading article long enough to plausibly need scrolling at 720px. */
async function typeTwoSectionArticle(page: Page, headingA: string, headingB: string) {
  const filler = "この段落はテスト用の埋め草の文章です。".repeat(12);
  await page.keyboard.type(`## ${headingA}`);
  await page.keyboard.press("Enter");
  await page.keyboard.insertText(filler);
  await page.keyboard.press("Enter");
  await page.keyboard.type(`## ${headingB}`);
  await page.keyboard.press("Enter");
  await page.keyboard.insertText(filler);
}

test("desktop: sidebar surfaces a working TOC, related articles, and topics without narrowing .prose", async ({
  page,
}) => {
  const stamp = Date.now();
  const tagName = `サイドバータグ${stamp}`;
  const titleMate = `サイドバー関連記事-${stamp}`;
  const titleMain = `サイドバー本編-${stamp}`;
  const headingA = `見出しアルファ${stamp}`;
  const headingB = `見出しベータ${stamp}`;

  await login(page);

  // A tag-mate, published first so listRelated has a genuine match.
  await publish(page, {
    title: titleMate,
    tag: tagName,
    body: async () => {
      await page.keyboard.insertText("関連記事側の本文です。");
    },
  });

  await publish(page, {
    title: titleMain,
    tag: tagName,
    body: () => typeTwoSectionArticle(page, headingA, headingB),
  });

  // ── A reader opens the main post at the project's default (desktop)
  // viewport ───────────────────────────────────────────────────────────
  await page.goto("/");
  await page.locator(".blog-card__link", { hasText: titleMain }).first().click();
  await page.locator(".prose").waitFor();

  const aside = page.locator(".article__aside");
  await expect(aside).toBeVisible();

  // The regression guard that matters most: .prose keeps the same 20–40
  // JP-char measure tests/typography.spec.ts:32 asserts site-wide.
  const chars = await page.evaluate(() => {
    const el = document.querySelector(".prose") as HTMLElement;
    const cs = getComputedStyle(el);
    const advance =
      parseFloat(cs.fontSize) * (1 + parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize));
    return el.clientWidth / advance;
  });
  expect(chars).toBeGreaterThan(20);
  expect(chars).toBeLessThanOrEqual(40);

  // No page-level horizontal scroll despite the new column.
  const overflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
  }));
  expect(overflow.scrollW).toBeLessThanOrEqual(overflow.innerW + 1);

  // The sidebar is actually sticky, offset below the header.
  const sidebarStyle = await page.locator(".article__sidebar").evaluate((el) => {
    const cs = getComputedStyle(el);
    return { position: cs.position, top: cs.top };
  });
  expect(sidebarStyle.position).toBe("sticky");
  expect(parseFloat(sidebarStyle.top)).toBeGreaterThan(0);

  // TOC: one link per rendered prose heading, and every link resolves to a
  // real heading inside .prose — catches drift between BlockRenderer and
  // headingsFromBlocks (they must derive the same anchor id).
  const proseHeadingCount = await page.locator(".prose h2, .prose h3, .prose h4").count();
  expect(proseHeadingCount).toBeGreaterThanOrEqual(2);
  const tocLinks = aside.locator(".toc__link");
  await expect(tocLinks).toHaveCount(proseHeadingCount);

  const hrefs = await tocLinks.evaluateAll((els) =>
    els.map((el) => (el as HTMLAnchorElement).hash.slice(1)),
  );
  for (const id of hrefs) {
    expect(await page.evaluate((elId) => !!document.getElementById(elId), id)).toBe(true);
  }

  // 関連記事: the tag-mate shows up; the article never links to itself.
  const relatedBlock = aside.locator(".side-block").filter({ has: page.locator("#side-related") });
  await expect(relatedBlock.getByRole("link", { name: titleMate })).toBeVisible();
  await expect(aside.getByRole("link", { name: titleMain })).toHaveCount(0);

  // 話題 never repeats a tag already shown in .article__meta.
  await expect(page.locator(".article__meta").getByText(tagName, { exact: true })).toBeVisible();
  await expect(aside.locator(".side-tags").getByText(tagName, { exact: true })).toHaveCount(0);

  // Scroll-spy: once both headings have scrolled past, the last one's link
  // (the section actually being read) is the one marked current.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(150);
  await expect(page.locator('.toc__link[aria-current="true"]')).toHaveCount(1);
  await expect(tocLinks.last()).toHaveAttribute("aria-current", "true");
});

test("mobile: the sidebar is replaced by a collapsed TOC and a related-articles block", async ({
  page,
}) => {
  const stamp = Date.now();
  const tagName = `携帯サイドバー${stamp}`;
  const titleMate = `携帯関連記事-${stamp}`;
  const titleMain = `携帯本編-${stamp}`;

  await login(page);

  await publish(page, {
    title: titleMate,
    tag: tagName,
    body: async () => {
      await page.keyboard.insertText("携帯関連記事の本文です。");
    },
  });

  await publish(page, {
    title: titleMain,
    tag: tagName,
    body: () => typeTwoSectionArticle(page, "見出しワン", "見出しツー"),
  });

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await page.locator(".blog-card__link", { hasText: titleMain }).first().click();
  await page.locator(".prose").waitFor();

  await expect(page.locator(".article__aside")).toBeHidden();

  const toc = page.locator(".article__toc-m");
  await expect(toc).toBeVisible();
  await toc.locator("summary").click();
  const tocLinks = toc.locator(".toc__link");
  await expect(tocLinks).toHaveCount(2);
  const linkBox = await tocLinks.first().boundingBox();
  expect(linkBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  const relatedTail = page.locator(".related-tail");
  await expect(relatedTail).toBeVisible();
  await expect(relatedTail.getByRole("link", { name: titleMate })).toBeVisible();
  const relatedBox = await relatedTail.getByRole("link", { name: titleMate }).boundingBox();
  expect(relatedBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  const overflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
  }));
  expect(overflow.scrollW).toBeLessThanOrEqual(overflow.innerW + 1);
});

test("an article with no headings renders no table of contents", async ({ page }) => {
  const stamp = Date.now();
  const title = `見出しなし-${stamp}`;

  await login(page);
  await publish(page, {
    title,
    body: async () => {
      await page.keyboard.insertText("見出しのない、短い本文です。");
    },
  });

  await page.goto("/");
  await page.locator(".blog-card__link", { hasText: title }).first().click();
  await page.locator(".prose").waitFor();

  await expect(page.locator(".toc")).toHaveCount(0);
});
