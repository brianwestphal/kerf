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
    ['left', 'flex-start'],
    ['center', 'space-around'],
    ['right', 'flex-end'],
    ['full', 'space-between'],
  ] as const;
  for (const [name, expected] of horizontal) {
    await expect
      .poll(() =>
        flexGeometry(
          example('Horizontal distribution').locator(
            `[data-component="row"][data-h-align="${name}"]`,
          ),
        ),
      )
      .toMatchObject({ justifyContent: expected });
  }

  const vertical = [
    ['top', 'flex-start', 'flex-start'],
    ['middle', 'center', 'space-around'],
    ['bottom', 'flex-end', 'flex-end'],
    ['full', 'stretch', 'space-between'],
    ['baseline', 'baseline', 'baseline'],
  ] as const;
  for (const [name, items, content] of vertical) {
    await expect
      .poll(() =>
        flexGeometry(
          example('Vertical alignment').locator(
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
