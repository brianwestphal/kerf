import { expect, test } from '@playwright/test';

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
      await page.waitForTimeout(250);
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
