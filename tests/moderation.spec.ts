import { test, expect } from "@playwright/test";
import { screenComment, containsLink, hashIp, isRateLimited } from "../src/lib/moderation";
import { login } from "./helpers";

/**
 * Screening rules, in the order the research recommended: links first
 * (highest catch rate, near-zero false positives), then a self-authored
 * Japanese word list, then rate limiting.
 */

test.describe("screening (pure)", () => {
  test("catches plain URLs", () => {
    expect(containsLink("見てね http://example.com")).toBe(true);
    expect(containsLink("www.example.com")).toBe(true);
  });

  test("catches the usual obfuscations", () => {
    expect(containsLink("example[.]com")).toBe(true);
    expect(containsLink("example(dot)com")).toBe(true);
  });

  test("leaves ordinary Japanese comments alone", () => {
    const r = screenComment("はじめまして。文章の雰囲気が好きです。", ["死ね"]);
    expect(r.status).toBe("pending");
  });

  test("flags a blocked Japanese word", () => {
    const r = screenComment("これは詐欺です", ["詐欺"]);
    expect(r.status).toBe("spam");
    expect(r.reason).toContain("詐欺");
  });

  test("normalises width so full-width evasion still matches", () => {
    // ＮＧ words typed in full-width must not slip past.
    const r = screenComment("こちらで稼げるらしい", ["稼げる"]);
    expect(r.status).toBe("spam");
  });

  test("catches zero-width characters used to break up words", () => {
    const r = screenComment("詐​欺​です、とても長い本文です", []);
    expect(r.status).toBe("spam");
  });

  test("never stores a raw IP", () => {
    const h = hashIp("203.0.113.9");
    expect(h).not.toContain("203");
    expect(h).toHaveLength(32);
  });

  test("rate limit trips at the configured maximum", () => {
    expect(isRateLimited(2)).toBe(false);
    expect(isRateLimited(3)).toBe(true);
  });
});

test.describe("moderation end to end", () => {
  test("a comment with a link never reaches a reader", async ({ page }) => {
    // A distinct IP per test: the rate limiter is per-IP and would otherwise
    // (correctly) block repeated runs from the same address.
    await page.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${Date.now() % 200}` });
    await page.goto("/");
    await page.locator(".post-row__link").first().click();
    await page.locator(".comment-form").waitFor();

    const marker = `spamcheck-${Date.now()}`;
    await page.locator("#authorName").fill("tester");
    await page.locator("#body").fill(`${marker} http://example.com/buy`);
    await page.locator(".comment-form button[type=submit]").click();

    await expect(page.getByTestId("comment-result")).toContainText("ありがとうございます");

    // Reload as a reader: the text must be nowhere on the page.
    await page.reload();
    await expect(page.locator("body")).not.toContainText(marker);
  });

  test("an approved comment becomes visible", async ({ page }) => {
    const marker = `ok-${Date.now()}`;
    await page.setExtraHTTPHeaders({ "x-forwarded-for": `203.0.113.${Date.now() % 200}` });

    await page.goto("/");
    await page.locator(".post-row__link").first().click();
    // Wait for the navigation to settle before reading the URL, or page.url()
    // still reports "/" and the final assertion checks the wrong page.
    await page.waitForURL(/\/p\//);
    await page.locator(".comment-form").waitFor();
    const postUrl = page.url();

    await page.locator("#authorName").fill("みどり");
    await page.locator("#body").fill(`${marker} 読みました。`);
    await page.locator(".comment-form button[type=submit]").click();
    await expect(page.getByTestId("comment-result")).toContainText("ありがとうございます");

    // Not visible yet.
    await page.reload();
    await expect(page.locator(".comments")).not.toContainText(marker);

    // Approve it.
    await login(page);

    await page.goto("/admin/comments?status=pending");
    const item = page.locator(".queue-item", { hasText: marker });
    await expect(item).toBeVisible();
    await item.locator("button", { hasText: "公開する" }).click();
    // Wait for the server action to land before navigating away, otherwise the
    // assertion races the approval.
    await expect(item).toBeHidden();

    await page.goto(postUrl);
    await expect(page.locator(".comments")).toContainText(marker);
  });
});

test("the rate limiter blocks a burst from one address", async ({ page }) => {
  const ip = `192.0.2.${Date.now() % 200}`;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });

  await page.goto("/");
  await page.locator(".post-row__link").first().click();
  await page.locator(".comment-form").waitFor();

  // Three are allowed; the fourth must be refused.
  for (let i = 0; i < 3; i++) {
    await page.locator("#authorName").fill("burst");
    await page.locator("#body").fill(`連投テスト ${i} ${Date.now()}`);
    await page.locator(".comment-form button[type=submit]").click();
    await expect(page.getByTestId("comment-result")).toBeVisible();
    await page.reload();
    await page.locator(".comment-form").waitFor();
  }

  await page.locator("#authorName").fill("burst");
  await page.locator("#body").fill(`連投テスト 4 ${Date.now()}`);
  await page.locator(".comment-form button[type=submit]").click();
  await expect(page.getByTestId("comment-result")).toContainText("しばらく時間");
});
