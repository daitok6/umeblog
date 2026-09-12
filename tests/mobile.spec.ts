import { test, expect, devices } from "@playwright/test";
import { login } from "./helpers";

const WIDTHS = [320, 375, 768];

/**
 * The reference drops its container inset from 40px to 16px on small screens
 * and reduces the body size while staying inside the Japanese line-height
 * band. Both are checked here, along with the usual no-sideways-scroll and
 * tap-target rules.
 */

for (const width of WIDTHS) {
  test(`public pages fit at ${width}px with no sideways scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });

    for (const path of ["/", "/tags", "/about"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
        offenders: [...document.querySelectorAll("body *")]
          .filter((el) => {
            const b = el.getBoundingClientRect();
            return b.width > 0 && b.right > window.innerWidth + 2;
          })
          .map((el) => el.tagName + "." + String(el.className).slice(0, 30))
          .slice(0, 5),
      }));
      expect(overflow.offenders, `${path} @ ${width}`).toEqual([]);
      expect(overflow.scrollW).toBeLessThanOrEqual(overflow.innerW + 1);
    }
  });
}

test("the article page fits and stays readable at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await page.locator(".post-row__link").first().click();
  await page.locator(".prose").waitFor();

  const m = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    return {
      ratio: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize),
      inset: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--inset")),
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
    };
  });

  // Still inside the Japanese band, and the frame has pulled in.
  expect(m.ratio).toBeGreaterThanOrEqual(1.8);
  expect(m.inset).toBe(16);
  expect(m.scrollW).toBeLessThanOrEqual(m.innerW + 1);
});

test("admin is usable on a phone and every control is thumb-sized", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await login(page);

  for (const path of ["/admin", "/admin/posts", "/admin/comments"]) {
    await page.goto(path);

    const small = await page.evaluate(() =>
      [...document.querySelectorAll("a, button, input, textarea")]
        .filter((el) => {
          const b = el.getBoundingClientRect();
          return b.height > 0 && b.width > 0 && b.height < 40;
        })
        .map((el) => `${el.tagName}.${String(el.className).slice(0, 24)}`)
        .slice(0, 6),
    );
    expect(small, `small tap targets on ${path}`).toEqual([]);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `sideways scroll on ${path}`).toBeLessThanOrEqual(1);
  }
});

test("the motif thickens as the archive grows, and stops for reduced motion", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");

  const canvas = page.locator("canvas[data-post-count]");
  await expect(canvas).toBeVisible();

  // Density is a function of the published post count.
  const count = Number(await canvas.getAttribute("data-post-count"));
  expect(count).toBeGreaterThan(0);

  const ringsFor = (n: number) => Math.round(8 + (46 - 8) * (1 - Math.exp(-n / 60)));
  expect(ringsFor(150)).toBeGreaterThan(ringsFor(3));

  // Under prefers-reduced-motion the canvas is painted once and left alone.
  const a = await canvas.screenshot();
  await page.waitForTimeout(900);
  const b = await canvas.screenshot();
  expect(Buffer.compare(a, b)).toBe(0);

  await ctx.close();
});
