import { expect, test } from '@playwright/test';

// A layout-free, pointer-inert edge strip: starting activity reveals the wave
// and the status pill without moving the page; reduced motion only fades.
for (const mode of ['normal', 'reduced', 'static'] as const) {
  test(`EdgeActivityIndicator shows activity without layout (${mode})`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({
      reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
    });
    await page.setViewportSize({ width: 1100, height: 700 });
    await page.goto('/?component=edge-activity-indicator');
    if (mode === 'static')
      await page.evaluate(() => {
        document.documentElement.dataset.kuiEffects = 'static';
      });
    const start = page.getByRole('button', { name: 'Start Activity' });
    const before = await start.boundingBox();
    await start.click();
    const host = page.locator('[data-component="edge-activity-indicator"]');
    await expect(host).toHaveAttribute('data-busy', 'true');
    await expect(
      page.getByRole('status').filter({ hasText: 'Syncing' }),
    ).toHaveText('Syncing 3 providers…');
    // The same control, now "Stop Activity", has not moved.
    const after = (await page
      .getByRole('button', { name: 'Stop Activity' })
      .boundingBox())!;
    expect([after.x, after.y]).toEqual([before!.x, before!.y]);
    // Let the scale-in transition finish.
    await expect
      .poll(() =>
        host.evaluate(
          (node) =>
            node
              .querySelector('.kui-edge-activity-indicator__strip')!
              .getBoundingClientRect().height,
        ),
      )
      .toBe(4);
    const strip = await host.evaluate((node) => {
      const element = node.querySelector<HTMLElement>(
        '.kui-edge-activity-indicator__strip',
      )!;
      const style = window.getComputedStyle(element);
      const wave = window.getComputedStyle(element, '::before');
      const box = element.getBoundingClientRect();
      return {
        top: box.top,
        height: box.height,
        hidden: element.getAttribute('aria-hidden'),
        pointer: window.getComputedStyle(node).pointerEvents,
        animation: style.animationName,
        mask: style.maskImage,
        waveDisplay: wave.display,
        waveRunning: wave.animationPlayState === 'running',
        hit: document
          .elementFromPoint(box.left + 10, 1)
          ?.closest('.kui-edge-activity-indicator'),
      };
    });
    expect(strip.top).toBe(0);
    expect(strip.height).toBe(4);
    expect(strip.hidden).toBe('true');
    expect(strip.pointer).toBe('none');
    expect(strip.hit).toBeFalsy();
    expect(strip.animation).toBe('none');
    expect(strip.mask).toContain('repeating-linear-gradient');
    if (mode === 'normal') {
      expect(strip.waveDisplay).toBe('block');
      expect(strip.waveRunning).toBe(true);
      const phases = await host
        .locator('.kui-edge-activity-indicator__strip')
        .evaluate(async (element) => {
          const wave = document
            .getAnimations()
            .find(
              (animation): animation is CSSAnimation =>
                animation instanceof CSSAnimation &&
                animation.animationName === 'kui-edge-activity-indicator-wave',
            )!;
          wave.pause();
          await wave.ready;
          return [225, 475].map((time) => {
            wave.currentTime = time;
            return {
              bars: window.getComputedStyle(element).maskPosition,
              wave: window.getComputedStyle(element, '::before').transform,
            };
          });
        });
      expect(phases[0].bars).toBe(phases[1].bars);
      expect(phases[0].wave).not.toBe(phases[1].wave);
      for (const width of [1100, 390]) {
        await page.setViewportSize({ width, height: 700 });
        await page.screenshot({
          clip: { x: 0, y: 0, width, height: 88 },
          path: testInfo.outputPath(`edge-wave-${width}.png`),
        });
      }
    } else {
      expect(strip.waveDisplay).toBe('none');
    }
    if (mode === 'static') {
      const children = host.locator(':scope > *');
      for (const width of [1100, 390]) {
        await page.setViewportSize({ width, height: 700 });
        for (const child of await children.all()) {
          await expect(child).toHaveCSS('transition-duration', '0s');
          await expect(child).toHaveCSS('opacity', '1');
        }
        await page.screenshot({
          path: testInfo.outputPath(`edge-static-${width}.png`),
        });
      }
    }
    await page.getByRole('button', { name: 'Stop Activity' }).click();
    await expect(host).toHaveAttribute('data-busy', 'false');
    if (mode === 'normal') {
      await expect
        .poll(() =>
          host.evaluate((node) => {
            const strip = node.querySelector(
              '.kui-edge-activity-indicator__strip',
            )!;
            return window.getComputedStyle(strip, '::before')
              .animationPlayState;
          }),
        )
        .toBe('paused');
    }
  });
}
