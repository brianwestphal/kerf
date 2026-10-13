import { expect, type Page, test } from '@playwright/test';

import { contrastRatio } from '../../evaluator/index.mjs';

// KF-REH2T2 floating DialogSurface header: `headerPresentation="floating"`
// lays the wa-dialog header over the body's block-start edge on the
// translucent raised chrome material. The register measures the header and
// publishes its height on the panel; the body reserves it, or, for a filling
// only child that opts into block-start `scrollClearance`, publishes it as
// `--kui-scroll-clearance-block-start` so the transcript scrolls visibly
// beneath both the title bar and the floating composer.

const DIALOG = '#catalog-thread-dialog';
const TRANSCRIPT = `${DIALOG} [data-demo-chat-transcript]`;

async function openThread(page: Page, width = 1280, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto('/?component=surface-scaffold');
  await page.getByRole('button', { name: 'Open Release Thread' }).click();
  await expect(page.locator(DIALOG)).toHaveAttribute('open', '');
  // The panel scales in; measure once the show animation settles.
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

/** The thread dialog's panel, header, body, footer and transcript geometry. */
async function threadGeometry(page: Page, scroll?: 'start' | 'middle' | 'end') {
  return page.locator(DIALOG).evaluate((element, position) => {
    const shadow = element.shadowRoot!;
    const transcript = element.querySelector<HTMLElement>(
      '[data-demo-chat-transcript]',
    )!;
    const max = transcript.scrollHeight - transcript.clientHeight;
    if (position === 'start') transcript.scrollTop = 0;
    if (position === 'middle') transcript.scrollTop = max / 2;
    if (position === 'end') transcript.scrollTop = max;
    const rect = (node: Element) => node.getBoundingClientRect();
    const panel = shadow.querySelector<HTMLElement>('[part~="dialog"]')!;
    const header = shadow.querySelector('[part~="header"]');
    const body = shadow.querySelector('[part~="body"]')!;
    const footer = shadow.querySelector('[part~="footer"]')!;
    const head = header ? rect(header) : undefined;
    const messages = [...transcript.children];
    return {
      panel: { top: rect(panel).top, bottom: rect(panel).bottom },
      header: head
        ? { top: head.top, bottom: head.bottom, height: head.height }
        : undefined,
      body: rect(body).top,
      bodyPaddingTop: parseFloat(globalThis.getComputedStyle(body).paddingTop),
      transcript: {
        top: rect(transcript).top,
        bottom: rect(transcript).bottom,
      },
      footer: { top: rect(footer).top },
      first: rect(messages[0]!).top,
      last: rect(messages.at(-1)!).bottom,
      beneathHeader: head
        ? messages.filter(
            (message) =>
              rect(message).top < head.bottom - 1 &&
              rect(message).bottom > head.top,
          ).length
        : 0,
      published: parseFloat(
        panel.style.getPropertyValue('--_kui-dialog-surface-header-block-size'),
      ),
      clearance: parseFloat(
        globalThis
          .getComputedStyle(transcript)
          .getPropertyValue('--kui-scroll-clearance-block-start'),
      ),
      scrollPaddingTop: parseFloat(
        globalThis.getComputedStyle(transcript).scrollPaddingTop,
      ),
    };
  }, scroll);
}

test('the transcript reaches beneath the floating title bar, and its first message rests below it', async ({
  page,
}) => {
  await openThread(page);
  const start = await threadGeometry(page, 'start');
  const header = start.header!;
  // The body and its filling transcript start at the panel's top, beneath
  // the header, which keeps its place at the top of the panel.
  expect(Math.round(header.top)).toBe(Math.round(start.panel.top));
  expect(Math.round(start.body)).toBe(Math.round(start.panel.top));
  expect(Math.round(start.transcript.top)).toBe(Math.round(start.panel.top));
  expect(start.bodyPaddingTop).toBe(0);
  // The measured header height is published and reaches the transcript as
  // its block-start clearance, in padding and in scroll padding.
  expect(start.published).toBeCloseTo(header.height, 1);
  expect(start.clearance).toBeCloseTo(header.height, 1);
  expect(start.scrollPaddingTop).toBeGreaterThanOrEqual(header.height - 0.5);
  // At rest the first message sits below the header by the List's 8px
  // control inset, never beneath it.
  expect(Math.round(start.first - header.bottom)).toBe(8);
  expect(start.beneathHeader).toBe(0);

  // Mid-scroll, messages pass visibly beneath the translucent title bar.
  const middle = await threadGeometry(page, 'middle');
  expect(middle.beneathHeader).toBeGreaterThan(0);

  // Scrolled to the end, the last message rests above the floating composer.
  const end = await threadGeometry(page, 'end');
  expect(end.last).toBeLessThanOrEqual(end.footer.top + 0.5);

  // Revealing the first message from the end rests it clear of the header.
  await page.locator(TRANSCRIPT).evaluate((transcript) => {
    transcript.scrollTop = transcript.scrollHeight;
    transcript.firstElementChild!.scrollIntoView({ block: 'start' });
  });
  const revealed = await threadGeometry(page);
  expect(revealed.first).toBeGreaterThanOrEqual(revealed.header!.bottom - 0.5);
  await page.keyboard.press('Escape');
});

test('the clearance follows the header as its text grows, and leaves with the header', async ({
  page,
}) => {
  await openThread(page, 390, 844);
  const before = await threadGeometry(page, 'start');
  // Larger text (a text-size setting scales the rem-based title bar).
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '24px';
  });
  await expect
    .poll(async () => (await threadGeometry(page, 'start')).header!.height)
    .toBeGreaterThan(before.header!.height);
  await expect
    .poll(async () => {
      const wrapped = await threadGeometry(page, 'start');
      return Math.round(wrapped.first - wrapped.header!.bottom);
    })
    // The List's control inset scales with the text too (0.5rem).
    .toBe(12);
  await page.evaluate(() => {
    document.documentElement.style.removeProperty('font-size');
  });

  // `without-header` removes the header part: the clearance is withdrawn and
  // the first message rests at the panel's top inset.
  await page
    .locator(DIALOG)
    .evaluate((element) => element.setAttribute('without-header', ''));
  await expect
    .poll(async () => {
      const bare = await threadGeometry(page, 'start');
      return [
        bare.header,
        Math.round(bare.first - bare.panel.top),
        Number.isNaN(bare.published),
      ];
    })
    .toEqual([undefined, 8, true]);
  // Rendered again, the new header part is measured and cleared.
  await page
    .locator(DIALOG)
    .evaluate((element) => element.removeAttribute('without-header'));
  await expect
    .poll(async () => {
      const restored = await threadGeometry(page, 'start');
      return Math.round(restored.first - restored.header!.bottom);
    })
    .toBe(8);
  await page.keyboard.press('Escape');
});

test('a flowing body reserves the floating header before its own inset', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=surface-scaffold');
  // The medium dialog flows its content; give it a compact inset too.
  await page.locator('#catalog-wa-dialog').evaluate((element) => {
    element.parentElement!.setAttribute('data-header-presentation', 'floating');
    element.parentElement!.setAttribute('data-body-inset', 'compact');
  });
  await page.getByRole('button', { name: 'Open Dialog', exact: true }).click();
  await expect(page.locator('#catalog-wa-dialog')).toHaveAttribute('open', '');
  await expect
    .poll(() =>
      page.locator('#catalog-wa-dialog').evaluate((element) => {
        const shadow = element.shadowRoot!;
        const header = shadow
          .querySelector('[part~="header"]')!
          .getBoundingClientRect();
        const body = shadow.querySelector('[part~="body"]')!;
        const style = globalThis.getComputedStyle(body);
        return {
          bodyStartsAtHeaderTop:
            Math.round(body.getBoundingClientRect().top) ===
            Math.round(header.top),
          padding: Math.round(parseFloat(style.paddingTop) - header.height),
          scrollPadding: Math.round(
            parseFloat(style.scrollPaddingTop) - header.height,
          ),
        };
      }),
    )
    .toEqual({ bodyStartsAtHeaderTop: true, padding: 8, scrollPadding: 0 });
  await page.keyboard.press('Escape');
});

/** The header's material and the title's contrast over a solid backdrop. */
async function material(
  page: Page,
  backdrop: string,
  textSelector = '.kui-toolbar-text__text',
) {
  const painted = await page.locator(DIALOG).evaluate(
    (element, [color, selector]) => {
      const header = element.shadowRoot!.querySelector('[part~="header"]')!;
      // The slotted label ToolbarText's title, or its description.
      const title = element.querySelector(
        `[slot="label"] ${selector}, [slot="label"]${selector}`,
      )!;
      const context = document
        .createElement('canvas')
        .getContext('2d', { willReadFrequently: true })!;
      context.canvas.width = 1;
      context.canvas.height = 1;
      const paint = (fill: string) => {
        context.fillStyle = fill;
        context.fillRect(0, 0, 1, 1);
      };
      const pixel = () => [
        ...context.getImageData(0, 0, 1, 1).data.slice(0, 3),
      ];
      const style = globalThis.getComputedStyle(header);
      const filter =
        style.backdropFilter ||
        (style as unknown as { webkitBackdropFilter?: string })
          .webkitBackdropFilter ||
        'none';
      context.clearRect(0, 0, 1, 1);
      paint(style.backgroundColor);
      const alpha = context.getImageData(0, 0, 1, 1).data[3]!;
      // Worst-case content passing beneath the header: a solid backdrop.
      context.clearRect(0, 0, 1, 1);
      paint(color);
      paint(style.backgroundColor);
      const background = pixel();
      paint(globalThis.getComputedStyle(title).color);
      return {
        background,
        foreground: pixel(),
        filter,
        alpha,
        edge: style.borderBottomWidth,
      };
    },
    [backdrop, textSelector] as const,
  );
  return {
    ...painted,
    contrast: contrastRatio(painted.foreground, painted.background)!,
  };
}

for (const [scheme, backdrop] of [
  ['light', 'black'],
  ['dark', 'white'],
] as const)
  test(`${scheme}: the translucent title bar keeps its ToolbarText title and description at AA over worst-case content`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await openThread(page);
    const result = await material(page, backdrop);
    // Translucent (80% opaque) and blurred.
    expect(result.alpha).toBeGreaterThan(195);
    expect(result.alpha).toBeLessThan(215);
    expect(result.filter).toContain('blur');
    expect(result.contrast).toBeGreaterThanOrEqual(4.5);
    // The slotted label's quiet description lifts halfway toward the normal
    // text color: AA, while still visibly quieter than the title.
    const description = await material(
      page,
      backdrop,
      '.kui-toolbar-text__description',
    );
    expect(description.contrast).toBeGreaterThanOrEqual(4.5);
    expect(description.contrast).toBeLessThan(result.contrast - 1);
    await page.keyboard.press('Escape');
  });

test('forced colors paints an opaque system surface with a visible edge', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'forced-colors emulation is Chromium-only',
  );
  await page.emulateMedia({ forcedColors: 'active' });
  await openThread(page);
  const result = await material(page, 'black');
  expect(result.alpha).toBe(255);
  expect(result.filter).toBe('none');
  expect(result.edge).toBe('1px');
  // The measured height includes the edge, so the first message still rests
  // below it.
  const start = await threadGeometry(page, 'start');
  expect(start.first).toBeGreaterThanOrEqual(start.header!.bottom);
  await page.keyboard.press('Escape');
});

test('reduced transparency and increased contrast resolve the title bar to the opaque raised surface', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'prefers-reduced-transparency emulation needs the Chromium DevTools protocol',
  );
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  });
  await openThread(page);
  const reduced = await material(page, 'black');
  expect(reduced.alpha).toBe(255);
  expect(reduced.filter).toBe('none');
  const start = await threadGeometry(page, 'start');
  expect(Math.round(start.first - start.header!.bottom)).toBe(8);

  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-contrast', value: 'more' }],
  });
  const contrast = await material(page, 'black');
  expect(contrast.alpha).toBe(255);
  expect(contrast.filter).toBe('none');
  await page.keyboard.press('Escape');
});
