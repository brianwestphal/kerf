/**
 * KF-305 / KF-313 / KF-316 — the raw HTML/SVG → DOM bridges are trusted-input
 * only. These pin the real-browser trust boundary the docs describe
 * (docs/7-svg § "Security", docs/8-api-reference § toElement/morph, docs/6 §6.4.3):
 *
 *   - `toElement()`'s HTML path parses through `<template>.innerHTML`, so a
 *     `<script>` in it is INERT — this is a genuine safety guarantee and the
 *     one behavior here we actively protect against regression.
 *   - `toElement()`'s SVG path (DOMParser image/svg+xml) does NOT strip a
 *     `<script>` — it survives the parse, which is why SVG input must be
 *     trusted (it executes once inserted live).
 *   - `<iframe srcdoc={string}>` re-parses its escaped value as a document, so
 *     it executes — the documented footgun (treat srcdoc like raw()).
 *
 * The point is the CONTRAST: the escaping pipeline (mount() + JSX) is safe;
 * these explicit bridges bypass it by design.
 */

import { expect, test } from '@playwright/test';

interface KerfGlobals {
  kerf: { toElement: (input: string | object) => Element };
  jsxRuntime: { jsx: (tag: string, props: Record<string, unknown>) => object };
  kerfReady: boolean;
  __htmlXss: boolean;
  __srcdocRan: boolean;
  __controlRan: boolean;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as unknown as KerfGlobals).kerfReady === true);
});

test('toElement() HTML-string <script> is inert (never executes)', async ({ page }) => {
  const result = await page.evaluate(() => {
    const w = window as unknown as KerfGlobals;
    w.__htmlXss = false;
    w.__controlRan = false;
    const el = w.kerf.toElement('<div><script>window.__htmlXss = true</script></div>');
    document.body.appendChild(el);
    // A positive control instead of a delay. Proving a script did NOT run is
    // the one thing you cannot poll for, and a fixed sleep only ever proves
    // "not yet" — on a slow machine it would pass while hiding a real
    // execution. An inline <script> appended the ordinary way executes
    // synchronously on insertion, so once the control's flag is set we know
    // scripts inserted in this turn have had their chance, with no timing
    // assumption at all.
    const control = document.createElement('script');
    control.textContent = 'window.__controlRan = true';
    document.body.appendChild(control);
    return { inert: w.__htmlXss, control: w.__controlRan };
  });
  expect(result.control, 'control script must execute, or the assertion below proves nothing')
    .toBe(true);
  expect(result.inert).toBe(false);
});

test('toElement() does NOT strip a <script> from SVG input (trusted-input surface)', async ({ page }) => {
  const hasScript = await page.evaluate(() => {
    const w = window as unknown as KerfGlobals;
    const svg = w.kerf.toElement(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>window.__svgXss = true</script></svg>',
    );
    // The script survives the DOMParser('image/svg+xml') parse — kerf does not
    // sanitize, so this is why SVG input must be trusted (it executes live).
    return svg.querySelector('script') !== null;
  });
  expect(hasScript).toBe(true);
});

test('<iframe srcdoc={string}> re-parses its value as a document and executes', async ({ page }) => {
  await page.evaluate(() => {
    const w = window as unknown as KerfGlobals;
    w.__srcdocRan = false;
    // renderAttr escapes the value (well-formed attribute), but the iframe
    // decodes it once and runs it as a document — the KF-313 footgun.
    const iframe = w.kerf.toElement(
      w.jsxRuntime.jsx('iframe', { srcDoc: '<script>parent.__srcdocRan = true</script>' }),
    );
    document.body.appendChild(iframe);
  });
  // Poll rather than sleep. The iframe's document has to be parsed and its
  // script run, which is work on another task queue with no bound we control —
  // a fixed delay makes a loaded machine (three engines in parallel, say) fail
  // a passing behavior. Polling costs latency there instead of a red build.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as KerfGlobals).__srcdocRan))
    .toBe(true);
});
