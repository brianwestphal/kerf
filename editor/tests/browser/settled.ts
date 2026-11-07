// Waits for the page to settle before a capture (KF-5MVBPB: replaces fixed
// 250ms sleeps): two animation frames, so a hover or selection change has
// rendered, then every finite animation and transition has finished.
import type { Page } from '@playwright/test';

export async function settled(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.waitForFunction(() =>
    globalThis.document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== 'running' ||
          animation.effect?.getTiming().iterations === Infinity,
      ),
  );
}
