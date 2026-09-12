import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Exercises the RailsEditor UI (add / reorder / remove, reflected into its
 * hidden `railsJson` input) without ever submitting the form.
 *
 * `site_settings` is a single shared row on the shared CI/prod Neon DB —
 * saving here would permanently change what every other test (and the real
 * site) sees on the home page, so this only reads the hidden input's value
 * as it changes rather than persisting anything.
 */
test("adding, reordering, and removing rails updates the hidden field, unsaved", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/settings");

  const hidden = page.locator('input[name="railsJson"]');
  const rows = page.locator(".rails-editor__row");
  const before = JSON.parse(await hidden.inputValue());
  expect(Array.isArray(before)).toBe(true);
  const startCount = before.length;

  // ── Add a rail ─────────────────────────────────────────────
  await page.locator(".rails-editor").getByRole("button", { name: "棚を追加" }).click();
  await expect(rows).toHaveCount(startCount + 1);
  let after = JSON.parse(await hidden.inputValue());
  expect(after.length).toBe(startCount + 1);
  expect(after[startCount]).toEqual({ kind: "recent" });

  // ── Change its kind, and give it a custom label ─────────────
  const lastRow = rows.last();
  await lastRow.locator("select").first().selectOption("discussed");
  await lastRow.locator('input[type="text"]').fill("カスタム見出し");
  after = JSON.parse(await hidden.inputValue());
  expect(after[startCount]).toEqual({ kind: "discussed", label: "カスタム見出し" });

  // ── Move it to the top ───────────────────────────────────────
  for (let i = startCount; i > 0; i--) {
    await rows.nth(i).getByRole("button", { name: "上へ移動" }).click();
  }
  after = JSON.parse(await hidden.inputValue());
  expect(after[0]).toEqual({ kind: "discussed", label: "カスタム見出し" });

  // ── Remove it again, back to the original count ──────────────
  await rows.first().getByRole("button", { name: "この棚を削除" }).click();
  await expect(rows).toHaveCount(startCount);
  after = JSON.parse(await hidden.inputValue());
  expect(after).toEqual(before);

  // Never submitted — site_settings.rails_json is untouched.
});
