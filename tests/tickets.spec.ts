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

/**
 * One content idea, several platform-specific expressions of it. Each helper
 * reloads the ticket page before opening the "add" form so its `<details>`
 * always starts closed — a click always opens it, never toggles it shut.
 */
test.describe("platform deliverables", () => {
  async function addDeliverable(
    page: import("@playwright/test").Page,
    ticketUrl: string,
    opts: { platform: string; workingTitle: string; status?: string },
  ) {
    await page.goto(ticketUrl);
    const add = page.getByTestId("add-platform-deliverable");
    await add.locator(":scope > summary").click();
    await add.locator('select[name="platform"]').selectOption(opts.platform);
    await add.locator('input[name="workingTitle"]').fill(opts.workingTitle);
    if (opts.status) {
      await add.locator('select[name="status"]').selectOption(opts.status);
    }
    await add.locator('button[type="submit"]').click();
    await expect(rowFor(page, opts.workingTitle)).toBeVisible();
  }

  // Matches on the row's own title line (`.ticket-detail__desc`), not just
  // any text inside the row — another deliverable's "based on" dropdown can
  // list this same title as an <option>, which would otherwise match too.
  function rowFor(page: import("@playwright/test").Page, workingTitle: string) {
    return page
      .locator('[data-testid^="deliverable-row-"]')
      .filter({ has: page.locator(".ticket-detail__desc", { hasText: workingTitle }) });
  }

  test("one idea carries three platform deliverables with independent statuses that persist", async ({
    page,
  }) => {
    await login(page);
    const marker = `複数プラットフォーム-${Date.now()}`;

    await page.goto("/admin/tickets/new");
    await page.locator("#tk-title").fill(marker);
    await page.locator("button[type=submit]", { hasText: "アイデアを追加" }).click();
    await page.waitForURL(/\/admin\/tickets\/\d+$/);
    const ticketUrl = page.url();

    const igTitle = `${marker}-IG`;
    const noteTitle = `${marker}-note`;
    const blogTitle = `${marker}-blog`;

    await addDeliverable(page, ticketUrl, { platform: "instagram", workingTitle: igTitle, status: "idea" });
    await addDeliverable(page, ticketUrl, { platform: "note", workingTitle: noteTitle, status: "interested" });
    await addDeliverable(page, ticketUrl, { platform: "blog", workingTitle: blogTitle, status: "selected" });

    await page.reload();
    await expect(rowFor(page, igTitle)).toContainText("アイデア");
    await expect(rowFor(page, noteTitle)).toContainText("気になる");
    await expect(rowFor(page, blogTitle)).toContainText("つくりたい");

    // The parent shows an aggregate too, computed from the three of them.
    await expect(page.locator(".ticket-aggregate").first()).toContainText("つくりたい");
  });

  test("one platform can move to published with a URL while another idea stays untouched", async ({
    page,
  }) => {
    await login(page);
    const marker = `一部公開-${Date.now()}`;

    await page.goto("/admin/tickets/new");
    await page.locator("#tk-title").fill(marker);
    await page.locator("button[type=submit]", { hasText: "アイデアを追加" }).click();
    await page.waitForURL(/\/admin\/tickets\/\d+$/);
    const ticketUrl = page.url();

    const igTitle = `${marker}-IG`;
    const blogTitle = `${marker}-blog`;
    await addDeliverable(page, ticketUrl, { platform: "instagram", workingTitle: igTitle, status: "idea" });
    await addDeliverable(page, ticketUrl, { platform: "blog", workingTitle: blogTitle, status: "idea" });

    await page.goto(ticketUrl);
    const igRow = rowFor(page, igTitle);
    await igRow.locator(":scope > summary").click();
    await igRow.locator("button", { hasText: "制作中にする" }).click();
    await expect(igRow).toContainText("制作中");

    // Record a published URL through the row's own edit form, alongside
    // flipping its status — a manual field, unlike blog's derived one.
    await igRow.locator('summary:has-text("こまかい設定")').click();
    await igRow.locator('input[name="publishedUrl"]').fill("https://instagram.com/p/example");
    await igRow.locator('select[name="status"]').selectOption("published");
    await igRow.locator('button[type="submit"]', { hasText: "保存する" }).click();
    await expect(igRow).toContainText("公開済み");
    await expect(igRow.locator('a[href="https://instagram.com/p/example"]')).toBeVisible();

    // Blog was never touched, so it's still just an idea.
    const blogRow = rowFor(page, blogTitle);
    await expect(blogRow).toContainText("アイデア");

    // The parent shows partial progress, not "done".
    await expect(page.locator(".ticket-aggregate").first()).toContainText("一部公開");
  });

  test("a blog deliverable creates a linked post and opens it from the idea", async ({ page }) => {
    await login(page);
    const marker = `ブログ版-${Date.now()}`;

    await page.goto("/admin/tickets/new");
    await page.locator("#tk-title").fill(marker);
    await page.locator("button[type=submit]", { hasText: "アイデアを追加" }).click();
    await page.waitForURL(/\/admin\/tickets\/\d+$/);
    const ticketUrl = page.url();

    const blogTitle = `${marker}-blog`;
    await addDeliverable(page, ticketUrl, { platform: "blog", workingTitle: blogTitle });

    await page.goto(ticketUrl);
    const blogRow = rowFor(page, blogTitle);
    await blogRow.locator(":scope > summary").click();
    await blogRow.locator("button", { hasText: "この案でブログを書きはじめる" }).click();

    await page.waitForURL(/\/admin\/posts\/\d+$/);
    await expect(page.getByTestId("title-input")).toHaveValue(blogTitle);

    await page.goto(ticketUrl);
    const linkedRow = rowFor(page, blogTitle);
    await linkedRow.locator(":scope > summary").click();
    await expect(linkedRow).toContainText("ひもづく記事");
    await expect(linkedRow).toContainText("制作中");
  });

  test("a single-platform idea publishes without needing note or blog versions", async ({ page }) => {
    await login(page);
    const marker = `単一プラットフォーム-${Date.now()}`;

    await page.goto("/admin/tickets/new");
    await page.locator("#tk-title").fill(marker);
    await page.locator("button[type=submit]", { hasText: "アイデアを追加" }).click();
    await page.waitForURL(/\/admin\/tickets\/\d+$/);
    const ticketUrl = page.url();

    const igTitle = `${marker}-IG`;
    await addDeliverable(page, ticketUrl, { platform: "instagram", workingTitle: igTitle });

    await page.goto(ticketUrl);
    const igRow = rowFor(page, igTitle);
    await igRow.locator(":scope > summary").click();
    await igRow.locator("button", { hasText: "公開した" }).click();
    await expect(igRow).toContainText("公開済み");

    // Nothing on the page demands a note or blog version.
    await expect(page.locator(".ticket-aggregate").first()).toContainText("ひととおり完了");
  });

  test("filtering by platform, deliverable status, and cross-platform potential", async ({ page }) => {
    await login(page);
    const marker = `絞り込み-${Date.now()}`;

    await page.goto("/admin/tickets/new");
    await page.locator("#tk-title").fill(marker);
    await page.locator("summary", { hasText: "手ごたえと時期" }).click();
    await page.locator("#tk-cross").selectOption("high");
    await page.locator("button[type=submit]", { hasText: "アイデアを追加" }).click();
    await page.waitForURL(/\/admin\/tickets\/\d+$/);
    const ticketUrl = page.url();

    const blogTitle = `${marker}-blog`;
    await addDeliverable(page, ticketUrl, { platform: "blog", workingTitle: blogTitle, status: "in_progress" });

    await page.goto(`/admin/tickets?plan=with&platform=blog&scope=all`);
    await expect(page.getByText(marker, { exact: false }).first()).toBeVisible();

    await page.goto(`/admin/tickets?platform=blog&dstatus=in_progress&scope=all`);
    await expect(page.getByText(marker, { exact: false }).first()).toBeVisible();

    await page.goto(`/admin/tickets?cross=high&scope=all`);
    await expect(page.getByText(marker, { exact: false }).first()).toBeVisible();

    await page.goto(`/admin/tickets?platform=note&scope=all&q=${encodeURIComponent(marker)}`);
    await expect(page.getByText("条件に合うアイデアが見つかりませんでした。")).toBeVisible();
  });

  test("an idea with no deliverables still shows its stored status unchanged", async ({ page }) => {
    await login(page);
    const marker = `プランなし-${Date.now()}`;

    await page.goto("/admin/tickets/new");
    await page.locator("#tk-title").fill(marker);
    await page.locator("button[type=submit]", { hasText: "アイデアを追加" }).click();
    await page.waitForURL(/\/admin\/tickets\/\d+$/);

    await expect(page.locator(".ticket-detail__head .status")).toHaveText("アイデア");
    await expect(page.locator(".ticket-aggregate")).toHaveCount(0);
    await expect(page.getByText("まだプラットフォームは決めていません")).toBeVisible();
  });
});
