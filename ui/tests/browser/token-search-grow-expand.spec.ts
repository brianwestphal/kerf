import { expect, type Page, test } from '@playwright/test';

// A collapsible toolbar-group TokenSearchField inside a search group must
// expand (and collapse) as ONE surface: the field fills the group on every
// frame, so the pill never shows an empty band beside a narrower field, and a
// query never wraps while the group is still opening. This holds for a
// `sizing="grow"` group (KF-50K0JM) and a plain search group (KF-CXQB30).

type Frame = {
  t: number;
  group: number;
  field: number;
  lines: number;
};

async function mountFixture(page: Page, width: number, grow = true) {
  await page.goto('/?component=toolbar-control-group');
  await page.evaluate(
    ([hostWidth, isGrow]) => {
      const toolbar = document
        .querySelector<HTMLElement>(
          '[data-demo-section="toolbar-group-sizing"] .kui-toolbar',
        )!
        .cloneNode(true) as HTMLElement;
      const host = document.createElement('div');
      host.dataset.growExpandFixture = 'true';
      host.style.width = `${hostWidth}px`;
      host.append(toolbar);
      document.body.prepend(host);
      const group = toolbar.querySelector<HTMLElement>('[data-sizing="grow"]')!;
      // The same group without `sizing="grow"` is a plain search group.
      if (!isGrow) group.removeAttribute('data-sizing');
      group.dataset.expandFixtureGroup = '';
      const field = group.querySelector<HTMLElement>('.kui-token-search')!;
      const collapsedField = document.querySelector<HTMLElement>(
        '[data-demo-section="toolbar-group-search"] .kui-token-search',
      )!;
      const expandedMarkup = field.innerHTML;
      const collapsedMarkup = collapsedField.innerHTML;
      const w = window as unknown as {
        kfGrowSet: (expanded: boolean) => void;
      };
      // Mirror the app render: group + field flip together in one task.
      w.kfGrowSet = (expanded) => {
        group.dataset.expanded = String(expanded);
        field.dataset.expanded = String(expanded);
        field.innerHTML = expanded ? expandedMarkup : collapsedMarkup;
        if (expanded) {
          const text = field.querySelector<HTMLElement>(
            '[data-token-search-text]',
          )!;
          text.textContent = 'pump site:north Zseal';
          text.dataset.empty = 'false';
          // A field with a query hides its placeholder, as the component does.
          field.dataset.placeholderVisible = 'false';
        }
      };
      w.kfGrowSet(false);
    },
    [width, grow] as const,
  );
}

async function sample(page: Page, expanded: boolean): Promise<Frame[]> {
  return page.evaluate(
    (next) =>
      new Promise<Frame[]>((resolve) => {
        const host = document.querySelector<HTMLElement>(
          '[data-grow-expand-fixture]',
        )!;
        const group = host.querySelector<HTMLElement>(
          '[data-expand-fixture-group]',
        )!;
        const frames: Frame[] = [];
        const start = performance.now();
        const measure = () => {
          const field = group.querySelector<HTMLElement>('.kui-token-search')!;
          const text = field.querySelector('[data-token-search-text]');
          let lines = 0;
          if (text?.firstChild) {
            const range = document.createRange();
            range.selectNodeContents(text);
            lines = new Set(
              [...range.getClientRects()]
                .filter((rect) => rect.width > 0)
                .map((rect) => Math.round(rect.top)),
            ).size;
          }
          frames.push({
            t: Math.round(performance.now() - start),
            group: Math.round(group.getBoundingClientRect().width),
            field: Math.round(field.getBoundingClientRect().width),
            lines,
          });
          if (performance.now() - start < 450)
            window.requestAnimationFrame(measure);
          else resolve(frames);
        };
        (
          window as unknown as { kfGrowSet: (expanded: boolean) => void }
        ).kfGrowSet(next);
        measure();
      }),
    expanded,
  );
}

// Wide: the group animates its flex size open. Narrow (a <=480px toolbar
// container): the grown group takes its own line, so it opens in one frame.
for (const { width, animates } of [
  { width: 1440, animates: true },
  { width: 420, animates: false },
]) {
  test(`grow search group and field expand and collapse together at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: Math.max(width, 480), height: 800 });
    await mountFixture(page, width);
    // Let the initial collapsed layout settle without transitions.
    await page.waitForTimeout(400);
    const host = page.locator('[data-grow-expand-fixture]');

    const opening = await sample(page, true);
    const settledOpen = opening.at(-1)!;
    expect(settledOpen.group).toBeGreaterThan(200);
    for (const frame of opening) {
      // Chrome slack: the group's 1px border on each side + 1px rounding.
      // No empty band: the field is never narrower than the group's content
      // box (1px border + 1px padding per side, +1px rounding).
      expect(
        frame.group - frame.field,
        JSON.stringify(frame),
      ).toBeLessThanOrEqual(5);
      expect(frame.lines, JSON.stringify(frame)).toBeLessThanOrEqual(
        settledOpen.lines,
      );
    }
    expect(settledOpen.lines).toBe(1);
    expect(settledOpen.group - settledOpen.field).toBeLessThanOrEqual(5);
    // Wide: the group's visible chrome animates instead of snapping. Narrow:
    // it is at its settled width from the first frame.
    const early = opening.find((frame) => frame.t > 0 && frame.t < 120)!;
    if (animates) expect(early.group).toBeLessThan(settledOpen.group);
    else expect(opening[0]!.group).toBe(settledOpen.group);
    await host.screenshot({
      path: `test-results/token-search-grow-expanded-${width}.png`,
    });

    const closing = await sample(page, false);
    const settledClosed = closing.at(-1)!;
    expect(settledClosed.group).toBeLessThan(50);
    // Widths shrink monotonically: the collapse runs the same direction.
    for (let index = 1; index < closing.length; index += 1)
      expect(closing[index]!.group).toBeLessThanOrEqual(
        closing[index - 1]!.group,
      );
    await host.screenshot({
      path: `test-results/token-search-grow-collapsed-${width}.png`,
    });
  });
}

test('reduced motion snaps the grow search group open in one frame', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 800 });
  await mountFixture(page, 1440);
  await page.waitForTimeout(100);
  const opening = await sample(page, true);
  const settled = opening.at(-1)!;
  expect(opening[0]!.group).toBe(settled.group);
  expect(opening[0]!.field).toBe(settled.field);
  expect(opening[0]!.lines).toBe(1);
});

// A plain (non-grow) search group animates its own width; the field follows it
// on every frame and keeps its query on one line until the opening ends.
for (const width of [1440, 420]) {
  test(`plain search group and field expand and collapse together at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: Math.max(width, 480), height: 800 });
    await mountFixture(page, width, false);
    await page.waitForTimeout(400);
    const host = page.locator('[data-grow-expand-fixture]');

    const opening = await sample(page, true);
    const settled = opening.at(-1)!;
    expect(settled.lines).toBe(1);
    for (const [index, frame] of opening.entries()) {
      const detail = JSON.stringify(frame);
      // No empty band: only the group's 1px border and padding per side.
      expect(frame.group - frame.field, detail).toBeLessThanOrEqual(5);
      expect(frame.lines, detail).toBeLessThanOrEqual(1);
      // It grows steadily to its settled width and never overshoots it.
      expect(frame.group, detail).toBeLessThanOrEqual(settled.group + 1);
      if (index > 0)
        expect(frame.group, detail).toBeGreaterThanOrEqual(
          opening[index - 1]!.group,
        );
    }
    const early = opening.find((frame) => frame.t > 0 && frame.t < 120)!;
    expect(early.group).toBeLessThan(settled.group);
    await host.screenshot({
      path: `test-results/token-search-plain-expanded-${width}.png`,
    });

    const closing = await sample(page, false);
    expect(closing.at(-1)!.group).toBeLessThan(50);
    for (let index = 1; index < closing.length; index += 1)
      expect(closing[index]!.group).toBeLessThanOrEqual(
        closing[index - 1]!.group,
      );
  });
}

test('reduced motion snaps the plain search group open in one frame', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 800 });
  await mountFixture(page, 1440, false);
  await page.waitForTimeout(100);
  const opening = await sample(page, true);
  const settled = opening.at(-1)!;
  expect(opening[0]!.group).toBe(settled.group);
  expect(opening[0]!.field).toBe(settled.field);
  expect(opening[0]!.lines).toBe(1);
});
