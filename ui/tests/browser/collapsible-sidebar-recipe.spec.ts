import { expect, type Page, test } from '@playwright/test';

// End-to-end coverage of the collapsible-sidebar recipe (CollapsiblePanel +
// CollapsiblePanelToggle + wireSidebar) across Chromium, Firefox, and WebKit:
// collapse/expand, focus move-in and restore, the compact overlay with a
// dismissable backdrop + Escape, and the Tab focus trap.

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
const railInnerToggle = (page: Page) =>
  railPanel(page).locator('.kui-collapsible-panel__toggle');
const backdrop = (page: Page) =>
  page.locator('.kui-collapsible-panel__backdrop');

test('collapses and expands the rail, moving focus in and restoring it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto(RECIPE);

  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');

  // Collapse via the reveal toggle: the panel hides and focus restores to it.
  await revealToggle(page).click();
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'true');
  await expect(revealToggle(page)).toBeFocused();

  // Expand via the same toggle: focus moves into the panel's first control.
  await revealToggle(page).click();
  await expect(railPanel(page)).toHaveAttribute('data-collapsed', 'false');
  await expect(railInnerToggle(page)).toBeFocused();
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

  await page.getByRole('button', { name: 'Hide activity' }).first().click();
  await expect(drawerPanel(page)).toHaveAttribute('data-collapsed', 'true');
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

  // Narrow to a compact width: the open rail becomes an overlay with a backdrop.
  await page.setViewportSize({ width: 430, height: 820 });
  await expect(canvas).toHaveAttribute('data-collapsible-overlay', 'true');
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
