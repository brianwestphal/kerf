import { expect, type Page, test } from '@playwright/test';

const headerGeometry = async (page: Page) =>
  page.evaluate(() => {
    const rect = (selector: string) =>
      document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
    const logo = rect('.kui-catalog__mark');
    const title = rect(
      '#kui-catalog-left-rail .kui-pane__header [data-component="toolbar-text"][aria-level="1"]',
    );
    const subtitle = rect(
      '#kui-catalog-left-rail nav > [data-component="list"] > [data-component="list-inset-text"]',
    );
    const contentStart = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector)!;
      const bounds = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        bounds.left +
        Number.parseFloat(style.borderLeftWidth) +
        Number.parseFloat(style.paddingLeft)
      );
    };
    const collapse = rect(
      '#kui-catalog-left-rail .kui-pane__header [aria-label="Hide Kerf catalog"]',
    );
    const centerY = (value: DOMRect) => value.top + value.height / 2;
    return {
      collapseTitleCenterDelta: Math.abs(centerY(collapse) - centerY(title)),
      logoTitleCenterDelta: Math.abs(centerY(logo) - centerY(title)),
      subtitleBelowTitle: subtitle.top >= title.bottom - 1,
      subtitlePrecedesTitle:
        contentStart(
          '#kui-catalog-left-rail nav > [data-component="list"] > [data-component="list-inset-text"]',
        ) <
        contentStart(
          '#kui-catalog-left-rail .kui-pane__header [data-component="toolbar-text"][aria-level="1"]',
        ),
    };
  });

test('uses the Kerf identity and relocates sidebar restore into the detail toolbar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=recipe-app-shell');

  const shell = page.locator('.kui-catalog');
  const sidebar = page.locator('#kui-catalog-left-rail');
  const detail = page.locator(
    '#kui-catalog > .kui-workbench__center > [data-workbench-main]',
  );
  const logo = sidebar.locator('.kui-catalog__mark');

  await expect(logo).toHaveAttribute('src', /assets\/logo(?:-[^/]+)?\.svg/);
  await expect(logo).toHaveAttribute('alt', '');
  await expect
    .poll(() =>
      logo.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(sidebar.getByText('K', { exact: true })).toHaveCount(0);
  const wideGeometry = await headerGeometry(page);
  expect(wideGeometry).toMatchObject({
    subtitleBelowTitle: true,
    subtitlePrecedesTitle: true,
  });
  expect(wideGeometry.collapseTitleCenterDelta).toBeLessThanOrEqual(1);
  expect(wideGeometry.logoTitleCenterDelta).toBeLessThanOrEqual(1);

  await sidebar.getByRole('button', { name: 'Hide Kerf catalog' }).click();
  await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'true');
  await expect(sidebar).toBeHidden();
  await expect(
    sidebar.getByRole('button', { name: 'Hide Kerf catalog' }),
  ).toHaveCount(0);

  const restore = detail.getByRole('button', {
    name: 'Show Kerf catalog',
  });
  await expect(restore).toBeVisible();
  await expect(restore).toBeFocused();
  expect(
    await restore.evaluate(
      (element) =>
        element ===
        document.querySelector(
          '#kui-catalog > .kui-workbench__center > [data-workbench-main] > [data-component="pane"] > .kui-pane__header .kui-toolbar__leading button',
        ),
    ),
  ).toBe(true);
  // The collapsed sidebar slides fully off-screen (its right edge at/left of 0)
  // rather than zeroing its box, and the detail pane takes the full width.
  await expect
    .poll(async () => {
      const box = await sidebar.boundingBox();
      return box ? box.x + box.width : 0;
    })
    .toBeLessThanOrEqual(1);
  await expect
    .poll(async () => (await detail.boundingBox())?.x ?? -1)
    .toBeLessThanOrEqual(1);

  await restore.click();
  await expect(sidebar).toBeVisible();
  // Narrow, the sidebar is a transient Workbench overlay: it closes as the
  // breakpoint applies and opens over the stage from the entry toolbar.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'true');
  await detail.getByRole('button', { name: 'Show Kerf catalog' }).click();
  await expect(sidebar).toHaveCSS('position', 'absolute');
  expect(await headerGeometry(page)).toMatchObject({
    subtitleBelowTitle: true,
  });
  await sidebar.getByRole('button', { name: 'Hide Kerf catalog' }).click();
  await expect(
    detail.getByRole('button', { name: 'Show Kerf catalog' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
});

test('at phone width the catalog sidebar overlays the stage, one tap from the entry toolbar, and closes on a choice', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=badge');
  const shell = page.locator('.kui-catalog');
  const sidebar = page.locator('#kui-catalog-left-rail');
  const toolbar = page.locator(
    '#kui-catalog > .kui-workbench__center > [data-workbench-main] > [data-component="pane"] > .kui-pane__header',
  );
  // It arrives closed; the entry title and the sidebar toggle stay visible.
  await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'true');
  await expect(
    toolbar.getByRole('heading', { level: 2, name: 'Badge' }),
  ).toBeVisible();
  await toolbar.getByRole('button', { name: 'Show Kerf catalog' }).click();
  await expect(sidebar).toHaveCSS('position', 'absolute');
  // It covers the stage, leaving a 44px strip that dismisses it.
  const [box, viewport] = [
    (await sidebar.boundingBox())!,
    page.viewportSize()!,
  ];
  expect(Math.round(viewport.width - (box.x + box.width))).toBe(44);

  await sidebar.getByRole('button', { name: 'Pane', exact: true }).click();
  await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'true');
  await expect(
    toolbar.getByRole('heading', { level: 2, name: 'Pane' }),
  ).toBeVisible();
  // No horizontal page overflow.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
});

test('filters shared catalog entries and headings, including collapsed ecosystem items', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto('/?component=badge');
  const sidebar = page.locator('#kui-catalog-left-rail');
  const filter = sidebar.getByRole('searchbox', { name: 'Filter catalog' });
  await filter.fill('tOoLbAr');
  await expect(sidebar.locator('[data-item-id="toolbar"]')).toBeVisible();
  await expect(sidebar.locator('[data-item-id="badge"]')).toBeHidden();
  await filter.fill('Controls');
  await expect(
    sidebar.locator('[data-catalog-section="Controls"]'),
  ).toBeVisible();
  await expect(
    sidebar.locator('[data-catalog-section="Foundation"]'),
  ).toBeHidden();
  await filter.fill('Input');
  await expect(sidebar.locator('[data-item-id="wa-input"]')).toBeVisible();
  await expect(
    sidebar.getByRole('button', { name: 'Web Awesome' }),
  ).toHaveAttribute('aria-expanded', 'true');
  await filter.fill('no matching component');
  await expect(sidebar.getByText('No matching items')).toBeVisible();
  await filter.fill('Toolbar');
  await sidebar.locator('[data-item-id="toolbar"]').click();
  await expect(page).toHaveURL(/component=toolbar/);
  await expect(filter).toHaveValue('Toolbar');
  await expect(sidebar.locator('[data-item-id="toolbar"]')).toBeVisible();
  if (browserName === 'chromium')
    await sidebar.screenshot({ path: 'test-results/catalog-filter-wide.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Show Kerf catalog' }).click();
  await expect(filter).toHaveValue('Toolbar');
  await filter.fill('');
  await expect(sidebar.locator('[data-item-id="badge"]')).toBeVisible();
  await expect(sidebar.locator('[data-catalog-secondary]')).toBeHidden();
  await expect(sidebar.getByText('No matching items')).toBeHidden();
  if (browserName === 'chromium')
    await sidebar.screenshot({
      path: 'test-results/catalog-filter-narrow.png',
    });
});
