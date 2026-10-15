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
  await page.waitForFunction(() => Boolean(customElements.get('kui-select')));
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
  // A Select draws its own separator rows, so the template renders their
  // semantics and nothing has to restore them after a morph.
  const separators = page
    .locator('kui-select[name="divided"]')
    .getByRole('separator', { includeHidden: true });
  await expect(separators).toHaveCount(1);
  const semantics = () =>
    separators.evaluate((node) => ({
      role: node.getAttribute('role'),
      className: node.className,
    }));
  const expected = { role: 'separator', className: 'kui-select__separator' };
  expect(await semantics()).toEqual(expected);

  await rerender(page);
  expect(await semantics()).toEqual(expected);
  await rerender(page, 2);
  expect(await semantics()).toEqual(expected);
  await expect(separators).toHaveCount(1);
});

// kerf's morph removes host attributes a template omits, so markup whose
// element sets its own attributes churns on every re-render (a strip and a
// restore per host). The Select and PopupMenu render Kerf-owned markup with
// no Web Awesome hosts, and the templates render every attribute they own, so
// a no-op re-render leaves both exactly as they were: no attribute record on
// any Select element, and the same nodes and markup afterward.
test('a no-op re-render churns no Select or PopupMenu attributes', async ({
  page,
}) => {
  await mountFixture(page);
  const settle = () =>
    page.evaluate(
      () => new Promise((done) => window.requestAnimationFrame(done)),
    );
  await settle();
  const before = await page.evaluate(() => {
    const root = document.querySelector('[data-wa-host-attributes]')!;
    const log: string[] = [];
    const describe = (node: Element) =>
      `${node.localName}${node.className ? `.${String(node.className).split(' ')[0]}` : ''}`;
    new MutationObserver((records) => {
      for (const record of records) {
        const target = record.target as Element;
        // The fixture's render counter is the one attribute that changes.
        if (record.attributeName === 'data-renders') continue;
        log.push(`${describe(target)} ${record.attributeName ?? ''}`);
      }
    }).observe(root, { attributes: true, subtree: true });
    const selects = [...root.querySelectorAll('kui-select')];
    const menu = root.querySelector('.kui-popup-menu')!;
    Object.assign(window, { churn: log, selectNodes: selects, menuNode: menu });
    return {
      // No Web Awesome host is left in either template.
      waHosts: [...root.querySelectorAll('*')]
        .map((node) => node.localName)
        .filter((name) => name.startsWith('wa-')),
      selects: selects.map((node) => node.outerHTML),
      menu: menu.outerHTML,
    };
  });
  expect(before.waHosts).toEqual([]);
  expect(before.selects).toHaveLength(2);

  await rerender(page, 3);
  await settle();
  const after = await page.evaluate(() => {
    const state = window as unknown as {
      churn: string[];
      selectNodes: Element[];
      menuNode: Element;
    };
    const selects = [...document.querySelectorAll('kui-select')];
    const menu = document.querySelector('.kui-popup-menu')!;
    return {
      churn: state.churn,
      sameSelects: selects.every(
        (node, index) => node === state.selectNodes[index],
      ),
      sameMenu: menu === state.menuNode,
      selects: selects.map((node) => node.outerHTML),
      menu: menu.outerHTML,
    };
  });
  expect(after.churn).toEqual([]);
  expect(after.sameSelects).toBe(true);
  expect(after.selects).toEqual(before.selects);
  // The PopupMenu (Kerf-owned markup) is left exactly as it was, too.
  expect(after.sameMenu).toBe(true);
  expect(after.menu).toBe(before.menu);
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
