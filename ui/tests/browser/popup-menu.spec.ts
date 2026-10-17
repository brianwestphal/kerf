import { expect, type Locator, type Page, test } from '@playwright/test';

async function expectDemoTriggerAlignment(page: Page, label: string) {
  const offset = await page
    .locator('[data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', { hasText: label }),
    })
    .first()
    .evaluate((section) => {
      const heading = section.querySelector('[data-catalog-example-label]');
      const triggerText = section.querySelector(
        '.kui-popup-menu > .kui-popup-menu__trigger > .kui-popup-menu__text',
      );
      if (!heading || !triggerText)
        throw new Error('PopupMenu demo label missing');
      const labelText = heading.querySelector('.kui-text')?.firstChild;
      if (!labelText) throw new Error('PopupMenu heading text missing');
      const textRange = document.createRange();
      textRange.selectNodeContents(labelText);
      return (
        triggerText.getBoundingClientRect().x -
        textRange.getBoundingClientRect().x
      );
    });
  expect(Math.abs(offset), `${label}: ${offset}px`).toBeLessThanOrEqual(2);
}

/** The menu panel a PopupMenu root opens. */
const panelOf = (root: Locator) =>
  root.locator(':scope > .kui-popup-menu__menu');

/** Whether a PopupMenu root's menu is open (its opener reports it). */
const openerOf = (root: Locator) =>
  root.locator(
    ':scope > .kui-popup-menu__trigger, :scope > .kui-popup-menu__context-anchor',
  );

async function expectOpen(root: Locator, open = true) {
  await expect(openerOf(root)).toHaveAttribute(
    'aria-expanded',
    open ? 'true' : 'false',
  );
  if (open) await expect(panelOf(root)).toBeVisible();
  else await expect(panelOf(root)).toBeHidden();
}

/** The "Nested Decisions" demo menu, its trigger, submenu item, and submenu. */
function nestedMenu(page: Page) {
  const root = page
    .locator('[data-demo="popup-menu"]')
    .locator('[data-component="popup-menu"][data-trigger="button"]')
    .filter({ has: page.locator('[data-submenu]') });
  const parent = root.locator(
    '.kui-popup-menu__submenu-host > .kui-popup-menu__item',
  );
  const submenu = root.locator('[data-submenu]');
  return {
    root,
    trigger: root.getByRole('button', { name: 'Decide' }),
    parent,
    submenu,
    approve: submenu.locator('[data-decision="approve"]'),
    reject: submenu.locator('[data-decision="reject"]'),
    other: submenu.locator('[data-decision="other"]'),
  };
}

/** Wait for a fading popup to finish its motion before measuring it. */
const settled = (popup: Locator) =>
  popup.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });

/** Append `count` plain choices to a menu panel, as an app with many rows would. */
const addChoices = (submenu: Locator, count: number) =>
  submenu.evaluate((menu, total) => {
    for (let index = 0; index < total; index++) {
      const choice = document.createElement('button');
      choice.type = 'button';
      choice.className = 'kui-popup-menu__item';
      choice.setAttribute('role', 'menuitem');
      choice.tabIndex = -1;
      choice.dataset.action = 'log-decision';
      choice.dataset.decision = `project-${String(index)}`;
      const label = document.createElement('span');
      label.className = 'kui-popup-menu__item-label';
      label.textContent = `Project ${String(index)}`;
      choice.append(label);
      menu.append(choice);
    }
  }, count);

test('PopupMenu opens from its toolbar trigger and dispatches the chosen command', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=popup-menu');
  const demo = page.locator('[data-demo="popup-menu"]');
  const sort = demo.locator('[data-component="popup-menu"]').first();
  const trigger = sort.getByRole('button', { name: 'Sort Tickets' });
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');

  // The toolbar group sizes the trigger as a 40px toolbar control.
  const box = await trigger.boundingBox();
  expect(box?.height).toBeCloseTo(40, 0);

  await trigger.click();
  await expectOpen(sort);
  // The open menu is named by its trigger.
  await expect(sort.getByRole('menu', { name: 'Sort Tickets' })).toBeVisible();
  const priority = sort.getByRole('menuitem', { name: 'Priority' });
  await expect(priority).toBeVisible();
  await priority.click();
  await expect(page.locator('.catalog-log')).toHaveText('Sorted by priority');
  await expect(priority).toBeHidden();
  await expectOpen(sort, false);

  // Keyboard: Enter opens the menu, arrows move, Enter chooses.
  await trigger.focus();
  await page.keyboard.press('Enter');
  const recent = sort.getByRole('menuitem', { name: 'Recently Updated' });
  await expect(recent).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(priority).toBeFocused();
  await page.keyboard.press('Home');
  await expect(recent).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText(
    'Sorted by recently updated',
  );
  await expect(trigger).toBeFocused();

  // Space chooses too, and ArrowUp on the trigger opens on the last item.
  await page.keyboard.press('ArrowUp');
  await expect(priority).toBeFocused();
  await page.keyboard.press(' ');
  await expect(page.locator('.catalog-log')).toHaveText('Sorted by priority');

  // Headings, dividers, item icons, and disabled items.
  const grouped = demo.locator('[data-component="popup-menu"]').nth(1);
  await grouped.getByRole('button', { name: 'Actions' }).click();
  await expect(
    grouped.locator('.kui-popup-menu__heading', { hasText: 'Ticket' }),
  ).toBeVisible();
  await expect(grouped.getByRole('group', { name: 'Ticket' })).toBeVisible();
  await expect(grouped.getByRole('separator')).toHaveCount(1);
  await expect(
    grouped.locator('.kui-popup-menu__icon [data-lucide="copy"]'),
  ).toBeVisible();
  const remove = grouped.getByRole('menuitem', { name: 'Delete' });
  await expect(remove).toHaveAttribute('aria-disabled', 'true');
  // Arrow keys skip the disabled command, and a click on it does nothing.
  await page.keyboard.press('End');
  await expect(
    grouped.getByRole('menuitem', { name: 'Archive' }),
  ).toBeFocused();
  await remove.click({ force: true });
  await expectOpen(grouped);
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/popup-menu-grouped.png' });
  await page.keyboard.press('Escape');
  await expect(
    grouped.getByRole('menuitem', { name: 'Duplicate' }),
  ).toBeHidden();
  await expect(grouped.getByRole('button', { name: 'Actions' })).toBeFocused();
});

test('nested checked choices, disabled commands, and context opening work', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=popup-menu');
  await expectDemoTriggerAlignment(page, 'Checked Choices');
  await expectDemoTriggerAlignment(page, 'Nested Decisions');
  await page.setViewportSize({ width: 390, height: 800 });
  await expectDemoTriggerAlignment(page, 'Checked Choices');
  await expectDemoTriggerAlignment(page, 'Nested Decisions');
  await page.setViewportSize({ width: 1100, height: 800 });
  const demo = page.locator('[data-demo="popup-menu"]');
  const {
    root: nested,
    trigger,
    parent,
    submenu,
    approve,
    reject,
    other,
  } = nestedMenu(page);
  await page.evaluate(() => {
    document.body.dataset.testSelectCount = '0';
    document.addEventListener('kui-menu-select', (event) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.querySelector('[data-submenu]')
      )
        return;
      document.body.dataset.testSelectCount = String(
        Number(document.body.dataset.testSelectCount) + 1,
      );
    });
  });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expectOpen(nested);
  await expect(parent).toHaveAttribute('aria-haspopup', 'menu');
  await expect(parent).toHaveAttribute('aria-expanded', 'false');
  await expect(parent).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(parent).toHaveAttribute('aria-expanded', 'true');
  await expect(approve).toBeFocused();
  // The submenu is named by its item.
  await expect(submenu).toBeVisible();
  await expect(submenu).toHaveAccessibleName('Decide');
  await approve.press('ArrowDown');
  await expect(other).toBeFocused();
  await other.press('ArrowUp');
  await expect(approve).toBeFocused();
  await settled(submenu);
  const checkmark = await approve.evaluate((element) => {
    const check = element.querySelector('.kui-popup-menu__check svg');
    const label = element.querySelector('.kui-popup-menu__item-label');
    const panel = element.closest('.kui-popup-menu__menu');
    if (!check || !label || !panel) throw new Error('Submenu parts missing');
    return {
      checkLeft: check.getBoundingClientRect().left,
      checkRight: check.getBoundingClientRect().right,
      labelLeft: label.getBoundingClientRect().left,
      panelLeft: panel.getBoundingClientRect().left,
      checkVisibility: window.getComputedStyle(check).visibility,
    };
  });
  expect(checkmark.checkVisibility).toBe('visible');
  expect(checkmark.checkLeft).toBeGreaterThanOrEqual(checkmark.panelLeft + 4);
  expect(checkmark.checkRight).toBeLessThan(checkmark.labelLeft);
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/popup-menu-nested-wide.png' });
  await page.keyboard.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText('Decision: approve');
  await expect(page.locator('body')).toHaveAttribute(
    'data-test-select-count',
    '1',
  );
  await expectOpen(nested, false);

  await trigger.click();
  await parent.hover();
  await expect(approve).toBeVisible();
  await expect(approve).toHaveAttribute('aria-checked', 'true');
  await expect(reject).toHaveAttribute('aria-disabled', 'true');
  await expect(reject).toHaveAttribute('title', 'A price is required');
  await expect(submenu.locator('.kui-popup-menu__heading')).toHaveText([
    'Review',
    'More',
  ]);
  await expect(submenu.getByRole('separator')).toBeVisible();
  await expect(other).toBeVisible();
  await approve.click();
  await expect(page.locator('.catalog-log')).toHaveText('Decision: approve');
  await expect(page.locator('body')).toHaveAttribute(
    'data-test-select-count',
    '2',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expectDemoTriggerAlignment(page, 'Nested Decisions');
  await trigger.click();
  await parent.hover();
  await expect(other).toBeVisible();
  await settled(submenu);
  const narrowPlacement = await submenu.evaluate((child) => {
    const menu = child.parentElement?.closest('.kui-popup-menu__menu');
    if (!menu) throw new Error('PopupMenu surface missing');
    const box = child.getBoundingClientRect();
    const parentMenu = menu.getBoundingClientRect();
    return {
      childTop: box.top,
      childBottom: box.bottom,
      childLeft: box.left,
      childRight: box.right,
      parentTop: parentMenu.top,
      parentBottom: parentMenu.bottom,
      placement: child.getAttribute('data-placement'),
    };
  });
  // A phone submenu sits above or below the whole parent menu.
  expect(
    narrowPlacement.childBottom <= narrowPlacement.parentTop + 0.5 ||
      narrowPlacement.childTop >= narrowPlacement.parentBottom - 0.5,
    JSON.stringify(narrowPlacement),
  ).toBe(true);
  expect(narrowPlacement.placement).toMatch(/^(bottom|top)-start$/);
  expect(narrowPlacement.childLeft).toBeGreaterThanOrEqual(8);
  expect(narrowPlacement.childRight).toBeLessThanOrEqual(390 - 8);
  expect(narrowPlacement.childTop).toBeGreaterThanOrEqual(8);
  expect(narrowPlacement.childBottom).toBeLessThanOrEqual(844 - 8 + 0.1);
  await approve.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(parent).toBeFocused();
  await expect(parent).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('ArrowRight');
  await expect(other).toBeVisible();
  // Escape closes the submenu, then the menu.
  await page.keyboard.press('Escape');
  await expect(submenu).toBeHidden();
  await expectOpen(nested);
  await page.keyboard.press('Escape');
  await expectOpen(nested, false);
  await trigger.click();
  await parent.hover();
  await expect(other).toBeVisible();
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/popup-menu-nested-narrow.png',
    });
  await other.click();
  await expect(page.locator('.catalog-log')).toHaveText('Decision: other');

  await page.setViewportSize({ width: 1100, height: 800 });
  await trigger.click();
  await parent.hover();
  await expect(approve).toBeVisible();
  // At desktop width the submenu opens beside its item.
  await expect(submenu).toHaveAttribute(
    'data-placement',
    /^(right|left)-start$/,
  );
  const beside = await parent.evaluate((item) => {
    const child = item.nextElementSibling!.getBoundingClientRect();
    const box = item.getBoundingClientRect();
    return {
      childLeft: child.left,
      itemRight: box.right,
      childTop: child.top,
      itemTop: box.top,
    };
  });
  expect(Math.abs(beside.childLeft - beside.itemRight)).toBeLessThanOrEqual(1);
  // Its first row lines up with the item (the panel lifts by inset + border).
  expect(Math.abs(beside.childTop + 5 - beside.itemTop)).toBeLessThanOrEqual(1);
  await page.keyboard.press('Escape');
  const context = demo.locator('[data-popup-context-menu]');
  const row = demo.locator('[data-popup-menu-context-target]');
  await row.click({ button: 'right', position: { x: 20, y: 12 } });
  const rowBox = await row.boundingBox();
  await expectOpen(context);
  const contextButton = demo.getByRole('button', { name: 'Demand Actions' });
  await expect(contextButton).toBeEnabled();
  const anchorBox = await openerOf(context).boundingBox();
  expect(Math.abs(anchorBox!.x - (rowBox!.x + 20))).toBeLessThanOrEqual(2);
  expect(Math.abs(anchorBox!.y - (rowBox!.y + 12))).toBeLessThanOrEqual(2);
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/popup-menu-context-wide.png' });
  await context.getByRole('menuitem', { name: 'Open' }).click();
  await expect(page.locator('.catalog-log')).toHaveText(
    'Context demand opened',
  );
  await expectOpen(context, false);

  await contextButton.click();
  await expectOpen(context);
  const buttonBox = await contextButton.boundingBox();
  const buttonAnchorBox = await openerOf(context).boundingBox();
  expect(Math.abs(buttonAnchorBox!.x - buttonBox!.x)).toBeLessThanOrEqual(2);
  expect(
    Math.abs(buttonAnchorBox!.y - (buttonBox!.y + buttonBox!.height)),
  ).toBeLessThanOrEqual(2);
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/popup-menu-button-wide.png' });
  await page.keyboard.press('Escape');
  await expectOpen(context, false);

  await contextButton.press('Enter');
  await expectOpen(context);
  const keyboardOpen = context.getByRole('menuitem', { name: 'Open' });
  await expect(keyboardOpen).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText(
    'Context demand opened',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await row.click({ button: 'right', position: { x: 20, y: 12 } });
  await expect(context.getByRole('menuitem', { name: 'Open' })).toBeVisible();
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/popup-menu-context-narrow.png',
    });
  await page.keyboard.press('Escape');
  await contextButton.click();
  await expect(context.getByRole('menuitem', { name: 'Open' })).toBeVisible();
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/popup-menu-button-narrow.png',
    });
});

test('context example keeps its row gutter on click', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=popup-menu');
  const example = page.locator('[data-catalog-example]').filter({
    has: page.locator('[data-catalog-example-label]', {
      hasText: 'Context Menu',
    }),
  });
  const row = example.locator('[data-popup-menu-context-target]');
  for (const [width, name] of [
    [1100, 'wide'],
    [390, 'narrow'],
  ] as const) {
    await page.setViewportSize({ width, height: 844 });
    await row.scrollIntoViewIfNeeded();
    const before = await row.boundingBox();
    await row.click();
    const after = await row.boundingBox();
    expect(after?.x).toBeCloseTo(before!.x, 0);
    expect(after?.width).toBeCloseTo(before!.width, 0);
    await expect(page.locator('.catalog-log')).toHaveText(
      'More actions requested',
    );
    if (browserName === 'chromium')
      await example.screenshot({
        path: `test-results/popup-menu-context-row-${name}.png`,
      });
  }
});

test('checked PopupMenu choice follows application state on pointer and keyboard selection', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=popup-menu');
  const menu = page.locator('[data-popup-checked-menu]');
  const trigger = menu.getByRole('button', { name: 'Sort Choices' });
  const updated = menu.getByRole('menuitemcheckbox', { name: 'Updated' });
  const priority = menu.getByRole('menuitemcheckbox', { name: 'Priority' });
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expectDemoTriggerAlignment(page, 'Checked Choices');
    await trigger.click();
    await expect(updated).toHaveAttribute('aria-checked', 'true');
    await expect(priority).toHaveAttribute('aria-checked', 'false');
    const plain = menu.getByRole('menuitem', { name: 'More Sort Options' });
    // The plain command shares the choices' check column: its label starts
    // where theirs do.
    const labelX = (item: Locator) =>
      item.evaluate(
        (element) =>
          element
            .querySelector('.kui-popup-menu__item-label')
            ?.getBoundingClientRect().x,
      );
    const checkedLabelX = await labelX(updated);
    const plainLabelX = await labelX(plain);
    expect(checkedLabelX).toBeDefined();
    expect(plainLabelX).toBeDefined();
    expect(Math.abs(checkedLabelX! - plainLabelX!)).toBeLessThanOrEqual(1);
    if (browserName === 'chromium') {
      await settled(panelOf(menu));
      await page.screenshot({
        path: `test-results/popup-menu-checked-${width}.png`,
      });
    }
    await priority.click();
    await trigger.click();
    await expect(updated).toHaveAttribute('aria-checked', 'false');
    await expect(priority).toHaveAttribute('aria-checked', 'true');
    await priority.focus();
    await page.keyboard.press('Home');
    await expect(updated).toBeFocused();
    await page.keyboard.press('Enter');
    await trigger.click();
    await expect(updated).toHaveAttribute('aria-checked', 'true');
    await expect(priority).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('Escape');
  }
});

test('a level with a checkbox choice aligns plain items to its check column', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=popup-menu');
  const { trigger, parent, submenu, approve } = nestedMenu(page);
  const columns = (item: Locator) =>
    item.evaluate((element) => {
      const x = (node: Element | null | undefined) =>
        node ? node.getBoundingClientRect().x : null;
      return {
        check: x(element.querySelector('.kui-popup-menu__check svg')),
        icon: x(element.querySelector(':scope > .kui-popup-menu__icon')),
        label: x(element.querySelector('.kui-popup-menu__item-label')),
      };
    });
  const near = (a: number | null, b: number | null, what: string) => {
    expect(a, what).not.toBeNull();
    expect(b, what).not.toBeNull();
    expect(Math.abs(a! - b!), what).toBeLessThanOrEqual(1);
  };

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await trigger.click();
    // The top level holds no choice: its plain item keeps the compact start.
    await expect(parent.locator('.kui-popup-menu__check')).toHaveCount(0);

    // The submenu mixes a checked choice with plain commands (one disabled):
    // all share one icon column and one label column.
    await parent.hover();
    await expect(approve).toBeVisible();
    await settled(submenu);
    const checked = await columns(approve);
    expect(checked.check).not.toBeNull();
    for (const decision of ['reject', 'other']) {
      const row = await columns(
        submenu.locator(`[data-decision="${decision}"]`),
      );
      expect(row.check, decision).toBeNull();
      near(row.icon, checked.icon, `${decision} icon`);
      near(row.label, checked.label, `${decision} label`);
    }
    if (browserName === 'chromium')
      await page.screenshot({
        path: `test-results/popup-menu-mixed-${width}.png`,
      });
    await page.keyboard.press('Escape');
  }
});

test('submenu arrows keep the chosen item focused after opening', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=popup-menu');
  const { trigger, parent, approve, other } = nestedMenu(page);

  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(parent).toBeFocused();
  await page.keyboard.press('ArrowRight');
  // No settling wait: the next key lands while the submenu is still fading in.
  await page.keyboard.press('ArrowDown');
  await expect(other).toBeFocused();
  await page.evaluate(
    () => new Promise<void>((resolve) => window.setTimeout(resolve, 300)),
  );
  await expect(other).toBeFocused();
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/popup-menu-rapid-focus.png' });
  await other.press('ArrowUp');
  await expect(approve).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(parent).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('keyboard navigation works while the menu is still fading in', async ({
  page,
}) => {
  await page.goto('/?component=popup-menu');
  const menu = page.locator('[data-popup-checked-menu]');
  const trigger = menu.getByRole('button', { name: 'Sort Choices' });
  const priority = menu.getByRole('menuitemcheckbox', { name: 'Priority' });
  await menu.evaluate((element) => {
    (element as HTMLElement).style.setProperty(
      '--_kui-popup-menu-motion',
      '1500ms',
    );
  });

  await trigger.click();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  const duringShow = await priority.evaluate((item) => {
    const panel = item.closest('.kui-popup-menu__menu')!;
    return {
      focused: document.activeElement === item,
      fading: Number(window.getComputedStyle(panel).opacity) < 1,
    };
  });
  expect(duringShow.focused, JSON.stringify(duringShow)).toBe(true);
  expect(duringShow.fading, JSON.stringify(duringShow)).toBe(true);
  await settled(panelOf(menu));
  await expect(priority).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('a submenu survives a pointer that leaves and returns, and rapid keyboard toggles', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=popup-menu');
  const demo = page.locator('[data-demo="popup-menu"]');
  const context = demo.locator('[data-popup-context-menu]');
  const more = context.getByRole('menuitem', { name: 'More Actions' });
  const archive = context.getByRole('menuitem', { name: 'Archive' });
  const copy = context.getByRole('menuitem', { name: 'Copy Reference' });
  await demo.getByRole('button', { name: 'Demand Actions' }).click();
  await expectOpen(context);
  await more.hover();
  await expect(copy).toBeVisible();

  // Over a sibling the submenu closes after a short grace period; returning
  // to it within that period keeps it open. Raw mouse moves at measured
  // points (no actionability waits) keep both moves inside that period.
  const center = async (target: typeof copy) => {
    const box = (await target.boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const [archivePoint, copyPoint] = [await center(archive), await center(copy)];
  await page.mouse.move(archivePoint.x, archivePoint.y);
  await page.mouse.move(copyPoint.x, copyPoint.y);
  await page.evaluate(
    () => new Promise<void>((resolve) => window.setTimeout(resolve, 300)),
  );
  await expect(copy).toBeVisible();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  // Staying away closes it.
  await archive.hover();
  await expect(copy).toBeHidden();
  await expect(more).toHaveAttribute('aria-expanded', 'false');

  // Opening and closing it from the keyboard in quick succession settles open.
  await more.focus();
  for (let index = 0; index < 3; index++) {
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
  }
  await page.keyboard.press('ArrowRight');
  await expect(copy).toBeVisible();
  await expect(copy).toBeFocused();
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/popup-menu-reopened.png' });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expectOpen(context, false);
});

test('context PopupMenu dismisses when clicking outside after either opening path', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=popup-menu');
  const demo = page.locator('[data-demo="popup-menu"]');
  const context = demo.locator('[data-popup-context-menu]');
  const row = demo.locator('[data-popup-menu-context-target]');
  const button = demo.getByRole('button', { name: 'Demand Actions' });
  const heading = demo.locator('[data-catalog-example-label]', {
    hasText: 'Context Menu',
  });

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await row.click({ button: 'right' });
    await expectOpen(context);
    await heading.click();
    await expectOpen(context, false);

    await button.click();
    await expectOpen(context);
    await heading.click();
    await expectOpen(context, false);
    if (browserName === 'chromium')
      await page.screenshot({
        path: `test-results/popup-menu-dismissed-${width}.png`,
      });
  }
});

test('a press on an open menu trigger closes it without reopening', async ({
  page,
}) => {
  await page.goto('/?component=popup-menu');
  const { root, trigger } = nestedMenu(page);
  await trigger.click();
  await expectOpen(root);
  await trigger.click();
  await expectOpen(root, false);
  await trigger.click();
  await expectOpen(root);
  await page.keyboard.press('Escape');
});

test('context menu and nested commands stay within each viewport corner', async ({
  page,
  browserName,
}) => {
  const inside = (surface: Locator) =>
    surface.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return (
        bounds.width > 0 &&
        bounds.height > 0 &&
        bounds.left >= -1 &&
        bounds.top >= -1 &&
        bounds.right <= window.innerWidth + 1 &&
        bounds.bottom <= window.innerHeight + 1
      );
    });
  for (const { width, height } of [
    { width: 390, height: 844 },
    { width: 1100, height: 800 },
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/?component=popup-menu');
    const row = page.locator('[data-popup-menu-context-target]');
    const context = page.locator('[data-popup-context-menu]');
    await expect(context).toBeAttached();
    for (const [x, y] of [
      [5, 5],
      [width - 5, 5],
      [5, height - 5],
      [width - 5, height - 5],
    ]) {
      await row.evaluate(
        (target, point) =>
          target.dispatchEvent(
            new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              clientX: point[0],
              clientY: point[1],
            }),
          ),
        [x, y],
      );
      await expectOpen(context);
      await expect.poll(() => inside(panelOf(context))).toBe(true);

      if (x === width - 5 && y === height - 5) {
        const parent = context.getByRole('menuitem', { name: 'More Actions' });
        await parent.hover();
        await expect(parent).toHaveAttribute('aria-expanded', 'true');
        await expect
          .poll(() => inside(context.locator('[data-submenu]')))
          .toBe(true);
        if (browserName === 'chromium')
          await page.screenshot({
            path: `test-results/popup-menu-context-corner-${width}.png`,
          });
      }
      await page.keyboard.press('Escape');
      await expectOpen(context, false);
    }
  }
});

test('a context PopupMenu renders its anchor point and takes no layout space', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=popup-menu');
  const context = page.locator('[data-popup-context-menu]');
  const row = page.locator('[data-popup-menu-context-target]');
  // Out of flow: no line box in block layout, no gap slot in flex or grid.
  expect(
    await context.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        position: window.getComputedStyle(element).position,
        width: box.width,
        height: box.height,
      };
    }),
  ).toEqual({ position: 'fixed', width: 0, height: 0 });
  await row.click({ button: 'right', position: { x: 30, y: 10 } });
  await expectOpen(context);
  const rowBox = (await row.boundingBox())!;
  // The point lives in the rendered template, not only in imperative style,
  // so a re-render or replacement of the menu keeps it.
  const style = await context.getAttribute('style');
  const [x, y] = [
    /--kui-popup-menu-context-x:\s*([\d.]+)px/.exec(style ?? '')?.[1],
    /--kui-popup-menu-context-y:\s*([\d.]+)px/.exec(style ?? '')?.[1],
  ].map(Number);
  expect(Math.abs(x - (rowBox.x + 30))).toBeLessThanOrEqual(2);
  expect(Math.abs(y - (rowBox.y + 10))).toBeLessThanOrEqual(2);
  // The menu panel opens at the point.
  const panel = (await context
    .getByRole('menuitem', { name: 'Open' })
    .boundingBox())!;
  expect(panel.x).toBeGreaterThanOrEqual(x - 16);
  expect(panel.x).toBeLessThanOrEqual(x + 32);
  expect(panel.y).toBeGreaterThanOrEqual(y - 4);
  expect(panel.y).toBeLessThanOrEqual(y + 48);
  await page.keyboard.press('Escape');
  await expectOpen(context, false);
});

test('End pressed as a long submenu opens leaves the last choice focused and scrolled into view', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=popup-menu');
  const { trigger, parent, submenu } = nestedMenu(page);
  await addChoices(submenu, 20);
  const last = submenu.locator('[data-decision="project-19"]');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(parent).toBeFocused();
  // No wait between opening the submenu and the End press.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('End');
  await expect(last).toBeFocused();
  await page.waitForTimeout(400);
  await expect(last).toBeFocused();
  await expect
    .poll(() =>
      submenu.evaluate((menu) => {
        const choice = menu.querySelector('[data-decision="project-19"]')!;
        const clip = menu.getBoundingClientRect();
        const box = choice.getBoundingClientRect();
        return {
          scrolled: menu.scrollTop > 0,
          inside: box.top >= clip.top - 0.5 && box.bottom <= clip.bottom + 1,
        };
      }),
    )
    .toEqual({ scrolled: true, inside: true });
});

test('a long phone submenu stays inside the viewport and scrolls to every choice', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=popup-menu');
  const { root, trigger, parent, submenu } = nestedMenu(page);
  // An app menu with one choice per project: far more rows than a phone
  // screen holds on either side of the parent menu.
  await addChoices(submenu, 20);
  const last = submenu.locator('[data-decision="project-19"]');
  const submenuBox = () =>
    submenu.evaluate((menu) => {
      const box = menu.getBoundingClientRect();
      return {
        top: box.top,
        bottom: box.bottom,
        scrollable: menu.scrollHeight > menu.clientHeight,
        scrollTop: menu.scrollTop,
      };
    });

  // Below the parent menu (trigger high on the screen), then above it
  // (trigger low): each side caps the submenu at the space it has.
  for (const triggerTop of [250, 560]) {
    await trigger.evaluate((element, top) => {
      element.scrollIntoView({ block: 'start' });
      let scroller = element.parentElement;
      while (
        scroller &&
        !(
          scroller.scrollHeight > scroller.clientHeight &&
          /auto|scroll/.test(window.getComputedStyle(scroller).overflowY)
        )
      )
        scroller = scroller.parentElement;
      (scroller ?? document.scrollingElement)?.scrollBy(
        0,
        element.getBoundingClientRect().top - top,
      );
    }, triggerTop);
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(parent).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(parent).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(async () => (await submenuBox()).scrollable).toBe(true);
    const placed = await submenuBox();
    expect(placed.top).toBeGreaterThanOrEqual(8 - 0.5);
    expect(placed.bottom).toBeLessThanOrEqual(844 - 8 + 0.5);

    // The keyboard walks every choice, scrolling the last one into view.
    await page.keyboard.press('End');
    await expect(last).toBeFocused();
    await expect
      .poll(async () => {
        const lastBox = (await last.boundingBox())!;
        const scrolled = await submenuBox();
        return {
          topInside: lastBox.y >= scrolled.top,
          bottomInside: lastBox.y + lastBox.height <= scrolled.bottom + 1,
          scrolled: scrolled.scrollTop > 0,
        };
      })
      .toEqual({ topInside: true, bottomInside: true, scrolled: true });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expectOpen(root, false);
  }

  // The wheel scrolls the capped submenu, and a pointer reaches and chooses
  // the last row.
  await trigger.click();
  await parent.hover();
  await expect(parent).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(async () => (await submenuBox()).scrollable).toBe(true);
  const opened = await submenuBox();
  await page.mouse.move(100, opened.top + 40);
  // Engines apply a wheel delta in different step sizes, so keep scrolling
  // until the last row lands in view.
  await expect
    .poll(async () => {
      await page.mouse.wheel(0, 400);
      return last.evaluate((choice) => {
        const box = choice.getBoundingClientRect();
        const hit = document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        return hit === choice || choice.contains(hit);
      });
    })
    .toBe(true);
  expect((await submenuBox()).scrollTop).toBeGreaterThan(0);
  await last.click();
  await expect(page.locator('.catalog-log')).toHaveText('Decision: project-19');
});

// A capped popup shows that it scrolls with a shadow along the edge that has
// more choices beyond it. The menu, a phone submenu, and a Select's listbox
// all paint the same shared cue: covers that scroll with the content over
// shadows fixed to the box, so the cue appears only toward hidden rows.
test('PopupMenu menus and Select listboxes share the scroll-edge cue', async ({
  page,
}) => {
  // The four cue layers lead; an engine may report the base color's layer.
  const attachments = (layers: string) =>
    layers
      .split(',')
      .map((layer) => layer.trim())
      .slice(0, 4);
  const cue = ['local', 'local', 'scroll', 'scroll'];

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=popup-menu');
  const { root, submenu } = nestedMenu(page);
  const style = (popup: Locator) =>
    popup.evaluate(
      (menu) => window.getComputedStyle(menu).backgroundAttachment,
    );
  expect(attachments(await style(panelOf(root)))).toEqual(cue);
  expect(attachments(await style(submenu))).toEqual(cue);

  await page.goto('/?component=select');
  const listboxStyle = await page
    .locator('kui-select.kui-select')
    .first()
    .evaluate((select) => {
      const listbox = select.querySelector(':scope > .kui-select__popup');
      if (!listbox) throw new Error('Select listbox missing');
      return window.getComputedStyle(listbox).backgroundAttachment;
    });
  expect(attachments(listboxStyle)).toEqual(cue);
});

test('a Badge content trigger opens the menu, keeps its submenu, and draws a pill ring', async ({
  page,
}) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/?component=popup-menu');
    const menu = page.locator('[data-popup-badge-menu]');
    const trigger = menu.getByRole('button', { name: 'Status: Started' });
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    await expect(menu).toHaveAttribute('data-trigger', 'content');
    // The button adds no chrome around the badge.
    const [button, badge] = await Promise.all([
      trigger.boundingBox(),
      trigger.locator('.kui-badge').boundingBox(),
    ]);
    expect(Math.abs(button!.width - badge!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(button!.height - badge!.height)).toBeLessThanOrEqual(1);
    await expect(trigger).toHaveCSS('cursor', 'pointer');
    // The keyboard opens it.
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(
      menu.getByRole('menu', { name: 'Status: Started' }),
    ).toBeVisible();
    await menu
      .getByRole('menuitemcheckbox', { name: 'Started', exact: true })
      .hover();
    await expect(
      menu.getByRole('menuitemcheckbox', { name: 'Testing' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    // No help tag repeats the name over a visible badge.
    await trigger.hover();
    await page.waitForTimeout(800);
    await expect(page.locator('.kui-help-tag:popover-open')).toHaveCount(0);
  }
});

// A tall button-triggered menu at a short viewport takes the side with more
// room and scrolls inside its cap instead of shifting over its trigger, so a
// second press on the trigger reaches it and closes the menu. Before, the
// menu was shifted up over the trigger and the second press landed on a row.
test('a tall PopupMenu never covers its trigger at a short viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto('/?component=popup-menu');
  const root = page
    .locator('[data-demo="popup-menu"]')
    .locator('[data-component="popup-menu"]')
    .first();
  const trigger = root.getByRole('button', { name: 'Sort Tickets' });
  const panel = panelOf(root);
  // Move the unchanged production group to controlled viewport anchors and
  // lengthen the menu. No PopupMenu styles are overridden.
  await root.evaluate((element) => {
    const group = element.parentElement!;
    group.style.position = 'fixed';
    group.style.left = '400px';
    const menu = element.querySelector(':scope > .kui-popup-menu__menu')!;
    const item = [
      ...menu.querySelectorAll('.kui-popup-menu__item:not([aria-haspopup])'),
    ].find((candidate) => candidate.closest('.kui-popup-menu__menu') === menu)!;
    for (let index = 0; index < 30; index += 1)
      item.parentElement!.append(item.cloneNode(true));
  });
  for (const [top, side] of [
    [80, 'bottom'],
    [460, 'top'],
  ] as const) {
    await root.evaluate((element, y) => {
      element.parentElement!.style.top = `${y}px`;
    }, top);
    await trigger.click();
    await expectOpen(root);
    await expect
      .poll(() => panel.getAttribute('data-placement'))
      .toMatch(new RegExp(`^${side}`));
    const geometry = await root.evaluate((element) => {
      const opener = element
        .querySelector(':scope > .kui-popup-menu__trigger')!
        .getBoundingClientRect();
      const menu = element.querySelector<HTMLElement>(
        ':scope > .kui-popup-menu__menu',
      )!;
      const box = menu.getBoundingClientRect();
      return {
        overlap:
          Math.min(box.bottom, opener.bottom) - Math.max(box.top, opener.top),
        top: box.top,
        bottom: box.bottom,
        scrolls: menu.scrollHeight > menu.clientHeight,
      };
    });
    expect(geometry.overlap).toBeLessThanOrEqual(0.5);
    expect(geometry.top).toBeGreaterThanOrEqual(9.5);
    expect(geometry.bottom).toBeLessThanOrEqual(600 - 9.5);
    expect(geometry.scrolls).toBe(true);
    // The trigger is not covered: a real (actionable) press closes the menu.
    await trigger.click();
    await expectOpen(root, false);
  }
});
