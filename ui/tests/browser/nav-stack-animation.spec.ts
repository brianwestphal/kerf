import { expect, test } from '@playwright/test';

for (const width of [1100, 390]) {
  test(`navigation content and both chrome surfaces animate push/pop (${width}px)`, async ({
    page,
    browserName,
  }) => {
    await page.clock.install();
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=nav-stack');
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    const stack = page.locator('#catalog-nav-stack');
    // Keep CSS transitions inspectable even when a busy browser process delays
    // the next Playwright command; the controlled clock handles JS cleanup.
    await page.addStyleTag({
      content:
        '#catalog-nav-stack { --kui-nav-stack-transition-duration: 5000ms !important; }',
    });
    const inspect = async (action: 'push' | 'pop') => {
      await stack.evaluate((root, direction) => {
        (
          root.querySelector(
            direction === 'push' ? 'button[data-action]' : '[data-nav-back]',
          ) as HTMLElement
        ).click();
      }, action);
      await page.clock.runFor(100);
      const paints = await stack.evaluate((root, direction) => {
        const view = root.querySelector<HTMLElement>(
          direction === 'push'
            ? '[data-nav-key="project-atlas"]'
            : '[data-nav-exiting="true"]',
        )!;
        const current = [
          ...root.querySelectorAll<HTMLElement>(
            ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy]), :scope > [data-nav-stack-bottom]:not([data-nav-chrome-copy])',
          ),
        ];
        const copies = [
          ...root.querySelectorAll<HTMLElement>('[data-nav-chrome-copy]'),
        ];
        const animations = [view, ...current, ...copies].map((target) =>
          target.getAnimations(),
        );
        animations.flat().forEach((animation) => {
          animation.pause();
          animation.currentTime = 2500;
        });
        return {
          counts: animations.map((list) => list.length),
          x: new DOMMatrixReadOnly(window.getComputedStyle(view).transform).m41,
          width: view.offsetWidth,
          opacity: [...current, ...copies].map((element) =>
            Number(window.getComputedStyle(element).opacity),
          ),
          behind: window.getComputedStyle(
            root.querySelector('[data-nav-key="library"]')!,
          ).visibility,
          copyLabels: copies.map((element) => element.textContent),
          hiddenCopies: copies.every(
            (element) =>
              element.hasAttribute('inert') &&
              element.getAttribute('aria-hidden') === 'true',
          ),
        };
      }, action);
      expect(paints.counts).toEqual([1, 1, 1, 1, 1]);
      expect(paints.x).toBeGreaterThan(0);
      expect(paints.x).toBeLessThan(paints.width);
      expect(paints.behind).toBe('visible');
      expect(paints.hiddenCopies).toBe(true);
      paints.opacity.forEach((opacity) => {
        expect(opacity).toBeGreaterThan(0);
        expect(opacity).toBeLessThan(1);
      });
      expect(paints.copyLabels.join(' ')).toContain(
        action === 'push' ? '2 saved projects' : 'Updated just now',
      );
      if (browserName === 'chromium')
        await stack.screenshot({
          path: `test-results/nav-stack-${action}-midpoint-${width}.png`,
          animations: 'allow',
        });
      await stack.evaluate((root) =>
        root
          .getAnimations({ subtree: true })
          .forEach((animation) => animation.play()),
      );
      await page.clock.runFor(200);
      await expect(stack).not.toHaveAttribute(
        'data-nav-chrome-transition',
        'true',
      );
    };
    await inspect('push');
    await inspect('pop');
    await inspect('push');
    await expect(stack.locator('[data-nav-detail-focus]')).toBeFocused();
    if (browserName === 'chromium')
      await stack.screenshot({
        path: `test-results/nav-stack-detail-after-${width}.png`,
      });
    await inspect('pop');
    await expect(
      stack.locator(
        '[data-nav-chrome-copy], [data-nav-exiting], [data-nav-revealed]',
      ),
    ).toHaveCount(0);
  });
}

test('an immediate pop then re-push of the same key settles old mechanics', async ({
  page,
}) => {
  await page.goto('/?component=nav-stack');
  const stack = page.locator('#catalog-nav-stack');
  await stack.locator('button[data-action]').first().click();
  await expect(stack).not.toHaveAttribute('data-nav-chrome-transition', 'true');
  await stack.evaluate(async (root) => {
    (root.querySelector('[data-nav-back]') as HTMLElement).click();
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    (
      root.querySelector(
        '[data-nav-key="library"] button[data-action]',
      ) as HTMLElement
    ).click();
  });
  await expect(stack).toHaveAttribute('data-depth', '2');
  await expect(stack).not.toHaveAttribute('data-nav-chrome-transition', 'true');
  await expect(
    stack.locator(
      '[data-nav-chrome-copy], [data-nav-exiting], [data-nav-revealed]',
    ),
  ).toHaveCount(0);
  await expect(stack.locator('[data-nav-key="project-atlas"]')).toHaveCount(1);
  await expect(stack.locator('[data-nav-detail-focus]')).toBeFocused();
});

test('a click during a pop goes to the revealed view, not the one sliding out (KF-SBP2MV)', async ({
  page,
}) => {
  await page.goto('/?component=nav-stack');
  const stack = page.locator('#catalog-nav-stack');
  // A long pop keeps the outgoing view over the revealed one while clicking.
  await page.addStyleTag({
    content:
      '#catalog-nav-stack { --kui-nav-stack-transition-duration: 5000ms !important; }',
  });
  const push = stack.locator('[data-nav-key="library"] button[data-action]');
  await push.first().click();
  await expect(stack).toHaveAttribute('data-depth', '2');
  await stack.locator('[data-nav-back]').filter({ visible: true }).click();
  const exiting = stack.locator('[data-nav-exiting="true"]');
  await expect(exiting).toHaveAttribute('inert', '');
  // The revealed view's push button sits under the sliding view.
  const box = (await push.first().boundingBox())!;
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const hit = await page.evaluate(
    ({ x, y }) =>
      Boolean(
        document
          .elementFromPoint(x, y)
          ?.closest('[data-nav-key="library"]:not([data-nav-exiting])'),
      ),
    point,
  );
  expect(hit).toBe(true);
  await page.mouse.click(point.x, point.y);
  await expect(stack).toHaveAttribute('data-depth', '2');
});
