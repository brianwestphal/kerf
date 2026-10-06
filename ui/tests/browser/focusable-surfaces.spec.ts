import { expect, type Locator, test } from '@playwright/test';

async function expectOutlined(locator: Locator) {
  await expect(locator).toHaveAttribute('data-outlined', 'true');
  await expect(locator).toHaveCSS('outline-style', 'solid');
  const width = await locator.evaluate((element) =>
    parseFloat(window.getComputedStyle(element).outlineWidth),
  );
  expect(width).toBeGreaterThan(0);
}

test('application surfaces expose opt-in focus and persistent outline', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });

    await page.goto('/?component=pane');
    const pane = page.locator('[data-demo-focus-pane]');
    await expect(pane).toHaveAttribute('tabindex', '0');
    await expectOutlined(pane);
    if (testInfo.project.name === 'chromium')
      await pane.screenshot({ path: testInfo.outputPath(`pane-${width}.png`) });

    await page.goto('/?component=sunken-panel');
    const sunken = page.getByRole('region', { name: 'Selected work surface' });
    await expect(sunken).toHaveAttribute('tabindex', '0');
    await expectOutlined(sunken);
    if (testInfo.project.name === 'chromium')
      await sunken.screenshot({
        path: testInfo.outputPath(`sunken-panel-${width}.png`),
      });

    await page.goto('/?component=content-item');
    const item = page.locator('[data-demo-item="outlined"]');
    await expect(item).toHaveAttribute('tabindex', '0');
    await expectOutlined(item);
    await expect(item).not.toHaveAttribute('data-interactive');
  }
});

test('scene and Workbench focus states respect active and collapsed regions', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=tab-navigator');
  const search = page
    .locator('[data-demo="tab-navigator"] [data-tab-scaffold-scene="search"]')
    .first();
  await expect(search).toHaveAttribute('tabindex', '-1');
  await expect(search).not.toHaveAttribute('data-outlined');
  await page
    .locator('[data-demo="tab-navigator"] [data-tab-scaffold-tab="search"]')
    .first()
    .click();
  await expect(search).toHaveAttribute('tabindex', '0');
  await expectOutlined(search);
  if (testInfo.project.name === 'chromium')
    await search.screenshot({ path: testInfo.outputPath('tab-scene.png') });

  await page.goto('/?component=workbench');
  const workbench = page.locator('#catalog-workbench-full');
  const main = workbench.locator('.kui-workbench__main');
  await expect(main).toHaveAttribute('tabindex', '0');
  await expectOutlined(main);
  const rightRail = workbench.locator('.kui-workbench__rail--right');
  await expect(rightRail).toHaveAttribute('tabindex', '0');
  await expect(rightRail).not.toHaveAttribute('data-outlined');
  if (testInfo.project.name === 'chromium')
    await workbench.screenshot({ path: testInfo.outputPath('workbench.png') });
});

test('CollapsiblePanel root focus and outline follow collapse and overlay state', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/?component=collapsible-panel');
  const staticRail = page.locator(
    '[data-collapsible-panel="catalog-panel-left"]',
  );
  await expect(staticRail).toHaveAttribute('tabindex', '0');
  await expectOutlined(staticRail);
  await staticRail.focus();
  await expect(staticRail).toBeFocused();
  await staticRail.evaluate((element) =>
    element.setAttribute('data-presentation', 'overlay'),
  );
  await expect(staticRail).toHaveCSS('position', 'fixed');
  await expectOutlined(staticRail);
  await staticRail.evaluate((element) =>
    element.setAttribute('data-presentation', 'inline'),
  );
  if (testInfo.project.name === 'chromium')
    await staticRail.screenshot({
      path: testInfo.outputPath('collapsible-panel-outline.png'),
    });

  const example = page.locator('[data-catalog-panel-relocation-example]');
  const rail = example.locator(
    '[data-collapsible-panel="catalog-panel-relocation"]',
  );
  const open = example.getByRole('button', { name: 'Show navigator' });
  await expect(rail).toHaveAttribute('tabindex', '-1');
  await expect(rail).not.toHaveAttribute('data-outlined');
  await open.click();
  await expect(rail).toHaveAttribute('tabindex', '0');
  await expectOutlined(rail);
  await rail.getByRole('button', { name: 'Hide navigator' }).click();
  await expect(rail).toHaveAttribute('tabindex', '-1');
  await expect(rail).not.toHaveAttribute('data-outlined');

  await page.setViewportSize({ width: 390, height: 850 });
  await expect(staticRail).toHaveAttribute('tabindex', '0');
  await expectOutlined(staticRail);
  if (testInfo.project.name === 'chromium')
    await staticRail.screenshot({
      path: testInfo.outputPath('collapsible-panel-outline-narrow.png'),
    });
});
