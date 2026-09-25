import { expect, type Locator, type Page, test } from '@playwright/test';

import {
  catalog,
  catalogRepositoryHref,
  catalogSections,
  kerfCatalog,
} from '../../ux-demo/catalog.js';

async function activateWithKeyboard(page: Page, locator: Locator) {
  await locator.evaluate((element) => (element as HTMLElement).focus());
  await page.keyboard.press('Space');
}

test('theme action follows the effective OS appearance and explicitly switches either direction', async ({
  page,
  browserName,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');

  const themeButton = page.locator('[data-action="toggle-theme"]');
  const lightBackground = await page
    .locator('body')
    .evaluate((element) => window.getComputedStyle(element).backgroundColor);
  await expect(themeButton).toHaveAttribute('data-theme-preview', 'light');
  await expect(themeButton).toHaveAttribute('aria-label', 'Use dark theme');
  await expect(themeButton).not.toHaveAttribute('aria-pressed', /.*/);

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(themeButton).toHaveAttribute('data-theme-preview', 'dark');
  await expect(themeButton).toHaveAttribute('aria-label', 'Use light theme');
  await expect(themeButton).toContainText('Light');
  await expect(page.locator('html')).not.toHaveClass(/demo-(?:light|dark)/);
  const darkBackground = await page
    .locator('body')
    .evaluate((element) => window.getComputedStyle(element).backgroundColor);
  expect(darkBackground).not.toBe(lightBackground);

  await themeButton.click();
  await expect(themeButton).toHaveAttribute('data-theme-preview', 'light');
  await expect(themeButton).toHaveAttribute('aria-label', 'Use dark theme');
  await expect(themeButton).toContainText('Dark');
  await expect(page.locator('html')).toHaveClass(/demo-light/);
  await expect(page.locator('html')).not.toHaveClass(/demo-dark/);
  await expect(page.locator('.catalog-log')).toHaveText('Light theme on');
  await expect
    .poll(() =>
      page
        .locator('body')
        .evaluate(
          (element) => window.getComputedStyle(element).backgroundColor,
        ),
    )
    .toBe(lightBackground);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/theme-override-light-from-os-dark.png',
      fullPage: true,
    });

  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(themeButton).toHaveAttribute('data-theme-preview', 'light');
  await expect(page.locator('html')).toHaveClass(/demo-light/);
  await expect
    .poll(() =>
      page
        .locator('body')
        .evaluate(
          (element) => window.getComputedStyle(element).backgroundColor,
        ),
    )
    .toBe(lightBackground);

  await page.reload();
  await expect(themeButton).toHaveAttribute('data-theme-preview', 'dark');
  await expect(themeButton).toHaveAttribute('aria-label', 'Use light theme');
  await expect(page.locator('html')).not.toHaveClass(/demo-(?:light|dark)/);

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(themeButton).toHaveAttribute('data-theme-preview', 'light');
  await expect(themeButton).toHaveAttribute('aria-label', 'Use dark theme');
  await themeButton.click();
  await expect(themeButton).toHaveAttribute('data-theme-preview', 'dark');
  await expect(page.locator('html')).toHaveClass(/demo-dark/);
  await expect(page.locator('html')).not.toHaveClass(/demo-light/);
  await expect(page.locator('.catalog-log')).toHaveText('Dark theme on');
  await expect
    .poll(() =>
      page
        .locator('body')
        .evaluate(
          (element) => window.getComputedStyle(element).backgroundColor,
        ),
    )
    .toBe(darkBackground);
  if (browserName === 'chromium') {
    await page.screenshot({
      path: 'test-results/theme-override-dark-from-os-light.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      )
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: 'test-results/theme-override-dark-narrow.png',
      fullPage: true,
    });
  }
});

test('omits the removed command-palette recipe and safely falls back from its stale route', async ({
  page,
  browserName,
}) => {
  const openRemainingRecipes = async (width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await page.goto('/?component=recipe-compact-toolbar');
    const recipes = page
      .locator('.kui-catalog__group')
      .filter({ has: page.getByText('Recipes', { exact: true }) });
    const rows = recipes.locator('[data-component="list-item"]');
    await expect(rows).toHaveCount(10);
    await expect(rows).toHaveText([
      /Desktop application shell/,
      /Navigation sidebar/,
      /Workspace header/,
      /List-detail dialog/,
      /Composer form/,
      /List workspace states/,
      /Compact toolbar choices and actions/,
      /Navigation stack/,
      /Loading inspector/,
      /Collapsible sidebar/,
    ]);
    await expect(
      page.locator('[data-item-id="recipe-command-palette"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-recipe="recipe-command-palette"]'),
    ).toHaveCount(0);
    await rows.last().scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
  };

  await openRemainingRecipes(1100, 900);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/catalog-without-command-palette-wide.png',
    });

  await page.goto('/?component=recipe-command-palette');
  await expect(page.locator('[data-demo="badge"]')).toBeVisible();
  await expect(
    page.locator('[data-recipe="recipe-command-palette"]'),
  ).toHaveCount(0);

  await openRemainingRecipes(390, 844);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/catalog-without-command-palette-narrow.png',
    });
});

test('omits the redundant Web Awesome theme demo and safely falls back from its stale route', async ({
  page,
  browserName,
}) => {
  const verifyRemoved = async (width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.locator('[data-item-id="webawesome-theme"]')).toHaveCount(
      0,
    );
    await expect(page.locator('[data-demo="webawesome-theme"]')).toHaveCount(0);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
  };

  await verifyRemoved(1100, 900);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/catalog-without-webawesome-theme-wide.png',
    });

  await page.goto('/?component=webawesome-theme');
  await expect(page.locator('[data-demo="badge"]')).toBeVisible();
  await expect(page.locator('[data-demo="webawesome-theme"]')).toHaveCount(0);

  await verifyRemoved(390, 844);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/catalog-without-webawesome-theme-narrow.png',
    });
});

test('drills through the navigation-stack recipe with animated push/pop and reduced motion', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto('/?component=recipe-navigation-stack');
  const recipe = page.locator('[data-recipe="recipe-navigation-stack"]');
  await expect(recipe).toBeVisible();
  const nav = recipe.locator('[data-component="nav-stack"]');

  // Root: one entry, no back control; the views ride a transform transition.
  await expect(nav).toHaveAttribute('data-depth', '1');
  await expect(nav.locator('[data-nav-back]')).toHaveCount(0);
  await expect(nav.locator('.kui-nav-stack__view').first()).toHaveCSS(
    'transition-property',
    /transform/,
  );

  await nav.evaluate((element) => {
    const nav = element as HTMLElement;
    const record = () => {
      if (nav.dataset.navChromeTransition === 'true')
        nav.dataset.testSawChromeTransition = 'true';
      const copies = nav.querySelectorAll('[data-nav-chrome-copy]').length;
      const maxCopies = String(
        Math.max(Number(nav.dataset.testMaxChromeCopies ?? 0), copies),
      );
      if (nav.dataset.testMaxChromeCopies !== maxCopies)
        nav.dataset.testMaxChromeCopies = maxCopies;
    };
    new MutationObserver(record).observe(nav, {
      attributeFilter: ['data-nav-chrome-transition'],
      childList: true,
      subtree: true,
    });
    record();
  });

  // Push a detail: back control appears and the title cross-fades to the item.
  await recipe.locator('[data-item-id="layouts"]').click();
  await expect(nav).toHaveAttribute('data-depth', '2');
  await expect(nav.locator('[data-nav-back]')).toBeVisible();
  await expect(
    nav.locator(
      ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy]) .kui-nav-stack__title',
    ),
  ).toHaveText('App layouts');
  await expect(nav).not.toHaveAttribute('data-nav-chrome-transition', 'true');
  await expect(nav).toHaveAttribute('data-test-saw-chrome-transition', 'true');
  await expect(nav).toHaveAttribute('data-test-max-chrome-copies', '1');
  if (browserName === 'chromium')
    await recipe.screenshot({
      path: 'test-results/recipe-navigation-stack.png',
    });

  // Pop via the back control returns to the root.
  await nav.locator('[data-nav-back]').click();
  await expect(nav).toHaveAttribute('data-depth', '1');
  await expect(nav.locator('[data-nav-back]')).toHaveCount(0);
  await expect(
    nav.locator(
      ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy]) .kui-nav-stack__title',
    ),
  ).toHaveText('Library');
  await expect(nav).not.toHaveAttribute('data-nav-chrome-transition', 'true');

  // Reduced motion collapses the slide to instant.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() =>
      nav
        .locator('.kui-nav-stack__view')
        .first()
        .evaluate((el) =>
          Number.parseFloat(window.getComputedStyle(el).transitionDuration),
        ),
    )
    .toBeLessThanOrEqual(0.001);
  await page.emulateMedia({ reducedMotion: null });
});

test('slides the catalog sidebar out and back via a composited transform, not a width animation', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/');

  const shell = page.locator('.kui-catalog');
  const sidebar = page.locator('.kui-catalog__sidebar');
  const collapse = page.locator(
    '[data-action="toggle-catalog-sidebar"][aria-label="Collapse Kerf catalog"]',
  );

  // Expanded: no offset, and the slide rides on a transform transition (so the
  // width can snap instantly while the panel animates — the composited path).
  await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'false');
  await expect(sidebar).toHaveCSS('transform', 'none');
  await expect(sidebar).toHaveCSS('transition-property', /transform/);
  const expandedWidth = await sidebar.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  expect(expandedWidth).toBeGreaterThan(0);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/catalog-sidebar-expanded.png',
    });

  await collapse.click();
  await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'true');

  // Settles at translateX(-100%): the fixed-width panel is shifted fully offscreen
  // by its own width (a negative e-component), then hidden from the tab order.
  await expect
    .poll(() =>
      sidebar.evaluate(
        (element) =>
          new DOMMatrixReadOnly(window.getComputedStyle(element).transform).e,
      ),
    )
    .toBeLessThanOrEqual(-(expandedWidth - 1));
  await expect(sidebar).toHaveCSS('visibility', 'hidden');
  // The detail pane keeps its position; the width change is one instant reflow.
  await expect
    .poll(() =>
      shell.evaluate((element) =>
        window.getComputedStyle(element).gridTemplateColumns.startsWith('0px'),
      ),
    )
    .toBe(true);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/catalog-sidebar-collapsed.png',
    });

  // Expanding restores it: visible again and back to the identity transform.
  await page
    .locator(
      '[data-action="toggle-catalog-sidebar"][aria-label="Expand Kerf catalog"]',
    )
    .click();
  await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'false');
  await expect(sidebar).toHaveCSS('visibility', 'visible');
  await expect
    .poll(() =>
      sidebar.evaluate(
        (element) =>
          new DOMMatrixReadOnly(window.getComputedStyle(element).transform).e,
      ),
    )
    .toBe(0);
});

test('keeps an icon-only control-group wa-button highlight at least square (min-width == height)', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/?component=toolbar-control-group');

  // The highlight lives on the wa-button's shadow `base` part. An icon-only
  // button must not render it as a vertical oval: its width must be >= its
  // height (a circle at the 40px default), while a caret button grows wider.
  const basePart = (sel: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((host) => {
        const base = (
          host as unknown as { shadowRoot: ShadowRoot | null }
        ).shadowRoot?.querySelector('[part~="base"]');
        const r = (base as HTMLElement | null)?.getBoundingClientRect();
        return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null;
      });

  const favorite = await basePart('wa-button[aria-label="Favorite view"]');
  expect(favorite).not.toBeNull();
  expect(favorite!.h).toBeGreaterThan(0);
  expect(favorite!.w).toBeGreaterThanOrEqual(favorite!.h); // square or wider, never a vertical oval
  expect(favorite!.w).toBe(favorite!.h); // icon-only settles to a circle

  const sort = await basePart('wa-button[aria-label="Sort tickets"]');
  expect(sort!.w).toBeGreaterThan(sort!.h); // caret content grows past the square floor

  if (browserName === 'chromium') {
    await page.locator('wa-button[aria-label="Favorite view"]').hover();
    await page
      .locator('.kui-catalog-example', {
        has: page.locator('.kui-list-header:has-text("Button group")'),
      })
      .locator('[data-component="toolbar-control-group"]')
      .screenshot({ path: 'test-results/button-group-highlight.png' });
  }
});

test('hovers a lone control-group button as a whole, but keeps inner highlights in a real group', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });

  // A single-control group: hovering fills the whole pill, not an inner layer
  // inset from the border. The button background stays transparent while the
  // group takes the hover background.
  await page.goto('/?component=toolbar-control-group');
  const soloGroup = page
    .locator('[data-demo="toolbar-control-group"]')
    .locator('.kui-toolbar-control-group[data-single="true"]')
    .filter({ has: page.locator('wa-button[aria-label="Pin view"]') })
    .first();
  const soloButton = soloGroup.locator('wa-button[aria-label="Pin view"]');
  const transparent = 'rgba(0, 0, 0, 0)';
  await soloButton.hover();
  await expect
    .poll(() =>
      soloGroup.evaluate((g) => window.getComputedStyle(g).backgroundColor),
    )
    .not.toBe(transparent);
  if (browserName === 'chromium')
    await soloGroup.screenshot({
      path: 'test-results/toolbar-control-group-solo-hover.png',
    });

  // A genuine multi-button group still highlights the hovered button itself.
  await page.goto('/?component=toolbar-control-group');
  const multiGroup = page
    .locator(
      '.kui-toolbar-control-group[label="View actions"], .kui-toolbar-control-group',
    )
    .filter({ has: page.locator('wa-button[aria-label="Favorite view"]') })
    .first();
  const favorite = multiGroup.locator('wa-button[aria-label="Favorite view"]');
  await favorite.hover();
  await expect
    .poll(() =>
      favorite.evaluate((host) => {
        const base = (
          host as unknown as { shadowRoot: ShadowRoot | null }
        ).shadowRoot?.querySelector('[part~="base"]');
        return base
          ? window.getComputedStyle(base as Element).backgroundColor
          : '';
      }),
    )
    .not.toBe(transparent);
});

test('shows a visible hover background on borderless toolbar-group buttons', async ({
  page,
}) => {
  await page.goto('/?component=toolbar-control-group');
  const group = page
    .locator('[data-demo="toolbar-control-group"]')
    .locator('.kui-toolbar-control-group[data-appearance="borderless"]')
    .filter({ has: page.locator('> button') })
    .first();
  const button = group.locator('> button').first();
  const groupBackground = () =>
    group.evaluate(
      (element) => window.getComputedStyle(element).backgroundColor,
    );
  const transparent = 'rgba(0, 0, 0, 0)';
  // Transparent at rest; a visible neutral tint on hover (not the page surface,
  // which would be invisible on a borderless group). KF-WZDQS8.
  await expect.poll(groupBackground).toBe(transparent);
  await button.hover();
  await expect.poll(groupBackground).not.toBe(transparent);
  await expect.poll(groupBackground).not.toBe('rgb(255, 255, 255)');
});

test('the ToolbarControlGroup demo shape toggle switches every group between pill and rounded', async ({
  page,
}) => {
  await page.goto('/?component=toolbar-control-group');
  const demo = page.locator('[data-demo="toolbar-control-group"]');
  const roundedGroups = demo.locator(
    '.kui-toolbar-control-group[data-shape="rounded"]',
  );
  const exampleCount = await demo
    .locator(':scope > [data-catalog-example]')
    .count();
  const sampleGroup = demo
    .locator('.kui-toolbar-control-group')
    .filter({ has: page.locator('wa-button[aria-label="Pin view"]') })
    .first();

  // Default: every group is pill (22px), none rounded.
  await expect(sampleGroup).toHaveCSS('border-radius', '22px');
  await expect(roundedGroups).toHaveCount(0);

  // Rounded switches every example group (the toggle's own group stays pill).
  await demo.getByRole('button', { name: 'Rounded' }).click();
  await expect(sampleGroup).toHaveCSS('border-radius', '12px');
  await expect(roundedGroups).toHaveCount(exampleCount - 1);

  // And back to pill.
  await demo.getByRole('button', { name: 'Pill' }).click();
  await expect(sampleGroup).toHaveCSS('border-radius', '22px');
  await expect(roundedGroups).toHaveCount(0);
});

test('ToolbarText overflow modes: single-line ellipsis, wrap, and capped line-clamp', async ({
  page,
}) => {
  await page.goto('/?component=toolbar-text');
  const xlargeText = page
    .locator('[data-demo="toolbar-text"] .kui-toolbar-text[data-size="xlarge"]')
    .first()
    .locator('.kui-toolbar-text__text');
  const demos = page.locator('.toolbar-text-overflow-demo .kui-toolbar-text');
  const ellipsis = demos.nth(0);
  const wrap = demos.nth(1);
  const capped = demos.nth(2);
  // The truncation lives on the inner text element (text-overflow is a no-op on
  // the flex box itself).
  const ellipsisText = ellipsis.locator('.kui-toolbar-text__text');
  const cappedText = capped.locator('.kui-toolbar-text__text');

  // The clipped text box still needs real leading around the font's em square.
  // A 1em line box trims descenders in some system fonts even when horizontal
  // ellipsis behavior is correct.
  const xlargeMetrics = await xlargeText.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      fontSize: Number.parseFloat(style.fontSize),
      lineHeight: Number.parseFloat(style.lineHeight),
      renderedHeight: el.getBoundingClientRect().height,
    };
  });
  expect(xlargeMetrics.lineHeight - xlargeMetrics.fontSize).toBeGreaterThan(1);
  expect(xlargeMetrics.renderedHeight).toBeCloseTo(xlargeMetrics.lineHeight, 0);

  // Default: one line, ellipsized (white-space nowrap + text-overflow ellipsis),
  // and the rendered text is actually clipped (scrollWidth exceeds clientWidth).
  await expect(ellipsisText).toHaveCSS('white-space', 'nowrap');
  await expect(ellipsisText).toHaveCSS('text-overflow', 'ellipsis');
  expect(
    await ellipsisText.evaluate((el) => el.scrollWidth - el.clientWidth),
  ).toBeGreaterThan(1);
  const oneLine = await ellipsis.evaluate(
    (el) => el.getBoundingClientRect().height,
  );

  // Wrap: multiple lines, so it is visibly taller than the single-line box.
  await expect(wrap.locator('.kui-toolbar-text__text')).toHaveCSS(
    'white-space',
    'normal',
  );
  const wrapped = await wrap.evaluate(
    (el) => el.getBoundingClientRect().height,
  );
  expect(wrapped).toBeGreaterThan(oneLine);

  // Capped: line-clamp to 2 and shorter than the uncapped wrap of the same text.
  await expect(cappedText).toHaveCSS('-webkit-line-clamp', '2');
  const cappedHeight = await capped.evaluate(
    (el) => el.getBoundingClientRect().height,
  );
  expect(cappedHeight).toBeLessThan(wrapped);
});

test('the FloatingToolbar demo toggles a dark floating toolbar and auto-hides on leave', async ({
  page,
}) => {
  await page.goto('/?component=floating-toolbar');
  const floating = page.locator('.kui-floating-toolbar');
  await expect(floating).toHaveCount(0);

  await page.getByRole('button', { name: 'Show floating toolbar' }).click();
  await expect(floating).toHaveCount(1);
  await expect(floating).toHaveAttribute('role', 'toolbar');
  await expect(floating).toHaveAttribute('data-position', 'bottom-end');
  await expect(floating).toHaveCSS('position', 'absolute');
  await expect(floating).toHaveCSS('color-scheme', 'dark');
  // Inset from the stage edges (past a top toolbar's own 8px), not covering it.
  const insets = await page.evaluate(() => {
    const stage = document
      .querySelector('.floating-toolbar-demo__stage')!
      .getBoundingClientRect();
    const floater = document
      .querySelector('.kui-floating-toolbar')!
      .getBoundingClientRect();
    return {
      right: Math.round(stage.right - floater.right),
      bottom: Math.round(stage.bottom - floater.bottom),
    };
  });
  expect(insets.right).toBeGreaterThan(8);
  expect(insets.bottom).toBeGreaterThan(8);

  // Leaving and returning to the demo auto-hides it.
  await page.goto('/?component=toolbar');
  await page.goto('/?component=floating-toolbar');
  await expect(floating).toHaveCount(0);
});

test('paints a selected wa-button control on ::part(base), not the outer host box', async ({
  page,
}) => {
  await page.goto('/?component=toolbar-control-group');
  // Inject a data-single="false" group with a selected wa-button whose ::part(base)
  // is sized smaller than the 40px host. The selected background/border/shadow must
  // land on part(base) (matching the pill) — not the host, which would overflow the
  // group's rounded border as an oversized square (KF-5BDDQ9).
  const measured = await page.evaluate(async () => {
    const host =
      document.querySelector('.kui-catalog__canvas') ?? document.body;
    const group = document.createElement('div');
    group.className = 'kui-toolbar-control-group';
    group.setAttribute('data-single', 'false');
    group.innerHTML =
      '<wa-button appearance="plain" aria-pressed="true" aria-label="A"><span>A</span></wa-button><wa-button appearance="plain" aria-label="B"><span>B</span></wa-button>';
    host.append(group);
    const selected = group.querySelector(
      'wa-button[aria-pressed="true"]',
    ) as HTMLElement & { updateComplete?: Promise<unknown> };
    await selected.updateComplete;
    const base = selected.shadowRoot?.querySelector(
      '[part~="base"]',
    ) as HTMLElement;
    // Shrink part(base) below the host so a host-painted background would be visibly larger.
    base.style.minWidth = base.style.minHeight = '24px';
    base.style.width = base.style.height = '24px';
    const read = (el: Element) => {
      const style = window.getComputedStyle(el);
      return {
        background: style.backgroundColor,
        shadow: style.boxShadow,
        border: style.borderColor,
      };
    };
    const result = { host: read(selected), base: read(base) };
    group.remove();
    return result;
  });
  const transparent = 'rgba(0, 0, 0, 0)';
  // The visual (part base) carries the selected paint; the host stays clear.
  expect(measured.base.background).not.toBe(transparent);
  expect(measured.base.shadow).not.toBe('none');
  expect(measured.host.background).toBe(transparent);
  expect(measured.host.shadow).toBe('none');
});

test('presents the LucideIcon modes as labeled examples that differ only in semantics', async ({
  page,
}) => {
  await page.goto('/?component=lucide-icon');
  const demo = page.locator('[data-demo="lucide-icon"]');
  await expect(demo).toHaveClass(/kui-catalog-example-stack/);
  const examples = demo.locator('.kui-catalog-example');
  await expect(examples).toHaveCount(2);
  // Each example is a ListHeader label + a note + the icon (left-aligned stack).
  await expect(examples.nth(0).locator('.kui-list-header')).toHaveText(
    /Decorative/,
  );
  await expect(examples.nth(1).locator('.kui-list-header')).toHaveText(
    /Meaningful/,
  );
  await expect(examples.locator('.kui-catalog-example__note')).toHaveCount(2);
  const alignedLeftEdges = await examples.evaluateAll((nodes) =>
    nodes.map((example) => {
      const contentLeft = (selector: string) => {
        const element = example.querySelector(selector)!;
        const bounds = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return (
          bounds.left +
          Number.parseFloat(style.borderLeftWidth) +
          Number.parseFloat(style.paddingLeft)
        );
      };
      return {
        label: contentLeft('.kui-list-header__label'),
        note: contentLeft('.kui-catalog-example__note'),
      };
    }),
  );
  for (const edges of alignedLeftEdges)
    expect(edges.note).toBeCloseTo(edges.label, 1);
  // Both render the same glyph — the difference is semantics, not appearance:
  // the decorative icon is hidden from AT; the meaningful one is labeled.
  await expect(examples.nth(0).locator('svg[data-lucide]')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  await expect(examples.nth(1).locator('svg[data-lucide]')).toHaveAttribute(
    'aria-label',
    'Notifications ready',
  );
  const glyphs = await examples
    .locator('svg[data-lucide]')
    .evaluateAll((nodes) => nodes.map((node) => node.innerHTML));
  expect(glyphs[0]).toBe(glyphs[1]);
});

test('insets a self-bordered control and bare text so their edges line up in a content region', async ({
  page,
}) => {
  await page.goto('/?component=list-inset-control');
  const control = page.locator('[data-component="list-inset-control"]').first();
  await expect(control).toBeVisible();
  // The wrapper is a stretch flex row; its child control fills the row width.
  await expect(control).toHaveCSS('display', 'flex');
  await expect(control).toHaveAttribute('data-sides', 'trbl');
  await expect(control).toHaveCSS('margin-top', '8px');
  const [controlBox, childBox] = await Promise.all([
    control.evaluate((el) => el.getBoundingClientRect().width),
    control
      .locator(':scope > *')
      .first()
      .evaluate((el) => el.getBoundingClientRect().width),
  ]);
  expect(Math.abs(controlBox - childBox)).toBeLessThanOrEqual(0.5);

  await page.goto('/?component=list-inset-text');
  const text = page.locator('[data-component="list-inset-text"]').first();
  await expect(text).toBeVisible();
  // Bare text carries the content-item geometry: 8px inline margin, 1px border, 8px padding.
  await expect(text).toHaveCSS('border-top-width', '1px');
  await expect(text).toHaveCSS('padding-left', '8px');
  await expect(text).toHaveCSS('margin-top', '8px');
  await expect(text).toHaveAttribute('data-sides', 'trbl');

  // horizontalOnly keeps the horizontal inset but drops the vertical box space.
  const tight = page.locator('.kui-list-inset-text--horizontal').first();
  await expect(tight).toBeVisible();
  await expect(tight).toHaveCSS('padding-left', '8px');
  await expect(tight).toHaveCSS('border-left-width', '1px');
  await expect(tight).toHaveCSS('padding-top', '0px');
  await expect(tight).toHaveCSS('border-top-width', '0px');
  await expect(tight).toHaveCSS('margin-top', '0px');
  await expect(tight).toHaveAttribute('data-sides', 'rl');
});

test('applies text and control insets only to selected physical sides', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  const edges = (locator: ReturnType<typeof page.locator>, property: string) =>
    locator.evaluate((element, name) => {
      const style = window.getComputedStyle(element);
      return ['Top', 'Right', 'Bottom', 'Left'].map((side) =>
        parseFloat(
          style.getPropertyValue(`${name}-${side.toLowerCase()}`) ||
            style.getPropertyValue(
              `${name}${side}`.replace(
                /[A-Z]/g,
                (letter) => `-${letter.toLowerCase()}`,
              ),
            ),
        ),
      );
    }, property);

  await page.goto('/?component=row');
  const row = page.locator(
    '[data-demo="row"] [data-text-insets="tbl"][data-control-insets="r"]',
  );
  await expect(row).toHaveAttribute('data-text-insets', 'tbl');
  await expect(row).toHaveAttribute('data-control-insets', 'r');
  expect(await edges(row, 'padding')).toEqual([17, 8, 17, 17]);
  expect(
    await edges(row.locator('[data-control-insets="b"]'), 'padding'),
  ).toEqual([0, 0, 8, 0]);
  if (browserName === 'chromium')
    await row.screenshot({ path: 'test-results/row-selected-insets-wide.png' });

  await page.goto('/?component=list');
  const list = page.locator(
    '[data-demo="list"] [data-text-insets="l"][data-control-insets="rb"]',
  );
  await expect(list).toHaveAttribute('data-text-insets', 'l');
  await expect(list).toHaveAttribute('data-control-insets', 'rb');
  expect(await edges(list, 'padding')).toEqual([0, 8, 8, 17]);
  expect(
    await edges(list.locator('[data-text-insets="t"]'), 'padding'),
  ).toEqual([17, 0, 0, 0]);
  if (browserName === 'chromium')
    await list.screenshot({
      path: 'test-results/list-selected-insets-wide.png',
    });

  await page.goto('/?component=list-inset-text');
  const text = page.locator('[data-demo="list-inset-text"] [data-sides="tbl"]');
  expect(await edges(text, 'margin')).toEqual([8, 0, 8, 8]);
  expect(await edges(text, 'border')).toEqual([1, 0, 1, 1]);
  expect(await edges(text, 'padding')).toEqual([8, 0, 8, 8]);
  if (browserName === 'chromium')
    await text.locator('..').screenshot({
      path: 'test-results/list-inset-text-sides-wide.png',
    });

  await page.goto('/?component=list-inset-control');
  const control = page.locator(
    '[data-demo="list-inset-control"] [data-sides="rb"]',
  );
  expect(await edges(control, 'margin')).toEqual([0, 8, 8, 0]);

  await page.setViewportSize({ width: 390, height: 844 });
  await control.scrollIntoViewIfNeeded();
  expect(await edges(control, 'margin')).toEqual([0, 8, 8, 0]);
  if (browserName === 'chromium')
    await control.locator('..').screenshot({
      path: 'test-results/list-inset-control-sides-narrow.png',
    });

  await page.setViewportSize({ width: 720, height: 900 });
  await page.locator('html').evaluate((element) => {
    element.style.fontSize = '200%';
  });
  expect(await edges(control, 'margin')).toEqual([0, 16, 16, 0]);
  await control.evaluate((element) => element.setAttribute('dir', 'rtl'));
  expect(await edges(control, 'margin')).toEqual([0, 16, 16, 0]);
});

test('computes component geometry overlays from live CSS and leaves composition demos alone', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });

  // A single-component demo: the wrapper card is stripped (transparent) so the
  // component sits on the grid, and the overlay marks each component's outer
  // bound/border edges and non-zero default margins (orange).
  await page.goto('/?component=list-header');
  const canvas = page.locator('.kui-catalog__canvas');
  const stageInner = page.locator('.demo-stage-inner');
  await expect(stageInner).toHaveAttribute('data-demo-mode', 'component');
  const wrapper = page.locator('[data-demo="list-header"]');
  await expect
    .poll(() =>
      wrapper.evaluate((el) => window.getComputedStyle(el).backgroundColor),
    )
    .toBe('rgba(0, 0, 0, 0)');
  const overlay = page.locator('[data-catalog-geometry-overlay]');
  await expect
    .poll(() =>
      overlay
        .locator('.kui-catalog__geometry-bound, .kui-catalog__geometry-border')
        .count(),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() => overlay.locator('.kui-catalog__geometry-margin').count())
    .toBeGreaterThan(0);
  if (browserName === 'chromium')
    await canvas.screenshot({
      path: 'test-results/component-demo-overlay.png',
    });

  // Stylesheet-only changes are enough to refresh both kinds of computed
  // geometry; demo markup and metadata do not need matching measurements.
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = 'geometry-overlay-live-css';
    style.textContent =
      '[data-demo="list-header"] [data-catalog-example] > [data-component="list-header"] { margin-left: 24px !important; border-left: 5px solid red !important; }';
    document.head.append(style);
  });
  const firstMargin = overlay.locator(
    '[data-catalog-geometry-specimen="0"][data-catalog-geometry-side="left"]',
  );
  const firstBorder = overlay.locator(
    '.kui-catalog__geometry-border[data-catalog-geometry-specimen="0"]',
  );
  await expect(firstMargin).toHaveCSS('width', '24px');
  await expect(firstBorder).toHaveCSS('border-left-width', '5px');
  if (browserName === 'chromium')
    await canvas.screenshot({
      path: 'test-results/component-demo-computed-border-overlay.png',
    });
  await page.evaluate(() => {
    document.querySelector<HTMLStyleElement>(
      '#geometry-overlay-live-css',
    )!.textContent =
      '[data-demo="list-header"] [data-catalog-example] > [data-component="list-header"] { margin-left: 36px !important; border-left: 7px solid red !important; }';
  });
  await expect(firstMargin).toHaveCSS('width', '36px');
  await expect(firstBorder).toHaveCSS('border-left-width', '7px');
  await page
    .locator('#geometry-overlay-live-css')
    .evaluate((style) => style.remove());

  // The overlay marks the demoed SPECIMEN, not the example's ListHeader label or
  // note. In a labeled demo the two transparent LucideIcon specimens each get a
  // bound and no margin; the labels (which have their own 8px inline margins and
  // transparent background) must not be marked, so there are exactly two bounds
  // and zero margin bands — not four bounds and label side-bands.
  await page.goto('/?component=lucide-icon');
  await expect(stageInner).toHaveAttribute('data-demo-mode', 'component');
  await expect
    .poll(() => overlay.locator('.kui-catalog__geometry-bound').count())
    .toBe(2);
  await expect
    .poll(() => overlay.locator('.kui-catalog__geometry-margin').count())
    .toBe(0);

  // List is a focused component demo, so its immediate List specimen gets an
  // automatically computed geometry overlay.
  await page.goto('/?component=list');
  await expect(stageInner).toHaveAttribute('data-demo-mode', 'component');
  await expect
    .poll(() =>
      overlay
        .locator(
          '.kui-catalog__geometry-bound, .kui-catalog__geometry-border, .kui-catalog__geometry-margin',
        )
        .count(),
    )
    .toBeGreaterThan(0);
});

test('keeps a toolbar trailing zone flush right when leading and center are empty', async ({
  page,
}) => {
  await page.goto('/?component=toolbar');
  const gaps = await page.evaluate(() => {
    const host =
      document.querySelector('.kui-catalog__canvas') ?? document.body;
    const measure = (hasCenter: string, leading: string): number => {
      const bar = document.createElement('header');
      bar.className = 'kui-toolbar';
      bar.setAttribute('data-has-center', hasCenter);
      bar.style.width = '400px';
      bar.innerHTML = `<div class="kui-toolbar__leading">${leading}</div><div class="kui-toolbar__center"></div><div class="kui-toolbar__trailing"><button type="button" style="width:80px;height:40px">Trailing</button></div>`;
      host.append(bar);
      const barRect = bar.getBoundingClientRect();
      const button = bar
        .querySelector('.kui-toolbar__trailing button')!
        .getBoundingClientRect();
      const paddingRight = Number.parseFloat(
        window.getComputedStyle(bar).paddingRight,
      );
      const gap = barRect.right - button.right - paddingRight;
      bar.remove();
      return Math.round(gap * 10) / 10;
    };
    return {
      emptyLeadingNoCenter: measure('false', ''),
      emptyLeadingWithCenter: measure('true', ''),
      normal: measure('false', '<button type="button">Lead</button>'),
    };
  });
  // The trailing zone sits flush against the toolbar's right padding — no extra
  // gap from an empty leading/center zone (KF-5BEF2M).
  expect(gaps.emptyLeadingNoCenter).toBeLessThanOrEqual(0.5);
  expect(gaps.emptyLeadingWithCenter).toBeLessThanOrEqual(0.5);
  expect(gaps.normal).toBeLessThanOrEqual(0.5);
});

test('aligns the layout demo action buttons with the card border above them', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/?component=layout');
  const surface = page.locator('.demo-layout__surface');
  const primary = page.locator('.demo-layout__actions button').first();
  await expect(surface).toBeVisible();
  const [surfaceLeft, buttonLeft] = await Promise.all([
    surface.evaluate((el) => el.getBoundingClientRect().left),
    primary.evaluate((el) => el.getBoundingClientRect().left),
  ]);
  // The primary action button's border-left aligns with the card border above it.
  expect(Math.abs(buttonLeft - surfaceLeft)).toBeLessThanOrEqual(0.5);
  if (browserName === 'chromium')
    await page
      .locator('[data-demo="layout"]')
      .screenshot({ path: 'test-results/layout-demo-action-alignment.png' });
});

test('links catalog details to their first-party source and existing guidance', async ({
  page,
  browserName,
}) => {
  for (const [
    id,
    name,
    sourcePath,
    componentPath,
    documentationPath,
    guidanceLabel,
    templatePath,
  ] of [
    [
      'toolbar',
      'Toolbar',
      'ui/ux-demo/demos/toolbar.tsx',
      'ui/src/toolbar.tsx',
      'ui/docs/component-selection.md',
      'Guidance',
      'ui/docs/design/templates/toolbar.svg',
    ],
    [
      'recipe-app-shell',
      'Desktop application shell',
      'ui/ux-demo/recipes/app-shell.tsx',
      undefined,
      'ui/docs/recipes.md#desktop-application-shell',
      'Guidance',
      undefined,
    ],
    [
      'wa-button',
      'Button',
      'ui/ux-demo/webawesome-demos.tsx',
      undefined,
      'ui/docs/webawesome-theme.md#coverage',
      'Integration guidance',
      undefined,
    ],
  ] as const) {
    await page.goto(`/?component=${id}`);
    const resources = page.getByRole('group', {
      name: `${name} resources`,
    });
    const source = resources.getByRole('link', {
      name: `${name}: Demo source (opens in new tab)`,
    });
    const componentSource = resources.getByRole('link', {
      name: `${name}: Component source (opens in new tab)`,
    });
    const designTemplate = resources.getByRole('link', {
      name: `${name}: Design template (opens in new tab)`,
    });
    const guidance = resources.getByRole('link', {
      name: `${name}: ${guidanceLabel} (opens in new tab)`,
    });
    if (templatePath) {
      await expect(designTemplate).toHaveAttribute(
        'href',
        catalogRepositoryHref(templatePath),
      );
      await expect(designTemplate).toHaveAttribute('target', '_blank');
      await expect(designTemplate.locator('code')).toHaveText(templatePath);
    } else {
      await expect(designTemplate).toHaveCount(0);
    }
    await expect(source).toHaveAttribute(
      'href',
      catalogRepositoryHref(sourcePath),
    );
    await expect(guidance).toHaveAttribute(
      'href',
      catalogRepositoryHref(documentationPath),
    );
    const links = componentPath
      ? [source, componentSource, guidance]
      : [source, guidance];
    for (const link of links) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    if (componentPath) {
      await expect(componentSource).toHaveAttribute(
        'href',
        catalogRepositoryHref(componentPath),
      );
      await expect(componentSource.locator('code')).toHaveText(componentPath);
    } else {
      await expect(componentSource).toHaveCount(0);
    }
    await expect(source.locator('code')).toHaveText(sourcePath);
    await expect(guidance.locator('code')).toHaveText(documentationPath);
  }

  for (const layout of [
    { name: 'wide', width: 1440, height: 900, rootFontSize: '' },
    { name: 'narrow', width: 390, height: 844, rootFontSize: '' },
    { name: 'narrow-recipe', width: 390, height: 844, rootFontSize: '' },
    { name: 'zoom-200', width: 720, height: 900, rootFontSize: '200%' },
  ] as const) {
    const isRecipe =
      layout.name === 'narrow-recipe' || layout.name === 'zoom-200';
    await page.setViewportSize({ width: layout.width, height: layout.height });
    await page.goto(
      `/?component=${isRecipe ? 'recipe-list-detail-dialog' : 'toolbar'}`,
    );
    if (layout.rootFontSize)
      await page.locator('html').evaluate((element, size) => {
        element.style.fontSize = size;
      }, layout.rootFontSize);
    const resources = page.getByRole('group', {
      name: `${isRecipe ? 'List-detail dialog' : 'Toolbar'} resources`,
    });
    const source = resources
      .locator('[data-component="toolbar-action-link"]')
      .first();
    const guidance = resources
      .locator('[data-component="toolbar-action-link"]')
      .last();
    await expect(resources).toBeVisible();
    await source.focus();
    await expect(source).toBeFocused();
    const geometry = await page.evaluate(() => ({
      documentOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      resourceOverflowX: window.getComputedStyle(
        document.querySelector<HTMLElement>(
          '.kui-catalog__footer .kui-toolbar-control-group[data-overflow="scroll"]',
        )!,
      ).overflowX,
      footerSections: [
        ...document.querySelectorAll<HTMLElement>(
          '.kui-catalog__footer .kui-toolbar__leading, .kui-catalog__footer .kui-toolbar__trailing',
        ),
      ].map((section) => ({
        top: section.getBoundingClientRect().top,
        bottom: section.getBoundingClientRect().bottom,
        left: section.getBoundingClientRect().left,
        right: section.getBoundingClientRect().right,
        width: section.getBoundingClientRect().width,
      })),
      links: [
        ...document.querySelectorAll<HTMLElement>(
          '.kui-catalog__footer [data-component="toolbar-action-link"]',
        ),
      ].map((link) => {
        const linkRect = link.getBoundingClientRect();
        const hiddenLabelRect = link
          .querySelector<HTMLElement>('code')!
          .getBoundingClientRect();
        return {
          height: linkRect.height,
          hiddenLabelInlineOffset: Math.abs(
            hiddenLabelRect.left - linkRect.left,
          ),
          hiddenLabelWidth: hiddenLabelRect.width,
          outlineStyle: window.getComputedStyle(link).outlineStyle,
        };
      }),
    }));
    expect(geometry.documentOverflow).toBeLessThanOrEqual(1);
    expect(geometry.resourceOverflowX).toBe('auto');
    for (const section of geometry.footerSections) {
      expect(section.left).toBeGreaterThanOrEqual(-1);
      expect(section.right).toBeLessThanOrEqual(layout.width + 1);
      expect(section.width).toBeGreaterThan(0);
    }
    // A recipe (list-detail-dialog) links demo source + guidance; a component
    // (toolbar) also links its component source and its design template.
    expect(geometry.links).toHaveLength(isRecipe ? 2 : 4);
    for (const link of geometry.links) {
      expect(link.height).toBeGreaterThanOrEqual(30);
      expect(link.hiddenLabelInlineOffset).toBeLessThanOrEqual(1);
      expect(link.hiddenLabelWidth).toBeLessThanOrEqual(1);
    }
    if (layout.name.startsWith('narrow'))
      expect(geometry.footerSections[0].bottom).toBeLessThanOrEqual(
        geometry.footerSections[1].top + 1,
      );
    expect(geometry.links[0].outlineStyle).not.toBe('none');
    await expect(guidance).toBeVisible();
    if (browserName === 'chromium') {
      await page.screenshot({
        path: `test-results/catalog-resource-links-${layout.name}.png`,
        fullPage: true,
      });
    }
  }
});

test('loads the Web Awesome specimen bundle only when a matching route needs it', async ({
  page,
}) => {
  await page.goto('/?component=lucide-icon');
  await expect(page.locator('[data-demo="lucide-icon"]')).toBeVisible();
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .some((entry) => entry.name.includes('webawesome-demos-')),
    ),
  ).toBe(false);

  await page.locator('[data-action="toggle-webawesome-catalog"]').click();
  await page.locator('[data-item-id="wa-button"]').click();
  await expect(page.locator('[data-demo="wa-button"]')).toBeVisible();
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .some((entry) => entry.name.includes('webawesome-demos-')),
    ),
  ).toBe(true);

  await page.goto('/?component=wa-input');
  await expect(page.locator('[data-demo="wa-input"]')).toBeVisible();
  await expect(page.locator('[data-item-id="wa-input"]')).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('loads component-reachable package CSS through browser subpaths', async ({
  page,
}) => {
  await page.goto('/?component=toolbar');
  await expect(page.locator('[data-component="toolbar"]').first()).toHaveCSS(
    'display',
    'grid',
  );
  expect(
    await page
      .locator(':root')
      .evaluate((root) =>
        window
          .getComputedStyle(root)
          .getPropertyValue('--kui-color-text')
          .trim(),
      ),
  ).not.toBe('');

  await page.goto('/?component=empty-state');
  await expect(
    page.locator('[data-component="empty-state"]').first(),
  ).toHaveCSS('display', 'grid');
  await expect(
    page.locator('[data-component="empty-state"] .kui-loading-spinner'),
  ).toHaveCSS('display', 'block');
});

test('sizes and rotates the first-class disclosure arrow while Select keeps its independent half scale', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?component=disclosure-arrow');
  const demo = page.locator('[data-demo="disclosure-arrow"]');
  const button = demo.locator('[data-action="toggle-disclosure"]');
  const customButton = demo.locator('[data-action="toggle-custom-disclosure"]');
  const arrow = button.locator('[data-component="disclosure-arrow"]');
  const customArrow = customButton.locator(
    '[data-component="disclosure-arrow"]',
  );
  const arrowSize = () =>
    arrow.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return { width: bounds.width, height: bounds.height };
    });
  const labelsContained = () =>
    demo.evaluate((element) =>
      [...element.querySelectorAll('button')].every((control) => {
        const controlBounds = control.getBoundingClientRect();
        const labelBounds = control
          .querySelector('span:last-child')!
          .getBoundingClientRect();
        return (
          labelBounds.left >= controlBounds.left &&
          labelBounds.right <= controlBounds.right &&
          labelBounds.top >= controlBounds.top &&
          labelBounds.bottom <= controlBounds.bottom
        );
      }),
    );

  await expect(arrow).toHaveAttribute('data-open', 'false');
  await expect(arrow).toHaveAttribute('data-direction', 'right');
  await expect(arrow).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(button).toHaveAccessibleName('Details');
  expect(await arrowSize()).toEqual({ width: 18, height: 18 });
  if (browserName === 'chromium')
    await button.screenshot({
      path: 'test-results/disclosure-arrow-default-18px.png',
    });
  await expect(customButton).toHaveAttribute('aria-expanded', 'false');
  await expect(customButton).toHaveAccessibleName('Preview');
  await expect(customArrow).toHaveAttribute('data-direction', 'left');
  await expect(
    customArrow.locator('[data-lucide="arrow-right"]'),
  ).toBeVisible();
  await expect(customArrow).toHaveCSS(
    'transform',
    'matrix(-1, 0, 0, -1, 0, 0)',
  );
  expect(await labelsContained()).toBe(true);
  if (browserName === 'chromium')
    await demo.screenshot({
      path: 'test-results/disclosure-arrow-replacement-wide.png',
    });

  await arrow.evaluate((element) => {
    (element as HTMLElement).style.setProperty(
      '--kui-disclosure-arrow-size',
      '2rem',
    );
  });
  expect(await arrowSize()).toEqual({ width: 32, height: 32 });
  await arrow.evaluate((element) => {
    (element as HTMLElement).style.removeProperty(
      '--kui-disclosure-arrow-size',
    );
  });
  expect(await arrowSize()).toEqual({ width: 18, height: 18 });

  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(arrow).toHaveAttribute('data-open', 'true');
  await expect(arrow).toHaveAttribute('data-direction', 'down');
  await expect
    .poll(async () =>
      arrow.evaluate((element) => window.getComputedStyle(element).transform),
    )
    .toBe('matrix(0, 1, -1, 0, 0, 0)');
  await expect(customButton).toHaveAttribute('aria-expanded', 'false');
  if (browserName === 'chromium')
    await button.screenshot({ path: 'test-results/disclosure-arrow-open.png' });

  await page.locator('html').evaluate((element) => {
    element.style.setProperty('--kui-disclosure-arrow-duration', '10s');
  });
  await customButton.click();
  await expect(customButton).toHaveAttribute('aria-expanded', 'true');
  await expect(customButton).toHaveAccessibleName('Preview');
  await expect(customArrow).toHaveAttribute('data-open', 'true');
  await expect(customArrow).toHaveAttribute('data-direction', 'up');
  await expect
    .poll(
      async () =>
        customArrow.evaluate((element) =>
          element
            .getAnimations()
            .some(
              (animation) =>
                animation instanceof CSSTransition &&
                animation.transitionProperty === 'transform',
            ),
        ),
      { message: 'Expected a transform transition' },
    )
    .toBe(true);
  const midpoint = await customArrow.evaluate((element) => {
    const transition = element
      .getAnimations()
      .find(
        (animation) =>
          animation instanceof CSSTransition &&
          animation.transitionProperty === 'transform',
      );
    if (!transition) throw new Error('Expected a transform transition');
    transition.pause();
    transition.effect?.updateTiming({ easing: 'linear' });
    const duration = transition.effect?.getComputedTiming().duration;
    if (typeof duration !== 'number')
      throw new Error('Expected a finite transform transition');
    transition.currentTime = duration / 2;
    const { a, b, c, d } = new DOMMatrixReadOnly(
      window.getComputedStyle(element).transform,
    );
    return { a, b, c, d };
  });
  expect(midpoint.a).toBeCloseTo(-Math.SQRT1_2, 2);
  expect(midpoint.b).toBeCloseTo(-Math.SQRT1_2, 2);
  expect(midpoint.c).toBeCloseTo(Math.SQRT1_2, 2);
  expect(midpoint.d).toBeCloseTo(-Math.SQRT1_2, 2);
  if (browserName === 'chromium')
    await customButton.screenshot({
      path: 'test-results/disclosure-arrow-replacement-mid-clockwise.png',
    });
  await customArrow.evaluate((element) => {
    element.getAnimations().forEach((animation) => animation.finish());
  });
  await page
    .locator('html')
    .evaluate((element) =>
      element.style.removeProperty('--kui-disclosure-arrow-duration'),
    );
  await expect
    .poll(async () =>
      customArrow.evaluate(
        (element) => window.getComputedStyle(element).transform,
      ),
    )
    .toBe('matrix(0, -1, 1, 0, 0, 0)');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.catalog-log')).toHaveText(
    'Custom disclosure opened',
  );

  await customButton.press('Space');
  await expect(customButton).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.catalog-log')).toHaveText(
    'Custom disclosure closed',
  );
  await customButton.press('Enter');
  await expect(customButton).toHaveAttribute('aria-expanded', 'true');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.catalog-log')).toHaveText(
    'Custom disclosure opened',
  );
  await expect
    .poll(async () =>
      customArrow.evaluate(
        (element) => window.getComputedStyle(element).transform,
      ),
    )
    .toBe('matrix(0, -1, 1, 0, 0, 0)');
  await expect(customButton).toBeFocused();
  if (browserName === 'chromium')
    await demo.screenshot({
      path: 'test-results/disclosure-arrow-replacement-focused-open-context.png',
    });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await demo.evaluate((element) =>
      window.getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/),
    ),
  ).toHaveLength(1);
  if (browserName === 'chromium')
    await demo.screenshot({
      path: 'test-results/disclosure-arrow-replacement-narrow-stable.png',
    });

  await page.setViewportSize({ width: 720, height: 900 });
  await page.locator('html').evaluate((element) => {
    element.style.fontSize = '200%';
  });
  expect(await arrowSize()).toEqual({ width: 36, height: 36 });
  const zoomGeometry = await demo.evaluate((element) => ({
    columns: window
      .getComputedStyle(element)
      .gridTemplateColumns.trim()
      .split(/\s+/).length,
    labelsContained: [...element.querySelectorAll('button')].every(
      (control) => {
        const controlBounds = control.getBoundingClientRect();
        const labelBounds = control
          .querySelector('span:last-child')!
          .getBoundingClientRect();
        return (
          labelBounds.left >= controlBounds.left &&
          labelBounds.right <= controlBounds.right &&
          labelBounds.top >= controlBounds.top &&
          labelBounds.bottom <= controlBounds.bottom
        );
      },
    ),
  }));
  expect(zoomGeometry).toEqual({ columns: 1, labelsContained: true });
  if (browserName === 'chromium') {
    await button.screenshot({
      path: 'test-results/disclosure-arrow-default-zoom-200.png',
    });
    await demo.screenshot({
      path: 'test-results/disclosure-arrow-replacement-zoom-200.png',
    });
  }

  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=select');
  const select = page.locator('[data-demo="select"] wa-select').first();
  const selectDisclosure = () =>
    select.evaluate((element) => {
      const icon = element.shadowRoot?.querySelector<HTMLElement>(
        '[part~="expand-icon"]',
      );
      const bounds = icon?.getBoundingClientRect();
      return icon
        ? {
            height: bounds!.height,
            transform: window.getComputedStyle(icon).transform,
            token: window
              .getComputedStyle(element)
              .getPropertyValue('--kui-disclosure-icon-scale')
              .trim(),
            width: bounds!.width,
          }
        : null;
    });
  const selectDisclosureAt100 = await selectDisclosure();
  expect(Number.parseFloat(selectDisclosureAt100?.token ?? '')).toBe(0.5);
  expect(selectDisclosureAt100?.transform).toMatch(
    /^matrix\(0\.5, 0, 0, 0\.5,/,
  );
  expect(selectDisclosureAt100?.width).toBeCloseTo(10, 4);
  expect(selectDisclosureAt100?.height).toBeCloseTo(8, 4);

  await page.locator('html').evaluate((element) => {
    element.style.fontSize = '200%';
  });
  const selectDisclosureAt200 = await selectDisclosure();
  expect(Number.parseFloat(selectDisclosureAt200?.token ?? '')).toBe(0.5);
  expect(selectDisclosureAt200?.transform).toMatch(
    /^matrix\(0\.5, 0, 0, 0\.5,/,
  );
  expect(selectDisclosureAt200?.width).toBeCloseTo(
    selectDisclosureAt100!.width * 2,
    4,
  );
  expect(selectDisclosureAt200?.height).toBeCloseTo(
    selectDisclosureAt100!.height * 2,
    4,
  );
  if (browserName === 'chromium')
    await select.screenshot({
      path: 'test-results/select-disclosure-half-scale-zoom-200.png',
    });
});

test('applies shared pane and content-item geometry across responsive and 200% zoom layouts', async ({
  page,
  browserName,
}) => {
  const cases = [
    { name: 'wide', width: 1440, height: 900, rootFontSize: '', scale: 1 },
    {
      name: 'intermediate',
      width: 900,
      height: 900,
      rootFontSize: '',
      scale: 1,
    },
    { name: 'narrow', width: 390, height: 844, rootFontSize: '', scale: 1 },
    {
      name: 'zoom-200',
      width: 720,
      height: 900,
      rootFontSize: '200%',
      scale: 2,
    },
  ] as const;

  for (const layout of cases) {
    await page.setViewportSize({ width: layout.width, height: layout.height });
    await page.goto('/?component=layout');
    if (layout.rootFontSize)
      await page.locator('html').evaluate((element, size) => {
        element.style.fontSize = size;
      }, layout.rootFontSize);
    if (layout.name === 'intermediate' || layout.name === 'zoom-200')
      await page.locator('[data-action="toggle-theme"]').click();

    const geometry = await page.evaluate(() => {
      const number = (selector: string, property: string) =>
        parseFloat(
          window
            .getComputedStyle(document.querySelector(selector)!)
            .getPropertyValue(property),
        );
      return {
        panePadding: number(
          '[data-demo="layout"] [data-component="pane"]',
          'padding-left',
        ),
        contentGap: number(
          '[data-demo="layout"] .kui-pane__content',
          'row-gap',
        ),
        itemMargin: number(
          '[data-demo="layout"] .kui-content-item',
          'margin-left',
        ),
        itemPadding: number(
          '[data-demo="layout"] .kui-content-item',
          'padding-left',
        ),
        itemBorder: number(
          '[data-demo="layout"] .kui-content-item',
          'border-left-width',
        ),
        itemRadius: number(
          '[data-demo="layout"] .kui-content-item',
          'border-top-left-radius',
        ),
        scrollOwners: document.querySelectorAll(
          '.kui-catalog__sidebar .kui-pane__content',
        ).length,
        sidebarOverflow: window.getComputedStyle(
          document.querySelector<HTMLElement>(
            '.kui-catalog__sidebar .kui-pane__content',
          )!,
        ).overflowY,
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      };
    });
    expect(geometry).toMatchObject({
      panePadding: 0,
      contentGap: 24 * layout.scale,
      itemMargin: 8 * layout.scale,
      itemPadding: 8 * layout.scale,
      itemBorder: 1,
      itemRadius: 1 + 11 * layout.scale,
      scrollOwners: 1,
      sidebarOverflow: 'auto',
    });
    expect(geometry.horizontalOverflow).toBeLessThanOrEqual(1);
    await expect(
      page.locator('.kui-catalog__items [data-component="list-item"]').first(),
    ).toHaveAttribute('data-multiline', 'true');

    if (browserName === 'chromium')
      await page.screenshot({
        path: `test-results/layout-${layout.name}.png`,
        fullPage: true,
      });
  }
  const pane = page.locator('[data-demo="layout"] [data-component="pane"]');
  await expect(pane).toHaveClass(/kui-pane/);
  await expect(pane.locator('.kui-pane__content')).toHaveClass(/kui-content/);
});

test('scrolls the complete catalog sidebar and detail at wide and narrow sizes', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 360 });
  await page.goto('/?component=wa-zoomable-frame');

  const sidebarScroll = page.locator(
    '.kui-catalog__sidebar .kui-pane__content',
  );
  const detailScroll = page.locator(
    '.kui-catalog__detail > .kui-pane > .kui-pane__content',
  );
  for (const scrollOwner of [sidebarScroll, detailScroll]) {
    const range = await scrollOwner.evaluate(
      (element) => element.scrollHeight - element.clientHeight,
    );
    expect(range).toBeGreaterThan(0);
    await scrollOwner.evaluate((element) =>
      element.scrollTo(0, element.scrollHeight),
    );
    await expect
      .poll(() =>
        scrollOwner.evaluate(
          (element) =>
            element.scrollTop + element.clientHeight - element.scrollHeight,
        ),
      )
      .toBeGreaterThanOrEqual(-1);
  }
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/catalog-scroll-bottom-wide.png',
    });

  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/?component=wa-zoomable-frame');
  const documentRange = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  expect(documentRange).toBeGreaterThan(0);
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.scrollY +
          window.innerHeight -
          document.documentElement.scrollHeight,
      ),
    )
    .toBeGreaterThanOrEqual(-1);
  await expect(page.locator('.kui-catalog__footer')).toBeInViewport();
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/catalog-scroll-bottom-narrow.png',
    });
});

test('tiles the catalog checkerboard through below-fold preview content', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto('/?component=row');

  const detailScroll = page.locator('.kui-catalog__detail-preview');
  const wideGeometry = await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('.kui-catalog__stage')!;
    const scrollOwner = document.querySelector<HTMLElement>(
      '.kui-catalog__detail-preview',
    )!;
    return {
      stageHeight: stage.offsetHeight,
      stageContentHeight: stage.scrollHeight,
      viewportHeight: scrollOwner.clientHeight,
      scrollHeight: scrollOwner.scrollHeight,
    };
  });
  expect(wideGeometry.stageHeight).toBeGreaterThan(wideGeometry.viewportHeight);
  expect(
    Math.abs(wideGeometry.stageHeight - wideGeometry.stageContentHeight),
  ).toBeLessThanOrEqual(1);
  expect(wideGeometry.scrollHeight).toBe(wideGeometry.stageContentHeight);
  await detailScroll.evaluate((element) =>
    element.scrollTo(0, element.scrollHeight),
  );
  await expect
    .poll(() =>
      detailScroll.evaluate(
        (element) =>
          element.scrollTop + element.clientHeight - element.scrollHeight,
      ),
    )
    .toBeGreaterThanOrEqual(-1);

  const wideBottomGeometry = await page.evaluate(() => {
    const stage = document
      .querySelector<HTMLElement>('.kui-catalog__stage')!
      .getBoundingClientRect();
    const scrollOwner = document
      .querySelector<HTMLElement>('.kui-catalog__detail-preview')!
      .getBoundingClientRect();
    return {
      stageBottom: stage.bottom,
      scrollOwnerBottom: scrollOwner.bottom,
    };
  });
  expect(
    Math.abs(
      wideBottomGeometry.stageBottom - wideBottomGeometry.scrollOwnerBottom,
    ),
  ).toBeLessThanOrEqual(1);

  const wideBox = await detailScroll.boundingBox();
  if (!wideBox) throw new Error('Missing wide catalog preview bounds');
  const widePixelY = Math.floor(wideBox.y + wideBox.height / 2);
  const widePixelX = Math.floor(wideBox.x + wideBox.width - 48);
  const wideLightTile = await page.screenshot({
    clip: { x: widePixelX, y: widePixelY, width: 1, height: 1 },
  });
  const wideDarkTile = await page.screenshot({
    clip: { x: widePixelX + 12, y: widePixelY, width: 1, height: 1 },
  });
  expect(wideLightTile.equals(wideDarkTile)).toBe(false);

  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/catalog-checkerboard-below-fold-wide.png',
    });

  await expect(detailScroll).toHaveCSS('background-repeat', 'repeat');
  await expect(detailScroll).toHaveCSS('background-size', '24px 24px');
  const backgroundImage = await detailScroll.evaluate(
    (element) => window.getComputedStyle(element).backgroundImage,
  );
  expect(backgroundImage).toContain('data:image/svg+xml');
  expect(backgroundImage).not.toContain('linear-gradient');

  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/?component=row');
  await page
    .locator('.kui-catalog__stage')
    .evaluate((element) => element.scrollIntoView({ block: 'end' }));
  await expect(page.locator('.kui-catalog__stage')).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  const narrowStage = await page.locator('.kui-catalog__stage').boundingBox();
  if (!narrowStage) throw new Error('Missing narrow catalog stage bounds');
  const narrowPixelY = Math.floor(narrowStage.y + narrowStage.height - 48);
  const narrowLightTile = await page.screenshot({
    clip: { x: narrowStage.x + 6, y: narrowPixelY, width: 1, height: 1 },
  });
  const narrowDarkTile = await page.screenshot({
    clip: { x: narrowStage.x + 18, y: narrowPixelY, width: 1, height: 1 },
  });
  expect(narrowLightTile.equals(narrowDarkTile)).toBe(false);

  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/catalog-checkerboard-below-fold-narrow.png',
    });
});

test('reveals controlled Catalog selections only in the desktop sidebar without moving focus', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as Window & { __catalogRevealCalls?: string[] };
    state.__catalogRevealCalls = [];
    const scrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options): void {
      state.__catalogRevealCalls!.push(
        (this as HTMLElement).dataset.itemId ?? '',
      );
      scrollIntoView.call(this, options);
    };
  });
  await page.setViewportSize({ width: 1200, height: 600 });
  await page.goto('/?component=wa-zoomable-frame');

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __catalogRevealCalls?: string[] })
            .__catalogRevealCalls ?? [],
      ),
    )
    .toContain('wa-zoomable-frame');
  const theme = page.locator('[data-action="toggle-theme"]');
  await theme.focus();
  await page
    .locator('[data-item-id="toolbar"]')
    .evaluate((element) =>
      element.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    );
  await expect(page.locator('[data-item-id="toolbar"]')).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __catalogRevealCalls?: string[] })
            .__catalogRevealCalls ?? [],
      ),
    )
    .toContain('toolbar');
  await expect(theme).toBeFocused();

  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto('/?component=wa-zoomable-frame');
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => resolve()),
        ),
      ),
  );
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __catalogRevealCalls?: string[] })
          .__catalogRevealCalls ?? [],
    ),
  ).toEqual([]);
});

test('routes the generated application-layout composition at wide and narrow sizes', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=layout');
  const demo = page.locator('[data-demo="layout"]');
  await expect(demo).toBeVisible();
  await expect(page.locator('[data-item-id="layout"]')).toHaveAttribute(
    'aria-current',
    'page',
  );
  const wideGap = Number.parseFloat(
    await demo
      .locator('.kui-content')
      .evaluate((element) => window.getComputedStyle(element).rowGap),
  );
  await demo.getByRole('button', { name: 'Primary action' }).click();
  await expect(page.locator('.catalog-log')).toHaveText('Add action requested');
  if (browserName === 'chromium') {
    await page.screenshot({
      path: 'test-results/component-catalog-layout-wide.png',
      fullPage: true,
    });
    await demo.screenshot({
      path: 'test-results/layout-new-item-alignment-after.png',
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  const narrowGap = Number.parseFloat(
    await demo
      .locator('.kui-content')
      .evaluate((element) => window.getComputedStyle(element).rowGap),
  );
  expect(narrowGap).toBe(wideGap);
  await expect(
    demo.getByRole('button', { name: 'Secondary action' }),
  ).toBeVisible();
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/component-catalog-layout-narrow.png',
      fullPage: true,
    });
});

test('uses a collapsible pane shell, toolbar page chrome, and opt-in floating recipe notes', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=recipe-app-shell');

  const shell = page.locator('.kui-catalog');
  const sidebar = page.locator('.kui-catalog__sidebar');
  const pageHeader = page.locator('.kui-catalog__header');
  const stage = page.locator('.kui-catalog__stage');
  const footer = page.locator('.kui-catalog__footer');
  const note = stage.locator('.recipe-component__ownership');

  await expect(
    sidebar.getByRole('heading', { level: 1, name: 'Kerf' }),
  ).toBeVisible();
  await expect(
    sidebar.getByText('UI components', { exact: true }),
  ).toBeVisible();
  await expect(
    sidebar.getByText('Production catalog', { exact: true }),
  ).toHaveCount(0);
  await expect(
    pageHeader.locator(':scope > [data-component="toolbar"]'),
  ).toBeVisible();
  await expect(
    pageHeader.getByRole('heading', {
      level: 2,
      name: 'Desktop application shell',
    }),
  ).toBeVisible();
  await expect(pageHeader.getByText('Recipes', { exact: true })).toHaveCount(0);
  await expect(
    footer.getByRole('group', {
      name: 'Desktop application shell resources',
    }),
  ).toBeVisible();
  await expect(footer.locator('.catalog-log')).toHaveText('Catalog ready');
  await expect(note).toBeHidden();
  await expect(page.locator('.demo-stage-inner')).toHaveAttribute(
    'data-recipe-notes-visible',
    'false',
  );

  const shellGeometry = await page.evaluate(() => {
    const style = (selector: string) =>
      window.getComputedStyle(document.querySelector<HTMLElement>(selector)!);
    const previewStyle = style('.kui-catalog__detail-preview');
    return {
      headerBackground: style('.kui-catalog__header').backgroundColor,
      headerBorder: Number.parseFloat(
        style('.kui-catalog__header').borderBottomWidth,
      ),
      previewBackgroundImage: previewStyle.backgroundImage,
      footerBackground: style('.kui-catalog__footer').backgroundColor,
      footerBorder: Number.parseFloat(
        style('.kui-catalog__footer').borderTopWidth,
      ),
    };
  });
  expect(shellGeometry.headerBackground).not.toBe('rgba(0, 0, 0, 0)');
  expect(shellGeometry.headerBorder).toBe(1);
  expect(shellGeometry.previewBackgroundImage).toContain('data:image/svg+xml');
  expect(shellGeometry.footerBackground).not.toBe('rgba(0, 0, 0, 0)');
  expect(shellGeometry.footerBorder).toBe(1);

  await page.getByRole('button', { name: 'Show recipe notes' }).click();
  await expect(page.locator('.demo-stage-inner')).toHaveAttribute(
    'data-recipe-notes-visible',
    'true',
  );
  await expect(note).toBeVisible();
  await expect(note).toHaveCSS('position', 'absolute');
  await expect(page.locator('.catalog-log')).toHaveText('Recipe notes shown');

  await page.getByRole('button', { name: 'Collapse Kerf catalog' }).click();
  await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'true');
  await expect(sidebar).toBeHidden();
  await expect(
    pageHeader.getByRole('button', { name: 'Expand Kerf catalog' }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        (await page.locator('.kui-catalog__detail').boundingBox())?.x ?? -1,
    )
    .toBeLessThanOrEqual(1);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/catalog-application-shell-collapsed-wide.png',
      fullPage: true,
    });
  await page.getByRole('button', { name: 'Expand Kerf catalog' }).click();
  await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'false');
  await expect(sidebar).toBeVisible();
  await expect(
    sidebar.getByRole('navigation', { name: 'Kerf components' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      sidebar.evaluate((element) => window.getComputedStyle(element).transform),
    )
    .toBe('none');

  if (browserName === 'chromium') {
    await page.screenshot({
      path: 'test-results/catalog-application-shell-wide.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: 'test-results/catalog-application-shell-narrow.png',
      fullPage: true,
    });
  }
});

test('aligns a heading-toolbar trailing action with the following content-item border', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=layout');
  const demo = page.locator('[data-demo="layout"]');
  const action = demo.locator(
    '[data-component="pane"] > .kui-pane__header .kui-toolbar__trailing [data-component="toolbar-control-group"]',
  );
  const following = demo.locator(
    '[data-component="pane"] > .kui-pane__header + .kui-pane__content > .kui-content-item',
  );
  await expect(action).toHaveCount(1);
  await expect(following).toHaveCount(2);
  const [actionBox, followingBox] = await Promise.all([
    action.boundingBox(),
    following.first().boundingBox(),
  ]);
  expect(actionBox).not.toBeNull();
  expect(followingBox).not.toBeNull();
  // The toolbar's 8px trailing padding and the content-item's 8px inline margin
  // align the control-group and content-item outer borders.
  expect(actionBox!.x + actionBox!.width).toBeCloseTo(
    followingBox!.x + followingBox!.width,
    0,
  );
});

test('renders the header composition as two toolbars over a value table', async ({
  page,
  browserName,
}) => {
  const cases = [
    {
      name: 'wide',
      width: 1440,
      height: 900,
      rootFontSize: '',
      direction: 'ltr',
      scale: 1,
    },
    {
      name: 'narrow',
      width: 390,
      height: 844,
      rootFontSize: '',
      direction: 'ltr',
      scale: 1,
    },
    {
      name: 'rtl',
      width: 1100,
      height: 760,
      rootFontSize: '',
      direction: 'rtl',
      scale: 1,
    },
    {
      name: 'zoom-200',
      width: 720,
      height: 900,
      rootFontSize: '200%',
      direction: 'ltr',
      scale: 2,
    },
  ] as const;

  for (const layout of cases) {
    await page.setViewportSize({ width: layout.width, height: layout.height });
    await page.goto('/?component=headers');
    await page.locator('html').evaluate((element, settings) => {
      (element as HTMLElement).dir = settings.direction;
      element.style.fontSize = settings.rootFontSize;
    }, layout);

    const demo = page.locator('[data-demo="headers"]');
    // Two heading toolbars (a page title and an icon+subtitle panel heading)
    // and one value table, each within the frame and with no page overflow.
    await expect(demo.locator('[data-component="toolbar"]')).toHaveCount(2);
    await expect(
      demo.locator(
        '.kui-toolbar__leading > [data-component="toolbar-control-group"] svg',
      ),
    ).toHaveCount(1);
    await expect(demo.locator('.kui-value-table')).toHaveCount(1);
    const summary = demo.locator('[data-component="list-inset-text"]');
    await expect(summary).toHaveText(
      'Production-backed primitives with explicit contracts.',
    );
    const geometry = await demo.evaluate((element) => {
      const frame = element.getBoundingClientRect();
      const summaryElement = element.querySelector<HTMLElement>(
        '[data-component="list-inset-text"]',
      )!;
      const summaryRange = document.createRange();
      summaryRange.selectNodeContents(summaryElement);
      const summary = summaryRange.getBoundingClientRect();
      const children = [
        ...element.querySelectorAll<HTMLElement>(
          '[data-component="toolbar"], .kui-value-table',
        ),
      ].map((child) => child.getBoundingClientRect());
      return {
        withinFrame: children.every(
          (child) =>
            child.left >= frame.left - 1 && child.right <= frame.right + 1,
        ),
        summaryStartInset:
          window.getComputedStyle(element).direction === 'rtl'
            ? frame.right - summary.right
            : summary.left - frame.left,
        documentOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      };
    });
    expect(geometry.withinFrame).toBe(true);
    expect(
      Math.abs(geometry.summaryStartInset - 17 * layout.scale),
    ).toBeLessThanOrEqual(1);
    expect(geometry.documentOverflow).toBeLessThanOrEqual(1);

    if (browserName === 'chromium') {
      await page.screenshot({
        path: `test-results/header-composition-${layout.name}.png`,
        fullPage: true,
      });
      if (layout.name === 'wide') {
        await demo.screenshot({
          path: 'test-results/header-composition-reference-after.png',
        });
      }
    }
  }
});

test('keeps ValueTableRow block padding root-scaled and separators aligned', async ({
  page,
  browserName,
}) => {
  const layouts = [
    {
      name: 'wide',
      width: 1100,
      height: 760,
      fontSize: '100%',
      scale: 1,
      inlinePadding: 8,
    },
    {
      name: 'narrow',
      width: 390,
      height: 844,
      fontSize: '100%',
      scale: 1,
      inlinePadding: 8,
    },
    {
      name: 'zoom',
      width: 1100,
      height: 760,
      fontSize: '200%',
      scale: 2,
      inlinePadding: 8,
    },
    {
      name: 'compact-inline',
      width: 1100,
      height: 760,
      fontSize: '100%',
      scale: 1,
      inlinePadding: 4,
    },
  ] as const;

  for (const layout of layouts) {
    await page.setViewportSize({ width: layout.width, height: layout.height });
    await page.goto('/?component=value-table');
    await page.locator('html').evaluate((element, fontSize) => {
      element.style.fontSize = fontSize;
    }, layout.fontSize);
    const demo = page.locator('[data-demo="value-table"]');
    if (layout.name === 'compact-inline') {
      await demo.evaluate((element) => {
        (element as HTMLElement).style.setProperty(
          '--kui-layout-item-padding',
          '.25rem',
        );
      });
    }
    const rows = demo.locator(
      '.kui-value-table__row:not([data-placeholder="true"])',
    );
    await expect(rows).toHaveCount(3);

    const geometry = await rows.evaluateAll((elements) =>
      elements.map((element) => {
        const row = element as HTMLElement;
        const rowRect = row.getBoundingClientRect();
        const rowStyle = window.getComputedStyle(row);
        const separator = window.getComputedStyle(row, '::before');
        const icon = row.querySelector<HTMLElement>('.kui-value-table__icon');
        const label = row.querySelector<HTMLElement>(
          '.kui-value-table__label',
        )!;
        return {
          hasIcon: row.dataset.hasIcon,
          paddingBlockStart: Number.parseFloat(rowStyle.paddingBlockStart),
          paddingBlockEnd: Number.parseFloat(rowStyle.paddingBlockEnd),
          separatorLeft: Number.parseFloat(separator.left),
          separatorRight: Number.parseFloat(separator.right),
          iconWidth: icon?.getBoundingClientRect().width ?? 0,
          labelInset: label.getBoundingClientRect().left - rowRect.left,
        };
      }),
    );

    for (const row of geometry) {
      expect(row.paddingBlockStart).toBeCloseTo(8 * layout.scale, 4);
      expect(row.paddingBlockEnd).toBeCloseTo(8 * layout.scale, 4);
    }
    for (const [index, row] of geometry.slice(1).entries()) {
      const expected =
        index === 0
          ? {
              separatorLeft: layout.inlinePadding + 32,
              separatorRight: layout.inlinePadding,
              iconWidth: 24,
              labelInset: layout.inlinePadding + 32,
            }
          : {
              separatorLeft: layout.inlinePadding,
              separatorRight: layout.inlinePadding,
              iconWidth: 0,
              labelInset: layout.inlinePadding,
            };
      expect(row.separatorLeft).toBeCloseTo(
        expected.separatorLeft * layout.scale,
        4,
      );
      expect(row.separatorRight).toBeCloseTo(
        expected.separatorRight * layout.scale,
        4,
      );
      expect(row.iconWidth).toBeCloseTo(expected.iconWidth * layout.scale, 4);
      expect(row.labelInset).toBeCloseTo(expected.labelInset * layout.scale, 4);
    }

    if (browserName === 'chromium' && layout.name !== 'zoom') {
      await page.screenshot({
        path: `test-results/value-table-padding-${layout.name}.png`,
        fullPage: true,
      });
    }
  }
});

test('keeps token-search focus and caret when Delete removes a controlled token', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=token-search-field');
  const demo = page.locator('[data-demo="token-search-field"]');
  const editor = demo.getByRole('searchbox', { name: 'Search tickets' });
  await editor.evaluate((element) => {
    const text = element.querySelector('[data-token-search-text]')!.firstChild!;
    const range = document.createRange();
    range.setStart(text, 4);
    range.collapse(true);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    (element as HTMLElement).focus();
  });

  await page.keyboard.press('Delete');

  await expect(editor).toBeFocused();
  await expect(
    editor.locator('[data-component="token-search-token"]'),
  ).toHaveCount(1);
  await expect(
    editor.locator(
      '[data-component="token-search-token"][data-token-value="tag:client"]',
    ),
  ).toHaveCount(0);
  await expect(
    editor.locator(
      '[data-component="token-search-token"][data-token-value="is:active"]',
    ),
  ).toHaveCount(1);
  expect(
    await editor.evaluate((element) => {
      const selection = document.getSelection()!;
      const caret = selection.getRangeAt(0);
      const prefix = document.createRange();
      prefix.selectNodeContents(element);
      prefix.setEnd(caret.startContainer, caret.startOffset);
      const clone = document.createElement('div');
      clone.append(prefix.cloneContents());
      clone
        .querySelectorAll('[data-component="token-search-token"]')
        .forEach((token) => token.remove());
      return (clone.textContent ?? '').replaceAll('\u200b', '').length;
    }),
  ).toBe(4);
  await page.keyboard.type('owner ');
  await expect(editor).toContainText('NOT owner is:active AND parser');
  await expect(
    demo.locator('output:not([data-demo-adoption-readout])'),
  ).toContainText('1 filters · NOT owner  AND parser');
  if (browserName === 'chromium')
    await demo
      .locator('.kui-catalog-example')
      .first()
      .screenshot({ path: 'test-results/token-search-field-delete-caret.png' });
});

test('token-search select-all + Delete empties cleanly without a stray newline', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=token-search-field');
  const demo = page.locator('[data-demo="token-search-field"]');
  const editor = demo.getByRole('searchbox', { name: 'Search tickets' });
  const selectAll = 'ControlOrMeta+A';

  // Plain text: type fresh content, select all, Delete. A contenteditable host
  // leaves a bogus <br> here in every engine (renders as a newline, reads back
  // as a space); the wiring must strip it back to the canonical empty span.
  // Focus the editing host directly: a center-point click can land on one of
  // its descendant token action buttons and mutate controlled state before
  // the keyboard sequence begins.
  await editor.focus();
  await page.keyboard.press(selectAll);
  await page.keyboard.press('Delete');
  await editor.type('hello world');
  await page.keyboard.press(selectAll);
  await page.keyboard.press('Delete');
  await expect
    .poll(() => editor.evaluate((el) => el.querySelectorAll('br').length))
    .toBe(0);
  await expect
    .poll(() =>
      editor.evaluate((el) => (el.textContent ?? '').replaceAll('​', '')),
    )
    .toBe('');
  await expect(editor.locator('[data-token-search-text]')).toHaveCount(1);
  // The caret survives: typing resumes in place with no leading newline/space.
  await editor.type('x');
  await expect
    .poll(() =>
      editor.evaluate((el) => (el.textContent ?? '').replaceAll('​', '')),
    )
    .toBe('x');

  // Replacement typing consumes the select-all intent. A later Backspace is a
  // normal character deletion, not the synthetic whole-editor deletion path.
  await page.keyboard.press(selectAll);
  await page.keyboard.type('hello');
  await expect
    .poll(() =>
      editor.evaluate((el) => (el.textContent ?? '').replaceAll('​', '')),
    )
    .toBe('hello');
  await page.keyboard.press('Backspace');
  await expect
    .poll(() =>
      editor.evaluate((el) => (el.textContent ?? '').replaceAll('​', '')),
    )
    .toBe('hell');

  // Tokened: select-all + Delete also removes every chip and leaves no artifact.
  await page.goto('/?component=token-search-field');
  const editor2 = demo.getByRole('searchbox', { name: 'Search tickets' });
  await editor2.focus();
  await page.keyboard.press(selectAll);
  await page.keyboard.press('Delete');
  await expect
    .poll(() => editor2.evaluate((el) => el.querySelectorAll('br').length))
    .toBe(0);
  await expect(
    editor2.locator('[data-component="token-search-token"]'),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      editor2.evaluate((el) => (el.textContent ?? '').replaceAll('​', '')),
    )
    .toBe('');
});

test('edits, removes, and clears controlled token search content', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=token-search-field');
  const demo = page.locator('[data-demo="token-search-field"]');
  const editor = demo.getByRole('searchbox', { name: 'Search tickets' });
  await expect(editor).toBeFocused();
  await expect(
    editor.locator('[data-component="token-search-token"]'),
  ).toHaveCount(2);
  const disabled = demo.getByRole('searchbox', { name: 'Saved search' });
  await expect(disabled).toHaveAttribute('contenteditable', 'false');
  await expect(disabled.locator('button')).toHaveCount(2);
  await expect(disabled.locator('button').first()).toBeDisabled();
  await expect(disabled.locator('button').last()).toBeDisabled();
  const tokenGeometry = await editor.evaluate((element) => {
    const token = element.querySelector<HTMLElement>(
      '[data-component="token-search-token"]',
    )!;
    const text = element.querySelector<HTMLElement>(
      '[data-token-search-text]',
    )!;
    const tokenRect = token.getBoundingClientRect();
    const textRange = document.createRange();
    textRange.selectNodeContents(text);
    const textRect = textRange.getBoundingClientRect();
    return {
      editorLineHeight: Number.parseFloat(
        window.getComputedStyle(element).lineHeight,
      ),
      tokenHeight: tokenRect.height,
      centerDelta: Math.abs(
        tokenRect.top +
          tokenRect.height / 2 -
          (textRect.top + textRect.height / 2),
      ),
    };
  });
  expect(tokenGeometry.tokenHeight).toBeLessThanOrEqual(
    tokenGeometry.editorLineHeight,
  );
  expect(tokenGeometry.centerDelta).toBeLessThan(2);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/token-search-field-light-wide.png',
      fullPage: true,
    });

  await demo.getByRole('button', { name: 'Remove client tag' }).click();
  await expect(
    editor.locator('[data-component="token-search-token"]'),
  ).toHaveCount(1);
  await demo.getByRole('button', { name: 'Edit is:active' }).click();
  await expect(editor).toContainText('is:active');
  await expect(
    editor.locator('[data-component="token-search-token"]'),
  ).toHaveCount(0);
  await editor.press('End');
  await editor.pressSequentially(' owner');
  await expect(
    demo.locator('output:not([data-demo-adoption-readout])'),
  ).toContainText('owner');

  await demo.getByRole('button', { name: 'Clear search' }).first().click();
  await expect(editor).toHaveText('');
  await expect(editor).toHaveAttribute('data-placeholder', 'Search');

  await editor.pressSequentially('hello');
  const alignment = () =>
    demo
      .locator('[data-component="token-search-field"]')
      .first()
      .evaluate((field) => {
        const fieldRect = field.getBoundingClientRect();
        const leadingRect = field
          .querySelector<HTMLElement>('.kui-token-search__leading')!
          .getBoundingClientRect();
        const editorElement = field.querySelector<HTMLElement>(
          '.kui-token-search__editor',
        )!;
        const editorRect = editorElement.getBoundingClientRect();
        const editorStyle = window.getComputedStyle(editorElement);
        const clearRect = field
          .querySelector<HTMLElement>('.kui-token-search__clear')!
          .getBoundingClientRect();
        return {
          height: fieldRect.height,
          leadingCenter:
            leadingRect.top + leadingRect.height / 2 - fieldRect.top,
          firstLineCenter:
            editorRect.top +
            parseFloat(editorStyle.paddingBlockStart) +
            parseFloat(editorStyle.lineHeight) / 2 -
            fieldRect.top,
          clearCenter: clearRect.top + clearRect.height / 2 - fieldRect.top,
        };
      });
  const singleLine = await alignment();
  expect(singleLine.height).toBe(44);
  expect(
    Math.abs(singleLine.leadingCenter - singleLine.height / 2),
  ).toBeLessThan(0.1);
  expect(
    Math.abs(singleLine.firstLineCenter - singleLine.height / 2),
  ).toBeLessThan(0.1);
  expect(Math.abs(singleLine.clearCenter - singleLine.height / 2)).toBeLessThan(
    0.1,
  );
  await page.mouse.move(0, 0);
  if (browserName === 'chromium')
    await demo.locator('.kui-catalog-example').first().screenshot({
      path: 'test-results/token-search-field-alignment-single-line-wide.png',
    });

  await editor.pressSequentially(
    ' across a deliberately long second line that proves the first-line controls stay pinned while editable content wraps naturally through the available width',
  );
  const multiline = await alignment();
  expect(multiline.height).toBeGreaterThan(singleLine.height);
  expect(multiline.leadingCenter).toBeCloseTo(singleLine.leadingCenter, 1);
  expect(multiline.firstLineCenter).toBeCloseTo(singleLine.firstLineCenter, 1);
  expect(multiline.clearCenter).toBeCloseTo(singleLine.clearCenter, 1);
  if (browserName === 'chromium')
    await demo.locator('.kui-catalog-example').first().screenshot({
      path: 'test-results/token-search-field-alignment-multiline-wide.png',
    });

  await page.reload();
  await page.locator('[data-action="toggle-theme"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/token-search-field-dark-narrow.png',
      fullPage: true,
    });
});

test('renders an interactive responsive find field inside a toolbar', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=toolbar');
  const toolbar = page
    .locator('[data-demo="toolbar"] > [data-component="toolbar"]')
    .first();
  const editor = toolbar.getByRole('searchbox', { name: 'Find in workspace' });
  const trigger = toolbar.getByRole('button', { name: 'Open find' });
  const field = toolbar.locator('[data-component="token-search-field"]');
  const group = field.locator('..');
  const outsideControl = page.locator('[data-action="toggle-theme"]');
  await expect(editor).toBeHidden();
  await expect(trigger).toBeVisible();
  await expect(field).toHaveAttribute('data-collapsible', 'true');
  await expect(field).toHaveAttribute('data-expanded', 'false');
  await expect(group).toHaveAttribute(
    'data-component',
    'toolbar-control-group',
  );
  await expect(group).toHaveCSS(
    'transition-property',
    'width, background-color, border-color',
  );
  await expect(group).toHaveCSS('transition-duration', '0.25s, 0.2s, 0.2s');
  const collapsedIconGeometry = await field.evaluate((element) => {
    const fieldRect = element.getBoundingClientRect();
    const iconRect = element.querySelector('svg')!.getBoundingClientRect();
    return {
      inset: iconRect.left + iconRect.width / 2 - fieldRect.left,
      center: fieldRect.width / 2,
    };
  });
  expect(collapsedIconGeometry.inset).toBeCloseTo(
    collapsedIconGeometry.center,
    1,
  );
  await group.evaluate((element) =>
    element.addEventListener('transitionrun', (event) => {
      if ((event as TransitionEvent).propertyName === 'width')
        element.setAttribute('data-width-transition-seen', 'true');
    }),
  );
  if (browserName === 'chromium')
    await toolbar.screenshot({
      path: 'test-results/toolbar-find-wide-collapsed.png',
    });

  await trigger.click();
  await expect(group).toHaveAttribute('data-width-transition-seen', 'true');
  // Wait for the expand WIDTH transition to settle before measuring geometry —
  // `transitionrun` above only proves it started, so measuring now would catch the
  // field mid-animation and read a moving trailing control.
  await group.evaluate(
    (element) =>
      new Promise<void>((resolve) => {
        const finish = (): void => resolve();
        element.addEventListener(
          'transitionend',
          (event) => {
            if ((event as TransitionEvent).propertyName === 'width') finish();
          },
          { once: true },
        );
        window.setTimeout(finish, 600);
      }),
  );
  await expect(editor).toBeVisible();
  await expect(editor).toBeFocused();
  await expect(toolbar.locator('.kui-toolbar__leading')).toBeVisible();
  await expect(toolbar.locator('.kui-toolbar__trailing')).toBeVisible();
  await expect(group).toHaveCSS('height', '44px');
  await expect(field).toHaveCSS('height', '40px');
  await expect(field).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  expect(
    await group.evaluate(
      (element) => window.getComputedStyle(element).boxShadow,
    ),
  ).not.toBe('none');
  const expandedIconInset = await field.evaluate((element) => {
    const fieldRect = element.getBoundingClientRect();
    const iconRect = element
      .querySelector('.kui-token-search__leading svg')!
      .getBoundingClientRect();
    return iconRect.left + iconRect.width / 2 - fieldRect.left;
  });
  expect(
    Math.abs(expandedIconInset - collapsedIconGeometry.inset),
  ).toBeLessThan(0.5);
  const trailingCenterBeforeInput = await field
    .locator('.kui-token-search__trailing')
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left + rect.width / 2;
    });
  await editor.pressSequentially('priority');
  await expect(
    toolbar.getByRole('button', { name: 'Clear search' }),
  ).toBeVisible();
  const trailingCenterAfterInput = await field
    .locator('.kui-token-search__trailing')
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left + rect.width / 2;
    });
  expect(
    Math.abs(trailingCenterAfterInput - trailingCenterBeforeInput),
  ).toBeLessThan(0.5);
  await editor.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText('Find submitted');
  await expect(editor.locator('br, div')).toHaveCount(0);
  await outsideControl.focus();
  await expect(editor).toBeVisible();
  await expect(trigger).toBeHidden();
  if (browserName === 'chromium')
    await toolbar.screenshot({ path: 'test-results/toolbar-find-wide.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(editor).toBeVisible();
  await expect(toolbar.locator('.kui-toolbar__leading')).toBeHidden();
  await expect(toolbar.locator('.kui-toolbar__trailing')).toBeHidden();
  await toolbar.getByRole('button', { name: 'Clear search' }).click();
  await expect(editor).toBeVisible();
  await expect(editor).toBeFocused();
  await outsideControl.focus();
  await expect(editor).toBeHidden();
  await expect(trigger).toBeVisible();
  if (browserName === 'chromium')
    await toolbar.screenshot({
      path: 'test-results/toolbar-find-narrow-collapsed.png',
    });

  await trigger.click();
  await expect(editor).toBeVisible();
  await expect(editor).toBeFocused();
  await expect(toolbar.locator('.kui-toolbar__leading')).toBeHidden();
  await expect(toolbar.locator('.kui-toolbar__trailing')).toBeHidden();
  if (browserName === 'chromium')
    await toolbar.screenshot({
      path: 'test-results/toolbar-find-narrow-open.png',
    });
});

test('aligns Known Date captions and bordered text-field hints with their values', async ({
  page,
}) => {
  for (const [route, selector] of [
    ['wa-input', 'wa-input'],
    ['wa-known-date', 'wa-known-date'],
    ['wa-number-input', 'wa-number-input'],
    ['wa-select', 'wa-select'],
    ['wa-textarea', 'wa-textarea'],
  ] as const) {
    await page.goto(`/?component=${route}`);
    const control = page.locator(selector).first();
    await expect
      .poll(() => control.evaluate((element) => Boolean(element.shadowRoot)))
      .toBe(true);
    const hintPadding = await control.evaluate((element) => {
      const hint = element.shadowRoot!.querySelector(
        '[part~="hint"]',
      ) as HTMLElement;
      const style = window.getComputedStyle(hint);
      return [style.paddingInlineStart, style.paddingInlineEnd];
    });
    expect(hintPadding).toEqual(['9px', '9px']);
  }

  await page.goto('/?component=wa-known-date');
  const fieldLabelPadding = await page
    .locator('wa-known-date')
    .evaluate((element) =>
      [
        ...element.shadowRoot!.querySelectorAll<HTMLElement>(
          '[part~="field-label"]',
        ),
      ].map((label) => {
        const style = window.getComputedStyle(label);
        return [style.paddingInlineStart, style.paddingInlineEnd];
      }),
    );
  expect(fieldLabelPadding).toEqual([
    ['9px', '9px'],
    ['9px', '9px'],
    ['9px', '9px'],
  ]);
});

test('styles and aligns OTP label and hint like a bordered text field', async ({
  page,
}) => {
  await page.goto('/?component=wa-otp-input');
  const otp = page.locator('wa-otp-input');
  await expect(otp).toBeVisible();
  const textStyles = await otp.evaluate((element) => {
    const style = (part: string) => {
      const target = element.shadowRoot!.querySelector(
        `[part~="${part}"]`,
      ) as HTMLElement;
      const computed = window.getComputedStyle(target);
      return {
        padding: [computed.paddingInlineStart, computed.paddingInlineEnd],
        transform: computed.textTransform,
        size: computed.fontSize,
        weight: computed.fontWeight,
      };
    };
    return { label: style('label'), hint: style('hint') };
  });
  expect(textStyles.label).toEqual({
    padding: ['9px', '9px'],
    transform: 'uppercase',
    size: '12px',
    weight: '650',
  });
  expect(textStyles.hint.padding).toEqual(['9px', '9px']);
});

test('insets the complete Slider region with a scalable, overridable logical margin', async ({
  page,
}) => {
  await page.goto('/?component=wa-slider');
  const slider = page.locator('wa-slider');
  await expect(slider).toBeVisible();
  const margins = () =>
    slider.evaluate((element) => {
      const region = element.shadowRoot!.querySelector(
        '[part~="slider"]',
      ) as HTMLElement;
      const style = window.getComputedStyle(region);
      return [style.marginInlineStart, style.marginInlineEnd];
    });
  await expect.poll(margins).toEqual(['8px', '8px']);

  await page.locator('html').evaluate((element) => {
    element.style.fontSize = '200%';
  });
  await expect.poll(margins).toEqual(['16px', '16px']);

  await slider.evaluate((element) => {
    element.style.setProperty('--kui-layout-inline-margin', '12px');
  });
  await expect.poll(margins).toEqual(['12px', '12px']);
});

test('hides and restores the Dialog header actions through the public host class', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=wa-dialog');
  await page.getByRole('button', { name: 'Open dialog' }).click();
  const dialog = page.locator('#catalog-wa-dialog');
  await expect(dialog).toHaveClass(/\bhide-actions\b/);

  const headerActionsDisplay = () =>
    dialog.evaluate(
      (element) =>
        window.getComputedStyle(
          element.shadowRoot!.querySelector<HTMLElement>(
            '[part~="header-actions"]',
          )!,
        ).display,
    );
  const dialogClip = () =>
    dialog.evaluate((element) => {
      const rect = element
        .shadowRoot!.querySelector<HTMLElement>('[part~="dialog"]')!
        .getBoundingClientRect();
      const inset = 16;
      return {
        x: Math.max(0, rect.left - inset),
        y: Math.max(0, rect.top - inset),
        width: Math.min(window.innerWidth, rect.width + inset * 2),
        height: Math.min(window.innerHeight, rect.height + inset * 2),
      };
    });
  await expect.poll(headerActionsDisplay).toBe('none');
  await page.screenshot({
    path: testInfo.outputPath('dialog-hide-actions-wide.png'),
    clip: await dialogClip(),
  });

  await dialog.evaluate((element) => element.classList.remove('hide-actions'));
  await expect.poll(headerActionsDisplay).not.toBe('none');
  await dialog.evaluate((element) => element.classList.add('hide-actions'));
  await expect.poll(headerActionsDisplay).toBe('none');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath('dialog-hide-actions-narrow.png'),
    clip: await dialogClip(),
  });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).not.toHaveAttribute('open', '');
});

test('renders and operates representative focused Web Awesome specimens', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Screenshot review is captured once in Chromium.',
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [route, filename] of [
    ['wa-known-date', 'webawesome-form-wide.png'],
    ['wa-page', 'webawesome-layout-wide.png'],
    ['wa-carousel', 'webawesome-media-wide.png'],
    ['wa-popup', 'webawesome-helper-wide.png'],
  ] as const) {
    await page.goto(`/?component=${route}`);
    await expect(page.locator(`[data-demo="${route}"]`)).toBeVisible();
    await expect
      .poll(() =>
        page.locator(`[data-item-id="${route}"]`).evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return rect.top >= -1 && rect.bottom <= window.innerHeight + 1;
        }),
      )
      .toBe(true);
    await page.screenshot({ path: `test-results/${filename}`, fullPage: true });
  }

  await page.goto('/?component=wa-dialog');
  await page.getByRole('button', { name: 'Open dialog' }).click();
  await expect(page.locator('#catalog-wa-dialog')).toHaveAttribute('open', '');
  await expect
    .poll(() =>
      page.locator('#catalog-wa-dialog').evaluate((element) => {
        const padding = (part: string) => {
          const target = element.shadowRoot!.querySelector<HTMLElement>(
            `[part~="${part}"]`,
          )!;
          const style = window.getComputedStyle(target);
          return [
            style.paddingTop,
            style.paddingRight,
            style.paddingBottom,
            style.paddingLeft,
          ];
        };
        return { body: padding('body'), footer: padding('footer') };
      }),
    )
    .toEqual({
      body: ['8px', '8px', '8px', '8px'],
      footer: ['16px', '16px', '16px', '16px'],
    });
  await page.screenshot({
    path: 'test-results/webawesome-dialog-open-wide.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('#catalog-wa-dialog')).not.toHaveAttribute(
    'open',
    '',
  );

  await page.goto('/?component=wa-toast-item');
  const toastItem = page.locator('[data-demo="wa-toast-item"] wa-toast-item');
  await expect(toastItem).toBeVisible();
  expect((await toastItem.boundingBox())?.height).toBeGreaterThan(40);

  await page.goto('/?component=wa-animated-image');
  const animatedImage = page.locator(
    '[data-demo="wa-animated-image"] wa-animated-image',
  );
  await expect(animatedImage).toHaveAttribute(
    'src',
    /\/assets\/animated-image-demo-[^/]+\.gif$/,
  );
  await expect
    .poll(() =>
      animatedImage.evaluate(
        (element) =>
          element.shadowRoot?.querySelector<HTMLImageElement>('img.frozen')
            ?.naturalWidth ?? 0,
      ),
    )
    .toBeGreaterThan(0);
  expect((await animatedImage.boundingBox())?.height).toBeGreaterThan(200);

  await page.goto('/?component=wa-comparison');
  const comparisonHeights = await page
    .locator('[data-demo="wa-comparison"] wa-comparison > [slot]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height),
    );
  expect(comparisonHeights).toEqual([240, 240]);

  await page.goto('/?component=wa-known-date');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: 'test-results/webawesome-form-narrow.png',
    fullPage: true,
  });
});

test('distinguishes pill status badges from rounded-rectangle tags', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=wa-badge');
  const badges = page.locator('[data-demo="wa-badge"] wa-badge');
  const filledBadges = page.locator(
    '[data-demo="wa-badge"] wa-badge[appearance="filled"]',
  );
  const accentBadges = page.locator(
    '[data-demo="wa-badge"] wa-badge[appearance="accent"]',
  );
  const filledOutlinedBadges = page.locator(
    '[data-demo="wa-badge"] wa-badge[appearance="filled-outlined"]',
  );
  await expect(badges).toHaveCount(15);
  await expect(filledBadges).toHaveCount(5);
  await expect(accentBadges).toHaveCount(5);
  await expect(filledOutlinedBadges).toHaveCount(5);
  await expect(filledBadges.first()).toHaveAttribute('pill', '');
  await expect(filledBadges.first()).toHaveAttribute('appearance', 'filled');
  const minBadgeContrast = (
    appearance: 'accent' | 'filled' | 'filled-outlined',
  ) =>
    page
      .locator(`[data-demo="wa-badge"] wa-badge[appearance="${appearance}"]`)
      .evaluateAll((elements) => {
        const luminance = (color: string): number => {
          const channels =
            color
              .match(/[\d.]+/g)
              ?.slice(0, 3)
              .map(Number) ?? [];
          const normalizedChannels = color.startsWith('color(srgb')
            ? channels
            : channels.map((channel) => channel / 255);
          const [red = 0, green = 0, blue = 0] = normalizedChannels.map(
            (normalized) =>
              normalized <= 0.04045
                ? normalized / 12.92
                : ((normalized + 0.055) / 1.055) ** 2.4,
          );
          return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
        };
        return Math.min(
          ...elements.map((element) => {
            const style = window.getComputedStyle(element);
            const foreground = luminance(style.color);
            const background = luminance(style.backgroundColor);
            return (
              (Math.max(foreground, background) + 0.05) /
              (Math.min(foreground, background) + 0.05)
            );
          }),
        );
      });
  await expect
    .poll(
      () => minBadgeContrast('filled'),
      'light filled badge contrast (min across variants)',
    )
    .toBeGreaterThanOrEqual(4.5);
  await expect
    .poll(
      () => minBadgeContrast('accent'),
      'light accent badge contrast (min across variants)',
    )
    .toBeGreaterThanOrEqual(4.5);
  await expect
    .poll(
      () => minBadgeContrast('filled-outlined'),
      'light filled-outlined badge contrast (min across variants)',
    )
    .toBeGreaterThanOrEqual(4.5);
  await expect(filledOutlinedBadges.first()).not.toHaveCSS(
    'border-color',
    'rgba(0, 0, 0, 0)',
  );
  await filledBadges.first().evaluate((element) => {
    (element as HTMLElement).style.setProperty(
      '--kui-wa-badge-filled-background',
      '#eef6ff',
    );
    (element as HTMLElement).style.setProperty(
      '--kui-wa-badge-filled-foreground',
      '#003366',
    );
  });
  await expect(filledBadges.first()).toHaveCSS(
    'background-color',
    'rgb(238, 246, 255)',
  );
  await expect(filledBadges.first()).toHaveCSS('color', 'rgb(0, 51, 102)');
  await filledBadges.first().evaluate((element) => {
    (element as HTMLElement).style.removeProperty(
      '--kui-wa-badge-filled-background',
    );
    (element as HTMLElement).style.removeProperty(
      '--kui-wa-badge-filled-foreground',
    );
  });
  const badgeRadius = await filledBadges
    .first()
    .evaluate((element) => window.getComputedStyle(element).borderRadius);
  if (browserName === 'chromium') {
    await page.screenshot({
      path: 'test-results/webawesome-badge-wide.png',
      fullPage: true,
    });
    await page.locator('[data-action="toggle-theme"]').click();
    await expect
      .poll(
        () => minBadgeContrast('filled'),
        'dark filled badge contrast (min across variants)',
      )
      .toBeGreaterThanOrEqual(4.5);
    await expect
      .poll(
        () => minBadgeContrast('accent'),
        'dark accent badge contrast (min across variants)',
      )
      .toBeGreaterThanOrEqual(4.5);
    await expect
      .poll(
        () => minBadgeContrast('filled-outlined'),
        'dark filled-outlined badge contrast (min across variants)',
      )
      .toBeGreaterThanOrEqual(4.5);
    await page.screenshot({
      path: 'test-results/webawesome-badge-dark-wide.png',
      fullPage: true,
    });
    await page.locator('[data-action="toggle-theme"]').click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.locator('[data-demo="wa-badge"]').screenshot({
      path: 'test-results/webawesome-badge-narrow.png',
    });
  }

  await page.goto('/?component=wa-tag');
  const tags = page.locator('[data-demo="wa-tag"] wa-tag');
  await expect(tags).toHaveCount(4);
  await expect(tags.first()).not.toHaveAttribute('pill');
  expect(
    await tags
      .last()
      .evaluate((element) => element.hasAttribute('with-remove')),
  ).toBe(true);
  const tagRadius = await tags
    .first()
    .evaluate((element) => window.getComputedStyle(element).borderRadius);
  expect(parseFloat(badgeRadius)).toBeGreaterThan(parseFloat(tagRadius));

  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/webawesome-tag-wide.png',
      fullPage: true,
    });
});

test('labels the Markdown specimen as trusted static client content', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=wa-markdown');
  const demo = page.locator('[data-demo="wa-markdown"]');
  await expect(
    demo.getByText('Trusted static Markdown · client-rendered'),
  ).toBeVisible();
  await expect(
    demo.getByText('Do not pass unsanitized or untrusted Markdown'),
  ).toBeVisible();
  await expect(demo.locator('wa-markdown h2')).toHaveText('Release ready');

  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/webawesome-markdown-trusted-wide.png',
      fullPage: true,
    });
});

test('themes Tooltip and Popover as arrowless surfaces with public overrides', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=wa-tooltip');
  const tooltip = page.locator('[data-demo="wa-tooltip"] wa-tooltip');
  const tooltipTarget = page.locator('#catalog-tooltip-target');
  await Promise.all([
    tooltip.evaluate(
      (element) =>
        new Promise<void>((resolve) =>
          element.addEventListener('wa-after-show', () => resolve(), {
            once: true,
          }),
        ),
    ),
    tooltipTarget.hover(),
  ]);
  await expect(tooltip).toHaveAttribute('open', '');
  const tooltipArrow = await tooltip.evaluate((element) => {
    const popup = element.shadowRoot?.querySelector('wa-popup');
    const arrow =
      popup?.shadowRoot?.querySelector<HTMLElement>('[part~="arrow"]');
    const rect = arrow?.getBoundingClientRect();
    return {
      token: window
        .getComputedStyle(element)
        .getPropertyValue('--wa-tooltip-arrow-size')
        .trim(),
      width: rect?.width ?? -1,
      height: rect?.height ?? -1,
    };
  });
  expect(tooltipArrow.token).toBe('0px');
  expect(tooltipArrow.width).toBeLessThanOrEqual(2.1);
  expect(tooltipArrow.height).toBeLessThanOrEqual(2.1);
  if (browserName === 'chromium') {
    await page.screenshot({
      path: 'test-results/webawesome-tooltip-no-arrow-light-wide.png',
      fullPage: true,
    });
    await page.locator('[data-action="toggle-theme"]').click();
    await Promise.all([
      tooltip.evaluate(
        (element) =>
          new Promise<void>((resolve) =>
            element.addEventListener('wa-after-show', () => resolve(), {
              once: true,
            }),
          ),
      ),
      tooltipTarget.hover(),
    ]);
    await page.screenshot({
      path: 'test-results/webawesome-tooltip-no-arrow-dark-wide.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#catalog-tooltip-target').hover();
    await page.screenshot({
      path: 'test-results/webawesome-tooltip-no-arrow-dark-narrow.png',
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=wa-popover');
  const popover = page.locator('[data-demo="wa-popover"] wa-popover');
  const popoverTarget = page.locator('#catalog-popover-target');
  await Promise.all([
    popover.evaluate(
      (element) =>
        new Promise<void>((resolve) =>
          element.addEventListener('wa-after-show', () => resolve(), {
            once: true,
          }),
        ),
    ),
    popoverTarget.click(),
  ]);
  await expect(popover).toHaveAttribute('open', '');
  const popoverArrow = await popover.evaluate((element) => {
    const popup = element.shadowRoot?.querySelector('wa-popup');
    const arrow =
      popup?.shadowRoot?.querySelector<HTMLElement>('[part~="arrow"]');
    const rect = arrow?.getBoundingClientRect();
    return {
      token: window
        .getComputedStyle(element)
        .getPropertyValue('--arrow-size')
        .trim(),
      width: rect?.width ?? -1,
      height: rect?.height ?? -1,
    };
  });
  expect(popoverArrow.token).toBe('0px');
  expect(popoverArrow.width).toBeLessThanOrEqual(2.1);
  expect(popoverArrow.height).toBeLessThanOrEqual(2.1);
  if (browserName === 'chromium') {
    await page.screenshot({
      path: 'test-results/webawesome-popover-no-arrow-light-wide.png',
      fullPage: true,
    });
    await page.locator('[data-action="toggle-theme"]').click();
    await Promise.all([
      popover.evaluate(
        (element) =>
          new Promise<void>((resolve) =>
            element.addEventListener('wa-after-show', () => resolve(), {
              once: true,
            }),
          ),
      ),
      popoverTarget.click(),
    ]);
    await page.screenshot({
      path: 'test-results/webawesome-popover-no-arrow-dark-wide.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: 'test-results/webawesome-popover-no-arrow-dark-narrow.png',
      fullPage: true,
    });
  }
});

test('toast specimen creates a visible transient notification', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=wa-toast');
  await page.getByRole('button', { name: 'Show toast' }).click();
  const createdToast = page.locator('#catalog-wa-toast wa-toast-item');
  await expect(createdToast).toContainText('The component catalog is ready.');
  await expect(createdToast).toBeVisible();
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/webawesome-toast-open-wide.png',
      fullPage: true,
    });
});

test('carousel theme uses compact arrows and seven-pixel visible page dots', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=wa-carousel');
  const geometry = await page
    .locator('[data-demo="wa-carousel"] wa-carousel')
    .evaluate((element) => {
      const navigation = element.shadowRoot?.querySelector<HTMLElement>(
        '[part~="navigation-button"]',
      );
      const dot = element.shadowRoot?.querySelector<HTMLElement>(
        '[part~="pagination-item"]',
      );
      const activeDot = element.shadowRoot?.querySelector<HTMLElement>(
        '[part~="pagination-item-active"]',
      );
      if (!navigation || !dot || !activeDot) return null;
      const navigationStyle = window.getComputedStyle(navigation);
      const dotStyle = window.getComputedStyle(dot);
      const activeDotStyle = window.getComputedStyle(activeDot);
      return {
        navigationWidth: navigationStyle.width,
        navigationHeight: navigationStyle.height,
        navigationFontSize: navigationStyle.fontSize,
        dotWidth: dotStyle.width,
        dotHeight: dotStyle.height,
        dotImage: dotStyle.backgroundImage,
        activeTransform: activeDotStyle.transform,
        token: window
          .getComputedStyle(element)
          .getPropertyValue('--kui-wa-carousel-dot-size')
          .trim(),
      };
    });
  expect(geometry).toMatchObject({
    navigationWidth: '28px',
    navigationHeight: '28px',
    navigationFontSize: '16px',
    dotWidth: '20px',
    dotHeight: '20px',
    activeTransform: 'none',
    token: '7px',
  });
  expect(geometry?.dotImage).toContain('radial-gradient');
  if (browserName === 'chromium') {
    await page.screenshot({
      path: 'test-results/webawesome-carousel-compact-wide.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: 'test-results/webawesome-carousel-compact-narrow.png',
      fullPage: true,
    });
  }
});

test('content surfaces share an overridable 8px outer margin and inner padding', async ({
  page,
  browserName,
}) => {
  const specimens = [
    {
      route: 'wa-accordion',
      host: 'wa-accordion',
      inner: 'wa-accordion-item',
      part: 'content',
    },
    { route: 'wa-card', host: 'wa-card', inner: 'wa-card', part: 'header' },
    {
      route: 'wa-details',
      host: 'wa-details',
      inner: 'wa-details',
      part: 'content',
    },
    {
      route: 'wa-callout',
      host: 'wa-callout',
      inner: 'wa-callout',
      part: null,
    },
    {
      route: 'wa-include',
      host: 'wa-include',
      inner: 'wa-include',
      part: null,
    },
  ] as const;

  for (const specimen of specimens) {
    await page.setViewportSize({ width: 1100, height: 820 });
    await page.goto(`/?component=${specimen.route}`);
    const host = page.locator(specimen.host).first();
    await expect(host).toBeVisible();
    await expect
      .poll(() =>
        host.evaluate(
          (element) => window.getComputedStyle(element).marginInlineStart,
        ),
      )
      .toBe('8px');
    await expect
      .poll(() =>
        host.evaluate(
          (element) => window.getComputedStyle(element).marginInlineEnd,
        ),
      )
      .toBe('8px');

    const inset = await page
      .locator(specimen.inner)
      .first()
      .evaluate((element, part) => {
        const target = part
          ? (element.shadowRoot!.querySelector(
              `[part~="${part}"]`,
            ) as HTMLElement)
          : element;
        return window.getComputedStyle(target).paddingInlineStart;
      }, specimen.part);
    expect(inset).toBe('8px');

    await page.locator('[data-catalog-example]').evaluate((element) => {
      const specimen = element as HTMLElement;
      specimen.style.setProperty('--kui-wa-surface-margin', '12px');
      specimen.style.setProperty('--kui-wa-surface-inset', '12px');
    });
    await expect
      .poll(() =>
        host.evaluate(
          (element) => window.getComputedStyle(element).marginInlineStart,
        ),
      )
      .toBe('12px');
    const overriddenInset = await page
      .locator(specimen.inner)
      .first()
      .evaluate((element, part) => {
        const target = part
          ? (element.shadowRoot!.querySelector(
              `[part~="${part}"]`,
            ) as HTMLElement)
          : element;
        return window.getComputedStyle(target).paddingInlineStart;
      }, specimen.part);
    expect(overriddenInset).toBe('12px');

    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }

  await page.goto('/?component=wa-accordion');
  if (browserName === 'chromium') {
    await page.setViewportSize({ width: 1100, height: 820 });
    await page.screenshot({
      path: 'test-results/webawesome-surface-insets-wide.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: 'test-results/webawesome-surface-insets-narrow.png',
      fullPage: true,
    });
  }
});

test('disclosure appearances use aligned plain content and roomier framed headers', async ({
  page,
  browserName,
}) => {
  const specimens = [
    {
      route: 'wa-details',
      host: 'wa-details',
      triggerPart: 'header',
    },
    {
      route: 'wa-accordion',
      host: 'wa-accordion',
      triggerPart: 'button',
    },
  ] as const;

  for (const specimen of specimens) {
    await page.setViewportSize({ width: 1100, height: 820 });
    await page.goto(`/?component=${specimen.route}`);

    for (const appearance of ['plain', 'outlined', 'sunken'] as const) {
      const host = page.locator(`${specimen.host}[appearance="${appearance}"]`);
      const disclosure =
        specimen.route === 'wa-details'
          ? host
          : host.locator('wa-accordion-item').first();
      await expect(disclosure).toBeVisible();
      const padding = await disclosure.evaluate(
        (element, parts) => {
          const root = element.shadowRoot!;
          const trigger = root.querySelector<HTMLElement>(
            `[part~="${parts.trigger}"]`,
          )!;
          const content = root.querySelector<HTMLElement>('[part~="content"]')!;
          return {
            trigger: window.getComputedStyle(trigger).paddingInlineStart,
            content: window.getComputedStyle(content).paddingInlineStart,
          };
        },
        { trigger: specimen.triggerPart },
      );

      expect(padding).toEqual(
        appearance === 'plain'
          ? { trigger: '0px', content: '0px' }
          : { trigger: '16px', content: '8px' },
      );
    }

    if (browserName === 'chromium') {
      await page.screenshot({
        path: `test-results/webawesome-${specimen.route}-disclosure-spacing-wide.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: `test-results/webawesome-${specimen.route}-disclosure-spacing-narrow.png`,
        fullPage: true,
      });
    }
  }
});

test('sunken Accordion, Card, and Details use the lowered rounded surface', async ({
  page,
  browserName,
}) => {
  const specimens = [
    { route: 'wa-accordion', selector: 'wa-accordion', part: null },
    { route: 'wa-card', selector: 'wa-card', part: null },
    { route: 'wa-details', selector: 'wa-details', part: 'details' },
  ] as const;

  for (const specimen of specimens) {
    await page.setViewportSize({ width: 1100, height: 820 });
    await page.goto(`/?component=${specimen.route}`);
    const host = page.locator(`${specimen.selector}[appearance="sunken"]`);
    await expect(host).toBeVisible();
    const appearance = await host.evaluate((element, part) => {
      const target = part
        ? (element.shadowRoot!.querySelector(
            `[part~="${part}"]`,
          ) as HTMLElement)
        : element;
      const probe = document.createElement('div');
      probe.style.backgroundColor = 'var(--wa-color-surface-lowered)';
      document.body.append(probe);
      const loweredBackground = window.getComputedStyle(probe).backgroundColor;
      probe.remove();
      const style = window.getComputedStyle(target);
      return {
        background: style.backgroundColor,
        loweredBackground,
        radius: parseFloat(style.borderStartStartRadius),
        shadow: style.boxShadow,
      };
    }, specimen.part);
    expect(appearance.background).toBe(appearance.loweredBackground);
    expect(appearance.radius).toBeGreaterThan(0);
    expect(appearance.shadow).toBe('none');

    if (browserName === 'chromium') {
      await page.screenshot({
        path: `test-results/webawesome-${specimen.route}-sunken-wide.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: `test-results/webawesome-${specimen.route}-sunken-narrow.png`,
        fullPage: true,
      });
    }
  }
});

test('disclosure and breadcrumb chevrons match the Kerf Select scale', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const specimens = [
    {
      route: 'wa-accordion',
      selector: 'wa-accordion-item',
      part: '[part~="icon"]',
      filename: 'webawesome-accordion-chevron-wide.png',
    },
    {
      route: 'wa-details',
      selector: 'wa-details',
      part: '[part~="icon"]',
      filename: 'webawesome-details-chevron-wide.png',
    },
    {
      route: 'wa-breadcrumb',
      selector: 'wa-breadcrumb-item',
      part: '[part~="separator"]',
      filename: 'webawesome-breadcrumb-chevron-wide.png',
    },
  ] as const;

  for (const specimen of specimens) {
    await page.goto(`/?component=${specimen.route}`);
    const geometry = await page
      .locator(`[data-demo="${specimen.route}"] ${specimen.selector}`)
      .first()
      .evaluate((element, part) => {
        const icon = element.shadowRoot?.querySelector<HTMLElement>(part);
        return icon
          ? {
              transform: window.getComputedStyle(icon).transform,
              token: window
                .getComputedStyle(element)
                .getPropertyValue('--kui-disclosure-icon-scale')
                .trim(),
            }
          : null;
      }, specimen.part);
    expect(geometry?.token).toBe('.5');
    expect(geometry?.transform).toMatch(/^matrix\(0\.5, 0, 0, 0\.5,/);
    if (browserName === 'chromium')
      await page.screenshot({
        path: `test-results/${specimen.filename}`,
        fullPage: true,
      });
  }

  await page.goto('/?component=select');
  const selectTransforms = await page
    .locator('[data-demo="select"] [name="rendering-balance"]')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const icon = element.shadowRoot?.querySelector<HTMLElement>(
          '[part~="expand-icon"]',
        );
        return icon ? window.getComputedStyle(icon).transform : '';
      }),
    );
  expect(selectTransforms).toHaveLength(1);
  for (const transform of selectTransforms)
    expect(transform).toMatch(/^matrix\(0\.5, 0, 0, 0\.5,/);
});

test('preserves Select option icons across Kerf rerenders and replaces selected content by value', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=select');
  const demo = page.locator('[data-demo="select"]');
  const select = demo.locator('[name="rendering-balance"]');
  const optionIcons = select.locator('wa-option .kui-select__icon');
  await expect(optionIcons).toHaveCount(3);
  await expect(
    select.locator(
      '.kui-select__custom-selected [data-lucide="sliders-horizontal"]',
    ),
  ).toBeVisible();
  await expect(select.locator('.kui-select__custom-selected')).toHaveAttribute(
    'data-key',
    'rendering-balance:balanced:custom-selected',
  );
  const selectGeometry = await select.evaluate((element) => {
    const combobox = element.shadowRoot
      ?.querySelector<HTMLElement>('[part~="combobox"]')
      ?.getBoundingClientRect();
    const arrow = element.shadowRoot
      ?.querySelector<HTMLElement>('[part~="expand-icon"]')
      ?.getBoundingClientRect();
    const selected = element
      .querySelector<HTMLElement>('.kui-select__custom-selected')
      ?.getBoundingClientRect();
    return combobox && arrow && selected
      ? {
          arrowTrailingInset: combobox.right - arrow.right,
          selectedToArrowGap: arrow.left - selected.right,
        }
      : null;
  });
  expect(selectGeometry?.arrowTrailingInset).toBeLessThan(16);
  expect(selectGeometry?.selectedToArrowGap).toBeGreaterThan(100);
  await optionIcons.evaluateAll((icons) =>
    icons.forEach((icon, index) => {
      icon.setAttribute('data-browser-identity', String(index));
    }),
  );

  await page.locator('[data-action="toggle-theme"]').click();
  await expect(optionIcons).toHaveCount(3);
  await expect(optionIcons.nth(0)).toHaveAttribute(
    'data-browser-identity',
    '0',
  );
  await expect(optionIcons.nth(1)).toHaveAttribute(
    'data-browser-identity',
    '1',
  );
  await expect(optionIcons.nth(2)).toHaveAttribute(
    'data-browser-identity',
    '2',
  );
  await expect(
    select.locator('wa-option[value="quiet"] [data-lucide="bell"]'),
  ).toBeAttached();
  await expect(
    select.locator(
      'wa-option[value="balanced"] [data-lucide="sliders-horizontal"]',
    ),
  ).toBeAttached();
  await expect(
    select.locator('wa-option[value="explicit"] [data-lucide="wrench"]'),
  ).toBeAttached();

  await select.evaluate((element) => {
    const control = element as HTMLElement & { value: string };
    control.value = 'explicit';
    control.dispatchEvent(
      new Event('change', { bubbles: true, composed: true }),
    );
  });
  await expect(page.locator('[data-select-value]')).toHaveText('explicit');
  await expect(select.locator('.kui-select__custom-selected')).toHaveAttribute(
    'data-key',
    'rendering-balance:explicit:custom-selected',
  );
  await expect(
    select.locator('.kui-select__custom-selected [data-lucide="wrench"]'),
  ).toBeVisible();
  await expect(optionIcons.nth(0)).toHaveAttribute(
    'data-browser-identity',
    '0',
  );
  await expect(optionIcons.nth(1)).toHaveAttribute(
    'data-browser-identity',
    '1',
  );
  await expect(optionIcons.nth(2)).toHaveAttribute(
    'data-browser-identity',
    '2',
  );

  await Promise.all([
    select.evaluate(
      (element) =>
        new Promise<void>((resolve) =>
          element.addEventListener('wa-after-show', () => resolve(), {
            once: true,
          }),
        ),
    ),
    activateWithKeyboard(page, select),
  ]);
  await expect(select.locator('wa-option[value="explicit"]')).toBeVisible();
  if (browserName === 'chromium') {
    await page.screenshot({ path: 'test-results/select-icon-slots-wide.png' });
    await Promise.all([
      select.evaluate(
        (element) =>
          new Promise<void>((resolve) =>
            element.addEventListener('wa-after-hide', () => resolve(), {
              once: true,
            }),
          ),
      ),
      page.keyboard.press('Escape'),
    ]);
    await page.setViewportSize({ width: 390, height: 844 });
    await demo.scrollIntoViewIfNeeded();
    await Promise.all([
      select.evaluate(
        (element) =>
          new Promise<void>((resolve) =>
            element.addEventListener('wa-after-show', () => resolve(), {
              once: true,
            }),
          ),
      ),
      activateWithKeyboard(page, select),
    ]);
    await expect(select.locator('wa-option[value="explicit"]')).toBeVisible();
    await page.screenshot({
      path: 'test-results/select-icon-slots-narrow.png',
    });
  }
});

test('keeps the current Select option text above WCAG AA contrast', async ({
  page,
}) => {
  // The current (aria-selected) option keeps its brand accent over the activated
  // brand fill, so the accent must clear 4.5:1 (brand-on-quiet #1e6ef4 was only
  // 3.77:1 there; the darker on-fill blue #1a5dcf clears it). Resolve colors
  // through a canvas so any serialization (rgb()/color(srgb …)) works.
  await page.goto('/?component=select');
  const select = page.locator(
    '[data-demo="select"] [name="rendering-balance"]',
  );
  const openDropdown = () =>
    Promise.all([
      select.evaluate(
        (element) =>
          new Promise<void>((resolve) =>
            element.addEventListener('wa-after-show', () => resolve(), {
              once: true,
            }),
          ),
      ),
      activateWithKeyboard(page, select),
    ]);
  const currentOptionContrast = () =>
    select
      .locator('wa-option[aria-selected="true"]')
      .first()
      .evaluate((option) => {
        const context = document.createElement('canvas').getContext('2d');
        const luminance = (color: string): number => {
          if (!context) return 0;
          context.canvas.width = 1;
          context.canvas.height = 1;
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          const channels = [
            ...context.getImageData(0, 0, 1, 1).data.slice(0, 3),
          ].map((channel) => {
            const value = channel / 255;
            return value <= 0.04045
              ? value / 12.92
              : ((value + 0.055) / 1.055) ** 2.4;
          });
          return (
            0.2126 * (channels[0] ?? 0) +
            0.7152 * (channels[1] ?? 0) +
            0.0722 * (channels[2] ?? 0)
          );
        };
        const base =
          option.shadowRoot?.querySelector('[part~="base"]') ?? option;
        let backgroundHost: (Element & { host?: Element }) | null =
          base as Element;
        let background = 'rgba(0, 0, 0, 0)';
        while (backgroundHost) {
          const candidate = window.getComputedStyle(
            backgroundHost as Element,
          ).backgroundColor;
          if (candidate && !/rgba\(0, 0, 0, 0\)|transparent/.test(candidate)) {
            background = candidate;
            break;
          }
          backgroundHost = (backgroundHost.parentElement ??
            (backgroundHost.getRootNode() as ShadowRoot | null)
              ?.host) as Element | null;
        }
        const foreground = luminance(
          window.getComputedStyle(base as Element).color,
        );
        const back = luminance(background);
        return (
          (Math.max(foreground, back) + 0.05) /
          (Math.min(foreground, back) + 0.05)
        );
      });
  await openDropdown();
  // Light is the fix target (the 3.77:1 failure). Dark keeps the already-compliant
  // #8acbff accent (brand-on-fill's dark value equals brand-on-quiet's), and the
  // theme toggle dismisses + re-renders the listbox, so this asserts light only.
  await expect
    .poll(currentOptionContrast, 'light current Select option contrast')
    .toBeGreaterThanOrEqual(4.5);
});

test('animation specimen exposes settings, transport, lifecycle, and reduced-motion behavior', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=wa-animation');
  const demo = page.locator('[data-animation-demo]');
  const animation = demo.locator('wa-animation');
  const output = demo.locator('[data-animation-output]');

  await demo.locator('[name="animation-preset"]').evaluate((element) => {
    (element as HTMLElement & { value: string }).value = 'shakeX';
    element.dispatchEvent(
      new Event('change', { bubbles: true, composed: true }),
    );
  });
  await demo.locator('[name="animation-duration"]').fill('1000');
  await demo.locator('[name="animation-rate"]').fill('1.5');
  await expect(animation).toHaveJSProperty('name', 'shakeX');
  await expect(animation).toHaveJSProperty('duration', 1000);
  await expect(animation).toHaveJSProperty('playbackRate', 1.5);

  await demo.getByRole('button', { name: 'Play' }).click();
  await expect(output).toContainText('Playing shakeX');
  await demo.getByRole('button', { name: 'Pause' }).click();
  await expect(output).toHaveText('Paused');
  await demo.getByRole('button', { name: 'Play' }).click();
  await demo.getByRole('button', { name: 'Finish' }).click();
  await expect(output).toHaveText('Finished');
  await demo.getByRole('button', { name: 'Play' }).click();
  await demo.getByRole('button', { name: 'Cancel' }).click();
  await expect(output).toHaveText('Canceled');

  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/webawesome-animation-settings-wide.png',
      fullPage: true,
    });

  await page.getByRole('button', { name: 'Reduce motion' }).click();
  await page
    .locator('[data-animation-demo]')
    .getByRole('button', { name: 'Play' })
    .click();
  await expect(page.locator('[data-animation-output]')).toHaveText(
    'Playback suppressed by reduced-motion preference',
  );

  if (browserName === 'chromium') {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: 'test-results/webawesome-animation-settings-narrow.png',
      fullPage: true,
    });
  }
});

test('observer specimens expose visible, user-driven events', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=wa-intersection-observer');
  const intersection = page.locator('[data-observer-demo="intersection"]');
  await intersection.getByRole('button', { name: 'Reveal target' }).click();
  await expect(intersection.locator('[data-observer-output]')).toContainText(
    'Target visible',
  );
  await expect(intersection.locator('[data-observer-target]')).toHaveClass(
    /is-intersecting/,
  );
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/webawesome-intersection-observer-wide.png',
      fullPage: true,
    });

  await page.goto('/?component=wa-mutation-observer');
  const mutation = page.locator('[data-observer-demo="mutation"]');
  await mutation.getByRole('button', { name: 'Mutate target' }).click();
  await expect(mutation.locator('[data-observer-target]')).toHaveAttribute(
    'data-revision',
    '1',
  );
  await expect(mutation.locator('[data-observer-output]')).toContainText(
    /Observed [1-9]\d* mutation/,
  );
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/webawesome-mutation-observer-wide.png',
      fullPage: true,
    });

  await page.goto('/?component=wa-resize-observer');
  const resize = page.locator('[data-observer-demo="resize"]');
  const target = resize.locator('[data-observer-target]');
  const before = (await target.boundingBox())?.width ?? 0;
  await resize.getByRole('button', { name: 'Resize target' }).click();
  await expect
    .poll(async () => (await target.boundingBox())?.width ?? 0)
    .toBeGreaterThan(before);
  await expect(resize.locator('[data-observer-output]')).toContainText(
    'Observed width',
  );
  if (browserName === 'chromium') {
    await page.screenshot({
      path: 'test-results/webawesome-resize-observer-wide.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: 'test-results/webawesome-resize-observer-narrow.png',
      fullPage: true,
    });
  }
});

test('labels composition entries without repeating the kind in their names', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto('/?component=application-tabs');

  await expect(
    page.locator('.kui-list-item__status', { hasText: 'Composition' }),
  ).toHaveCount(5);
  await expect(
    page.locator('[data-item-id="application-tabs"] .kui-list-item__status'),
  ).toHaveText('Composition');
  await expect(
    page.locator('[data-item-id="application-tabs"] .kui-list-item__label'),
  ).toHaveText('Application tabs');
  await expect(
    page.locator('[data-item-id="headers"] .kui-list-item__label'),
  ).toHaveText('Headers');
  await expect(
    page.locator('[data-item-id="feedback"] .kui-list-item__label'),
  ).toHaveText('Feedback');

  const sidebar = page.locator('.kui-catalog__sidebar');
  if (browserName === 'chromium') {
    await sidebar.screenshot({
      path: 'test-results/composition-tags-wide.png',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      )
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: 'test-results/composition-tags-narrow.png',
      fullPage: true,
    });
  }
});

test('labels discouraged Web Awesome entries in the catalog sidebar', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto('/?component=wa-button-group');

  const secondary = page.locator('[data-catalog-secondary]');
  await expect(secondary).toBeVisible();
  const discouraged = secondary.locator('.kui-list-item__status', {
    hasText: 'Discouraged',
  });
  await expect(discouraged).toHaveCount(15);
  await expect(
    page.locator('[data-item-id="wa-button-group"] .kui-list-item__status'),
  ).toHaveText('Discouraged');
  await expect(
    page.locator('[data-item-id="wa-popup"] .kui-list-item__status'),
  ).toHaveCount(0);

  const sidebar = page.locator('.kui-catalog__sidebar');
  await page
    .locator('[data-item-id="wa-button-group"]')
    .scrollIntoViewIfNeeded();
  if (browserName === 'chromium')
    await sidebar.screenshot({
      path: 'test-results/webawesome-discouraged-tags-wide.png',
    });

  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator('[data-item-id="wa-button-group"]')
    .scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
  if (browserName === 'chromium')
    await sidebar.screenshot({
      path: 'test-results/webawesome-discouraged-tags-narrow.png',
    });
});

test('catalog routes every production component family and supports its stateful controls', async ({
  page,
  browserName,
}) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await expect(
    page.locator('.kui-catalog__sidebar [data-component="list-header"]'),
  ).toHaveCount(catalogSections.length + 1);
  await expect(
    page.locator('.kui-catalog__sidebar [data-component="list-item"]'),
  ).toHaveCount(kerfCatalog.length);
  const ecosystemToggle = page.getByRole('button', {
    name: 'Web Awesome',
    exact: true,
  });
  await expect(ecosystemToggle).toHaveAttribute('aria-expanded', 'false');
  await ecosystemToggle.click();
  await expect(ecosystemToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.locator('.kui-catalog__sidebar [data-component="list-item"]'),
  ).toHaveCount(catalog.length);
  await expect(page.locator('[data-catalog-secondary] h3')).toHaveText([
    'Actions',
    'Forms',
    'Layout',
    'Navigation',
    'Feedback',
    'Media',
    'Helpers',
  ]);
  await ecosystemToggle.click();
  await expect(page.locator('[data-catalog-secondary]')).toHaveCount(0);
  await expect(page.locator('[data-demo="badge"]')).toBeVisible();
  for (const entry of catalog) {
    await page.goto(`/?component=${entry.id}`);
    const stableRouteMarker =
      entry.kind === 'recipe' ? 'data-recipe' : 'data-demo';
    await expect(
      page.locator(`[${stableRouteMarker}="${entry.id}"]`),
    ).toBeVisible();
    if (entry.source === 'webawesome') {
      await expect(page.locator(entry.id).first()).toBeAttached();
      await expect(page.locator('[data-catalog-secondary]')).toBeVisible();
    }
  }

  await page.locator('.kui-catalog__sidebar [data-item-id="list"]').click();
  await expect(page).toHaveURL(/component=list/);
  await expect(page.locator('[data-demo="list"]')).toBeVisible();
  await expect(
    page.locator('.kui-catalog__sidebar [data-item-id="list"]'),
  ).toHaveAttribute('aria-current', 'page');
  const menuRelationships = page.locator('[data-catalog-related]');
  await expect(menuRelationships.locator('..')).toHaveAttribute(
    'data-menu-inset',
    'compact',
  );
  const relatedTrigger = menuRelationships.locator('wa-button[slot="trigger"]');
  await expect(relatedTrigger).toHaveCount(1);
  await expect(relatedTrigger).toContainText('Components');
  await relatedTrigger.click();
  await expect(
    menuRelationships.locator('.kui-catalog__related-heading', {
      hasText: 'Uses',
    }),
  ).toBeVisible();
  await menuRelationships
    .locator('wa-dropdown-item[data-item-id="list-item"]')
    .click();
  await expect(page).toHaveURL(/component=list-item/);
  await expect(page.locator('[data-demo="list-item"]')).toBeVisible();
  await menuRelationships.locator('wa-button[slot="trigger"]').click();
  await expect(
    menuRelationships.locator('.kui-catalog__related-heading', {
      hasText: 'Used by',
    }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/?component=resize');
  const resizeRelationships = page.locator('[data-catalog-related]');
  await expect(
    resizeRelationships.locator('wa-button[slot="trigger"]'),
  ).toHaveCount(1);
  await resizeRelationships.locator('wa-button[slot="trigger"]').click();
  await expect(resizeRelationships).toContainText('Desktop application shell');
  await page.keyboard.press('Escape');

  const themeButton = page.locator('[data-action="toggle-theme"]');
  await themeButton.click();
  await expect(themeButton).toHaveAttribute('data-theme-preview', 'dark');
  await expect(themeButton).toHaveAttribute('aria-label', 'Use light theme');
  await expect(page.locator('html')).toHaveClass(/demo-dark/);
  await page.locator('[data-action="toggle-contrast"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-contrast/);
  await page.locator('[data-action="toggle-motion"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-reduced-motion/);

  await page.locator('.kui-catalog__sidebar [data-item-id="tabs"]').click();
  await expect(
    page.locator('[data-demo="tabs"] [data-component="tab-bar"]').first(),
  ).toHaveAttribute('data-tab-bar-id', 'app-tab-selected');
  await expect(
    page.locator('[data-demo="tabs"] [data-kui-tab-list]').first(),
  ).toHaveAttribute('aria-label', 'Selected AppTab specimen');
  const guidelinesRoot = page.locator(
    '[data-demo="tabs"] .kui-app-tab[data-tab-id="guidelines"]',
  );
  await expect(guidelinesRoot).toHaveAttribute(
    'data-demo-tab-source',
    'workspace',
  );
  await expect(guidelinesRoot).not.toHaveAttribute('data-action');
  await expect(guidelinesRoot).not.toHaveAttribute('role');
  await expect(
    guidelinesRoot.locator(
      '.kui-app-tab__close [data-lucide="custom-tab-close"]',
    ),
  ).toHaveAttribute('aria-hidden', 'true');
  await expect(
    guidelinesRoot.locator('.kui-app-tab__close-icon'),
  ).toHaveAttribute('aria-hidden', 'true');
  await page
    .locator('[data-action="select-tab"][data-tab-id="guidelines"]')
    .click();
  await expect(
    page.locator('[data-action="select-tab"][data-tab-id="guidelines"]'),
  ).toHaveAttribute('aria-selected', 'true');
  await page
    .locator('[data-action="select-tab"][data-tab-id="guidelines"]')
    .press('Backspace');
  await expect(page.locator('.catalog-log')).toHaveText(
    'Close requested for guidelines',
  );
  await expect(
    page.locator('[data-demo="tabs"] [data-catalog-example]'),
  ).toHaveCount(4);
  if (browserName === 'chromium')
    await page
      .locator('[data-demo="tabs"]')
      .screenshot({ path: 'test-results/app-tab-shared-tab-bar.png' });

  await page.locator('.kui-catalog__sidebar [data-item-id="feedback"]').click();
  const feedbackBanner = page.locator('[data-component="state-banner"]');
  for (const tone of ['pop', 'success', 'warning', 'danger']) {
    await page.locator('[data-action="cycle-tone"]').click();
    await expect(feedbackBanner).toHaveAttribute('data-tone', tone);
    await expect(feedbackBanner).toHaveAttribute(
      'role',
      tone === 'danger' ? 'alert' : 'status',
    );
  }

  await page.goto('/?component=resize');
  const handle = page.locator('[data-kui-resize-handle]');
  await handle.focus();
  await handle.press('ArrowRight');
  await expect(page.locator('[data-region-size]')).toHaveText('292px');
  await handle.press('End');
  await expect(page.locator('[data-region-size]')).toHaveText('420px');

  await page.goto('/?component=select');
  await page.locator('[name="rendering-balance"]').evaluate((element) => {
    const select = element as HTMLElement & { value: string };
    select.value = 'explicit';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('[data-select-value]')).toHaveText('explicit');

  if (browserName === 'chromium') {
    await page.goto('/?component=wa-button');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: 'test-results/webawesome-catalog-wide.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: 'test-results/webawesome-catalog-narrow.png',
      fullPage: true,
    });
    await page.goto('/?component=select');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page
      .locator('[data-demo="select"]')
      .screenshot({ path: 'test-results/web-awesome-select-wide.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: 'test-results/web-awesome-select-narrow.png',
      fullPage: true,
    });
    await page.goto('/?component=toolbar');
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.screenshot({
      path: 'test-results/ux-demo-wide.png',
      fullPage: true,
    });
    await page.locator('[data-action="toggle-theme"]').click();
    await page.screenshot({
      path: 'test-results/ux-demo-dark.png',
      fullPage: true,
    });
    await page.goto('/?component=toolbar');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: 'test-results/ux-demo-narrow.png',
      fullPage: true,
    });
  }
});

test('renders self-styled Badge variants without app CSS', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=badge');
  const demo = page.locator('[data-demo="badge"]');
  const badges = demo.locator('[data-component="badge"]');

  await expect(badges).toHaveCount(4);
  await expect(badges.nth(0)).toHaveAttribute('data-tone', 'success');
  await expect(badges.nth(1)).toHaveAttribute('aria-label', '12 unread items');
  await expect(badges.nth(1)).toHaveAttribute('data-appearance', 'solid');
  await expect(badges.nth(2)).toHaveAttribute('data-shape', 'rounded');
  await expect(badges.nth(2)).toHaveAttribute('data-appearance', 'outline');
  expect(
    await badges.evaluateAll((nodes) =>
      nodes.every((node) => {
        const bounds = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return (
          bounds.height >= 20 &&
          Number.parseFloat(style.paddingInlineStart) > 0 &&
          (style.display === 'inline-flex' || style.display === 'flex')
        );
      }),
    ),
  ).toBe(true);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/badge-wide.png',
      fullPage: true,
    });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(badges.last()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/badge-narrow.png',
      fullPage: true,
    });
});

test('renders ListHeader counts as accessible neutral pills across scale and theme', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=list-header');
  const demo = page.locator('[data-demo="list-header"]');
  const headerWithHeading = (name: string) =>
    demo
      .locator('.kui-list-header')
      .filter({ has: page.getByRole('heading', { name }) });
  const attachments = headerWithHeading('Attachments, 12 attachments');
  const count = attachments.locator('[data-component="badge"]');
  const notes = headerWithHeading('Notes, 0 notes');
  const duplicates = headerWithHeading('Duplicates, 2 duplicates');
  const preview = headerWithHeading('Preview');

  await expect(attachments).toHaveAttribute('data-has-count', 'true');
  await expect(attachments).toHaveAttribute('data-has-badge', 'false');
  await expect(
    attachments.getByRole('heading', { name: 'Attachments, 12 attachments' }),
  ).toBeVisible();
  await expect(
    attachments.getByRole('button', { name: 'Add attachment' }),
  ).toBeVisible();
  await expect(count).toHaveText('12');
  await expect(count).toHaveAttribute('aria-hidden', 'true');
  await expect(
    notes.getByRole('heading', { name: 'Notes, 0 notes' }),
  ).toBeVisible();
  await expect(notes.locator('[data-component="badge"]')).toHaveText('0');
  await expect(
    duplicates.getByRole('heading', { name: 'Duplicates, 2 duplicates' }),
  ).toBeVisible();
  await expect(duplicates.locator('[data-component="badge"]')).toHaveText('2');
  await expect(preview).toHaveAttribute('data-has-count', 'false');
  await expect(preview).toHaveAttribute('data-has-badge', 'true');
  await expect(preview.locator('[data-component="badge"]')).toHaveText('New');

  const countGeometry = () =>
    count.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        background: style.backgroundColor,
        borderRadius: parseFloat(style.borderRadius),
        fontSize: parseFloat(style.fontSize),
        height: bounds.height,
        width: bounds.width,
      };
    });
  const containment = () =>
    attachments.evaluate((header) => {
      const root = header.getBoundingClientRect();
      const title = header
        .querySelector<HTMLElement>('.kui-list-header__title')!
        .getBoundingClientRect();
      const countBounds = header
        .querySelector<HTMLElement>('[data-component="badge"]')!
        .getBoundingClientRect();
      const action = header
        .querySelector<HTMLElement>('.kui-list-header__action')!
        .getBoundingClientRect();
      return {
        actionAfterCount: action.left >= countBounds.right,
        countInsideRoot:
          countBounds.left >= root.left && countBounds.right <= root.right,
        countInsideTitle:
          countBounds.left >= title.left && countBounds.right <= title.right,
        documentOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      };
    });
  const expectContained = async () =>
    expect(await containment()).toEqual({
      actionAfterCount: true,
      countInsideRoot: true,
      countInsideTitle: true,
      documentOverflow: 0,
    });
  const baseline = await countGeometry();
  expect(baseline.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(baseline.borderRadius).toBeGreaterThanOrEqual(baseline.height / 2);
  expect(baseline.width).toBeGreaterThanOrEqual(baseline.height);
  await expectContained();
  if (browserName === 'chromium') {
    await attachments
      .locator('.kui-list-header__title')
      .screenshot({ path: 'test-results/list-header-count-wide.png' });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(attachments).toBeVisible();
  await expect(
    attachments.getByRole('heading', { name: 'Attachments, 12 attachments' }),
  ).toBeVisible();
  await expectContained();
  if (browserName === 'chromium') {
    await notes
      .locator('.kui-list-header__title')
      .screenshot({ path: 'test-results/list-header-count-narrow.png' });
  }

  await page.setViewportSize({ width: 720, height: 900 });
  await page.locator('html').evaluate((element) => {
    element.style.fontSize = '200%';
  });
  const scaled = await countGeometry();
  expect(scaled.height).toBeCloseTo(baseline.height * 2, 1);
  expect(scaled.fontSize).toBeCloseTo(baseline.fontSize * 2, 1);
  expect(scaled.width).toBeGreaterThanOrEqual(scaled.height);
  await expectContained();
  if (browserName === 'chromium') {
    await duplicates
      .locator('.kui-list-header__title')
      .screenshot({ path: 'test-results/list-header-count-zoom-200.png' });
  }

  await page.goto('/?component=list-header');
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.locator('[data-action="toggle-theme"]').click();
  await expect(count).toBeVisible();
  expect((await countGeometry()).background).not.toBe('rgba(0, 0, 0, 0)');
  if (browserName === 'chromium') {
    await attachments
      .locator('.kui-list-header__title')
      .screenshot({ path: 'test-results/list-header-count-dark.png' });
  }
});

test('fills ListHeader rows and keeps 18px action visuals at the logical end', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=list-header');
  const demo = page.locator('[data-demo="list-header"]');
  const headers = demo.locator('.kui-list-header[data-inline="false"]');
  const attachments = demo.locator('.kui-list-header').filter({
    has: page.getByRole('heading', { name: 'Attachments, 12 attachments' }),
  });
  const unavailable = demo
    .locator('.kui-list-header')
    .filter({ has: page.getByRole('button', { name: 'Unavailable action' }) });

  const geometry = (header: typeof attachments) =>
    header.evaluate((root) => {
      const wrapper = root.parentElement!;
      const wrapperBounds = wrapper.getBoundingClientRect();
      const wrapperStyle = window.getComputedStyle(wrapper);
      const rootBounds = root.getBoundingClientRect();
      const titleBounds = root
        .querySelector<HTMLElement>('.kui-list-header__title')!
        .getBoundingClientRect();
      const action = root.querySelector<HTMLElement>(
        '.kui-list-header__action',
      );
      const actionBounds = action?.getBoundingClientRect();
      const visual = root.querySelector<HTMLElement>(
        '.kui-list-header__action > svg, [data-component="disclosure-arrow"]',
      );
      const visualBounds = visual?.getBoundingClientRect();
      const direction = window.getComputedStyle(root).direction;
      const contentLeft =
        wrapperBounds.left +
        parseFloat(wrapperStyle.borderLeftWidth) +
        parseFloat(wrapperStyle.paddingLeft);
      const contentRight =
        wrapperBounds.right -
        parseFloat(wrapperStyle.borderRightWidth) -
        parseFloat(wrapperStyle.paddingRight);
      const logicalStart = (left: number, right: number) =>
        direction === 'rtl' ? contentRight - right : left - contentLeft;
      const logicalEnd = (left: number, right: number) =>
        direction === 'rtl' ? left - contentLeft : contentRight - right;
      const rootLogicalEnd = (bounds: DOMRect) =>
        direction === 'rtl'
          ? bounds.left - rootBounds.left
          : rootBounds.right - bounds.right;
      return {
        actionHeight: actionBounds?.height,
        actionLogicalEnd: actionBounds && rootLogicalEnd(actionBounds),
        actionWidth: actionBounds?.width,
        documentOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        rootEnd: logicalEnd(rootBounds.left, rootBounds.right),
        rootStart: logicalStart(rootBounds.left, rootBounds.right),
        titleActionOverlap: actionBounds
          ? Math.max(
              0,
              Math.min(titleBounds.right, actionBounds.right) -
                Math.max(titleBounds.left, actionBounds.left),
            )
          : 0,
        visualHeight: visualBounds?.height,
        visualInsideAction:
          actionBounds && visualBounds
            ? visualBounds.left >= actionBounds.left &&
              visualBounds.right <= actionBounds.right &&
              visualBounds.top >= actionBounds.top &&
              visualBounds.bottom <= actionBounds.bottom
            : undefined,
        visualCenterDelta:
          actionBounds && visualBounds
            ? Math.abs(
                visualBounds.left +
                  visualBounds.width / 2 -
                  (actionBounds.left + actionBounds.width / 2),
              )
            : undefined,
        visualWidth: visualBounds?.width,
      };
    });
  const rootGeometry = () =>
    headers.evaluateAll((roots) =>
      roots.map((root) => {
        const wrapper = root.parentElement!;
        const wrapperBounds = wrapper.getBoundingClientRect();
        const wrapperStyle = window.getComputedStyle(wrapper);
        const rootBounds = root.getBoundingClientRect();
        const direction = window.getComputedStyle(root).direction;
        const contentLeft =
          wrapperBounds.left +
          parseFloat(wrapperStyle.borderLeftWidth) +
          parseFloat(wrapperStyle.paddingLeft);
        const contentRight =
          wrapperBounds.right -
          parseFloat(wrapperStyle.borderRightWidth) -
          parseFloat(wrapperStyle.paddingRight);
        return {
          end:
            direction === 'rtl'
              ? rootBounds.left - contentLeft
              : contentRight - rootBounds.right,
          start:
            direction === 'rtl'
              ? contentRight - rootBounds.right
              : rootBounds.left - contentLeft,
        };
      }),
    );
  const expectLayout = async (scale: number) => {
    for (const root of await rootGeometry()) {
      expect(root.start).toBeCloseTo(8 * scale, 0);
      expect(root.end).toBeCloseTo(8 * scale, 0);
    }
    const attachmentGeometry = await geometry(attachments);
    const unavailableGeometry = await geometry(unavailable);
    for (const measured of [attachmentGeometry, unavailableGeometry]) {
      expect(measured.rootStart).toBeCloseTo(8 * scale, 0);
      expect(measured.rootEnd).toBeCloseTo(8 * scale, 0);
      expect(measured.visualWidth).toBeCloseTo(18 * scale, 0);
      expect(measured.visualHeight).toBeCloseTo(18 * scale, 0);
      expect(measured.documentOverflow).toBeLessThanOrEqual(1);
    }
    for (const measured of [attachmentGeometry, unavailableGeometry]) {
      // The action is a fitted square: 18px icon + 8px padding each side (both
      // rem-based, so they track the font scale) + a 1px border each side (literal
      // px, unscaled) = 36px at 1x — not a forced 44px box with a halo, nor a
      // stretched oval.
      expect(measured.actionWidth).toBeCloseTo((18 + 16) * scale + 2, 0);
      expect(measured.actionHeight).toBeCloseTo((18 + 16) * scale + 2, 0);
      expect(measured.actionLogicalEnd).toBeCloseTo(0, 0);
      expect(measured.titleActionOverlap).toBe(0);
      expect(measured.visualInsideAction).toBe(true);
      expect(measured.visualCenterDelta).toBeLessThanOrEqual(1);
    }
  };

  await expect(
    demo.locator('.kui-list-header[data-toggle="true"]'),
  ).toHaveCount(0);

  await expectLayout(1);
  await attachments.evaluate((element) =>
    element.style.setProperty('--kui-list-header-action-icon-size', '20px'),
  );
  // A larger icon grows the fitted square with it (20 + 8 + 8 + 1 + 1 = 38).
  expect(await geometry(attachments)).toMatchObject({
    actionHeight: 38,
    actionWidth: 38,
    visualHeight: 20,
    visualWidth: 20,
  });
  await attachments.evaluate((element) =>
    element.style.removeProperty('--kui-list-header-action-icon-size'),
  );
  await expectLayout(1);
  if (browserName === 'chromium')
    await demo.screenshot({ path: 'test-results/list-header-layout-wide.png' });

  await page.setViewportSize({ width: 390, height: 900 });
  await demo.scrollIntoViewIfNeeded();
  await expectLayout(1);
  if (browserName === 'chromium')
    await demo.screenshot({
      path: 'test-results/list-header-layout-narrow.png',
    });

  await page.setViewportSize({ width: 1100, height: 900 });
  await page.locator('[data-action="toggle-theme"]').click();
  await expectLayout(1);
  if (browserName === 'chromium')
    await demo.screenshot({ path: 'test-results/list-header-layout-dark.png' });

  await page.locator('[data-action="toggle-theme"]').click();
  await demo.evaluate((element) => element.setAttribute('dir', 'rtl'));
  await expectLayout(1);
  if (browserName === 'chromium')
    await demo.screenshot({ path: 'test-results/list-header-layout-rtl.png' });
  await demo.evaluate((element) => element.removeAttribute('dir'));

  await page.setViewportSize({ width: 720, height: 1100 });
  await page.locator('html').evaluate((element) => {
    element.style.fontSize = '200%';
  });
  await demo.scrollIntoViewIfNeeded();
  await expectLayout(2);
  if (browserName === 'chromium')
    await demo.screenshot({
      path: 'test-results/list-header-layout-zoom-200.png',
    });
});

test('shrink-wraps inline ListHeader without root geometry or split action layout', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=list-header');
  const context = page.locator('.demo-list-header-inline-context');
  const header = context.locator('.kui-list-header');

  const geometry = () =>
    header.evaluate((root) => {
      const bounds = root.getBoundingClientRect();
      const style = window.getComputedStyle(root);
      const title = root
        .querySelector<HTMLElement>('.kui-list-header__title')!
        .getBoundingClientRect();
      const action = root
        .querySelector<HTMLElement>('.kui-list-header__action')!
        .getBoundingClientRect();
      const parent = root.parentElement!.getBoundingClientRect();
      return {
        borderWidths: [
          style.borderTopWidth,
          style.borderRightWidth,
          style.borderBottomWidth,
          style.borderLeftWidth,
        ],
        display: style.display,
        documentOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        marginWidths: [
          style.marginTop,
          style.marginRight,
          style.marginBottom,
          style.marginLeft,
        ],
        paddingWidths: [
          style.paddingTop,
          style.paddingRight,
          style.paddingBottom,
          style.paddingLeft,
        ],
        shrinkWrapped: bounds.width < parent.width - 2,
        titleActionSameLine:
          Math.abs(
            title.top + title.height / 2 - (action.top + action.height / 2),
          ) <= 1,
      };
    });

  const expectInlineGeometry = async () => {
    await expect(header).toHaveAttribute('data-inline', 'true');
    expect(await geometry()).toEqual({
      borderWidths: ['0px', '0px', '0px', '0px'],
      display: 'inline-flex',
      documentOverflow: 0,
      marginWidths: ['0px', '0px', '0px', '0px'],
      paddingWidths: ['0px', '0px', '0px', '0px'],
      shrinkWrapped: true,
      titleActionSameLine: true,
    });
  };

  await expectInlineGeometry();
  if (browserName === 'chromium')
    await context.screenshot({
      path: 'test-results/list-header-inline-wide.png',
    });

  await page.setViewportSize({ width: 390, height: 844 });
  await context.scrollIntoViewIfNeeded();
  await expectInlineGeometry();
  if (browserName === 'chromium')
    await context.screenshot({
      path: 'test-results/list-header-inline-narrow.png',
    });

  await page.setViewportSize({ width: 720, height: 900 });
  await page.locator('html').evaluate((element) => {
    element.style.fontSize = '200%';
  });
  await context.scrollIntoViewIfNeeded();
  await expectInlineGeometry();
  await context.evaluate((element) => element.setAttribute('dir', 'rtl'));
  await expectInlineGeometry();
});

test('preserves menu extension metadata without surrendering native semantics', async ({
  page,
  browserName,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=list-header');
  const headerDemo = page.locator('[data-demo="list-header"]');
  await expect(
    headerDemo.getByRole('heading', { name: 'Attachments, 12 attachments' }),
  ).toHaveCount(1);
  const popoverTrigger = headerDemo.getByRole('button', {
    name: 'Add attachment',
  });
  await expect(popoverTrigger).toHaveAttribute(
    'popovertarget',
    'list-header-attachments-popover',
  );
  await expect(popoverTrigger).toHaveAttribute('popovertargetaction', 'toggle');
  await expect(popoverTrigger).toHaveAttribute(
    'aria-controls',
    'list-header-attachments-popover',
  );
  await expect(popoverTrigger).toHaveAttribute('aria-haspopup', 'dialog');
  await popoverTrigger.press('Enter');
  const popover = page.locator('#list-header-attachments-popover');
  await expect
    .poll(() => popover.evaluate((element) => element.matches(':popover-open')))
    .toBe(true);
  await expect(page.locator('.catalog-log')).toHaveText('Add action requested');
  if (browserName === 'chromium') {
    await page.screenshot({
      path: 'test-results/list-header-popover-wide.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await headerDemo.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'test-results/list-header-popover-narrow.png',
    });
    await page.setViewportSize({ width: 1100, height: 760 });
  }
  await page.keyboard.press('Escape');
  await expect
    .poll(() => popover.evaluate((element) => element.matches(':popover-open')))
    .toBe(false);

  await expect(
    headerDemo.locator('.kui-list-header[data-toggle="true"]'),
  ).toHaveCount(0);
  const disabled = headerDemo.getByRole('button', {
    name: 'Unavailable action',
  });
  await expect(disabled).toBeDisabled();
  expect(
    await disabled.evaluate((button) => {
      let activations = 0;
      button.addEventListener(
        'click',
        () => {
          activations += 1;
        },
        { once: true },
      );
      (button as HTMLButtonElement).click();
      return activations;
    }),
  ).toBe(0);
  await expect(page.locator('.catalog-log')).toHaveText('Add action requested');
  await expect
    .poll(() => popover.evaluate((element) => element.matches(':popover-open')))
    .toBe(false);
  await expect
    .poll(() =>
      popover.evaluate((element) => window.getComputedStyle(element).display),
    )
    .toBe('none');
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/list-header-disabled-action-wide.png',
      fullPage: true,
    });

  await page.goto('/?component=list-item');
  const row = page.locator('[data-demo="list-item"] [data-item-id="selected"]');
  await expect(row).toHaveAttribute('data-demo-drop-status', 'ready');
  await expect(row).toHaveAttribute('data-action', 'log-inbox');
  const selectedContrast = () =>
    row.evaluate((element) => {
      const context = document.createElement('canvas').getContext('2d');
      const colors = window.getComputedStyle(element);
      const luminance = (color: string): number => {
        if (!context) return 0;
        context.canvas.width = 1;
        context.canvas.height = 1;
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const channels = [
          ...context.getImageData(0, 0, 1, 1).data.slice(0, 3),
        ].map((channel) => {
          const value = channel / 255;
          return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
        });
        return (
          0.2126 * (channels[0] ?? 0) +
          0.7152 * (channels[1] ?? 0) +
          0.0722 * (channels[2] ?? 0)
        );
      };
      const foreground = luminance(colors.color);
      const background = luminance(colors.backgroundColor);
      return (
        (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05)
      );
    });
  // poll so the ratio is read only once color-mix()/light-dark() have settled
  // (Firefox recomputes the mixed background a paint tick after the class flips).
  await expect
    .poll(selectedContrast, 'light selected ListItem contrast')
    .toBeGreaterThanOrEqual(4.5);
  await page.locator('[data-action="toggle-theme"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-dark/);
  await expect
    .poll(selectedContrast, 'dark selected ListItem contrast')
    .toBeGreaterThanOrEqual(4.5);
  await page.locator('[data-action="toggle-theme"]').click();
  await row.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText('Inbox selected');
  await row.press('Space');
  await expect(page.locator('.catalog-log')).toHaveText('Inbox selected');
  await row.dispatchEvent('dragover');
  await expect(row).toHaveAttribute('data-demo-drop-status', 'over');
  await expect(page.locator('.catalog-log')).toHaveText('Drop target ready');
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/list-item-drop-feedback-wide.png',
      fullPage: true,
    });
  await row.dispatchEvent('drop');
  await expect(page.locator('.catalog-log')).toHaveText('Dropped on selected');
  await expect(row).toHaveAttribute('data-demo-drop-status', 'ready');
  if (browserName === 'chromium') {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: 'test-results/list-item-extension-narrow.png',
      fullPage: true,
    });
  }
});

test('renders configured List family density, status, busy, dividers, and interaction actions', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=list-item');
  const statusItem = page.locator('[data-item-id="status"]');
  await expect(statusItem).toHaveAttribute('data-density', 'compact');
  await expect(statusItem).toHaveAttribute('data-divider', 'before');
  await expect(statusItem.locator('.kui-list-item__description')).toHaveText(
    'Updated a moment ago',
  );
  await expect(statusItem.locator('.kui-list-item__status')).toHaveText(
    'Passing',
  );
  await expect(statusItem).toHaveCSS('overflow', 'hidden');
  const statusGeometry = await statusItem.evaluate((element) => {
    const root = element.getBoundingClientRect();
    const children = [
      ...element.querySelectorAll<HTMLElement>(
        '.kui-list-item__label, .kui-list-item__trailing',
      ),
    ].map((child) => child.getBoundingClientRect());
    return {
      childrenWithinBlock: children.every(
        (child) => child.top >= root.top - 1 && child.bottom <= root.bottom + 1,
      ),
      documentOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
  expect(statusGeometry).toEqual({
    childrenWithinBlock: true,
    documentOverflow: 0,
  });
  if (browserName === 'chromium') {
    await statusItem.screenshot({
      path: 'test-results/list-item-clipping-wide.png',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await statusItem.screenshot({
      path: 'test-results/list-item-clipping-narrow.png',
    });
    await page.setViewportSize({ width: 1100, height: 760 });
  }
  const busyItem = page.locator('[data-item-id="busy"]');
  await expect(busyItem).toHaveAttribute('aria-busy', 'true');
  await expect(
    busyItem.locator('[data-component="loading-spinner"]'),
  ).toBeVisible();

  await page.goto('/?component=list-header');
  const attention = page.locator('.kui-list-header', {
    hasText: 'Needs attention',
  });
  await expect(attention).toHaveAttribute('data-density', 'compact');
  await expect(attention).toHaveAttribute('data-indicator-tone', 'danger');
  await expect(attention.locator('[data-component="badge"]')).toHaveText(
    '3 blocked',
  );

  await page.goto('/?component=list-action-row');
  const actionRow = page.locator('[data-demo-action-row="status"]');
  const trailing = actionRow.getByRole('button', {
    name: 'Actions for generated report',
  });
  await expect(
    actionRow.locator('.kui-list-action-row__description'),
  ).toHaveText('Ready to review');
  await expect(actionRow.locator('.kui-list-action-row__status')).toHaveText(
    '3 warnings',
  );
  await expect(trailing).toHaveCSS('opacity', '0');
  await actionRow
    .getByRole('button', { name: 'generated-report.json' })
    .focus();
  await expect(trailing).toHaveCSS('opacity', '1');
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/list-family-configured-variants-wide.png',
      fullPage: true,
    });
  if (browserName === 'chromium') {
    await page.setViewportSize({ width: 390, height: 844 });
    await actionRow.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'test-results/list-family-configured-variants-narrow.png',
      fullPage: true,
    });
  }
});

test('keeps ListActionRow primary and trailing controls independent across interaction and layout states', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=list-action-row');
  const demo = page.locator('[data-demo="list-action-row"]');
  const selectedRow = demo.locator('[data-demo-action-row="selected"]');
  const primary = selectedRow.getByRole('button', {
    name: 'Select src/main.ts',
  });
  const trailing = selectedRow.getByRole('button', {
    name: 'Actions for src/main.ts',
  });
  const pressedRow = demo.locator('[data-demo-action-row="multiline"]');
  const pressedPrimary = pressedRow.getByRole('button', {
    name: 'Select long file',
  });

  await expect(selectedRow.locator(':scope > button')).toHaveCount(2);
  await expect(selectedRow).not.toHaveAttribute('role');
  await expect(selectedRow).not.toHaveAttribute('data-action');
  await expect(primary).toHaveAttribute(
    'data-action',
    'select-list-action-row',
  );
  await expect(trailing).toHaveAttribute(
    'data-action',
    'open-list-action-row-actions',
  );
  await expect(primary).toHaveAttribute('data-item-id', 'src/main.ts');
  await expect(trailing).toHaveAttribute('data-item-id', 'src/main.ts');
  await expect(selectedRow).toHaveAttribute('data-selected', 'true');
  await expect(selectedRow).not.toHaveAttribute('data-pressed');
  await expect(primary).toHaveAttribute('aria-current', 'page');
  await expect(primary).not.toHaveAttribute('aria-pressed');
  await expect(trailing).not.toHaveAttribute('aria-pressed');

  // Selected-row text must clear WCAG AA (4.5:1) over its brand-tinted fill in
  // both themes, the same guarantee the selected ListItem row makes. Resolve
  // colors through a canvas so any serialization (rgb()/color(srgb …)) works.
  const selectedContrast = () =>
    primary.evaluate((element) => {
      const context = document.createElement('canvas').getContext('2d');
      const luminance = (color: string): number => {
        if (!context) return 0;
        context.canvas.width = 1;
        context.canvas.height = 1;
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const channels = [
          ...context.getImageData(0, 0, 1, 1).data.slice(0, 3),
        ].map((channel) => {
          const value = channel / 255;
          return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
        });
        return (
          0.2126 * (channels[0] ?? 0) +
          0.7152 * (channels[1] ?? 0) +
          0.0722 * (channels[2] ?? 0)
        );
      };
      let backgroundHost: Element | null = element;
      let background = 'rgba(0, 0, 0, 0)';
      while (backgroundHost) {
        const candidate =
          window.getComputedStyle(backgroundHost).backgroundColor;
        if (candidate && !/rgba\(0, 0, 0, 0\)|transparent/.test(candidate)) {
          background = candidate;
          break;
        }
        backgroundHost = backgroundHost.parentElement;
      }
      const foreground = luminance(window.getComputedStyle(element).color);
      const back = luminance(background);
      return (
        (Math.max(foreground, back) + 0.05) /
        (Math.min(foreground, back) + 0.05)
      );
    });
  await expect
    .poll(selectedContrast, 'light selected ListActionRow contrast')
    .toBeGreaterThanOrEqual(4.5);
  await page.locator('[data-action="toggle-theme"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-dark/);
  await expect
    .poll(selectedContrast, 'dark selected ListActionRow contrast')
    .toBeGreaterThanOrEqual(4.5);
  await page.locator('[data-action="toggle-theme"]').click();
  await expect(page.locator('html')).not.toHaveClass(/demo-dark/);
  await expect(pressedRow).toHaveAttribute('data-selected', 'false');
  await expect(pressedRow).toHaveAttribute('data-pressed', 'false');
  await expect(pressedPrimary).not.toHaveAttribute('aria-current');
  await expect(pressedPrimary).toHaveAttribute('aria-pressed', 'false');
  await expect(primary.locator('button, a, [role="button"]')).toHaveCount(0);
  await expect(trailing.locator('button, a, [role="button"]')).toHaveCount(0);

  await primary.focus();
  await expect(primary).toBeFocused();
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/list-action-row-primary-focus-wide.png',
      fullPage: true,
    });
  expect(
    await selectedRow.locator(':scope > button').evaluateAll((buttons) =>
      buttons.map((button) => ({
        name: button.getAttribute('aria-label'),
        tabIndex: (button as HTMLButtonElement).tabIndex,
      })),
    ),
  ).toEqual([
    { name: 'Select src/main.ts', tabIndex: 0 },
    { name: 'Actions for src/main.ts', tabIndex: 0 },
  ]);
  if (browserName === 'webkit') await trailing.focus();
  else await page.keyboard.press('Tab');
  await expect(trailing).toBeFocused();
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/list-action-row-trailing-focus-wide.png',
      fullPage: true,
    });

  await primary.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText('src/main.ts selected');
  await primary.press('Space');
  await expect(page.locator('.catalog-log')).toHaveText('src/main.ts selected');
  await expect(selectedRow).toHaveAttribute('data-selected', 'true');

  const popover = page.locator('#list-action-row-popover');
  await trailing.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText(
    'Actions requested for src/main.ts',
  );
  await expect(selectedRow).toHaveAttribute('data-selected', 'true');
  await expect
    .poll(() => popover.evaluate((element) => element.matches(':popover-open')))
    .toBe(true);
  await page.keyboard.press('Escape');
  await trailing.press('Space');
  await expect(page.locator('.catalog-log')).toHaveText(
    'Actions requested for src/main.ts',
  );
  await expect(selectedRow).toHaveAttribute('data-selected', 'true');
  await expect
    .poll(() => popover.evaluate((element) => element.matches(':popover-open')))
    .toBe(true);
  await page.keyboard.press('Escape');
  await trailing.click();
  await expect(page.locator('.catalog-log')).toHaveText(
    'Actions requested for src/main.ts',
  );
  await expect(selectedRow).toHaveAttribute('data-selected', 'true');
  await page.keyboard.press('Escape');

  await trailing.dispatchEvent('dblclick');
  await expect(page.locator('.catalog-log')).toHaveText(
    'Actions requested for src/main.ts',
  );
  await trailing.dispatchEvent('contextmenu');
  await expect(page.locator('.catalog-log')).toHaveText(
    'Actions requested for src/main.ts',
  );
  await primary.dispatchEvent('dblclick');
  await expect(page.locator('.catalog-log')).toHaveText(
    'Double-clicked src/main.ts primary',
  );
  await primary.dispatchEvent('contextmenu');
  await expect(page.locator('.catalog-log')).toHaveText(
    'Context menu for src/main.ts primary',
  );

  await pressedPrimary.click();
  await expect(page.locator('.catalog-log')).toHaveText('long-file pressed');
  await expect(pressedRow).toHaveAttribute('data-pressed', 'true');
  await expect(pressedPrimary).toHaveAttribute('aria-pressed', 'true');
  await expect(selectedRow).toHaveAttribute('data-selected', 'true');
  const pressedTrailing = pressedRow.getByRole('button', {
    name: 'Actions for long file',
  });
  await pressedTrailing.click();
  await expect(page.locator('.catalog-log')).toHaveText(
    'Actions requested for long-file',
  );
  await expect(pressedRow).toHaveAttribute('data-pressed', 'true');
  await expect(selectedRow).toHaveAttribute('data-selected', 'true');

  const disabledPrimary = demo.locator(
    '[data-demo-action-row="disabled-primary"]',
  );
  await expect(
    disabledPrimary.locator('.kui-list-action-row__primary'),
  ).toBeDisabled();
  const availableTrailing = disabledPrimary.getByRole('button', {
    name: 'Actions for unavailable primary',
  });
  await expect(availableTrailing).toBeEnabled();
  await availableTrailing.click();
  await expect(page.locator('.catalog-log')).toHaveText(
    'Actions requested for disabled-primary',
  );

  const disabledTrailing = demo.locator(
    '[data-demo-action-row="disabled-trailing"]',
  );
  const availablePrimary = disabledTrailing.getByRole('button', {
    name: 'Unavailable trailing action',
  });
  await expect(availablePrimary).toBeEnabled();
  await expect(
    disabledTrailing.getByRole('button', { name: 'Unavailable actions' }),
  ).toBeDisabled();
  await availablePrimary.click();
  await expect(page.locator('.catalog-log')).toHaveText(
    'disabled-trailing selected',
  );
  await expect(disabledTrailing).toHaveAttribute('data-selected', 'true');
  await expect(availablePrimary).toHaveAttribute('aria-current', 'page');
  await expect(pressedRow).toHaveAttribute('data-pressed', 'true');

  await pressedPrimary.click();
  await expect(pressedRow).toHaveAttribute('data-pressed', 'false');
  const resolveListActionRowColors = () =>
    pressedRow.evaluate((element) => {
      const resolveBackground = (property: string) => {
        const probe = document.createElement('span');
        probe.style.backgroundColor = `var(${property})`;
        element.append(probe);
        const color = window.getComputedStyle(probe).backgroundColor;
        probe.remove();
        return color;
      };
      return {
        trailingHover: resolveBackground(
          '--kui-list-action-row-trailing-hover-background',
        ),
        neutralFill: resolveBackground('--kui-color-neutral-fill-normal'),
      };
    });
  const lightColors = await resolveListActionRowColors();
  expect(lightColors.trailingHover).toBe(lightColors.neutralFill);
  const themeButton = page.locator('[data-action="toggle-theme"]');
  await themeButton.click();
  const darkColors = await resolveListActionRowColors();
  expect(darkColors.trailingHover).toBe(darkColors.neutralFill);
  expect(darkColors.trailingHover).not.toBe(lightColors.trailingHover);
  await pressedTrailing.hover();
  await expect
    .poll(() =>
      pressedTrailing.evaluate(
        (element) => window.getComputedStyle(element).backgroundColor,
      ),
    )
    .toBe(darkColors.trailingHover);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/list-action-row-dark-hover-wide.png',
      fullPage: true,
    });
  await themeButton.click();
  await page.mouse.move(0, 0);

  const geometry = () =>
    demo.evaluate((node) => {
      const row = node.querySelector<HTMLElement>(
        '[data-demo-action-row="selected"]',
      )!;
      const parent = row.parentElement!;
      const primaryControl = row.querySelector<HTMLElement>(
        ':scope > .kui-list-action-row__primary',
      )!;
      const trailingControl = row.querySelector<HTMLElement>(
        ':scope > .kui-list-action-row__trailing-action',
      )!;
      const icon = row.querySelector<HTMLElement>(
        '.kui-list-action-row__icon',
      )!;
      const multilineRow = node.querySelector<HTMLElement>(
        '[data-demo-action-row="multiline"]',
      )!;
      const multilinePrimary = multilineRow.querySelector<HTMLElement>(
        ':scope > .kui-list-action-row__primary',
      )!;
      const multilineTrailing = multilineRow.querySelector<HTMLElement>(
        ':scope > .kui-list-action-row__trailing-action',
      )!;
      const longLabel = multilineRow.querySelector<HTMLElement>(
        '.kui-list-action-row__label',
      )!;
      const rowBox = row.getBoundingClientRect();
      const parentBox = parent.getBoundingClientRect();
      const primaryBox = primaryControl.getBoundingClientRect();
      const trailingBox = trailingControl.getBoundingClientRect();
      const iconBox = icon.getBoundingClientRect();
      const multilineRowBox = multilineRow.getBoundingClientRect();
      const multilinePrimaryBox = multilinePrimary.getBoundingClientRect();
      const multilineTrailingBox = multilineTrailing.getBoundingClientRect();
      const longLabelBox = longLabel.getBoundingClientRect();
      const parentStyle = window.getComputedStyle(parent);
      const direction = window.getComputedStyle(row).direction;
      const parentContentStart =
        direction === 'rtl'
          ? parentBox.right -
            parseFloat(parentStyle.borderRightWidth) -
            parseFloat(parentStyle.paddingRight)
          : parentBox.left +
            parseFloat(parentStyle.borderLeftWidth) +
            parseFloat(parentStyle.paddingLeft);
      const rowStart =
        direction === 'rtl'
          ? parentContentStart - rowBox.right
          : rowBox.left - parentContentStart;
      const iconStart =
        direction === 'rtl'
          ? rowBox.right - iconBox.right
          : iconBox.left - rowBox.left;
      const controlsOverlap = Math.max(
        0,
        Math.min(primaryBox.right, trailingBox.right) -
          Math.max(primaryBox.left, trailingBox.left),
      );
      return {
        rowStart,
        iconStart,
        rowHeight: rowBox.height,
        primaryWidth: primaryBox.width,
        primaryHeight: primaryBox.height,
        trailingWidth: trailingBox.width,
        trailingHeight: trailingBox.height,
        controlsOverlap,
        longLabelOverflow: longLabel.scrollWidth - longLabel.clientWidth,
        longLabelVerticalOverflow:
          longLabel.scrollHeight - longLabel.clientHeight,
        multilinePrimaryVerticalOverflow:
          multilinePrimary.scrollHeight - multilinePrimary.clientHeight,
        multilineRowVerticalOverflow:
          multilineRow.scrollHeight - multilineRow.clientHeight,
        longLabelTopInset: longLabelBox.top - multilinePrimaryBox.top,
        longLabelBottomInset: multilinePrimaryBox.bottom - longLabelBox.bottom,
        multilinePrimaryTopInset: multilinePrimaryBox.top - multilineRowBox.top,
        multilinePrimaryBottomInset:
          multilineRowBox.bottom - multilinePrimaryBox.bottom,
        multilineTrailingTopInset:
          multilineTrailingBox.top - multilineRowBox.top,
        multilineTrailingBottomInset:
          multilineRowBox.bottom - multilineTrailingBox.bottom,
        multilineRowHeight: multilineRowBox.height,
        multilinePrimaryHeight: multilinePrimaryBox.height,
        multilineTrailingHeight: multilineTrailingBox.height,
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      };
    });
  const near = (name: string, actual: number, expected: number) =>
    expect(
      Math.abs(actual - expected),
      `${name}: ${actual}`,
    ).toBeLessThanOrEqual(1);
  const expectGeometry = (
    actual: Awaited<ReturnType<typeof geometry>>,
    scale: number,
  ) => {
    near('rowStart', actual.rowStart, 8 * scale);
    near('iconStart', actual.iconStart, 1 + 8 * scale);
    expect(actual.rowHeight).toBeGreaterThanOrEqual(44 * scale);
    expect(actual.primaryWidth).toBeGreaterThanOrEqual(44 * scale);
    expect(actual.primaryHeight).toBeGreaterThanOrEqual(44 * scale);
    expect(actual.trailingWidth).toBeGreaterThanOrEqual(44 * scale);
    expect(actual.trailingHeight).toBeGreaterThanOrEqual(44 * scale);
    expect(actual.controlsOverlap).toBe(0);
    expect(actual.longLabelOverflow).toBeLessThanOrEqual(1);
    expect(actual.longLabelVerticalOverflow).toBeLessThanOrEqual(1);
    expect(actual.multilinePrimaryVerticalOverflow).toBeLessThanOrEqual(1);
    expect(actual.multilineRowVerticalOverflow).toBeLessThanOrEqual(1);
    expect(actual.longLabelTopInset).toBeGreaterThanOrEqual(-1);
    expect(actual.longLabelBottomInset).toBeGreaterThanOrEqual(-1);
    expect(actual.multilinePrimaryTopInset).toBeGreaterThanOrEqual(-1);
    expect(actual.multilinePrimaryBottomInset).toBeGreaterThanOrEqual(-1);
    expect(actual.multilineTrailingTopInset).toBeGreaterThanOrEqual(-1);
    expect(actual.multilineTrailingBottomInset).toBeGreaterThanOrEqual(-1);
    near(
      'multiline primary stretch',
      actual.multilinePrimaryHeight,
      actual.multilineRowHeight,
    );
    near(
      'multiline trailing stretch',
      actual.multilineTrailingHeight,
      actual.multilineRowHeight,
    );
    expect(actual.horizontalOverflow).toBeLessThanOrEqual(1);
  };

  expectGeometry(await geometry(), 1);
  await demo.evaluate((node) => node.setAttribute('dir', 'rtl'));
  expectGeometry(await geometry(), 1);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/list-action-row-rtl-wide.png',
      fullPage: true,
    });
  await demo.evaluate((node) => node.removeAttribute('dir'));

  await page.setViewportSize({ width: 390, height: 844 });
  await demo.scrollIntoViewIfNeeded();
  expectGeometry(await geometry(), 1);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/list-action-row-narrow.png',
      fullPage: true,
    });

  await page.setViewportSize({ width: 720, height: 900 });
  await page.locator('html').evaluate((element) => {
    element.style.fontSize = '200%';
  });
  await demo.scrollIntoViewIfNeeded();
  expectGeometry(await geometry(), 2);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/list-action-row-zoom-200.png',
      fullPage: true,
    });
  if (browserName === 'chromium') {
    await page.emulateMedia({ forcedColors: 'active' });
    await expect(selectedRow).toHaveCSS('outline-style', 'solid');
    await expect(selectedRow).toHaveCSS('outline-width', '1px');
    await page.screenshot({
      path: 'test-results/list-action-row-forced-colors.png',
      fullPage: true,
    });
    await page.emulateMedia({ forcedColors: 'none' });
  }
});

test('composes one truthful production disclosure in the menu', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto('/?component=list');
  const menu = page.locator('[data-demo="list"]');
  const toggle = menu.getByRole('button', { name: 'Tools' });
  const panel = menu.locator('#menu-tools-content');
  const arrow = toggle.locator('[data-component="disclosure-arrow"]');
  const arrowGeometry = () =>
    arrow.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const owner = element.closest('button')!.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const transform = new DOMMatrixReadOnly(style.transform);
      return {
        height: bounds.height,
        insideOwner:
          bounds.left >= owner.left &&
          bounds.right <= owner.right &&
          bounds.top >= owner.top &&
          bounds.bottom <= owner.bottom,
        transform: [transform.a, transform.b, transform.c, transform.d].map(
          (value) => Math.round(value),
        ),
        transitionDuration: style.transitionDuration,
        width: bounds.width,
      };
    });

  await expect(menu.locator('[data-component="disclosure-arrow"]')).toHaveCount(
    1,
  );
  await expect(
    menu.locator('[data-item-id="projects"] .kui-list-item__trailing'),
  ).toHaveCount(0);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAttribute('aria-controls', 'menu-tools-content');
  await expect(arrow).toHaveAttribute('data-open', 'true');
  await expect(arrow).toHaveAttribute('data-direction', 'down');
  await expect(panel).toBeVisible();
  const openGeometry = await arrowGeometry();
  expect(openGeometry).toMatchObject({
    height: 18,
    insideOwner: true,
    transform: [0, 1, -1, 0],
    width: 18,
  });
  expect(openGeometry.transitionDuration).not.toBe('0s');
  const originalArrow = await arrow.elementHandle();
  if (!originalArrow)
    throw new Error('Expected the menu disclosure arrow to be attached');
  if (browserName === 'chromium')
    await menu.screenshot({
      path: 'test-results/menu-disclosure-wide-open.png',
    });

  await toggle.press('Enter');
  await expect(menu.getByRole('button', { name: 'Tools' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(arrow).toHaveAttribute('data-open', 'false');
  await expect(arrow).toHaveAttribute('data-direction', 'right');
  await expect(panel).toBeHidden();
  await expect(page.locator('.catalog-log')).toHaveText('Tools closed');
  expect(
    await arrow.evaluate((node, original) => node === original, originalArrow),
  ).toBe(true);
  await expect
    .poll(async () => (await arrowGeometry()).transform)
    .toEqual([1, 0, 0, 1]);
  expect(await arrowGeometry()).toMatchObject({
    height: 18,
    insideOwner: true,
    width: 18,
  });
  if (browserName === 'chromium')
    await menu.screenshot({
      path: 'test-results/menu-disclosure-wide-closed.png',
    });

  await toggle.press('Space');
  await expect(menu.getByRole('button', { name: 'Tools' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(arrow).toHaveAttribute('data-open', 'true');
  await expect(panel).toBeVisible();
  await expect(page.locator('.catalog-log')).toHaveText('Tools opened');
  await expect
    .poll(async () => (await arrowGeometry()).transform)
    .toEqual([0, 1, -1, 0]);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    parseFloat((await arrowGeometry()).transitionDuration),
  ).toBeLessThanOrEqual(0.001);
  await menu.evaluate((element) => element.setAttribute('dir', 'rtl'));
  expect((await arrowGeometry()).insideOwner).toBe(true);
  await menu.evaluate((element) => element.removeAttribute('dir'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toBeVisible();
  expect((await arrowGeometry()).insideOwner).toBe(true);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  if (browserName === 'chromium')
    await menu.screenshot({
      path: 'test-results/menu-disclosure-narrow-open.png',
    });

  await page.setViewportSize({ width: 720, height: 960 });
  await page.locator('html').evaluate((element) => {
    element.style.fontSize = '200%';
  });
  expect(await arrowGeometry()).toMatchObject({
    height: 36,
    insideOwner: true,
    transform: [0, 1, -1, 0],
    width: 36,
  });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  if (browserName === 'chromium')
    await menu.screenshot({
      path: 'test-results/menu-disclosure-zoom-200.png',
    });
});

test('matches shared menu, content-item, and toolbar geometry', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=list');
  const menu = page.locator('[data-demo="list"]');
  const paneGeometry = () =>
    menu.evaluate((node) => {
      const content = node
        .querySelector<HTMLElement>(
          '.demo-list__content-frame > [data-component="list"]',
        )!
        .getBoundingClientRect();
      const toolbar = node
        .querySelector<HTMLElement>('.kui-pane__footer .kui-toolbar')!
        .getBoundingClientRect();
      const direction = window.getComputedStyle(node).direction;
      const start = (container: DOMRect, item: DOMRect) =>
        direction === 'rtl'
          ? container.right - item.right
          : item.left - container.left;
      const end = (container: DOMRect, item: DOMRect) =>
        direction === 'rtl'
          ? item.left - container.left
          : container.right - item.right;
      const action = node
        .querySelector<HTMLElement>('.kui-list-header button')!
        .getBoundingClientRect();
      const row = node
        .querySelector<HTMLElement>('[data-item-id="projects"]')!
        .getBoundingClientRect();
      const rowLabel = node
        .querySelector<HTMLElement>(
          '[data-item-id="projects"] .kui-list-item__label',
        )!
        .getBoundingClientRect();
      const rowIcon = node
        .querySelector<HTMLElement>(
          '[data-item-id="projects"] .kui-list-item__icon',
        )!
        .getBoundingClientRect();
      const trailing = node
        .querySelector<HTMLElement>(
          '[data-item-id="inbox"] .kui-list-item__trailing',
        )!
        .getBoundingClientRect();
      const iconlessLabel = node
        .querySelector<HTMLElement>(
          '[data-item-id="drafts"] .kui-list-item__label',
        )!
        .getBoundingClientRect();
      const sectionLabelElement = node.querySelector<HTMLElement>(
        '.kui-list-header h2',
      )!;
      const sectionLabel = sectionLabelElement.getBoundingClientRect();
      const sectionLabelStyle = window.getComputedStyle(sectionLabelElement);
      const surfaceElement = node.querySelector<HTMLElement>(
        '[data-content-item]',
      )!;
      const surface = surfaceElement.getBoundingClientRect();
      const surfaceLabel = node
        .querySelector<HTMLElement>('[data-content-item] strong')!
        .getBoundingClientRect();
      const toggleLayer = node
        .querySelector<HTMLElement>('.kui-list-header__action-layer')!
        .getBoundingClientRect();
      const toolbarText = node
        .querySelector<HTMLElement>('.kui-pane__footer .kui-toolbar-text')!
        .getBoundingClientRect();
      const toolbarAction = node
        .querySelector<HTMLElement>(
          '.kui-pane__footer .kui-toolbar__trailing .kui-toolbar-control-group',
        )!
        .getBoundingClientRect();
      return {
        contentGap: parseFloat(
          window.getComputedStyle(
            node.querySelector(
              '.demo-list__content-frame > [data-component="list"]',
            )!,
          ).rowGap,
        ),
        list: (() => {
          const list = node.querySelector<HTMLElement>(
            '.demo-list__content-frame > [data-component="list"]',
          )!;
          const style = window.getComputedStyle(list);
          return {
            alignItems: style.alignItems,
            display: style.display,
            dividerSides: list.getAttribute('divider-sides'),
            flex: style.flex,
            overflowY: style.overflowY,
          };
        })(),
        rowStart: start(content, row),
        rowEnd: end(content, row),
        rowHeight: row.height,
        plainStart: start(content, iconlessLabel),
        sectionStart:
          start(content, sectionLabel) +
          parseFloat(sectionLabelStyle.borderInlineStartWidth) +
          parseFloat(sectionLabelStyle.paddingInlineStart),
        surfaceStart: start(content, surface),
        surfaceContentStart: start(content, surfaceLabel),
        surfacePadding: parseFloat(
          window.getComputedStyle(surfaceElement).paddingLeft,
        ),
        surfaceBorder: parseFloat(
          window.getComputedStyle(surfaceElement).borderLeftWidth,
        ),
        iconStart: start(content, rowIcon),
        iconWidth: rowIcon.width,
        iconLabelStart: start(content, rowLabel),
        trailingEnd: end(content, trailing),
        headerActionEnd: end(content, action),
        headerActionWidth: action.width,
        headerActionHeight: action.height,
        toggleLayerWidth: toggleLayer.width,
        toggleLayerHeight: toggleLayer.height,
        toolbarTextStart: start(toolbar, toolbarText),
        toolbarActionEnd: end(toolbar, toolbarAction),
        toolbarActionWidth: toolbarAction.width,
        toolbarActionHeight: toolbarAction.height,
      };
    });
  const near = (name: string, actual: number, expected: number) =>
    expect(
      Math.abs(actual - expected),
      `${name}: ${actual}`,
    ).toBeLessThanOrEqual(1);
  const expectPaneGeometry = (
    geometry: Awaited<ReturnType<typeof paneGeometry>>,
  ) => {
    expect(geometry.list).toEqual({
      alignItems: 'stretch',
      display: 'flex',
      dividerSides: 'r',
      flex: '1 1 auto',
      overflowY: 'auto',
    });
    near('contentGap', geometry.contentGap, 24);
    for (const name of [
      'rowStart',
      'rowEnd',
      'surfaceStart',
      'headerActionEnd',
      'toolbarActionEnd',
    ] as const)
      near(name, geometry[name], 8);
    for (const name of [
      'plainStart',
      'sectionStart',
      'surfaceContentStart',
      'iconStart',
      'trailingEnd',
    ] as const)
      near(name, geometry[name], 17);
    near('toolbarTextStart', geometry.toolbarTextStart, 8);
    near('iconLabelStart', geometry.iconLabelStart, 43);
    near('iconWidth', geometry.iconWidth, 18);
    near('surfacePadding', geometry.surfacePadding, 8);
    near('surfaceBorder', geometry.surfaceBorder, 1);
    for (const name of ['toolbarActionWidth', 'toolbarActionHeight'] as const)
      near(name, geometry[name], 44);
    // The ListHeader action is a fitted square (18px icon + 8px padding + 1px
    // border each side = 36px), not the toolbar control group's 44px.
    for (const name of ['headerActionWidth', 'headerActionHeight'] as const)
      near(name, geometry[name], 36);
    near('toggleLayerWidth', geometry.toggleLayerWidth, 24);
    near('toggleLayerHeight', geometry.toggleLayerHeight, 24);
    expect(geometry.rowHeight).toBeGreaterThanOrEqual(44);
  };
  const baseline = await paneGeometry();
  expectPaneGeometry(baseline);
  await menu.locator('[data-item-id="projects"]').hover();
  expect(await paneGeometry()).toEqual(baseline);
  await menu.locator('[data-item-id="drafts"]').focus();
  expect(await paneGeometry()).toEqual(baseline);
  if (browserName === 'chromium') {
    await menu.screenshot({
      path: 'test-results/pane-content-geometry-wide.png',
    });
    await page.locator('[data-catalog-related]').screenshot({
      path: 'test-results/related-components-selector-wide.png',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expectPaneGeometry(await paneGeometry());
    await menu.screenshot({
      path: 'test-results/pane-content-geometry-narrow.png',
    });
    await page.locator('[data-catalog-related]').screenshot({
      path: 'test-results/related-components-selector-narrow.png',
    });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await menu.evaluate((node) => node.setAttribute('dir', 'rtl'));
  expectPaneGeometry(await paneGeometry());
  await menu.evaluate((node) => node.removeAttribute('dir'));

  await page.goto('/?component=toolbar-control-group');
  const demo = page.getByRole('region', { name: 'ToolbarControlGroup demo' });
  await expect
    .poll(() =>
      page.evaluate(() => customElements.get('wa-dropdown') !== undefined),
    )
    .toBe(true);
  await expect(demo.locator('.kui-list-header__label')).toHaveText([
    'Shape',
    'Segmented choices',
    'Popup menu',
    'Action link',
    'Button group',
    'Single button',
    'Borderless group',
    'Push button, resting',
    'Push button, pressed',
    'Pop selected tone',
    'Dark group',
    'Compact mixed controls',
    'Avatar profile',
    'Avatar selection',
    'Collapsible search',
  ]);
  const groups = demo.locator('[data-component="toolbar-control-group"]');
  await expect(groups).toHaveCount(15);
  const standardGroups = demo.locator(
    '[data-component="toolbar-control-group"]:not([data-size="compact"])',
  );
  const heights = await standardGroups.evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().height),
  );
  expect(new Set(heights).size).toBe(1);
  const compact = demo.getByRole('group', { name: 'Compact formatting' });
  await expect(compact).toHaveAttribute('data-content', 'mixed');
  expect(
    Math.round(
      await compact.evaluate((node) => node.getBoundingClientRect().height),
    ),
  ).toBe(34);
  const compactSpacing = await compact.evaluate((node) => {
    const button = node
      .querySelector(':scope > button')!
      .getBoundingClientRect();
    const dropdown = node
      .querySelector(':scope > wa-dropdown')!
      .getBoundingClientRect();
    const group = node.getBoundingClientRect();
    const buttonStyle = window.getComputedStyle(
      node.querySelector(':scope > button')!,
    );
    const dropdownStyle = window.getComputedStyle(
      node.querySelector(':scope > wa-dropdown')!,
    );
    return {
      gap: dropdown.left - button.right,
      declaredGap: window.getComputedStyle(node).gap,
      paddingInline: buttonStyle.paddingInlineStart,
      separatorWidth: dropdownStyle.borderInlineStartWidth,
      selectedTop: button.top - group.top,
      selectedBottom: group.bottom - button.bottom,
      selectedBackground: buttonStyle.backgroundColor,
      selectedShadow: buttonStyle.boxShadow,
    };
  });
  expect(compactSpacing.declaredGap).toBe('0px');
  expect(compactSpacing.gap).toBeLessThanOrEqual(0);
  expect(compactSpacing.paddingInline).toBe('8px');
  expect(compactSpacing.separatorWidth).toBe('0px');
  expect(Math.abs(compactSpacing.selectedTop)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(compactSpacing.selectedBottom)).toBeLessThanOrEqual(0.5);
  expect(compactSpacing.selectedBackground).toBe('rgb(255, 255, 255)');
  expect(compactSpacing.selectedShadow).not.toBe('none');
  await expect(
    demo.getByRole('group', { name: 'Profile', exact: true }),
  ).toHaveAttribute('data-scrim', 'true');
  const singleAvatar = demo.getByRole('group', {
    name: 'Profile',
    exact: true,
  });
  await expect(singleAvatar.locator('img')).toHaveCount(0);
  await expect(singleAvatar).toHaveCSS('background-size', 'contain');
  expect(
    await singleAvatar.evaluate(
      (node) => window.getComputedStyle(node).backgroundImage,
    ),
  ).toContain('logo');
  await expect(singleAvatar.getByRole('button')).toHaveCSS(
    'background-image',
    'none',
  );
  const avatarChoices = demo.getByRole('group', { name: 'Profile view' });
  const primaryAvatar = avatarChoices.getByRole('button', {
    name: 'Primary profile',
  });
  const secondaryAvatar = avatarChoices.getByRole('button', {
    name: 'Secondary profile',
  });
  await expect(avatarChoices).toHaveCSS('background-image', 'none');
  expect(
    await primaryAvatar.evaluate(
      (node) => window.getComputedStyle(node).backgroundImage,
    ),
  ).toContain('logo');
  await expect(secondaryAvatar).toHaveCSS('background-image', 'none');
  await secondaryAvatar.click();
  await expect(secondaryAvatar).toHaveAttribute('aria-pressed', 'true');
  expect(
    await secondaryAvatar.evaluate(
      (node) => window.getComputedStyle(node).backgroundImage,
    ),
  ).toContain('logo');
  await expect(primaryAvatar).toHaveCSS('background-image', 'none');
  await demo.getByRole('button', { name: 'Columns view' }).click();
  await expect(
    demo.getByRole('button', { name: 'Columns view' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(demo.getByRole('button', { name: 'Columns view' })).toHaveCSS(
    'color',
    'rgb(30, 110, 244)',
  );
  const dropdown = demo.locator('wa-dropdown').first();
  const dropdownItems = dropdown.locator('wa-dropdown-item');
  await expect(dropdown).toHaveAttribute('data-morph-skip-children', '');
  await expect(dropdownItems).toHaveCount(2);
  const originalFirstItem = await dropdownItems.first().elementHandle();
  const originalLastItem = await dropdownItems.last().elementHandle();
  expect(originalFirstItem).not.toBeNull();
  expect(originalLastItem).not.toBeNull();
  await expect(dropdownItems.first()).toBeHidden();
  await demo.locator('wa-button[aria-label="Sort tickets"]').click();
  await expect(dropdownItems.first()).toBeVisible();
  await dropdownItems.filter({ hasText: 'Priority' }).click();
  await expect(page.locator('.catalog-log')).toHaveText('Sorted by priority');
  await expect(dropdownItems.first()).toBeHidden();
  expect(
    await dropdownItems
      .first()
      .evaluate((node, original) => node === original, originalFirstItem),
  ).toBe(true);
  expect(
    await dropdownItems
      .last()
      .evaluate((node, original) => node === original, originalLastItem),
  ).toBe(true);
  await expect
    .poll(() =>
      dropdownItems.evaluateAll((items) =>
        items.every((item) => item.shadowRoot !== null),
      ),
    )
    .toBe(true);
  await expect(
    demo.getByRole('button', { name: 'Pressed comparison' }).locator('..'),
  ).toHaveCSS('background-color', 'rgb(72, 72, 74)');
  await expect(demo.getByRole('group', { name: 'Dark navigation' })).toHaveCSS(
    'border-color',
    'rgb(53, 53, 54)',
  );
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/toolbar-control-groups-wide.png',
      fullPage: true,
    });
  if (browserName === 'chromium') {
    await compact.screenshot({
      path: 'test-results/toolbar-control-group-compact-mixed.png',
    });
    await demo
      .getByRole('group', { name: 'Profile', exact: true })
      .screenshot({ path: 'test-results/toolbar-control-group-avatar.png' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(groups).toHaveCount(15);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/toolbar-control-groups-narrow.png',
      fullPage: true,
    });
});

test('expands and collapses the ToolbarControlGroup collapsible search without stretching the group', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=toolbar-control-group');
  const group = page
    .locator('.demo-toolbar-group-search-wrap')
    .locator('[data-component="toolbar-control-group"]');
  const field = group.locator('.kui-token-search');
  const groupHeight = () =>
    group.evaluate((node) => Math.round(node.getBoundingClientRect().height));

  await page.getByRole('button', { name: 'Rounded' }).click();
  await expect(group).toHaveCSS('border-radius', '12px');
  await expect(field).toHaveCSS('border-radius', '10px');
  await expect(field.locator('.kui-token-search__expand')).toHaveCSS(
    'border-radius',
    '10px',
  );

  // Collapsed: one iconic control at the toolbar-control height (not a tall box).
  await expect(field).toHaveAttribute('data-expanded', 'false');
  await expect(group.locator('.kui-token-search__editor')).toBeHidden();
  expect(await groupHeight()).toBeLessThanOrEqual(48);

  // Activating the iconic control expands the editor in place; the group stays a
  // single toolbar row (the group's row-oriented flex-basis must not size its
  // height in the demo's column layout).
  await group.locator('.kui-token-search__expand').click();
  await expect(field).toHaveAttribute('data-expanded', 'true');
  await expect(group.locator('.kui-token-search__editor')).toBeVisible();
  expect(await groupHeight()).toBeLessThanOrEqual(48);
  await expect(field).toHaveCSS('border-radius', '10px');
  if (browserName === 'chromium')
    await group.screenshot({
      path: 'test-results/toolbar-control-group-rounded-search.png',
    });
});

test('intrinsically sizes popup, compact mixed, and catalog dropdown content across group shapes', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=toolbar-control-group');
  await expect
    .poll(() =>
      page.evaluate(() => customElements.get('wa-dropdown') !== undefined),
    )
    .toBe(true);
  const demo = page.getByRole('region', { name: 'ToolbarControlGroup demo' });
  const group = demo.getByRole('group', { name: 'Compact formatting' });

  const expectTriggerContentContained = async (
    trigger: Locator,
    contentSelector: string,
  ) => {
    const measured = await trigger.evaluate((node, selector) => {
      const group = node.closest('.kui-toolbar-control-group')!;
      const base = node.shadowRoot!.querySelector('[part~="base"]')!;
      const caret = node.shadowRoot!.querySelector('[part~="caret"]')!;
      const content = node.querySelector(selector)!;
      const bounds = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      };
      return {
        group: bounds(group),
        trigger: bounds(node),
        base: bounds(base),
        caret: bounds(caret),
        content: bounds(content),
      };
    }, contentSelector);
    expect(measured.content.width).toBeGreaterThan(0);
    expect(measured.caret.width).toBeGreaterThan(0);
    for (const part of ['trigger', 'base', 'content', 'caret'] as const) {
      expect(measured[part].left).toBeGreaterThanOrEqual(
        measured.group.left - 0.5,
      );
      expect(measured[part].right).toBeLessThanOrEqual(
        measured.group.right + 0.5,
      );
    }
  };

  const popupTrigger = demo.locator('wa-button[aria-label="Sort tickets"]');
  const relatedTrigger = page
    .locator('[data-catalog-related]')
    .locator('wa-button[slot="trigger"]');
  await expectTriggerContentContained(
    popupTrigger,
    '[data-lucide="arrow-down-a-z"]',
  );
  await expectTriggerContentContained(relatedTrigger, 'span');
  await popupTrigger
    .locator('xpath=ancestor::*[@data-catalog-example]')
    .screenshot({
      path: `test-results/toolbar-control-group-popup-${browserName}.png`,
    });
  await page
    .locator('[data-catalog-related]')
    .locator('xpath=ancestor::*[@data-component="toolbar-control-group"]')
    .screenshot({
      path: `test-results/related-components-selector-${browserName}.png`,
    });

  const geometry = () =>
    group.evaluate((node) => {
      const selected = node.querySelector(':scope > button')!;
      const dropdown = node.querySelector(':scope > wa-dropdown')!;
      const trigger = dropdown.querySelector('wa-button')!;
      const base = trigger.shadowRoot!.querySelector('[part~="base"]')!;
      const caret = trigger.shadowRoot!.querySelector('[part~="caret"]')!;
      const bounds = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      };
      return {
        group: bounds(node),
        selected: bounds(selected),
        dropdown: bounds(dropdown),
        trigger: bounds(trigger),
        base: {
          ...bounds(base),
          paddingInlineStart: window.getComputedStyle(base).paddingInlineStart,
          paddingInlineEnd: window.getComputedStyle(base).paddingInlineEnd,
        },
        caret: bounds(caret),
      };
    });

  for (const shape of ['Pill', 'Rounded']) {
    await demo.getByRole('button', { name: shape, exact: true }).click();
    const measured = await geometry();
    expect(measured.dropdown.left - measured.selected.right).toBeCloseTo(-2, 1);
    expect(measured.trigger.left).toBeCloseTo(measured.dropdown.left, 1);
    expect(measured.base.paddingInlineStart).toBe('8px');
    expect(measured.base.paddingInlineEnd).toBe('8px');
    expect(measured.caret.left).toBeGreaterThan(measured.trigger.left);
    expect(measured.caret.right).toBeLessThanOrEqual(measured.group.right - 1);
    expect(measured.trigger.right).toBeLessThanOrEqual(
      measured.group.right - 1,
    );
    await group.screenshot({
      path: `test-results/toolbar-control-group-compact-${browserName}-${shape.toLowerCase()}.png`,
    });
    if (browserName === 'chromium' && shape === 'Pill')
      await group
        .locator('xpath=ancestor::*[@data-catalog-example]')
        .screenshot({
          path: 'test-results/toolbar-control-group-compact-example.png',
        });
  }

  if (browserName === 'chromium') {
    await page.setViewportSize({ width: 390, height: 844 });
    await expectTriggerContentContained(
      popupTrigger,
      '[data-lucide="arrow-down-a-z"]',
    );
    await expectTriggerContentContained(relatedTrigger, 'span');
    await group.locator('xpath=ancestor::*[@data-catalog-example]').screenshot({
      path: 'test-results/toolbar-control-group-compact-narrow.png',
    });
    await popupTrigger
      .locator('xpath=ancestor::*[@data-catalog-example]')
      .screenshot({
        path: 'test-results/toolbar-control-group-popup-narrow.png',
      });
    await page
      .locator('[data-catalog-related]')
      .locator('xpath=ancestor::*[@data-component="toolbar-control-group"]')
      .screenshot({
        path: 'test-results/related-components-selector-narrow.png',
      });
  }
});

test('renders the Hot Sheet split treatment on ResizableRegion', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=resize');
  const shell = page.locator('[data-demo="resize"]');
  const region = page.locator('[data-component="resizable-region"]');
  const handle = region.locator('[data-kui-resize-handle]');
  const iconLayer = handle.locator('.kui-resizable-region__handle-icon');
  const grip = iconLayer.locator('svg');
  const size = page.locator('[data-region-size]');
  const responsiveGeometry = () =>
    shell.evaluate((element) => {
      const regionElement = element.querySelector<HTMLElement>(
        '[data-component="resizable-region"]',
      )!;
      const panelElement = element.querySelector<HTMLElement>(
        '.demo-resize-panel-frame',
      )!;
      const committedElement =
        document.querySelector<HTMLElement>('[data-region-size]')!;
      const statusElement = committedElement.closest<HTMLElement>(
        '.kui-catalog__status',
      )!;
      const handleElement = element.querySelector<HTMLElement>(
        '[data-kui-resize-handle]',
      )!;
      const shellRect = element.getBoundingClientRect();
      const regionRect = regionElement.getBoundingClientRect();
      const panelRect = panelElement.getBoundingClientRect();
      const committedRect = committedElement.getBoundingClientRect();
      const statusRect = statusElement.getBoundingClientRect();
      const handleRect = handleElement.getBoundingClientRect();
      const contains = (outer: DOMRect, inner: DOMRect) =>
        inner.left >= outer.left - 1 &&
        inner.right <= outer.right + 1 &&
        inner.top >= outer.top - 1 &&
        inner.bottom <= outer.bottom + 1;
      const textFits = (container: HTMLElement) => {
        const containerRect = container.getBoundingClientRect();
        return [
          ...container.querySelectorAll<HTMLElement>('strong, span'),
        ].every((child) =>
          contains(containerRect, child.getBoundingClientRect()),
        );
      };
      return {
        committedFitsFooter: contains(statusRect, committedRect),
        committedInFooter:
          committedElement.closest('.kui-catalog__status') === statusElement,
        documentOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        handleInsideShell: contains(shellRect, handleRect),
        panelFillsRegion:
          Math.abs(panelRect.top - regionRect.top) <= 1 &&
          Math.abs(panelRect.bottom - regionRect.bottom) <= 1,
        panelTextFits: textFits(panelElement),
        shellClientWidth: element.clientWidth,
        shellScrollWidth: element.scrollWidth,
      };
    });
  await expect(iconLayer).toHaveAttribute('aria-hidden', 'true');
  await expect(grip).toHaveAttribute('data-lucide', 'custom-resize-handle');
  await expect(grip).toHaveAttribute('aria-hidden', 'true');
  await expect(handle).toHaveAttribute('role', 'separator');
  await expect(handle).toHaveAttribute('aria-label', 'Resize Catalog panel');
  const separator = await handle.evaluate((element) => {
    const style = window.getComputedStyle(element, '::before');
    return { width: style.width, background: style.backgroundColor };
  });
  expect(separator).toEqual({ width: '1px', background: 'rgb(209, 209, 214)' });
  expect(await responsiveGeometry()).toMatchObject({
    committedFitsFooter: true,
    committedInFooter: true,
    documentOverflow: 0,
    handleInsideShell: true,
    panelFillsRegion: true,
    panelTextFits: true,
  });
  await expect(iconLayer).toHaveCSS('opacity', '0');
  await handle.hover();
  await expect(iconLayer).toHaveCSS('opacity', '1');
  await handle.focus();
  await handle.press('End');
  await expect(size).toHaveText('420px');
  await handle.press('Home');
  await expect(size).toHaveText('180px');
  await handle.press('ArrowRight');
  await expect(size).toHaveText('196px');
  const handleBounds = await handle.boundingBox();
  expect(handleBounds).not.toBeNull();
  await page.mouse.move(
    handleBounds!.x + handleBounds!.width / 2,
    handleBounds!.y + handleBounds!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handleBounds!.x + handleBounds!.width / 2 + 40,
    handleBounds!.y + handleBounds!.height / 2,
  );
  await page.mouse.up();
  await expect(size).toHaveText('236px');

  await region.evaluate((element) =>
    element.style.setProperty(
      '--kui-resizable-region-separator-color',
      '#7540a8',
    ),
  );
  await expect
    .poll(() =>
      handle.evaluate(
        (element) =>
          window.getComputedStyle(element, '::before').backgroundColor,
      ),
    )
    .toBe('rgb(117, 64, 168)');
  await region.evaluate((element) =>
    element.style.removeProperty('--kui-resizable-region-separator-color'),
  );
  if (browserName === 'chromium') {
    await handle.hover();
    await page.screenshot({
      path: 'test-results/resizable-region-layout-after-wide.png',
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await handle.hover();
  const lightNarrow = await responsiveGeometry();
  expect(lightNarrow).toMatchObject({
    committedFitsFooter: true,
    committedInFooter: true,
    documentOverflow: 0,
    handleInsideShell: true,
    panelFillsRegion: true,
    panelTextFits: true,
  });
  expect(lightNarrow.shellScrollWidth).toBeLessThanOrEqual(
    lightNarrow.shellClientWidth + 1,
  );
  const overlayGeometry = await shell.evaluate((element) => {
    element.style.position = 'relative';
    const region = element.querySelector<HTMLElement>(
        '[data-component="resizable-region"]',
      )!,
      content = region.querySelector<HTMLElement>(
        '.kui-resizable-region__content',
      )!;
    region.dataset.presentation = 'overlay';
    region.style.setProperty('--kui-resizable-region-size', '352px');
    region.style.setProperty('--kui-resizable-region-expanded-size', '352px');
    const regionRect = region.getBoundingClientRect(),
      contentRect = content.getBoundingClientRect();
    return {
      contentInsideRegion:
        contentRect.left >= regionRect.left - 1 &&
        contentRect.right <= regionRect.right + 1,
      contentWidth: contentRect.width,
      regionWidth: regionRect.width,
      viewportWidth: window.innerWidth,
    };
  });
  expect(overlayGeometry).toMatchObject({
    contentInsideRegion: true,
    contentWidth: overlayGeometry.regionWidth,
    viewportWidth: 390,
  });
  expect(overlayGeometry.regionWidth).toBeLessThanOrEqual(390 * 0.85 + 1);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/resizable-region-overlay-narrow.png',
      fullPage: true,
    });
  await region.evaluate((element) => {
    element.dataset.presentation = 'inline';
    element.style.removeProperty('--kui-resizable-region-size');
    element.style.removeProperty('--kui-resizable-region-expanded-size');
  });
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/resizable-region-layout-light-narrow.png',
      fullPage: true,
    });

  await page.locator('[data-action="toggle-theme"]').click();
  await handle.hover();
  expect(await responsiveGeometry()).toMatchObject({
    committedFitsFooter: true,
    committedInFooter: true,
    documentOverflow: 0,
    handleInsideShell: true,
    panelFillsRegion: true,
    panelTextFits: true,
  });
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/resizable-region-layout-dark-narrow.png',
      fullPage: true,
    });

  await handle.focus();
  await handle.press('End');
  await expect(size).toHaveText('420px');
  const maxScroll = await shell.evaluate((element) => {
    element.scrollLeft = element.scrollWidth - element.clientWidth;
    const shellRect = element.getBoundingClientRect();
    const handleRect = element
      .querySelector<HTMLElement>('[data-kui-resize-handle]')!
      .getBoundingClientRect();
    return {
      handleInsideShell:
        handleRect.left >= shellRect.left - 1 &&
        handleRect.right <= shellRect.right + 1,
      scrollLeft: element.scrollLeft,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    };
  });
  expect(maxScroll.scrollWidth).toBeGreaterThan(maxScroll.clientWidth);
  expect(maxScroll.scrollLeft).toBeGreaterThan(0);
  expect(maxScroll.handleInsideShell).toBe(true);
  await expect(handle).toBeFocused();
  if (browserName === 'chromium') {
    await expect(iconLayer).toHaveCSS('opacity', '1');
    await page.screenshot({
      path: 'test-results/resizable-region-layout-max-scroll-narrow.png',
      fullPage: true,
    });
  }

  await handle.press('Home');
  for (let index = 0; index < 6; index += 1) await handle.press('ArrowRight');
  await expect(size).toHaveText('276px');
  await shell.evaluate((element) => {
    element.scrollLeft = 0;
  });
  await page.locator('[data-action="toggle-theme"]').click();
  await page.setViewportSize({ width: 640, height: 720 });
  await page.locator('html').evaluate((element) => {
    element.style.fontSize = '200%';
  });
  await handle.hover();
  const zoomed = await responsiveGeometry();
  expect(zoomed).toMatchObject({
    committedFitsFooter: true,
    committedInFooter: true,
    documentOverflow: 0,
    handleInsideShell: true,
    panelFillsRegion: true,
    panelTextFits: true,
  });
  expect(zoomed.shellScrollWidth).toBeLessThanOrEqual(
    zoomed.shellClientWidth + 1,
  );
  await expect(iconLayer).toHaveCSS('opacity', '1');
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/resizable-region-layout-zoom-200.png',
      fullPage: true,
    });
});

test('keeps AppTab extension metadata and replacement close icons inside the shared tab lifecycle', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=tabs');
  const demo = page.locator('[data-demo="tabs"]');
  const root = demo.locator('.kui-app-tab[data-tab-id="guidelines"]');
  const tab = root.getByRole('tab', { name: 'Guidelines' });
  const close = root.getByRole('button', { name: 'Close Guidelines' });

  await expect(root).toHaveAttribute('data-demo-tab-source', 'workspace');
  await expect(root).toHaveAttribute('data-tab-id', 'guidelines');
  await expect(root).not.toHaveAttribute('data-action');
  await expect(root).not.toHaveAttribute('role');
  await expect(root).not.toHaveAttribute('data-tab-dragging');
  await expect(root).not.toHaveAttribute('data-tab-drop-position');
  await expect(
    close.locator('[data-lucide="custom-tab-close"]'),
  ).toHaveAttribute('aria-hidden', 'true');
  await expect(close.locator('.kui-app-tab__close-icon')).toHaveAttribute(
    'aria-hidden',
    'true',
  );

  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await close.click();
  await expect(page.locator('.catalog-log')).toHaveText(
    'Close requested for guidelines',
  );

  if (browserName === 'chromium') {
    await tab.focus();
    await page.screenshot({
      path: 'test-results/app-tab-extension-light-wide.png',
      fullPage: true,
    });
    await page.locator('[data-action="toggle-theme"]').click();
    await root.hover();
    await page.screenshot({
      path: 'test-results/app-tab-extension-dark-wide.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await root.hover();
    await page.screenshot({
      path: 'test-results/app-tab-extension-dark-narrow.png',
      fullPage: true,
    });
  }
});

test('separates focused AppTab and TabBar specimens from the application-tabs composition', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=tabs');
  const appTabs = page.locator('[data-demo="tabs"]');
  await expect(appTabs.locator('[data-catalog-example]')).toHaveCount(4);
  await expect(appTabs.locator('[data-component="app-tab"]')).toHaveCount(5);
  if (browserName === 'chromium')
    await appTabs.screenshot({ path: 'test-results/app-tab-focused-wide.png' });

  await page.goto('/?component=tab-bar');
  const tabBars = page.locator('[data-demo="tab-bar"]');
  await expect(tabBars.locator('[data-catalog-example]')).toHaveCount(3);
  await expect(tabBars.locator('[data-component="tab-bar"]')).toHaveCount(3);
  const splitBar = tabBars.locator('[data-tab-bar-id="inspector-tab-bar"]');
  const splitTabs = splitBar.locator('[data-kui-tab-list]');
  const adjacentAction = splitBar.getByRole('button', {
    name: 'Add inspector section',
  });
  const endAction = splitBar.getByRole('button', {
    name: 'Create workspace item',
  });
  await expect(adjacentAction).toBeVisible();
  await expect(endAction).toBeVisible();
  await expect(splitBar.locator(':scope > .kui-tab-bar__trailing')).toHaveCount(
    1,
  );
  await expect(splitBar.locator(':scope > .kui-tab-bar__end')).toHaveCount(1);
  if (browserName === 'chromium')
    await tabBars.screenshot({ path: 'test-results/tab-bar-focused-wide.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await expect(splitBar).toBeVisible();
  await splitBar.evaluate((bar) => {
    bar.style.width = '320px';
  });
  await expect(adjacentAction).toBeVisible();
  await expect(endAction).toBeVisible();
  const splitDimensions = await splitTabs.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    tabWidths: Array.from(node.children).map(
      (child) => child.getBoundingClientRect().width,
    ),
  }));
  expect(
    splitDimensions.scrollWidth,
    JSON.stringify(splitDimensions),
  ).toBeGreaterThan(splitDimensions.clientWidth);
  const splitGeometry = await splitBar.evaluate((bar) => {
    const tabs = bar.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
    const trailing = bar.querySelector<HTMLElement>('.kui-tab-bar__trailing')!;
    const end = bar.querySelector<HTMLElement>('.kui-tab-bar__end')!;
    const barRect = bar.getBoundingClientRect();
    const tabsRect = tabs.getBoundingClientRect();
    const trailingRect = trailing.getBoundingClientRect();
    const endRect = end.getBoundingClientRect();
    return {
      order: Array.from(bar.children).map((child) => child.className),
      tabsRight: tabsRect.right,
      trailingLeft: trailingRect.left,
      trailingRight: trailingRect.right,
      endLeft: endRect.left,
      endRight: endRect.right,
      barRight: barRect.right,
      trailingFlexShrink:
        bar.ownerDocument.defaultView!.getComputedStyle(trailing).flexShrink,
      endFlexShrink:
        bar.ownerDocument.defaultView!.getComputedStyle(end).flexShrink,
    };
  });
  expect(splitGeometry.order).toEqual([
    'kui-tab-bar__tabs',
    'kui-tab-bar__trailing',
    'kui-tab-bar__end',
  ]);
  expect(splitGeometry.tabsRight).toBeLessThan(splitGeometry.trailingLeft);
  expect(splitGeometry.trailingRight).toBeLessThan(splitGeometry.endLeft);
  expect(splitGeometry.endRight).toBeLessThanOrEqual(splitGeometry.barRight);
  expect(splitGeometry.trailingFlexShrink).toBe('0');
  expect(splitGeometry.endFlexShrink).toBe('0');
  if (browserName === 'chromium')
    await tabBars.screenshot({
      path: 'test-results/tab-bar-focused-narrow.png',
    });

  await page.goto('/?component=application-tabs');
  await expect(page.locator('.demo-stage-inner')).toHaveAttribute(
    'data-demo-mode',
    'composition',
  );
  await expect(
    page.locator('[data-demo="application-tabs"] [role="tabpanel"]'),
  ).toContainText('components');
});

test('communicates preferred Kerf patterns on ecosystem alternatives', async ({
  page,
  browserName,
}) => {
  for (const [route, description] of [
    [
      'wa-popup',
      'Preferred low-level anchored positioning when Tooltip or Popover do not fit.',
    ],
    [
      'wa-split-panel',
      'Alternative split API; prefer Kerf ResizableRegion for application panes.',
    ],
    [
      'wa-icon',
      'Ecosystem icon renderer; use Kerf LucideIcon in application UI.',
    ],
    [
      'wa-zoomable-frame',
      'Avoid for application UI; keep embedded-media behavior application-owned.',
    ],
  ] as const) {
    await page.goto(`/?component=${route}`);
    await expect(
      page
        .locator('.kui-catalog__header')
        .getByText(description, { exact: true }),
    ).toBeVisible();
  }

  if (browserName === 'chromium') {
    await page.goto('/?component=wa-split-panel');
    await page.screenshot({
      path: 'test-results/webawesome-selection-guidance-wide.png',
      fullPage: true,
    });
  }
});

test('renders controlled toolbar, rounded, and pill SegmentedControl variants', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=segmented-control');
  const demo = page.locator('[data-demo="segmented-control"]');
  const controls = demo.locator(
    '[data-component="segmented-control"]:not([data-placeholder="true"])',
  );
  await expect(controls).toHaveCount(3);
  await expect(demo.locator('.kui-list-header__label')).toHaveText([
    'Toolbar',
    'Rounded rectangle',
    'Pill',
    'Placeholder',
  ]);

  const toolbar = demo.locator(
    '[data-segmented-control-id="standalone-toolbar-view"]',
  );
  const rounded = demo.locator(
    '[data-segmented-control-id="inspector-section"]',
  );
  const pill = demo.locator('[data-segmented-control-id="display-density"]');
  await expect(toolbar).toHaveAttribute('data-appearance', 'toolbar');
  await expect(toolbar).toHaveAttribute('data-shape', 'pill');
  await expect(rounded).toHaveAttribute('data-layout', 'equal');
  await expect(pill).toHaveAttribute('data-appearance', 'outlined');
  await expect(pill).toHaveAttribute('data-shape', 'pill');
  await expect(demo.getByRole('button', { name: 'Roomy' })).toBeDisabled();

  const radii = await Promise.all(
    [rounded, pill].map((control) =>
      control.evaluate((node) =>
        parseFloat(window.getComputedStyle(node).borderRadius),
      ),
    ),
  );
  expect(radii[0]).toBeLessThan(20);
  expect(radii[1]).toBeGreaterThanOrEqual(21);
  expect(radii[1]).toBeLessThanOrEqual(23);
  const roundedCornerGeometry = await rounded.evaluate((control) => {
    const item = control.querySelector<HTMLElement>(
      '.kui-segmented-control__item',
    );
    if (!item) throw new Error('Missing rounded SegmentedControl item');
    const controlStyle = window.getComputedStyle(control);
    const itemStyle = window.getComputedStyle(item);
    return {
      controlRadius: parseFloat(controlStyle.borderTopLeftRadius),
      itemRadius: parseFloat(itemStyle.borderTopLeftRadius),
      itemInset:
        parseFloat(controlStyle.borderLeftWidth) +
        parseFloat(controlStyle.paddingLeft),
    };
  });
  expect(
    roundedCornerGeometry.controlRadius - roundedCornerGeometry.itemRadius,
  ).toBeCloseTo(roundedCornerGeometry.itemInset, 5);
  const widths = await rounded
    .getByRole('button')
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getBoundingClientRect().width),
    );
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);

  const summary = rounded.getByRole('button', { name: 'Summary' });
  const activity = rounded.getByRole('button', { name: 'Activity' });
  await rounded.evaluate((node) => {
    node.style.setProperty('--kui-segmented-selected-background', '#7540a8');
    node.style.setProperty('--kui-segmented-selected-foreground', '#ffffff');
  });
  await expect(summary).toHaveCSS('background-color', 'rgb(117, 64, 168)');
  await expect(summary).toHaveCSS('color', 'rgb(255, 255, 255)');
  await rounded.evaluate((node) => {
    node.style.removeProperty('--kui-segmented-selected-background');
    node.style.removeProperty('--kui-segmented-selected-foreground');
  });

  await activity.click();
  await expect(activity).toHaveAttribute('aria-pressed', 'true');
  await expect(summary).toHaveAttribute('aria-pressed', 'false');
  await expect(rounded).toHaveAttribute('data-value', 'activity');
  await expect(page.locator('.catalog-log')).toHaveText('Selected activity');
  await summary.focus();
  await page.keyboard.press('Tab');
  await expect(activity).toBeFocused();
  await summary.focus();
  await page.keyboard.press('Space');
  await expect(summary).toHaveAttribute('aria-pressed', 'true');
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/segmented-control-wide.png',
      fullPage: true,
    });

  await page.locator('[data-action="toggle-theme"]').click();
  await expect(summary).toHaveCSS('background-color', 'rgb(28, 28, 30)');
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/segmented-control-dark-wide.png',
      fullPage: true,
    });
  await page.locator('[data-action="toggle-theme"]').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await expect(controls.last()).toBeVisible();
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/segmented-control-narrow.png',
      fullPage: true,
    });
});

test('ships semantic banner palettes with scoped overrides', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=state-banner');
  const banners = page.locator(
    '[data-demo="state-banner"] [data-component="state-banner"]:not([data-placeholder="true"])',
  );
  const articles = page.locator(
    '[data-demo="state-banner"] .kui-catalog-example:not(:has([data-placeholder="true"]))',
  );
  const badges = banners.locator('[data-component="badge"]');
  await expect(banners).toHaveCount(7);
  await expect(articles).toHaveCount(7);
  await expect(badges).toHaveCount(6);
  await expect(badges).toHaveText(['1', '2', '3', '4', '5', '6']);
  const labelIconOffsets = () =>
    articles.evaluateAll((nodes) =>
      nodes.map((node) => {
        const label = node.querySelector<HTMLElement>(
          '.kui-list-header__label',
        )!;
        const icon = node.querySelector<HTMLElement>(
          '.kui-state-banner__icon',
        )!;
        const labelBounds = label.getBoundingClientRect();
        const labelStyle = window.getComputedStyle(label);
        return Math.abs(
          labelBounds.left +
            Number.parseFloat(labelStyle.borderLeftWidth) +
            Number.parseFloat(labelStyle.paddingLeft) -
            icon.getBoundingClientRect().left,
        );
      }),
    );
  const styles = await banners.evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = window.getComputedStyle(node);
      return {
        tone: node.getAttribute('data-tone'),
        color: style.color,
        background: style.backgroundColor,
        border: style.borderColor,
      };
    }),
  );
  expect(styles.slice(0, 6).map(({ color }) => color)).toEqual([
    'rgb(29, 29, 31)',
    'rgb(26, 93, 207)',
    'rgb(121, 36, 152)',
    'rgb(0, 121, 44)',
    'rgb(143, 94, 0)',
    'rgb(194, 11, 32)',
  ]);
  expect(
    new Set(styles.slice(0, 6).map(({ background }) => background)).size,
  ).toBe(6);
  expect(new Set(styles.slice(0, 6).map(({ border }) => border)).size).toBe(6);
  expect(styles[6]!.color).toBe('rgb(109, 63, 156)');
  const badgeStyles = await badges.evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = window.getComputedStyle(node);
      const bounds = node.getBoundingClientRect();
      return {
        width: bounds.width,
        height: bounds.height,
        radius: Number.parseFloat(style.borderRadius),
        color: style.color,
        background: style.backgroundColor,
      };
    }),
  );
  expect(
    badgeStyles.every(({ width, height }) => width >= 20 && height >= 20),
  ).toBe(true);
  expect(
    badgeStyles.every(
      ({ width, height, radius }) => radius >= Math.min(width, height) / 2,
    ),
  ).toBe(true);
  expect(new Set(badgeStyles.map(({ background }) => background)).size).toBe(6);
  // The info/success/warning tones use darker on-fill accents so their text clears
  // WCAG AA over the tinted banner fills (brand/success/warning-on-quiet resolved
  // to 4.15/4.05/4.39:1 there). Assert every tone's text clears 4.5:1 in both themes.
  expect(styles[1]!.color).toBe('rgb(26, 93, 207)');
  const minToneContrast = () =>
    banners.evaluateAll((nodes) => {
      const context = document.createElement('canvas').getContext('2d');
      const luminance = (color: string): number => {
        if (!context) return 0;
        context.canvas.width = 1;
        context.canvas.height = 1;
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const channels = [
          ...context.getImageData(0, 0, 1, 1).data.slice(0, 3),
        ].map((channel) => {
          const value = channel / 255;
          return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
        });
        return (
          0.2126 * (channels[0] ?? 0) +
          0.7152 * (channels[1] ?? 0) +
          0.0722 * (channels[2] ?? 0)
        );
      };
      return Math.min(
        ...nodes.map((node) => {
          const styleMap = window.getComputedStyle(node);
          const foreground = luminance(styleMap.color);
          const background = luminance(styleMap.backgroundColor);
          return (
            (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05)
          );
        }),
      );
    });
  const minBadgeContrast = () =>
    badges.evaluateAll((nodes) => {
      const context = document.createElement('canvas').getContext('2d');
      const luminance = (color: string): number => {
        if (!context) return 0;
        context.canvas.width = 1;
        context.canvas.height = 1;
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const channels = [
          ...context.getImageData(0, 0, 1, 1).data.slice(0, 3),
        ].map((channel) => {
          const value = channel / 255;
          return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
        });
        return (
          0.2126 * (channels[0] ?? 0) +
          0.7152 * (channels[1] ?? 0) +
          0.0722 * (channels[2] ?? 0)
        );
      };
      return Math.min(
        ...nodes.map((node) => {
          const styleMap = window.getComputedStyle(node);
          const foreground = luminance(styleMap.color);
          const background = luminance(styleMap.backgroundColor);
          return (
            (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05)
          );
        }),
      );
    });
  await expect
    .poll(minToneContrast, 'light StateBanner tone contrast (min across tones)')
    .toBeGreaterThanOrEqual(4.5);
  await expect
    .poll(
      minBadgeContrast,
      'light StateBanner badge contrast (min across tones)',
    )
    .toBeGreaterThanOrEqual(4.5);
  await page.locator('[data-action="toggle-theme"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-dark/);
  await expect
    .poll(minToneContrast, 'dark StateBanner tone contrast (min across tones)')
    .toBeGreaterThanOrEqual(4.5);
  await expect
    .poll(
      minBadgeContrast,
      'dark StateBanner badge contrast (min across tones)',
    )
    .toBeGreaterThanOrEqual(4.5);
  if (browserName === 'chromium')
    await banners.nth(1).screenshot({
      path: 'test-results/state-banner-badge-dark.png',
    });
  await page.locator('[data-action="toggle-theme"]').click();
  await expect(page.locator('html')).not.toHaveClass(/demo-dark/);
  expect(await labelIconOffsets()).toEqual(Array(7).fill(0));
  if (browserName === 'chromium')
    await banners.nth(1).screenshot({
      path: 'test-results/state-banner-badge-wide.png',
    });
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/state-banner-type-label-alignment-after.png',
      fullPage: true,
    });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(banners.last()).toBeVisible();
  expect(await labelIconOffsets()).toEqual(Array(7).fill(0));
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  if (browserName === 'chromium')
    await banners.nth(1).screenshot({
      path: 'test-results/state-banner-badge-narrow.png',
    });
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/state-banner-type-label-alignment-after-narrow.png',
      fullPage: true,
    });
});

test('reorders and horizontally scrolls controlled TabBars', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto('/?component=application-tabs');
  const bar = page.locator(
    '[data-demo="application-tabs"] [data-tab-bar-id="catalog-tabs"]',
  );
  const strip = bar.locator('[data-kui-tab-list]');
  await expect(bar.getByRole('tab')).toHaveCount(7);
  expect(
    await strip.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  const integration = bar.getByRole('tab', { name: 'Integration patterns' });
  await integration.click();
  await expect(integration).toHaveAttribute('aria-selected', 'true');
  await integration.press('Alt+Shift+ArrowRight');
  await expect(page.locator('[data-tab-order]')).toContainText(
    'Release notes · Integration patterns',
  );
  await expect(
    bar.getByRole('tab', { name: 'Integration patterns' }),
  ).toBeFocused();
  await bar.getByRole('button', { name: 'Add tab' }).click();
  await expect(bar.getByRole('tab')).toHaveCount(8);
  const added = bar.getByRole('tab', { name: 'New tab 8' });
  await expect(added).toHaveAttribute('aria-selected', 'true');
  await expect
    .poll(() => strip.evaluate((node) => node.scrollLeft))
    .toBeGreaterThan(0);
  await added.press('Backspace');
  await expect(bar.getByRole('tab')).toHaveCount(7);
  const source = bar.locator('.kui-app-tab[data-tab-id="components"]');
  const target = bar.locator('.kui-app-tab[data-tab-id="design-guidance"]');
  await strip.evaluate((node) => {
    node.scrollLeft = 0;
  });
  await expect.poll(() => strip.evaluate((node) => node.scrollLeft)).toBe(0);
  await source.dragTo(target, { targetPosition: { x: 100, y: 16 } });
  await expect(page.locator('[data-tab-order]')).toContainText(
    'Design guidance · Components',
  );
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/tab-bar-overflow-wide.png',
      fullPage: true,
    });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await strip.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/tab-bar-overflow-narrow.png',
      fullPage: true,
    });
});

test('keeps added tab IDs unique after another tab closes', async ({
  page,
}) => {
  await page.goto('/?component=application-tabs');
  const bar = page.locator(
    '[data-demo="application-tabs"] [data-tab-bar-id="catalog-tabs"]',
  );
  const add = bar.getByRole('button', { name: 'Add tab' });

  await add.click();
  const firstAdded = bar.locator('[data-demo-tab-id="new-8"]');
  await expect(firstAdded).toHaveCount(1);
  await expect(firstAdded.getByRole('tab')).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await bar.getByRole('tab', { name: 'Components' }).press('Backspace');
  await add.click();
  const secondAdded = bar.locator('[data-demo-tab-id="new-9"]');
  await expect(firstAdded).toHaveCount(1);
  await expect(secondAdded).toHaveCount(1);
  await expect(secondAdded.getByRole('tab')).toHaveAttribute(
    'aria-selected',
    'true',
  );

  const firstAddedTab = firstAdded.getByRole('tab');
  await firstAddedTab.click();
  await expect(firstAddedTab).toHaveAttribute('aria-selected', 'true');
  await firstAddedTab.press('Alt+Shift+ArrowRight');
  await expect(page.locator('[data-tab-order]')).toContainText(
    'New tab 9 · New tab 8',
  );
  await expect(firstAddedTab).toBeFocused();

  await firstAddedTab.press('Backspace');
  await expect(firstAdded).toHaveCount(0);
  await expect(secondAdded).toHaveCount(1);
  await expect(secondAdded.getByRole('tab')).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('autoscrolls the TabBar while a dragged tab rests near either scroll edge', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=application-tabs');
  const frame = page.locator('.demo-application-tabs');
  const bar = frame.locator('[data-tab-bar-id="catalog-tabs"]');
  const strip = bar.locator('[data-kui-tab-list]');
  const source = bar.locator('.kui-app-tab').first();
  const stripBounds = await strip.boundingBox();
  expect(stripBounds).not.toBeNull();
  await source.dispatchEvent('dragstart');
  await strip.dispatchEvent('dragover', {
    clientX: stripBounds!.x + stripBounds!.width - 3,
    clientY: stripBounds!.y + stripBounds!.height / 2,
  });
  await expect
    .poll(() => strip.evaluate((node) => node.scrollLeft))
    .toBeGreaterThan(24);
  if (browserName === 'chromium')
    await frame.screenshot({
      path: 'test-results/tab-bar-edge-autoscroll-end.png',
    });
  await source.dispatchEvent('dragend');
  await expect(bar.locator('[data-tab-autoscroll]')).toHaveCount(0);

  const startScroll = await strip.evaluate((node) => {
    node.scrollLeft = node.scrollWidth - node.clientWidth;
    return node.scrollLeft;
  });
  await source.dispatchEvent('dragstart');
  await strip.dispatchEvent('dragover', {
    clientX: stripBounds!.x + 3,
    clientY: stripBounds!.y + stripBounds!.height / 2,
  });
  await expect
    .poll(() => strip.evaluate((node) => node.scrollLeft))
    .toBeLessThan(startScroll - 24);
  if (browserName === 'chromium')
    await frame.screenshot({
      path: 'test-results/tab-bar-edge-autoscroll-start.png',
    });
  await source.dispatchEvent('dragend');
  await expect(bar.locator('[data-tab-autoscroll]')).toHaveCount(0);
});
