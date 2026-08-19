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

test('prompt(): real focus lands in the field, typing + Enter resolves the entered string', async ({ page }) => {
  await page.evaluate(() => {
    const { prompt } = (window as any).kerfOverlay;
    (window as any)._result = prompt('Rename', { defaultValue: 'old' });
  });

  // Initial focus is the input (real browser focus, not a synthetic .focus()).
  expect(await page.evaluate(() => document.activeElement?.className ?? null)).toBe('kerf-prompt__input');

  // Select-all + retype, then submit with a real Enter keypress.
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('new name');
  await page.keyboard.press('Enter');

  const result = await page.evaluate(() => (window as any)._result);
  expect(result).toBe('new name');
  await expect(page.locator('.kerf-prompt')).toHaveCount(0); // closed
});

test('popover(): positions below a real anchor, left-aligned (real layout)', async ({ page }) => {
  await page.evaluate(() => {
    const anchor = document.createElement('button');
    anchor.id = 'pop-anchor';
    anchor.textContent = 'open';
    Object.assign(anchor.style, { position: 'absolute', left: '120px', top: '240px' });
    document.body.appendChild(anchor);
    const { popover } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    (window as any)._pop = popover(
      anchor,
      raw('<div class="pop-body" style="width:140px;height:48px">menu</div>'),
      { gap: 6 },
    );
  });

  const anchorBox = (await page.locator('#pop-anchor').boundingBox())!;
  const popBox = (await page.locator('.pop-body').boundingBox())!;
  // Below the anchor by ~gap, and left edges aligned (both within a couple px).
  expect(popBox.y).toBeGreaterThanOrEqual(anchorBox.y + anchorBox.height);
  expect(Math.abs(popBox.y - (anchorBox.y + anchorBox.height + 6))).toBeLessThan(2);
  expect(Math.abs(popBox.x - anchorBox.x)).toBeLessThan(2);
});

test('tooltip(): shows on real hover and hides on leave', async ({ page }) => {
  await page.evaluate(() => {
    const anchor = document.createElement('button');
    anchor.id = 'tip-anchor';
    anchor.textContent = 'hover me';
    Object.assign(anchor.style, { position: 'absolute', left: '150px', top: '150px' });
    document.body.appendChild(anchor);
    const spacer = document.createElement('div');
    spacer.id = 'away';
    Object.assign(spacer.style, { position: 'absolute', left: '0', top: '400px', width: '40px', height: '40px' });
    document.body.appendChild(spacer);
    const { tooltip } = (window as any).kerfOverlay;
    (window as any)._tipStop = tooltip(anchor, 'Hello', { delay: 0, hideDelay: 0 });
  });

  await page.locator('#tip-anchor').hover();
  await expect(page.locator('.kerf-tooltip')).toHaveText('Hello');
  await page.locator('#away').hover(); // move the pointer off the anchor
  await expect(page.locator('.kerf-tooltip')).toHaveCount(0);
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
