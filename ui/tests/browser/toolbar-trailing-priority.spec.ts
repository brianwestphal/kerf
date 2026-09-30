import { expect, test } from '@playwright/test';

for (const width of [1100, 390]) {
  test(`expanded trailing search owns a full row at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=toolbar');
    const example = page.locator(
      '[data-demo-toolbar-overflow="trailing-priority"]',
    );
    const toolbar = example.locator('.kui-toolbar');
    const leading = toolbar.locator('.kui-toolbar__leading');
    const trailing = toolbar.locator('.kui-toolbar__trailing');
    const group = trailing.locator('.kui-toolbar-control-group');
    await expect(group).toBeVisible();
    const rects = await toolbar.evaluate((el) => {
      const leading = el.querySelector('.kui-toolbar__leading')!;
      const trailing = el.querySelector('.kui-toolbar__trailing')!;
      const group = trailing.querySelector('.kui-toolbar-control-group')!;
      const area = el.getBoundingClientRect();
      const padding = window.getComputedStyle(el);
      return {
        contentWidth:
          area.width -
          parseFloat(padding.paddingLeft) -
          parseFloat(padding.paddingRight),
        leadingBottom: leading.getBoundingClientRect().bottom,
        trailingTop: trailing.getBoundingClientRect().top,
        trailingWidth: trailing.getBoundingClientRect().width,
        groupWidth: group.getBoundingClientRect().width,
      };
    });
    await expect(leading).toBeVisible();
    expect(rects.trailingTop).toBeGreaterThanOrEqual(rects.leadingBottom);
    expect(rects.trailingWidth).toBeCloseTo(rects.contentWidth, 0);
    expect(rects.groupWidth).toBeCloseTo(rects.contentWidth, 0);
    await example.screenshot({
      path: `test-results/toolbar-trailing-priority-${width}.png`,
    });
  });
}

test('trailing priority stays inline above the breakpoint and zone tokens apply', async ({
  page,
}) => {
  await page.goto('/?component=toolbar');
  const geometry = await page.evaluate(() => {
    const original = document.querySelector<HTMLElement>(
      '[data-demo-toolbar-overflow="trailing-priority"] .kui-toolbar',
    )!;
    const host = document.createElement('div');
    host.style.width = '1000px';
    host.dataset.wideToolbarFixture = 'true';
    const toolbar = original.cloneNode(true) as HTMLElement;
    toolbar.style.setProperty('--kui-toolbar-leading-min-width', '120px');
    toolbar.style.setProperty('--kui-toolbar-trailing-gap', '12px');
    toolbar.style.setProperty('--kui-toolbar-trailing-padding-inline', '6px');
    host.append(toolbar);
    document.body.append(host);
    const leading = toolbar.querySelector<HTMLElement>(
      '.kui-toolbar__leading',
    )!;
    const trailing = toolbar.querySelector<HTMLElement>(
      '.kui-toolbar__trailing',
    )!;
    const result = {
      leadingTop: leading.getBoundingClientRect().top,
      trailingTop: trailing.getBoundingClientRect().top,
      trailingWidth: trailing.getBoundingClientRect().width,
      leadingMinWidth: window.getComputedStyle(leading).minWidth,
      trailingGap: window.getComputedStyle(trailing).gap,
      trailingPadding: window.getComputedStyle(trailing).paddingLeft,
    };
    return result;
  });
  expect(geometry.trailingTop).toBe(geometry.leadingTop);
  expect(geometry.trailingWidth).toBeGreaterThanOrEqual(480);
  expect(geometry).toMatchObject({
    leadingMinWidth: '120px',
    trailingGap: '12px',
    trailingPadding: '6px',
  });
  const host = page.locator('[data-wide-toolbar-fixture]');
  await host.screenshot({
    path: 'test-results/toolbar-trailing-priority-wide.png',
  });
  await host.evaluate((el) => el.remove());
});

test('trailing priority retains a center control above the expanded search', async ({
  page,
}) => {
  await page.goto('/?component=toolbar');
  const geometry = await page.evaluate(() => {
    const original = document.querySelector<HTMLElement>(
      '[data-demo-toolbar-overflow="trailing-priority"] .kui-toolbar',
    )!;
    const host = document.createElement('div');
    host.style.width = '600px';
    const toolbar = original.cloneNode(true) as HTMLElement;
    toolbar.dataset.hasCenter = 'true';
    const center = toolbar.querySelector<HTMLElement>('.kui-toolbar__center')!;
    center.innerHTML = '<span>Filter</span>';
    host.append(toolbar);
    document.body.append(host);
    const leading = toolbar.querySelector<HTMLElement>(
      '.kui-toolbar__leading',
    )!;
    const trailing = toolbar.querySelector<HTMLElement>(
      '.kui-toolbar__trailing',
    )!;
    const result = {
      leadingRight: leading.getBoundingClientRect().right,
      centerLeft: center.getBoundingClientRect().left,
      centerTop: center.getBoundingClientRect().top,
      leadingTop: leading.getBoundingClientRect().top,
      trailingTop: trailing.getBoundingClientRect().top,
    };
    host.remove();
    return result;
  });
  expect(geometry.centerLeft).toBeGreaterThanOrEqual(geometry.leadingRight);
  expect(geometry.centerTop).toBe(geometry.leadingTop);
  expect(geometry.trailingTop).toBeGreaterThan(geometry.centerTop);
});
