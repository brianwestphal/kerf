import { expect, test } from '@playwright/test';

// A standalone icon toggle: 44px, its 2px-inset face fills the control (a
// native or document button style must not shrink it to the icon), the face
// rises when pressed, and clicking flips the application-owned state.
test('IconToggleButton toggles and raises a full-size face when pressed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=icon-toggle-button');
  const demo = page.locator('[data-demo="icon-toggle-button"]');
  const toggle = demo.getByRole('button', { name: 'Show Conversation' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  const face = (pressed: boolean) =>
    demo
      .locator(`.kui-icon-toggle-button[aria-pressed="${pressed}"]`)
      .first()
      .evaluate((button) => {
        const face = button.querySelector('.kui-icon-toggle-button__face')!;
        const outer = button.getBoundingClientRect();
        const inner = face.getBoundingClientRect();
        return {
          outer: [outer.width, outer.height],
          inner: [inner.width, inner.height],
          shadow: window.getComputedStyle(face).boxShadow,
        };
      });
  const resting = await face(false);
  expect(resting.outer).toEqual([44, 44]);
  // 44 - 2 × (1px border + 2px inset).
  expect(resting.inner).toEqual([38, 38]);
  expect(resting.shadow).toBe('none');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.move(0, 0);
  await expect.poll(async () => (await face(true)).shadow).not.toBe('none');
  expect((await face(true)).inner).toEqual([38, 38]);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});
