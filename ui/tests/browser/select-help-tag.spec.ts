import { expect, type Locator, type Page, test } from '@playwright/test';

// macOS WebKit leaves buttons out of the Tab order (without Full Keyboard
// Access), so when a key press does not reach the target, focus it right after
// the key press, which the browser still treats as keyboard (focus-visible)
// focus.
async function keyboardFocus(page: Page, target: Locator, key: string) {
  await page.keyboard.press(key);
  if (!(await target.evaluate((element) => element === document.activeElement)))
    await target.focus();
}

// Icon-only popup triggers — a single or multiple icon-only Select and an
// icon-only PopupMenu — show a Web Awesome help tag naming the control (and a
// Select's current choice) on hover after a delay and on keyboard focus. The
// tag repeats the accessible name, so it is aria-hidden and never renames the
// control; it hides while the popup is open. Every tag lives in the body-level
// layer, so a Select's tag is found by its control's name (its listbox's
// accessible name), which every tag text starts with.

const helpTag = (host: Locator, name: string) =>
  host.page().locator('.kui-help-tag-layer > wa-tooltip.kui-help-tag', {
    hasText: name,
  });
const tagBody = (host: Locator, name: string) =>
  helpTag(host, name).locator('[part~="body"]');

async function moveAway(page: Page) {
  await page.mouse.move(2, 2);
}

test('hovering an icon-only filter shows its name and chosen labels after a delay', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=select');
  const select = page.locator('kui-select[name="ticket-label-filter"]');
  await select.scrollIntoViewIfNeeded();
  const combobox = select.getByRole('combobox');
  await expect(combobox).toHaveAccessibleName('Filter by Label: Bug, Docs');
  const group = select.locator(
    'xpath=ancestor::*[contains(@class,"kui-toolbar-control-group")][1]',
  );
  const before = await group.ariaSnapshot();

  const hoveredAt = Date.now();
  await select.hover();
  // Not at once: a help tag waits 500ms for the pointer to rest. Only judge
  // "not yet" while the delay has really not elapsed, so a loaded machine
  // that stretches the check past it cannot fail the test.
  const shownEarly = await tagBody(select, 'Filter by Label').isVisible();
  if (Date.now() - hoveredAt < 450) expect(shownEarly).toBe(false);
  await expect(tagBody(select, 'Filter by Label')).toBeVisible();
  await expect(helpTag(select, 'Filter by Label')).toHaveText(
    'Filter by Label: Bug, Docs',
  );
  await expect(helpTag(select, 'Filter by Label')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  // It sits below the trigger, clear of it.
  const [tagBox, triggerBox] = await Promise.all([
    tagBody(select, 'Filter by Label').boundingBox(),
    combobox.boundingBox(),
  ]);
  expect(tagBox!.y).toBeGreaterThanOrEqual(triggerBox!.y + triggerBox!.height);

  // The accessible name is unchanged and announced once: the tag is neither
  // part of the name nor exposed in the accessibility tree.
  await expect(combobox).toHaveAccessibleName('Filter by Label: Bug, Docs');
  expect(await combobox.getAttribute('aria-labelledby')).toBeNull();
  expect(await combobox.getAttribute('aria-describedby')).toBeNull();
  expect(await group.ariaSnapshot()).toBe(before);

  await page.screenshot({
    path: 'test-results/select-help-tag-hover-wide.png',
    clip: {
      x: Math.max(0, triggerBox!.x - 160),
      y: triggerBox!.y - 40,
      width: 420,
      height: 140,
    },
  });

  await moveAway(page);
  await expect(tagBody(select, 'Filter by Label')).toBeHidden();
});

test('opening the popup hides the tag, and the tag follows the selection', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=select');
  const select = page.locator('kui-select[name="ticket-label-filter"]');
  await select.scrollIntoViewIfNeeded();

  await select.hover();
  await expect(tagBody(select, 'Filter by Label')).toBeVisible();
  await select.getByRole('combobox').click();
  await expect(select).toHaveAttribute('open', '');
  await expect(tagBody(select, 'Filter by Label')).toBeHidden();

  // Hovering the open popup's options never brings it back.
  await select.locator('.kui-select__option[data-value="bug"]').hover();
  await page.waitForTimeout(700);
  await expect(tagBody(select, 'Filter by Label')).toBeHidden();
  await select.locator('.kui-select__option[data-value="bug"]').click();
  await select.hover();
  await page.waitForTimeout(700);
  await expect(tagBody(select, 'Filter by Label')).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(select).not.toHaveAttribute('open', '');
  await moveAway(page);
  await select.hover();
  await expect(tagBody(select, 'Filter by Label')).toBeVisible();
  await expect(helpTag(select, 'Filter by Label')).toHaveText(
    'Filter by Label: Docs',
  );
});

test('keyboard focus shows the tag at once; a click focus does not', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=select');
  const select = page.locator('kui-select[name="toolbar-ticket-label-filter"]');
  await select.scrollIntoViewIfNeeded();
  const pin = page.locator(
    '[data-demo="select"] button[aria-label="Pin View"]',
  );
  await pin.focus();
  await page.keyboard.press('Tab');
  const combobox = select.getByRole('combobox');
  await expect(combobox).toBeFocused();
  await expect(tagBody(select, 'Filter by Label')).toBeVisible({
    timeout: 300,
  });
  await expect(helpTag(select, 'Filter by Label')).toHaveText(
    'Filter by Label: Bug, Docs',
  );
  const box = await combobox.boundingBox();
  await page.screenshot({
    path: 'test-results/select-help-tag-focus-narrow.png',
    clip: { x: 0, y: box!.y - 40, width: 390, height: 140 },
  });

  // Opening from the keyboard hides it; closing does not bring it back.
  await page.keyboard.press('Enter');
  await expect(select).toHaveAttribute('open', '');
  await expect(tagBody(select, 'Filter by Label')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(select).not.toHaveAttribute('open', '');
  await page.waitForTimeout(300);
  await expect(tagBody(select, 'Filter by Label')).toBeHidden();

  // Leaving the trigger hides a focus tag; the next control shows its own.
  await keyboardFocus(page, pin, 'Shift+Tab');
  await expect(pin).toBeFocused();
  await expect(tagBody(select, 'Filter by Label')).toBeHidden();
  await page.keyboard.press('Tab');
  await expect(tagBody(select, 'Filter by Label')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tagBody(select, 'Filter by Label')).toBeHidden();

  // A pointer press focuses without a tag.
  await pin.focus();
  await select.getByRole('combobox').click();
  await expect(select).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(combobox).toBeFocused();
  await expect(tagBody(select, 'Filter by Label')).toBeHidden();
});

test('a single icon-only Select names its control and current choice', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=select');
  const select = page.locator(
    'kui-select[name="toolbar-default-rendering-balance"]',
  );
  await select.scrollIntoViewIfNeeded();
  const combobox = select.getByRole('combobox');
  const name = await combobox.evaluate(
    (element) => element.getAttribute('aria-label') ?? '',
  );
  await select.hover();
  await expect(
    tagBody(select, 'Default Toolbar Rendering Balance'),
  ).toBeVisible();
  await expect(helpTag(select, 'Default Toolbar Rendering Balance')).toHaveText(
    'Default Toolbar Rendering Balance: Balanced',
  );
  await select.getByRole('combobox').click();
  await expect(
    tagBody(select, 'Default Toolbar Rendering Balance'),
  ).toBeHidden();
  await select.locator('.kui-select__option[data-value="quiet"]').click();
  await expect(select).not.toHaveAttribute('open', '');
  await moveAway(page);
  await select.hover();
  await expect(helpTag(select, 'Default Toolbar Rendering Balance')).toHaveText(
    'Default Toolbar Rendering Balance: Quiet',
  );
  await expect(
    tagBody(select, 'Default Toolbar Rendering Balance'),
  ).toBeVisible();
  expect(
    await combobox.evaluate(
      (element) => element.getAttribute('aria-label') ?? '',
    ),
  ).toBe(name);
  await expect(combobox).toHaveAccessibleName(
    'Default Toolbar Rendering Balance',
  );
  // A labeled (not icon-only) Select has no tag.
  const labeled = page.locator('kui-select[name="labeled-rendering-balance"]');
  await labeled.hover();
  await page.waitForTimeout(700);
  await expect(helpTag(labeled, 'Rendering Preference')).toHaveCount(0);
});

test('an icon-only PopupMenu names its trigger; a text trigger has no tag', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=popup-menu');
  // A PopupMenu has no shadow root: its tag lives in the body-level layer.
  const layerTag = (text: string) =>
    page.locator('.kui-help-tag-layer wa-tooltip.kui-help-tag', {
      hasText: text,
    });
  const layerTagBody = (text: string) =>
    layerTag(text).locator('[part~="body"]');
  const menu = page.locator('[data-demo="popup-menu"] .kui-popup-menu').first();
  const trigger = menu.getByRole('button', { name: 'Sort Tickets' });
  await trigger.hover();
  await expect(layerTagBody('Sort Tickets')).toBeVisible();
  await expect(layerTag('Sort Tickets')).toHaveText('Sort Tickets');
  await expect(trigger).toHaveAccessibleName('Sort Tickets');
  const box = await trigger.boundingBox();
  await page.screenshot({
    path: 'test-results/popup-menu-help-tag-hover-wide.png',
    clip: {
      x: Math.max(0, box!.x - 120),
      y: box!.y - 40,
      width: 360,
      height: 130,
    },
  });
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(layerTagBody('Sort Tickets')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  // Focus returns to the trigger without reopening the tag.
  await moveAway(page);
  await expect(layerTagBody('Sort Tickets')).toBeHidden();

  // Keyboard focus shows it at once.
  await page.keyboard.press('Tab');
  await keyboardFocus(page, trigger, 'Shift+Tab');
  await expect(trigger).toBeFocused();
  await expect(layerTagBody('Sort Tickets')).toBeVisible({ timeout: 300 });
  await page.screenshot({
    path: 'test-results/popup-menu-help-tag-focus-wide.png',
    clip: {
      x: Math.max(0, box!.x - 120),
      y: box!.y - 40,
      width: 360,
      height: 130,
    },
  });
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(layerTagBody('Sort Tickets')).toBeHidden();
  await expect(menu.locator('.kui-popup-menu__item').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  const textMenu = page
    .locator('[data-demo="popup-menu"] .kui-popup-menu')
    .nth(1);
  await textMenu.getByRole('button', { name: 'Actions', exact: true }).hover();
  await page.waitForTimeout(700);
  await expect(layerTag('Actions')).toHaveCount(0);
});

test('a long tag near the viewport edge keeps 8px clear of it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=select');
  const select = page.locator(
    'kui-select[name="toolbar-default-rendering-balance"]',
  );
  await select.scrollIntoViewIfNeeded();
  await select.hover();
  await expect(
    tagBody(select, 'Default Toolbar Rendering Balance'),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        (await tagBody(
          select,
          'Default Toolbar Rendering Balance',
        ).boundingBox())!.x,
    )
    .toBeGreaterThanOrEqual(8);
});
