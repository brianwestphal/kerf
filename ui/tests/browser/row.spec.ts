import { expect, type Locator, test } from '@playwright/test';

type FlexGeometry = {
  alignContent: string;
  alignItems: string;
  display: string;
  flexDirection: string;
  flex: string;
  flexWrap: string;
  gap: string;
  justifyContent: string;
};

async function flexGeometry(locator: Locator) {
  return locator.evaluate((element) => {
    const style = globalThis.getComputedStyle(element);
    return {
      alignContent: style.alignContent,
      alignItems: style.alignItems,
      display: style.display,
      flexDirection: style.flexDirection,
      flex: style.flex,
      flexWrap: style.flexWrap,
      gap: style.gap,
      justifyContent: style.justifyContent,
    } satisfies FlexGeometry;
  });
}

test('Row exposes stable defaults, alignment, wrapping, and typed gaps', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=row');

  const demo = page.locator('[data-demo="row"]');
  const example = (label: string) =>
    demo.locator('[data-catalog-example]').filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: new RegExp(`^${label}$`),
      }),
    });
  const defaultRow = example('Default row').locator('[data-component="row"]');
  await expect(defaultRow).toHaveAttribute('data-h-align', 'left');
  await expect(defaultRow).toHaveAttribute('data-v-align', 'full');
  await expect(defaultRow).toHaveAttribute('data-flex', 'false');
  await expect(defaultRow).toHaveAttribute('data-wrap', 'false');
  await expect
    .poll(() => flexGeometry(defaultRow))
    .toMatchObject({
      alignContent: 'space-between',
      alignItems: 'stretch',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: '8px',
      justifyContent: 'flex-start',
    });

  const horizontal = [
    ['Left', 'left', 'flex-start'],
    ['Center', 'center', 'space-around'],
    ['Right', 'right', 'flex-end'],
    ['Full', 'full', 'space-between'],
  ] as const;
  for (const [label, name, expected] of horizontal) {
    await expect
      .poll(() =>
        flexGeometry(
          example(`${label} distribution`).locator(
            `[data-component="row"][data-h-align="${name}"]`,
          ),
        ),
      )
      .toMatchObject({ justifyContent: expected });
  }

  const vertical = [
    ['Top', 'top', 'flex-start', 'flex-start'],
    ['Middle', 'middle', 'center', 'space-around'],
    ['Bottom', 'bottom', 'flex-end', 'flex-end'],
    ['Full', 'full', 'stretch', 'space-between'],
    ['Baseline', 'baseline', 'baseline', 'baseline'],
  ] as const;
  for (const [label, name, items, content] of vertical) {
    await expect
      .poll(() =>
        flexGeometry(
          example(`${label} alignment`).locator(
            `[data-component="row"][data-v-align="${name}"]`,
          ),
        ),
      )
      .toMatchObject({ alignItems: items, alignContent: content });
  }

  const wrapped = example('Wrapped row').locator(
    '[data-component="row"][data-wrap="true"]',
  );
  await expect
    .poll(() => flexGeometry(wrapped))
    .toMatchObject({
      flexWrap: 'wrap',
      gap: '16px',
    });
  // The example's compact viewport gives the specimen a measured width, so
  // the wrap is visible even on a wide stage instead of fitting on one line.
  expect(
    await wrapped.evaluate(
      (row) =>
        new Set(
          [...row.children].map((child) =>
            Math.round(child.getBoundingClientRect().top),
          ),
        ).size,
    ),
  ).toBeGreaterThan(1);

  const flexExample = example('Flex participation');
  const participatingRows = flexExample.locator('[data-component="row"]');
  const growing = participatingRows.nth(0);
  await expect(growing).toHaveAttribute('data-flex', 'true');
  await expect
    .poll(() => flexGeometry(growing))
    .toMatchObject({
      flex: '1 1 auto',
    });
  await expect
    .poll(() => flexGeometry(participatingRows.nth(1)))
    .toMatchObject({ flex: '0 0 auto' });

  // Each Row variant is its own catalog example, so the geometry overlay
  // outlines every framed row individually rather than one bound around a
  // stacked group of variants.
  const framedLabels = [
    'Default row',
    ...horizontal.map(([label]) => `${label} distribution`),
    ...vertical.map(([label]) => `${label} alignment`),
    'Wrapped row',
  ];
  await expect
    .poll(() =>
      page.evaluate((labels) => {
        const canvas = document.querySelector('.kui-catalog__canvas')!;
        const base = canvas.getBoundingClientRect();
        const bounds = [
          ...document.querySelectorAll<HTMLElement>(
            '.kui-catalog__geometry-bound',
          ),
        ].map((bound) => {
          const rect = bound.getBoundingClientRect();
          return {
            top: Math.round(rect.top - base.top),
            height: Math.round(rect.height),
          };
        });
        return labels.map((label) => {
          const example = [
            ...document.querySelectorAll(
              '[data-demo="row"] [data-catalog-example]',
            ),
          ].find(
            (candidate) =>
              candidate.querySelector('[data-catalog-example-label]')
                ?.textContent === label,
          );
          const viewport = example?.querySelector(
            ':scope > [data-catalog-example-viewport]',
          );
          const panels = viewport?.querySelectorAll('.kui-sunken-panel').length;
          const rect = viewport?.getBoundingClientRect();
          const top = rect ? Math.round(rect.top - base.top) : -1;
          const height = rect ? Math.round(rect.height) : -1;
          const matches = bounds.filter(
            (bound) =>
              Math.abs(bound.top - top) <= 1 &&
              Math.abs(bound.height - height) <= 1,
          ).length;
          return `${label}: panels=${panels} bounds=${matches}`;
        });
      }, framedLabels),
    )
    .toEqual(framedLabels.map((label) => `${label}: panels=1 bounds=1`));

  if (browserName === 'chromium') {
    await page.screenshot({
      path: 'test-results/row-wide.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page
        .locator('html')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: 'test-results/row-narrow.png',
      fullPage: true,
    });
  }
});

test('List retains defaults and accepts the shared alignment vocabulary', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=list');

  const demo = page.locator('[data-demo="list"]');
  const example = (label: string) =>
    demo.locator('[data-catalog-example]').filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: new RegExp(`^${label}$`),
      }),
    });
  const defaultList = example('Scrollable application list')
    .locator('[data-component="list"]')
    .first();
  await expect(defaultList).toHaveAttribute('data-h-align', 'full');
  await expect(defaultList).toHaveAttribute('data-v-align', 'top');
  await expect
    .poll(() => flexGeometry(defaultList))
    .toMatchObject({
      alignItems: 'stretch',
      justifyContent: 'flex-start',
    });

  await expect
    .poll(() =>
      flexGeometry(
        example('Physical-axis alignment').locator('[data-component="list"]'),
      ),
    )
    .toMatchObject({
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    });
});
