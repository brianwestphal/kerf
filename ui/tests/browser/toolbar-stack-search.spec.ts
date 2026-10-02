import { expect, test } from '@playwright/test';

test('stacked search ends its collapsed row and enters a full row on expand', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=toolbar-control-group');
  const section = page.locator('[data-demo-section="toolbar-group-sizing"]');
  const toolbar = section.locator('.kui-toolbar').nth(1);
  const trailing = toolbar.locator('.kui-toolbar__trailing');
  const search = trailing.locator(
    '.kui-toolbar-control-group[data-content="search"]',
  );
  const sort = trailing.getByRole('group', { name: 'Sort' });
  const widthStyle = await page.addStyleTag({
    content:
      '[data-demo-section="toolbar-group-sizing"] { width: 700px !important; box-sizing: border-box !important; }',
  });

  for (const width of [700, 390]) {
    await widthStyle.evaluate((node, value) => {
      node.textContent = `[data-demo-section="toolbar-group-sizing"] { width: ${value}px !important; box-sizing: border-box !important; }`;
    }, width);
    await expect(search).toHaveAttribute('data-expanded', 'false');
    const zoneBox = (await trailing.boundingBox())!;
    const sortBox = (await sort.boundingBox())!;
    const closedBox = (await search.boundingBox())!;
    expect(closedBox.y).toBeCloseTo(sortBox.y, 0);
    expect(closedBox.x).toBeGreaterThan(sortBox.x + sortBox.width);
    expect(closedBox.x + closedBox.width).toBeCloseTo(
      zoneBox.x + zoneBox.width,
      0,
    );
    await toolbar.screenshot({
      path: `test-results/toolbar-stack-search-closed-${testInfo.project.name}-${width}.png`,
    });

    await search.getByRole('button', { name: 'Open search' }).click();
    await expect(search).toHaveAttribute('data-expanded', 'true');
    await expect(search).toHaveAttribute('data-sizing', 'fill');
    expect(
      await search.evaluate(
        (node) => window.getComputedStyle(node).animationName,
      ),
    ).toBe('kui-toolbar-fill-search-enter');
    await search.evaluate(async (node) => {
      await Promise.all(
        node.getAnimations().map((animation) => animation.finished),
      );
    });
    const openBox = (await search.boundingBox())!;
    const sortAfterOpen = (await sort.boundingBox())!;
    expect(openBox.y).toBeGreaterThan(sortAfterOpen.y + sortAfterOpen.height);
    await toolbar.screenshot({
      path: `test-results/toolbar-stack-search-open-${testInfo.project.name}-${width}.png`,
    });
    expect(openBox.width).toBeCloseTo((await trailing.boundingBox())!.width, 0);

    await page.keyboard.press('Escape');
    await expect(search).toHaveAttribute('data-expanded', 'false');
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await search.getByRole('button', { name: 'Open search' }).click();
  await expect(search).toHaveAttribute('data-expanded', 'true');
  expect(
    await search.evaluate(
      (node) => window.getComputedStyle(node).animationName,
    ),
  ).toBe('none');
});
