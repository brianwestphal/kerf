import { expect, type Page, test } from '@playwright/test';

// KF-0AGJ5W bottom-sheet DialogSurface: `presentation="bottom-sheet"` rests
// the wa-dialog panel on the viewport's bottom edge with square bottom
// corners, clears the safe area and the virtual keyboard with a block-end
// padding the panel runs behind, slides in and out, and (with `resizable`)
// offers a top grabber that resizes it within `minHeight` and the cap.

const DIALOG = '#catalog-sheet-dialog';

async function openSheet(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto('/?component=surface-scaffold');
  await page.getByRole('button', { name: 'Open New Message' }).click();
  await expect(page.locator(DIALOG)).toHaveAttribute('open', '');
  await expect
    .poll(() =>
      page.locator(DIALOG).evaluate((element) =>
        element
          .shadowRoot!.querySelector('[part~="dialog"]')!
          .getAnimations()
          .every((animation) => animation.playState === 'finished'),
      ),
    )
    .toBe(true);
}

function panelGeometry(page: Page) {
  return page.locator(DIALOG).evaluate((element) => {
    const panel =
      element.shadowRoot!.querySelector<HTMLElement>('[part~="dialog"]')!;
    const body = element.shadowRoot!.querySelector('[part~="body"]')!;
    const rect = panel.getBoundingClientRect();
    const style = globalThis.getComputedStyle(panel);
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bodyBottom: body.getBoundingClientRect().bottom,
      bodyScrollOverflow: body.scrollHeight - body.clientHeight,
      radii: [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomRightRadius,
        style.borderBottomLeftRadius,
      ],
      paddingBottom: parseFloat(style.paddingBottom),
    };
  });
}

for (const [label, width, height] of [
  ['phone', 390, 844],
  ['desktop', 1280, 860],
] as const) {
  test(`a ${label} bottom sheet rests on the bottom edge with square bottom corners`, async ({
    page,
  }) => {
    await openSheet(page, width, height);
    const geometry = await panelGeometry(page);
    expect(geometry.bottom).toBeCloseTo(height, 0);
    // With no `height` the sheet opens at its content height: the body holds
    // the whole form without scrolling, well short of the cap.
    expect(geometry.height).toBeLessThan(height - 16);
    expect(geometry.bodyScrollOverflow).toBeLessThanOrEqual(1);
    expect(geometry.radii[0]).not.toBe('0px');
    expect(geometry.radii[1]).not.toBe('0px');
    expect(geometry.radii.slice(2)).toEqual(['0px', '0px']);
    // Full width on a phone; the medium 560px width, centered, on a desktop.
    const expected = Math.min(560, width);
    expect(geometry.width).toBeCloseTo(expected, 0);
    expect(geometry.left).toBeCloseTo((width - expected) / 2, 0);
  });
}

test('the panel runs behind the safe area and the keyboard while its content stays above them', async ({
  page,
}) => {
  await openSheet(page, 390, 844);
  const opening = (await panelGeometry(page)).height;
  await page.evaluate(() =>
    document.documentElement.style.setProperty(
      '--kui-safe-area-block-end',
      '34px',
    ),
  );
  let geometry = await panelGeometry(page);
  expect(geometry.bottom).toBeCloseTo(844, 0);
  expect(geometry.paddingBottom).toBeCloseTo(34, 0);
  expect(geometry.height).toBeCloseTo(opening + 34, 0);
  expect(geometry.bodyBottom).toBeLessThanOrEqual(844 - 34 + 0.5);
  // The register publishes the measured keyboard overlap on the panel; the
  // larger clearance wins and the visible height above it is kept.
  await page
    .locator(DIALOG)
    .evaluate((element) =>
      element
        .shadowRoot!.querySelector<HTMLElement>('[part~="dialog"]')!
        .style.setProperty('--_kui-dialog-surface-keyboard-inset', '300px'),
    );
  geometry = await panelGeometry(page);
  expect(geometry.bottom).toBeCloseTo(844, 0);
  expect(geometry.paddingBottom).toBeCloseTo(300, 0);
  expect(geometry.height).toBeCloseTo(opening + 300, 0);
  expect(geometry.bodyBottom).toBeLessThanOrEqual(844 - 300 + 0.5);
  // The cap (viewport minus the 16px gutter) still holds.
  await page
    .locator(DIALOG)
    .evaluate((element) =>
      element
        .shadowRoot!.querySelector<HTMLElement>('[part~="dialog"]')!
        .style.setProperty('--_kui-dialog-surface-keyboard-inset', '600px'),
    );
  geometry = await panelGeometry(page);
  expect(geometry.top).toBeCloseTo(16, 0);
});

test('the grabber resizes the sheet by drag and keyboard within its bounds', async ({
  page,
}) => {
  await openSheet(page, 390, 844);
  const opening = (await panelGeometry(page)).height;
  const handle = page.getByRole('separator', { name: 'Resize sheet' });
  await expect(handle).toBeVisible();
  await expect(handle).toHaveAttribute(
    'aria-valuenow',
    String(Math.round(opening)),
  );
  await expect(handle).toHaveAttribute('aria-valuemin', '200');
  await expect(handle).toHaveAttribute('aria-valuemax', '828');
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 120, {
    steps: 6,
  });
  await page.mouse.up();
  expect((await panelGeometry(page)).height).toBeCloseTo(opening + 120, 0);
  await expect(handle).toHaveAttribute(
    'aria-valuenow',
    String(Math.round(opening + 120)),
  );
  // Dragging past the top stops at the cap.
  const moved = (await handle.boundingBox())!;
  await page.mouse.move(moved.x + 40, moved.y + 10);
  await page.mouse.down();
  await page.mouse.move(moved.x + 40, -400, { steps: 4 });
  await page.mouse.up();
  expect((await panelGeometry(page)).top).toBeCloseTo(16, 0);
  await handle.focus();
  await page.keyboard.press('Home');
  expect((await panelGeometry(page)).height).toBeCloseTo(200, 0);
  await page.keyboard.press('ArrowUp');
  expect((await panelGeometry(page)).height).toBeCloseTo(216, 0);
  await expect(handle).toHaveAttribute('aria-valuenow', '216');
  // The pointer never light-dismisses the sheet from its own grabber.
  await expect(page.locator(DIALOG)).toHaveAttribute('open', '');
  // Each opening starts at the configured (here, content) height again.
  await page.keyboard.press('Escape');
  await expect(page.locator(DIALOG)).not.toHaveAttribute('open', '');
  await expect
    .poll(() =>
      page.locator(DIALOG).evaluate((element) => {
        // Reopen until Web Awesome has settled its close.
        const dialog = element as HTMLElement & { open: boolean };
        dialog.open = true;
        return element.hasAttribute('open');
      }),
    )
    .toBe(true);
  await expect
    .poll(async () => Math.round((await panelGeometry(page)).height))
    .toBe(Math.round(opening));
});

test('the sheet slides up from the bottom edge and back down, unless motion is reduced', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=surface-scaffold');
  // Record each motion mark with the panel's animations when it is set.
  await page.locator(DIALOG).evaluate((element) => {
    const marks: { mark: string | null; names: string[] }[] = [];
    (globalThis as { sheetMarks?: typeof marks }).sheetMarks = marks;
    new MutationObserver(() =>
      marks.push({
        mark: element.getAttribute('data-kui-sheet-motion'),
        names: element
          .shadowRoot!.querySelector('[part~="dialog"]')!
          .getAnimations()
          .map((animation) => (animation as CSSAnimation).animationName),
      }),
    ).observe(element, { attributeFilter: ['data-kui-sheet-motion'] });
  });
  const marks = () =>
    page.evaluate(
      () =>
        (
          globalThis as {
            sheetMarks?: { mark: string | null; names: string[] }[];
          }
        ).sheetMarks!,
    );
  const setOpen = (open: boolean) =>
    page.locator(DIALOG).evaluate((element, value) => {
      (element as HTMLElement & { open: boolean }).open = value;
    }, open);
  const slide = ['kui-dialog-surface-sheet-slide'];
  await page.getByRole('button', { name: 'Open New Message' }).click();
  await expect(page.locator(DIALOG)).toHaveAttribute('open', '');
  await expect.poll(async () => (await marks()).length).toBe(2);
  await setOpen(false);
  await expect(page.locator(DIALOG)).not.toHaveAttribute('open', '');
  await expect.poll(async () => (await marks()).length).toBe(4);
  expect(await marks()).toEqual([
    { mark: 'enter', names: slide },
    { mark: null, names: [] },
    { mark: 'exit', names: slide },
    { mark: null, names: [] },
  ]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setOpen(true);
  await expect.poll(async () => (await marks()).length).toBeGreaterThan(4);
  const reduced = (await marks())[4]!;
  expect(reduced.mark).toBe('enter');
  expect(reduced.names).not.toEqual(slide);
});

test('a sheet without a height opens at its content height, so nothing at its end is clipped', async ({
  page,
}) => {
  // A modal dialog sits between both block insets; an auto height used to
  // stretch the sheet to its cap, and the catalog's old fixed height sat a
  // few pixels short of the form, clipping the textarea's bottom border.
  await openSheet(page, 390, 844);
  const fit = await page.locator(DIALOG).evaluate((element) => {
    const body = element.shadowRoot!.querySelector('[part~="body"]')!;
    const textarea = element.querySelector('wa-textarea')!;
    return {
      overflow: body.scrollHeight - body.clientHeight,
      textareaBottom: textarea.getBoundingClientRect().bottom,
      bodyBottom: body.getBoundingClientRect().bottom,
    };
  });
  expect(fit.overflow).toBeLessThanOrEqual(1);
  expect(fit.textareaBottom).toBeLessThanOrEqual(fit.bodyBottom);
  const geometry = await panelGeometry(page);
  // It rests on the bottom edge well below the top of a tall viewport.
  expect(geometry.bottom).toBeCloseTo(844, 0);
  expect(geometry.top).toBeGreaterThan(300);
});
