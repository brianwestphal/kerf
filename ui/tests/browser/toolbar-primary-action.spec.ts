import { expect, test } from '@playwright/test';

test('standalone trailing primary action keeps its chrome and control-band alignment', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto('/?component=toolbar');
  const toolbar = page.locator(
    '[data-demo-toolbar-primary-action] .kui-toolbar',
  );
  const button = toolbar.locator('.kui-toolbar__trailing > wa-button');
  const group = toolbar.locator(
    '.kui-toolbar__trailing > .kui-toolbar-control-group',
  );
  await expect(button).toHaveText('New ticket…');
  await expect(button).toHaveAttribute('variant', 'brand');
  await expect(button).toBeVisible();
  const geometry = await toolbar.evaluate((element) => {
    const zone = element.querySelector('.kui-toolbar__trailing')!;
    const button = zone.querySelector('wa-button')!;
    const group = zone.querySelector('.kui-toolbar-control-group')!;
    const buttonRect = button.getBoundingClientRect();
    const groupRect = group.getBoundingClientRect();
    const base = button.shadowRoot!.querySelector('[part~="base"]')!;
    return {
      buttonCenter: buttonRect.top + buttonRect.height / 2,
      groupCenter: groupRect.top + groupRect.height / 2,
      buttonBackground: window.getComputedStyle(base).backgroundColor,
      groupBackground: window.getComputedStyle(group).backgroundColor,
    };
  });
  expect(Math.abs(geometry.buttonCenter - geometry.groupCenter)).toBeLessThan(
    1,
  );
  expect(geometry.buttonBackground).not.toBe(geometry.groupBackground);
  if (testInfo.project.name === 'chromium')
    await toolbar.screenshot({
      path: testInfo.outputPath('toolbar-primary-wide.png'),
    });

  await button.evaluate((element) => element.setAttribute('size', 'small'));
  const compactCenters = await toolbar.evaluate((element) => {
    const zone = element.querySelector('.kui-toolbar__trailing')!;
    const buttonRect = zone.querySelector('wa-button')!.getBoundingClientRect();
    const groupRect = zone
      .querySelector('.kui-toolbar-control-group')!
      .getBoundingClientRect();
    return [
      buttonRect.top + buttonRect.height / 2,
      groupRect.top + groupRect.height / 2,
    ];
  });
  expect(Math.abs(compactCenters[0]! - compactCenters[1]!)).toBeLessThan(1);
  await button.evaluate((element) => element.removeAttribute('size'));

  await toolbar.evaluate((element) => {
    (element as HTMLElement).style.width = '170px';
  });
  const narrow = await toolbar.evaluate((element) => {
    const button = element.querySelector('.kui-toolbar__trailing > wa-button')!;
    const group = element.querySelector(
      '.kui-toolbar__trailing > .kui-toolbar-control-group',
    )!;
    const toolbarRect = element.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const groupRect = group.getBoundingClientRect();
    return {
      buttonTop: buttonRect.top,
      groupBottom: groupRect.bottom,
      buttonRight: buttonRect.right,
      toolbarRight: toolbarRect.right,
    };
  });
  expect(narrow.buttonTop).toBeGreaterThanOrEqual(narrow.groupBottom);
  expect(narrow.buttonRight).toBeLessThanOrEqual(narrow.toolbarRight);
  await expect(button).toBeVisible();
  await expect(group).toBeVisible();
  if (testInfo.project.name === 'chromium')
    await toolbar.screenshot({
      path: testInfo.outputPath('toolbar-primary-narrow.png'),
    });
});
