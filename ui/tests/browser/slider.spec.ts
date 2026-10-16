import { expect, test } from '@playwright/test';

test('Slider steps by keyboard and pointer, and its fill and readout follow', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=slider');
    const demo = page.locator('[data-demo="slider"]');
    const volume = page.getByRole('slider', { name: 'Volume' });
    await expect(volume).toHaveAccessibleDescription(
      'Applies to every output device.',
    );
    await expect(volume).toHaveValue('30');
    await volume.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('End');
    await expect(volume).toHaveValue('100');
    const readout = demo.locator('output').first();
    await expect(readout).toHaveText('100%');
    await expect(volume).toHaveAttribute('aria-valuetext', '100%');
    await expect
      .poll(() =>
        volume.evaluate((element) =>
          element.style.getPropertyValue('--_kui-slider-fill'),
        ),
      )
      .toBe('100%');

    // A pointer press at a quarter of the track moves the thumb there.
    const zoom = page.getByRole('slider', { name: 'Zoom' });
    const box = (await zoom.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.99, box.y + box.height / 2);
    await expect(zoom).toHaveValue('200');
    await expect(demo.locator('output').nth(1)).toHaveText('200%');

    // Tick labels sit under the track and stay inside the slider.
    const ticks = await zoom.evaluate((input) => {
      const root = input.closest('.kui-slider')!.getBoundingClientRect();
      return [
        ...input.closest('.kui-slider')!.querySelectorAll('.kui-slider__tick'),
      ].map((tick) => {
        const r = tick.getBoundingClientRect();
        return {
          inside: r.left >= root.left - 0.5 && r.right <= root.right + 0.5,
          below: r.top >= input.getBoundingClientRect().bottom - 1,
        };
      });
    });
    for (const tick of ticks)
      expect(tick).toEqual({ inside: true, below: true });

    await expect(
      page.getByRole('slider', { name: 'Locked Setting' }),
    ).toBeDisabled();
  }
});
