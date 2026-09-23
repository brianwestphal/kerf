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
  page.locator('.recipe-collapsible-sidebar__reveal');
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

  const samples = await page.evaluate(async () => {
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Show activity"]')!
      .click();
    const frames: Array<{
      offset: number;
      translateY: number;
      panelBottom: number;
    }> = [];
    for (let index = 0; index < 18; index += 1) {
      await new Promise(window.requestAnimationFrame);
      const panel = document.querySelector<HTMLElement>(
        '[data-collapsible-panel="sidebar-console"]',
      )!;
      const motion = panel.querySelector<HTMLElement>(
        '.kui-collapsible-panel__content',
      )!;
      const transform = window.getComputedStyle(motion).transform;
      frames.push({
        offset:
          motion.getBoundingClientRect().top -
          panel.getBoundingClientRect().top,
        translateY: transform === 'none' ? 0 : new DOMMatrix(transform).m42,
        panelBottom: panel.getBoundingClientRect().bottom,
      });
    }
    return frames;
  });

  expect(samples.some(({ translateY }) => translateY > 20)).toBe(true);
  // The panel's bottom edge is the motion anchor. A changing normal-flow origin
  // caused the old content overshoot and snap even while this edge stayed put.
  expect(
    Math.max(...samples.map(({ panelBottom }) => panelBottom)) -
      Math.min(...samples.map(({ panelBottom }) => panelBottom)),
  ).toBeLessThan(1.5);
  for (let index = 1; index < samples.length; index += 1) {
    // The content's top advances only upward. A one-pixel tolerance absorbs
    // subpixel easing/rounding at the settled edge in all three engines.
    expect(samples[index]!.offset).toBeLessThanOrEqual(
      samples[index - 1]!.offset + 1,
    );
  }
  expect(samples.at(-1)!.offset).toBeLessThan(1.5);
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
