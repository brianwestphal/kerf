import { expect, type Page, test } from '@playwright/test';

function nestedMenu(page: Page) {
  const root = page
    .locator(
      '[data-demo="popup-menu"] [data-component="popup-menu"][data-trigger="button"]',
    )
    .filter({ has: page.locator('[data-submenu]') });
  return {
    root,
    parent: root.locator(
      '.kui-popup-menu__submenu-host > .kui-popup-menu__item',
    ),
    submenu: root.locator('[data-submenu]'),
  };
}

// A pointer-opened submenu draws a "safe triangle" as a fixed ::before on the
// submenu, clipped to the triangle between the pointer and the submenu's near
// edge. The rows themselves must still hit-test as rows: hovering and
// clicking a nested item works in every engine.
test('nested PopupMenu rows are hoverable and clickable with a pointer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=popup-menu');
  const { root, parent, submenu } = nestedMenu(page);
  await page.evaluate(() => {
    document.body.dataset.testSelected = '';
    document.addEventListener('kui-menu-select', (event) => {
      const item = (event as CustomEvent<{ item?: Element }>).detail?.item;
      document.body.dataset.testSelected =
        item?.getAttribute('data-decision') ?? '';
    });
  });
  await root.getByRole('button', { name: 'Decide' }).click();
  await parent.hover();
  await expect(parent).toHaveAttribute('aria-expanded', 'true');
  const other = submenu.locator('[data-decision="other"]');
  await expect(other).toBeVisible();
  // Let the submenu's fade settle before probing geometry.
  await page.waitForTimeout(300);

  const box = (await other.boundingBox())!;
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  // Travel along the parent row into the submenu, then down inside it, so the
  // path never leaves the menus (a diagonal shortcut is the safe triangle's
  // separate job).
  const row = (await parent.boundingBox())!;
  const rowY = row.y + row.height / 2;
  await page.mouse.move(row.x + row.width - 4, rowY, { steps: 4 });
  await page.mouse.move(center.x, rowY, { steps: 4 });
  await page.mouse.move(center.x, center.y, { steps: 8 });
  const decision = await page.evaluate(
    ({ x, y }) =>
      document
        .elementFromPoint(x, y)
        ?.closest('[data-decision]')
        ?.getAttribute('data-decision') ?? null,
    center,
  );
  expect(decision).toBe('other');
  expect(await other.evaluate((el) => el.matches(':hover'))).toBe(true);

  await page.mouse.click(center.x, center.y);
  await expect(page.locator('body')).toHaveAttribute(
    'data-test-selected',
    'other',
  );
});

test('a diagonal move toward the submenu crosses a sibling row without closing it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 1400 });
  await page.goto('/?component=popup-menu');
  const demo = page.locator('[data-demo="popup-menu"]');
  const context = demo.locator('[data-popup-context-menu]');
  const more = context.getByRole('menuitem', { name: 'More Actions' });
  const archive = context.getByRole('menuitem', { name: 'Archive' });
  const submenu = context.locator('[data-submenu]');
  // A taller submenu (still short enough to open downward beside its item),
  // so its last row sits below Archive.
  await submenu.evaluate((menu) => {
    for (let index = 0; index < 2; index++) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'kui-popup-menu__item';
      row.setAttribute('role', 'menuitem');
      row.tabIndex = -1;
      row.dataset.testRow = String(index);
      const label = document.createElement('span');
      label.className = 'kui-popup-menu__item-label';
      label.textContent = `Reference ${String(index)}`;
      row.append(label);
      menu.append(row);
    }
  });
  await demo.getByRole('button', { name: 'Demand Actions' }).click();
  const moreBox = (await more.boundingBox())!;
  await page.mouse.move(moreBox.x + 12, moreBox.y + moreBox.height / 2);
  await expect(submenu).toBeVisible();
  await page.waitForTimeout(200);
  const last = submenu.locator('[data-test-row="1"]');
  const lastBox = (await last.boundingBox())!;
  const archiveBox = (await archive.boundingBox())!;
  // The straight path passes over Archive on its way to the last row.
  expect(lastBox.y).toBeGreaterThan(archiveBox.y);
  await page.mouse.move(lastBox.x + 8, lastBox.y + lastBox.height / 2, {
    steps: 16,
  });
  await page.waitForTimeout(250);
  await expect(submenu).toBeVisible();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  expect(await last.evaluate((row) => row.matches(':hover'))).toBe(true);

  // Moving onto Archive itself (outside the triangle) closes the submenu.
  await page.mouse.move(
    archiveBox.x + 12,
    archiveBox.y + archiveBox.height / 2,
    {
      steps: 4,
    },
  );
  await expect(submenu).toBeHidden();
});

test('the safe triangle tracks the placed submenu and never covers the parent rows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=popup-menu');
  const { root, parent, submenu } = nestedMenu(page);
  await root.getByRole('button', { name: 'Decide' }).click();
  await parent.hover();
  await expect(parent).toHaveAttribute('aria-expanded', 'true');
  await expect(submenu).toHaveAttribute('data-pointer-opened', '');
  const row = (await parent.boundingBox())!;
  const rowY = row.y + row.height / 2;
  const other = submenu.locator('[data-decision="other"]');
  await page.waitForTimeout(300);
  const box = (await other.boundingBox())!;
  await page.mouse.move(row.x + row.width - 4, rowY, { steps: 4 });
  await page.mouse.move(box.x + box.width / 2, rowY, { steps: 4 });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: 8,
  });
  // The triangle's far edge is the placed submenu's near edge.
  const edges = await submenu.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const value = (name: string) =>
      parseFloat(element.style.getPropertyValue(name));
    return [
      value('--_kui-popup-menu-safe-edge') - rect.left,
      value('--_kui-popup-menu-safe-top') - rect.top,
      value('--_kui-popup-menu-safe-bottom') - rect.bottom,
    ];
  });
  for (const delta of edges) expect(Math.abs(delta)).toBeLessThan(1);

  // With the pointer inside the submenu, the parent row's leading half must
  // hit-test as the parent row, not as the submenu's triangle region.
  const owner = await page.evaluate(
    ({ x, y }) =>
      document
        .elementFromPoint(x, y)
        ?.closest('.kui-popup-menu__item, [data-submenu]')?.className,
    { x: row.x + row.width / 4, y: rowY },
  );
  expect(owner).toBe('kui-popup-menu__item');
});
