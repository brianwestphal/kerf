/**
 * `kerfjs/html` tagged-template real-browser spec — the no-build-step
 * authoring path exercised exactly the way a CDN/importmap consumer would
 * use it: `dist/html.js` loaded via the fixture page's importmap, no JSX
 * transform, no bundler.
 *
 * Covers the headline flow end-to-end on all three engines: a mount whose
 * template mixes signal text + attribute holes (fine-grained bindings — no
 * render re-run) with an `each()` list hole (the keyed reconciler owns the
 * rows — node identity survives an append).
 */

import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as unknown as { kerfReady: boolean }).kerfReady === true);
});

test('html``: mount + fine-grained signal update + each() list, from dist via importmap', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { mount, signal, each } = (window as any).kerf;
    const html = (window as any).kerfHtml;
    const root = document.getElementById('root')!;

    const count = signal(0);
    const cls = signal('idle');
    const items = signal([{ id: 1, label: 'one' }, { id: 2, label: 'two' }]);
    let renders = 0;

    mount(root, () => {
      renders++;
      return html`<section id="app" class="${cls}">Count: ${count}<ul>${
        each(items.value, (i: { id: number; label: string }) =>
          html`<li data-key="${String(i.id)}">${i.label}</li>`)
      }</ul></section>`;
    });

    const app = root.querySelector('#app') as HTMLElement;
    const initial = {
      text: app.textContent,
      cls: app.getAttribute('class'),
      rows: root.querySelectorAll('li').length,
      renders,
    };

    // Fine-grained: signal text + attr updates must not re-run render.
    (root.querySelectorAll('li')[0] as HTMLElement).dataset.marked = 'yes';
    count.value = 42;
    cls.value = 'busy';
    const afterSignals = {
      text: (root.querySelector('#app') as HTMLElement).childNodes[1]?.textContent,
      containsCount: app.textContent!.includes('Count: 42'),
      cls: app.getAttribute('class'),
      renders,
    };

    // Coarse: append re-runs render; the keyed reconciler must reuse the
    // existing row nodes (the marked one keeps its marker).
    items.value = [...items.value, { id: 3, label: 'three' }];
    const lis = root.querySelectorAll('li');
    const afterAppend = {
      rows: lis.length,
      firstStillMarked: (lis[0] as HTMLElement).dataset.marked === 'yes',
      thirdLabel: lis[2].textContent,
      renders,
    };

    // Escaping: a hostile string hole stays text.
    const escaped = html`<p>${'<img src=x onerror=alert(1)>'}</p>`.toString();

    return { initial, afterSignals, afterAppend, escaped };
  });

  expect(result.initial.cls).toBe('idle');
  expect(result.initial.rows).toBe(2);
  expect(result.initial.renders).toBe(1);
  expect(result.initial.text).toContain('Count: 0');

  expect(result.afterSignals.containsCount).toBe(true);
  expect(result.afterSignals.cls).toBe('busy');
  expect(result.afterSignals.renders).toBe(1); // fine-grained — no re-render

  expect(result.afterAppend.rows).toBe(3);
  expect(result.afterAppend.firstStillMarked).toBe(true); // node identity preserved
  expect(result.afterAppend.thirdLabel).toBe('three');
  expect(result.afterAppend.renders).toBe(2); // one coarse re-render for the append

  expect(result.escaped).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>');
});
