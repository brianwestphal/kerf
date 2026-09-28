import { expect, type Page, test } from '@playwright/test';

// An icon-only <button> in a ToolbarControlGroup, named only by aria-label,
// shows the same help tag an icon-only Select or PopupMenu trigger does: after
// a hover delay, at once on keyboard focus, never on a click focus, hidden on
// a press or Escape. The tag repeats the accessible name, so it is aria-hidden,
// lives in a body-level layer outside the toolbar, and leaves the
// accessibility tree unchanged.

const layerTag = (page: Page, text: string) =>
  page.locator('.kui-help-tag-layer wa-tooltip.kui-help-tag', {
    hasText: text,
  });
const layerTagBody = (page: Page, text: string) =>
  layerTag(page, text).locator('[part~="body"]');

async function openSelectDemo(page: Page, width: number) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/?component=select');
  const pin = page.locator(
    '[data-demo="select"] button[aria-label="Pin view"]',
  );
  await pin.scrollIntoViewIfNeeded();
  const group = pin.locator(
    'xpath=ancestor::*[contains(@class,"kui-toolbar-control-group")][1]',
  );
  return { pin, group };
}

test('hovering an icon-only toolbar button shows its name after a delay', async ({
  page,
}) => {
  const { pin, group } = await openSelectDemo(page, 1100);
  await expect(pin).toHaveAccessibleName('Pin view');
  const before = await group.ariaSnapshot();

  await pin.hover();
  await page.waitForTimeout(200);
  await expect(layerTagBody(page, 'Pin view')).toBeHidden();
  await expect(layerTagBody(page, 'Pin view')).toBeVisible();
  await expect(layerTag(page, 'Pin view')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  // Below the button, clear of it, in the theme's help-tag palette.
  const [tagBox, pinBox] = await Promise.all([
    layerTagBody(page, 'Pin view').boundingBox(),
    pin.boundingBox(),
  ]);
  expect(tagBox!.y).toBeGreaterThanOrEqual(pinBox!.y + pinBox!.height);
  const background = await layerTagBody(page, 'Pin view').evaluate(
    (body) => window.getComputedStyle(body).backgroundColor,
  );
  expect(background).not.toBe('rgba(0, 0, 0, 0)');

  // The name is unchanged and the toolbar's accessibility tree is identical.
  await expect(pin).toHaveAccessibleName('Pin view');
  expect(await pin.getAttribute('aria-describedby')).toBeNull();
  expect(await group.ariaSnapshot()).toBe(before);

  // Moving along the toolbar while warm shows the next tag at once.
  const filter = page.locator('wa-select[name="toolbar-ticket-label-filter"]');
  await filter.hover();
  await expect(
    filter.locator('wa-tooltip.kui-help-tag [part~="body"]'),
  ).toBeVisible({ timeout: 300 });
  await expect(layerTagBody(page, 'Pin view')).toBeHidden();
  await pin.hover();
  await expect(layerTagBody(page, 'Pin view')).toBeVisible({ timeout: 300 });

  // A press hides it and it stays hidden while the pointer stays.
  await pin.click();
  await expect(layerTagBody(page, 'Pin view')).toBeHidden();
  await page.waitForTimeout(700);
  await expect(layerTagBody(page, 'Pin view')).toBeHidden();

  await page.mouse.move(2, 2);
  await expect(layerTagBody(page, 'Pin view')).toBeHidden();
});

test('keyboard focus shows the tag at once; a click focus and Escape hide it', async ({
  page,
}) => {
  const { pin } = await openSelectDemo(page, 390);
  const filter = page.locator('wa-select[name="toolbar-ticket-label-filter"]');
  // Reach the button from the keyboard: focus the filter, then Shift+Tab.
  await filter.getByRole('combobox').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(pin).toBeFocused();
  await expect(layerTagBody(page, 'Pin view')).toBeVisible({ timeout: 300 });
  const box = await layerTagBody(page, 'Pin view').boundingBox();
  // A tag near the narrow viewport's edge keeps 8px clear of it.
  expect(box!.x).toBeGreaterThanOrEqual(8);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390 - 8);

  await page.keyboard.press('Escape');
  await expect(layerTagBody(page, 'Pin view')).toBeHidden();
  // It returns once focus leaves and comes back.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(pin).toBeFocused();
  await expect(layerTagBody(page, 'Pin view')).toBeVisible({ timeout: 300 });

  // A pointer press focuses without a tag.
  await page.mouse.move(2, 2);
  await page.keyboard.press('Tab');
  await pin.click();
  await expect(pin).toBeFocused();
  await expect(layerTagBody(page, 'Pin view')).toBeHidden();
});

test('a toolbar button with a native title keeps it and gets no second tag', async ({
  page,
}) => {
  const { pin } = await openSelectDemo(page, 1100);
  await pin.evaluate((button) => {
    button.setAttribute('title', 'Pin view');
  });
  await pin.hover();
  await page.waitForTimeout(800);
  await expect(layerTag(page, 'Pin view')).toHaveCount(0);
  await pin.focus();
  await expect(layerTag(page, 'Pin view')).toHaveCount(0);
});
