import { resolve } from 'node:path';

import { expect, type Locator, type Page, test } from '@playwright/test';
import { build, type Plugin } from 'esbuild';

// The fit suite owns its fixture (`fixtures/anchored-surface-fit.ts`): an
// anchor the test places at an exact viewport position and a surface whose
// content height the test sets, so no catalog demo's styling can move it.

const GUTTER = 8;
const GAP = 4;
// A phone viewport; the content is taller than the room on either side.
const PHONE = { width: 390, height: 844 };
const CONTENT = 1200;

// kerfjs resolves to this repository's core, as in the UX catalog, so the
// suite covers the positioning core the catalog ships with.
const coreSource: Plugin = {
  name: 'kerf-core-source',
  setup(builder) {
    builder.onResolve({ filter: /^kerfjs(\/[a-z-]+)?$/ }, ({ path }) => ({
      path: resolve(
        import.meta.dirname,
        `../../../src/${path.slice('kerfjs/'.length) || 'index'}.ts`,
      ),
    }));
  },
};

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/anchored-surface-fit.ts'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
  plugins: [coreSource],
});

/** Load the fixture page at `viewport`, then open the surface. */
async function openSurface(
  page: Page,
  viewport: { width: number; height: number },
  fit: { anchorTop: number; contentHeight: number },
): Promise<Locator> {
  const result = await fixtureBundle;
  const file = (extension: string) =>
    result.outputFiles.find((output) => output.path.endsWith(extension))!.text;
  await page.setViewportSize(viewport);
  await page.setContent('<body style="margin:0"></body>');
  // The bundle takes the source stylesheets: compile their px-first
  // `remify()` lengths as the package build does.
  await page.addStyleTag({
    content: file('.css').replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: file('.js') });
  await page.evaluate(
    (value) =>
      (
        globalThis as unknown as {
          openFitSurface(fit: {
            anchorTop: number;
            contentHeight: number;
          }): void;
        }
      ).openFitSurface(value),
    fit,
  );
  const surface = page.getByRole('dialog', { name: 'Fit Fixture' });
  await expect(surface).toBeVisible();
  return surface;
}

const anchorBox = (page: Page) =>
  page.locator('#fit-anchor').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom };
  });

const geometry = (surface: Locator) =>
  surface.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = globalThis.getComputedStyle(element);
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      viewportWidth: globalThis.innerWidth,
      viewportHeight: globalThis.innerHeight,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflowY: style.overflowY,
      available: style
        .getPropertyValue('--kui-anchored-surface-available-height')
        .trim(),
    };
  });

// A surface taller than the room on either side of its anchor must stay
// inside an 8px viewport gutter, cap itself to the room beside the anchor,
// scroll the rest, and refit as the viewport changes, with no application
// media queries.
const fits = async (surface: Locator) => {
  const box = await geometry(surface);
  return (
    box.left >= GUTTER - 0.5 &&
    box.right <= box.viewportWidth - GUTTER + 0.5 &&
    box.top >= GUTTER - 0.5 &&
    box.bottom <= box.viewportHeight - GUTTER + 0.5
  );
};

test('an anchored surface fits the room beside its anchor inside the viewport gutter', async ({
  page,
}) => {
  const surface = await openSurface(page, PHONE, {
    anchorTop: 400,
    contentHeight: CONTENT,
  });

  // Taller than the room on either side: capped, scrolling, inside the gutter.
  await expect.poll(() => fits(surface)).toBe(true);
  const first = await geometry(surface);
  expect(first.overflowY).toBe('auto');
  expect(first.scrollHeight).toBeGreaterThan(first.clientHeight);
  expect(first.available).toMatch(/^\d+(\.\d+)?px$/);
  // Glued to its anchor on the side it opened.
  const anchor = await anchorBox(page);
  expect(
    Math.abs(first.top - (anchor.bottom + GAP)) < 1 ||
      Math.abs(first.bottom - (anchor.top - GAP)) < 1,
  ).toBe(true);

  // A shorter viewport refits on resize, and a page scroll refits again,
  // still with no app CSS.
  await page.setViewportSize({ width: PHONE.width, height: 700 });
  await expect.poll(() => fits(surface)).toBe(true);
  const second = await geometry(surface);
  expect(second.available).not.toBe(first.available);
  await page.evaluate(() => globalThis.scrollBy(0, 120));
  await expect.poll(() => fits(surface)).toBe(true);
  await expect
    .poll(async () => (await geometry(surface)).available)
    .not.toBe(second.available);

  await surface.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    surface.getByText('End of help', { exact: true }),
  ).toBeInViewport();
});

// Put the anchor a little below the middle of a phone viewport (so the room
// above is larger), open a surface taller than either room, and return the
// room on each side.
const openBelowMiddle = async (page: Page) => {
  const surface = await openSurface(page, PHONE, {
    anchorTop: PHONE.height / 2 + 40,
    contentHeight: CONTENT,
  });
  const anchor = await anchorBox(page);
  const rooms = {
    below: PHONE.height - GUTTER - (anchor.bottom + GAP),
    above: anchor.top - GAP - GUTTER,
    anchorBottom: anchor.bottom,
  };
  expect(rooms.above).toBeGreaterThan(rooms.below);
  return { surface, rooms };
};

// An app that caps the surface below its content height (here through an
// inline `max-height` that still honors the published room) must be measured
// at that cap: a capped surface that fits below its anchor stays below, even
// when the room above is larger and its full content fits neither side.
test('an app-capped surface that fits the preferred side stays there', async ({
  page,
}) => {
  const { surface, rooms } = await openBelowMiddle(page);
  const cap = Math.floor(rooms.below - 20);
  const full = await surface.evaluate((element) => element.scrollHeight);
  expect(full).toBeGreaterThan(rooms.below);

  // Apply the app cap, then reposition (a resize event refits the surface).
  await surface.evaluate((element, px) => {
    element.style.maxHeight = `min(${px}px, var(--kerf-anchor-available-height))`;
    globalThis.dispatchEvent(new Event('resize'));
  }, cap);
  await expect
    .poll(() =>
      surface.evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeCloseTo(rooms.anchorBottom + GAP, 0);
  const box = await geometry(surface);
  expect(box.bottom - box.top).toBeLessThanOrEqual(cap + 0.5);
  expect(box.bottom).toBeLessThanOrEqual(box.viewportHeight - GUTTER + 0.5);

  // Reading that cap never lifts it: a scrolled surface keeps its position
  // across repositions.
  const scrolled = await surface.evaluate((element) => {
    element.scrollTop = 40;
    globalThis.dispatchEvent(new Event('resize'));
    return element.scrollTop;
  });
  expect(scrolled).toBe(40);
});

// A cap that stays relative after computing (here a percentage, which a
// fixed surface resolves against the viewport) is resolved against the
// containing block, so a surface whose capped height fits below its anchor
// stays below.
test('a percentage-capped surface that fits the preferred side stays there', async ({
  page,
}) => {
  const { surface, rooms } = await openBelowMiddle(page);
  const full = await surface.evaluate((element) => element.scrollHeight);
  expect(full).toBeGreaterThan(rooms.below);

  const percent = await surface.evaluate((element, below) => {
    const value = ((below - 20) / globalThis.innerHeight) * 100;
    element.style.maxHeight = `${value}%`;
    globalThis.dispatchEvent(new Event('resize'));
    return value;
  }, rooms.below);
  await expect
    .poll(() =>
      surface.evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeCloseTo(rooms.anchorBottom + GAP, 0);
  const box = await geometry(surface);
  expect(box.bottom - box.top).toBeLessThanOrEqual(
    (percent / 100) * box.viewportHeight + 0.5,
  );
  expect(box.bottom).toBeLessThanOrEqual(box.viewportHeight - GUTTER + 0.5);
});

// An app `max-height` transition on a surface capped by the published room
// must not run when kerf reads the surface's own cap on a reposition (the
// read briefly lifts the published room), and an unrelated running
// transition must keep running.
test('a max-height transition on the surface does not run on reposition', async ({
  page,
}) => {
  const { surface } = await openBelowMiddle(page);
  await expect.poll(() => fits(surface)).toBe(true);
  const before = await geometry(surface);
  expect(before.scrollHeight).toBeGreaterThan(before.clientHeight);

  const result = await surface.evaluate(async (element) => {
    const frame = () =>
      new Promise((resolve) =>
        globalThis.requestAnimationFrame(() => resolve(null)),
      );
    element.style.transition = 'max-height 400ms linear, opacity 400ms linear';
    await frame();
    await frame();
    const events: string[] = [];
    for (const type of ['transitionrun', 'transitionstart'])
      element.addEventListener(type, (event) => {
        events.push(`${type}:${(event as TransitionEvent).propertyName}`);
      });
    element.style.opacity = '0.5'; // an unrelated running transition
    globalThis.getComputedStyle(element).getPropertyValue('opacity');
    globalThis.dispatchEvent(new Event('resize'));
    const running = element
      .getAnimations()
      .map((animation) => (animation as CSSTransition).transitionProperty);
    await frame();
    await frame();
    return {
      events,
      running,
      inline: element.style.transition,
      height: element.getBoundingClientRect().height,
      top: element.getBoundingClientRect().top,
    };
  });
  expect(result.events.filter((event) => event.endsWith('max-height'))).toEqual(
    [],
  );
  expect(result.running).toEqual(['opacity']);
  expect(result.inline).toBe('max-height 400ms linear, opacity 400ms linear');
  expect(result.height).toBeCloseTo(before.bottom - before.top, 0);
  expect(result.top).toBeCloseTo(before.top, 0);
});

// An app animation that drives the surface's `max-height` makes the computed
// value its current frame, not the cap the surface settles at. Expand the
// surface (with a transition, or a `@keyframes` animation) towards a cap that
// fits only above its anchor (the room above is larger) from a start that fits
// below, reposition mid-expand, and return the room kerf published, which
// names the side it chose.
const repositionMidExpand = async (
  surface: Locator,
  rooms: { below: number; above: number },
  kind: 'transition' | 'keyframes',
) =>
  surface.evaluate(
    async (element, { below, above, kind }) => {
      const frame = () =>
        new Promise((resolve) =>
          globalThis.requestAnimationFrame(() => resolve(null)),
        );
      const cap = Math.round((below + above) / 2);
      if (kind === 'transition') {
        element.style.transition = 'none';
        element.style.maxHeight = '0px';
        globalThis.getComputedStyle(element).getPropertyValue('max-height');
        element.style.transition = 'max-height 4000ms linear';
        element.style.maxHeight = `${cap}px`;
      } else {
        const style = document.createElement('style');
        style.textContent = `@keyframes kerf-fit-expand { from { max-height: 0px } to { max-height: ${cap}px } }`;
        document.head.append(style);
        element.style.maxHeight = '40px';
        element.style.animation = 'kerf-fit-expand 4000ms linear';
      }
      await frame();
      await frame();
      const events: string[] = [];
      for (const type of [
        'transitioncancel',
        'transitionrun',
        'animationcancel',
        'animationstart',
      ])
        element.addEventListener(type, () => events.push(type));
      const before = element.getAnimations();
      const midFrame = Number.parseFloat(
        globalThis.getComputedStyle(element).maxHeight,
      );
      globalThis.dispatchEvent(new Event('resize'));
      const after = element.getAnimations();
      await frame();
      return {
        cap,
        midFrame,
        events,
        // The app's animation is the same one, still running.
        kept:
          before.length > 0 &&
          before.every((animation) => after.includes(animation)) &&
          after.every((animation) => animation.playState === 'running'),
        available: Number.parseFloat(
          element.style.getPropertyValue('--kerf-anchor-available-height'),
        ),
      };
    },
    { ...rooms, kind },
  );

for (const [kind, name] of [
  ['transition', 'expand transition'],
  ['keyframes', '@keyframes animation'],
] as const)
  test(`a running max-height ${name} is measured at its end value`, async ({
    page,
  }) => {
    const { surface, rooms } = await openBelowMiddle(page);
    const result = await repositionMidExpand(surface, rooms, kind);
    // Mid-expand the frame fits below, but the cap it settles at only fits
    // above: kerf takes the side for that cap, and the app's animation keeps
    // running untouched.
    expect(result.midFrame).toBeLessThan(rooms.below);
    expect(result.cap).toBeGreaterThan(rooms.below);
    expect(result.cap).toBeLessThan(rooms.above);
    expect(result.available).toBeCloseTo(rooms.above, 0);
    expect(result.events).toEqual([]);
    expect(result.kept).toBe(true);
  });

// Placed above while an expand-from-0 entrance is still running, the surface
// must hang from its bottom edge: as it keeps growing after that reposition
// it grows upward, away from its anchor, with its bottom edge held at the gap
// above the anchor instead of sliding down over it.
test('an above placement mid-expand grows upward from its anchor', async ({
  page,
}) => {
  const { surface, rooms } = await openBelowMiddle(page);
  // `rooms.above` runs from the 4px gap above the anchor to the 8px gutter.
  const edge = rooms.above + GUTTER;
  const samples = await surface.evaluate(async (element, { below, above }) => {
    const frame = () =>
      new Promise((resolve) =>
        globalThis.requestAnimationFrame(() => resolve(null)),
      );
    const cap = Math.round((below + above) / 2);
    element.style.transition = 'none';
    element.style.maxHeight = '0px';
    globalThis.getComputedStyle(element).getPropertyValue('max-height');
    element.style.transition = 'max-height 1500ms linear';
    element.style.maxHeight = `${cap}px`;
    await frame();
    await frame();
    // Reposition early in the expand: the cap it settles at fits only
    // above, so kerf places it there.
    globalThis.dispatchEvent(new Event('resize'));
    const rects: { top: number; bottom: number }[] = [];
    for (let index = 0; index < 12; index++) {
      await frame();
      await frame();
      const rect = element.getBoundingClientRect();
      rects.push({ top: rect.top, bottom: rect.bottom });
    }
    return rects;
  }, rooms);
  const first = samples[0]!;
  const last = samples.at(-1)!;
  // It kept growing after the reposition…
  expect(last.bottom - last.top).toBeGreaterThan(first.bottom - first.top + 20);
  // …upward: every frame's bottom edge stays at the gap above the anchor.
  for (const sample of samples) expect(sample.bottom).toBeCloseTo(edge, 0);
});
