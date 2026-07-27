/**
 * Enumerated attributes vs boolean attributes, checked against real engines
 * (KF-436).
 *
 * `draggable`, `spellcheck`, and `contenteditable` look boolean and are not.
 * They take the strings `"true"` / `"false"`, and their missing-value default
 * is a third state — so the boolean-attribute rendering (`{true}` → bare name,
 * `{false}` → omitted) lands on the wrong state. The JSX types now reject
 * `boolean` for these three; these tests are the reason that rejection is
 * correct rather than pedantic.
 *
 * They need real engines. The unit suites can only assert the markup kerf
 * writes; whether that markup *means* what we claim is a parser + IDL question,
 * and happy-dom returns `undefined` for `spellcheck` and `contentEditable`
 * rather than modelling either. Chromium / Firefox / WebKit answer for real.
 */

import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as unknown as { kerfReady: boolean }).kerfReady === true);
});

test('draggable: the bare attribute does NOT enable dragging; "true" does', async ({ page }) => {
  const result = await page.evaluate(() => {
    const root = document.getElementById('root')!;
    // `draggable` alone is what `draggable={true}` used to render.
    root.innerHTML = '<div id="bare" draggable></div>'
      + '<div id="kw" draggable="true"></div>'
      + '<div id="none"></div>';
    const el = (id: string) => document.getElementById(id) as HTMLElement;
    return { bare: el('bare').draggable, keyword: el('kw').draggable, absent: el('none').draggable };
  });
  // The empty value is invalid for draggable, so it falls to the auto state —
  // indistinguishable from not writing the attribute at all.
  expect(result.bare).toBe(false);
  expect(result.absent).toBe(false);
  expect(result.keyword).toBe(true);
});

test('draggable: omitting the attribute does NOT disable dragging on an <img>', async ({ page }) => {
  const result = await page.evaluate(() => {
    const root = document.getElementById('root')!;
    // Omission is what `draggable={false}` rendered. For <img> and <a href>,
    // the auto state means draggable — so the disable never happened.
    root.innerHTML = '<img id="omitted" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="">'
      + '<img id="kw" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="" draggable="false">';
    const el = (id: string) => document.getElementById(id) as HTMLImageElement;
    return { omitted: el('omitted').draggable, keyword: el('kw').draggable };
  });
  expect(result.omitted).toBe(true);
  expect(result.keyword).toBe(false);
});

test('spellcheck: omitting the attribute does NOT turn spellchecking off', async ({ page }) => {
  const result = await page.evaluate(() => {
    const root = document.getElementById('root')!;
    root.innerHTML = '<textarea id="omitted"></textarea>'
      + '<textarea id="kw" spellcheck="false"></textarea>'
      + '<textarea id="bare" spellcheck></textarea>';
    const el = (id: string) => document.getElementById(id) as HTMLTextAreaElement;
    return { omitted: el('omitted').spellcheck, keyword: el('kw').spellcheck, bare: el('bare').spellcheck };
  });
  expect(result.omitted).toBe(true);
  expect(result.keyword).toBe(false);
  // The one asymmetry with draggable: the empty string IS a keyword for the
  // true state here, so `spellCheck={true}` happened to work. Only the disable
  // direction was broken — which is the direction people actually write.
  expect(result.bare).toBe(true);
});

test('contenteditable: omitting the attribute leaves a child of an editable region editable', async ({ page }) => {
  const result = await page.evaluate(() => {
    const root = document.getElementById('root')!;
    root.innerHTML = '<div contenteditable="true">'
      + '<span id="omitted">a</span>'
      + '<span id="kw" contenteditable="false">b</span>'
      + '</div>';
    const el = (id: string) => document.getElementById(id) as HTMLElement;
    return { omitted: el('omitted').isContentEditable, keyword: el('kw').isContentEditable };
  });
  // `contentEditable={false}` omitted the attribute, which means inherit —
  // so the span it was meant to lock stayed editable.
  expect(result.omitted).toBe(true);
  expect(result.keyword).toBe(false);
});

test('the kerf-authored keyword forms produce the intended state end to end', async ({ page }) => {
  const result = await page.evaluate(() => {

    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const locked = signal('true');
    mount(root, () =>
      jsx('div', {
        contentEditable: 'true',
        children: jsx('span', { id: 'row', draggable: 'true', spellcheck: locked.value, children: 'x' }),
      }));
    const span = document.getElementById('row') as HTMLElement;
    const before = { draggable: span.draggable, spellcheck: span.spellcheck };
    // A signal-valued enumerated attribute updates fine-grained and must land
    // on the keyword state, not a boolean one.
    locked.value = 'false';
    return { before, after: { draggable: span.draggable, spellcheck: span.spellcheck } };
  });
  expect(result.before).toEqual({ draggable: true, spellcheck: true });
  expect(result.after).toEqual({ draggable: true, spellcheck: false });
});
