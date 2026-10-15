import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// Web Awesome sets some attributes on its own hosts. kerf's morph removes
// host attributes a template omits, so anything the element sets only once
// (not re-derived on update) is lost for good on the next kerf re-render
// unless the Kerf template renders it. These tests bump a signal the mount
// reads (the template itself never changes) and check what survives.

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/wa-host-attributes.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

const reflectedDefaultsBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/wa-reflected-defaults.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

async function mountFixture(page: Page): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('Fixture emitted no JS/CSS');
  await page.setContent(
    '<!doctype html><html><body><div data-wa-host-attributes></div></body></html>',
  );
  await page.addStyleTag({
    content: css.text.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: javascript.text });
  await page.waitForFunction(() =>
    Boolean(
      customElements.get('wa-select') && customElements.get('wa-divider'),
    ),
  );
}

/** Bump the mount's signal (the template is unchanged) and let Lit settle. */
async function rerender(page: Page, times = 1): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await page.evaluate(() =>
      (window as unknown as { rerender(): void }).rerender(),
    );
    await page.evaluate(
      () =>
        new Promise((done) => window.requestAnimationFrame(() => done(null))),
    );
  }
}

test('a Select divider keeps its separator semantics across re-renders', async ({
  page,
}) => {
  await mountFixture(page);
  const divider = page.locator('wa-select[name="divided"] wa-divider');
  await expect(divider).toHaveCount(1);
  const semantics = () =>
    divider.evaluate((host) => ({
      role: host.getAttribute('role'),
      orientation: host.getAttribute('aria-orientation'),
    }));
  const expected = { role: 'separator', orientation: 'horizontal' };
  await expect.poll(semantics).toEqual(expected);

  await rerender(page);
  expect(await semantics()).toEqual(expected);
  await rerender(page, 2);
  expect(await semantics()).toEqual(expected);
  await expect(
    page
      .locator('wa-select[name="divided"]')
      .getByRole('separator', { includeHidden: true }),
  ).toHaveCount(1);
});

// Lit reflects each `reflect: true` default (wa-select size/appearance/
// placement, wa-divider orientation) onto its host. A
// template that omits them lets every re-render strip them, which nulls the
// property and forces a full Lit update to restore it. The templates render
// the defaults, so a no-op re-render leaves every Web Awesome host alone:
// no attribute record and no Lit update on any of them.
test('a no-op re-render churns no Web Awesome host attributes or updates', async ({
  page,
}) => {
  await mountFixture(page);
  const settle = () =>
    page.evaluate(async () => {
      await new Promise((done) => window.requestAnimationFrame(done));
      await Promise.all(
        [...document.querySelectorAll('[data-wa-host-attributes] *')]
          .filter((node) => node.localName.startsWith('wa-'))
          .map(
            (node) =>
              (node as HTMLElement & { updateComplete?: Promise<unknown> })
                .updateComplete,
          ),
      );
    });
  await settle();
  const hosts = await page.evaluate(() => {
    const root = document.querySelector('[data-wa-host-attributes]')!;
    const tracked = [...root.querySelectorAll('*')].filter((node) =>
      node.localName.startsWith('wa-'),
    );
    const log = {
      mutations: [] as string[],
      updates: [] as string[],
    };
    const describe = (node: Element) =>
      `${node.localName}${node.getAttribute('name') ? `[name=${node.getAttribute('name')}]` : ''}`;
    for (const node of tracked) {
      const host = node as HTMLElement & {
        update(changed: Map<PropertyKey, unknown>): void;
      };
      const original = host.update;
      host.update = function (changed) {
        log.updates.push(`${describe(node)} ${[...changed.keys()].join('+')}`);
        original.call(this, changed);
      };
    }
    new MutationObserver((records) => {
      for (const record of records) {
        const target = record.target as Element;
        const name = record.attributeName ?? '';
        // A wa-option's role / aria-selected / aria-disabled track live
        // state, so the template cannot render them; the morph strips them
        // and @kerfjs/ui/select/register restores them without a Lit update
        // (select-option-semantics.spec.ts owns that contract).
        const liveOptionSemantics =
          target.localName === 'wa-option' &&
          (name === 'role' || name.startsWith('aria-'));
        if (target.localName.startsWith('wa-') && !liveOptionSemantics)
          log.mutations.push(`${describe(target)} ${name}`);
      }
    }).observe(root, { attributes: true, subtree: true });
    Object.assign(window, { churn: log });
    return tracked.map((node) => node.localName);
  });
  // The fixture renders every Web Awesome host the templates own.
  expect(new Set(hosts)).toEqual(
    new Set(['wa-select', 'wa-option', 'wa-divider']),
  );
  const menuBefore = await page.evaluate(() => {
    const menu = document.querySelector('.kui-popup-menu')!;
    Object.assign(window, { menuNode: menu });
    return menu.outerHTML;
  });

  await rerender(page, 3);
  await settle();
  const churn = await page.evaluate(
    () => (window as unknown as { churn: unknown }).churn,
  );
  expect(churn).toEqual({ mutations: [], updates: [] });
  // The PopupMenu (Kerf-owned markup) is left exactly as it was, too.
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { menuNode: Element }).menuNode ===
        document.querySelector('.kui-popup-menu'),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.querySelector('.kui-popup-menu')!.outerHTML,
    ),
  ).toBe(menuBefore);
  expect(
    await page.evaluate(() =>
      document.querySelector('[data-renders]')?.getAttribute('data-renders'),
    ),
  ).toBe('3');
});

// kerf's morph removes an attribute a custom element's template omits only
// when the previous template rendered it, so the defaults Lit reflects onto a
// raw Web Awesome host survive re-renders even when the template never names
// them. Before, every re-render stripped them and Lit put them straight back:
// a flip and a Lit update per host per render (1,200 mutations for one row
// selection on a 300-row page).
test('re-renders leave reflected defaults on raw Web Awesome hosts alone', async ({
  page,
}) => {
  const result = await reflectedDefaultsBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  if (!javascript) throw new Error('Fixture emitted no JS');
  await page.setContent(
    '<!doctype html><html><body><div data-wa-reflected-defaults></div></body></html>',
  );
  await page.addScriptTag({ content: javascript.text });
  const settle = () =>
    page.evaluate(async () => {
      await new Promise((done) => window.requestAnimationFrame(done));
      await Promise.all(
        [...document.querySelectorAll('wa-tag, wa-badge, wa-button')].map(
          (node) =>
            (node as HTMLElement & { updateComplete?: Promise<unknown> })
              .updateComplete,
        ),
      );
    });
  await settle();
  const reflected = () =>
    page.evaluate(() => {
      const tag = document.querySelector('wa-tag')!;
      const button = document.querySelector('wa-button')!;
      return {
        tag: tag.getAttribute('variant'),
        button: button.getAttribute('variant'),
        badge: document.querySelector('wa-badge')!.getAttribute('attention'),
      };
    });
  // Lit reflected the defaults the template omits.
  const defaults = await reflected();
  expect(defaults.tag).not.toBeNull();
  expect(defaults.button).not.toBeNull();
  expect(defaults.badge).not.toBeNull();

  const select = async (id: number) => {
    await page.evaluate(
      (row) => (window as unknown as { select(id: number): void }).select(row),
      id,
    );
    await settle();
  };
  // No warm-up: kerf seeds each host's record of what its template rendered
  // when it creates the host, so the very first re-render already leaves the
  // reflected defaults alone.
  await page.evaluate(() => {
    const log: string[] = [];
    new MutationObserver((records) => {
      for (const record of records) {
        log.push(
          `${(record.target as Element).localName} ${record.attributeName ?? ''}`,
        );
      }
    }).observe(document.querySelector('[data-wa-reflected-defaults]')!, {
      attributes: true,
      subtree: true,
    });
    Object.assign(window, { churn: log });
  });
  for (const id of [2, 3, 0]) await select(id);
  const churn = await page.evaluate(
    () => (window as unknown as { churn: string[] }).churn,
  );
  // Only the rows whose selection changed were touched.
  expect(churn.every((entry) => entry === 'li data-selected')).toBe(true);
  expect(churn).toHaveLength(6);
  expect(await reflected()).toEqual(defaults);
});
