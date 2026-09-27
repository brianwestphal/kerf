import type { Locator } from '@playwright/test';

/**
 * Resolve once `target` has stopped moving: its viewport rect is unchanged
 * across `frames` consecutive animation frames.
 *
 * A wheel gesture scrolls instantly in some engines and animates in others
 * (WebKitGTK on Linux CI smooth-scrolls wheel input). Two `boundingBox()`
 * reads are separate round trips, so measuring a restore control against its
 * host while that animation is still running compares rects from different
 * scroll offsets and reports a corner inset that no frame ever rendered. Wait
 * for the scroll to finish, then measure the position a person actually sees.
 */
export async function waitForScrollSettled(
  target: Locator,
  frames = 5,
): Promise<void> {
  await target.evaluate(async (element, needed) => {
    const frame = () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          resolve();
        });
      });
    let last = element.getBoundingClientRect();
    let still = 0;
    while (still < needed) {
      await frame();
      const next = element.getBoundingClientRect();
      still = next.top === last.top && next.left === last.left ? still + 1 : 0;
      last = next;
    }
  }, frames);
}
