import { test, expect } from "@playwright/test";
import { login, READER } from "./helpers";

/**
 * The motivation rules, enforced as tests.
 *
 * These exist because the whole design rests on one finding: she stopped
 * blogging before by missing days and never returning, and a counter that
 * resets to zero is the documented mechanism that turns a missed day into a
 * quit. Nothing in this app may reintroduce it — not by accident, not later.
 */

const BANNED_UI = [
  "連続",       // "consecutive" — a streak
  "日連続",
  "🔥",
  "連勝",
  "ポイント",   // points
  "バッジ",     // badges
  "レベル",     // levels
  "ランキング", // leaderboards
];

test("no streak counter or reward furniture anywhere in the admin", async ({ page }) => {
  await login(page);

  for (const path of [
    "/admin",
    "/admin/posts",
    "/admin/comments",
    "/admin/settings",
    "/admin/tickets",
    "/admin/tags",
  ]) {
    await page.goto(path);
    const text = (await page.locator("body").innerText()).replace(/\s+/g, "");

    for (const banned of BANNED_UI) {
      expect(text, `"${banned}" must not appear on ${path}`).not.toContain(banned);
    }
  }
});

test("every figure on the dashboard is non-decreasing or an explicit past record", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin");

  const labels = await page.locator(".counter__label").allInnerTexts();
  expect(labels).toEqual(["これまで", "今月", "最高記録", "往復", "閲覧"]);

  // 最高記録 must be marked as a record that cannot be lost, so it is never
  // mistaken for a live streak.
  await expect(page.locator(".counter__note")).toContainText("減りません");
});

test("blank days on the calendar are pale, never marked as failure", async ({ page }) => {
  await login(page);
  await page.goto("/admin");

  const colours = await page.evaluate(() => {
    const cells = [...document.querySelectorAll(".year__cell")];
    const blanks = cells.filter((c) => c.className.trim() === "year__cell");
    return {
      blankCount: blanks.length,
      sample: blanks.slice(0, 5).map((c) => getComputedStyle(c).backgroundColor),
      anyText: cells.some((c) => (c.textContent ?? "").trim().length > 0),
    };
  });

  expect(colours.blankCount).toBeGreaterThan(0);
  expect(colours.anyText).toBe(false);

  // No blank cell may be a warning colour — red would turn absence into fault.
  for (const rgb of colours.sample) {
    const m = rgb.match(/\d+/g)!.map(Number);
    const [r, g, b] = m;
    expect(r - Math.max(g, b), `blank cell ${rgb} reads as red`).toBeLessThan(30);
  }
});

test("a trusted reader can reply but cannot edit or moderate", async ({ page }) => {
  await login(page, READER);
  await page.goto("/admin");

  // No writing affordance for a reader.
  await expect(page.locator(".write-cta")).toHaveCount(0);
  // No settings link.
  await expect(page.locator(".admin-bar__nav a", { hasText: "設定" })).toHaveCount(0);

  // Opening a post gives the reply surface, not the editor.
  await page.goto("/admin/posts");
  await page.locator(".admin-table a").first().click();
  await expect(page.getByTestId("reply-input")).toBeVisible();
  await expect(page.getByTestId("title-input")).toHaveCount(0);
});
