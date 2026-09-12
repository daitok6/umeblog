import { test, expect } from "@playwright/test";
import { isComposingEvent, shouldHandleKey, guardKeyHandler } from "../src/lib/ime";
import { login, newPost } from "./helpers";

/**
 * The IME suite. This gates the build.
 *
 * Typing Japanese means composing, and the Enter key confirms a conversion
 * before it ever means "new line". Any handler that reacts to that Enter
 * fires mid-変換 and destroys the pending text. It is the single most likely
 * way this app becomes unusable for the person it is being built for, so it
 * is tested rather than merely commented.
 */

test.describe("IME guard (pure)", () => {
  test("ignores a key event raised during composition", () => {
    expect(isComposingEvent({ isComposing: true })).toBe(true);
    expect(shouldHandleKey({ isComposing: true })).toBe(false);
  });

  test("ignores the legacy keyCode 229 composition signal", () => {
    // Some browsers still report 229 instead of setting isComposing.
    expect(isComposingEvent({ keyCode: 229 })).toBe(true);
    expect(isComposingEvent({ which: 229 })).toBe(true);
  });

  test("allows an ordinary key event through", () => {
    expect(isComposingEvent({ isComposing: false, keyCode: 13 })).toBe(false);
    expect(shouldHandleKey({ isComposing: false, keyCode: 13 })).toBe(true);
  });

  test("guardKeyHandler does not invoke its handler while composing", () => {
    let calls = 0;
    const handler = guardKeyHandler(() => {
      calls += 1;
    });
    handler({ isComposing: true, keyCode: 13 });
    expect(calls).toBe(0);
    handler({ isComposing: false, keyCode: 13 });
    expect(calls).toBe(1);
  });
});

test.describe("IME in the editor", () => {
  test("Enter that confirms a conversion does not split the block or lose text", async ({
    page,
  }) => {
    await login(page);
    await newPost(page);

    const editable = page.locator(".bn-editor[contenteditable='true']").first();
    await editable.click();

    const result = await page.evaluate(async () => {
      const el = document.querySelector(
        ".bn-editor[contenteditable='true']",
      ) as HTMLElement | null;
      if (!el) return { blockCount: -1 };

      el.focus();
      // `data` is constructor-only on CompositionEvent, so it is passed in init.
      el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
      el.dispatchEvent(
        new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertCompositionText",
          data: "きょうは",
          isComposing: true,
        } as InputEventInit),
      );

      // THE moment that matters: Enter arrives to confirm the conversion.
      el.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 229,
          bubbles: true,
          cancelable: true,
        }),
      );

      el.dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true, data: "今日は" }),
      );

      await new Promise((r) => setTimeout(r, 250));
      return { blockCount: document.querySelectorAll(".bn-block-outer").length };
    });

    // One paragraph in, one paragraph out — the confirming Enter must not
    // have been treated as "new block".
    expect(result.blockCount).toBe(1);
  });

  test("markdown shortcut does not fire on the Enter that confirms 変換", async ({ page }) => {
    await login(page);
    await newPost(page);

    const editable = page.locator(".bn-editor[contenteditable='true']").first();
    await editable.click();

    // Type a literal '#' with no trailing space, then compose and confirm.
    // '#' alone must stay text; only '# ' converts to a heading.
    await page.keyboard.type("#");

    const kind = await page.evaluate(async () => {
      const el = document.querySelector(
        ".bn-editor[contenteditable='true']",
      ) as HTMLElement | null;
      if (!el) return "no-editor";

      el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      el.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          keyCode: 229,
          bubbles: true,
          cancelable: true,
        }),
      );
      el.dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true, data: "見出し" }),
      );
      await new Promise((r) => setTimeout(r, 200));

      const block = document.querySelector(".bn-block-outer [data-content-type]");
      return block?.getAttribute("data-content-type") ?? "unknown";
    });

    // Must still be a paragraph. If this ever reports "heading", the input
    // rule fired on a composing Enter — the exact upstream defect class.
    expect(kind).toBe("paragraph");
  });

  test("autosave does not run while a composition is open", async ({ page }) => {
    await login(page);
    await newPost(page);

    const title = page.getByTestId("title-input");
    await title.click();

    // Open a composition on the field, THEN type. Typing through the keyboard
    // is what makes React's onChange fire, which is what schedules the save —
    // setting .value directly would bypass the very path under test.
    await page.evaluate(() => {
      const el = document.querySelector("[data-testid='title-input']") as HTMLElement | null;
      el?.focus();
      el?.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
    });
    await page.keyboard.type("kyouha");

    // Wait well past the autosave interval while still composing.
    await page.waitForTimeout(3500);

    // Nothing may have been persisted yet: serialising mid-変換 can commit a
    // half-converted string, and the re-render would cancel the composition.
    await expect(page.getByTestId("save-state")).not.toContainText("保存しました");

    // Ending the composition releases the pending save.
    await page.evaluate(() => {
      const el = document.querySelector("[data-testid='title-input']") as HTMLElement | null;
      el?.dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true, data: "今日は" }),
      );
    });

    await expect(page.getByTestId("save-state")).toContainText("保存しました", {
      timeout: 15_000,
    });
  });
});
