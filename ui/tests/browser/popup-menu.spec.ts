import { expect, type Page, test } from '@playwright/test';

async function expectDemoTriggerAlignment(page: Page, label: string) {
  const offset = await page
    .locator('[data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', { hasText: label }),
    })
    .first()
    .evaluate((section) => {
      const heading = section.querySelector('[data-catalog-example-label]');
      const triggerText = section
        .querySelector('wa-dropdown.kui-popup-menu > wa-button')
        ?.shadowRoot?.querySelector('[part~="label"]');
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

test('PopupMenu opens from its toolbar trigger and dispatches the chosen command', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=popup-menu');
  const demo = page.locator('[data-demo="popup-menu"]');
  const sort = demo.locator('[data-component="popup-menu"]').first();
  const trigger = sort.getByRole('button', { name: 'Sort tickets' });
  await expect(trigger).toBeVisible();

  // The toolbar group sizes the trigger as a 40px toolbar control.
  const box = await trigger.boundingBox();
  expect(box?.height).toBeCloseTo(40, 0);

  await trigger.click();
  const priority = sort.getByRole('menuitem', { name: 'Priority' });
  await expect(priority).toBeVisible();
  await priority.click();
  await expect(page.locator('.catalog-log')).toHaveText('Sorted by priority');
  await expect(priority).toBeHidden();

  // Keyboard: Enter opens the menu, arrows move, Enter chooses.
  await trigger.focus();
  await page.keyboard.press('Enter');
  const recent = sort.getByRole('menuitem', { name: 'Recently updated' });
  await expect(recent).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(sort.getByRole('menuitem', { name: 'Priority' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(recent).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText(
    'Sorted by recently updated',
  );

  // Headings, dividers, item icons, and disabled items.
  const grouped = demo.locator('[data-component="popup-menu"]').nth(1);
  await grouped.getByRole('button', { name: 'Actions' }).click();
  await expect(
    grouped.locator('.kui-popup-menu__heading', { hasText: 'Ticket' }),
  ).toBeVisible();
  await expect(grouped.locator('wa-divider')).toHaveCount(1);
  await expect(
    grouped.locator('wa-dropdown-item [slot="icon"] [data-lucide="copy"]'),
  ).toBeVisible();
  await expect(
    grouped.getByRole('menuitem', { name: 'Delete' }),
  ).toHaveAttribute('aria-disabled', 'true');
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/popup-menu-grouped.png' });
  await page.keyboard.press('Escape');
  await expect(
    grouped.getByRole('menuitem', { name: 'Duplicate' }),
  ).toBeHidden();
});

test('nested checked choices, disabled commands, and context opening work', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=popup-menu');
  await expectDemoTriggerAlignment(page, 'Checked choices');
  await expectDemoTriggerAlignment(page, 'Nested decisions');
  await page.setViewportSize({ width: 390, height: 800 });
  await expectDemoTriggerAlignment(page, 'Checked choices');
  await expectDemoTriggerAlignment(page, 'Nested decisions');
  await page.setViewportSize({ width: 1100, height: 800 });
  const demo = page.locator('[data-demo="popup-menu"]');
  const nested = demo
    .locator('[data-component="popup-menu"][data-trigger="button"]')
    .filter({
      has: page.locator('wa-dropdown-item[slot="submenu"]'),
    });
  const trigger = nested.getByRole('button', { name: 'Decide' });
  await page.evaluate(() => {
    document.body.dataset.testSelectCount = '0';
    document.addEventListener('wa-select', (event) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.querySelector('wa-dropdown-item[slot="submenu"]')
      )
        return;
      document.body.dataset.testSelectCount = String(
        Number(document.body.dataset.testSelectCount) + 1,
      );
    });
  });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(nested).toHaveAttribute('open', '');
  const parent = nested.locator(
    'wa-dropdown-item:has(> wa-dropdown-item[slot="submenu"])',
  );
  const approve = parent.locator('[data-decision="approve"]');
  const reject = parent.locator('[data-decision="reject"]');
  const other = parent.locator('[data-decision="other"]');
  const headings = parent.locator('.kui-popup-menu__heading[slot="submenu"]');
  const divider = parent.locator('wa-divider[slot="submenu"]');
  await expect(parent).toHaveJSProperty('hasSubmenu', true);
  await expect(parent).toHaveJSProperty('submenuOpen', false);
  await expect(parent).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(parent).toHaveJSProperty('submenuOpen', true);
  // Web Awesome focuses the first submenu item once on opening and again when
  // its show animation ends. Let that second handoff finish before testing
  // arrow navigation so it cannot overwrite the next keyboard move.
  await parent.evaluate(async (element) => {
    const submenu = (element as HTMLElement & { submenuElement?: HTMLElement })
      .submenuElement;
    await Promise.all(
      (submenu?.getAnimations() ?? []).map((animation) =>
        animation.finished.catch(() => undefined),
      ),
    );
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  });
  await expect(approve).toBeFocused();
  await approve.press('ArrowDown');
  await expect(other).toBeFocused();
  await other.press('ArrowUp');
  await expect(approve).toBeFocused();
  const checkmark = await approve.evaluate((element) => {
    const check = element.shadowRoot?.querySelector('#check');
    const label = element.shadowRoot?.querySelector('#label');
    const submenu =
      element.parentElement?.shadowRoot?.querySelector('#submenu');
    if (!check || !label || !submenu) throw new Error('Submenu parts missing');
    return {
      checkLeft: check.getBoundingClientRect().left,
      checkRight: check.getBoundingClientRect().right,
      labelLeft: label.getBoundingClientRect().left,
      panelLeft: submenu.getBoundingClientRect().left,
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

  await trigger.click();
  await parent.hover();
  await expect(approve).toBeVisible();
  await expect(approve).toHaveAttribute('checked', '');
  await expect(reject).toHaveAttribute('aria-disabled', 'true');
  await expect(reject).toHaveAttribute('title', 'A price is required');
  await expect(headings).toHaveText(['Review', 'More']);
  await expect(divider).toBeVisible();
  await expect(other).toBeVisible();
  await approve.click();
  await expect(page.locator('.catalog-log')).toHaveText('Decision: approve');
  await expect(page.locator('body')).toHaveAttribute(
    'data-test-select-count',
    '2',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expectDemoTriggerAlignment(page, 'Nested decisions');
  await trigger.click();
  await parent.hover();
  await expect(other).toBeVisible();
  const narrowPlacement = await parent.evaluate((item) => {
    const submenu = item.shadowRoot?.querySelector('[part~="submenu"]');
    const dropdown = item.closest('wa-dropdown');
    const menu = dropdown?.shadowRoot?.querySelector('[part~="menu"]');
    if (!submenu || !menu) throw new Error('PopupMenu surface missing');
    const child = submenu.getBoundingClientRect();
    const parentMenu = menu.getBoundingClientRect();
    return {
      childTop: child.top,
      childBottom: child.bottom,
      childLeft: child.left,
      childRight: child.right,
      parentTop: parentMenu.top,
      parentBottom: parentMenu.bottom,
    };
  });
  expect(
    narrowPlacement.childBottom <= narrowPlacement.parentTop ||
      narrowPlacement.childTop >= narrowPlacement.parentBottom,
  ).toBe(true);
  expect(narrowPlacement.childLeft).toBeGreaterThanOrEqual(8);
  expect(narrowPlacement.childRight).toBeLessThanOrEqual(390 - 8);
  expect(narrowPlacement.childTop).toBeGreaterThanOrEqual(8);
  expect(narrowPlacement.childBottom).toBeLessThanOrEqual(844 - 8 + 0.1);
  await approve.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(parent).toBeFocused();
  await expect(parent).toHaveJSProperty('submenuOpen', false);
  await page.keyboard.press('ArrowRight');
  await expect(other).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nested).not.toHaveAttribute('open', '');
  await trigger.click();
  await parent.hover();
  await expect(other).toBeVisible();
  await expect(parent.locator('[part~="submenu"]')).not.toHaveClass(/show/);
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
  const widePlacement = await parent.evaluate((item) => {
    const submenu = item.shadowRoot?.querySelector('[part~="submenu"]');
    if (!submenu) throw new Error('PopupMenu submenu missing');
    return {
      position: (submenu as HTMLElement).style.position,
      maxHeight: (submenu as HTMLElement).style.maxHeight,
    };
  });
  expect(widePlacement).toEqual({ position: '', maxHeight: '' });
  await page.keyboard.press('Escape');
  const context = demo.locator('[data-popup-context-menu]');
  const row = demo.locator('[data-popup-menu-context-target]');
  await row.click({ button: 'right', position: { x: 20, y: 12 } });
  const rowBox = await row.boundingBox();
  await expect(context).toHaveAttribute('open', '');
  const contextButton = demo.getByRole('button', { name: 'Demand actions' });
  await expect(contextButton).toBeEnabled();
  const anchorBox = await context.locator('[slot="trigger"]').boundingBox();
  expect(Math.abs(anchorBox!.x - (rowBox!.x + 20))).toBeLessThanOrEqual(2);
  expect(Math.abs(anchorBox!.y - (rowBox!.y + 12))).toBeLessThanOrEqual(2);
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/popup-menu-context-wide.png' });
  await context.getByRole('menuitem', { name: 'Open' }).click();
  await expect(page.locator('.catalog-log')).toHaveText(
    'Context demand opened',
  );
  await expect(context).not.toHaveAttribute('open', '');

  await contextButton.click();
  await expect(context).toHaveAttribute('open', '');
  const buttonBox = await contextButton.boundingBox();
  const buttonAnchorBox = await context
    .locator('[slot="trigger"]')
    .boundingBox();
  expect(Math.abs(buttonAnchorBox!.x - buttonBox!.x)).toBeLessThanOrEqual(2);
  expect(
    Math.abs(buttonAnchorBox!.y - (buttonBox!.y + buttonBox!.height)),
  ).toBeLessThanOrEqual(2);
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/popup-menu-button-wide.png' });
  // Web Awesome clears `open` before its hide animation and focus handoff
  // finish. Wait for the completed hide before exercising keyboard reopening.
  await context.evaluate((element) => {
    element.addEventListener(
      'wa-after-hide',
      () => element.setAttribute('data-test-hide-complete', ''),
      { once: true },
    );
  });
  await page.keyboard.press('Escape');
  await expect(context).not.toHaveAttribute('open', '');
  await expect(context).toHaveAttribute('data-test-hide-complete', '');

  await contextButton.press('Enter');
  await expect(context).toHaveAttribute('open', '');
  const keyboardOpen = context.getByRole('menuitem', { name: 'Open' });
  await keyboardOpen.focus();
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
      hasText: 'Context menu',
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
  const trigger = menu.getByRole('button', { name: 'Sort choices' });
  const updated = menu.getByRole('menuitemcheckbox', { name: 'Updated' });
  const priority = menu.getByRole('menuitemcheckbox', { name: 'Priority' });
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expectDemoTriggerAlignment(page, 'Checked choices');
    await trigger.click();
    await expect(updated).toHaveAttribute('aria-checked', 'true');
    await expect(priority).toHaveAttribute('aria-checked', 'false');
    const plain = menu.getByRole('menuitem', { name: 'More sort options' });
    const checkX = await updated.evaluate(
      (element) =>
        element.shadowRoot?.querySelector('#check')?.getBoundingClientRect().x,
    );
    const plainLabelX = await plain.evaluate(
      (element) =>
        element.shadowRoot?.querySelector('#label')?.getBoundingClientRect().x,
    );
    expect(checkX).toBeDefined();
    expect(plainLabelX).toBeDefined();
    expect(Math.abs(checkX! - plainLabelX!)).toBeLessThanOrEqual(1);
    if (browserName === 'chromium') {
      await menu.evaluate(async (element) => {
        await Promise.all(
          element
            .getAnimations({ subtree: true })
            .map((animation) => animation.finished.catch(() => undefined)),
        );
      });
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

test('submenu arrows keep the chosen item focused after opening', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=popup-menu');
  const nested = page
    .locator('[data-component="popup-menu"][data-trigger="button"]')
    .filter({
      has: page.locator('wa-dropdown-item[slot="submenu"]'),
    });
  const trigger = nested.getByRole('button', { name: 'Decide' });
  const parent = nested.locator(
    'wa-dropdown-item:has(> wa-dropdown-item[slot="submenu"])',
  );
  const approve = parent.locator('[data-decision="approve"]');
  const other = parent.locator('[data-decision="other"]');

  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(parent).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(approve).toBeFocused();
  // Web Awesome schedules the submenu's initial focus after its open animation.
  // Let that native focus setup settle before sending the next arrow key.
  await parent.evaluate(async (element) => {
    const submenu = (element as HTMLElement & { submenuElement?: HTMLElement })
      .submenuElement;
    await Promise.all(
      (submenu?.getAnimations() ?? []).map((animation) =>
        animation.finished.catch(() => undefined),
      ),
    );
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  });
  await approve.press('ArrowDown');
  await expect(other).toBeFocused();
  await parent.evaluate(
    () => new Promise<void>((resolve) => window.setTimeout(resolve, 0)),
  );
  await expect(other).toBeFocused();
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/popup-menu-rapid-focus.png' });
  await other.press('ArrowUp');
  await expect(approve).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('keyboard navigation during the dropdown show animation survives its focus handoff', async ({
  page,
}) => {
  await page.goto('/?component=popup-menu');
  const menu = page.locator('[data-popup-checked-menu]');
  const trigger = menu.getByRole('button', { name: 'Sort choices' });
  const priority = menu.getByRole('menuitemcheckbox', { name: 'Priority' });
  await menu.evaluate((element) => {
    (element as HTMLElement & { menu?: HTMLElement }).menu?.style.setProperty(
      '--show-duration',
      '1500ms',
    );
  });

  await trigger.click();
  await expect
    .poll(() =>
      menu.evaluate((element) =>
        (
          element as HTMLElement & { menu?: HTMLElement }
        ).menu?.classList.contains('show'),
      ),
    )
    .toBe(true);
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  const duringShow = await priority.evaluate((item) => {
    const dropdown = item.closest('wa-dropdown') as unknown as HTMLElement & {
      menu?: HTMLElement;
    };
    return {
      focused: document.activeElement === item,
      animating: dropdown.menu?.classList.contains('show'),
    };
  });
  expect(duringShow.focused, JSON.stringify(duringShow)).toBe(true);
  expect(duringShow.animating, JSON.stringify(duringShow)).toBe(true);
  await expect
    .poll(() =>
      menu.evaluate((element) =>
        (
          element as HTMLElement & { menu?: HTMLElement }
        ).menu?.classList.contains('show'),
      ),
    )
    .toBe(false);
  await expect(priority).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('submenu recovers from an interrupted close and a stale hidden open', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=popup-menu');
  const nested = page
    .locator('[data-component="popup-menu"][data-trigger="button"]')
    .filter({
      has: page.locator('wa-dropdown-item[slot="submenu"]'),
    });
  const trigger = nested.getByRole('button', { name: 'Decide' });
  const parent = nested.locator(
    'wa-dropdown-item:has(> wa-dropdown-item[slot="submenu"])',
  );
  const approve = parent.locator('[data-decision="approve"]');
  await trigger.click();
  await parent.hover();
  await expect(approve).toBeVisible();

  await parent.evaluate(async (element) => {
    const item = element as HTMLElement & {
      closeSubmenu(): Promise<void>;
      openSubmenu(): Promise<void>;
      submenuElement?: HTMLElement;
      submenuOpen: boolean;
    };
    await new Promise<void>((resolve) => window.setTimeout(resolve, 400));
    const closing = item.closeSubmenu();
    await Promise.resolve();
    void item.openSubmenu();
    void closing;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 600));
    if (item.submenuElement?.hidden || !item.submenuOpen)
      throw new Error('Submenu stayed hidden after reopening during close');
  });
  await expect(approve).toBeVisible();

  await page.mouse.move(0, 0);
  await expect
    .poll(() => parent.evaluate((element) => element.matches(':hover')))
    .toBe(false);
  await parent.evaluate((element) => {
    const item = element as HTMLElement & {
      submenuElement?: HTMLElement;
      submenuOpen: boolean;
    };
    item.submenuOpen = true;
    if (item.submenuElement) item.submenuElement.hidden = true;
  });
  await parent.hover();
  await expect(approve).toBeVisible();

  // The keyboard scenario starts with a fresh dropdown so the preceding
  // hover and interrupted-close transitions cannot leave a navigation stack.
  await page.reload();
  await trigger.click();
  // Let the parent dropdown finish its own focus handoff before exercising
  // the independent stale-submenu keyboard path.
  await expect
    .poll(() =>
      nested.evaluate((element) =>
        (
          element as HTMLElement & { menu?: HTMLElement }
        ).menu?.classList.contains('show'),
      ),
    )
    .toBe(false);
  await parent.evaluate((element) => {
    (element as HTMLElement & { submenuOpen: boolean }).submenuOpen = true;
  });
  await expect(approve).toBeVisible();
  await expect
    .poll(() =>
      parent.evaluate(
        (element) =>
          !(
            element as HTMLElement & { submenuElement?: HTMLElement }
          ).submenuElement?.classList.contains('show'),
      ),
    )
    .toBe(true);
  await page.mouse.move(0, 0);
  await expect
    .poll(() => parent.evaluate((element) => element.matches(':hover')))
    .toBe(false);
  await parent.evaluate((element) => {
    const item = element as HTMLElement & {
      submenuElement?: HTMLElement;
      submenuOpen: boolean;
      active: boolean;
    };
    const dropdown = item.closest('wa-dropdown') as unknown as HTMLElement & {
      openSubmenuStack: HTMLElement[];
    };
    // Construct the stale state and key event in one task so Web Awesome's
    // queued focus/stack updates cannot turn this into a different transition.
    dropdown.openSubmenuStack = [];
    item.active = true;
    if (item.submenuElement) item.submenuElement.hidden = true;
    item.focus();
    item.dispatchEvent(
      new globalThis.KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        composed: true,
      }),
    );
  });
  await expect(approve).toBeVisible();
  await expect(approve).toBeFocused();
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/popup-menu-reopened.png' });
});

test('context PopupMenu dismisses when clicking outside after either opening path', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=popup-menu');
  const demo = page.locator('[data-demo="popup-menu"]');
  const context = demo.locator('[data-popup-context-menu]');
  const row = demo.locator('[data-popup-menu-context-target]');
  const button = demo.getByRole('button', { name: 'Demand actions' });
  const heading = demo.locator('[data-catalog-example-label]', {
    hasText: 'Context menu',
  });

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await row.click({ button: 'right' });
    await expect(context).toHaveAttribute('open', '');
    await heading.click();
    await expect(context).not.toHaveAttribute('open', '');

    await button.click();
    await expect(context).toHaveAttribute('open', '');
    await heading.click();
    await expect(context).not.toHaveAttribute('open', '');
    if (browserName === 'chromium')
      await page.screenshot({
        path: `test-results/popup-menu-dismissed-${width}.png`,
      });
  }
});

test('context menu and nested commands stay within each viewport corner', async ({
  page,
  browserName,
}) => {
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
      await expect(context).toHaveAttribute('open', '');
      await expect
        .poll(() =>
          context.evaluate((menu) => {
            const surface = menu.shadowRoot
              ?.querySelector('wa-popup')
              ?.shadowRoot?.querySelector('[part="popup"]');
            if (!surface) return false;
            const bounds = surface.getBoundingClientRect();
            return (
              bounds.width > 0 &&
              bounds.height > 0 &&
              bounds.left >= -1 &&
              bounds.top >= -1 &&
              bounds.right <= window.innerWidth + 1 &&
              bounds.bottom <= window.innerHeight + 1
            );
          }),
        )
        .toBe(true);

      if (x === width - 5 && y === height - 5) {
        const parent = context.locator('wa-dropdown-item', {
          hasText: 'More actions',
        });
        await parent.hover();
        await expect(parent).toHaveJSProperty('submenuOpen', true);
        await expect
          .poll(() =>
            parent.evaluate((item) => {
              const surface =
                item.shadowRoot?.querySelector('[part~="submenu"]');
              if (!surface) return false;
              const bounds = surface.getBoundingClientRect();
              return (
                bounds.width > 0 &&
                bounds.height > 0 &&
                bounds.left >= -1 &&
                bounds.top >= -1 &&
                bounds.right <= window.innerWidth + 1 &&
                bounds.bottom <= window.innerHeight + 1
              );
            }),
          )
          .toBe(true);
        if (browserName === 'chromium')
          await page.screenshot({
            path: `test-results/popup-menu-context-corner-${width}.png`,
          });
      }
      await context.evaluate(async (menu) => {
        const hidden = new Promise<void>((resolve) =>
          menu.addEventListener('wa-after-hide', () => resolve(), {
            once: true,
          }),
        );
        (menu as HTMLElement & { open: boolean }).open = false;
        await hidden;
      });
    }
  }
});
