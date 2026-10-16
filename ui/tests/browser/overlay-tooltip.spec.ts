import { expect, test } from '@playwright/test';

test('overlay-tooltip.css gives core tooltip() the help tag look on hover and focus', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/?component=tooltip');
    const demo = page.locator('[data-demo="tooltip"]');
    const deploy = demo.getByRole('button', { name: 'Deploy' });
    await deploy.hover();
    const tip = page.locator('.kerf-tooltip');
    await expect(tip).toBeVisible();
    await expect(tip).toHaveAttribute('role', 'tooltip');
    await expect(tip).toContainText('deploys it to staging');
    await expect(tip).toHaveCSS('opacity', '1');

    const geometry = await page.evaluate(() => {
      const element = document.querySelector<HTMLElement>('.kerf-tooltip')!;
      const anchor = document.querySelector('[data-tooltip-demo="deploy"]')!;
      const style = window.getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const anchorBox = anchor.getBoundingClientRect();
      return {
        pointer: style.pointerEvents,
        radius: style.borderTopLeftRadius,
        fontSize: style.fontSize,
        background: style.backgroundColor,
        color: style.color,
        width: box.width,
        left: box.left,
        right: window.innerWidth - box.right,
        above: box.bottom <= anchorBox.top + 1,
        lines: Math.round(box.height / parseFloat(style.lineHeight)),
      };
    });
    expect(geometry.pointer).toBe('none');
    expect(geometry.radius).toBe('3px');
    expect(geometry.fontSize).toBe('14px');
    expect(geometry.background).not.toBe(geometry.color);
    // Above its anchor by default, wrapped within 40 characters and the
    // viewport.
    expect(geometry.above).toBe(true);
    expect(geometry.lines).toBeGreaterThanOrEqual(2);
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeGreaterThanOrEqual(0);

    // Leaving hides it through the exit.
    await page.mouse.move(0, 0);
    await expect(tip).toHaveCount(0);

    // Keyboard focus shows it too, and a rich tooltip can sit below.
    const build = demo.getByRole('button', { name: 'Build Status' });
    await build.focus();
    await expect(tip).toContainText('Build 1482 passed');
    const below = await page.evaluate(() => {
      const element = document.querySelector('.kerf-tooltip')!;
      const anchor = document.querySelector('[data-tooltip-demo="build"]')!;
      return (
        element.getBoundingClientRect().top >=
        anchor.getBoundingClientRect().bottom - 1
      );
    });
    expect(below).toBe(true);
    await build.blur();
    await expect(tip).toHaveCount(0);
  }
});
