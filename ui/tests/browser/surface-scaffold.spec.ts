import { expect, type Locator, type Page, test } from '@playwright/test';

// The label names the native dialog and titles its header; a native name
// change, Escape, and reopening keep one correctly named dialog. (Web
// Awesome's slotted-label and without-header name repair has no equivalent:
// the DialogSurface renders its own header and names itself.)
test('dialog names follow the label, a native name change, and repeated opens', async ({
  page,
}) => {
  await page.goto('/?component=surface-scaffold');
  const dialog = page.locator('#catalog-bounded-dialog');
  const open = page.getByRole('button', { name: 'Open Bounded Dialog' });
  await open.click();
  const named = page.getByRole('dialog', {
    name: 'Close Workspace',
    exact: true,
  });
  await expect(named).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: 'Close Workspace', exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Close', exact: true }),
  ).toBeVisible();
  for (const name of [
    'First explicit workspace',
    'Second explicit workspace',
  ]) {
    await dialog.evaluate(
      (element, value) => element.setAttribute('aria-label', value),
      name,
    );
    await expect(page.getByRole('dialog', { name, exact: true })).toBeVisible();
  }
  await dialog.evaluate((element) =>
    element.setAttribute('aria-label', 'Close Workspace'),
  );
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
  await open.click();
  await expect(named).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
});

test('modal viewport bounds retain actions and native focus across resize and reopen', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=surface-scaffold');
  const trigger = page.getByRole('button', { name: 'Open Bounded Dialog' });
  // Opened from the keyboard, so the trigger holds focus to return to:
  // Safari never focuses a native button on a click.
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.locator('#catalog-bounded-dialog');
  await expect(
    page.getByRole('dialog', { name: 'Close Workspace', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate((element) =>
        element.hasAttribute('data-kui-dialog-motion'),
      ),
    )
    .toBe(false);
  for (const viewport of [
    { width: 1100, height: 850 },
    { width: 390, height: 844 },
    { width: 320, height: 480 },
    { width: 390, height: 520 },
    { width: 1100, height: 850 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(dialog).toHaveAttribute('open', '');
    await expect
      .poll(() =>
        dialog.evaluate((element) => element.getBoundingClientRect().width),
      )
      .toBeCloseTo(Math.min(832, viewport.width - 16), 0);
    const geometry = await dialog.evaluate((element) => {
      const panel = element;
      const body = element.querySelector('.kui-dialog-surface__body')!;
      const rect = panel.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        maxHeight: parseFloat(window.getComputedStyle(panel).maxHeight),
        bodyOverflow: body.scrollHeight - body.clientHeight,
        pageOverflow: document.body.scrollWidth - window.innerWidth,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(7.5);
    expect(geometry.right).toBeLessThanOrEqual(viewport.width - 7.5);
    expect(geometry.top).toBeGreaterThanOrEqual(7.5);
    expect(geometry.bottom).toBeLessThanOrEqual(viewport.height - 7.5);
    expect(geometry.width).toBeCloseTo(Math.min(832, viewport.width - 16), 0);
    expect(geometry.maxHeight).toBeCloseTo(viewport.height - 16, 0);
    expect(geometry.bodyOverflow).toBeLessThanOrEqual(1);
    expect(geometry.pageOverflow).toBeLessThanOrEqual(1);
    for (const name of ['Keep Working', 'Stop and Close']) {
      const action = dialog.getByRole('button', { name, exact: true });
      await expect(action).toBeVisible();
      const rect = await action.boundingBox();
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(viewport.height - 8);
    }
    await page.screenshot({
      path: testInfo.outputPath(
        `bounded-modal-${viewport.width}x${viewport.height}.png`,
      ),
    });
  }
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    expect(
      await dialog.evaluate(
        (element) =>
          document.activeElement === element ||
          document.activeElement === document.body ||
          element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('button', { name: 'Keep Working' }).click();
  await expect(dialog).not.toHaveAttribute('open', '');
});

test('typed modal cap keeps its footer reachable when the body scrolls', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 520 });
  await page.goto('/?component=surface-scaffold');
  await page.getByRole('button', { name: 'Open Capped Dialog' }).click();
  const dialog = page.locator('#catalog-capped-dialog');
  await expect(dialog).toHaveAttribute('open', '');
  await expect(
    page.getByRole('dialog', { name: 'Review Workspace Changes' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate((element) =>
        element.hasAttribute('data-kui-dialog-motion'),
      ),
    )
    .toBe(false);
  const geometry = await dialog.evaluate((element) => {
    const panel = element;
    const body = element.querySelector('.kui-dialog-surface__body')!;
    return {
      height: panel.getBoundingClientRect().height,
      maxHeight: window.getComputedStyle(panel).maxHeight,
      overflow: body.scrollHeight - body.clientHeight,
    };
  });
  expect(geometry.height).toBeLessThanOrEqual(360.5);
  expect(geometry.maxHeight).toBe('360px');
  expect(geometry.overflow).toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 240 });
  await expect
    .poll(() =>
      dialog.evaluate((element) => window.getComputedStyle(element).maxHeight),
    )
    .toBe('224px');
  await expect(
    dialog.getByRole('button', { name: 'Cancel Review' }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 520 });
  await page.screenshot({
    path: testInfo.outputPath('capped-modal-phone.png'),
  });
  await dialog.getByRole('button', { name: 'Cancel Review' }).click();
  await expect(dialog).not.toHaveAttribute('open', '');
});

test('preferred modal widths override presets without changing side-sheet or fullscreen geometry', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=surface-scaffold');
  const bounded = page.locator('#catalog-bounded-dialog');
  await page.getByRole('button', { name: 'Open Bounded Dialog' }).click();
  await expect(bounded).toHaveAttribute('open', '');
  const panelWidth = (selector: string) =>
    page
      .locator(selector)
      .evaluate((element) => element.getBoundingClientRect().width);
  await expect
    .poll(() => panelWidth('#catalog-bounded-dialog'))
    .toBeCloseTo(832, 0);
  // The dialog is the surface: its configuration attributes are its own.
  const surface = bounded;
  await surface.evaluate((element) =>
    element.removeAttribute('data-viewport-gutter'),
  );
  await expect
    .poll(() => panelWidth('#catalog-bounded-dialog'))
    .toBeCloseTo(832, 0);
  await surface.evaluate((element) =>
    element.setAttribute('data-presentation', 'side-sheet'),
  );
  await expect
    .poll(() => panelWidth('#catalog-bounded-dialog'))
    .toBeCloseTo(480, 0);
  await surface.evaluate((element) =>
    element.setAttribute('data-presentation', 'fullscreen'),
  );
  await expect
    .poll(() => panelWidth('#catalog-bounded-dialog'))
    .toBeCloseTo(1100, 0);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Open Capped Dialog' }).click();
  await expect(page.locator('#catalog-capped-dialog')).toHaveAttribute(
    'open',
    '',
  );
  await expect
    .poll(() => panelWidth('#catalog-capped-dialog'))
    .toBeCloseTo(480, 0);
});

/** Whether a DialogSurface's panel has no running (show) animation. */
function panelSettled(dialog: Locator) {
  return dialog.evaluate((element) =>
    element
      .getAnimations()
      .every((animation) => animation.playState === 'finished'),
  );
}

test('applies typed dialog and popup surface geometry', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=surface-scaffold');
  const demo = page.locator('[data-demo="surface-scaffold"]');
  await expect(demo).toBeVisible();

  await demo.getByRole('button', { name: 'Open Dialog' }).click();
  const dialog = page.locator('#catalog-medium-dialog');
  await expect(dialog).toHaveAttribute('open', '');
  // The panel scales in; a panel measured mid-animation reads a pixel off
  // (KF-46M124: panelLeft 21 instead of 20 under a loaded full run).
  await expect.poll(() => panelSettled(dialog)).toBe(true);
  const dialogGeometry = await dialog.evaluate((element) => {
    const panel = element;
    const body = element.querySelector('.kui-dialog-surface__body')!;
    const footer = element.querySelector('.kui-dialog-surface__footer')!;
    return {
      width: Math.round(panel.getBoundingClientRect().width),
      bodyPadding: window.getComputedStyle(body).padding,
      footerPadding: window.getComputedStyle(footer).padding,
    };
  });
  expect(dialogGeometry.width).toBeLessThanOrEqual(560);
  expect(dialogGeometry.bodyPadding).toBe('0px');
  expect(dialogGeometry.footerPadding).toBe('16px');
  const dialogList = dialog.locator('[data-component="list"]');
  const dialogText = dialog.locator('[data-component="list-inset-text"]');
  await expect(dialogList).toBeVisible();
  await expect(dialogText).toHaveText(
    'Dialog content uses list-owned item geometry.',
  );
  const listGeometry = await dialogText.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      marginInline: [style.marginInlineStart, style.marginInlineEnd],
      paddingInline: [style.paddingInlineStart, style.paddingInlineEnd],
      borderInline: [style.borderInlineStartWidth, style.borderInlineEndWidth],
    };
  });
  expect(listGeometry).toEqual({
    marginInline: ['8px', '8px'],
    paddingInline: ['8px', '8px'],
    borderInline: ['1px', '1px'],
  });
  // A plain-string label is inset to the body's text edge.
  const labelAlignment = await dialog.evaluate((element) => {
    const textLeft = (node: Node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getBoundingClientRect().left;
    };
    const title = element.querySelector('.kui-dialog-surface__title')!;
    const body = element.querySelector('[data-component="list-inset-text"]')!;
    return { title: textLeft(title), body: textLeft(body) };
  });
  expect(Math.abs(labelAlignment.title - labelAlignment.body)).toBeLessThan(1);
  const wideClip = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const inset = 16;
    return {
      x: Math.max(0, rect.left - inset),
      y: Math.max(0, rect.top - inset),
      width: Math.min(window.innerWidth, rect.width + inset * 2),
      height: Math.min(window.innerHeight, rect.height + inset * 2),
    };
  });
  await page.screenshot({
    path: testInfo.outputPath('dialog-surface-wide.png'),
    clip: wideClip,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  // Let the resize lay out (and any panel animation finish) before measuring.
  await expect.poll(() => panelSettled(dialog)).toBe(true);
  await expect
    .poll(() =>
      dialog.evaluate((element) =>
        Math.round(element.getBoundingClientRect().left),
      ),
    )
    .toBe(20);
  const narrowGeometry = await dialog.evaluate((element) => {
    const panel = element;
    const text = element.querySelector('[data-component="list-inset-text"]')!;
    const panelRect = panel.getBoundingClientRect();
    const textRect = text.getBoundingClientRect();
    return {
      panelLeft: Math.round(panelRect.left),
      panelRight: Math.round(panelRect.right),
      textLeft: Math.round(textRect.left),
      textRight: Math.round(textRect.right),
      bodyScrollWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(narrowGeometry.textLeft).toBeGreaterThan(narrowGeometry.panelLeft);
  expect(narrowGeometry.panelLeft).toBe(20);
  expect(narrowGeometry.panelRight).toBe(370);
  expect(narrowGeometry.textRight).toBeLessThan(narrowGeometry.panelRight);
  expect(narrowGeometry.bodyScrollWidth).toBeLessThanOrEqual(
    narrowGeometry.viewportWidth,
  );
  const narrowClip = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const inset = 16;
    return {
      x: Math.max(0, rect.left - inset),
      y: Math.max(0, rect.top - inset),
      width: Math.min(window.innerWidth, rect.width + inset * 2),
      height: Math.min(window.innerHeight, rect.height + inset * 2),
    };
  });
  await page.screenshot({
    path: testInfo.outputPath('dialog-surface-narrow.png'),
    clip: narrowClip,
  });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).not.toHaveAttribute('open', '');

  const menu = demo.locator('.kui-popup-surface > .kui-popup-menu');
  await menu.getByRole('button', { name: 'Choose View' }).click();
  await expect(menu.locator('.kui-popup-menu__item').first()).toBeVisible();
  // `inset="list-zero"` removes the menu's padding.
  await expect(menu.locator(':scope > .kui-popup-menu__menu')).toHaveCSS(
    'padding',
    '0px',
  );
});

test('a definite-height DialogSurface hands its whole body to one filling child', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  // ListDetailDialog is a definite-height DialogSurface whose fill body is
  // one SplitView.
  await page.goto('/?component=list-detail-dialog');
  await page.getByRole('button', { name: 'Open Project Details' }).click();
  const dialog = page.locator('#list-detail-dialog-demo');
  await expect(dialog).toHaveAttribute('open', '');
  await expect
    .poll(() =>
      dialog.evaluate((element) => {
        const part = element;
        const body = element.querySelector('.kui-dialog-surface__body')!;
        const split = element.querySelector('[data-component="split-view"]')!;
        return {
          dialog: Math.round(part.getBoundingClientRect().height),
          body: Math.round(body.getBoundingClientRect().height),
          split: Math.round(split.getBoundingClientRect().height),
        };
      }),
    )
    .toMatchObject({ dialog: 480 });
  const sizes = await dialog.evaluate((element) => {
    const body = element.querySelector('.kui-dialog-surface__body')!;
    const split = element.querySelector('[data-component="split-view"]')!;
    return [
      Math.round(body.getBoundingClientRect().height),
      Math.round(split.getBoundingClientRect().height),
    ];
  });
  expect(sizes[1]).toBe(sizes[0]);
});

test('PopoverDialogSurface is a centered, bounded, non-modal light-dismiss dialog', async ({
  page,
}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=surface-scaffold');
    const open = page.getByRole('button', { name: 'Open Repository Status' });
    const surface = page.getByRole('dialog', {
      name: 'Repository Status',
      exact: true,
    });
    await open.click();
    await expect(surface).toBeVisible();
    const box = await surface.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const split = element
        .querySelector('[data-component="split-view"]')!
        .getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(window.innerWidth - rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(window.innerHeight - rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        splitBottom: Math.round(rect.bottom - split.bottom),
        splitBelowHeading: split.top > rect.top + 1,
      };
    });
    // 720px preferred, capped to the viewport minus two 8px gutters, centered.
    expect(box.width).toBe(Math.min(720, width - 16));
    expect(Math.abs(box.left - box.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.top - box.bottom)).toBeLessThanOrEqual(1);
    expect(box.height).toBe(420);
    // fill-last: the heading keeps its height and the SplitView fills the
    // rest of the surface down to its 1px bottom border.
    expect(box.splitBelowHeading).toBe(true);
    expect(box.splitBottom).toBe(1);
    // labelledBy / describedBy name and describe the dialog from its
    // heading's title and ToolbarText description.
    await expect(surface).toHaveAccessibleDescription(
      'Three projects have uncommitted changes.',
    );
    // Non-modal: the controls behind it are not made inert.
    expect(
      await page
        .getByRole('button', { name: 'Open Repository Status' })
        .evaluate((element) => element.closest('[inert]') === null),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await expect(surface).toBeHidden();
    // A press outside also dismisses it.
    await open.click();
    await expect(surface).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(surface).toBeHidden();
  }
});

test('an embedded PopoverDialogSurface renders the same surface in flow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=surface-scaffold');
  const embedded = page.getByRole('dialog', {
    name: 'Repository Status Preview',
  });
  await embedded.scrollIntoViewIfNeeded();
  await expect(embedded).toBeVisible();
  await expect(embedded).not.toHaveAttribute('popover');
  const geometry = await embedded.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const parent = element.parentElement!.getBoundingClientRect();
    const split = element
      .querySelector('[data-component="split-view"]')!
      .getBoundingClientRect();
    return {
      position: window.getComputedStyle(element).position,
      height: Math.round(rect.height),
      fitsParent: rect.right <= parent.right + 1,
      split: Math.round(split.height),
    };
  });
  expect(geometry).toEqual({
    position: 'relative',
    height: 280,
    fitsParent: true,
    split: 278,
  });
});

// The DialogSurface is itself the one native dialog: a heading composed in
// place of the label text leaves its label as the only name, so a role query
// is not ambiguous and the content stays inside it.
test('a dialog with a composed heading is the only dialog with its name', async ({
  page,
}) => {
  await page.goto('/?component=surface-scaffold');
  await page.getByRole('button', { name: 'Open Release Thread' }).click();
  const named = page.getByRole('dialog', {
    name: 'Release Thread',
    exact: true,
  });
  await expect(named).toHaveCount(1);
  await expect(named).toHaveAttribute('id', 'catalog-thread-dialog');
  expect(
    await named.evaluate((element) => [
      element.localName,
      element.matches(':modal'),
      element.querySelectorAll('dialog, [role="dialog"]').length,
      Boolean(element.querySelector('[data-demo-chat-transcript]')),
    ]),
  ).toEqual(['dialog', true, 0, true]);
  await page.keyboard.press('Escape');
});

// The built-in close control matches a borderless single ToolbarControlGroup
// button, the close a toolbar-composed dialog uses: a 40px circle with no
// border and the neutral hover fill.
test('the default dialog close control is a toolbar-sized circle', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=surface-scaffold');
  const demo = page.locator('[data-demo="surface-scaffold"]');
  await demo.getByRole('button', { name: 'Open Dialog' }).click();
  const dialog = page.locator('#catalog-medium-dialog');
  await expect(dialog).toHaveAttribute('open', '');
  const close = dialog.locator('.kui-dialog-surface__close');
  await expect(close).toHaveAccessibleName('Close');
  const geometry = () =>
    close.evaluate((button) => {
      const box = button.getBoundingClientRect();
      const style = window.getComputedStyle(button);
      return {
        width: box.width,
        height: box.height,
        radius: style.borderTopLeftRadius,
        border: style.borderTopWidth,
        background: style.backgroundColor,
      };
    });
  // The dialog scales in; measure once its show animation settles.
  await expect.poll(async () => Math.round((await geometry()).width)).toBe(40);
  const rest = await geometry();
  expect(rest.width).toBeCloseTo(40, 0);
  expect(rest.height).toBeCloseTo(40, 0);
  expect(rest.radius).toBe('50%');
  // No border (a native button with none, where Web Awesome's base kept a
  // transparent one).
  expect(rest.border).toBe('0px');
  const hoverFill = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = 'var(--kui-color-neutral-fill-normal)';
    document.body.append(probe);
    const color = window.getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  });
  await close.hover();
  await expect.poll(async () => (await geometry()).background).toBe(hoverFill);
  await page.keyboard.press('Escape');
});

/** The chat dialog example's panel, body, footer and transcript boxes. */
async function chatGeometry(page: Page) {
  return page.locator('#catalog-chat-dialog').evaluate((element) => {
    const rect = (node: Element) => {
      const box = node.getBoundingClientRect();
      return {
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        left: box.left,
        height: box.height,
      };
    };
    const panel = element;
    const body = element.querySelector('.kui-dialog-surface__body')!;
    const footer = element.querySelector('.kui-dialog-surface__footer')!;
    const banner = element.querySelector('[data-component="state-banner"]')!;
    const transcript = element.querySelector<HTMLElement>(
      '[data-demo-chat-transcript]',
    )!;
    return {
      panel: rect(panel),
      body: rect(body),
      bodyOverflow: window.getComputedStyle(body).overflowY,
      footer: rect(footer),
      footerBackground: window.getComputedStyle(footer).backgroundColor,
      footerPosition: window.getComputedStyle(footer).position,
      banner: rect(banner),
      bannerFlex: window.getComputedStyle(banner).flex,
      transcript: rect(transcript),
      transcriptOverflow: window.getComputedStyle(transcript).overflowY,
      scrollable: transcript.scrollHeight > transcript.clientHeight + 1,
      last: rect(transcript.lastElementChild!),
    };
  });
}

/** The footer's inline-start, inline-end and block-end offsets in the panel. */
function footerOffsets({
  footer,
  panel,
}: Awaited<ReturnType<typeof chatGeometry>>) {
  return [
    Math.round(footer.left - panel.left),
    Math.round(panel.right - footer.right),
    Math.round(panel.bottom - footer.bottom),
  ];
}

/**
 * How far the transcript's scrollport stops short of the body's block end.
 * The transcript opts into block-end `scrollClearance`, so the body stops
 * reserving the floating footer below it and it reaches the panel's end.
 */
function transcriptEndGap({
  body,
  transcript,
}: Awaited<ReturnType<typeof chatGeometry>>) {
  return Math.abs(Math.round(body.bottom - transcript.bottom));
}

/**
 * The space left between the transcript's last message and the floating
 * footer once scrolled to the end: the published footer clearance rests the
 * last message above the composer by the List's 8px control inset.
 */
function lastMessageClearance({
  footer,
  last,
}: Awaited<ReturnType<typeof chatGeometry>>) {
  return Math.round(footer.top - last.bottom);
}

/** Messages that pass beneath the floating footer inside the scrollport. */
async function messagesBeneathFooter(page: Page) {
  return page.locator('#catalog-chat-dialog').evaluate((element) => {
    const footer = element
      .querySelector('.kui-dialog-surface__footer')!
      .getBoundingClientRect();
    const transcript = element
      .querySelector('[data-demo-chat-transcript]')!
      .getBoundingClientRect();
    return [
      ...element.querySelectorAll('[data-demo-chat-transcript] > *'),
    ].filter((message) => {
      const box = message.getBoundingClientRect();
      return (
        box.bottom > footer.top + 1 &&
        box.top < footer.bottom &&
        box.top < transcript.bottom
      );
    }).length;
  });
}

async function scrollChatToEnd(page: Page) {
  await page
    .locator('#catalog-chat-dialog [data-demo-chat-transcript]')
    .evaluate((transcript) => {
      transcript.scrollTop = transcript.scrollHeight;
    });
}

test('a floating footer lies inset over the body while a fill-last transcript scrolls beneath it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=surface-scaffold');
  await page.getByRole('button', { name: 'Open Assistant' }).click();
  await expect(page.locator('#catalog-chat-dialog')).toHaveAttribute(
    'open',
    '',
  );
  await expect
    .poll(async () => Math.round((await chatGeometry(page)).panel.height))
    .toBe(560);
  const geometry = await chatGeometry(page);
  // The footer floats its 8px offset inside the panel's inline and block-end
  // edges on a transparent background, over the body's block end.
  expect(geometry.footerPosition).toBe('absolute');
  expect(geometry.footerBackground).toBe('rgba(0, 0, 0, 0)');
  expect(footerOffsets(geometry)).toEqual([8, 8, 8]);
  expect(geometry.footer.top).toBeLessThan(geometry.body.bottom);
  // The notice keeps its natural height; the transcript takes the rest and
  // owns the scrolling. It opts into block-end scrollClearance, so its
  // scrollport reaches the panel's end, beneath the floating footer.
  expect(geometry.bodyOverflow).toBe('hidden');
  expect(geometry.bannerFlex).toBe('0 0 auto');
  expect(geometry.transcriptOverflow).toBe('auto');
  expect(geometry.scrollable).toBe(true);
  expect(Math.round(geometry.transcript.top)).toBeGreaterThanOrEqual(
    Math.round(geometry.banner.bottom),
  );
  expect(transcriptEndGap(geometry)).toBe(0);
  expect(geometry.transcript.bottom).toBeGreaterThan(geometry.footer.bottom);

  // Mid-scroll, messages pass visibly beneath the transparent footer.
  await page
    .locator('#catalog-chat-dialog [data-demo-chat-transcript]')
    .evaluate((transcript) => {
      transcript.scrollTop =
        (transcript.scrollHeight - transcript.clientHeight) / 2;
    });
  expect(await messagesBeneathFooter(page)).toBeGreaterThan(0);

  // Scrolled to the end, the last message rests above the composer.
  await expect
    .poll(async () => {
      await scrollChatToEnd(page);
      return lastMessageClearance(await chatGeometry(page));
    })
    .toBe(8);

  // The clearance is scroll padding too: scrolling the last message into view
  // from the top brings it to rest above the composer, not beneath it.
  await page
    .locator('#catalog-chat-dialog [data-demo-chat-transcript]')
    .evaluate((transcript) => {
      transcript.scrollTop = 0;
      transcript.lastElementChild!.scrollIntoView({ block: 'end' });
    });
  const revealed = await chatGeometry(page);
  expect(revealed.last.bottom).toBeLessThanOrEqual(revealed.footer.top + 0.5);

  // A taller composer grows the measured clearance: a sent message still
  // comes to rest above it.
  await page
    .locator('#catalog-chat-dialog textarea[name="catalog-chat-message"]')
    .fill('First line\nSecond line\nThird line');
  await expect
    .poll(async () => (await chatGeometry(page)).footer.height)
    .toBeGreaterThan(geometry.footer.height);
  // The footer grows first; the measured clearance follows on the next
  // ResizeObserver delivery, so wait for it rather than sampling once.
  await expect
    .poll(async () => {
      await scrollChatToEnd(page);
      return lastMessageClearance(await chatGeometry(page));
    })
    .toBe(8);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(
    page.locator('#catalog-chat-dialog [data-demo-chat-transcript]'),
  ).toContainText('Noted. I will keep that in mind.');
  await expect
    .poll(async () => {
      const sent = await chatGeometry(page);
      return sent.last.bottom <= sent.footer.top + 0.5;
    })
    .toBe(true);

  // Without footerOffset the footer takes the 16px container inset, and the
  // published clearance follows it.
  await page
    .locator('#catalog-chat-dialog')
    .evaluate((element) =>
      element.style.removeProperty('--_kui-dialog-surface-footer-offset'),
    );
  await expect
    .poll(async () => footerOffsets(await chatGeometry(page)))
    .toEqual([16, 16, 16]);
  await expect
    .poll(async () => {
      await scrollChatToEnd(page);
      return lastMessageClearance(await chatGeometry(page));
    })
    .toBe(8);
  expect(transcriptEndGap(await chatGeometry(page))).toBe(0);
  await page.keyboard.press('Escape');
});

test('without scrollClearance a fill-last transcript ends at the floating footer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=surface-scaffold');
  await page.getByRole('button', { name: 'Open Assistant' }).click();
  await expect(page.locator('#catalog-chat-dialog')).toHaveAttribute(
    'open',
    '',
  );
  // Remove the opt-in: the body reserves the footer below the transcript
  // again, and the transcript's scrollport ends at the footer's top.
  await page
    .locator('#catalog-chat-dialog [data-demo-chat-transcript]')
    .evaluate((transcript) =>
      transcript.removeAttribute('data-scroll-clearance'),
    );
  await expect
    .poll(async () => {
      const geometry = await chatGeometry(page);
      return Math.round(geometry.footer.top - geometry.transcript.bottom);
    })
    .toBe(0);
  await page.keyboard.press('Escape');
});

test('a phone chat dialog floats its composer 8px from the panel edges', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=surface-scaffold');
  await page.getByRole('button', { name: 'Open Assistant' }).click();
  await expect(page.locator('#catalog-chat-dialog')).toHaveAttribute(
    'open',
    '',
  );
  await expect
    .poll(async () => footerOffsets(await chatGeometry(page)))
    .toEqual([8, 8, 8]);
  // The panel scales in; measure its edge once the show animation settles.
  await expect
    .poll(async () => Math.round((await chatGeometry(page)).panel.left))
    .toBe(8);
  // The transcript reaches the panel's end beneath the composer; the
  // published clearance follows the measured footer on a ResizeObserver
  // delivery after the dialog opens, so wait for it rather than sampling once.
  expect(transcriptEndGap(await chatGeometry(page))).toBe(0);
  await expect
    .poll(async () => {
      await scrollChatToEnd(page);
      return lastMessageClearance(await chatGeometry(page));
    })
    .toBe(8);
  await page.keyboard.press('Escape');
});

test('the chat dialog composer sends on Enter and keeps Shift+Enter newlines', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=surface-scaffold');
  await page.getByRole('button', { name: 'Open Assistant' }).click();
  const field = page.locator(
    '#catalog-chat-dialog textarea[name="catalog-chat-message"]',
  );
  const transcript = page.locator(
    '#catalog-chat-dialog [data-demo-chat-transcript]',
  );
  const messages = transcript.locator('.kui-content-item');
  const before = await messages.count();
  await field.focus();
  // An empty Enter sends nothing.
  await page.keyboard.press('Enter');
  await expect(field).toHaveValue('');
  await expect(messages).toHaveCount(before);
  // Shift+Enter keeps a newline; Enter sends through the Send action.
  await page.keyboard.type('Check the nightly');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('build log');
  await expect(field).toHaveValue('Check the nightly\nbuild log');
  await page.keyboard.press('Enter');
  await expect(messages).toHaveCount(before + 2);
  await expect(transcript).toContainText('Check the nightly');
  await expect(field).toHaveValue('');
  await expect(field).toBeFocused();
  await page.keyboard.press('Escape');
});

// The dialog corner is concentric with a pill ToolbarControlGroup (22px)
// resting at the body inset: 22 + 8 = 30px compact (and the default), 22 + 16
// = 38px comfortable.
test('the dialog corner is concentric with a toolbar group at the body inset', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=surface-scaffold');
  const demo = page.locator('[data-demo="surface-scaffold"]');
  await demo.getByRole('button', { name: 'Open Dialog' }).click();
  const dialog = page.locator('#catalog-medium-dialog');
  await expect(dialog).toHaveAttribute('open', '');
  const radius = () =>
    dialog.evaluate(
      (element) => window.getComputedStyle(element).borderTopLeftRadius,
    );
  const setInset = (inset: string | null) =>
    dialog.evaluate((element, value) => {
      if (value === null) element.removeAttribute('data-body-inset');
      else element.setAttribute('data-body-inset', value);
    }, inset);
  expect(await radius()).toBe('30px');
  await setInset('compact');
  expect(await radius()).toBe('30px');
  await setInset('comfortable');
  expect(await radius()).toBe('38px');
  // No body inset keeps the compact default. (There is no bare wa-dialog
  // case any more: the DialogSurface is the dialog.)
  await setInset('none');
  expect(await radius()).toBe('30px');
  await page.keyboard.press('Escape');
});
