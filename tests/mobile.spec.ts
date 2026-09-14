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

    for (const path of ["/", "/about"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => {
        // A card inside a horizontally-scrolling rail is *meant* to sit
        // beyond the fold — that's the whole point of the carousel — so its
        // bounding rect legitimately extends past window.innerWidth. Same
        // idea for something like the blog hero photo's scale transform:
        // it's deliberately oversized and clipped by an `overflow: hidden`
        // ancestor rather than scrolled, so "hidden" counts as a clipper
        // here too, not just "auto"/"scroll". What must never happen is the
        // outer PAGE gaining a sideways scrollbar, which the scrollW/innerW
        // check below still catches independently.
        function insideHorizontalScroller(el: Element): boolean {
          for (let node = el.parentElement; node; node = node.parentElement) {
            const cs = getComputedStyle(node);
            const clips =
              cs.overflowX === "auto" || cs.overflowX === "scroll" || cs.overflowX === "hidden";
            if (clips && node.scrollWidth > node.clientWidth + 1) return true;
          }
          return false;
        }
        return {
          scrollW: document.documentElement.scrollWidth,
          innerW: window.innerWidth,
          offenders: [...document.querySelectorAll("body *")]
            .filter((el) => {
              const b = el.getBoundingClientRect();
              return (
                b.width > 0 &&
                b.right > window.innerWidth + 2 &&
                !insideHorizontalScroller(el)
              );
            })
            .map((el) => el.tagName + "." + String(el.className).slice(0, 30))
            .slice(0, 5),
        };
      });
      expect(overflow.offenders, `${path} @ ${width}`).toEqual([]);
      expect(overflow.scrollW).toBeLessThanOrEqual(overflow.innerW + 1);
    }
  });
}

test("the article page fits and stays readable at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await page.locator(".blog-card__link").first().click();
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

  for (const path of ["/admin", "/admin/posts", "/admin/comments", "/admin/tickets", "/admin/tickets?view=board"]) {
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

/** A tiny solid-color PNG, built in the browser like upload.spec.ts's fixtures. */
async function makeSwatch(page: import("@playwright/test").Page, color: string) {
  const bytes = await page.evaluate(async (fill) => {
    const c = document.createElement("canvas");
    c.width = 40;
    c.height = 40;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, 40, 40);
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, color);
  return Buffer.from(bytes);
}

test("the home hero illustration can be set separately for mobile and desktop", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/settings");

  const fields = page.locator(".image-field");
  const desktopField = fields.nth(0);
  const mobileField = fields.nth(1);

  await desktopField.locator('input[type="file"]').setInputFiles({
    name: "desktop-hero.png",
    mimeType: "image/png",
    buffer: await makeSwatch(page, "#c0392b"),
  });
  await mobileField.locator('input[type="file"]').setInputFiles({
    name: "mobile-hero.png",
    mimeType: "image/png",
    buffer: await makeSwatch(page, "#2980b9"),
  });

  // Each client-side upload round-trips through Blob storage before its
  // hidden input (the value the server action actually reads) gets a URL.
  const desktopValue = desktopField.locator('input[type="hidden"]');
  const mobileValue = mobileField.locator('input[type="hidden"]');
  await expect(desktopValue).not.toHaveValue("", { timeout: 15_000 });
  await expect(mobileValue).not.toHaveValue("", { timeout: 15_000 });
  expect(await desktopValue.inputValue()).not.toBe(await mobileValue.inputValue());

  try {
    const [saveRes] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.locator('.settings-form button[type="submit"]').click(),
    ]);
    expect(saveRes.ok()).toBeTruthy();

    // Desktop gets its own srcSet...
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const wideSrc = await page
      .locator(".blog-hero__img")
      .evaluate((img: HTMLImageElement) => img.currentSrc);

    // ...and a narrow viewport picks the <picture>'s mobile <source> instead,
    // not just the same image scaled down by CSS.
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    const narrowSrc = await page
      .locator(".blog-hero__img")
      .evaluate((img: HTMLImageElement) => img.currentSrc);

    expect(wideSrc).not.toBe(narrowSrc);
  } finally {
    // site_settings is a single site-wide row — always leave it as this
    // suite found it (empty, meaning "use the committed default image").
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/admin/settings");
    for (const field of [fields.nth(0), fields.nth(1)]) {
      const clear = field.getByRole("button", { name: "クリア" });
      if (await clear.isVisible().catch(() => false)) await clear.click();
    }
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.locator('.settings-form button[type="submit"]').click(),
    ]);
  }
});
