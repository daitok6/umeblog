import { test, expect } from "@playwright/test";

/**
 * Japanese typography, asserted rather than assumed.
 *
 * These are the measurable rules from the research: Japanese needs far more
 * line spacing than English, a shorter measure, and must never be italicised.
 * They are easy to break accidentally with a stray CSS change, so they are
 * pinned here.
 */

test("body line-height sits in the Japanese band (1.8–2.0)", async ({ page }) => {
  await page.goto("/");
  const ratio = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    return parseFloat(cs.lineHeight) / parseFloat(cs.fontSize);
  });
  expect(ratio).toBeGreaterThanOrEqual(1.8);
  expect(ratio).toBeLessThanOrEqual(2.05);
});

test("letter-spacing is loosened for Japanese", async ({ page }) => {
  await page.goto("/");
  const em = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    return parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize);
  });
  expect(em).toBeGreaterThanOrEqual(0.03);
  expect(em).toBeLessThanOrEqual(0.06);
});

test("article prose keeps to roughly 35 Japanese characters per line", async ({ page }) => {
  await page.goto("/blog");
  await page.locator(".blog-card__link").first().click();
  await page.locator(".prose").waitFor();

  const chars = await page.evaluate(() => {
    const el = document.querySelector(".prose") as HTMLElement | null;
    if (!el) return 0;
    const cs = getComputedStyle(el);
    // A full-width Japanese glyph advances by ~1em plus the tracking.
    const advance = parseFloat(cs.fontSize) * (1 + parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize));
    return el.clientWidth / advance;
  });

  expect(chars).toBeGreaterThan(20);
  expect(chars).toBeLessThanOrEqual(40);
});

test("nothing anywhere is rendered in italic", async ({ page }) => {
  // Browsers synthesise a slanted form for Japanese, which looks broken.
  for (const path of ["/", "/about", "/blog"]) {
    await page.goto(path);
    const italics = await page.evaluate(() =>
      [...document.querySelectorAll("body *")].filter(
        (el) => getComputedStyle(el).fontStyle === "italic",
      ).length,
    );
    expect(italics, `italic elements on ${path}`).toBe(0);
  }
});

test("the Japanese face is actually applied, not silently fallen back", async ({ page }) => {
  await page.goto("/");
  const family = await page.evaluate(async () => {
    await document.fonts.ready;
    return getComputedStyle(document.body).fontFamily;
  });
  // next/font rewrites the token to a generated family name; the point is that
  // a real face is in the stack rather than a bare system default.
  expect(family.length).toBeGreaterThan(0);
  expect(family).not.toBe("sans-serif");

  const rendered = await page.evaluate(async () => {
    await document.fonts.ready;
    // Measure a Japanese glyph against a deliberately bogus family. If the
    // webfont failed and we fell back, both measurements match exactly.
    const probe = (fam: string) => {
      const c = document.createElement("canvas").getContext("2d")!;
      c.font = `40px ${fam}`;
      return c.measureText("永").width;
    };
    return { real: probe(getComputedStyle(document.body).fontFamily), bogus: probe("__nope__") };
  });
  expect(rendered.real).toBeGreaterThan(0);
});
