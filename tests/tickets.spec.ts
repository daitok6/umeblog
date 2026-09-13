import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * The editorial idea workflow: create -> list -> edit -> filter -> status
 * change -> board -> turn into a draft -> publish -> archived/published
 * ideas stay retrievable. Each test uses a unique marker in the title so
 * runs never collide with the seeded or real idea library.
 */

test.describe("editorial ideas", () => {
  test("create, appear in the list, edit, and filter", async ({ page }) => {
    await login(page);
    const marker = `アイデアテスト-${Date.now()}`;

    await page.goto("/admin/tickets/new");
    await page.locator("#tk-title").fill(marker);
    await page.locator("#tk-description").fill("プレイライトのテスト用アイデアです。");
    await page.locator("#tk-pillar").selectOption("eat_travel");
    await page.locator("#tk-type").selectOption("recommendation");
    await page.locator("button[type=submit]", { hasText: "アイデアを追加" }).click();

    await page.waitForURL(/\/admin\/tickets\/\d+$/);
    await expect(page.locator("h1")).toContainText(marker);

    // Appears in the list, findable by its unique title.
    await page.goto(`/admin/tickets?q=${encodeURIComponent(marker)}`);
    await expect(page.getByText(marker)).toBeVisible();

    // Filtering to a pillar it doesn't belong to hides it, with the
    // "no results" empty state, not an error.
    await page.goto(`/admin/tickets?q=${encodeURIComponent(marker)}&pillar=use`);
    await expect(page.getByText("条件に合うアイデアが見つかりませんでした。")).toBeVisible();

    // Editing changes the title everywhere it appears.
    await page.goto(`/admin/tickets?q=${encodeURIComponent(marker)}`);
    await page.getByText(marker).click();
    await page.waitForURL(/\/admin\/tickets\/\d+$/);
    const editedTitle = `${marker}-編集済み`;
    await page.locator("a", { hasText: "編集する" }).click();
    await page.waitForURL(/\/admin\/tickets\/\d+\/edit$/);
    await page.locator("#tk-title").fill(editedTitle);
    await page.locator("button[type=submit]", { hasText: "保存する" }).click();

    await page.waitForURL(/\/admin\/tickets\/\d+$/);
    await expect(page.locator("h1")).toContainText(editedTitle);
  });

  test("status moves, board view, and turning an idea into a draft", async ({ page }) => {
    await login(page);
    const marker = `ボードテスト-${Date.now()}`;

    await page.goto("/admin/tickets/new");
    await page.locator("#tk-title").fill(marker);
    // The tag field lives in a collapsed <details> section.
    await page.locator("summary", { hasText: "絵にするなら・タグ" }).click();
    await page.locator("#tk-tags").fill("プレイライト");
    await page.locator("button[type=submit]", { hasText: "アイデアを追加" }).click();
    await page.waitForURL(/\/admin\/tickets\/(\d+)$/);
    const ticketId = Number(page.url().match(/\/admin\/tickets\/(\d+)$/)?.[1]);
    expect(ticketId).toBeGreaterThan(0);

    // Default status is "アイデア".
    await expect(page.locator(".ticket-detail__head .status")).toHaveText("アイデア");

    // Move it forward without visiting every status in between.
    await page.locator("button", { hasText: "書きたい" }).click();
    await expect(page.locator(".ticket-detail__head .status")).toHaveText("書きたい");

    // It shows up in the right board column.
    await page.goto("/admin/tickets?view=board");
    const boardCard = page.getByTestId(`ticket-board-card-${ticketId}`);
    await expect(boardCard).toBeVisible();
    const column = page.locator(".ticket-board__col", { has: boardCard });
    await expect(column.locator(".ticket-board__col-title")).toHaveText("書きたい");

    // Turning it into a draft carries the title and tag, links the two
    // records, and moves the idea to "執筆中".
    await page.goto(`/admin/tickets/${ticketId}`);
    await page.locator("button", { hasText: "この案で書きはじめる" }).click();
    await page.waitForURL(/\/admin\/posts\/\d+$/);
    await expect(page.getByTestId("title-input")).toHaveValue(marker);

    await page.goto(`/admin/tickets/${ticketId}`);
    await expect(page.locator(".ticket-detail__head .status")).toHaveText("執筆中");
    const linkedPostPanel = page.locator(".side-panel", { hasText: "ひもづく記事" });
    await expect(linkedPostPanel).toContainText(marker);

    // Publishing the linked post flips the idea to "公開済み", and it stays
    // findable afterwards under "すべて" even though it drops off the
    // default active view.
    await linkedPostPanel.locator("a", { hasText: marker }).click();
    await page.waitForURL(/\/admin\/posts\/\d+$/);
    await page.locator(".btn", { hasText: "公開する" }).click();
    await page.waitForURL(/\/admin\/posts$/);

    await page.goto(`/admin/tickets/${ticketId}`);
    await expect(page.locator(".ticket-detail__head .status")).toHaveText("公開済み");

    await page.goto(`/admin/tickets?q=${encodeURIComponent(marker)}`);
    await expect(page.getByText("条件に合うアイデアが見つかりませんでした。")).toBeVisible();
    await page.goto(`/admin/tickets?q=${encodeURIComponent(marker)}&scope=all`);
    await expect(page.getByText(marker)).toBeVisible();
  });

  test("archiving keeps an idea retrievable under すべて", async ({ page }) => {
    await login(page);
    const marker = `保留テスト-${Date.now()}`;

    await page.goto("/admin/tickets/new");
    await page.locator("#tk-title").fill(marker);
    await page.locator("button[type=submit]", { hasText: "アイデアを追加" }).click();
    await page.waitForURL(/\/admin\/tickets\/\d+$/);

    await page.locator("button", { hasText: "保留にする" }).click();
    await expect(page.locator(".ticket-detail__head .status")).toHaveText("保留");

    await page.goto(`/admin/tickets?q=${encodeURIComponent(marker)}`);
    await expect(page.getByText("条件に合うアイデアが見つかりませんでした。")).toBeVisible();

    await page.goto(`/admin/tickets?q=${encodeURIComponent(marker)}&scope=all`);
    await expect(page.getByText(marker)).toBeVisible();
  });

  test("a title is required, in Japanese", async ({ page }) => {
    await login(page);
    await page.goto("/admin/tickets/new");
    // Bypass the browser's own `required` validation so the server check runs.
    await page.locator("#tk-title").evaluate((el) => el.removeAttribute("required"));
    await page.locator("button[type=submit]", { hasText: "アイデアを追加" }).click();
    await expect(page.getByTestId("ticket-form-error")).toContainText("タイトルを入力してください。");
  });

  test("empty state before anything is added", async ({ page }) => {
    await login(page);
    // A pillar/type combination nothing seeded will ever match.
    await page.goto("/admin/tickets?q=絶対に一致しないはずの検索語");
    await expect(page.getByText("条件に合うアイデアが見つかりませんでした。")).toBeVisible();
  });
});
