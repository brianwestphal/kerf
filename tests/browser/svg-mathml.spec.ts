/**
 * KF-83 — SVG / MathML namespacing in real browsers.
 *
 * happy-dom may forgive things real browsers don't (or vice versa). These
 * tests exercise the documented kerf paths against Chromium / Firefox /
 * WebKit:
 *
 *   - <svg> with <foreignObject> containing HTML
 *   - MathML interleaved with HTML
 *   - <use xlink:href="..."> namespaced attribute
 *   - SVG fragments routed through `toElement()`
 *   - SVG attribute updates through the diff (e.g. animating an `r` value)
 */

import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as unknown as { kerfReady: boolean }).kerfReady === true);
});

test('renders <svg> with correct namespace via mount() + JSX', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { mount } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    mount(root, () =>
      jsx('svg', {
        viewBox: '0 0 100 100',
        children: [
          jsx('circle', { cx: 50, cy: 50, r: 40, fill: 'blue' }),
          jsx('path', { d: 'M 0 50 L 100 50', stroke: 'red' }),
        ],
      }),
    );
    const svg = root.querySelector('svg')!;
    const circle = root.querySelector('circle')!;
    const path = root.querySelector('path')!;
    return {
      svgNS: svg.namespaceURI,
      circleNS: circle.namespaceURI,
      pathNS: path.namespaceURI,
      circleCx: circle.getAttribute('cx'),
      pathD: path.getAttribute('d'),
    };
  });
  expect(result.svgNS).toBe('http://www.w3.org/2000/svg');
  expect(result.circleNS).toBe('http://www.w3.org/2000/svg');
  expect(result.pathNS).toBe('http://www.w3.org/2000/svg');
  expect(result.circleCx).toBe('50');
  expect(result.pathD).toBe('M 0 50 L 100 50');
});

test('orphan SVG fragment via toElement() gets correct namespace', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { toElement } = (window as any).kerf;
    const path = toElement('<path d="M 0 0 L 10 10" />');
    return {
      ns: path.namespaceURI,
      tag: path.tagName,
      d: path.getAttribute('d'),
    };
  });
  expect(result.ns).toBe('http://www.w3.org/2000/svg');
  expect(result.tag.toLowerCase()).toBe('path');
  expect(result.d).toBe('M 0 0 L 10 10');
});

test('<svg> with <foreignObject> containing HTML — children are HTML namespace', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { mount } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    mount(root, () =>
      jsx('svg', {
        viewBox: '0 0 200 200',
        children: jsx('foreignObject', {
          x: 0, y: 0, width: 200, height: 200,
          children: jsx('div', { className: 'inner', children: 'html in svg' }),
        }),
      }),
    );
    const svg = root.querySelector('svg')!;
    const foreign = root.querySelector('foreignObject')!;
    const inner = root.querySelector('div.inner')!;
    return {
      svgNS: svg.namespaceURI,
      foreignNS: foreign.namespaceURI,
      innerNS: inner.namespaceURI,
      innerText: inner.textContent,
    };
  });
  expect(result.svgNS).toBe('http://www.w3.org/2000/svg');
  expect(result.foreignNS).toBe('http://www.w3.org/2000/svg');
  // foreignObject's HTML descendants should be in the HTML namespace.
  expect(result.innerNS).toBe('http://www.w3.org/1999/xhtml');
  expect(result.innerText).toBe('html in svg');
});

test('<use xlink:href="..."> via xlinkHref alias resolves correctly', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { mount } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    mount(root, () =>
      jsx('svg', {
        children: [
          jsx('defs', {
            children: jsx('symbol', { id: 'icon', viewBox: '0 0 10 10', children: jsx('rect', { width: 10, height: 10 }) }),
          }),
          jsx('use', { xlinkHref: '#icon' }),
        ],
      }),
    );
    const useEl = root.querySelector('use')!;
    return {
      ns: useEl.namespaceURI,
      // Both xlink:href (legacy SVG 1.1) and href (SVG 2) are valid.
      // The runtime serialized xlinkHref → xlink:href.
      xlinkAttr: useEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href'),
      hasOuter: useEl.outerHTML.includes('xlink:href') || useEl.outerHTML.includes('href'),
    };
  });
  expect(result.ns).toBe('http://www.w3.org/2000/svg');
  expect(result.hasOuter).toBe(true);
  expect(result.xlinkAttr).toBe('#icon');
});

test('SVG attribute updates flow through the diff (signal-driven r)', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const r = signal(10);
    mount(root, () => jsx('svg', { children: jsx('circle', { cx: 50, cy: 50, r: r.value, fill: 'blue' }) }));
    const before = root.querySelector('circle')!.getAttribute('r');
    r.value = 30;
    const after = root.querySelector('circle')!.getAttribute('r');
    const sameNode = root.querySelector('circle')!.namespaceURI;
    return { before, after, sameNode };
  });
  expect(result.before).toBe('10');
  expect(result.after).toBe('30');
  // After diff, the element retains its SVG namespace (no recreation as HTMLUnknownElement).
  expect(result.sameNode).toBe('http://www.w3.org/2000/svg');
});

test('MathML interleaved with HTML retains correct namespace', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { mount } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    // MathML inside an HTML mount root — the HTML5 parser switches modes for
    // <math>, similar to <svg>. First render inlines the tree into innerHTML,
    // so this static case was always correct; the each()-list case below is the
    // one KF-417 fixed (later parses re-entering foreign content).
    mount(root, () =>
      jsx('div', {
        children: jsx('math', {
          xmlns: 'http://www.w3.org/1998/Math/MathML',
          children: jsx('mrow', {
            children: [
              jsx('mn', { children: '1' }),
              jsx('mo', { children: '+' }),
              jsx('mn', { children: '1' }),
            ],
          }),
        }),
      }),
    );
    const math = root.querySelector('math');
    const mn = root.querySelector('mn');
    return {
      mathNS: math?.namespaceURI ?? null,
      mnNS: mn?.namespaceURI ?? null,
      hasMath: math !== null,
    };
  });
  expect(result.hasMath).toBe(true);
  // Real browsers parse <math> in HTML context as MathML namespace.
  expect(result.mathNS).toBe('http://www.w3.org/1998/Math/MathML');
  expect(result.mnNS).toBe('http://www.w3.org/1998/Math/MathML');
});

test('KF-417: MathML each() rows keep the namespace after a list update', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { mount, each, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const data = signal([{ id: 1 }]);
    mount(root, () =>
      jsx('div', {
        children: jsx('math', {
          children: each(
            data.value,
            (r: { id: number }) =>
              jsx('mrow', { 'data-key': String(r.id), children: jsx('mn', { children: String(r.id) }) }),
            { key: 'M' },
          ),
        }),
      }),
    );
    const MATHML = 'http://www.w3.org/1998/Math/MathML';
    const firstPaintOk = root.querySelector('[data-key="1"]')?.namespaceURI === MATHML;
    // A snapshot rebuild — the later parse that used to land rows in the HTML ns.
    data.value = [{ id: 1 }, { id: 2 }];
    return {
      firstPaintOk,
      row2NS: root.querySelector('[data-key="2"]')?.namespaceURI ?? null,
      mnNS: root.querySelector('[data-key="2"] mn')?.namespaceURI ?? null,
    };
  });
  expect(result.firstPaintOk).toBe(true);
  expect(result.row2NS).toBe('http://www.w3.org/1998/Math/MathML');
  expect(result.mnNS).toBe('http://www.w3.org/1998/Math/MathML');
});
