import { expect, type Locator, test } from '@playwright/test';

const needleAngle = (gauge: Locator) =>
  gauge.locator('.kui-gauge__needle').evaluate((needle) => {
    const { a, b } = new DOMMatrix(window.getComputedStyle(needle).transform);
    return Math.round((Math.atan2(b, a) * 180) / Math.PI);
  });

test('Gauge is a named meter whose needle tracks the value, pins past max, and stills under reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=gauge');
  const demo = page.locator('[data-demo="gauge"]');
  const tile = demo.getByRole('meter', {
    name: 'Tokens per Minute',
    exact: true,
  });
  await expect(tile).toHaveAttribute('aria-valuenow', '420');
  await expect(tile).toHaveAttribute('aria-valuemax', '1000');
  await expect(tile).toHaveAttribute('aria-valuetext', '420 tok/min');
  await expect(tile.locator('.kui-gauge__value')).toHaveText('420');
  await expect(tile.locator('.kui-gauge__unit')).toHaveText('tok/min');
  // 420 of 1000 across a 240-degree sweep starting at -120.
  await expect.poll(() => needleAngle(tile)).toBe(-19);

  const box = await tile.boundingBox();
  expect(box!.width).toBeCloseTo(88, 0);
  const standby = demo.getByRole('meter', {
    name: 'Tokens per Minute, Standby',
  });
  expect((await standby.boundingBox())!.width).toBeCloseTo(220, 0);

  const bare = demo.getByRole('meter', { name: 'Agent Tokens per Minute' });
  await expect(bare).toHaveAttribute(
    'title',
    'Agent Tokens per Minute: 420 tok/min',
  );
  await expect(bare.locator('.kui-gauge__value')).toHaveCount(0);
  await expect(bare.locator('.kui-gauge__tick')).toHaveCount(0);
  expect((await bare.boundingBox())!.width).toBeCloseTo(40, 0);

  // The needle transitions on a value change.
  await expect(tile.locator('.kui-gauge__needle')).toHaveCSS(
    'transition-duration',
    '0.3s',
  );
  const speedUp = demo.getByRole('button', { name: 'Speed Up' });
  for (let i = 0; i < 5; i++) await speedUp.click();
  await expect(tile).toHaveAttribute('aria-valuenow', '1000');
  await expect(tile).toHaveAttribute('data-pinned', '');
  await expect(tile.locator('.kui-gauge__value')).toHaveText('1170');
  await expect.poll(() => needleAngle(tile)).toBe(120);

  const night = demo.getByRole('meter', { name: 'Tokens per Minute, Night' });
  await expect(night.locator('.kui-gauge__fill')).toHaveCSS(
    'stroke',
    'rgb(163, 13, 13)',
  );

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(tile.locator('.kui-gauge__needle')).toHaveCSS(
    'transition-duration',
    '0s',
  );
});
