import type { Locator, Page } from '@playwright/test';

/**
 * Wait until every finite, running CSS animation and transition in the page
 * (shadow trees included) has finished, then let two more frames run so
 * resize and intersection observers report the settled layout.
 *
 * Use this instead of a fixed `waitForTimeout` after a state change that
 * animates (KF-BG83G7: replace browser-suite sleeps with state-based waits).
 * Infinite animations (spinners, shimmer) and paused ones are ignored. Check
 * each frame instead of awaiting `finished`: an animation can pause after it
 * was sampled, leaving that promise pending. Two consecutive quiet frames
 * catch a transition that starts after another one finishes.
 */
export async function animationsSettled(page: Page): Promise<void> {
  const settle = async (): Promise<void> => {
    const frame = (): Promise<void> =>
      new Promise((resolve) =>
        globalThis.requestAnimationFrame(() => resolve()),
      );
    const deadline = performance.now() + 10_000;
    let quietFrames = 0;
    while (quietFrames < 2) {
      await frame();
      const running = document.getAnimations().filter((animation) => {
        if (animation.playState !== 'running') return false;
        const end = animation.effect?.getComputedTiming().endTime;
        return typeof end === 'number' && Number.isFinite(end);
      });
      quietFrames = running.length === 0 ? quietFrames + 1 : 0;
      if (performance.now() > deadline)
        throw new Error('Finite animations did not settle within 10 seconds.');
    }
  };
  await page.evaluate(settle);
}

/**
 * Set a scroller's `scrollTop`, wait for the resulting `scroll` event (when
 * the position actually changed), then two frames so scroll-driven effects
 * have painted the new position.
 */
export async function scrollSettled(
  scroller: Locator,
  top: number,
): Promise<void> {
  await scroller.evaluate(async (element, value) => {
    const previous = element.scrollTop;
    const scrolled = new Promise<void>((resolve) =>
      element.addEventListener('scroll', () => resolve(), { once: true }),
    );
    element.scrollTop = value;
    if (element.scrollTop !== previous) await scrolled;
    for (let index = 0; index < 2; index++) {
      await new Promise<void>((resolve) =>
        globalThis.requestAnimationFrame(() => resolve()),
      );
    }
  }, top);
}

/**
 * Wait until a running finite view-transition animation has played at least
 * `ms`. A missing or completed animation must fail rather than yield a
 * pre-motion or final screenshot as supposed mid-motion evidence.
 */
export async function animationProgressed(
  page: Page,
  ms: number,
): Promise<void> {
  await page.waitForFunction(
    (minimum) => {
      const running = document.getAnimations().filter((animation) => {
        if (animation.playState !== 'running') return false;
        const effect = animation.effect as KeyframeEffect | null;
        const end = effect?.getComputedTiming().endTime;
        return (
          effect?.pseudoElement?.includes('view-transition') &&
          typeof end === 'number' &&
          Number.isFinite(end)
        );
      });
      return running.some((animation) => {
        const end = animation.effect?.getComputedTiming().endTime;
        const elapsed = Number(animation.currentTime);
        return typeof end === 'number' && elapsed >= minimum && elapsed < end;
      });
    },
    ms,
    { timeout: 5_000 },
  );
}

/**
 * Let a NavStack push/pop finish and its observers report: every running
 * animation done and the stack's timer-driven transition bookkeeping (chrome
 * cross-fade copies, the exiting view, the reveal and transition flags)
 * cleaned up.
 */
export async function navStackSettled(page: Page): Promise<void> {
  await animationsSettled(page);
  await page.waitForFunction(
    () =>
      document.querySelector(
        '[data-nav-chrome-transition], [data-nav-exiting], [data-nav-chrome-copy], [data-nav-revealed]',
      ) === null,
  );
  await animationsSettled(page);
}
