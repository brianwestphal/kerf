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
const fixtureBundle = build({
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
});

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

async function mountFixture(page: Page) {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('Placeholder fixture emitted no JS');
  await page.setContent(
    '<!doctype html><html lang="en"><body><main class="kui-app-root" style="display:block;max-width:560px" data-placeholder-cases></main></body></html>',
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
}
