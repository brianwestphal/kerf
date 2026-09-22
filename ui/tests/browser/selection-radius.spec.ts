import { expect, type Locator, test } from '@playwright/test';

interface RadiusGeometry {
  highlight: number;
  inset: number;
  outer: number;
}

async function radiusGeometry(
  group: Locator,
  highlight: Locator,
): Promise<RadiusGeometry> {
  const [outerGeometry, highlightRadius] = await Promise.all([
    group.evaluate((element) => {
      const outer = window.getComputedStyle(element);
      return {
        outer: parseFloat(outer.borderTopLeftRadius),
        inset:
          parseFloat(outer.borderLeftWidth) + parseFloat(outer.paddingLeft),
      };
    }),
    highlight.evaluate((element) =>
      parseFloat(window.getComputedStyle(element).borderTopLeftRadius),
    ),
  ]);
  return {
    ...outerGeometry,
    highlight: highlightRadius,
  };
}

function expectConcentric(geometry: RadiusGeometry, expectedOuter: number) {
  expect(geometry.outer).toBeCloseTo(expectedOuter, 5);
  expect(geometry.outer - geometry.highlight).toBeCloseTo(geometry.inset, 5);
}

async function screenshotFirstTwoExamples(demo: Locator, path: string) {
  const displays = await demo.evaluate((element) => {
    const rows = element.querySelectorAll<HTMLElement>(
      ':scope > [data-catalog-example]',
    );
    if (rows.length < 2) throw new Error('Missing radius examples');
    return Array.from(rows, (row, index) => {
      const display = row.style.display;
      if (index > 1) row.style.display = 'none';
      return display;
    });
  });
  try {
    await demo.screenshot({ path });
  } finally {
    await demo.evaluate((element, previousDisplays) => {
      const rows = element.querySelectorAll<HTMLElement>(
        ':scope > [data-catalog-example]',
      );
      rows.forEach((row, index) => {
        row.style.display = previousDisplays[index] ?? '';
      });
    }, displays);
  }
}

test('keeps toolbar selections concentric with pill and rounded group shapes', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=toolbar-control-group');

  const demo = page.locator('[data-demo="toolbar-control-group"]');
  await expect(demo).toBeVisible();
  const pillChoice = demo.getByRole('button', { name: 'Pill', exact: true });
  const shapeGroup = pillChoice.locator(
    'xpath=ancestor::*[@data-component="toolbar-control-group"]',
  );
  const selectedView = demo.getByRole('button', {
    name: 'List view',
    exact: true,
  });
  const viewGroup = selectedView.locator(
    'xpath=ancestor::*[@data-component="toolbar-control-group"]',
  );

  expectConcentric(await radiusGeometry(shapeGroup, pillChoice), 22);
  expectConcentric(await radiusGeometry(viewGroup, selectedView), 22);
  if (testInfo.project.name === 'chromium')
    await screenshotFirstTwoExamples(
      demo,
      'test-results/selection-radius-pill-wide.png',
    );

  await demo.getByRole('button', { name: 'Rounded', exact: true }).click();
  await expect(viewGroup).toHaveCSS('border-radius', '12px');
  expectConcentric(await radiusGeometry(viewGroup, selectedView), 12);

  await page.setViewportSize({ width: 428, height: 844 });
  await expect(viewGroup).toBeVisible();
  expectConcentric(await radiusGeometry(viewGroup, selectedView), 12);
  if (testInfo.project.name === 'chromium')
    await screenshotFirstTwoExamples(
      demo,
      'test-results/selection-radius-rounded-narrow.png',
    );
});
