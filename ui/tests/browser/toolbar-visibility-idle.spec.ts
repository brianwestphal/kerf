import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function idleMutations(page: Page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const frame = () =>
      new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => resolve()),
      );
    for (let index = 0; index < 8; index++) await frame();
    const counts = { probeStyles: 0, geometryRedraws: 0 };
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        const target = record.target as Element;
        if (
          record.type === 'attributes' &&
          record.attributeName === 'style' &&
          target.closest('[data-toolbar-visibility-probe]')
        )
          counts.probeStyles++;
        if (
          record.type === 'childList' &&
          target.matches('[data-catalog-geometry-overlay]')
        )
          counts.geometryRedraws++;
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
      childList: true,
    });
    for (let index = 0; index < 8; index++) await frame();
    observer.disconnect();
    return counts;
  });
}

test('toolbar width probes and the production geometry overlay become idle after real transitions', async ({
  page,
  browserName,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/?component=toolbar');
  const specimen = page.locator('[data-demo-toolbar-width-visibility]');
  const toolbar = specimen.locator('[data-component="toolbar"]');
  const utility = specimen.getByRole('group', {
    name: 'Workspace utilities',
    includeHidden: true,
  });
  const overflow = specimen.getByRole('group', {
    name: 'More workspace actions',
    includeHidden: true,
  });
  await expect(utility).toBeVisible();
  await expect(overflow).toBeHidden();
  await expect(page.locator('[data-catalog-geometry-overlay]')).toBeVisible();
  await expect
    .poll(() => idleMutations(page))
    .toEqual({ probeStyles: 0, geometryRedraws: 0 });
  // A redraw owned by another observer must not keep changing measurement styles.
  await page
    .locator('[data-catalog-geometry-overlay]')
    .evaluate((layer) => layer.append(document.createElement('span')));
  await expect
    .poll(() => idleMutations(page))
    .toEqual({ probeStyles: 0, geometryRedraws: 0 });
  await utility.evaluate((node) => {
    node.dataset.hideBelow = 'var(--idle-cutoff)';
    node.style.setProperty('--idle-cutoff', '1000px');
    node.style.setProperty('--blank-token', ' ');
    node.style.setProperty('--quoted-token', '"two  spaces"');
  });
  await expect(utility).toBeHidden();
  await expect
    .poll(() => idleMutations(page))
    .toEqual({ probeStyles: 0, geometryRedraws: 0 });
  const context = await utility.evaluate((node) => {
    const probe = node
      .closest('[data-component="toolbar"]')!
      .querySelector<HTMLElement>('[data-toolbar-visibility-probe]')!;
    // Find this owner's copied context instead of relying on measurement order.
    const boxes = [
      ...node
        .closest('[data-component="toolbar"]')!
        .querySelectorAll<HTMLElement>('[data-toolbar-visibility-probe]'),
    ];
    const own =
      boxes.find((box) =>
        box.style.getPropertyValue('--quoted-token').includes('two'),
      ) ?? probe;
    const source = window.getComputedStyle(node);
    const copied = window.getComputedStyle(own);
    return {
      blankSource: source.getPropertyValue('--blank-token'),
      blankCopied: copied.getPropertyValue('--blank-token'),
      quotedSource: source.getPropertyValue('--quoted-token'),
      quotedCopied: copied.getPropertyValue('--quoted-token'),
    };
  });
  expect(context.blankCopied).toBe(context.blankSource);
  expect(context.quotedCopied).toBe(context.quotedSource);
  await utility.evaluate((node) =>
    node.style.setProperty('--idle-cutoff', '100px'),
  );
  await expect(utility).toBeVisible();
  await utility.evaluate((node) => node.style.removeProperty('--idle-cutoff'));
  await expect(utility).toBeVisible();
  await expect
    .poll(() => idleMutations(page))
    .toEqual({ probeStyles: 0, geometryRedraws: 0 });
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect(utility).toBeHidden();
  await expect(overflow).toBeVisible();
  await expect
    .poll(() => idleMutations(page))
    .toEqual({ probeStyles: 0, geometryRedraws: 0 });
  if (browserName === 'chromium')
    await toolbar.screenshot({
      path: testInfo.outputPath('toolbar-observer-idle-narrow.png'),
      animations: 'disabled',
      style: '[data-catalog-geometry-overlay] { visibility: hidden; }',
    });
  await toolbar.getByRole('button', { name: 'Refresh workspace' }).click();
  await expect(page.locator('.catalog-log')).toContainText(
    'Workspace refreshed',
  );
  await page.setViewportSize({ width: 1280, height: 1000 });
  await expect(utility).toBeVisible();
  await expect(overflow).toBeHidden();
  if (browserName === 'chromium') {
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await toolbar.screenshot({
      path: testInfo.outputPath('toolbar-observer-idle-wide.png'),
      animations: 'disabled',
      style: '[data-catalog-geometry-overlay] { visibility: hidden; }',
    });
  }
  await expect
    .poll(() => idleMutations(page))
    .toEqual({ probeStyles: 0, geometryRedraws: 0 });
});
