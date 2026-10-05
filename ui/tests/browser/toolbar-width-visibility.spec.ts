import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/toolbar-width-visibility.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

test('measurement probes survive frequent app renders and observer feedback while controls remain responsive', async ({
  page,
}, testInfo) => {
  const bundle = await fixtureBundle;
  await page.setViewportSize({ width: 800, height: 400 });
  await page.setContent(
    '<!doctype html><html><body><div data-fixture-root></div></body></html>',
  );
  await page.addStyleTag({
    content: bundle.outputFiles
      .find((file) => file.path.endsWith('.css'))!
      .text.replace(
        /remify\(([\d.]+)px\)/g,
        (_, pixels: string) => `${Number(pixels) / 16}rem`,
      ),
  });
  await page.addScriptTag({
    content: bundle.outputFiles.find((file) => file.path.endsWith('.js'))!.text,
  });
  const utility = page.getByRole('group', {
    name: 'Utilities',
    includeHidden: true,
  });
  await expect(utility).toBeVisible();
  const feedback = await page.evaluate(async () => {
    const root = document.querySelector('[data-fixture-root]')!;
    const render = root.querySelector<HTMLButtonElement>('[data-rerender]')!;
    const probes = [
      ...root.querySelectorAll('[data-toolbar-visibility-probe]'),
    ];
    let observerRenders = 0;
    const observer = new MutationObserver((records) => {
      if (
        records.some((record) =>
          [...record.addedNodes, ...record.removedNodes].some(
            (node) =>
              node.nodeType === 1 &&
              (node as Element).hasAttribute('data-toolbar-visibility-probe'),
          ),
        ) &&
        observerRenders < 12
      ) {
        observerRenders++;
        render.click();
      }
    });
    observer.observe(root, { subtree: true, childList: true });
    try {
      for (let index = 0; index < 20; index++) {
        render.click();
        await new Promise<void>((resolve) =>
          window.requestAnimationFrame(() => resolve()),
        );
      }
      return {
        observerRenders,
        stable: probes.every((probe) => probe.isConnected),
        count: root.querySelectorAll('[data-toolbar-visibility-probe]').length,
        originalCount: probes.length,
      };
    } finally {
      observer.disconnect();
    }
  });
  expect(feedback.observerRenders).toBe(0);
  expect(feedback.stable).toBe(true);
  expect(feedback.count).toBe(feedback.originalCount);
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.locator('output')).toHaveText('filter');
  await page.screenshot({
    path: testInfo.outputPath('toolbar-frequent-renders-wide.png'),
  });
  await page
    .locator('[data-test-toolbar-host]')
    .evaluate((node) =>
      node.ownerDocument.documentElement.style.setProperty(
        '--fixture-width',
        '300px',
      ),
    );
  await expect(utility).toBeHidden();
  const immediateVisibility = await page.evaluate(() => {
    const root = document.querySelector('[data-fixture-root]')!;
    root.querySelector<HTMLButtonElement>('[data-rerender]')!.click();
    const group = root.querySelector(
      '[data-component="toolbar-control-group"][aria-label="Utilities"]',
    )!;
    const status = root.querySelector(
      '.kui-toolbar-control-group__busy-status',
    )!;
    return {
      group: window.getComputedStyle(group).display,
      status: window.getComputedStyle(status).display,
    };
  });
  expect(immediateVisibility).toEqual({ group: 'none', status: 'none' });
  const more = page.getByRole('button', { name: 'More', exact: true });
  await more.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('output')).toHaveText('more');
  await page.getByRole('button', { name: 'Render again' }).click();
  await expect(more).toBeVisible();
  await more.click();
  await expect(page.locator('output')).toHaveText('more');
  await page.screenshot({
    path: testInfo.outputPath('toolbar-frequent-renders-narrow.png'),
  });
});

test('invisible visibility state preserves lone-avatar and decorative icon chrome', async ({
  page,
}) => {
  await page.goto('/?component=toolbar-control-group');
  const avatar = page.getByRole('group', { name: 'Profile', exact: true });
  await avatar.evaluate((node) => node.setAttribute('data-single', 'false'));
  const tile = page.getByRole('group', {
    name: 'brand icon tile',
    exact: true,
  });
  for (const group of [avatar, tile]) {
    await expect(group).toBeVisible();
    const before = await group.evaluate((node) => {
      const style = window.getComputedStyle(node);
      const control = node.querySelector('button');
      return {
        image: style.backgroundImage,
        background: style.backgroundColor,
        color: style.color,
        controlColor: control ? window.getComputedStyle(control).color : null,
      };
    });
    await group.evaluate((node) => {
      const state = document.createElement('span');
      state.setAttribute('data-toolbar-visibility-state', '');
      state.setAttribute('data-morph-preserve', '');
      state.setAttribute('aria-hidden', 'true');
      state.hidden = true;
      node.append(state);
    });
    const after = await group.evaluate((node) => {
      const style = window.getComputedStyle(node);
      const control = node.querySelector('button');
      return {
        image: style.backgroundImage,
        background: style.backgroundColor,
        color: style.color,
        controlColor: control ? window.getComputedStyle(control).color : null,
      };
    });
    expect(after).toEqual(before);
    await expect(group.locator('[data-toolbar-visibility-state]')).toBeHidden();
  }
});

test('container thresholds follow equality, tokens, rendering, relocation and disposal', async ({
  page,
  browserName,
}, testInfo) => {
  const bundle = await fixtureBundle;
  await page.setContent(
    '<!doctype html><html><body><div data-fixture-root></div></body></html>',
  );
  await page.addStyleTag({
    content: bundle.outputFiles
      .find((file) => file.path.endsWith('.css'))!
      .text.replace(
        /remify\(([\d.]+)px\)/g,
        (_, pixels: string) => `${Number(pixels) / 16}rem`,
      ),
  });
  await page.addScriptTag({
    content: bundle.outputFiles.find((file) => file.path.endsWith('.js'))!.text,
  });
  const toolbar = page.locator(
    '[data-component="toolbar"][aria-label="Width fixture"]',
  );
  const host = page.locator('[data-test-toolbar-host]');
  const utility = page.getByRole('group', {
    name: 'Utilities',
    includeHidden: true,
  });
  const more = page.getByRole('group', { name: 'More', includeHidden: true });
  const busy = page.getByRole('group', { name: 'Busy', includeHidden: true });
  const status = page.locator('.kui-toolbar-control-group__busy-status');
  const contentWidth = () =>
    toolbar.evaluate((node) => {
      const s = window.getComputedStyle(node);
      return (
        parseFloat(s.width) -
        parseFloat(s.paddingLeft) -
        parseFloat(s.paddingRight)
      );
    });
  expect(await contentWidth()).toBe(416);
  await expect(utility).toBeVisible();
  await expect(more).toBeHidden();
  await expect(status).not.toHaveAttribute('data-toolbar-width-hidden', 'true');
  for (const width of [431, 432, 433, 432, 431]) {
    await host.evaluate((node, value) => {
      node.ownerDocument.documentElement.style.setProperty(
        '--fixture-width',
        `${value}px`,
      );
    }, width);
    if (width < 432) {
      await expect(utility).toBeHidden();
      await expect(more).toBeVisible();
      await expect(status).toHaveAttribute('data-toolbar-width-hidden', 'true');
    } else {
      await expect(utility).toBeVisible();
      await expect(more).toBeHidden();
      await expect(status).not.toHaveAttribute(
        'data-toolbar-width-hidden',
        'true',
      );
    }
  }
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await expect(page.locator('output')).toHaveText('more');
  await page.getByRole('button', { name: 'Refresh', exact: true }).focus();
  if (browserName === 'webkit') {
    await utility
      .getByRole('button', { name: 'Filter', includeHidden: true })
      .evaluate((node) => (node as HTMLElement).focus());
    await expect(
      utility.getByRole('button', { name: 'Filter', includeHidden: true }),
    ).not.toBeFocused();
    await page.getByRole('button', { name: 'More', exact: true }).focus();
  } else await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'More', exact: true }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Render again' }).click();
  await expect(utility).toBeHidden();
  await expect(busy).toBeHidden();
  await expect(status).toHaveAttribute('data-toolbar-width-hidden', 'true');
  await utility.evaluate((node) =>
    node.removeAttribute('data-toolbar-width-hidden'),
  );
  await expect(utility).toBeHidden();
  await toolbar.evaluate((node) => {
    node.dataset.safeAreaInlineStart = 'true';
    node.dataset.safeAreaInlineEnd = 'true';
    node.style.setProperty('--kui-safe-area-inline-start', '20px');
    node.style.setProperty('--kui-safe-area-inline-end', '12px');
  });
  expect(await contentWidth()).toBe(383);
  await utility.evaluate((node) => {
    node.dataset.hideBelow = '100%';
  });
  await expect(utility).toBeVisible();
  await utility.evaluate((node) => {
    node.dataset.hideBelow = 'calc(100% + 1px)';
  });
  await expect(utility).toBeHidden();
  await toolbar.evaluate((node) => {
    node.dataset.safeAreaInlineStart = 'false';
    node.dataset.safeAreaInlineEnd = 'false';
  });
  await utility.evaluate((node) => {
    node.dataset.hideBelow = 'var(--width-cutoff)';
  });
  await page.evaluate(() =>
    document.documentElement.style.setProperty('--width-cutoff', '420px'),
  );
  await expect(utility).toBeHidden();
  await page.evaluate(() =>
    document.documentElement.style.setProperty('--width-cutoff', '400px'),
  );
  await expect(utility).toBeVisible();
  await utility.evaluate((node) => {
    node.dataset.hideBelow = '30em';
    node.style.fontSize = '16px';
  });
  await expect(utility).toBeHidden();
  await utility.evaluate((node) => {
    node.style.fontSize = '12px';
  });
  await expect(utility).toBeVisible();
  await utility.evaluate((node) => {
    node.dataset.hideBelow = 'calc(20rem + var(--extra))';
  });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '20px';
    document.documentElement.style.setProperty('--extra', '20px');
  });
  await expect(utility).toBeHidden();
  await page.evaluate(() => (document.documentElement.style.fontSize = '16px'));
  await expect(utility).toBeVisible();
  await page.addStyleTag({
    content:
      ':root { --media-cutoff: 400px; --item-font: 12px; } @media (prefers-color-scheme: dark) { :root { --media-cutoff: 500px; --item-font: 20px; } }',
  });
  await utility.evaluate((node) => {
    node.dataset.hideBelow = 'var(--media-cutoff)';
  });
  for (const theme of ['light', 'dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    if (theme === 'dark') await expect(utility).toBeHidden();
    else await expect(utility).toBeVisible();
  }
  await utility.evaluate((node) => {
    node.dataset.hideBelow = '30em';
    node.style.fontSize = 'var(--item-font)';
  });
  for (const theme of ['light', 'dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    if (theme === 'dark') await expect(utility).toBeHidden();
    else await expect(utility).toBeVisible();
  }
  await host.evaluate((node) => {
    node.ownerDocument.documentElement.style.setProperty(
      '--fixture-width',
      '376px',
    );
  });
  await toolbar.evaluate((node) => {
    node.style.fontFamily = 'Arial';
  });
  // ch/ex/lh depend on the item's complete font context, not its toolbar font.
  await utility.evaluate((node) => {
    node.style.fontFamily = 'Courier New, monospace';
    node.style.fontSize = '16px';
    node.style.lineHeight = '32px';
    node.style.setProperty('--own-cutoff', '40ch');
    node.dataset.hideBelow = 'var(--own-cutoff)';
  });
  await expect(utility).toBeHidden();
  await utility.evaluate((node) => {
    node.style.setProperty('--own-cutoff', '20lh');
  });
  await expect(utility).toBeHidden();
  await utility.evaluate((node) => {
    node.style.setProperty('--own-cutoff', '10lh');
  });
  await expect(utility).toBeVisible();
  await utility.evaluate((node) => {
    node.style.fontFamily = '';
    node.style.lineHeight = '';
  });
  await host.evaluate((node) => {
    node.ownerDocument.documentElement.style.setProperty(
      '--fixture-width',
      '431px',
    );
  });
  const identity = toolbar.locator('[data-component="toolbar-text"]');
  await identity.evaluate((node) => {
    node.dataset.hideBelow = '20em';
    node.style.setProperty('--kui-font-m', '16px');
    node.style.setProperty('--kui-font-l', '24px');
  });
  await expect(identity).toBeVisible();
  await identity.evaluate((node) => {
    node.dataset.size = 'xlarge-fixed';
  });
  await expect(identity).toBeHidden();
  await identity.evaluate((node) => {
    node.dataset.size = 'default';
  });
  await expect(identity).toBeVisible();
  for (const value of ['-1px', 'var(--missing-token)', 'nonsense']) {
    await utility.evaluate((node, threshold) => {
      node.dataset.hideBelow = threshold;
    }, value);
    await expect(utility).toBeVisible();
    await utility.evaluate((node, threshold) => {
      node.removeAttribute('data-hide-below');
      node.dataset.showBelow = threshold;
    }, value);
    await expect(utility).toBeVisible();
  }
  await utility.evaluate((node) => {
    node.removeAttribute('data-show-below');
    node.dataset.hideBelow = '416px';
    node.style.fontSize = '';
  });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  for (const width of [600, 320]) {
    await host.evaluate((node, value) => {
      node.ownerDocument.documentElement.style.setProperty(
        '--fixture-width',
        `${value}px`,
      );
    }, width);
    if (width === 600) await expect(utility).toBeVisible();
    else await expect(utility).toBeHidden();
    for (const theme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: theme });
      if (browserName === 'chromium')
        await toolbar.screenshot({
          path: testInfo.outputPath(`toolbar-width-${width}-${theme}.png`),
          animations: 'disabled',
        });
    }
  }
  // A nested toolbar becomes the nearest container without changing viewport size.
  await toolbar.evaluate((node) => {
    const nested = node.cloneNode(false) as HTMLElement;
    nested.setAttribute('aria-label', 'Nested width fixture');
    nested.style.width = '600px';
    const zone = document.createElement('div');
    nested.append(zone);
    node.append(nested);
    zone.append(node.querySelector('[aria-label="Utilities"]')!);
  });
  await expect(utility).toBeVisible();
  await page.getByRole('button', { name: 'Dispose visibility' }).click();
  await expect(page.locator('[data-toolbar-visibility-probe]')).toHaveCount(0);
  await expect(utility).not.toHaveAttribute(
    'data-toolbar-width-hidden',
    'true',
  );
});

test('production toolbar demo keeps primary and overflow actions reachable', async ({
  page,
  browserName,
}, testInfo) => {
  await page.goto('/?component=toolbar');
  const demo = page.locator('[data-demo-toolbar-width-visibility]');
  const toolbar = demo.locator('[data-component="toolbar"]');
  await toolbar.evaluate((node) => {
    node.style.width = '320px';
  });
  await expect(
    demo.getByRole('button', { name: 'Refresh workspace' }),
  ).toBeVisible();
  await expect(
    demo.getByRole('button', { name: 'Filter workspace', exact: true }),
  ).toBeHidden();
  await demo.getByRole('button', { name: 'More workspace actions' }).click();
  await demo.getByRole('menuitem', { name: 'Filter workspace' }).click();
  await expect(page.locator('.catalog-log')).toContainText(
    'Workspace filter requested',
  );
  await toolbar.evaluate((node) => {
    node.style.width = '600px';
  });
  await expect(
    demo.getByRole('button', { name: 'Filter workspace', exact: true }),
  ).toBeVisible();
  await demo.getByRole('button', { name: 'Refresh workspace' }).click();
  await expect(page.locator('.catalog-log')).toContainText(
    'Workspace refreshed',
  );
  if (browserName === 'chromium') {
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    const captureStyle = await page.addStyleTag({
      content: '[data-demo-toolbar-width-visibility] { width: 600px; }',
    });
    for (const width of [600, 320]) {
      await captureStyle.evaluate((node, value) => {
        node.textContent = `[data-demo-toolbar-width-visibility] { width: ${value}px; }`;
      }, width);
      for (const theme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme: theme });
        await expect
          .poll(async () => Math.round((await toolbar.boundingBox())!.width))
          .toBe(width - 2);
        if (width === 320)
          await expect(
            demo.getByRole('button', { name: 'More workspace actions' }),
          ).toBeVisible();
        else
          await expect(
            demo.getByRole('button', { name: 'Filter workspace', exact: true }),
          ).toBeVisible();
        await toolbar.screenshot({
          path: testInfo.outputPath(`toolbar-production-${width}-${theme}.png`),
          animations: 'disabled',
          style: '[data-catalog-geometry-overlay] { visibility: hidden; }',
        });
      }
    }
  }
});
