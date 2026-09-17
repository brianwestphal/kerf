import { expect, type Page, test } from "@playwright/test";

const headerGeometry = async (page: Page) =>
  page.evaluate(() => {
    const rect = (selector: string) =>
      document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
    const logo = rect(".kui-catalog__mark");
    const title = rect(".kui-catalog__identity h1");
    const subtitle = rect(".kui-catalog__subtitle");
    const subtitleStyle = window.getComputedStyle(
      document.querySelector<HTMLElement>(".kui-catalog__subtitle")!,
    );
    const collapse = rect(
      '.kui-catalog__brand [aria-label="Collapse Kerf catalog"]',
    );
    const centerY = (value: DOMRect) => value.top + value.height / 2;
    return {
      collapseTitleCenterDelta: Math.abs(centerY(collapse) - centerY(title)),
      logoTitleCenterDelta: Math.abs(centerY(logo) - centerY(title)),
      subtitleBelowTitle: subtitle.top >= title.bottom - 1,
      subtitleTitleLeftDelta: Math.abs(
        subtitle.left +
          Number.parseFloat(subtitleStyle.paddingInlineStart) -
          title.left,
      ),
    };
  });

test("uses the Kerf identity and relocates sidebar restore into the detail toolbar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?component=recipe-app-shell");

  const shell = page.locator(".kui-catalog");
  const sidebar = page.locator(".kui-catalog__sidebar");
  const detail = page.locator(".kui-catalog__detail");
  const logo = sidebar.locator(".kui-catalog__mark");

  await expect(logo).toHaveAttribute("src", /assets\/logo(?:-[^/]+)?\.svg/);
  await expect(logo).toHaveAttribute("alt", "");
  await expect
    .poll(() =>
      logo.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(sidebar.getByText("K", { exact: true })).toHaveCount(0);
  const wideGeometry = await headerGeometry(page);
  expect(wideGeometry).toMatchObject({
    subtitleBelowTitle: true,
  });
  expect(wideGeometry.collapseTitleCenterDelta).toBeLessThanOrEqual(1);
  expect(wideGeometry.logoTitleCenterDelta).toBeLessThanOrEqual(1);
  expect(wideGeometry.subtitleTitleLeftDelta).toBeLessThanOrEqual(1);

  await sidebar
    .getByRole("button", { name: "Collapse Kerf catalog" })
    .click();
  await expect(shell).toHaveAttribute("data-sidebar-collapsed", "true");
  await expect(sidebar).toBeHidden();
  await expect(
    sidebar.getByRole("button", { name: "Collapse Kerf catalog" }),
  ).toHaveCount(0);

  const restore = detail.getByRole("button", {
    name: "Expand Kerf catalog",
  });
  await expect(restore).toBeVisible();
  await expect(restore).toBeFocused();
  expect(
    await restore.evaluate(
      (element) =>
        element ===
        document.querySelector(".kui-catalog__header .kui-toolbar__leading button"),
    ),
  ).toBe(true);
  // The collapsed sidebar slides fully off-screen (its right edge at/left of 0)
  // rather than zeroing its box, and the detail pane takes the full width.
  await expect
    .poll(async () => { const box = await sidebar.boundingBox(); return box ? box.x + box.width : 0; })
    .toBeLessThanOrEqual(1);
  await expect
    .poll(async () => (await detail.boundingBox())?.x ?? -1)
    .toBeLessThanOrEqual(1);

  await restore.click();
  await expect(sidebar).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await headerGeometry(page)).toMatchObject({
    subtitleBelowTitle: true,
  });
  await sidebar
    .getByRole("button", { name: "Collapse Kerf catalog" })
    .click();
  await expect(
    detail.getByRole("button", { name: "Expand Kerf catalog" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
});
