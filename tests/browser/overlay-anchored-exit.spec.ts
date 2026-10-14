/**
 * Real-browser spec for exit motion on the anchored surfaces (`popover()` /
 * `tooltip()` forwarding `exitClass` / `exitDuration`, docs/19 §19.10). Each
 * test installs a real CSS fade and checks what only an engine can show: the
 * exit class starts a running animation while the node lingers inert, removal
 * follows the animation's end, and a tooltip re-shown mid-exit never leaves
 * two nodes for one anchor.
 */
import { expect, test } from '@playwright/test';

const EXIT_MS = 1000;
const CAP_MS = 15000;

const RECIPE = `
body { margin: 0; font: 16px system-ui, sans-serif; }
#anchor { position: absolute; left: 40px; top: 120px; }
.kerf-popover, .kerf-tooltip { background: white; border: 1px solid #888; padding: 4px; }
@keyframes kerf-fade-out { to { opacity: 0; } }
.is-leaving { animation: kerf-fade-out ${EXIT_MS}ms linear forwards; }
`;

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(
    () => (window as unknown as { kerfReady: boolean }).kerfReady === true,
  );
  await page.addStyleTag({ content: RECIPE });
  await page.evaluate(() => {
    const anchor = document.createElement('button');
    anchor.id = 'anchor';
    anchor.textContent = 'anchor';
    document.body.append(anchor);
  });
});

test('popover(): close() plays a real CSS exit, then removal follows the animation', async ({
  page,
}) => {
  const during = await page.evaluate(
    ({ capMs }) => {
      const { popover } = (window as any).kerfOverlay;
      const { raw } = (window as any).jsxRuntime;
      const anchor = document.getElementById('anchor') as HTMLElement;
      const pop = popover(anchor, raw('<p>menu</p>'), {
        exitClass: 'is-leaving',
        exitDuration: capMs,
      });
      (window as any)._pop = pop;
      pop.close('picked');
      const animations = pop.el.getAnimations({ subtree: true });
      return {
        connected: pop.el.isConnected,
        inert: pop.el.inert,
        leaving: pop.el.classList.contains('is-leaving'),
        animations: animations.length,
      };
    },
    { capMs: CAP_MS },
  );
  expect(during).toMatchObject({
    connected: true,
    inert: true,
    leaving: true,
  });
  expect(during.animations).toBeGreaterThan(0);
  await expect(page.locator('.kerf-popover')).toHaveCount(0, {
    timeout: CAP_MS - 2000,
  });
  expect(await page.evaluate(async () => (window as any)._pop.result)).toBe(
    'picked',
  );
});

test('popover(): an outside click dismisses through the exit', async ({
  page,
}) => {
  await page.evaluate(
    ({ capMs }) => {
      const { popover } = (window as any).kerfOverlay;
      const { raw } = (window as any).jsxRuntime;
      const anchor = document.getElementById('anchor') as HTMLElement;
      (window as any)._dismissed = 0;
      popover(anchor, raw('<p>menu</p>'), {
        exitClass: 'is-leaving',
        exitDuration: capMs,
        onDismiss: () => (window as any)._dismissed++,
      });
    },
    { capMs: CAP_MS },
  );
  await page.mouse.click(300, 600);
  const leaving = page.locator('.kerf-popover.is-leaving');
  await expect(leaving).toHaveCount(1);
  expect(await page.evaluate(() => (window as any)._dismissed)).toBe(1);
  await expect(page.locator('.kerf-popover')).toHaveCount(0, {
    timeout: CAP_MS - 2000,
  });
});

test('tooltip(): the hide plays the exit; re-hovering mid-exit shows one fresh tooltip', async ({
  page,
}) => {
  await page.evaluate(
    ({ capMs }) => {
      const { tooltip } = (window as any).kerfOverlay;
      const anchor = document.getElementById('anchor') as HTMLElement;
      tooltip(anchor, 'tip', {
        delay: 0,
        hideDelay: 0,
        exitClass: 'is-leaving',
        exitDuration: capMs,
      });
    },
    { capMs: CAP_MS },
  );
  const anchor = page.locator('#anchor');
  const tips = page.locator('.kerf-tooltip');
  await anchor.hover();
  await expect(tips).toHaveCount(1);
  await page.mouse.move(300, 600);
  // The exit runs: one node, classed, still painted.
  await expect(page.locator('.kerf-tooltip.is-leaving')).toHaveCount(1);
  const mid = await page.evaluate(() => {
    const tip = document.querySelector('.kerf-tooltip') as HTMLElement;
    for (const animation of tip.getAnimations({ subtree: true })) {
      animation.pause(); // hold the exit so the re-hover lands mid-flight
    }
    (window as any)._first = tip;
    return {
      inert: tip.inert,
      animations: tip.getAnimations({ subtree: true }).length,
    };
  });
  expect(mid.inert).toBe(true);
  expect(mid.animations).toBeGreaterThan(0);

  await anchor.hover();
  await expect(page.locator('.kerf-tooltip:not(.is-leaving)')).toHaveCount(1);
  await expect(tips).toHaveCount(1);
  const fresh = await page.evaluate(() => ({
    firstGone: !((window as any)._first as HTMLElement).isConnected,
    inert: (document.querySelector('.kerf-tooltip') as HTMLElement).inert,
  }));
  expect(fresh).toEqual({ firstGone: true, inert: false });

  // Leaving again exits the fresh node, and removal follows the animation.
  await page.mouse.move(300, 600);
  await expect(page.locator('.kerf-tooltip.is-leaving')).toHaveCount(1);
  await expect(tips).toHaveCount(0, { timeout: CAP_MS - 2000 });
});

test('prefers-reduced-motion: reduce hides a tooltip at once', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    const { tooltip } = (window as any).kerfOverlay;
    const anchor = document.getElementById('anchor') as HTMLElement;
    tooltip(anchor, 'tip', {
      delay: 0,
      hideDelay: 0,
      exitClass: 'is-leaving',
      exitDuration: 15000,
    });
  });
  await page.locator('#anchor').hover();
  await expect(page.locator('.kerf-tooltip')).toHaveCount(1);
  await page.mouse.move(300, 600);
  await expect(page.locator('.kerf-tooltip')).toHaveCount(0);
  expect(await page.locator('.kerf-tooltip.is-leaving').count()).toBe(0);
});

for (const native of [false, true]) {
  const host = native ? 'native <dialog>' : 'plain';
  test(`a popover and a tooltip anchored inside an exiting ${host} overlay leave at its close()`, async ({
    page,
  }) => {
    const state = await page.evaluate(
      async ({ capMs, nativeHost }) => {
        const { overlay, popover, tooltip } = (window as any).kerfOverlay;
        const { raw } = (window as any).jsxRuntime;
        const modal = overlay(
          raw('<button id="menu">menu</button><button id="help">help</button>'),
          { native: nativeHost, exitClass: 'is-leaving', exitDuration: capMs },
        );
        const menu = document.getElementById('menu') as HTMLElement;
        const help = document.getElementById('help') as HTMLElement;
        const pop = popover(menu, raw('<p>items</p>'));
        tooltip(help, 'help text', { delay: 0 });
        help.dispatchEvent(new Event('pointerenter'));
        await new Promise((resolve) => setTimeout(resolve, 20));
        const before = {
          pop: pop.el.isConnected,
          tips: document.querySelectorAll('.kerf-tooltip').length,
        };
        modal.close();
        return {
          before,
          modalLingers: modal.el.isConnected,
          popGone: !pop.el.isConnected,
          tipsAfter: document.querySelectorAll('.kerf-tooltip').length,
        };
      },
      { capMs: CAP_MS, nativeHost: native },
    );
    expect(state).toEqual({
      before: { pop: true, tips: 1 },
      modalLingers: true,
      popGone: true,
      tipsAfter: 0,
    });
  });
}
