// KF-63XR5K: a SizedRegion gives a whole-screen layout a definite height, so
// a nested NavStack fills it instead of collapsing to its toolbar.
import { expect, type Locator, type Page, test } from '@playwright/test';

const height = async (locator: Locator) =>
  (await locator.boundingBox())!.height;

const example = (page: Page, name: string) => {
  const region = page.locator(`[data-sized-region-demo="${name}"]`);
  return { region, stack: region.locator('.kui-nav-stack') };
};

for (const width of [1280, 390]) {
  test(`SizedRegion gives a nested layout its height at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=sized-region');

    // fill: the rest of the Pane's content after the item above it.
    const fill = example(page, 'fill');
    await expect(fill.stack).toContainText('Fills the Region');
    const content = fill.region.locator('xpath=..');
    const above = content.locator('.kui-content-item').first();
    const contentBox = (await content.boundingBox())!;
    const regionBox = (await fill.region.boundingBox())!;
    expect(regionBox.y).toBeGreaterThan((await above.boundingBox())!.y);
    expect(regionBox.height).toBeGreaterThan(200);
    // It ends at the Pane content's bottom and doesn't overflow it.
    expect(
      Math.abs(
        regionBox.y + regionBox.height - (contentBox.y + contentBox.height),
      ),
    ).toBeLessThan(2);
    expect(
      await content.evaluate((el) => el.scrollHeight - el.clientHeight),
    ).toBeLessThanOrEqual(1);
    expect(await height(fill.stack)).toBeCloseTo(regionBox.height, 0);

    // minHeight alone, in flowing content: 20rem.
    const min = example(page, 'min');
    expect(await height(min.region)).toBeCloseTo(320, 0);
    expect(await height(min.stack)).toBeCloseTo(320, 0);
    await expect(min.stack).toContainText('Fills the Region');

    // maxHeight bounds a fill in a taller Pane: 18rem.
    const max = example(page, 'max');
    expect(await height(max.region)).toBeCloseTo(288, 0);
    expect(await height(max.stack)).toBeCloseTo(288, 0);

    for (const name of ['fill', 'min', 'max']) {
      await example(page, name).region.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath(`kf-63xr5k-${name}-${width}.png`),
      });
    }
  });
}
