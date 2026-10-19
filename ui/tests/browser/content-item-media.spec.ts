import { expect, type Locator, type Page, test } from '@playwright/test';

import { contrastRatio } from '../../evaluator/index.mjs';

async function feed(page: Page, waitReady = true) {
  await page.goto('/?component=content-item');
  const pane = page.locator('[data-content-item-feed="true"]');
  await pane.scrollIntoViewIfNeeded();
  const cards = pane.locator('[data-feed-card]');
  if (waitReady) {
    await expect(cards.nth(0)).toHaveAttribute('data-media-state', 'ready');
    await cards.nth(1).scrollIntoViewIfNeeded();
    await expect(cards.nth(1)).toHaveAttribute('data-media-state', 'ready');
    await cards.nth(0).scrollIntoViewIfNeeded();
  }
  return { pane, cards, scroller: pane.locator('.kui-pane__content') };
}

async function offset(card: Locator) {
  return card.locator('.kui-backdrop-image__layers').evaluate((element) => {
    const matrix = window.getComputedStyle(element).transform;
    return matrix === 'none' ? 0 : new DOMMatrixReadOnly(matrix).m42;
  });
}

test('opted-in media defers offscreen heroes without shifting the feed or hiding visible images', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 700 });
    const { cards, scroller } = await feed(page);
    const first = cards.nth(0);
    const hero = first.locator('.kui-backdrop-image__hero');
    await expect(first.locator('.kui-backdrop-image')).toHaveAttribute(
      'data-defer-offscreen',
      'true',
    );
    expect(
      await hero.evaluate(
        (node) => window.getComputedStyle(node).contentVisibility,
      ),
    ).toBe('auto');
    expect(
      await first.evaluate(
        (node) => window.getComputedStyle(node).contentVisibility,
      ),
    ).toBe('visible');
    const height = await scroller.evaluate((node) => node.scrollHeight);
    await scroller.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });
    await cards.nth(2).scrollIntoViewIfNeeded();
    await expect(
      cards.nth(2).locator('.kui-backdrop-image__media'),
    ).toBeVisible();
    await expect(
      cards.nth(2).getByRole('button', { name: 'Explore' }),
    ).toBeVisible();
    await first.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        first
          .locator('.kui-backdrop-image__media')
          .evaluate(
            (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
          ),
      )
      .toBe(true);
    expect(await scroller.evaluate((node) => node.scrollHeight)).toBe(height);
    if (testInfo.project.name === 'chromium')
      await first.screenshot({
        path: testInfo.outputPath(`content-item-deferred-${width}.png`),
      });
  }
});

test('feed cards have independent image timelines in one scroller and reverse on scroll back', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  const { cards, scroller } = await feed(page);
  const supported = await page.evaluate(() =>
    CSS.supports('animation-timeline: view()'),
  );
  expect(await cards.count()).toBe(4);
  expect(await scroller.count()).toBe(1);
  const ratio = await cards
    .nth(0)
    .locator('.kui-content-item__media')
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width / rect.height;
    });
  expect(ratio).toBeCloseTo(16 / 9, 2);
  await scroller.evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.waitForTimeout(100);
  const first = await offset(cards.nth(0));
  await scroller.evaluate((element) => {
    element.scrollTop = 110;
  });
  await page.waitForTimeout(100);
  const moved = await offset(cards.nth(0));
  const next = await offset(cards.nth(1));
  if (supported) {
    expect(moved).toBeGreaterThan(first + 10);
    expect(Math.abs(next)).toBeLessThan(2);
  } else {
    expect(moved).toBe(0);
    expect(next).toBe(0);
  }
  await scroller.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect.poll(() => offset(cards.nth(0))).toBeCloseTo(first, 0);
  expect(
    await cards.nth(0).locator('img[loading="lazy"][decoding="async"]').count(),
  ).toBe(2);
  expect(await cards.nth(3).locator('.kui-content-item__media').count()).toBe(
    0,
  );
});

test('edge-to-edge media composes fade, scrim, and a usable overlay control', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  const { cards } = await feed(page);
  const card = cards.nth(2);
  const media = card.locator('.kui-content-item__media');
  await expect(card).toHaveAttribute('data-media-edge', 'true');
  await expect(card).toHaveAttribute('data-media-fade', 'true');
  await expect(media.locator('.kui-backdrop-image')).toHaveAttribute(
    'data-scrim',
    'bottom',
  );
  const geometry = await card.evaluate((element) => {
    const card = element.getBoundingClientRect();
    const media = element
      .querySelector('.kui-content-item__media')!
      .getBoundingClientRect();
    return {
      left: media.left - card.left,
      right: card.right - media.right,
      top: media.top - card.top,
    };
  });
  expect(geometry.left).toBeCloseTo(1, 0);
  expect(geometry.right).toBeCloseTo(1, 0);
  expect(geometry.top).toBeCloseTo(1, 0);
  expect(
    await card.evaluate(
      (element) => window.getComputedStyle(element).backgroundColor,
    ),
  ).toBe('rgb(40, 58, 84)');
  const overlay = media.getByRole('button', { name: 'Explore' });
  await overlay.focus();
  await expect(overlay).toBeFocused();
  await expect(overlay).toBeVisible();
  if (testInfo.project.name === 'webkit')
    await page.screenshot({
      path: testInfo.outputPath('content-item-media-1200.png'),
    });

  await page.setViewportSize({ width: 390, height: 844 });
  const narrow = await feed(page);
  const narrowCard = narrow.cards.nth(2);
  await expect(
    narrowCard.getByRole('button', { name: 'Explore' }),
  ).toBeVisible();
  const narrowWidth = await narrowCard.evaluate((element) => {
    const card = element.getBoundingClientRect();
    const media = element
      .querySelector('.kui-content-item__media')!
      .getBoundingClientRect();
    return card.width - media.width;
  });
  expect(narrowWidth).toBeCloseTo(2, 0);
  if (testInfo.project.name === 'webkit') {
    await narrowCard.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath('content-item-media-390.png'),
    });
  }
});

test('broken and replaced images switch between ordinary and tinted card surfaces', async ({
  page,
}, testInfo) => {
  const { cards } = await feed(page);
  const card = cards.nth(0);
  const image = card.locator('.kui-backdrop-image__media');
  const normal = await cards
    .nth(3)
    .evaluate((element) => window.getComputedStyle(element).backgroundColor);
  await image.evaluate((element: HTMLImageElement) => {
    element.src = '/missing-feed-image.png';
  });
  await expect(card).toHaveAttribute('data-media-state', 'error');
  await expect(card).not.toHaveAttribute('data-kui-tint');
  expect(
    await card.evaluate(
      (element) => window.getComputedStyle(element).backgroundColor,
    ),
  ).toBe(normal);
  await expect(card.locator('.kui-content-item__media')).toBeHidden();
  for (const attribute of ['data-theme', 'data-other']) {
    await card.evaluate((element, name) => {
      element.setAttribute('data-media-state', 'pending');
      element.setAttribute('data-kui-tint', 'dark');
      element.setAttribute('data-kui-tint-accent', '');
      element.classList.add('wa-dark');
      element.setAttribute(name, 'changed');
    }, attribute);
    await expect(card).toHaveAttribute('data-media-state', 'error');
    await expect(card).not.toHaveAttribute('data-kui-tint');
    await expect(card.locator('.kui-content-item__media')).toBeHidden();
  }
  if (testInfo.project.name === 'chromium') {
    await card.scrollIntoViewIfNeeded();
    await card.screenshot({
      path: testInfo.outputPath('content-item-error-after.png'),
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await image.evaluate((element: HTMLImageElement) => {
      element.src = '/missing-feed-image.png';
    });
    await expect(card).toHaveAttribute('data-media-state', 'error');
    await card.scrollIntoViewIfNeeded();
    await card.screenshot({
      path: testInfo.outputPath('content-item-error-after-narrow.png'),
    });
  }
  await image.evaluate((element: HTMLImageElement) => {
    element.src =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="18"/%3E';
  });
  await expect(card).toHaveAttribute('data-media-state', 'ready');
  await expect(card).toHaveAttribute('data-kui-tint', 'dark');
  await expect(card.locator('.kui-content-item__media')).toBeVisible();
  await card.evaluate((element) => {
    element.setAttribute('data-media-state', 'pending');
    element.removeAttribute('data-kui-tint');
    element.removeAttribute('data-kui-tint-accent');
    element.classList.remove('wa-dark');
  });
  await expect(card).toHaveAttribute('data-media-state', 'ready');
  await expect(card).toHaveAttribute('data-kui-tint', 'dark');
  await expect(card.getByRole('link', { name: 'Source' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Save' })).toBeVisible();
});

test('reduced motion leaves feed images sharp and static', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { cards, scroller } = await feed(page);
  await scroller.evaluate((element) => {
    element.scrollTop = 110;
  });
  await page.waitForTimeout(100);
  expect(await offset(cards.nth(0))).toBe(0);
  expect(
    await cards
      .nth(0)
      .locator('.kui-backdrop-image__blurred')
      .evaluate((element) => window.getComputedStyle(element).opacity),
  ).toBe('0');
});

test('static effects stop motion and nested source and save actions stay keyboard reachable', async ({
  page,
}) => {
  const { cards, scroller } = await feed(page);
  const card = cards.nth(0);
  await page.evaluate(() =>
    document.documentElement.setAttribute('data-kui-effects', 'static'),
  );
  await scroller.evaluate((element) => {
    element.scrollTop = 110;
  });
  await page.waitForTimeout(100);
  expect(await offset(card)).toBe(0);
  const link = card.getByRole('link', { name: 'Source' });
  await link.focus();
  await page.keyboard.press('Enter');
  expect(new URL(page.url()).hash).toBe('#source');
  const button = card.getByRole('button', { name: 'Save' });
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press('Space');
  await expect(button).toBeFocused();
});

test('a rerender can remove and restore one card image without changing sibling cards', async ({
  page,
}) => {
  const { cards } = await feed(page);
  const card = cards.nth(0);
  const sibling = cards.nth(1);
  await card.evaluate((element) => {
    const plain = element
      .parentElement!.querySelector('[data-feed-card="no-image"]')!
      .cloneNode(true) as HTMLElement;
    plain.setAttribute('data-feed-card', '1');
    element.replaceWith(plain);
  });
  await expect(card.locator('.kui-content-item__media')).toHaveCount(0);
  await expect(card).not.toHaveAttribute('data-kui-tint');
  await expect(sibling).toHaveAttribute('data-media-state', 'ready');
  await card.evaluate((element) => {
    const original = element
      .parentElement!.querySelector('[data-feed-card="3"]')!
      .cloneNode(true) as HTMLElement;
    original.setAttribute('data-feed-card', '1');
    element.replaceWith(original);
  });
  await expect(card).toHaveAttribute('data-media-state', 'ready');
  await expect(card.locator('.kui-content-item__media')).toBeVisible();
});

test('card-scoped light and dark tints keep text, quiet text, links, controls, and focus at AA', async ({
  page,
}) => {
  const { cards } = await feed(page);
  for (const [index, scheme] of [
    [0, 'dark'],
    [1, 'light'],
  ] as const) {
    const colors = await cards.nth(index).evaluate((card) => {
      const probe = document.createElement('span');
      card.append(probe);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      const rgb = (value: string) => {
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      };
      const token = (name: string) => {
        probe.style.color = `var(${name})`;
        return rgb(window.getComputedStyle(probe).color);
      };
      const result = {
        surface: rgb(window.getComputedStyle(card).backgroundColor),
        text: token('--kui-color-text'),
        quiet: token('--kui-color-text-quiet'),
        link: rgb(window.getComputedStyle(card.querySelector('a')!).color),
        control: rgb(
          window.getComputedStyle(card.querySelector('button')!).color,
        ),
        focus: token('--wa-color-focus'),
      };
      probe.remove();
      return result;
    });
    for (const name of ['text', 'quiet', 'link', 'control'] as const)
      expect(
        contrastRatio(colors[name], colors.surface),
        `${scheme} ${name}`,
      ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(colors.focus, colors.surface),
      `${scheme} focus`,
    ).toBeGreaterThanOrEqual(3);
  }
});

test('compact info Badge stays at AA on light image tints without an accent', async ({
  page,
}, testInfo) => {
  for (const width of [1200, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const { cards } = await feed(page);
    const card = cards.nth(1);
    await card.evaluate((element) => {
      element
        .querySelector('.kui-content-item__media')!
        .removeAttribute('data-tint-accent');
      element.removeAttribute('data-kui-tint-accent');
      const badge = document.createElement('span');
      badge.className = 'kui-badge';
      badge.dataset.component = 'badge';
      badge.dataset.tone = 'info';
      badge.dataset.size = 'compact';
      badge.textContent = 'Info';
      element.querySelector('.kui-content-item__body .kui-row')!.append(badge);
    });
    await expect(card).not.toHaveAttribute('data-kui-tint-accent');
    for (const color of ['rgb(250, 196, 196)', 'rgb(186, 216, 249)']) {
      const colors = await card.evaluate((element, tint) => {
        element.style.setProperty('--_kui-tint-color', tint);
        const badge = element.querySelector('.kui-badge')!;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d', { willReadFrequently: true })!;
        const rgb = () => [
          ...context.getImageData(0, 0, 1, 1).data.slice(0, 3),
        ];
        context.fillStyle = window.getComputedStyle(element).backgroundColor;
        context.fillRect(0, 0, 1, 1);
        context.fillStyle = window.getComputedStyle(badge).backgroundColor;
        context.fillRect(0, 0, 1, 1);
        const background = rgb();
        context.fillStyle = window.getComputedStyle(badge).color;
        context.fillRect(0, 0, 1, 1);
        return { background, foreground: rgb() };
      }, color);
      expect(
        contrastRatio(colors.foreground, colors.background),
      ).toBeGreaterThanOrEqual(4.5);
    }
    await card.evaluate((element) => {
      const capture = element.cloneNode(true) as HTMLElement;
      capture.dataset.contrastCapture = 'true';
      capture.style.position = 'fixed';
      capture.style.inset = '20px auto auto 20px';
      capture.style.width = 'min(624px, calc(100vw - 40px))';
      capture.style.margin = '0';
      capture.style.zIndex = '10000';
      document.body.append(capture);
    });
    const capture = page.locator('[data-contrast-capture]');
    await (
      width === 1200
        ? capture.locator('.kui-content-item__body .kui-row')
        : capture
    ).screenshot({
      path: testInfo.outputPath(`content-item-info-badge-${width}.png`),
    });
  }
});

test('increased contrast and forced colors stop feed image movement', async ({
  page,
}) => {
  await page.emulateMedia({ contrast: 'more' });
  let { cards, scroller } = await feed(page);
  await scroller.evaluate((element) => {
    element.scrollTop = 110;
  });
  await page.waitForTimeout(100);
  expect(await offset(cards.nth(0))).toBe(0);
  await page.emulateMedia({ forcedColors: 'active' });
  await page.reload();
  ({ cards } = await feed(page, false));
  await expect(cards.nth(0).locator('.kui-content-item__media')).toBeHidden();
  expect(await offset(cards.nth(0))).toBe(0);
});
