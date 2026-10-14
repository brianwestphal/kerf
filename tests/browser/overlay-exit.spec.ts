/**
 * Real-browser spec for `overlay()` exit motion (`exitClass` / `exitDuration`,
 * docs/19 §19.10). kerf ships no CSS, so each test installs the recipe from
 * `docs/8-api-reference.md` › `overlay` and checks what only a real engine can
 * show: the exit class starts a real CSS animation, the node stays painted
 * while it runs, the removal follows the animation's end (well before the
 * `exitDuration` cap), and everything else — the result, focus, the page's
 * interactivity, leaving the top layer — happened at close start. Reduced
 * motion skips the exit.
 */
import { expect, type Page, test } from '@playwright/test';

const EXIT_MS = 1000;
// Far beyond the exit, so a removal before it proves the animation early-out.
const CAP_MS = 15000;

const RECIPE = `
body { margin: 0; font: 16px system-ui, sans-serif; }
#under { position: fixed; left: 0; bottom: 0; width: 200px; height: 60px; }
div.kerf-overlay {
  position: fixed; inset: 0; display: flex;
  align-items: flex-end; justify-content: center;
  background: rgb(0 0 0 / 0.35);
}
div.kerf-overlay > .sheet,
dialog.kerf-overlay {
  box-sizing: border-box; inline-size: min(100%, 40rem);
  margin: 0; border: 0; padding: 16px; background: white;
}
dialog.kerf-overlay {
  position: fixed; inset: auto 0 0; margin-inline: auto;
}
@keyframes kerf-sheet-out { to { transform: translateY(100%); } }
@keyframes kerf-fade-out { to { opacity: 0; } }
div.kerf-overlay.is-leaving { animation: kerf-fade-out ${EXIT_MS}ms linear forwards; }
div.kerf-overlay.is-leaving > .sheet,
dialog.kerf-overlay.is-leaving {
  animation: kerf-sheet-out ${EXIT_MS}ms linear forwards;
}
/* A closed <dialog> is display: none; keep it painted for the exit. */
dialog.kerf-overlay.is-leaving { display: block; }
`;

interface ExitProbe {
  connected: boolean;
  tag: string;
  inert: boolean;
  open: boolean | null;
  display: string;
  leaving: boolean;
  focusedOpener: boolean;
  settled: boolean;
  animations: number;
}

async function setup(page: Page): Promise<void> {
  await page.addStyleTag({ content: RECIPE });
  await page.evaluate(() => {
    const opener = document.createElement('button');
    opener.id = 'opener';
    opener.textContent = 'open';
    const under = document.createElement('button');
    under.id = 'under';
    under.textContent = 'under';
    (window as any)._underClicks = 0;
    under.addEventListener('click', () => (window as any)._underClicks++);
    document.body.append(opener, under);
    opener.focus();
  });
}

async function openAndClose(page: Page, native: boolean): Promise<void> {
  await page.evaluate(
    ({ nativeHost, capMs, exitMs }) => {
      const { overlay } = (window as any).kerfOverlay;
      const { raw } = (window as any).jsxRuntime;
      const h = overlay(
        raw(
          nativeHost
            ? '<p>Sheet</p><button class="ok">OK</button>'
            : '<div class="sheet"><p>Sheet</p><button class="ok">OK</button></div>',
        ),
        { native: nativeHost, exitClass: 'is-leaving', exitDuration: capMs },
      );
      (window as any)._h = h;
      (window as any)._settled = false;
      h.result.then(() => ((window as any)._settled = true));
      // Let the open state paint before closing.
      return new Promise<void>((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => {
            (window as any)._closedAt = performance.now();
            h.close('done');
            // Freeze the exit half-way, so a loaded engine (or a slow
            // screenshot) samples it mid-flight; the test resumes it later.
            const animations = h.el.getAnimations({ subtree: true });
            for (const animation of animations) {
              animation.pause();
              animation.currentTime = exitMs / 2;
            }
            (window as any)._animations = animations;
            (window as any)._removedAt = null;
            (window as any)._finishedAt = null;
            void Promise.all(animations.map((a: Animation) => a.finished)).then(
              () => ((window as any)._finishedAt = performance.now()),
            );
            const parent = h.el.parentNode as Node | null;
            if (parent === null) (window as any)._removedAt = performance.now();
            else
              new MutationObserver((_records, observer) => {
                if (h.el.isConnected) return;
                (window as any)._removedAt = performance.now();
                observer.disconnect();
              }).observe(parent, { childList: true });
            resolve();
          }),
        ),
      );
    },
    { nativeHost: native, capMs: CAP_MS, exitMs: EXIT_MS },
  );
}

const probe = (page: Page): Promise<ExitProbe> =>
  page.evaluate(async () => {
    await Promise.resolve();
    const h = (window as any)._h;
    const el = h.el as HTMLElement;
    return {
      connected: el.isConnected,
      tag: el.tagName,
      inert: el.inert,
      open: el instanceof HTMLDialogElement ? el.open : null,
      display: window.getComputedStyle(el).display,
      leaving: el.classList.contains('is-leaving'),
      focusedOpener: document.activeElement?.id === 'opener',
      settled: (window as any)._settled === true,
      animations: el.isConnected
        ? el.getAnimations({ subtree: true }).length
        : 0,
    };
  });

const shot = async (page: Page, name: string): Promise<void> => {
  const dir = process.env.KERF_SHOT_DIR;
  if (dir !== undefined)
    await page.screenshot({
      path: `${dir}/${test.info().project.name}-${name}.png`,
    });
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(
    () => (window as unknown as { kerfReady: boolean }).kerfReady === true,
  );
  await setup(page);
});

for (const native of [false, true]) {
  const host = native ? 'native <dialog>' : 'plain <div>';

  test(`${host}: the exit animates while the node lingers, then removal follows the animation`, async ({
    page,
  }) => {
    await openAndClose(page, native);
    const during = await probe(page);
    expect(during.tag).toBe(native ? 'DIALOG' : 'DIV');
    // Everything observable happened at close start…
    expect(during.settled).toBe(true);
    expect(during.focusedOpener).toBe(true);
    expect(during.inert).toBe(true);
    if (native) expect(during.open).toBe(false); // left the top layer
    // …and only the node's removal waits on a real running animation.
    expect(during.connected).toBe(true);
    expect(during.leaving).toBe(true);
    expect(during.display).not.toBe('none');
    expect(during.animations).toBeGreaterThan(0);

    // Mid-exit (frozen half-way) the sheet is part-way down.
    await shot(page, `${native ? 'native' : 'plain'}-mid-exit`);
    const midY = await page.evaluate(() => {
      const el = (window as any)._h.el as HTMLElement;
      const sheet =
        el.tagName === 'DIALOG' ? el : (el.firstElementChild as HTMLElement);
      return new DOMMatrixReadOnly(window.getComputedStyle(sheet).transform)
        .m42;
    });
    expect(midY).toBeGreaterThan(0);

    // The page beneath is interactive during the exit (the wrapper is inert).
    const under = await page.locator('#under').boundingBox();
    if (under === null) throw new Error('no #under box');
    await page.mouse.click(under.x + 10, under.y + 10);
    expect(await page.evaluate(() => (window as any)._underClicks)).toBe(1);

    // A paused exit holds the node; resuming it lets removal follow the
    // animation's end, far ahead of the cap.
    const stillThere = await page.evaluate(() => {
      const connected = ((window as any)._h.el as HTMLElement).isConnected;
      (window as any)._resumedAt = performance.now();
      for (const animation of (window as any)._animations as Animation[])
        animation.play();
      return connected;
    });
    expect(stillThere).toBe(true);
    await page.waitForFunction(
      () => (window as any)._removedAt !== null,
      undefined,
      { timeout: CAP_MS },
    );
    const timing = await page.evaluate(() => ({
      afterResume: (window as any)._removedAt - (window as any)._resumedAt,
      afterFinish: (window as any)._removedAt - (window as any)._finishedAt,
      afterClose: (window as any)._removedAt - (window as any)._closedAt,
    }));
    expect(timing.afterResume).toBeGreaterThan(0);
    // Removed as the exit animations finished (same task), not before.
    expect(Math.abs(timing.afterFinish)).toBeLessThanOrEqual(2);
    expect(timing.afterClose).toBeLessThan(CAP_MS);
  });
}

test('prefers-reduced-motion: reduce skips the exit — the node goes at close()', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openAndClose(page, false);
  const after = await probe(page);
  expect(after.connected).toBe(false);
  expect(after.leaving).toBe(false);
  expect(after.settled).toBe(true);
  expect(after.focusedOpener).toBe(true);
});

test('confirm() with an exit: resolves on OK at once; a new overlay opened mid-exit owns Escape', async ({
  page,
}) => {
  const result = await page.evaluate(
    async ({ capMs }) => {
      const { confirm, overlay } = (window as any).kerfOverlay;
      const { raw } = (window as any).jsxRuntime;
      const answer = confirm('Discard?', {
        exitClass: 'is-leaving',
        exitDuration: capMs,
      });
      const leaving = document.querySelector('.kerf-overlay') as HTMLElement;
      (leaving.querySelector('[data-confirm="ok"]') as HTMLElement).click();
      const value = await answer;
      const stillThere = leaving.isConnected;
      let dismissed = 0;
      const next = overlay(raw('<button class="next">next</button>'), {
        onDismiss: () => dismissed++,
      });
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        }),
      );
      return {
        value,
        stillThere,
        dismissed,
        nextGone: !next.el.isConnected,
        focusedOpener: document.activeElement?.id === 'opener',
      };
    },
    { capMs: CAP_MS },
  );
  expect(result).toEqual({
    value: true,
    stillThere: true,
    dismissed: 1,
    nextGone: true,
    focusedOpener: true,
  });
});
