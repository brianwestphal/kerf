import { expect, type Page, test } from '@playwright/test';

// End-to-end coverage of the collapsible-sidebar recipe (CollapsiblePanel +
// CollapsiblePanelToggle + wireSidebar) across Chromium, Firefox, and WebKit:
// collapse/expand, focus move-in and restore, the compact overlay with a
// dismissable backdrop + Escape, the Tab focus trap, and the compact initial
// state (the overlay only ever opens on a user action).

const RECIPE = '/?component=recipe-collapsible-sidebar';

const railPanel = (page: Page) =>
  page.locator('[data-collapsible-panel="sidebar-rail"]');
const drawerPanel = (page: Page) =>
  page.locator('[data-collapsible-panel="sidebar-console"]');
// The reveal toggle lives in the always-visible main header (distinct from the
// identically-named collapse toggle inside the rail).
const revealToggle = (page: Page) =>
  page.locator(
    '[data-recipe="recipe-collapsible-sidebar"] main [data-collapsible-target="sidebar-rail"]',
  );
const railToggles = (page: Page) =>
  page.locator('[data-collapsible-target="sidebar-rail"]');
const railInnerToggle = (page: Page) =>
  railPanel(page).locator('.kui-collapsible-panel__toggle');
const backdrop = (page: Page) =>
  page.locator('.kui-collapsible-panel__backdrop');

test('collapses and expands the rail, moving focus in and restoring it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto(RECIPE);

  // One control owns each action: while the rail is open only its own
  // collapse toggle exists, and the main header shows no expand toggle.
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');
  await expect(railToggles(page)).toHaveCount(1);
  await expect(revealToggle(page)).toHaveCount(0);

  // Collapse from inside the rail: focus moves to the main header's expand
  // toggle rather than staying on the now-hidden collapse toggle.
  await railInnerToggle(page).click();
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');
  await expect(revealToggle(page)).toBeFocused();

  // Expand from the main header: focus moves into the panel's first control.
  await revealToggle(page).click();
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');
  await expect(railInnerToggle(page)).toBeFocused();
  await expect(revealToggle(page)).toHaveCount(0);
});

test('expands and collapses the bottom drawer independently', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto(RECIPE);

  await expect(drawerPanel(page)).toHaveAttribute('data-collapsed', 'true');
  await page.getByRole('button', { name: 'Show activity' }).first().click();
  await expect(drawerPanel(page)).toHaveAttribute('data-collapsed', 'false');
  // The rail is unaffected by the drawer toggle.
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');

  // Open, the drawer's own collapse toggle is its only control.
  await expect(
    page.locator('[data-collapsible-target="sidebar-console"]'),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Hide activity' }).click();
  await expect(drawerPanel(page)).toHaveAttribute('data-collapsed', 'true');
  await expect(
    page.getByRole('button', { name: 'Show activity' }),
  ).toBeFocused();
});

test('opens the bottom drawer monotonically from its stable bottom edge', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto(RECIPE);

  await expect(drawerPanel(page)).toHaveAttribute('data-collapsed', 'true');
  const samplesPromise = page.evaluate(async () => {
    const frames: Array<{
      offset: number;
      translateY: number;
      panelBottom: number;
    }> = [];
    let sawMotion = false;
    let settled = false;
    // Sample on a time budget, not a frame count: sampling starts before the
    // click, and under full-suite load a slow click or a slow frame rate could
    // spend a fixed frame budget before the drawer even begins to open.
    const deadline = performance.now() + 5000;
    while (performance.now() < deadline) {
      await new Promise(window.requestAnimationFrame);
      const panel = document.querySelector<HTMLElement>(
        '[data-collapsible-panel="sidebar-console"]',
      )!;
      if (panel.dataset.collapsed !== 'false') continue;
      const motion = panel.querySelector<HTMLElement>(
        '.kui-collapsible-panel__content',
      )!;
      const transform = window.getComputedStyle(motion).transform;
      const frame = {
        offset:
          motion.getBoundingClientRect().top -
          panel.getBoundingClientRect().top,
        translateY: transform === 'none' ? 0 : new DOMMatrix(transform).m42,
        panelBottom: panel.getBoundingClientRect().bottom,
      };
      sawMotion ||= frame.translateY > 20;
      if (
        sawMotion &&
        Math.abs(frame.translateY) < 0.5 &&
        Math.abs(frame.offset) < 1.5
      ) {
        settled = true;
        if (frames.length === 0) frames.push(frame);
        break;
      }
      if (sawMotion) frames.push(frame);
    }
    return { sawMotion, settled, frames };
  });
  await page.getByRole('button', { name: 'Show activity' }).first().click();
  const samples = await samplesPromise;

  expect(samples.settled).toBe(true);
  expect(samples.sawMotion).toBe(true);
  // The panel's bottom edge is the motion anchor. A changing normal-flow origin
  // caused the old content overshoot and snap even while this edge stayed put.
  expect(
    Math.max(...samples.frames.map(({ panelBottom }) => panelBottom)) -
      Math.min(...samples.frames.map(({ panelBottom }) => panelBottom)),
  ).toBeLessThan(1.5);
  for (let index = 1; index < samples.frames.length; index += 1) {
    // The content's top advances only upward. A one-pixel tolerance absorbs
    // subpixel easing/rounding at the settled edge in all three engines.
    expect(samples.frames[index]!.offset).toBeLessThanOrEqual(
      samples.frames[index - 1]!.offset + 1,
    );
  }
  await expect(drawerPanel(page)).toHaveAttribute('data-collapsed', 'false');
  expect(
    await drawerPanel(page).evaluate((panel) => {
      const motion = panel.querySelector<HTMLElement>(
        '.kui-collapsible-panel__content',
      )!;
      return (
        motion.getBoundingClientRect().top - panel.getBoundingClientRect().top
      );
    }),
  ).toBeLessThan(1.5);
});

test('presents a compact overlay dismissed by Escape and the backdrop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto(RECIPE);
  const canvas = page.locator('.kui-catalog__canvas');

  // Narrow to a compact width: the overlay presentation starts closed; the
  // reveal toggle opens the rail as an overlay with a backdrop.
  await page.setViewportSize({ width: 430, height: 820 });
  await expect(canvas).toHaveAttribute('data-collapsible-overlay', 'true');
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');
  await expect(backdrop(page)).toHaveCount(0);
  await revealToggle(page).click();
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');
  await expect(backdrop(page)).toHaveCount(1);

  // Escape collapses the overlay and removes the backdrop.
  await page.keyboard.press('Escape');
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');
  await expect(backdrop(page)).toHaveCount(0);

  // Re-open, then dismiss by clicking the backdrop. Click the exposed right
  // portion of the backdrop — its center sits under the rail, which is on top.
  await revealToggle(page).click();
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');
  await expect(backdrop(page)).toHaveCount(1);
  const box = await backdrop(page).boundingBox();
  if (!box) throw new Error('backdrop has no box');
  await page.mouse.click(box.x + box.width - 24, box.y + box.height / 2);
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');
});

test('traps Tab focus within the open compact overlay', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto(RECIPE);
  await page.setViewportSize({ width: 430, height: 820 });
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');
  await revealToggle(page).click();
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');

  // Focus the last control in the rail; Tab wraps back to the first.
  await railPanel(page).getByRole('button', { name: 'Shared with me' }).focus();
  await page.keyboard.press('Tab');
  await expect(railInnerToggle(page)).toBeFocused();

  // Shift+Tab from the first control wraps to the last.
  await page.keyboard.press('Shift+Tab');
  await expect(
    railPanel(page).getByRole('button', { name: 'Shared with me' }),
  ).toBeFocused();
});

test('routes screen-edge safe-area insets between the rail, drawer, and main pane', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto(RECIPE);
  const root = page.locator('[data-recipe="recipe-collapsible-sidebar"]');
  await expect(root).toBeVisible();
  // Simulate the recipe reaching every screen edge with unequal insets (a
  // stylesheet, so re-renders cannot morph it away).
  await page.addStyleTag({
    content:
      '[data-recipe="recipe-collapsible-sidebar"]{--kui-edge-inset-block-start:44px;--kui-edge-inset-block-end:34px;--kui-edge-inset-inline-start:47px;--kui-edge-inset-inline-end:43px}',
  });
  const mainPadding = () =>
    root.evaluate((element) => {
      const main = [...element.querySelectorAll('.kui-pane')].find(
        (pane) => !pane.closest('.kui-collapsible-panel'),
      )!;
      const content = main.querySelector(':scope > .kui-pane__content')!;
      const style = window.getComputedStyle(content);
      return {
        left: style.paddingLeft,
        right: style.paddingRight,
        bottom: style.paddingBottom,
      };
    });

  // The expanded rail owns the left edge: the main pane must not inset again.
  await expect.poll(mainPadding).toEqual({
    left: '0px',
    right: '43px',
    bottom: '34px',
  });
  // Collapsing the rail hands the left edge back to the main pane.
  await page.getByRole('button', { name: 'Hide navigation' }).first().click();
  await expect(root).toHaveAttribute('data-rail-collapsed', 'true');
  await expect.poll(mainPadding).toMatchObject({ left: '47px' });
  // Opening the drawer takes the bottom edge from the main pane.
  await page.getByRole('button', { name: 'Show activity' }).first().click();
  await expect(root).toHaveAttribute('data-drawer-collapsed', 'false');
  await expect.poll(mainPadding).toMatchObject({ bottom: '0px' });
});

// KF-RAWSGQ: the compact overlay is screen-fixed chrome. The recipe's app
// frame stands in for the screen, so the rail, drawer, and backdrop dock to the
// frame's edges; docked to the page they started 24px left of the inset frame,
// which clipped the rail's leading edge.
test('keeps the compact overlay rail, drawer, and backdrop inside the 390px app frame', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(RECIPE);
  const root = page.locator('[data-recipe="recipe-collapsible-sidebar"]');
  const frame = root.locator(
    'xpath=ancestor::*[contains(concat(" ", @class, " "), " kui-catalog-example__viewport ")][1]',
  );
  await expect(page.locator('.kui-catalog__canvas')).toHaveAttribute(
    'data-collapsible-overlay',
    'true',
  );
  await frame.scrollIntoViewIfNeeded();
  await revealToggle(page).click();
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');
  // Let the rail finish sliding in before measuring it.
  await expect(
    railPanel(page).locator('.kui-collapsible-panel__content'),
  ).toHaveCSS('transform', 'none');

  const inside = (panelId: string) =>
    page.evaluate((id) => {
      const frameElement = document
        .querySelector('[data-recipe="recipe-collapsible-sidebar"]')!
        .closest<HTMLElement>('.kui-catalog-example__viewport')!;
      const panel = document.querySelector<HTMLElement>(
        `[data-collapsible-panel="${id}"]`,
      )!;
      const box = frameElement.getBoundingClientRect();
      const panelBox = panel.getBoundingClientRect();
      const backdrop = document.querySelector<HTMLElement>(
        '.kui-collapsible-panel__backdrop',
      );
      const backdropBox = backdrop?.getBoundingClientRect();
      // Every visible text and icon of the panel lies inside the frame.
      const leaves = [...panel.querySelectorAll<Element>('*')].filter(
        (node) =>
          (node.children.length === 0 && node.textContent?.trim()) ||
          node.localName === 'svg',
      );
      const outside = leaves
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            text: node.textContent?.trim() || node.localName,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          };
        })
        .filter(
          (rect) =>
            rect.left < box.left - 0.5 ||
            rect.right > box.right + 0.5 ||
            rect.top < box.top - 0.5 ||
            rect.bottom > box.bottom + 0.5,
        );
      const clientLeft = box.left + frameElement.clientLeft;
      const clientTop = box.top + frameElement.clientTop;
      return {
        outside,
        leaves: leaves.length,
        panel: {
          left: panelBox.left - clientLeft,
          top: panelBox.top - clientTop,
          right: clientLeft + frameElement.clientWidth - panelBox.right,
          bottom: clientTop + frameElement.clientHeight - panelBox.bottom,
        },
        backdrop: backdropBox && {
          width: backdropBox.width - frameElement.clientWidth,
          height: backdropBox.height - frameElement.clientHeight,
        },
      };
    }, panelId);

  const rail = await inside('sidebar-rail');
  expect(rail.leaves).toBeGreaterThan(0);
  expect(rail.outside).toEqual([]);
  // The rail docks to the frame's leading edge and spans its full height.
  expect(rail.panel.left).toBeCloseTo(0, 0);
  expect(rail.panel.top).toBeCloseTo(0, 0);
  expect(rail.panel.bottom).toBeCloseTo(0, 0);
  // The backdrop scrims the whole frame, not a button-height strip.
  expect(rail.backdrop!.width).toBeCloseTo(0, 0);
  expect(rail.backdrop!.height).toBeCloseTo(0, 0);
  if (browserName === 'chromium')
    await frame.screenshot({
      path: 'test-results/collapsible-sidebar-compact-rail-390.png',
    });

  // The drawer overlay docks to the frame's bottom edge the same way.
  await page.keyboard.press('Escape');
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');
  await page.getByRole('button', { name: 'Show activity' }).first().click();
  await expect(drawerPanel(page)).toHaveAttribute('data-collapsed', 'false');
  await expect
    .poll(async () => (await inside('sidebar-console')).panel.bottom)
    .toBeCloseTo(0, 0);
  // Let the content finish sliding up before measuring it.
  await expect(
    drawerPanel(page).locator('.kui-collapsible-panel__content'),
  ).toHaveCSS('transform', 'none');
  const drawer = await inside('sidebar-console');
  expect(drawer.outside).toEqual([]);
  expect(drawer.panel.left).toBeCloseTo(0, 0);
  expect(drawer.panel.right).toBeCloseTo(0, 0);
  if (browserName === 'chromium')
    await frame.screenshot({
      path: 'test-results/collapsible-sidebar-compact-drawer-390.png',
    });
});

// KF-717E65: a compact overlay is transient and user-initiated. The recipe used
// to open its rail as a blocking overlay (backdrop + focus trap) on load at
// compact widths; it now starts collapsed there, keeps its open inline default
// on wide screens, and a wide → compact crossing collapses it while the way
// back restores the inline state.
test.describe('compact overlay initial state', () => {
  test('first load at 390 opens no overlay, backdrop, or focus trap', async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(RECIPE);
    const canvas = page.locator('.kui-catalog__canvas');
    await expect(canvas).toHaveAttribute('data-collapsible-overlay', 'true');
    await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');
    await expect(drawerPanel(page)).toHaveAttribute('data-collapsed', 'true');
    await expect(backdrop(page)).toHaveCount(0);
    // The rail never painted open: its content already sits off-screen.
    await expect(
      railPanel(page).locator('.kui-collapsible-panel__content'),
    ).not.toHaveCSS('transform', 'none');
    expect(
      await railPanel(page).evaluate(
        (panel) => panel.getBoundingClientRect().width,
      ),
    ).toBe(0);

    // No focus trap: Tab moves on from the reveal toggle instead of wrapping
    // inside a panel, and Escape changes nothing.
    await revealToggle(page).focus();
    await page.keyboard.press('Tab');
    const escaped = await page.evaluate(() => {
      const active = document.activeElement;
      return {
        inRail: Boolean(
          active?.closest('[data-collapsible-panel="sidebar-rail"]'),
        ),
        stayed: Boolean(
          active?.closest('main [data-collapsible-target="sidebar-rail"]'),
        ),
      };
    });
    expect(escaped).toEqual({ inRail: false, stayed: false });
    await page.keyboard.press('Escape');
    await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');

    const frame = page
      .locator('[data-recipe="recipe-collapsible-sidebar"]')
      .locator(
        'xpath=ancestor::*[contains(concat(" ", @class, " "), " kui-catalog-example__viewport ")][1]',
      );
    if (browserName === 'chromium')
      await frame.screenshot({
        path: 'test-results/collapsible-sidebar-compact-initial-390.png',
      });
  });

  test('the reveal control still opens the rail as an overlay at 390', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(RECIPE);
    await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');
    await revealToggle(page).click();
    await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');
    await expect(backdrop(page)).toHaveCount(1);
    await expect(railInnerToggle(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');
    await expect(backdrop(page)).toHaveCount(0);
    await expect(revealToggle(page)).toBeFocused();
  });

  test('keeps the open inline default at 1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(RECIPE);
    const canvas = page.locator('.kui-catalog__canvas');
    await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');
    await expect(railPanel(page)).toHaveAttribute(
      'data-presentation',
      'inline',
    );
    await expect(canvas).not.toHaveAttribute('data-collapsible-overlay', /./);
    await expect(backdrop(page)).toHaveCount(0);
    await expect(
      railPanel(page).locator('.kui-collapsible-panel__content'),
    ).toHaveCSS('transform', 'none');
  });

  test('collapses on a wide → compact crossing and restores the inline rail on the way back', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(RECIPE);
    const canvas = page.locator('.kui-catalog__canvas');
    await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(canvas).toHaveAttribute('data-collapsible-overlay', 'true');
    await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');
    await expect(backdrop(page)).toHaveCount(0);

    // Back to wide: the open inline rail returns, with no overlay chrome.
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(canvas).not.toHaveAttribute('data-collapsible-overlay', /./);
    await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');
    await expect(backdrop(page)).toHaveCount(0);

    // An inline choice to hide the rail survives a compact round trip, even
    // when the overlay was opened meanwhile.
    await railInnerToggle(page).click();
    await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(canvas).toHaveAttribute('data-collapsible-overlay', 'true');
    await revealToggle(page).click();
    await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(canvas).not.toHaveAttribute('data-collapsible-overlay', /./);
    await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');
    await expect(backdrop(page)).toHaveCount(0);
  });
});

test('keeps the compact overlay intact when a nav selection re-renders the recipe, then toggles', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 820 });
  await page.goto(RECIPE);
  const canvas = page.locator('.kui-catalog__canvas');

  await revealToggle(page).click();
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');
  await expect(backdrop(page)).toHaveCount(1);

  // Selecting a destination re-renders the recipe (and morphs the wired
  // canvas) without touching any panel signal. Select from the keyboard:
  // Playwright's WebKit pointer path misplaces its click point for this fixed
  // overlay inside the catalog's transformed frame (elementFromPoint at the
  // item hits the item itself, so a real tap is unaffected).
  await railPanel(page).getByRole('button', { name: 'Projects' }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.locator('[data-recipe="recipe-collapsible-sidebar"] main'),
  ).toContainText('Projects');
  await expect(canvas).toHaveAttribute('data-collapsible-overlay', 'true');
  await expect(canvas).toHaveAttribute(
    'data-collapsible-responsive',
    'overlay',
  );
  await expect(backdrop(page)).toHaveCount(1);
  await expect(railPanel(page)).toHaveCSS('position', 'fixed');

  // The wiring still owns the rail: its own toggle (keyboard, for the same
  // WebKit reason) closes the overlay and restores focus, and the reveal
  // toggle opens it again.
  await railInnerToggle(page).focus();
  await page.keyboard.press('Enter');
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');
  await expect(backdrop(page)).toHaveCount(0);
  await expect(revealToggle(page)).toBeFocused();
  await revealToggle(page).click();
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');
  await expect(backdrop(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');
});
