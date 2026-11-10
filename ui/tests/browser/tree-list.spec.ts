import { expect, test } from '@playwright/test';

import { animationsSettled } from '../helpers/animations-settled.js';

// KF-ECR4XG: TreeList in the catalog demo, driven by real pointer and keys.
test('TreeList opens, navigates, and chooses with the pointer and keyboard', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=tree-list');
  const tree = page.getByRole('tree', { name: 'Files' });
  const row = (name: string) => tree.getByRole('treeitem', { name });
  await expect(row('button.tsx')).toHaveAttribute('aria-selected', 'true');

  // Indent: each level's label starts 16px further in; a leaf keeps the
  // disclosure column, so siblings share an edge.
  const labelX = async (name: string) =>
    (await row(name).locator('.kui-list-item__label').boundingBox())!.x;
  const [src, components, button, index] = await Promise.all(
    ['src', 'components', 'button.tsx', 'index.ts'].map(labelX),
  );
  expect(Math.round(components - src)).toBe(16);
  expect(Math.round(button - components)).toBe(16);
  expect(Math.round(index)).toBe(Math.round(components));
  await page.mouse.move(1, 1);
  await tree.screenshot({
    path: info.outputPath('kf-ecr4xg-tree-list-files.png'),
    animations: 'disabled',
  });

  // Pointer: the arrow toggles, the row chooses.
  await row('components').locator('.kui-list-item__disclosure').click();
  await expect(row('button.tsx')).toHaveCount(0);
  await expect(row('components')).toHaveAttribute('aria-expanded', 'false');
  await row('index.ts').click();
  await expect(row('index.ts')).toHaveAttribute('aria-selected', 'true');

  // Keyboard: Tab lands on the selected row; Right opens a lazy folder, which
  // loads its children; Down enters them; Left returns to the parent.
  await row('index.ts').focus();
  await page.keyboard.press('ArrowDown');
  await expect(row('docs')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(row('docs')).toHaveAttribute('aria-expanded', 'true');
  await expect(row('guide.md')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(row('guide.md')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(row('docs')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(row('guide.md')).toHaveCount(0);
  await expect(row('docs')).toBeFocused();
  // Type-ahead and Enter.
  await page.keyboard.type('re');
  await expect(row('README.md')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(row('README.md')).toHaveAttribute('aria-selected', 'true');
  await expect(row('README.md')).toHaveAttribute('tabindex', '0');
  await expect(row('src')).toHaveAttribute('tabindex', '-1');
});

// KF-1XBJDT: flow layout must preserve real variable row heights and native
// focus scrolling; the large-project benchmark must not assume fixed rows.
test('TreeList preserves variable heights, density and focus scrolling', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=tree-list');
    const tree = page.getByRole('tree', { name: 'Files' });
    const rows = tree.getByRole('treeitem');
    await tree.evaluate((element) => {
      const tree = element as HTMLElement;
      tree.style.width = '240px';
      tree.style.height = '150px';
      tree.style.overflow = 'auto';
      const rows = Array.from(tree.children) as HTMLElement[];
      for (const [index, height] of [80, 44, 104].entries())
        rows[index]!.style.setProperty(
          '--kui-list-item-min-height',
          `${height}px`,
        );
    });
    for (const density of ['default', 'compact']) {
      await rows.evaluateAll((elements, density) => {
        for (const row of elements) row.setAttribute('data-density', density);
      }, density);
      const layout = await tree.evaluate((element) => {
        const tree = element as HTMLElement;
        const box = tree.getBoundingClientRect();
        return {
          width: box.width,
          clientHeight: tree.clientHeight,
          scrollHeight: tree.scrollHeight,
          rows: Array.from(tree.children, (row) => {
            const rect = row.getBoundingClientRect();
            return {
              height: rect.height,
              width: rect.width,
              top: rect.top,
              bottom: rect.bottom,
            };
          }),
        };
      });
      expect(layout.rows.slice(0, 3).map((row) => row.height)).toEqual([
        80, 44, 104,
      ]);
      expect(
        layout.rows
          .slice(3)
          .every((row) => row.height >= (density === 'compact' ? 36 : 44)),
      ).toBe(true);
      expect(layout.rows.at(-1)!.height).toBe(density === 'compact' ? 36 : 44);
      for (let index = 1; index < layout.rows.length; index++)
        expect(layout.rows[index]!.top).toBeCloseTo(
          layout.rows[index - 1]!.bottom,
          1,
        );
      expect(
        layout.rows.every((row) => row.width > 0 && row.width < layout.width),
      ).toBe(true);
      expect(layout.scrollHeight).toBeCloseTo(
        layout.rows.reduce((height, row) => height + row.height, 0),
        0,
      );
      expect(layout.scrollHeight).toBeGreaterThan(layout.clientHeight);
      await rows.first().focus();
      await page.keyboard.press('End');
      await expect(rows.last()).toBeFocused();
      await expect
        .poll(() => tree.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
      await page.keyboard.press('Home');
      await expect(rows.first()).toBeFocused();
      await expect
        .poll(() => tree.evaluate((element) => element.scrollTop))
        .toBe(0);
    }
  }
});

for (const scheme of ['light', 'dark'] as const) {
  for (const width of [1280, 390]) {
    test(`captures the TreeList demo, ${scheme} at ${width}px`, async ({
      page,
      browserName,
    }, info) => {
      test.skip(browserName !== 'chromium', 'captures come from one engine');
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/?component=tree-list');
      const demo = page.locator('[data-demo="tree-list"]');
      await expect(demo.getByRole('tree', { name: 'Files' })).toBeVisible();
      await demo.getByRole('treeitem', { name: 'src' }).focus();
      await page.keyboard.press('ArrowDown');
      await animationsSettled(page);
      await demo.screenshot({
        path: info.outputPath(`kf-ecr4xg-tree-list-${scheme}-${width}.png`),
        animations: 'disabled',
      });
    });
  }
}

// KF-WXP6AB: dragging a row into a container, and beside a row, in the demo's
// draggable outline.
test('TreeList moves a dragged row inside and beside other rows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=tree-list');
  const tree = page.getByRole('tree', { name: 'Document outline' });
  const row = (name: string) => tree.getByRole('treeitem', { name });
  const level = (name: string) => row(name).getAttribute('aria-level');
  const folders = (await row('folderList content').boundingBox())!;
  await row('composeButton trailing').dragTo(row('folderList content'), {
    targetPosition: { x: folders.width / 2, y: folders.height / 2 },
  });
  await expect.poll(() => level('composeButton trailing')).toBe('3');
  const order = () =>
    tree
      .getByRole('treeitem')
      .evaluateAll((rows) =>
        rows.map(
          (item) =>
            item.querySelector('.kui-list-item__primary-label')?.textContent,
        ),
      );
  expect((await order()).slice(-2)).toEqual(['folderList', 'composeButton']);
  // Before the Toolbar, at the top of the Pane's children.
  const toolbar = (await row('Toolbar header').boundingBox())!;
  await row('composeButton trailing').dragTo(row('Toolbar header'), {
    targetPosition: { x: toolbar.width / 2, y: 2 },
  });
  await expect.poll(() => level('composeButton trailing')).toBe('2');
  expect((await order()).slice(0, 3)).toEqual([
    'Pane',
    'composeButton',
    'Toolbar',
  ]);
});

// KF-7KV6H4: an application's own pointer drag from outside the tree drops
// on its rows through treeListExternalDrop, with the tree's indicator.
test('TreeList takes a drop from a source outside the tree', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.goto('/?component=tree-list');
  const tree = page.getByRole('tree', { name: 'Document outline' });
  const row = (name: string) => tree.getByRole('treeitem', { name });
  const source = page.locator('[data-tree-list-demo-new]');
  await tree.scrollIntoViewIfNeeded();
  await source.scrollIntoViewIfNeeded();
  const from = (await source.boundingBox())!;
  const folders = row('folderList content');
  const target = (await folders.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    target.x + target.width / 2,
    target.y + target.height / 2,
    { steps: 8 },
  );
  await expect(folders).toHaveAttribute('data-drop-position', 'inside');
  await page.screenshot({
    path: info.outputPath('KF-7KV6H4-external-drop.png'),
    animations: 'disabled',
  });
  await page.mouse.up();
  await expect(folders).not.toHaveAttribute('data-drop-position');
  await expect(row('Badge 1 new')).toHaveAttribute('aria-level', '3');
  // Choosing the source (the keyboard path) adds one at the root's end.
  await source.focus();
  await page.keyboard.press('Enter');
  await expect(row('Badge 2 new')).toHaveAttribute('aria-level', '2');
});
