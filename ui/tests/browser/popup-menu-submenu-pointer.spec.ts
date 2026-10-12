import { expect, test } from '@playwright/test';

// Web Awesome draws its submenu "safe triangle" as a fixed, viewport-sized
// ::before on the submenu part, clipped to the triangle between the cursor and
// the submenu. WebKit hit-tests that pseudo-element over the submenu rows, so
// a pointer never reached a nested PopupMenu item there: rows did not hover
// and clicks selected nothing.
test('nested PopupMenu rows are hoverable and clickable with a pointer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=popup-menu');
  const nested = page
    .locator(
      '[data-demo="popup-menu"] [data-component="popup-menu"][data-trigger="button"]',
    )
    .filter({ has: page.locator('wa-dropdown-item[slot="submenu"]') });
  await page.evaluate(() => {
    document.body.dataset.testSelected = '';
    document.addEventListener('wa-select', (event) => {
      const item = (event as CustomEvent<{ item?: Element }>).detail?.item;
      document.body.dataset.testSelected =
        item?.getAttribute('data-decision') ?? '';
    });
  });
  await nested.getByRole('button', { name: 'Decide' }).click();
  await expect(nested).toHaveAttribute('open', '');
  const parent = nested.locator(
    'wa-dropdown-item:has(> wa-dropdown-item[slot="submenu"])',
  );
  await parent.hover();
  await expect(parent).toHaveJSProperty('submenuOpen', true);
  const other = parent.locator('[data-decision="other"]');
  await expect(other).toBeVisible();
  // Let the submenu's show animation settle before probing geometry.
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
  const hit = await page.evaluate(({ x, y }) => {
    let node: Element | null = document.elementFromPoint(x, y);
    // Descend through open shadow roots to the deepest hit element.
    while (node?.shadowRoot) {
      const inner = node.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === node) break;
      node = inner;
    }
    const tag = node?.tagName.toLowerCase();
    // Walk back out through shadow hosts to the owning menu item.
    let decision: string | null = null;
    for (let at: Node | null = node; at;) {
      if (at instanceof Element && at.hasAttribute('data-decision')) {
        decision = at.getAttribute('data-decision');
        break;
      }
      at = at.parentNode ?? (at instanceof ShadowRoot ? at.host : null);
    }
    return { tag, decision };
  }, center);
  expect(hit.decision, `hit ${hit.tag}`).toBe('other');
  expect(await other.evaluate((el) => el.matches(':hover'))).toBe(true);

  await page.mouse.click(center.x, center.y);
  await expect(page.locator('body')).toHaveAttribute(
    'data-test-selected',
    'other',
  );
});

// Web Awesome measured the triangle before its async submenu placement landed,
// so the triangle kept the submenu's pre-placement edge (0,0): its fixed hit
// region fanned away from the submenu, over the parent menu's rows. PopupMenu
// re-measures after placement and after the show animation settles.
test('the submenu safe triangle tracks the placed submenu and never covers the parent rows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=popup-menu');
  const nested = page
    .locator(
      '[data-demo="popup-menu"] [data-component="popup-menu"][data-trigger="button"]',
    )
    .filter({ has: page.locator('wa-dropdown-item[slot="submenu"]') });
  await nested.getByRole('button', { name: 'Decide' }).click();
  const parent = nested.locator(
    'wa-dropdown-item:has(> wa-dropdown-item[slot="submenu"])',
  );
  await parent.hover();
  await expect(parent).toHaveJSProperty('submenuOpen', true);
  await expect
    .poll(() =>
      parent.evaluate((item) => {
        const submenu =
          item.shadowRoot!.querySelector<HTMLElement>('[part~="submenu"]')!;
        const rect = submenu.getBoundingClientRect();
        const value = (name: string) =>
          parseFloat(submenu.style.getPropertyValue(name));
        return [
          value('--safe-triangle-submenu-start-x') - rect.left,
          value('--safe-triangle-submenu-start-y') - rect.top,
          value('--safe-triangle-submenu-end-y') - rect.bottom,
        ].every((delta) => Math.abs(delta) < 1);
      }),
    )
    .toBe(true);

  // With the pointer inside the submenu, the parent row's leading half must
  // hit-test as the parent row, not as the submenu's triangle region.
  const row = (await parent.boundingBox())!;
  const rowY = row.y + row.height / 2;
  const other = parent.locator('[data-decision="other"]');
  const box = (await other.boundingBox())!;
  await page.mouse.move(row.x + row.width - 4, rowY, { steps: 4 });
  await page.mouse.move(box.x + box.width / 2, rowY, { steps: 4 });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: 8,
  });
  const owner = await page.evaluate(
    ({ x, y }) => {
      let node: Element | null = document.elementFromPoint(x, y);
      while (node?.shadowRoot) {
        const inner = node.shadowRoot.elementFromPoint(x, y);
        if (!inner || inner === node) break;
        node = inner;
      }
      return node?.getAttribute('part') ?? node?.localName;
    },
    { x: row.x + row.width / 4, y: rowY },
  );
  expect(owner).not.toBe('submenu');
});
