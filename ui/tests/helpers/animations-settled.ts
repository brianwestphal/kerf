import type { Locator, Page } from '@playwright/test';

/**
 * Wait until every finite, running CSS animation and transition in the page
 * (shadow trees included) has finished, then let two more frames run so
 * resize and intersection observers report the settled layout.
 *
 * Use this instead of a fixed `waitForTimeout` after a state change that
 * animates (KF-BG83G7: replace browser-suite sleeps with state-based waits).
 * Infinite animations (spinners, shimmer) and paused ones are ignored, so the
 * wait cannot hang on decoration. It loops because a finished transition can
 * start the next one (a pop that cross-fades after a slide).
 */
export async function animationsSettled(page: Page): Promise<void> {
  const settle = async (): Promise<void> => {
    const frame = (): Promise<void> =>
      new Promise((resolve) =>
        globalThis.requestAnimationFrame(() => resolve()),
      );
    // Two frames first: a transition triggered by the last style change is
    // only registered once the engine has computed the new style.
    await frame();
    await frame();
    for (let round = 0; round < 20; round++) {
      const running = document.getAnimations().filter((animation) => {
        if (animation.playState !== 'running') return false;
        const end = animation.effect?.getComputedTiming().endTime;
        return typeof end === 'number' && Number.isFinite(end);
      });
      if (running.length === 0) break;
      await Promise.all(
        running.map((animation) => animation.finished.catch(() => undefined)),
      );
      await frame();
    }
    await frame();
    await frame();
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
 * Wait until a running finite animation has played at least `ms`, or until
 * none is running. Use it to capture a mid-motion frame at a known point in
 * the motion instead of sleeping a fixed interval from the trigger.
 */
export async function animationProgressed(
  page: Page,
  ms: number,
): Promise<void> {
  await page.waitForFunction((minimum) => {
    const running = document.getAnimations().filter((animation) => {
      if (animation.playState !== 'running') return false;
      const end = animation.effect?.getComputedTiming().endTime;
      return typeof end === 'number' && Number.isFinite(end);
    });
    return (
      running.length === 0 ||
      running.some((animation) => Number(animation.currentTime) >= minimum)
    );
  }, ms);
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
