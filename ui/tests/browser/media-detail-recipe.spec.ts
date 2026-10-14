import { expect, type Page, test } from '@playwright/test';

// KF-HZM8BT media detail recipe: an Apple-Music-style album page composed
// from clear NavStack chrome with the scroll-edge material, a scoped tint, an
// underChrome BackdropImage, and glass control groups. The route mounts the
// recipe through the copyable mount adapter.

const recipe = '[data-recipe="recipe-media-detail"]';
const view = `${recipe} .kui-nav-stack__view[data-nav-active="true"]`;

async function open(page: Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=recipe-media-detail');
  await expect(page.locator(recipe)).toBeVisible();
  await expect(page.locator(`${recipe} .kui-nav-stack`)).toHaveAttribute(
    'data-chrome-overlay',
    'measured',
  );
}

function scrollAlbum(page: Page, top: number) {
  return page
    .locator(`${view} .kui-pane__content`)
    .evaluate((scroller, value) => {
      scroller.scrollTop = value;
    }, top);
}

test('the album page runs its artwork beneath clear, glass-controlled chrome', async ({
  page,
}) => {
  await open(page);
  const geometry = await page.evaluate(
    ({ recipe, view }) => {
      const rect = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect();
      const chrome = document.querySelector<HTMLElement>(
        `${recipe} .kui-nav-stack__chrome:not(.kui-nav-stack__chrome-copy)`,
      )!;
      return {
        stack: rect(`${recipe} .kui-nav-stack`),
        hero: rect(`${view} .kui-backdrop-image__hero`),
        chromeBackground: window.getComputedStyle(chrome).backgroundColor,
        backMaterial: chrome
          .querySelector('[data-nav-back]')!
          .closest<HTMLElement>('.kui-toolbar-control-group')!.dataset.material,
        glassGroups: document.querySelectorAll(
          `${recipe} .kui-toolbar-control-group[data-material="glass"]`,
        ).length,
      };
    },
    { recipe, view },
  );
  expect(geometry.hero.top).toBeCloseTo(geometry.stack.top, 0);
  expect(geometry.chromeBackground).toBe('rgba(0, 0, 0, 0)');
  expect(geometry.backMaterial).toBe('glass');
  // Back, the album actions, and the playback group.
  expect(geometry.glassGroups).toBeGreaterThanOrEqual(3);
});

test('the tint colors the page and the scroll-edge material fades in over the songs', async ({
  page,
}) => {
  await open(page);
  const surface = await page
    .locator(`${recipe} .kui-nav-stack`)
    .evaluate((stack) => {
      const context = document
        .createElement('canvas')
        .getContext('2d', { willReadFrequently: true })!;
      context.fillStyle = window.getComputedStyle(stack).backgroundColor;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    });
  // The artwork's dark plum, not the neutral surface.
  const [red, green, blue] = surface as [number, number, number];
  expect(blue).toBeGreaterThan(green + 10);
  expect(red).toBeGreaterThan(green);
  expect(red + green + blue).toBeLessThan(255);

  const material = () =>
    page
      .locator(
        `${recipe} .kui-nav-stack__chrome:not(.kui-nav-stack__chrome-copy)`,
      )
      .evaluate((chrome) =>
        Number(window.getComputedStyle(chrome, '::before').opacity),
      );
  await expect.poll(material).toBe(0);
  await scrollAlbum(page, 400);
  await expect.poll(material).toBe(1);
  await scrollAlbum(page, 0);
  await expect.poll(material).toBe(0);
});

test('back pops to the library, and opening the album pushes it again', async ({
  page,
}) => {
  await open(page);
  const stack = page.locator(`${recipe} .kui-nav-stack`);
  await page.locator(`${recipe} [data-nav-back]`).click();
  await expect(stack).toHaveAttribute('data-depth', '1');
  // The library is untinted: the tint follows the album on top.
  await expect(stack).not.toHaveAttribute('data-kui-tint', 'dark');
  await page
    .locator(`${recipe} [data-nav-key="library"] [data-item-id="night-harbor"]`)
    .click();
  await expect(stack).toHaveAttribute('data-depth', '2');
  await expect(stack).toHaveAttribute('data-kui-tint', 'dark');
});
