import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

/**
 * A placeholder may skeleton only its unknown values; nothing else may change.
 * The fixture renders every placeholder-capable component twice from identical
 * props — live and as a placeholder — and this test fingerprints every element
 * of each case (its rect relative to the case plus its computed chrome) and
 * diffs the two renders by structural path. Value slots, the elements that hold
 * a skeleton in the placeholder, are excluded with their subtrees; an element
 * present in only one render is a structural difference and fails.
 */
const bundleFixture = (webAwesome: boolean) =>
  build({
    entryPoints: [
      resolve(import.meta.dirname, 'fixtures/placeholder-chrome-cases.tsx'),
    ],
    bundle: true,
    format: 'iife',
    outdir: 'out',
    platform: 'browser',
    write: false,
    // The package marks select/register side-effect-free for consumers' tree
    // shaking; the fixture imports it only for its registration.
    ignoreAnnotations: true,
    loader: { '.woff2': 'empty', '.woff': 'empty', '.ttf': 'empty' },
    // Without Web Awesome's stylesheet nothing dims a native `button:disabled`,
    // so a component's own disabled tone is the only one left to observe.
    plugins: webAwesome
      ? []
      : [
          {
            name: 'omit-webawesome-css',
            setup(pluginBuild) {
              pluginBuild.onResolve(
                { filter: /^@kerfjs\/ui\/webawesome\.css$/ },
                () => ({ path: 'webawesome.css', namespace: 'omitted' }),
              );
              pluginBuild.onLoad(
                { filter: /.*/, namespace: 'omitted' },
                () => ({
                  contents: '',
                  loader: 'css',
                }),
              );
            },
          },
        ],
  });
const fixtureBundles = {
  withWebAwesome: bundleFixture(true),
  withoutWebAwesome: bundleFixture(false),
};

interface CaseRule {
  /**
   * The case's width follows a value (an inline root sized by its text, or a
   * count badge that pushes its neighbors): compare vertical geometry only.
   */
  block?: boolean;
  /** Compare only the case's own box (the placeholder is a different tree). */
  rootOnly?: boolean;
  /**
   * Elements whose styling legitimately differs: it carries a value (the
   * selected segment) or is a documented dormant-state affordance (a dormant
   * AppTab hides its disabled close button but keeps its geometry).
   */
  ignoreStyles?: readonly string[];
}

const RULES: Record<string, CaseRule> = {
  'toolbar-text': { block: true },
  'list-header-action': { block: true },
  'list-header-toggle': { block: true },
  // A trailing slot is a value, and its width moves the flexible label.
  'list-item-trailing': { block: true },
  'list-item-busy-trailing': { block: true },
  'app-tab': { block: true, ignoreStyles: ['.kui-app-tab__close'] },
  'app-tab-segmented': { block: true, ignoreStyles: ['.kui-app-tab__close'] },
  'state-banner': { block: true },
  'state-banner-no-detail': { block: true },
  'segmented-control-icons': {
    ignoreStyles: ['[data-segment-value="details"]'],
  },
  'segmented-control-text': {
    ignoreStyles: ['[data-segment-value="comfortable"]'],
  },
  'segmented-control-choice-disabled': {
    ignoreStyles: ['[data-segment-value="name"]'],
  },
  // The Select placeholder is a static box standing in for the live
  // wa-select's shadow tree; placeholder.spec.ts compares it part by part.
  select: { rootOnly: true },
};

const STYLE_PROPS = [
  'display',
  'visibility',
  'opacity',
  'color',
  'background-color',
  'box-shadow',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-transform',
  'border-top-width',
  'border-top-color',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-left-radius',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'min-height',
  // `cursor` is deliberately not compared: an inert placeholder shows the
  // default cursor where a live control shows a pointer (asserted below).
] as const;

async function mountFixture(page: Page, { webAwesome = true } = {}) {
  const result = await (webAwesome
    ? fixtureBundles.withWebAwesome
    : fixtureBundles.withoutWebAwesome);
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('Placeholder fixture emitted no JS');
  await page.setContent(
    '<!doctype html><html lang="en"><body><div class="kui-app-root" style="display:block;max-width:560px;height:auto" data-layout-cases></div><main class="kui-app-root" style="display:block;max-width:560px" data-placeholder-cases></main></body></html>',
  );
  // The fixture resolves package CSS from source, so apply the pixel-first
  // remify() authoring transform the package build performs.
  await page.addStyleTag({
    content: css.text.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: javascript.text });
  await page.evaluate(async () => {
    await customElements.whenDefined('wa-select');
    await Promise.all(
      [...document.querySelectorAll('wa-select')].map(
        (select) =>
          (select as HTMLElement & { updateComplete?: Promise<unknown> })
            .updateComplete,
      ),
    );
    await document.fonts.ready;
  });
}

type Fingerprint = Record<string, { rect: number[]; styles: string[] }>;

async function fingerprints(page: Page) {
  return page.evaluate(
    ({ rules, props }) => {
      const round = (n: number) => Math.round(n * 2) / 2;
      const read = (state: string) => {
        const out: Record<
          string,
          {
            fingerprint: Record<string, { rect: number[]; styles: string[] }>;
            slots: string[];
          }
        > = {};
        for (const wrapper of document.querySelectorAll<HTMLElement>(
          `[data-state="${state}"] > [data-case]`,
        )) {
          const name = wrapper.dataset.case!;
          const rule = rules[name] ?? {};
          const origin = wrapper.getBoundingClientRect();
          const ignoreStyles = (rule.ignoreStyles ?? []).flatMap((selector) => [
            ...wrapper.querySelectorAll(selector),
          ]);
          const fingerprint: Record<
            string,
            { rect: number[]; styles: string[] }
          > = {};
          const slots: string[] = [];
          const visit = (element: Element, path: string) => {
            const bounds = element.getBoundingClientRect();
            const rect = rule.block
              ? [round(bounds.top - origin.top), round(bounds.height)]
              : [
                  round(bounds.left - origin.left),
                  round(bounds.top - origin.top),
                  round(bounds.width),
                  round(bounds.height),
                ];
            const computed = window.getComputedStyle(element);
            const styled = !ignoreStyles.some((owner) =>
              owner.contains(element),
            );
            fingerprint[path] = {
              rect,
              styles: styled
                ? props.map((property) => computed.getPropertyValue(property))
                : [],
            };
            if (element.classList.contains('kui-skeleton')) {
              slots.push(path.slice(0, path.lastIndexOf('/')));
            }
            // An icon is compared as one box; its drawing is not chrome.
            if (rule.rootOnly || element.tagName.toLowerCase() === 'svg')
              return;
            [...element.children].forEach((child, index) => {
              visit(
                child,
                `${path}/${child.tagName.toLowerCase()}.${child.classList[0] ?? ''}[${String(index)}]`,
              );
            });
          };
          visit(wrapper, name);
          out[name] = { fingerprint, slots };
        }
        return out;
      };
      return { live: read('live'), placeholder: read('placeholder') };
    },
    { rules: RULES, props: STYLE_PROPS },
  );
}

/**
 * Every control an author disabled (the reserved `data-kui-disabled` marker)
 * is dimmed, live and as a placeholder, in every `*-disabled` case.
 */
async function expectAuthorDisabledDimmed(page: Page, caseNames: string[]) {
  const disabledTone = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-case$="-disabled"]')].map(
      (wrapper) => {
        const marked = [
          ...wrapper.querySelectorAll('[data-kui-disabled="true"]'),
        ];
        const dimmed =
          marked.length > 0 &&
          marked.every(
            (element) => Number(window.getComputedStyle(element).opacity) < 1,
          );
        return { name: wrapper.dataset.case!, dimmed };
      },
    ),
  );
  expect(disabledTone.length).toBe(
    2 * caseNames.filter((name) => name.endsWith('-disabled')).length,
  );
  expect(disabledTone.filter(({ dimmed }) => !dimmed)).toEqual([]);
}

for (const width of [1280, 390]) {
  test(`every placeholder matches its live component except in value slots (${String(width)}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await mountFixture(page);
    const { live, placeholder } = await fingerprints(page);
    expect(Object.keys(placeholder)).toEqual(Object.keys(live));

    const differences: string[] = [];
    for (const [name, { fingerprint, slots }] of Object.entries(placeholder)) {
      const other = live[name].fingerprint;
      // A value slot is excluded with its subtree, but never the case itself.
      const excluded = (path: string) =>
        slots.some(
          (slot) =>
            slot !== name && (path === slot || path.startsWith(`${slot}/`)),
        );
      const paths = new Set([
        ...Object.keys(fingerprint),
        ...Object.keys(other),
      ]);
      for (const path of paths) {
        if (excluded(path)) continue;
        const a: Fingerprint[string] | undefined = other[path];
        const b: Fingerprint[string] | undefined = fingerprint[path];
        if (!a || !b) {
          differences.push(
            `${path}: only in the ${a ? 'live' : 'placeholder'} render`,
          );
          continue;
        }
        if (JSON.stringify(a.rect) !== JSON.stringify(b.rect))
          differences.push(
            `${path}: rect live ${JSON.stringify(a.rect)} placeholder ${JSON.stringify(b.rect)}`,
          );
        a.styles.forEach((value, index) => {
          if (value !== b.styles[index])
            differences.push(
              `${path}: ${STYLE_PROPS[index]} live ${value} placeholder ${b.styles[index]}`,
            );
        });
      }
    }
    expect(differences).toEqual([]);

    // Component-owned chrome drawn from known props stays live even inside a
    // value slot the diff excludes: a busy spinner is not a value.
    const spinners = await page.evaluate(() =>
      Object.fromEntries(
        ['live', 'placeholder'].map((state) => [
          state,
          [
            ...document.querySelectorAll<HTMLElement>(
              `[data-state="${state}"] > [data-case]`,
            ),
          ].map(
            (wrapper) =>
              `${wrapper.dataset.case!}:${String(wrapper.querySelectorAll('.kui-loading-spinner').length)}`,
          ),
        ]),
      ),
    );
    expect(spinners.placeholder).toEqual(spinners.live);

    // An author-disabled control is dimmed in both renders: the diff above
    // proves the renders match, this proves neither lost the disabled tone.
    await expectAuthorDisabledDimmed(page, Object.keys(live));

    // Every case really rendered a placeholder, and none advertises `not-allowed`.
    expect(
      await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            '[data-state="placeholder"] > [data-case]',
          ),
        ]
          .filter(
            (wrapper) => !wrapper.querySelector('[data-placeholder="true"]'),
          )
          .map((wrapper) => (wrapper as HTMLElement).dataset.case),
      ),
    ).toEqual([]);
    expect(
      await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            '[data-state="placeholder"] [data-placeholder="true"], [data-state="placeholder"] [data-placeholder="true"] *',
          ),
        ]
          .filter(
            (element) =>
              window.getComputedStyle(element).cursor === 'not-allowed',
          )
          .map((element) => element.className),
      ),
    ).toEqual([]);
  });

  test(`a StateBanner placeholder's title line and badge match the live ones on any font (${String(width)}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await mountFixture(page);
    // Font-independent by construction: the title-only copy is exactly one
    // title line box, and the badge (a value slot the diff above excludes)
    // sits at the live badge's height. Platform font metrics once grew the
    // placeholder's copy line by a pixel where macOS showed no difference.
    const read = (state: string) =>
      page
        .locator(
          `[data-state="${state}"] > [data-case="state-banner-no-detail"]`,
        )
        .evaluate((wrapper) => {
          const banner = wrapper
            .querySelector('.kui-state-banner')!
            .getBoundingClientRect();
          const copy = wrapper.querySelector('.kui-state-banner__copy')!;
          const title = wrapper.querySelector(
            '.kui-state-banner__copy > strong',
          )!;
          const badge = wrapper
            .querySelector('.kui-state-banner__badge')!
            .getBoundingClientRect();
          return {
            copyHeight: copy.getBoundingClientRect().height,
            titleLineHeight: Number.parseFloat(
              window.getComputedStyle(title).lineHeight,
            ),
            badgeTop: badge.top - banner.top,
            badgeHeight: badge.height,
          };
        });
    const live = await read('live');
    const placeholder = await read('placeholder');
    expect(live.copyHeight).toBeCloseTo(live.titleLineHeight, 1);
    expect(placeholder.copyHeight).toBeCloseTo(placeholder.titleLineHeight, 1);
    expect(placeholder.badgeTop).toBeCloseTo(live.badgeTop, 1);
    expect(placeholder.badgeHeight).toBeCloseTo(live.badgeHeight, 1);
  });
}

test('hovering an interaction-revealed placeholder row reveals nothing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await mountFixture(page);
  const opacityOnHover = async (state: string) => {
    const row = page.locator(
      `[data-state="${state}"] > [data-case="list-action-row-interaction"] .kui-list-action-row`,
    );
    await row.hover();
    return row
      .locator('.kui-list-action-row__trailing-action')
      .evaluate((element) => window.getComputedStyle(element).opacity);
  };
  // The live row reveals its trailing action on hover; the inert placeholder
  // keeps the live resting state, hidden until an interaction it cannot take.
  expect(await opacityOnHover('live')).toBe('1');
  expect(await opacityOnHover('placeholder')).toBe('0');
});

test('author-disabled controls keep their own disabled tone without Web Awesome', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await mountFixture(page, { webAwesome: false });
  // Nothing native dims a disabled button here, so every dimmed control is
  // dimmed by its component, keyed on the data-kui-disabled marker.
  expect(
    await page.evaluate(() => {
      const probe = document.createElement('button');
      probe.disabled = true;
      document.body.append(probe);
      const opacity = window.getComputedStyle(probe).opacity;
      probe.remove();
      return opacity;
    }),
  ).toBe('1');
  const caseNames = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        '[data-state="live"] > [data-case]',
      ),
    ].map((wrapper) => wrapper.dataset.case!),
  );
  await expectAuthorDisabledDimmed(page, caseNames);

  // A disabled ListHeader toggle takes the action's tone and gives no hover
  // feedback, live or as a placeholder.
  for (const state of ['live', 'placeholder']) {
    const toggle = page.locator(
      `[data-state="${state}"] > [data-case="list-header-toggle-disabled"] .kui-list-header__toggle`,
    );
    await toggle.hover({ force: true });
    expect(
      await toggle.evaluate((element) => {
        const computed = window.getComputedStyle(element);
        return {
          opacity: computed.opacity,
          background: computed.backgroundColor,
        };
      }),
    ).toEqual({ opacity: '0.48', background: 'rgba(0, 0, 0, 0)' });
  }
});

for (const width of [1280, 390]) {
  test(`a long StateBanner title keeps its badge after its last word and the detail at full width (${String(width)}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await mountFixture(page);
    const layout = await page
      .locator('[data-layout-case="state-banner-long-title"]')
      .evaluate((wrapper) => {
        const copy = wrapper
          .querySelector('.kui-state-banner__copy')!
          .getBoundingClientRect();
        // The title text's own extent, not its box: a flex-shrunk title box
        // once ran past the text's line ends, leaving a gap before the badge.
        const range = document.createRange();
        range.selectNodeContents(
          wrapper.querySelector('.kui-state-banner__copy > strong')!,
        );
        const lines = [...range.getClientRects()];
        const titleLineTops = new Set(
          lines.map((line) => Math.round(line.top)),
        );
        const lastLine = lines[lines.length - 1];
        const badge = wrapper
          .querySelector('[data-component="badge"]')!
          .getBoundingClientRect();
        const detailElement = wrapper.querySelector<HTMLElement>(
          '.kui-state-banner__detail',
        )!;
        const detailText =
          detailElement.querySelector<HTMLElement>(':scope > span')!;
        const detail = detailElement.getBoundingClientRect();
        return {
          titleLineCount: titleLineTops.size,
          badgeGap: Math.round(badge.left - lastLine.right),
          badgeCenter: badge.top + badge.height / 2,
          lastLineTop: lastLine.top,
          lastLineBottom: lastLine.bottom,
          badgeWidth: Math.round(badge.width),
          detailTop: detail.top,
          detailLeftOffset: Math.round(detail.left - copy.left),
          detailWidth: Math.round(detail.width),
          copyWidth: Math.round(copy.width),
          detailTruncated: detailText.scrollWidth > detailText.clientWidth,
        };
      });
    // The badge follows the title's last word by one item gap, on that line,
    // sized to its content.
    expect(layout.badgeGap).toBe(8);
    expect(layout.badgeCenter).toBeGreaterThan(layout.lastLineTop);
    expect(layout.badgeCenter).toBeLessThan(layout.lastLineBottom);
    expect(layout.badgeWidth).toBeLessThanOrEqual(24);
    // The title wraps only when it cannot fit the copy column on its own.
    expect(layout.titleLineCount).toBe(width === 1280 ? 1 : 2);
    // Too long to sit beside the title, the detail takes its own line from
    // the copy's start instead of truncating in the space the title left: it
    // shows whole when it fits the copy width, and otherwise truncates at
    // that full width.
    expect(layout.detailTop).toBeGreaterThanOrEqual(layout.lastLineBottom - 1);
    expect(layout.detailLeftOffset).toBe(0);
    expect(layout.detailTruncated).toBe(width !== 1280);
    if (layout.detailTruncated) {
      expect(layout.detailWidth).toBe(layout.copyWidth);
    }
  });
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`a skeleton inside a solid badge contrasts with the badge fill in every tone (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await mountFixture(page);
    // The generic skeleton tint (12% of the text color) all but vanishes on
    // a saturated solid fill, so a StateBanner placeholder's badge looked
    // empty. Composite each skeleton over its badge fill and measure the
    // WCAG contrast between the two.
    const contrasts = await page.evaluate(() => {
      const tones = ['neutral', 'brand', 'pop', 'success', 'warning', 'danger'];
      const host = document.createElement('div');
      host.innerHTML = tones
        .map(
          (tone) =>
            `<span class="kui-badge" data-appearance="solid" data-size="compact" data-tone="${tone}"><span class="kui-skeleton"></span></span>`,
        )
        .join('');
      document.body.append(host);
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      const paint = (...colors: string[]) => {
        context.clearRect(0, 0, 1, 1);
        for (const color of colors) {
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
        }
        return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      };
      const luminance = (rgb: number[]) => {
        const [r, g, b] = rgb.map((channel) => {
          const value = channel / 255;
          return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const contrast = (a: number[], b: number[]) => {
        const [light, dark] = [luminance(a), luminance(b)].sort(
          (x, y) => y - x,
        );
        return (light + 0.05) / (dark + 0.05);
      };
      return Object.fromEntries(
        [...host.querySelectorAll('.kui-badge')].map((badge) => {
          const fill = window.getComputedStyle(badge).backgroundColor;
          const skeleton = window.getComputedStyle(
            badge.querySelector('.kui-skeleton')!,
          ).backgroundColor;
          return [
            (badge as HTMLElement).dataset.tone,
            Math.round(contrast(paint(fill), paint(fill, skeleton)) * 100) /
              100,
          ];
        }),
      );
    });
    for (const [tone, ratio] of Object.entries(contrasts)) {
      expect(ratio, `${tone} skeleton vs solid fill`).toBeGreaterThanOrEqual(
        1.4,
      );
    }
  });
}
