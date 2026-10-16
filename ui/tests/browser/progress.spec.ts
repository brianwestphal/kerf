import { expect, test } from '@playwright/test';

test('ProgressBar advances, sweeps when indeterminate, and stills under reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=progress-bar');
  const demo = page.locator('[data-demo="progress-bar"]');
  const upload = demo.getByRole('progressbar', { name: 'Uploading Files' });
  await expect(upload).toHaveJSProperty('value', 3);
  await demo.getByRole('button', { name: 'Upload Next File' }).click();
  await expect(upload).toHaveJSProperty('value', 4);
  await expect(upload).toHaveAttribute('aria-valuetext', '4 of 12 files');
  await expect(demo.locator('.kui-progress-bar__value').first()).toHaveText(
    '4 of 12 files',
  );

  const geometry = await upload.evaluate((element) => {
    const root = element.closest('.kui-progress-bar')!;
    const label = root.querySelector('.kui-progress-bar__label')!;
    return {
      trackHeight: element.getBoundingClientRect().height,
      // The bar fills its container, less the shared 1px + 8px inset.
      inset:
        element.getBoundingClientRect().left -
        root.getBoundingClientRect().left,
      labelInset:
        label.getBoundingClientRect().left - root.getBoundingClientRect().left,
    };
  });
  expect(geometry.trackHeight).toBeCloseTo(6, 0);
  expect(geometry.inset).toBeCloseTo(9, 0);
  expect(geometry.labelInset).toBeCloseTo(9, 0);

  const migrating = demo.getByRole('progressbar', {
    name: 'Migrating Database',
  });
  expect(
    await migrating.evaluate((element) => element.matches(':indeterminate')),
  ).toBe(true);
  await expect(migrating).toHaveCSS('animation-name', 'kui-progress-bar-sweep');
  await expect(
    demo.getByRole('progressbar', { name: 'Sync Progress' }),
  ).toHaveCSS('height', '4px');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(migrating).toHaveCSS('animation-name', 'none');
});

test('ProgressRing reports its value as a named progressbar and spins when indeterminate', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=progress-ring');
  const demo = page.locator('[data-demo="progress-ring"]');
  const medium = demo.getByRole('progressbar', {
    name: 'Upload Progress, medium',
  });
  await expect(medium).toHaveAttribute('aria-valuenow', '25');
  await demo.getByRole('button', { name: 'Upload Next File' }).click();
  await expect(medium).toHaveAttribute('aria-valuenow', '33');
  await expect(medium).toHaveAttribute('aria-valuetext', '4 of 12 files');
  const sizes = await demo
    .locator('.kui-progress-ring')
    .evaluateAll((rings) =>
      rings.slice(0, 3).map((ring) => ring.getBoundingClientRect().width),
    );
  expect(sizes).toEqual([16, 24, 40]);

  const connecting = demo.getByRole('progressbar', { name: 'Connecting' });
  await expect(connecting).not.toHaveAttribute('aria-valuenow');
  await expect(connecting.locator('svg')).toHaveCSS(
    'animation-name',
    'kui-progress-ring-spin',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(connecting.locator('svg')).toHaveCSS('animation-name', 'none');
});
