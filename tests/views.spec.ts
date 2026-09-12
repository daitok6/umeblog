import { test, expect } from "@playwright/test";
import { login, newPost } from "./helpers";

/**
 * ViewBeacon fires once per post per browser session (sessionStorage-gated),
 * from the client rather than the revalidate=300 server page, so a cache
 * regeneration never counts as a view. See recordView() in
 * src/lib/repo/posts.ts and ViewBeacon.tsx for why.
 */
test("visiting a post sends exactly one view beacon per session", async ({ page }) => {
  const marker = `閲覧数テスト-${Date.now()}`;

  await login(page);
  await newPost(page);
  await page.getByTestId("title-input").fill(marker);
  await page.getByTestId("lead-input").fill("閲覧数のテストです。");
  await page.locator(".bn-editor[contenteditable='true']").first().click();
  await page.keyboard.type("本文です。");
  await page.locator("button", { hasText: "いま保存" }).click();
  await expect(page.getByTestId("save-state")).toContainText("保存しました", { timeout: 15_000 });
  await page.locator("button", { hasText: "公開する" }).click();
  await page.waitForURL("**/admin/posts");

  await page.goto("/blog");
  await page.locator("#blog-search").fill(marker);
  const firstRequest = page.waitForRequest("**/api/view");
  await page.locator(".post-row__link", { hasText: marker }).click();
  await page.waitForURL(/\/p\//);
  await firstRequest;

  // A second load in the same browser context/session must not send another.
  let secondRequestSeen = false;
  page.on("request", (req) => {
    if (req.url().includes("/api/view")) secondRequestSeen = true;
  });
  await page.reload();
  await page.waitForTimeout(500);
  expect(secondRequestSeen).toBe(false);
});
