import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const recipeIds = [
  'recipe-app-shell',
  'recipe-navigation-sidebar',
  'recipe-workspace-header',
  'recipe-list-detail-dialog',
  'recipe-composer-form',
  'recipe-list-workspace-states',
  'recipe-compact-toolbar',
  'recipe-navigation-stack',
] as const;

async function openRecipe(page: Page, id: (typeof recipeIds)[number]) {
  await page.goto(`/?component=${id}`);
  const recipe = page.locator(`[data-recipe="${id}"]`);
  await expect(recipe).toBeVisible();
  return recipe;
}

async function activateDialogAndWaitForShow(
  dialog: Locator,
  activate: () => Promise<void>,
) {
  await dialog.evaluate((element) => {
    const target = element as HTMLElement & {
      waitForAfterShow?: Promise<void>;
    };
    target.waitForAfterShow = new Promise<void>((resolve) =>
      element.addEventListener('wa-after-show', () => resolve(), {
        once: true,
      }),
    );
  });
  await activate();
  await dialog.evaluate(async (element) => {
    const target = element as HTMLElement & {
      waitForAfterShow?: Promise<void>;
    };
    await target.waitForAfterShow;
    delete target.waitForAfterShow;
  });
  await expect(dialog).toHaveJSProperty('open', true);
}

async function expectToolbarZonesNotToOverlap(recipe: Locator) {
  const zones = await Promise.all(
    ['leading', 'center', 'trailing'].map((zone) =>
      recipe.locator(`.kui-toolbar__${zone}`).boundingBox(),
    ),
  );
  for (let first = 0; first < zones.length; first += 1) {
    for (let second = first + 1; second < zones.length; second += 1) {
      const a = zones[first]!;
      const b = zones[second]!;
      const overlaps =
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
      expect(overlaps, `toolbar zones ${first} and ${second} overlap`).toBe(
        false,
      );
    }
  }
  expect(zones[0]!.y + zones[0]!.height).toBeLessThanOrEqual(zones[1]!.y);
  expect(zones[1]!.y + zones[1]!.height).toBeLessThanOrEqual(zones[2]!.y);
}

test('loads every stable recipe route through an individual lazy chunk', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const id of recipeIds) {
    const recipe = await openRecipe(page, id);
    await expect(
      page.getByRole('heading', { name: 'Recipes', exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    if (browserName === 'chromium')
      await recipe.screenshot({ path: `test-results/${id}-wide-light.png` });
  }
});

test('keeps recipe geometry responsive at narrow, intermediate, and 200% zoom layouts', async ({
  page,
  browserName,
}) => {
  for (const id of recipeIds) {
    await page.setViewportSize({ width: 390, height: 844 });
    const recipe = await openRecipe(page, id);
    await page.locator('[data-action="toggle-theme"]').click();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    if (id === 'recipe-app-shell') {
      await expect(recipe.locator('.recipe-shell__nav-region')).toHaveCSS(
        'display',
        'none',
      );
      await expect(recipe.locator('.recipe-shell__inspector-region')).toHaveCSS(
        'display',
        'none',
      );
      const navigation = recipe.getByRole('button', {
        name: 'Show navigation',
      });
      const content = recipe.getByRole('button', { name: 'Show content' });
      const inspector = recipe.getByRole('button', { name: 'Show inspector' });
      await navigation.focus();
      await navigation.press('Enter');
      await expect(navigation).toBeFocused();
      await expect(navigation).toHaveAttribute('aria-pressed', 'true');
      await expect(recipe.locator('.recipe-shell__nav-region')).toBeVisible();
      await recipe
        .getByRole('button', {
          name: 'Projects with a deliberately wrapping title',
        })
        .click();
      await content.focus();
      await content.press('Enter');
      await expect(content).toBeFocused();
      await expect(
        recipe.locator('.kui-panel-header__title', {
          hasText: 'Active projects',
        }),
      ).toBeVisible();
      await inspector.focus();
      await inspector.press('Enter');
      await expect(inspector).toBeFocused();
      await expect(inspector).toHaveAttribute('aria-pressed', 'true');
      await expect(
        recipe.locator('.recipe-shell__inspector-region'),
      ).toBeVisible();
      await expect(
        recipe.locator(
          '[data-component="value-table"][aria-label="Selected task"]',
        ),
      ).toBeVisible();
    }
    if (id === 'recipe-compact-toolbar')
      await expectToolbarZonesNotToOverlap(recipe);
    if (id === 'recipe-list-detail-dialog') {
      const dialog = page.locator('wa-dialog.recipe-dialog');
      await activateDialogAndWaitForShow(dialog, () =>
        recipe.getByRole('button', { name: 'Open project details' }).click(),
      );
      if (browserName === 'chromium')
        await page.screenshot({
          path: 'test-results/recipe-list-detail-dialog-narrow-open.png',
        });
      await page.keyboard.press('Escape');
    }
    if (
      browserName === 'chromium' &&
      [
        'recipe-app-shell',
        'recipe-list-detail-dialog',
        'recipe-compact-toolbar',
      ].includes(id)
    )
      await recipe.screenshot({ path: `test-results/${id}-narrow-dark.png` });
  }

  await page.setViewportSize({ width: 900, height: 900 });
  const intermediateShell = await openRecipe(page, 'recipe-app-shell');
  expect(await intermediateShell.locator('.kui-pane__content').count()).toBe(3);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  const intermediateDialogRecipe = await openRecipe(
    page,
    'recipe-list-detail-dialog',
  );
  const intermediateDialog = page.locator('wa-dialog.recipe-dialog');
  await activateDialogAndWaitForShow(intermediateDialog, () =>
    intermediateDialogRecipe
      .getByRole('button', { name: 'Open project details' })
      .click(),
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/recipe-list-detail-dialog-intermediate-open.png',
    });
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 720, height: 900 });
  for (const id of [
    'recipe-app-shell',
    'recipe-composer-form',
    'recipe-compact-toolbar',
  ] as const) {
    await page.goto(`/?component=${id}`);
    await page.locator('html').evaluate((element) => {
      element.style.fontSize = '200%';
    });
    const recipe = page.locator(`[data-recipe="${id}"]`);
    await expect(recipe).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    if (id === 'recipe-app-shell') {
      const navigation = recipe.getByRole('button', {
        name: 'Show navigation',
      });
      await expect(navigation).toBeVisible();
      await navigation.click();
      await expect(recipe.locator('.recipe-shell__nav-region')).toBeVisible();
      await recipe.getByRole('button', { name: 'Show inspector' }).click();
      await expect(
        recipe.locator('.recipe-shell__inspector-region'),
      ).toBeVisible();
    }
    if (id === 'recipe-compact-toolbar')
      await expectToolbarZonesNotToOverlap(recipe);
    if (browserName === 'chromium')
      await recipe.screenshot({ path: `test-results/${id}-zoom-200.png` });
  }
});

test('keeps project dialog content on intentional wide and narrow gutters', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const recipe = await openRecipe(page, 'recipe-list-detail-dialog');
    const dialog = page.locator('wa-dialog.recipe-dialog');
    await activateDialogAndWaitForShow(dialog, () =>
      recipe.getByRole('button', { name: 'Open project details' }).click(),
    );
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);

    const geometry = await dialog.evaluate((root) => {
      const bounds = (selector: string) =>
        root.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
      const title = root.querySelector<HTMLElement>(
        '.recipe-list-detail__title',
      )!;
      const titleRange = document.createRange();
      titleRange.selectNodeContents(title);
      const pane = bounds('.recipe-dialog__pane');
      const header = bounds('.kui-panel-header');
      const masterDetail = bounds('.recipe-list-detail');
      const detail = bounds('.recipe-list-detail__detail');
      const table = bounds('.kui-value-table');
      const actions = bounds('.recipe-list-detail__actions');
      const archive = bounds('[data-recipe-command="archive"]');
      return {
        actionInset: actions.left - detail.left,
        archiveInset: archive.left - actions.left,
        headerEndInset: detail.right - header.right,
        headerStartInset: header.left - detail.left,
        masterDetailEndInset: pane.right - masterDetail.right,
        tableEndInset: detail.right - table.right,
        tableStartInset: table.left - detail.left,
        titleInset: titleRange.getBoundingClientRect().left - detail.left,
      };
    });

    expect(geometry.headerStartInset).toBeCloseTo(0, 1);
    expect(geometry.headerEndInset).toBeCloseTo(0, 1);
    expect(geometry.masterDetailEndInset).toBeCloseTo(0, 1);
    expect(geometry.actionInset).toBeGreaterThan(5);
    expect(geometry.tableStartInset).toBeCloseTo(geometry.actionInset, 1);
    expect(geometry.tableEndInset).toBeCloseTo(geometry.actionInset, 1);
    expect(geometry.archiveInset).toBeCloseTo(0, 1);
    expect(geometry.titleInset).toBeGreaterThan(geometry.actionInset * 1.8);
    expect(geometry.titleInset).toBeLessThan(geometry.actionInset * 2.3);

    await page.keyboard.press('Escape');
  }
});

test('keeps the composer on one labeled surface with shared field and action gutters', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 1000 });
  const form = await openRecipe(page, 'recipe-composer-form');
  const sections = form.locator(':scope > .recipe-form__section');

  const geometry = () =>
    form.evaluate((root) => {
      const rootBounds = root.getBoundingClientRect();
      const rootStyle = window.getComputedStyle(root);
      const header = root.querySelector<HTMLElement>(
        ':scope > [data-component="panel-header"]',
      )!;
      const fields = root.querySelector<HTMLElement>(
        ':scope > .recipe-form__fields',
      )!;
      const footer = root
        .querySelector<HTMLElement>('.recipe-form__footer')!
        .getBoundingClientRect();
      const actions = root
        .querySelector<HTMLElement>('.recipe-form__actions')!
        .getBoundingClientRect();
      const firstField = root
        .querySelector<HTMLElement>('.recipe-form__fields > :first-child')!
        .getBoundingClientRect();
      const fieldsBounds = fields.getBoundingClientRect();
      const headerBounds = header.getBoundingClientRect();
      const ownership = root
        .querySelector<HTMLElement>(
          '.recipe-form__footer .kui-recipe__ownership',
        )!
        .getBoundingClientRect();
      const input = root.querySelector<HTMLElement>(
        'wa-input[name="recipe-title"]',
      )!;
      const textarea = root.querySelector<HTMLElement>(
        'wa-textarea[name="recipe-body"]',
      )!;
      const select = root.querySelector<HTMLElement>(
        'wa-select[name="recipe-audience"]',
      )!;
      const inputLabel = input.shadowRoot!.querySelector<HTMLElement>(
        '[part~="form-control-label"]',
      )!;
      const inputHint =
        input.shadowRoot!.querySelector<HTMLElement>('[part~="hint"]')!;
      const textareaLabel = textarea.shadowRoot!.querySelector<HTMLElement>(
        '[part~="form-control-label"]',
      )!;
      const textareaHint =
        textarea.shadowRoot!.querySelector<HTMLElement>('[part~="hint"]')!;
      const textareaCount =
        textarea.shadowRoot!.querySelector<HTMLElement>('[part~="count"]')!;
      const textareaControl =
        textarea.shadowRoot!.querySelector<HTMLElement>('[part~="textarea"]')!;
      const selectLabel = select.shadowRoot!.querySelector<HTMLElement>(
        '[part~="form-control-label"]',
      )!;
      const textareaBounds = textarea.getBoundingClientRect();
      const countBounds = textareaCount.getBoundingClientRect();
      const hintSlot =
        textareaHint.querySelector<HTMLSlotElement>('slot[name="hint"]')!;
      const hintRange = document.createRange();
      hintRange.selectNodeContents(hintSlot);
      const hintCountOverlap = [...hintRange.getClientRects()].some(
        (rect) =>
          Math.min(rect.right, countBounds.right) >
            Math.max(rect.left, countBounds.left) &&
          Math.min(rect.bottom, countBounds.bottom) >
            Math.max(rect.top, countBounds.top),
      );
      const partPadding = (part: HTMLElement) => {
        const style = window.getComputedStyle(part);
        return {
          end: parseFloat(style.paddingInlineEnd),
          start: parseFloat(style.paddingInlineStart),
        };
      };
      return {
        actionsInsideFooter:
          actions.left >= footer.left &&
          actions.right <= footer.right &&
          actions.top >= footer.top &&
          actions.bottom <= footer.bottom,
        actionStart: actions.left - rootBounds.left,
        directGap: parseFloat(rootStyle.rowGap),
        documentOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        fieldStart: firstField.left - rootBounds.left,
        fieldsGap: parseFloat(window.getComputedStyle(fields).rowGap),
        fieldsStart: fieldsBounds.left - rootBounds.left,
        fieldsEnd: rootBounds.right - fieldsBounds.right,
        footerContentOverlap: Math.max(
          0,
          Math.min(actions.bottom, ownership.bottom) -
            Math.max(actions.top, ownership.top),
        ),
        footerStart: footer.left - rootBounds.left,
        footerEnd: rootBounds.right - footer.right,
        headerStart: headerBounds.left - rootBounds.left,
        headerEnd: rootBounds.right - headerBounds.right,
        hintCountOverlap,
        rootBackground: rootStyle.backgroundColor,
        rootBorderWidth: parseFloat(rootStyle.borderLeftWidth),
        selectLabelPadding: partPadding(selectLabel),
        textareaControlPadding: partPadding(textareaControl),
        textareaCountEnd: textareaBounds.right - countBounds.right,
        textareaHintPadding: partPadding(textareaHint),
        textareaLabelPadding: partPadding(textareaLabel),
        inputHintPadding: partPadding(inputHint),
        inputLabelPadding: partPadding(inputLabel),
      };
    });
  const expectLayout = async (
    scale: number,
    bannerRole?: 'alert' | 'status',
  ) => {
    await expect(form).toHaveAttribute(
      'aria-labelledby',
      'recipe-composer-title',
    );
    await expect(form).toHaveAttribute(
      'aria-describedby',
      'recipe-composer-summary',
    );
    await expect(
      form.locator(':scope > [data-component="panel-header"]'),
    ).toHaveCount(1);
    await expect(form.locator('#recipe-composer-title')).toHaveText(
      'Publish workspace update',
    );
    await expect(form.locator('#recipe-composer-summary')).toHaveText(
      'Share a concise, actionable update with collaborators.',
    );
    await expect(sections).toHaveCount(2);
    await expect(form.locator(':scope > .kui-content-item')).toHaveCount(0);
    await expect(
      form.locator(
        ':scope > :not([data-component="panel-header"]):not(.recipe-form__section):not([data-component="state-banner"])',
      ),
    ).toHaveCount(0);
    const banner = form.locator(':scope > [data-component="state-banner"]');
    await expect(banner).toHaveCount(bannerRole ? 1 : 0);
    if (bannerRole) await expect(banner).toHaveAttribute('role', bannerRole);
    for (const field of [
      'wa-input[name="recipe-title"]',
      'wa-textarea[name="recipe-body"]',
      'wa-select[name="recipe-audience"]',
    ])
      await expect(form.locator(field)).toBeVisible();
    await expect(form.getByRole('button', { name: 'Reset' })).toBeVisible();
    await expect(
      form.getByRole('button', { name: 'Publish update' }),
    ).toBeVisible();

    const measured = await geometry();
    expect(measured.directGap).toBeCloseTo(24 * scale, 0);
    expect(measured.rootBorderWidth).toBe(1);
    expect(measured.rootBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(measured.actionsInsideFooter).toBe(true);
    expect(measured.footerContentOverlap).toBe(0);
    expect(measured.documentOverflow).toBeLessThanOrEqual(1);
    expect(measured.fieldsGap).toBeCloseTo(8 * scale, 0);
    expect(measured.hintCountOverlap).toBe(false);
    for (const inset of [
      measured.actionStart,
      measured.fieldStart,
      measured.fieldsStart,
      measured.fieldsEnd,
      measured.footerStart,
      measured.footerEnd,
    ])
      expect(inset).toBeCloseTo(1 + 8 * scale, 0);
    // The redesigned PanelHeader is a flush toolbar and no longer replicates the
    // content-item gutter, so it sits at the surface edge rather than the 9px inset.
    expect(measured.headerStart).toBeLessThanOrEqual(1 + 2 * scale);
    expect(measured.headerEnd).toBeLessThanOrEqual(1 + 2 * scale);
    for (const padding of [
      measured.inputLabelPadding,
      measured.inputHintPadding,
      measured.textareaLabelPadding,
      measured.textareaHintPadding,
      measured.selectLabelPadding,
    ]) {
      expect(padding.start).toBeCloseTo(8 * scale, 0);
      expect(padding.end).toBeCloseTo(8 * scale, 0);
    }
    expect(measured.textareaControlPadding.start).toBeCloseTo(8 * scale, 0);
    expect(measured.textareaControlPadding.end).toBeCloseTo(8 * scale, 0);
    expect(measured.textareaCountEnd).toBeCloseTo(8 * scale, 0);
  };

  await expectLayout(1);
  if (browserName === 'chromium')
    await form.screenshot({
      path: 'test-results/composer-layout-reference-after.png',
    });

  await page.setViewportSize({ width: 390, height: 1000 });
  await form.scrollIntoViewIfNeeded();
  await expectLayout(1);
  if (browserName === 'chromium')
    await form.screenshot({ path: 'test-results/composer-layout-narrow.png' });

  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.locator('[data-action="toggle-theme"]').click();
  await expectLayout(1);
  if (browserName === 'chromium')
    await form.screenshot({ path: 'test-results/composer-layout-dark.png' });

  await page.goto('/?component=recipe-composer-form');
  await form.getByRole('button', { name: 'Publish update' }).click();
  await expect(form.getByRole('alert')).toContainText('Add a title');
  await expectLayout(1, 'alert');
  if (browserName === 'chromium')
    await form.screenshot({ path: 'test-results/composer-layout-error.png' });

  await form
    .locator('wa-input[name="recipe-title"]')
    .evaluate((element: HTMLElement & { value: string }) => {
      element.value = 'Tablet navigation shipped';
      element.dispatchEvent(
        new Event('input', { bubbles: true, composed: true }),
      );
    });
  await form
    .locator('wa-textarea[name="recipe-body"]')
    .evaluate((element: HTMLElement & { value: string }) => {
      element.value = 'Updated draft content';
      element.dispatchEvent(
        new Event('input', { bubbles: true, composed: true }),
      );
    });
  await form.getByRole('button', { name: 'Publish update' }).click();
  await expect(form.getByRole('status')).toContainText('Update published');
  await expectLayout(1, 'status');
  if (browserName === 'chromium')
    await form.screenshot({ path: 'test-results/composer-layout-success.png' });
  await form.getByRole('button', { name: 'Reset' }).click();
  await expect(
    form.locator(':scope > [data-component="state-banner"]'),
  ).toHaveCount(0);
  await expect(page.locator('.catalog-log')).toHaveText('Draft reset');
  const resetValues = await form.evaluate((root) => {
    const readValue = (selector: string, controlSelector: string) => {
      const host = root.querySelector<HTMLElement & { value: string }>(
        selector,
      )!;
      const control = host.shadowRoot?.querySelector<
        HTMLInputElement | HTMLTextAreaElement
      >(controlSelector);
      return {
        attribute: host.getAttribute('value'),
        control: control?.value,
        property: host.value,
      };
    };
    return {
      body: readValue('wa-textarea[name="recipe-body"]', 'textarea'),
      title: readValue('wa-input[name="recipe-title"]', 'input'),
    };
  });
  expect(resetValues).toEqual({
    body: { attribute: '', control: '', property: '' },
    title: { attribute: '', control: '', property: '' },
  });
  await expectLayout(1);
  if (browserName === 'chromium') {
    await form.screenshot({ path: 'test-results/composer-reset-wide.png' });
    await page.setViewportSize({ width: 390, height: 1000 });
    await form.scrollIntoViewIfNeeded();
    await expectLayout(1);
    await form.screenshot({ path: 'test-results/composer-reset-narrow.png' });
  }

  await page.setViewportSize({ width: 720, height: 1200 });
  await page.goto('/?component=recipe-composer-form');
  await page.locator('html').evaluate((element) => {
    element.style.fontSize = '200%';
  });
  await form.scrollIntoViewIfNeeded();
  await expectLayout(2);
  if (browserName === 'chromium')
    await form.screenshot({
      path: 'test-results/composer-layout-zoom-200.png',
    });

  if (browserName === 'chromium') {
    await page.setViewportSize({ width: 1100, height: 1000 });
    await page.goto('/?component=recipe-composer-form');
    await page.emulateMedia({ forcedColors: 'active' });
    await form.getByRole('button', { name: 'Publish update' }).click();
    await expectLayout(1, 'alert');
    const forcedBoundaries = await form.evaluate((root) => {
      const banner = root.querySelector<HTMLElement>(
        '[data-component="state-banner"]',
      )!;
      const rootStyle = window.getComputedStyle(root);
      const bannerStyle = window.getComputedStyle(banner);
      return {
        bannerBorderStyle: bannerStyle.borderStyle,
        bannerBorderWidth: parseFloat(bannerStyle.borderLeftWidth),
        rootBorderStyle: rootStyle.borderStyle,
        rootBorderWidth: parseFloat(rootStyle.borderLeftWidth),
        sectionBorders: [
          ...root.querySelectorAll<HTMLElement>(
            ':scope > .recipe-form__section',
          ),
        ].map((section) => {
          const style = window.getComputedStyle(section);
          return {
            style: style.borderLeftStyle,
            width: parseFloat(style.borderLeftWidth),
          };
        }),
        surfaceColor: rootStyle.backgroundColor,
      };
    });
    expect(forcedBoundaries).toMatchObject({
      bannerBorderStyle: 'solid',
      bannerBorderWidth: 1,
      rootBorderStyle: 'solid',
      rootBorderWidth: 1,
    });
    expect(forcedBoundaries.sectionBorders).toEqual([
      { style: 'none', width: 0 },
      { style: 'none', width: 0 },
    ]);
    await form.screenshot({
      path: 'test-results/composer-layout-forced-colors.png',
    });
    await page.emulateMedia({ forcedColors: 'none' });
  }
});

test('supports keyboard shell/sidebar controls and controlled toolbar interactions', async ({
  page,
}) => {
  const shell = await openRecipe(page, 'recipe-app-shell');
  expect(await shell.locator('.kui-pane__content').count()).toBe(3);
  const separator = shell.getByRole('separator', { name: 'Resize Navigation' });
  await separator.focus();
  await separator.press('ArrowRight');
  await expect(separator).toHaveAttribute('aria-valuenow', '240');
  await separator.press('End');
  await expect(separator).toHaveAttribute('aria-valuenow', '320');

  const sidebar = await openRecipe(page, 'recipe-navigation-sidebar');
  const sidebarGeometry = () =>
    sidebar.evaluate((node) => {
      const body = node
        .querySelector<HTMLElement>('.kui-pane__content')!
        .getBoundingClientRect();
      const icon = node
        .querySelector<HTMLElement>(
          '[data-item-id="inbox"] .kui-list-item__icon',
        )!
        .getBoundingClientRect();
      const iconLabel = node
        .querySelector<HTMLElement>(
          '[data-item-id="inbox"] .kui-list-item__label',
        )!
        .getBoundingClientRect();
      const plainLabel = node
        .querySelector<HTMLElement>(
          '[data-item-id="drafts"] .kui-list-item__label',
        )!
        .getBoundingClientRect();
      const surfaceContent = node
        .querySelector<HTMLElement>('.kui-content-item strong')!
        .getBoundingClientRect();
      const footerActions = [
        ...node.querySelectorAll<HTMLElement>(
          '.kui-pane__footer .kui-toolbar-control-group',
        ),
      ].map((element) => element.getBoundingClientRect());
      return {
        iconStart: icon.left - body.left,
        iconWidth: icon.width,
        iconLabelStart: iconLabel.left - body.left,
        plainStart: plainLabel.left - body.left,
        surfaceStart: surfaceContent.left - body.left,
        footerTargets: footerActions.map(({ width, height }) => [
          width,
          height,
        ]),
      };
    });
  expect(await sidebarGeometry()).toEqual({
    iconStart: 17,
    iconWidth: 18,
    iconLabelStart: 43,
    plainStart: 17,
    surfaceStart: 17,
    footerTargets: [
      [44, 44],
      [44, 44],
    ],
  });
  const projects = sidebar.getByRole('button', { name: 'Projects' });
  await projects.focus();
  await projects.press('Enter');
  await expect(projects).toHaveAttribute('aria-expanded', 'false');
  await projects.press('Enter');
  await expect(projects).toHaveAttribute('aria-expanded', 'true');
  expect(await sidebarGeometry()).toEqual({
    iconStart: 17,
    iconWidth: 18,
    iconLabelStart: 43,
    plainStart: 17,
    surfaceStart: 17,
    footerTargets: [
      [44, 44],
      [44, 44],
    ],
  });
  const drafts = sidebar.getByRole('button', {
    name: 'Drafts without an icon',
  });
  await drafts.click();
  await expect(drafts).toHaveAttribute('aria-current', 'page');

  const toolbar = await openRecipe(page, 'recipe-compact-toolbar');
  const filter = toolbar.getByRole('button', { name: 'Toggle filters' });
  await filter.click();
  await expect(filter).toHaveAttribute('aria-pressed', 'true');
  await toolbar.getByRole('button', { name: 'Board' }).click();
  await expect(
    toolbar.locator('[data-segmented-control-id="recipe-view"]'),
  ).toHaveAttribute('data-value', 'board');
});

test('runs dialog focus lifecycle, form validation, and every list transition', async ({
  page,
  browserName,
}) => {
  const dialogRecipe = await openRecipe(page, 'recipe-list-detail-dialog');
  const launcher = dialogRecipe.getByRole('button', {
    name: 'Open project details',
  });
  await launcher.focus();
  const dialog = page.locator('wa-dialog.recipe-dialog');
  await activateDialogAndWaitForShow(dialog, () => launcher.press('Enter'));
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/recipe-list-detail-dialog-wide-open.png',
    });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveJSProperty('open', false);
  await expect(launcher).toBeFocused();

  const form = await openRecipe(page, 'recipe-composer-form');
  await form.getByRole('button', { name: 'Publish update' }).click();
  await expect(form.getByRole('alert')).toContainText('Add a title');
  await form
    .locator('wa-input[name="recipe-title"]')
    .evaluate((element: HTMLElement & { value: string }) => {
      element.value = 'Tablet navigation shipped';
      element.dispatchEvent(
        new Event('input', { bubbles: true, composed: true }),
      );
    });
  await form.getByRole('button', { name: 'Publish update' }).click();
  await expect(form.getByRole('status')).toContainText('Update published');

  const list = await openRecipe(page, 'recipe-list-workspace-states');
  for (const [button, state] of [
    ['Complete load', 'populated'],
    ['Refresh', 'stale'],
    ['Finish refresh', 'populated'],
    ['Clear', 'empty'],
    ['Create task', 'populated'],
    ['Simulate failure', 'error'],
    ['Retry', 'populated'],
  ] as const) {
    await list.getByRole('button', { name: button }).click();
    await expect(list).toHaveAttribute('data-list-state', state);
  }
  if (browserName === 'chromium') {
    await list.getByRole('button', { name: 'Simulate failure' }).click();
    await page.locator('[data-action="toggle-contrast"]').click();
    await list.screenshot({
      path: 'test-results/recipe-list-error-contrast.png',
    });
  }
});

test('preserves reduced-motion and high-contrast semantics', async ({
  page,
  browserName,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const list = await openRecipe(page, 'recipe-list-workspace-states');
  const spinner = list.locator('.kui-loading-spinner path');
  await expect(spinner).toHaveCSS('animation-name', 'none');
  await page.locator('[data-action="toggle-contrast"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-contrast/);
  if (browserName === 'chromium') {
    await page.emulateMedia({
      forcedColors: 'active',
      reducedMotion: 'reduce',
    });
    await expect(
      list.getByRole('button', { name: 'Complete load' }),
    ).toBeVisible();
  }
});
