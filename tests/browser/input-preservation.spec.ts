/**
 * Real-browser spec for the input-under-morph guarantee (KF-462 / docs/4 §4.4):
 * a focused <input> / <textarea> / [contenteditable] keeps its value + caret
 * across (a) an unrelated signal re-render (morph) and (b) a keyed each() reorder
 * that MOVES the row containing the field. happy-dom can't model focus/caret
 * truthfully (it blurs on insertBefore — the reason list-reconcile-focus.ts
 * exists), so only a real engine proves this. Runs on Chromium / Firefox / WebKit.
 */
import { expect, test } from '@playwright/test';

 

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as unknown as { kerfReady: boolean }).kerfReady === true);
  // A list of three rows, each holding an <input>, a <textarea>, and a
  // [contenteditable], plus an unrelated counter that re-renders on its own.
  await page.evaluate(() => {
    const { mount, each, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);

    const tick = signal(0);
    const a = { id: 'a' };
    const b = { id: 'b' };
    const c = { id: 'c' };
    const rows = signal([a, b, c]);
    (window as any)._tick = tick;
    (window as any)._rows = rows;
    (window as any)._order = { a, b, c };

    mount(root, () =>
      jsx('div', {
        children: [
          jsx('span', { class: 'counter', children: tick.value }), // unrelated re-render
          jsx('ul', {
            children: each(
              rows.value,
              (r: any) =>
                jsx('li', {
                  'data-key': r.id,
                  children: [
                    jsx('input', { class: 'inp' }),
                    jsx('textarea', { class: 'ta' }),
                    jsx('div', { class: 'ce', contenteditable: 'true' }),
                  ],
                }),
              (r: any) => r.id,
            ),
          }),
        ],
      }),
    );
  });
});

test('focused <input> in a row keeps value + caret across an unrelated re-render and a keyed reorder', async ({ page }) => {
  const input = page.locator('li[data-key="b"] .inp');
  await input.click();
  await input.pressSequentially('hello');
  await input.evaluate((el: HTMLInputElement) => el.setSelectionRange(2, 4)); // "he[ll]o"

  const assertIntact = async () => {
    const live = page.locator('li[data-key="b"] .inp');
    expect(await live.inputValue()).toBe('hello');
    expect(await live.evaluate((el: HTMLInputElement) => el.selectionStart)).toBe(2);
    expect(await live.evaluate((el: HTMLInputElement) => el.selectionEnd)).toBe(4);
    expect(await live.evaluate((el) => document.activeElement === el)).toBe(true);
  };

  await page.evaluate(() => { (window as any)._tick.value++; }); // unrelated morph
  await assertIntact();

  await page.evaluate(() => { // keyed reorder — row b moves to the middle-of-a-reverse
    const { a, b, c } = (window as any)._order;
    (window as any)._rows.value = [c, b, a];
  });
  await assertIntact();
});

test('focused <textarea> in a moved row keeps its in-progress edit + caret', async ({ page }) => {
  const ta = page.locator('li[data-key="b"] .ta');
  await ta.click();
  await ta.pressSequentially('line one');
  await ta.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(4, 4)); // "line| one"

  await page.evaluate(() => { (window as any)._tick.value++; });
  await page.evaluate(() => {
    const { a, b, c } = (window as any)._order;
    (window as any)._rows.value = [c, b, a];
  });

  const live = page.locator('li[data-key="b"] .ta');
  expect(await live.inputValue()).toBe('line one');
  expect(await live.evaluate((el: HTMLTextAreaElement) => el.selectionStart)).toBe(4);
  expect(await live.evaluate((el) => document.activeElement === el)).toBe(true);
});

test('focused [contenteditable] in a moved row keeps its typed content + caret', async ({ page }) => {
  const ce = page.locator('li[data-key="b"] .ce');
  await ce.click();
  await ce.pressSequentially('rich text');

  await page.evaluate(() => { (window as any)._tick.value++; });
  await page.evaluate(() => {
    const { a, b, c } = (window as any)._order;
    (window as any)._rows.value = [c, b, a];
  });

  const live = page.locator('li[data-key="b"] .ce');
  expect((await live.textContent())?.trim()).toBe('rich text');
  expect(await live.evaluate((el) => document.activeElement === el)).toBe(true);
  // The caret is still inside the editable region (a collapsed selection within it).
  const caretInside = await live.evaluate((el) => {
    const sel = window.getSelection();
    return sel !== null && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).startContainer);
  });
  expect(caretInside).toBe(true);
});
