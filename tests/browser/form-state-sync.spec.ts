/**
 * Form-state property sync — the dirty-flag problem (KF-335).
 *
 * `morphAttributes` historically wrote *attributes* only. For form elements,
 * once the user (or script) has touched the control, the browser's
 * dirty-value / dirty-checked flag detaches the live property from the
 * attribute — the attribute becomes only the *default*. A controlled
 * `checked={sig.value}` / `value={sig.value}` / `selected={...}` then
 * updates the attribute while the visible state stays stale.
 *
 * The fix: whenever the morph (or a fine-grained binding write) actually
 * MUTATES a `checked` / `value` / `selected` attribute, it syncs the
 * corresponding property too. Attribute-unchanged elements are never
 * touched, so uncontrolled usage (JSX that never mentions the attribute)
 * keeps user state exactly as before — the same philosophy as the
 * user-agent-owned `open` carve-out on details/dialog.
 *
 * These need real engines: happy-dom does not model dirty flags truthfully.
 */

import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as unknown as { kerfReady: boolean }).kerfReady === true);
});

test('controlled checkbox re-checks after user uncheck (dirty-checked flag)', async ({ page }) => {
  // sig=true → user unchecks (property now dirty-false) → sig=false → sig=true.
  // The final render adds the `checked` attribute; the PROPERTY must follow,
  // or the box renders unchecked while app state says checked.
  const result = await page.evaluate(() => {
     
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const on = signal(true);
    mount(root, () =>
      jsx('div', { children: jsx('input', { type: 'checkbox', checked: on.value }) }));
    const box = root.querySelector('input') as HTMLInputElement;
    box.click();                       // user unchecks → dirty-checked, property false
    const afterClick = box.checked;
    on.value = false;                  // template drops the attribute
    on.value = true;                   // template re-adds the attribute
    return { afterClick, attr: box.hasAttribute('checked'), prop: box.checked };
  });
  expect(result.afterClick).toBe(false);
  expect(result.attr).toBe(true);
  expect(result.prop).toBe(true);      // ← the KF-335 assertion
});

test('controlled checkbox un-checks after user check (dirty-checked flag)', async ({ page }) => {
  // The mirror image: sig=false → user checks → sig=true → sig=false.
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const on = signal(false);
    mount(root, () =>
      jsx('div', { children: jsx('input', { type: 'checkbox', checked: on.value }) }));
    const box = root.querySelector('input') as HTMLInputElement;
    box.click();                       // user checks → dirty, property true
    on.value = true;                   // attr added (property already true)
    on.value = false;                  // attr removed → property must follow
    return { attr: box.hasAttribute('checked'), prop: box.checked };
  });
  expect(result.attr).toBe(false);
  expect(result.prop).toBe(false);
});

test('uncontrolled checkbox keeps user state across unrelated re-renders', async ({ page }) => {
  // JSX never mentions `checked` → the morph never mutates the attribute →
  // the property must be left alone. Guards the fix against over-reach.
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const label = signal('a');
    mount(root, () =>
      jsx('div', { children: [jsx('input', { type: 'checkbox' }), label.value] }));
    const box = root.querySelector('input') as HTMLInputElement;
    box.click();                       // user checks
    label.value = 'b';                 // unrelated surrounds change → morph runs
    return { prop: box.checked };
  });
  expect(result.prop).toBe(true);
});

test('controlled value updates a non-focused input the user typed into (dirty-value flag)', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const v = signal('initial');
    mount(root, () =>
      jsx('div', { children: jsx('input', { type: 'text', value: v.value }) }));
    const input = root.querySelector('input') as HTMLInputElement;
    input.value = 'typed';             // sets the dirty-value flag
    input.blur();                      // not focused → the focused-preservation rule does not apply
    v.value = 'from-signal';           // template changes the value attribute
    return { attr: input.getAttribute('value'), prop: input.value };
  });
  expect(result.attr).toBe('from-signal');
  expect(result.prop).toBe('from-signal');   // ← the KF-335 assertion
});

test('focused input keeps in-progress typing (preservation rule unchanged)', async ({ page }) => {
  // The existing focused-text-entry rule must win over the new sync: a
  // focused input's value is the user's in-progress edit, never clobbered.
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const v = signal('initial');
    const label = signal('a');
    mount(root, () =>
      jsx('div', { children: [jsx('input', { type: 'text', value: v.value }), label.value] }));
    const input = root.querySelector('input') as HTMLInputElement;
    input.focus();
    input.value = 'typing…';
    label.value = 'b';                 // unrelated change → morph runs while focused
    return { prop: input.value };
  });
  expect(result.prop).toBe('typing…');
});

test('controlled <select> follows selected= after the user picked another option', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const sel = signal('a');
    mount(root, () =>
      jsx('div', {
        children: jsx('select', {
          children: [
            jsx('option', { value: 'a', selected: sel.value === 'a', children: 'A' }),
            jsx('option', { value: 'b', selected: sel.value === 'b', children: 'B' }),
          ],
        }),
      }));
    const select = root.querySelector('select') as HTMLSelectElement;
    select.value = 'b';                // user picks B → dirtiness on the select
    select.dispatchEvent(new Event('change', { bubbles: true }));
    sel.value = 'b';                   // app state catches up (attrs now match user pick)
    sel.value = 'a';                   // controlled flip back → selection must follow
    return { value: select.value };
  });
  expect(result.value).toBe('a');      // ← the KF-335 assertion
});

test('controlled <textarea> follows template text after user typing (dirty-value flag)', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const v = signal('initial');
    mount(root, () =>
      jsx('div', { children: jsx('textarea', { children: v.value }) }));
    const ta = root.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'typed';                // sets the dirty-value flag
    ta.blur();
    v.value = 'from-signal';           // template text changes
    return { prop: ta.value };
  });
  expect(result.prop).toBe('from-signal');
});

test('uncontrolled-ish <textarea> keeps user typing across unrelated re-renders', async ({ page }) => {
  // Template text unchanged → no template-driven mutation → dirty value stays.
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const label = signal('a');
    mount(root, () =>
      jsx('div', { children: [jsx('textarea', { children: 'fixed' }), label.value] }));
    const ta = root.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'typed';
    ta.blur();
    label.value = 'b';                 // unrelated surrounds change → morph runs
    return { prop: ta.value };
  });
  expect(result.prop).toBe('typed');
});

test('fine-grained bound checked={sig} syncs the property too', async ({ page }) => {
  // The KF-294 bound path writes via setAttribute in its own effect,
  // bypassing the morph — it needs the same property sync.
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const on = signal(true);
    mount(root, () =>
      jsx('div', { children: jsx('input', { type: 'checkbox', checked: on }) }));
    const box = root.querySelector('input') as HTMLInputElement;
    box.click();                       // user unchecks → dirty
    on.value = false;                  // binding removes the attribute
    on.value = true;                   // binding re-adds it → property must follow
    return { attr: box.hasAttribute('checked'), prop: box.checked };
  });
  expect(result.attr).toBe(true);
  expect(result.prop).toBe(true);
});
