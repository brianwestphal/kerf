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

/** Every pane in a recipe owns exactly one scrolling content region. */
async function expectOneScrollOwnerPerPane(recipe: Locator, panes: number) {
  const owners = await recipe.evaluate((root) =>
    [
      ...(root.matches('[data-component="pane"]') ? [root] : []),
      ...root.querySelectorAll('[data-component="pane"]'),
    ].map(
      (pane) => pane.querySelectorAll(':scope > .kui-pane__content').length,
    ),
  );
  expect(owners).toEqual(Array.from({ length: panes }, () => 1));
}

const projectDialog = (page: Page) =>
  page.locator('[data-recipe="recipe-list-detail-dialog"] wa-dialog');

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
      // On a handset the Workbench rails start hidden and overlay the task
      // list one at a time, each opened by its relocated standard toggle.
      const left = recipe.locator('#recipe-shell-left-rail');
      const right = recipe.locator('#recipe-shell-right-rail');
      const main = recipe.locator('[data-workbench-main]');
      await expect(main).toBeVisible();
      await expect(left).toHaveAttribute('data-collapsed', 'true');
      await expect(right).toHaveAttribute('data-collapsed', 'true');
      const showNavigation = main.getByRole('button', {
        name: 'Show navigation',
      });
      await showNavigation.focus();
      await showNavigation.press('Enter');
      await expect(left).toHaveAttribute('data-collapsed', 'false');
      await expect(left).toHaveCSS('position', 'absolute');
      const hideNavigation = left.getByRole('button', {
        name: 'Hide navigation',
      });
      await expect(hideNavigation).toBeFocused();
      await hideNavigation.press('Enter');
      await expect(left).toHaveAttribute('data-collapsed', 'true');
      await expect(
        main.getByRole('button', { name: 'Show navigation' }),
      ).toBeFocused();
      await main.getByRole('button', { name: 'Show inspector' }).click();
      await expect(right).toHaveAttribute('data-collapsed', 'false');
      await expect(right).toHaveCSS('position', 'absolute');
      await expect(left).toHaveAttribute('data-collapsed', 'true');
      await expect(
        right.locator(
          '[data-component="value-table"][aria-label="Selected task"]',
        ),
      ).toBeVisible();
      await right.getByRole('button', { name: 'Hide inspector' }).click();
      await expect(right).toHaveAttribute('data-collapsed', 'true');
    }
    if (id === 'recipe-compact-toolbar')
      await expectToolbarZonesNotToOverlap(recipe);
    if (id === 'recipe-list-detail-dialog') {
      const dialog = projectDialog(page);
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
  // Beside the catalog sidebar the recipe's container is below the narrow
  // breakpoint: both rails start hidden, their show toggles in the work-area
  // toolbar on the rail's own edge.
  for (const rail of ['left', 'right'])
    await expect(
      intermediateShell.locator(`#recipe-shell-${rail}-rail`),
    ).toHaveAttribute('data-collapsed', 'true');
  const intermediateMain = intermediateShell.locator('[data-workbench-main]');
  await expect(
    intermediateMain.locator('.kui-toolbar__leading').getByRole('button', {
      name: 'Show navigation',
    }),
  ).toBeVisible();
  await expect(
    intermediateMain.locator('.kui-toolbar__trailing').getByRole('button', {
      name: 'Show inspector',
    }),
  ).toBeVisible();
  await expectOneScrollOwnerPerPane(intermediateShell, 3);
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
  const intermediateDialog = projectDialog(page);
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
      // 200% text shrinks the container below the narrow breakpoint, so
      // the rails overlay one at a time.
      await navigation.click();
      await expect(recipe.locator('#recipe-shell-left-rail')).toHaveAttribute(
        'data-collapsed',
        'false',
      );
      await recipe.getByRole('button', { name: 'Hide navigation' }).click();
      await recipe.getByRole('button', { name: 'Show inspector' }).click();
      await expect(recipe.locator('#recipe-shell-right-rail')).toHaveAttribute(
        'data-collapsed',
        'false',
      );
    }
    if (id === 'recipe-compact-toolbar')
      await expectToolbarZonesNotToOverlap(recipe);
    if (browserName === 'chromium')
      await recipe.screenshot({ path: `test-results/${id}-zoom-200.png` });
  }
});

test('lays the project dialog out as a workbench on roomy devices and a drill-down sheet on handsets', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const recipe = await openRecipe(page, 'recipe-list-detail-dialog');
    const dialog = projectDialog(page);
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

    const compact =
      (await dialog
        .locator('[data-component="split-view"]')
        .getAttribute('data-split-mode')) === 'compact';

    if (viewport.width === 1440) {
      expect(compact).toBe(false);
      const roomy = await dialog.evaluate((root) => {
        const panel = root
          .shadowRoot!.querySelector<HTMLElement>('[part~="dialog"]')!
          .getBoundingClientRect();
        const header = root.shadowRoot!.querySelector('[part~="header"]');
        const bounds = (selector: string) =>
          root.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
        const textStart = (selector: string) => {
          const range = document.createRange();
          range.selectNodeContents(root.querySelector(selector)!);
          return range.getBoundingClientRect().left;
        };
        const list = bounds('[data-split-list]');
        const detail = bounds('[data-split-detail]');
        const listToolbar = bounds('[data-split-list] .kui-toolbar');
        const detailToolbar = bounds('[data-split-detail] .kui-toolbar');
        const actions = [
          ...root.querySelectorAll<HTMLElement>(
            '[data-split-detail] wa-button',
          ),
        ].map((button) => button.getBoundingClientRect());
        return {
          headerShown:
            header !== null &&
            window.getComputedStyle(header).display !== 'none',
          listTop: list.top - panel.top,
          listBottom: panel.bottom - list.bottom,
          detailTop: detail.top - panel.top,
          detailBottom: panel.bottom - detail.bottom,
          toolbarTopDelta: Math.abs(listToolbar.top - detailToolbar.top),
          listTitleInset:
            textStart('[data-split-list] .kui-toolbar-text__text') - list.left,
          detailTitleInset:
            textStart('[data-split-detail] .kui-toolbar-text__text') -
            detail.left,
          rowInset: bounds('[data-item-id="alpha"]').left - list.left,
          tableStartInset:
            bounds('[data-split-detail] .kui-value-table').left - detail.left,
          tableEndInset:
            detail.right - bounds('[data-split-detail] .kui-value-table').right,
          actionEndInset: panel.right - actions.at(-1)!.right,
          actionBottomInset: panel.bottom - actions.at(-1)!.bottom,
          actionTopDelta: Math.abs(actions[0]!.top - actions[1]!.top),
          actionsOrdered: actions[0]!.right <= actions[1]!.left,
        };
      });
      // A workbench: no header spans both columns; the sidebar and the main
      // column each run the full dialog height under their own toolbar.
      expect(roomy.headerShown).toBe(false);
      for (const edge of [
        roomy.listTop,
        roomy.listBottom,
        roomy.detailTop,
        roomy.detailBottom,
      ])
        expect(edge).toBeCloseTo(0, 0);
      expect(roomy.toolbarTopDelta).toBeLessThanOrEqual(1);
      expect(roomy.listTitleInset).toBeCloseTo(16, 0);
      expect(roomy.detailTitleInset).toBeCloseTo(16, 0);
      expect(roomy.rowInset).toBeCloseTo(8, 0);
      expect(roomy.tableStartInset).toBeCloseTo(8, 0);
      expect(roomy.tableEndInset).toBeCloseTo(8, 0);
      // The record actions trail the main column on its 8px control inset.
      expect(roomy.actionEndInset).toBeCloseTo(8, 0);
      expect(roomy.actionBottomInset).toBeCloseTo(8, 0);
      expect(roomy.actionTopDelta).toBeLessThanOrEqual(1);
      expect(roomy.actionsOrdered).toBe(true);
      // The primary title and close control live on the main column.
      await expect(
        dialog.locator('[data-split-detail] .kui-toolbar-text', {
          hasText: 'Northstar migration',
        }),
      ).toBeVisible();
      await dialog
        .locator('[data-split-detail]')
        .getByRole('button', { name: 'Close' })
        .click();
      await expect(dialog).toHaveJSProperty('open', false);
      continue;
    }

    const geometry = await dialog.evaluate((root) => {
      const range = document.createRange();
      const panel = root
        .shadowRoot!.querySelector<HTMLElement>('[part~="dialog"]')!
        .getBoundingClientRect();
      const title = root.shadowRoot!.querySelector('[part~="title"]')!;
      range.selectNodeContents(title);
      const split = root
        .querySelector<HTMLElement>('[data-component="split-view"]')!
        .getBoundingClientRect();
      const firstRow = root
        .querySelector<HTMLElement>('[data-item-id="alpha"]')!
        .getBoundingClientRect();
      const footer = [
        ...root.querySelectorAll<HTMLElement>('[slot="footer"]'),
      ].map((button) => button.getBoundingClientRect());
      return {
        footerEndInset: panel.right - footer.at(-1)!.right,
        footerTopDelta: Math.abs(footer[0]!.top - footer[1]!.top),
        footerOrdered: footer[0]!.right <= footer[1]!.left,
        panelWidth: panel.width,
        rowInset: firstRow.left - split.left,
        splitEndInset: panel.right - split.right,
        splitStartInset: split.left - panel.left,
        titleShown: range.getBoundingClientRect().width > 0,
      };
    });

    // Handsets get a full-screen sheet with its own labeled header; the split
    // view sits flush in its body and drills list → detail.
    expect(compact).toBe(true);
    expect(geometry.titleShown).toBe(true);
    expect(geometry.splitStartInset).toBeCloseTo(0, 0);
    expect(geometry.splitEndInset).toBeCloseTo(0, 0);
    expect(geometry.rowInset).toBeCloseTo(8, 0);
    expect(geometry.footerEndInset).toBeCloseTo(16, 0);
    expect(geometry.footerTopDelta).toBeLessThanOrEqual(1);
    expect(geometry.footerOrdered).toBe(true);
    expect(geometry.panelWidth).toBeCloseTo(viewport.width, 0);
    const stack = dialog.locator('[data-component="nav-stack"]');
    await expect(stack).toHaveAttribute('data-depth', '1');
    await dialog.locator('[data-item-id="beta"]').click();
    await expect(stack).toHaveAttribute('data-depth', '2');
    await expect(
      dialog.locator('.kui-value-table', { hasText: 'Sam Rivera' }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Back to projects' }).click();
    await expect(stack).toHaveAttribute('data-depth', '1');

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveJSProperty('open', false);
  }
});

test('keeps the composer on one labeled surface with shared field and action gutters', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 1000 });
  const form = await openRecipe(page, 'recipe-composer-form');
  // One List owns the form's major rhythm; its direct children are the heading
  // group, an optional StateBanner, the field stack, and the action row.
  const stack = form.locator(':scope > [data-component="list"]');

  const geometry = () =>
    form.evaluate((root) => {
      // The single visible surface is the frame the form sits on directly.
      const surface = root.closest<HTMLElement>(
        '[data-catalog-example-viewport]',
      )!;
      const rootBounds = surface.getBoundingClientRect();
      const rootStyle = window.getComputedStyle(surface);
      const stack = root.querySelector<HTMLElement>(
        ':scope > [data-component="list"]',
      )!;
      const header = stack.querySelector<HTMLElement>(
        ':scope > [data-component="list"] > [data-component="toolbar"]',
      )!;
      const input = root.querySelector<HTMLElement>(
        'wa-input[name="recipe-title"]',
      )!;
      const fields = input.parentElement!;
      const footerRow = stack.querySelector<HTMLElement>(
        ':scope > [data-component="row"]',
      )!;
      const contentBox = (element: HTMLElement) => {
        const bounds = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          left: bounds.left + parseFloat(style.paddingInlineStart),
          right: bounds.right - parseFloat(style.paddingInlineEnd),
          top: bounds.top,
          bottom: bounds.bottom,
        };
      };
      const footer = contentBox(footerRow);
      const buttons = [...footerRow.children].map((button) =>
        button.getBoundingClientRect(),
      );
      const actions = {
        left: Math.min(...buttons.map(({ left }) => left)),
        right: Math.max(...buttons.map(({ right }) => right)),
        top: Math.min(...buttons.map(({ top }) => top)),
        bottom: Math.max(...buttons.map(({ bottom }) => bottom)),
      };
      const firstField = input.getBoundingClientRect();
      const fieldsBounds = contentBox(fields);
      const headerBounds = header.getBoundingClientRect();
      const summary = root.querySelector<HTMLElement>(
        '#recipe-composer-summary',
      )!;
      const summaryRange = document.createRange();
      summaryRange.selectNodeContents(summary);
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
        directGap: parseFloat(window.getComputedStyle(stack).rowGap),
        documentOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        fieldStart: firstField.left - rootBounds.left,
        fieldsGap: parseFloat(window.getComputedStyle(fields).rowGap),
        fieldsStart: fieldsBounds.left - rootBounds.left,
        fieldsEnd: rootBounds.right - fieldsBounds.right,
        footerStart: footer.left - rootBounds.left,
        footerEnd: rootBounds.right - footer.right,
        headingGap: parseFloat(
          window.getComputedStyle(header.parentElement!).rowGap,
        ),
        headerStart: headerBounds.left - rootBounds.left,
        summaryAfterHeader:
          summary.getBoundingClientRect().top - headerBounds.bottom,
        headerEnd: rootBounds.right - headerBounds.right,
        hintCountOverlap,
        rootBackground: rootStyle.backgroundColor,
        rootBorderWidth: parseFloat(rootStyle.borderLeftWidth),
        summaryTextStart:
          summaryRange.getBoundingClientRect().left - rootBounds.left,
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
    await expect(form.locator('[data-component="toolbar"]')).toHaveCount(1);
    await expect(form.locator('#recipe-composer-title')).toHaveText(
      'Publish workspace update',
    );
    await expect(form.locator('#recipe-composer-summary')).toHaveText(
      'Share a concise, actionable update with collaborators.',
    );
    await expect(form.locator('.kui-content-item')).toHaveCount(0);
    expect(
      await stack.evaluate((element) =>
        [...element.children].map((child) =>
          child.getAttribute('data-component'),
        ),
      ),
    ).toEqual(['list', ...(bannerRole ? ['state-banner'] : []), 'list', 'row']);
    const banner = stack.locator(':scope > [data-component="state-banner"]');
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
    // The heading toolbar is flush with the surface rather than using the
    // content-item gutter, so it sits at the edge rather than the 9px inset.
    // The title and supporting line are one heading unit: the nested heading
    // List must not pick up the form's 24px section gap, so the summary sits
    // directly under the toolbar (only its own 2px line-box offset between).
    expect(measured.headingGap).toBe(0);
    expect(measured.summaryAfterHeader).toBeGreaterThanOrEqual(0);
    expect(measured.summaryAfterHeader).toBeLessThanOrEqual(3 * scale);
    expect(measured.headerStart).toBeLessThanOrEqual(1 + 2 * scale);
    expect(measured.headerEnd).toBeLessThanOrEqual(1 + 2 * scale);
    expect(measured.summaryTextStart).toBeCloseTo(2 + 16 * scale, 0);
    for (const padding of [
      measured.inputLabelPadding,
      measured.inputHintPadding,
      measured.textareaLabelPadding,
      measured.textareaHintPadding,
      measured.selectLabelPadding,
    ]) {
      // Shared Web Awesome field chrome aligns labels and hints with the value:
      // the 1px control border plus its 8px inline content inset.
      expect(padding.start).toBeCloseTo(1 + 8 * scale, 0);
      expect(padding.end).toBeCloseTo(1 + 8 * scale, 0);
    }
    expect(measured.textareaControlPadding.start).toBeCloseTo(8 * scale, 0);
    expect(measured.textareaControlPadding.end).toBeCloseTo(8 * scale, 0);
    expect(measured.textareaCountEnd).toBeCloseTo(1 + 8 * scale, 0);
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
  await expect(form.locator('[data-component="state-banner"]')).toHaveCount(0);
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
      const rootStyle = window.getComputedStyle(
        root.closest('[data-catalog-example-viewport]')!,
      );
      const bannerStyle = window.getComputedStyle(banner);
      return {
        bannerBorderStyle: bannerStyle.borderStyle,
        bannerBorderWidth: parseFloat(bannerStyle.borderLeftWidth),
        rootBorderStyle: rootStyle.borderStyle,
        rootBorderWidth: parseFloat(rootStyle.borderLeftWidth),
        sectionBorders: [
          ...root.querySelectorAll<HTMLElement>(
            ':scope > [data-component="list"] > :is([data-component="list"]:has(wa-input), [data-component="row"])',
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
  // The navigation, content, and inspector panes; the root is a filling List,
  // not a frame pane with a scroll owner that never scrolls.
  await expectOneScrollOwnerPerPane(shell, 3);
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
  const dialog = projectDialog(page);
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
