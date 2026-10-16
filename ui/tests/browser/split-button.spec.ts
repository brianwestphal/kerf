import { expect, test } from '@playwright/test';

// Both halves are native buttons, so the trigger's state reaches the
// accessibility tree directly; the full-width variant fills its parent.
test('SplitButton exposes native halves and follows its controlled state', async ({
  page,
}) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=split-button');
    const demo = page.locator('[data-demo="split-button"]');
    const primary = demo.getByRole('button', { name: 'Drive with Codex' });
    const options = demo.getByRole('button', {
      name: 'Choose Drive Provider, Model, and Effort',
    });
    await expect(options).toHaveAttribute('aria-expanded', 'false');
    const split = demo.locator('.kui-split-button').first();
    const geometry = await split.evaluate((group) => {
      const parent = group.parentElement!.getBoundingClientRect();
      const box = group.getBoundingClientRect();
      const trigger = group
        .querySelector('.kui-split-button__options')!
        .getBoundingClientRect();
      return {
        height: box.height,
        width: box.width,
        parent: parent.width,
        trigger: trigger.width,
      };
    });
    expect(geometry.height).toBe(44);
    expect(geometry.width).toBeCloseTo(geometry.parent, 0);
    expect(geometry.trigger).toBe(40);

    await primary.click();
    await expect(split).toHaveAttribute('data-tone', 'neutral');
    await expect(
      demo.getByRole('button', { name: 'Codex Running' }),
    ).toHaveAttribute('aria-busy', 'true');
    await options.click();
    await expect(options).toHaveAttribute('aria-expanded', 'true');
    await options.click();
    await demo.getByRole('button', { name: 'Codex Running' }).click();
    await expect(split).toHaveAttribute('data-tone', 'success');
  }
});

// shape="pill" fully rounds the group's outer ends, as on Button; each half
// rounds only its outer corners, so the divider seam stays square and the
// hover fill and inset focus ring follow the pill end.
test('a pill SplitButton rounds its outer ends and keeps the seam square', async ({
  page,
}) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=split-button');
    const demo = page.locator('[data-demo="split-button"]');
    const pill = demo.locator('.kui-split-button[data-shape="pill"]').first();
    await expect(pill).toBeVisible();
    const shape = await pill.evaluate((group) => {
      const radii = (element: Element) => {
        const style = window.getComputedStyle(element);
        return [
          style.borderTopLeftRadius,
          style.borderTopRightRadius,
          style.borderBottomRightRadius,
          style.borderBottomLeftRadius,
        ];
      };
      const box = group.getBoundingClientRect();
      const trigger = group
        .querySelector('.kui-split-button__options')!
        .getBoundingClientRect();
      return {
        height: box.height,
        trigger: trigger.width,
        group: radii(group),
        primary: radii(group.querySelector('.kui-split-button__primary')!),
        options: radii(group.querySelector('.kui-split-button__options')!),
      };
    });
    expect(shape.height).toBe(44);
    expect(shape.trigger).toBe(40);
    expect(shape.group).toEqual(['22px', '22px', '22px', '22px']);
    expect(shape.primary).toEqual(['22px', '0px', '0px', '22px']);
    expect(shape.options).toEqual(['0px', '22px', '22px', '0px']);
    // The default stays on the shared rounded control radius.
    const rounded = demo.locator('.kui-split-button:not([data-shape])').first();
    await expect(rounded).toHaveCSS('border-top-left-radius', '12px');
  }
});
