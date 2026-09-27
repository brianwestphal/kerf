import { expect, test } from '@playwright/test';

test('renders the Skeleton primitive demo', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=skeleton');

  const demo = page.locator('[data-demo="skeleton"]');
  await expect(demo).toBeVisible();
  await expect(demo).toHaveAttribute('data-catalog-example-stack', '');

  const composition = demo.locator(
    '[data-catalog-example][data-catalog-geometry-overlay-skip]',
  );
  await expect(composition).toHaveCount(1);
  await expect(composition).toHaveAttribute('data-align', 'none');

  // Primitive blocks render and are decorative by default.
  const blocks = demo.locator('.kui-list .kui-skeleton');
  expect(await blocks.count()).toBeGreaterThanOrEqual(4);

  // A component's placeholder mode is shown in composition (ValueTable rows).
  const rows = demo.locator('.kui-value-table__row[data-placeholder="true"]');
  expect(await rows.count()).toBe(2);
  await expect(rows.first().locator('.kui-value-table__label')).toHaveText(
    'Status',
  );
  await expect(rows.first().locator('dd .kui-skeleton')).toBeVisible();

  // Skeleton blocks read as flat fill with no animation.
  const animation = await blocks
    .first()
    .evaluate((element) => window.getComputedStyle(element).animationName);
  expect(animation === 'none' || animation === '').toBe(true);

  if (browserName === 'chromium')
    await demo.screenshot({ path: 'test-results/skeleton-primitive.png' });
});

test('every placeholder-supporting component demos its placeholder case', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  // Each single-component demo (AppTab via `tabs`, ValueTableRow via `value-table`)
  // must surface its placeholder=true variant so the loading state is discoverable
  // where the component is evaluated, not only inside the loading-inspector recipe.
  const components = [
    'segmented-control',
    'toolbar-text',
    'list-header',
    'list-action-row',
    'list-item',
    'value-table',
    'select',
    'state-banner',
    'tabs',
  ];
  for (const id of components) {
    await page.goto(`/?component=${id}`);
    const demo = page.locator(`[data-demo="${id}"]`);
    await expect(demo, `${id} demo is visible`).toBeVisible();
    await expect(
      demo.locator('[data-placeholder="true"]').first(),
      `${id} demos a placeholder case`,
    ).toBeVisible();
  }
});

test('the StateBanner demo shows a badged placeholder in every tone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=state-banner');
  // Visual QA and captures need the solid badge's skeleton on each tone fill.
  const tones = await page
    .locator(
      '[data-demo="state-banner"] [data-component="state-banner"][data-placeholder="true"]:has(.kui-badge .kui-skeleton)',
    )
    .evaluateAll((banners) =>
      banners.map((banner) => (banner as HTMLElement).dataset.tone),
    );
  expect(tones).toEqual([
    'neutral',
    'info',
    'pop',
    'success',
    'warning',
    'danger',
  ]);
});

test('the Loading inspector recipe composes placeholder chrome and swaps to loaded', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=recipe-loading-inspector');

  const inspector = page.locator('[data-recipe="recipe-loading-inspector"]');
  await expect(inspector).toBeVisible();

  // Loading state: real chrome with skeleton values.
  await expect(inspector).toHaveAttribute('data-inspector-loading', 'true');
  await expect(
    inspector.locator(
      '[data-component="toolbar-text"][data-placeholder="true"]',
    ),
  ).toBeVisible();
  await expect(
    inspector.locator(
      '.kui-toolbar__leading [data-component="toolbar-control-group"]',
    ),
  ).toBeVisible();
  const rows = inspector.locator(
    '.kui-value-table__row[data-placeholder="true"]',
  );
  expect(await rows.count()).toBe(4);
  await expect(rows.first().locator('.kui-value-table__label')).toHaveText(
    'Status',
  );
  await expect(rows.first().locator('dd .kui-skeleton')).toBeVisible();
  // Select renders a static placeholder box, not the interactive wa-select.
  await expect(inspector.locator('.kui-select--placeholder')).toBeVisible();
  expect(await inspector.locator('wa-select').count()).toBe(0);
  // A placeholder menu item is disabled and carries no action.
  const item = inspector
    .locator('.kui-list-item[data-placeholder="true"]')
    .first();
  await expect(item).toBeDisabled();
  expect(await item.getAttribute('data-action')).toBeNull();
  // The icon placeholder is an 18px block skeleton centered in its icon slot
  // and on the label's line.
  const iconGeometry = await item.evaluate((element) => {
    const slot = element.querySelector('.kui-list-item__icon')!;
    const skeleton = slot.querySelector<HTMLElement>('.kui-skeleton')!;
    const label = element.querySelector('.kui-list-item__label')!;
    const mid = (rect: DOMRect) => (rect.top + rect.bottom) / 2;
    const s = skeleton.getBoundingClientRect();
    return {
      display: window.getComputedStyle(skeleton).display,
      block: skeleton.dataset.block,
      size: [Math.round(s.width), Math.round(s.height)],
      offSlot: Math.abs(mid(s) - mid(slot.getBoundingClientRect())),
      offLabel: Math.abs(mid(s) - mid(label.getBoundingClientRect())),
    };
  });
  expect(iconGeometry).toMatchObject({
    display: 'block',
    block: 'true',
    size: [18, 18],
  });
  expect(iconGeometry.offSlot).toBeLessThanOrEqual(0.5);
  expect(iconGeometry.offLabel).toBeLessThanOrEqual(0.5);

  if (browserName === 'chromium')
    await inspector.screenshot({
      path: 'test-results/recipe-loading-inspector.png',
    });

  // Toggling shows the populated record with the same chrome.
  await inspector.getByRole('button', { name: 'Show loaded' }).click();
  await expect(inspector).toHaveAttribute('data-inspector-loading', 'false');
  await expect(
    inspector.locator('.kui-value-table__row[data-placeholder="true"]'),
  ).toHaveCount(0);
  await expect(inspector.locator('wa-select')).toBeVisible();
  await expect(inspector.getByText('Mara Lopez')).toBeVisible();
});

test('a placeholder Select keeps the live control’s chrome; only the value is a skeleton', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=recipe-loading-inspector');
  const inspector = page.locator('[data-recipe="recipe-loading-inspector"]');
  const select = inspector.locator('[data-component="select"]').first();
  await expect(select).toHaveAttribute('data-placeholder', 'true');

  // Label typography and inset, box geometry, and the chevron's box, read from
  // the placeholder's own elements or the live wa-select's parts.
  const chrome = () =>
    select.evaluate((root) => {
      const placeholder = root.dataset.placeholder === 'true';
      const part = (name: string) =>
        root.shadowRoot?.querySelector(`[part~="${name}"]`) ?? null;
      const label = placeholder
        ? root.querySelector('.kui-select__placeholder-label')
        : part('form-control-label');
      const box = placeholder
        ? root.querySelector('.kui-select__placeholder-box')
        : part('combobox');
      const chevron = placeholder
        ? root.querySelector('.kui-select__placeholder-chevron')
        : part('expand-icon');
      const hint = placeholder
        ? root.querySelector('.kui-select__placeholder-hint')
        : part('hint');
      const origin = root.getBoundingClientRect();
      const rect = (element: Element) => {
        const bounds = element.getBoundingClientRect();
        return [
          Math.round(bounds.left - origin.left),
          Math.round(bounds.top - origin.top),
          Math.round(bounds.width),
          Math.round(bounds.height),
        ];
      };
      const text = document.createRange();
      text.selectNodeContents(label!);
      const labelStyle = window.getComputedStyle(label!);
      const boxStyle = window.getComputedStyle(box!);
      const hintStyle = window.getComputedStyle(hint!);
      return {
        labelText: Math.round(text.getBoundingClientRect().left - origin.left),
        label: [
          'font-size',
          'font-weight',
          'text-transform',
          'letter-spacing',
          'color',
          'line-height',
        ].map((property) => labelStyle.getPropertyValue(property)),
        box: rect(box!),
        radius: boxStyle.borderTopLeftRadius,
        border: boxStyle.borderTopColor,
        chevron: rect(chevron!),
        chevronColor: window.getComputedStyle(chevron!).color,
        hint: rect(hint!),
        hintStyle: [
          'font-size',
          'line-height',
          'margin-top',
          'padding-left',
          'color',
        ].map((property) => hintStyle.getPropertyValue(property)),
        height: Math.round(origin.height * 2) / 2,
      };
    });
  const loading = await chrome();
  await inspector.getByRole('button', { name: 'Show loaded' }).click();
  await expect(select).not.toHaveAttribute('data-placeholder', 'true');
  expect(await chrome()).toEqual(loading);
});
