import { expect, test } from '@playwright/test';

// Swapping runs the push, leaves the hidden side inert and invisible once it
// settles, mirrors in RTL, and only fades under reduced motion.
test('ContentSwap pushes between sides and hides the inactive one', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=content-swap');
  const swap = page
    .locator('[data-demo="content-swap"] [data-component="content-swap"]')
    .first();
  await expect(swap).toHaveAttribute('role', 'region');
  await swap.getByRole('button', { name: 'Next' }).click();
  await expect(swap).toHaveAttribute('data-active-side', 'b');
  const running = await swap.evaluate((node) =>
    [...node.children].map(
      (side) => window.getComputedStyle(side).animationName,
    ),
  );
  expect(running).toEqual([
    'kui-content-swap-out-start',
    'kui-content-swap-in-end',
  ]);
  await swap.evaluate((node) =>
    Promise.all(
      node
        .getAnimations({ subtree: true })
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  const settled = await swap.evaluate((node) => {
    const hidden = node.querySelector<HTMLElement>('[data-side="a"]')!;
    return {
      inert: hidden.inert,
      ariaHidden: hidden.getAttribute('aria-hidden'),
      visibility: window.getComputedStyle(hidden).visibility,
    };
  });
  expect(settled).toEqual({
    inert: true,
    ariaHidden: 'true',
    visibility: 'hidden',
  });
  await expect(swap.getByRole('button', { name: 'Next' })).toHaveCount(0);
  await expect(swap.getByRole('button', { name: 'Back' })).toBeVisible();

  // RTL mirrors the slide: the incoming side starts on the left.
  await swap.getByRole('button', { name: 'Back' }).click();
  await swap.evaluate((node) =>
    Promise.all(
      node
        .getAnimations({ subtree: true })
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  // On the document: a re-render would drop an attribute set on the swap.
  await page.evaluate(() =>
    document.documentElement.setAttribute('dir', 'rtl'),
  );
  // Keep the final animation alive across Playwright's click/evaluate round
  // trips. On a busy Firefox runner the production 280ms animation can finish
  // before getAnimations() runs, hiding the direction this assertion checks.
  await page.addStyleTag({
    content:
      '[data-demo="content-swap"] .kui-content-swap__side { animation-duration: 10s !important; }',
  });
  await swap.getByRole('button', { name: 'Next' }).click();
  await expect
    .poll(() =>
      swap.evaluate((node) =>
        node
          .querySelector('[data-side="b"]')!
          .getAnimations()
          .some(
            (animation) =>
              (animation as CSSAnimation).animationName ===
              'kui-content-swap-in-end',
          ),
      ),
    )
    .toBe(true);
  const start = await swap.evaluate((node) => {
    const incoming = node.querySelector('[data-side="b"]')!;
    const animation = incoming
      .getAnimations()
      .find(
        (candidate) =>
          (candidate as CSSAnimation).animationName ===
          'kui-content-swap-in-end',
      )!;
    animation.pause();
    animation.currentTime = 0;
    return (
      incoming.getBoundingClientRect().left - node.getBoundingClientRect().left
    );
  });
  expect(start).toBeLessThan(0);
});

test('ContentSwap only fades under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?component=content-swap');
  const swap = page
    .locator('[data-demo="content-swap"] [data-component="content-swap"]')
    .first();
  await swap.getByRole('button', { name: 'Next' }).click();
  expect(
    await swap.evaluate((node) =>
      [...node.children].map(
        (side) => window.getComputedStyle(side).animationName,
      ),
    ),
  ).toEqual(['none', 'kui-content-swap-fade-in']);
});
