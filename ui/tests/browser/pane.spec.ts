import { expect, test } from '@playwright/test';

test('Pane owns vertical slots, scrolling, and independent separators', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto('/?component=pane');

  const pane = page.locator('[data-demo="pane"] [data-component="pane"]');
  await expect(pane).toBeVisible();
  await expect(pane).toHaveAttribute('data-separator-block-start', 'true');
  await expect(pane).toHaveAttribute('data-separator-block-end', 'true');
  await expect(pane).toHaveAttribute('data-separator-inline-start', 'true');
  await expect(pane).toHaveAttribute('data-separator-inline-end', 'true');
  const secondary = pane.locator(
    '.kui-pane__header [data-component="list-inset-text"]',
  );
  await expect(secondary).toHaveText('Optional secondary header row');

  const geometry = await pane.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const header = element.querySelector<HTMLElement>('.kui-pane__header')!;
    const content = element.querySelector<HTMLElement>('.kui-pane__content')!;
    const footer = element.querySelector<HTMLElement>('.kui-pane__footer')!;
    const secondary = element
      .querySelector<HTMLElement>('[data-component="list-inset-text"]')!
      .getBoundingClientRect();
    const firstContent = content
      .querySelector<HTMLElement>('.kui-content-item')!
      .getBoundingClientRect();
    return {
      display: style.display,
      borders: [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth,
      ],
      headerDirection: window.getComputedStyle(header).flexDirection,
      contentDirection: window.getComputedStyle(content).flexDirection,
      contentOverflow: window.getComputedStyle(content).overflowY,
      alignedTextEdges: Math.abs(secondary.left - firstContent.left) <= 1,
      order: [header.offsetTop, content.offsetTop, footer.offsetTop],
    };
  });
  expect(geometry).toMatchObject({
    display: 'grid',
    borders: ['1px', '1px', '1px', '1px'],
    headerDirection: 'column',
    contentDirection: 'column',
    contentOverflow: 'auto',
    alignedTextEdges: true,
  });
  expect(geometry.order[0]).toBeLessThan(geometry.order[1]);
  expect(geometry.order[1]).toBeLessThan(geometry.order[2]);

  await expect(
    page.locator('.kui-catalog__sidebar > [data-component="pane"]'),
  ).toHaveAttribute('data-component', 'pane');
  await expect(
    page.locator('.kui-catalog__detail > [data-component="pane"]'),
  ).toHaveAttribute('data-component', 'pane');

  if (browserName === 'chromium')
    await pane.screenshot({
      path: 'test-results/pane-inset-text-wide.png',
    });
});

test('Pane and the migrated catalog remain coherent at a narrow viewport', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=pane');

  const sidebar = page.locator('.kui-catalog__sidebar');
  const pane = page.locator('[data-demo="pane"] [data-component="pane"]');
  await expect(
    pane.locator('.kui-pane__header [data-component="list-inset-text"]'),
  ).toHaveText('Optional secondary header row');
  const sidebarStyle = await sidebar.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      inlineEnd: style.borderRightWidth,
      blockEnd: style.borderBottomWidth,
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
  expect(sidebarStyle).toMatchObject({
    inlineEnd: '0px',
    blockEnd: '1px',
  });
  expect(sidebarStyle.overflow).toBeLessThanOrEqual(1);

  if (browserName === 'chromium')
    await pane.screenshot({
      path: 'test-results/pane-inset-text-narrow.png',
    });
});
