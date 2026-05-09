/**
 * KF-79 — IME composition state survival across kerf morphs.
 *
 * The focused-input branch in `src/diff.ts` handles `<input>` and
 * `<textarea>` value/selection preservation, but the existing happy-dom
 * test suite says nothing about composition events
 * (compositionstart/compositionupdate/compositionend). Real CJK input
 * passes through these events; if a parent re-render mid-composition
 * disrupts the input element, the user's in-progress text is lost.
 *
 * These tests synthesize composition events via `page.evaluate` and
 * `dispatchEvent` rather than driving a real IME (which Playwright can't
 * automate). The synthesis is a faithful approximation of what an IME
 * does — the same value updates, the same event sequence — but a real-CJK
 * smoke test by a human is still recommended before shipping any kerf
 * forms-heavy app to a CJK market.
 */

import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as unknown as { kerfReady: boolean }).kerfReady === true);
});

test('focused <input> value + cursor survive a parent morph mid-composition', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const tick = signal(0);
    // The signal read forces the parent's class to flip — that's our morph
    // trigger. The input itself is unchanged in JSX between renders.
    mount(root, () =>
      jsx('div', {
        className: tick.value ? 'after' : 'before',
        children: jsx('input', { type: 'text' }),
      }),
    );
    const inp = root.querySelector('input') as HTMLInputElement;
    inp.focus();

    // Pre-composition typed: "hello "
    inp.value = 'hello ';
    inp.setSelectionRange(6, 6);

    // Start composing — IME shows uncommitted "に".
    inp.dispatchEvent(new CompositionEvent('compositionstart', { data: '' }));
    inp.value = 'hello に';
    inp.setSelectionRange(7, 7);
    inp.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'に' }));

    // === Mid-composition: trigger a parent morph. ===
    tick.value = 1;
    // ===

    // After the morph, the input should still have the composing value
    // and the caret should still be at position 7.
    const inpAfter = root.querySelector('input') as HTMLInputElement;
    const sameNode = inp === inpAfter;
    const stillFocused = document.activeElement === inpAfter;
    const valueDuringMorph = inpAfter.value;
    const caret = inpAfter.selectionStart;

    // Finish composing: IME commits "煮" (just an example).
    inpAfter.value = 'hello 煮';
    inpAfter.dispatchEvent(new CompositionEvent('compositionend', { data: '煮' }));
    const finalValue = inpAfter.value;

    return { sameNode, stillFocused, valueDuringMorph, caret, finalValue };
  });

  expect(result.sameNode).toBe(true);
  expect(result.stillFocused).toBe(true);
  expect(result.valueDuringMorph).toBe('hello に');
  expect(result.caret).toBe(7);
  expect(result.finalValue).toBe('hello 煮');
});

test('focused <textarea> value + multi-line caret survive a parent morph mid-composition', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const tick = signal(0);
    mount(root, () =>
      jsx('div', {
        className: tick.value ? 'after' : 'before',
        children: jsx('textarea', { rows: 4 }),
      }),
    );
    const ta = root.querySelector('textarea') as HTMLTextAreaElement;
    ta.focus();
    ta.value = 'first line\n안녕하세';
    ta.setSelectionRange(15, 15);

    ta.dispatchEvent(new CompositionEvent('compositionstart', { data: '' }));
    ta.value = 'first line\n안녕하세요';  // composing 요
    ta.setSelectionRange(16, 16);
    ta.dispatchEvent(new CompositionEvent('compositionupdate', { data: '요' }));

    tick.value = 1;

    const taAfter = root.querySelector('textarea') as HTMLTextAreaElement;
    const sameNode = ta === taAfter;
    const stillFocused = document.activeElement === taAfter;
    const valueDuringMorph = taAfter.value;
    const caret = taAfter.selectionStart;
    return { sameNode, stillFocused, valueDuringMorph, caret };
  });

  expect(result.sameNode).toBe(true);
  expect(result.stillFocused).toBe(true);
  expect(result.valueDuringMorph).toBe('first line\n안녕하세요');
  expect(result.caret).toBe(16);
});

test('contenteditable mid-composition: subtree skipped (per docs §4.4)', async ({ page }) => {
  // For [contenteditable], kerf's docs guarantee the entire subtree is
  // skipped on morph (the heavy-handed approach). So composition state on
  // any descendant is preserved by the skip itself, not by the input-
  // specific value-copy path.
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const tick = signal(0);
    mount(root, () =>
      jsx('div', {
        className: tick.value ? 'after' : 'before',
        children: jsx('div', {
          contentEditable: true,
          children: 'placeholder',
        }),
      }),
    );
    const ce = root.querySelector('[contenteditable]') as HTMLElement;
    ce.focus();
    // Simulate user-built rich-text content: <span>typed</span><b>bold</b>
    ce.innerHTML = '<span>typed</span><b>bold</b>';
    ce.dispatchEvent(new CompositionEvent('compositionstart', { data: '' }));
    ce.innerHTML = '<span>typed</span><b>bold</b><i>composing</i>';
    ce.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'composing' }));

    tick.value = 1;

    const ceAfter = root.querySelector('[contenteditable]') as HTMLElement;
    return {
      sameNode: ce === ceAfter,
      stillFocused: document.activeElement === ceAfter,
      // Subtree should be byte-identical to what the user produced.
      innerHTML: ceAfter.innerHTML,
    };
  });

  expect(result.sameNode).toBe(true);
  expect(result.stillFocused).toBe(true);
  expect(result.innerHTML).toBe('<span>typed</span><b>bold</b><i>composing</i>');
});

test('compositionend after a morph that ran during compose still finalizes correctly', async ({ page }) => {
  // The composition end event should still fire, the final value should be
  // the committed text, and the input element identity should be preserved.
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const tick = signal(0);
    let endFired = false;
    mount(root, () =>
      jsx('div', {
        className: tick.value ? 'after' : 'before',
        children: jsx('input', { type: 'text' }),
      }),
    );
    const inp = root.querySelector('input') as HTMLInputElement;
    inp.addEventListener('compositionend', () => { endFired = true; });
    inp.focus();

    inp.dispatchEvent(new CompositionEvent('compositionstart', { data: '' }));
    inp.value = '中';
    inp.dispatchEvent(new CompositionEvent('compositionupdate', { data: '中' }));

    tick.value = 1;  // morph mid-composition
    tick.value = 2;  // and again

    const inpAfter = root.querySelector('input') as HTMLInputElement;
    inpAfter.value = '中国';
    inpAfter.dispatchEvent(new CompositionEvent('compositionend', { data: '中国' }));

    return { endFired, finalValue: inpAfter.value, sameNode: inp === inpAfter };
  });

  expect(result.sameNode).toBe(true);
  expect(result.endFired).toBe(true);
  expect(result.finalValue).toBe('中国');
});
