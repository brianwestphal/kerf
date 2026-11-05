import { expect, type Locator, type Page, test } from '@playwright/test';

// KF-VQ1Z8H: in intrinsic allocation a tab gives up width by ellipsizing its
// name down to a floor (its chrome plus a few characters) before the strip
// scrolls. The action zones never shrink, and a wide bar where everything
// fits lays out exactly as before.

const FLOOR_PX = 48;

interface Geometry {
  stripOverflow: boolean;
  zones: number[];
  tabs: {
    width: number;
    nameWidth: number;
    nameScrollWidth: number;
    textWidth: number;
    textOverflow: string;
  }[];
}

const geometry = (bar: Locator) =>
  bar.evaluate((element): Geometry => {
    // Layout widths are fractional, and engines can report the same box a
    // few hundred-thousandths apart between reads (Firefox did in CI), so
    // compare them at a hundredth of a pixel.
    const px = (value: number) => Math.round(value * 100) / 100;
    const strip = element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
    const zones = [
      ...element.querySelectorAll<HTMLElement>(
        ':scope > :is(.kui-tab-bar__leading, .kui-tab-bar__trailing, .kui-tab-bar__end)',
      ),
    ].map((zone) => px(zone.getBoundingClientRect().width));
    const tabs = [
      ...strip.querySelectorAll<HTMLElement>(':scope > .kui-tab-bar-item'),
    ].map((tab) => {
      const name = tab.querySelector<HTMLElement>('.kui-tab-bar-item__name')!;
      const range = document.createRange();
      range.selectNodeContents(name);
      return {
        width: px(tab.getBoundingClientRect().width),
        nameWidth: name.clientWidth,
        nameScrollWidth: name.scrollWidth,
        textWidth: px(range.getBoundingClientRect().width),
        textOverflow: window.getComputedStyle(name).textOverflow,
      };
    });
    return {
      stripOverflow: strip.scrollWidth > strip.clientWidth + 1,
      zones,
      tabs,
    };
  });

const setBarWidth = async (bar: Locator, width: number | undefined) => {
  await bar.evaluate((element, value) => {
    element.style.width = value === undefined ? '' : `${value}px`;
  }, width);
  // Two frames: let layout and any ResizeObserver work settle.
  await bar
    .page()
    .evaluate(
      () =>
        new Promise<void>((resolve) =>
          window.requestAnimationFrame(() =>
            window.requestAnimationFrame(() => resolve()),
          ),
        ),
    );
};

const truncated = (tab: Geometry['tabs'][number]) =>
  tab.nameScrollWidth > tab.nameWidth;
/** At its floor: the name is no wider than the floor, or is short and whole. */
const atFloor = (tab: Geometry['tabs'][number]) =>
  tab.nameWidth <= FLOOR_PX + 1 || !truncated(tab);

const open = async (page: Page, id: string) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=tab-bar');
  const bar = page.locator(`[data-tab-bar-id="${id}"]`);
  await bar.scrollIntoViewIfNeeded();
  return bar;
};

test('a single tab ellipsizes its name before its strip scrolls, and restores', async ({
  page,
}, testInfo) => {
  const bar = await open(page, 'shrinking-tab-bar');
  const tab = bar.getByRole('tab', { name: 'Terminal feedback', exact: true });
  await expect(tab).toBeVisible();

  const wide = await geometry(bar);
  expect(wide.stripOverflow).toBe(false);
  expect(truncated(wide.tabs[0]!)).toBe(false);
  // Wide is unchanged: the name is exactly as wide as its text.
  expect(
    Math.abs(wide.tabs[0]!.nameWidth - wide.tabs[0]!.textWidth),
  ).toBeLessThanOrEqual(1);
  const zones = wide.zones;
  expect(zones).toHaveLength(3);
  const natural = wide.tabs[0]!.width;
  const barWidth = await bar.evaluate(
    (element) => element.getBoundingClientRect().width,
  );

  // Narrow below the tab's intrinsic width: the name ellipsizes and the strip
  // still fits; then down to the floor, past which the strip scrolls.
  const sweep: Geometry[] = [];
  const widths: number[] = [];
  for (let width = barWidth; width >= 300; width -= 12) {
    await setBarWidth(bar, width);
    sweep.push(await geometry(bar));
    widths.push(width);
  }
  for (const step of sweep) {
    // The zones never shrink.
    expect(step.zones).toEqual(zones);
    // The strip overflows only once the tab is at its floor.
    if (step.stripOverflow) expect(atFloor(step.tabs[0]!)).toBe(true);
  }
  const ellipsized = sweep.find(
    (step) => !step.stripOverflow && truncated(step.tabs[0]!),
  );
  expect(ellipsized, 'an ellipsized, non-scrolling step').toBeDefined();
  expect(ellipsized!.tabs[0]!.textOverflow).toBe('ellipsis');
  expect(ellipsized!.tabs[0]!.width).toBeLessThan(natural);
  expect(sweep.at(-1)!.stripOverflow).toBe(true);
  expect(sweep.at(-1)!.tabs[0]!.nameWidth).toBeGreaterThanOrEqual(FLOOR_PX - 1);

  // A truncated tab keeps its full accessible name and gains a title.
  await setBarWidth(bar, widths[sweep.indexOf(ellipsized!)]);
  await expect(tab).toHaveAccessibleName('Terminal feedback');
  await tab.hover();
  await expect(tab).toHaveAttribute('title', 'Terminal feedback');
  if (testInfo.project.name === 'chromium')
    await bar.screenshot({ path: testInfo.outputPath('shrink-narrow.png') });

  // Back to wide: the original geometry returns and the title goes.
  await setBarWidth(bar, undefined);
  const restored = await geometry(bar);
  expect(restored).toEqual(wide);
  await page.mouse.move(0, 0);
  await tab.hover();
  await expect(tab).not.toHaveAttribute('title', /.*/);
});

test('many tabs ellipsize before the strip scrolls; short names never widen', async ({
  page,
}) => {
  const bar = await open(page, 'overflow-tab-bar');
  // Lengthen some names and shorten one, through the rendered sizing copy.
  await bar.evaluate((element) => {
    const rename = (index: number, name: string) => {
      const tab = element.querySelectorAll('.kui-tab-bar-item')[index]!;
      tab
        .querySelector('.kui-tab-bar-item__label')!
        .setAttribute('data-kui-tab-name', name);
      tab.querySelector('.kui-tab-bar-item__name')!.textContent = name;
    };
    rename(1, 'A considerably longer backlog name');
    rename(3, 'Automations for every workspace');
    rename(5, 'All');
  });
  // Wide enough for every tab at its full width.
  await setBarWidth(bar, 2000);
  const wide = await geometry(bar);
  expect(wide.stripOverflow).toBe(false);
  for (const tab of wide.tabs) {
    expect(truncated(tab)).toBe(false);
    expect(Math.abs(tab.nameWidth - tab.textWidth)).toBeLessThanOrEqual(1);
  }
  const barWidth = 2000;

  const sweep: Geometry[] = [];
  for (let width = barWidth; width >= 240; width -= 24) {
    await setBarWidth(bar, width);
    sweep.push(await geometry(bar));
  }
  for (const step of sweep) {
    expect(step.zones).toEqual(wide.zones);
    // Scrolling starts only when every tab is at its floor.
    if (step.stripOverflow)
      for (const tab of step.tabs) expect(atFloor(tab)).toBe(true);
    // The short name is never ellipsized or widened.
    expect(truncated(step.tabs[5]!)).toBe(false);
    expect(step.tabs[5]!.width).toBe(wide.tabs[5]!.width);
  }
  const ellipsized = sweep.find(
    (step) => !step.stripOverflow && step.tabs.filter(truncated).length >= 2,
  );
  expect(ellipsized, 'several tabs ellipsized before scrolling').toBeDefined();
  for (const tab of ellipsized!.tabs.filter(truncated))
    expect(tab.textOverflow).toBe('ellipsis');
  expect(sweep.at(-1)!.stripOverflow).toBe(true);

  // Wide again: unchanged.
  await setBarWidth(bar, barWidth);
  expect(await geometry(bar)).toEqual(wide);
});
