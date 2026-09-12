import type { Page } from "@playwright/test";

// Dedicated to the test suite — never the same account as seeded demo
// content, so rotating or deleting real credentials can never break a test
// run (see scripts/seed-test-users.ts).
export const AUTHOR = { email: "playwright-author@umeblog.test", password: "ume-test-1234" };
export const READER = { email: "playwright-reader@umeblog.test", password: "daito-test-1234" };

export async function login(page: Page, who = AUTHOR) {
  await page.goto("/login");
  await page.locator("#email").fill(who.email);
  await page.locator("#password").fill(who.password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL("**/admin");
}

export async function logout(page: Page) {
  await page.locator(".admin-bar__logout").click();
  await page.waitForURL("**/login");
}

/** Creates a fresh draft and waits for the editor to mount. */
export async function newPost(page: Page) {
  await page.goto("/admin/posts/new");
  await page.waitForURL(/\/admin\/posts\/\d+/);
  await page.locator(".bn-editor[contenteditable='true']").first().waitFor({ timeout: 20_000 });
}
