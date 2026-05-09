/**
 * KF-84 — uncontrolled state attributes survive morph re-renders.
 *
 * `<details open>` and `<dialog open>` are set/removed by the user agent in
 * response to user interaction. Treat them as user-agent-owned: don't remove
 * them in the morph's remove pass when the new template lacks them.
 *
 * These tests confirm the unit-level fix in `src/diff.ts:morphAttributes`
 * holds in real browsers (where `<details>` actually toggles `open` on
 * click — happy-dom does, but it's worth pinning the real-browser path too).
 */

import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as unknown as { kerfReady: boolean }).kerfReady === true);
});

test('<details open> set imperatively survives a morph (KF-84)', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const tick = signal(0);
    mount(root, () => {
      void tick.value;
      return jsx('details', { children: jsx('summary', { children: 'click' }) });
    });
    const det = root.querySelector('details') as HTMLDetailsElement;
    det.setAttribute('open', '');
    const before = det.hasAttribute('open');
    tick.value = 1;
    return { before, after: det.hasAttribute('open'), open: det.open };
  });
  expect(result.before).toBe(true);
  expect(result.after).toBe(true);
  expect(result.open).toBe(true);
});

test('<details open> via summary click survives a morph', async ({ page }) => {
  // The realistic path: the user clicks the summary, the browser sets `open`
  // on the live element, then a signal-driven re-render fires.
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const tick = signal(0);
    mount(root, () => {
      void tick.value;
      return jsx('details', { children: jsx('summary', { children: 'click me' }) });
    });
    const det = root.querySelector('details') as HTMLDetailsElement;
    const summary = root.querySelector('summary') as HTMLElement;
    summary.click();  // toggles `open` on the live element
    const afterClick = det.open;
    tick.value = 1;
    const afterMorph = det.open;
    return { afterClick, afterMorph };
  });
  expect(result.afterClick).toBe(true);
  expect(result.afterMorph).toBe(true);
});

test('<dialog open> survives a morph (KF-84)', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const tick = signal(0);
    mount(root, () => {
      void tick.value;
      return jsx('dialog', { children: 'hello' });
    });
    const dlg = root.querySelector('dialog') as HTMLDialogElement;
    dlg.setAttribute('open', '');
    tick.value = 1;
    return { hasOpen: dlg.hasAttribute('open'), open: dlg.open };
  });
  expect(result.hasOpen).toBe(true);
  expect(result.open).toBe(true);
});

test('control: arbitrary imperative attribute on a non-stateful element is still wiped on morph', async ({ page }) => {
  // Confirms the user-agent-owned exception is narrow.
  const result = await page.evaluate(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const tick = signal(0);
    mount(root, () => {
      void tick.value;
      return jsx('div', { children: 'x' });
    });
    const div = root.querySelector('div')!;
    div.setAttribute('data-foo', 'imperative');
    tick.value = 1;
    return { value: div.getAttribute('data-foo') };
  });
  expect(result.value).toBe(null);
});
