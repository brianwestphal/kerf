/**
 * Real-browser spec for `kerfjs/overlay`. Covers the behavior happy-dom can't
 * model truthfully: the focus TRAP (native Tab / Shift+Tab order + wrap-around),
 * focus restoration on close, and real outside-click dismissal — across
 * Chromium / Firefox / WebKit. The DOM-lifecycle + dismiss-trigger logic is
 * unit-tested in `tests/unit/overlay.test.ts`.
 */
import { expect, type Page,test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as unknown as { kerfReady: boolean }).kerfReady === true);
});

const activeId = (page: Page) =>
  page.evaluate(() => document.activeElement?.id ?? null);

test('focus trap: initial focus, Tab cycles + wraps within, Escape restores focus to the trigger', async ({ page }) => {
  await page.evaluate(() => {
    const trigger = document.createElement('button');
    trigger.id = 'trigger';
    trigger.textContent = 'open';
    document.body.appendChild(trigger);
    trigger.focus();
    const { overlay } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    (window as any)._ov = overlay(
      raw('<input id="a" /><input id="b" /><button id="c">c</button>'),
      { className: 'ov', initialFocus: '#a', trap: true, dismiss: ['escape'] },
    );
  });

  expect(await activeId(page)).toBe('a'); // initial focus
  await page.keyboard.press('Tab');
  expect(await activeId(page)).toBe('b');
  await page.keyboard.press('Tab');
  expect(await activeId(page)).toBe('c');
  await page.keyboard.press('Tab'); // wrap last -> first
  expect(await activeId(page)).toBe('a');
  await page.keyboard.press('Shift+Tab'); // wrap first -> last
  expect(await activeId(page)).toBe('c');

  await page.keyboard.press('Escape');
  await expect(page.locator('.ov')).toHaveCount(0);
  expect(await activeId(page)).toBe('trigger'); // focus restored on close
});

test('outside click dismisses a non-modal popover; content + an outsideIgnore trigger do not', async ({ page }) => {
  await page.evaluate(() => {
    const trigger = document.createElement('button');
    trigger.id = 'pop-trigger';
    trigger.textContent = 't';
    document.body.appendChild(trigger);
    const elsewhere = document.createElement('button');
    elsewhere.id = 'elsewhere';
    elsewhere.textContent = 'x';
    document.body.appendChild(elsewhere);
    const { overlay } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    (window as any)._ov = overlay(
      raw('<button id="pop-inner">x</button>'),
      { className: 'pop', dismiss: ['outside'], trap: false, outsideIgnore: trigger },
    );
  });

  await page.locator('#pop-inner').click(); // inside — stays
  await expect(page.locator('.pop')).toHaveCount(1);
  await page.locator('#pop-trigger').click(); // ignored — stays
  await expect(page.locator('.pop')).toHaveCount(1);
  await page.locator('#elsewhere').click(); // outside — dismiss
  await expect(page.locator('.pop')).toHaveCount(0);
});
