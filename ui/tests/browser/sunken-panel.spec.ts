import { expect, test } from '@playwright/test';

test('SunkenPanel owns one lowered 8px inset and vertical content stack', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=sunken-panel');

  const named = page.getByRole('region', { name: 'Release workspace' });
  await expect(named).toBeVisible();
  const geometry = await named.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      display: style.display,
      direction: style.flexDirection,
      padding: style.paddingTop,
      gap: style.rowGap,
      background: style.backgroundColor,
      radius: style.borderRadius,
    };
  });
  expect(geometry).toMatchObject({
    display: 'flex',
    direction: 'column',
    padding: '8px',
    gap: '8px',
  });
  expect(geometry.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(geometry.radius).not.toBe('0px');
  await expect(named).toHaveAttribute('data-shape', 'rounded');

  const unnamed = page
    .locator('[data-demo="sunken-panel"] [data-component="sunken-panel"]')
    .nth(1);
  await expect(unnamed).not.toHaveAttribute('role');
  await expect(unnamed).not.toHaveAttribute('aria-label');
  await expect(unnamed).toHaveAttribute('data-shape', 'square');
  await expect(unnamed).toHaveCSS('border-radius', '0px');

  if (browserName === 'chromium')
    await page
      .locator('[data-demo="sunken-panel"]')
      .screenshot({ path: 'test-results/sunken-panel-shapes.png' });
});

test('SunkenPanel fills a frame and takes remaining flex space without a wrapper', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=sunken-panel');
  const growing = page.getByRole('region', { name: 'Growing work surface' });
  const fullHeight = page.getByRole('region', {
    name: 'Full-height work surface',
  });
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await expect(growing).toHaveAttribute('data-flex', 'true');
    await expect(fullHeight).toHaveAttribute('data-fill', 'true');
    const geometry = await page.evaluate(() => {
      const growing = document.querySelector<HTMLElement>(
        '[aria-label="Growing work surface"]',
      )!;
      const fullHeight = document.querySelector<HTMLElement>(
        '[aria-label="Full-height work surface"]',
      )!;
      return {
        growingHeight: growing.getBoundingClientRect().height,
        growingParentHeight:
          growing.parentElement!.getBoundingClientRect().height,
        fillHeight: fullHeight.getBoundingClientRect().height,
        fillParentHeight:
          fullHeight.parentElement!.getBoundingClientRect().height,
        growingFlex:
          growing.ownerDocument.defaultView!.getComputedStyle(growing).flexGrow,
      };
    });
    expect(geometry.growingFlex).toBe('1');
    expect(geometry.growingHeight).toBeGreaterThan(
      geometry.growingParentHeight / 2,
    );
    expect(
      Math.abs(geometry.fillHeight - geometry.fillParentHeight),
    ).toBeLessThanOrEqual(1);
    await fullHeight.screenshot({
      path: testInfo.outputPath(`sunken-panel-fill-${width}.png`),
    });
  }
});

test('opt-in translucent sunken prototype bounds nesting across themes and backdrops', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/?component=sunken-panel');
  const prototype = page.locator('[data-sunken-prototype]');
  await expect(prototype.locator('[data-backdrop]')).toHaveCount(4);
  for (const theme of ['light', 'dark'] as const) {
    if (theme === 'dark') {
      await page.locator('[data-action="toggle-theme"]').click();
      await expect(page.locator('html')).toHaveClass(/demo-dark/);
    }
    await expect(
      prototype.getByRole('button', { name: 'Third level focus' }).first(),
    ).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(245, 245, 247)' : 'rgb(29, 29, 31)',
    );
    const measurements = await prototype.evaluate((root, currentTheme) => {
      const context = document.createElement('canvas').getContext('2d')!;
      context.canvas.width = 1;
      context.canvas.height = 1;
      const composite = (...colors: string[]) => {
        context.clearRect(0, 0, 1, 1);
        for (const color of colors) {
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
        }
        return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      };
      const luminance = (rgb: number[]) =>
        rgb.reduce((sum, channel, index) => {
          const value = channel / 255;
          const linear =
            value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          return sum + linear * [0.2126, 0.7152, 0.0722][index]!;
        }, 0);
      const ratio = (a: number[], b: number[]) => {
        const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (values[0]! + 0.05) / (values[1]! + 0.05);
      };
      const backdrops = {
        light: {
          default: ['#ffffff'],
          lowered: ['#f2f2f7'],
          warm: ['#eee7dc'],
          textured: ['#faf6ee', '#e7e4de'],
        },
        dark: {
          default: ['#1c1c1e'],
          lowered: ['#111113'],
          warm: ['#332c25'],
          textured: ['#29282a', '#222124'],
        },
      } as const;
      return [...root.querySelectorAll<HTMLElement>('[data-backdrop]')].map(
        (tile) => {
          const backdrop = tile.dataset
            .backdrop as keyof typeof backdrops.light;
          const first = tile.querySelector<HTMLElement>(
            ':scope > .demo-sunken-prototype__first > .kui-sunken-panel',
          )!;
          const second = first.querySelector<HTMLElement>(
            ':scope > .demo-sunken-prototype__second > .kui-sunken-panel',
          )!;
          const third = second.querySelector<HTMLElement>(
            ':scope > .demo-sunken-prototype__third > .kui-sunken-panel',
          )!;
          const pane = tile.querySelector<HTMLElement>('.kui-pane__content')!;
          const card = tile.querySelector<HTMLElement>('wa-card')!;
          const detail = card.querySelector<HTMLElement>('wa-details')!;
          const button = third.querySelector<HTMLButtonElement>('button')!;
          const firstStyle = window.getComputedStyle(first);
          const secondStyle = window.getComputedStyle(second);
          const thirdStyle = window.getComputedStyle(third);
          const cardStyle = window.getComputedStyle(card);
          const detailStyle = window.getComputedStyle(detail);
          const detailProbe = document.createElement('span');
          detailProbe.style.backgroundColor = 'var(--kui-wa-sunken-background)';
          detail.append(detailProbe);
          const detailsBackground =
            window.getComputedStyle(detailProbe).backgroundColor;
          detailProbe.remove();
          const buttonStyle = window.getComputedStyle(button);
          const firstText = window.getComputedStyle(
            first.querySelector('span')!,
          ).color;
          const secondText = window.getComputedStyle(
            second.querySelector('span')!,
          ).color;
          const contrast = backdrops[currentTheme][backdrop].map((base) => {
            const firstSurface = composite(base, firstStyle.backgroundColor);
            const secondSurface = composite(
              base,
              firstStyle.backgroundColor,
              secondStyle.backgroundColor,
            );
            return [
              ratio(composite(firstText), firstSurface),
              ratio(composite(secondText), secondSurface),
              ratio(
                composite(buttonStyle.color),
                composite(
                  base,
                  firstStyle.backgroundColor,
                  secondStyle.backgroundColor,
                  buttonStyle.backgroundColor,
                ),
              ),
              ratio(
                composite(cardStyle.color),
                composite(base, cardStyle.backgroundColor),
              ),
              ratio(
                composite(detailStyle.color),
                composite(
                  base,
                  cardStyle.backgroundColor,
                  secondStyle.backgroundColor,
                ),
              ),
            ];
          });
          return {
            backdrop,
            first: firstStyle.backgroundColor,
            second: secondStyle.backgroundColor,
            third: thirdStyle.backgroundColor,
            pane: window.getComputedStyle(pane).backgroundColor,
            card: cardStyle.backgroundColor,
            buttonColor: buttonStyle.color,
            buttonBackground: buttonStyle.backgroundColor,
            detailsBackground,
            contrast,
          };
        },
      );
    }, theme);
    for (const result of measurements) {
      expect(result.first).toMatch(/^rgba\(0, 0, 0, 0\./);
      expect(result.second).toMatch(/^rgba\(0, 0, 0, 0\./);
      expect(result.third).toBe('rgba(0, 0, 0, 0)');
      expect(result.pane).toBe(result.first);
      expect(result.card).toBe(result.first);
      expect(result.detailsBackground).toBe(result.second);
      for (const [baseIndex, pair] of result.contrast.entries())
        for (const [measureIndex, value] of pair.entries())
          expect(
            value,
            `${theme}/${result.backdrop}/${baseIndex} ${
              ['panel first', 'panel second', 'button', 'card', 'details'][
                measureIndex
              ]
            } (${result.buttonColor} on ${result.buttonBackground})`,
          ).toBeGreaterThanOrEqual(4.5);
    }
    for (const backdrop of ['default', 'lowered', 'warm', 'textured']) {
      await prototype.locator(`[data-backdrop="${backdrop}"]`).screenshot({
        path: testInfo.outputPath(`sunken-${theme}-${backdrop}.png`),
      });
    }
  }
  await page.emulateMedia({ forcedColors: 'active' });
  expect(
    await page.evaluate(
      () => window.matchMedia('(forced-colors: active)').matches,
    ),
  ).toBe(true);
  const button = prototype
    .getByRole('button', { name: 'Third level focus' })
    .first();
  await button.focus();
  await expect(button).toBeFocused();
  await expect(button).not.toHaveCSS('outline-style', 'none');
  await prototype.screenshot({
    path: testInfo.outputPath('sunken-prototype-forced-colors.png'),
  });
});
