import { expect, test } from '@playwright/test';

test('SunkenPanel owns one lowered 8px inset and vertical content stack', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=sunken-panel');

  const named = page.getByRole('region', { name: 'Release workspace' });
  await expect(named).toBeVisible();
  const geometry = await named.evaluate((element) => {
    const style = window.window.getComputedStyle(element);
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
          growing.ownerDocument.defaultView!.window.getComputedStyle(growing)
            .flexGrow,
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

test('shared translucent sunken surfaces compound at each nesting level', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=sunken-panel');
  for (const theme of ['light', 'dark'] as const) {
    if (theme === 'dark')
      await page.locator('[data-action="toggle-theme"]').click();
    await expect(
      page.getByRole('region', { name: 'First layer', exact: true }),
    ).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(245, 245, 247)' : 'rgb(29, 29, 31)',
    );
    const result = await page.evaluate(() => {
      const panels = ['First layer', 'Second layer', 'Third layer'].map(
        (name) =>
          document.querySelector<HTMLElement>(`[aria-label="${name}"]`)!,
      );
      const colors = panels.map(
        (panel) => window.getComputedStyle(panel).backgroundColor,
      );
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      const lum = (rgb: number[]) =>
        rgb.reduce((sum, value, i) => {
          const c = value / 255;
          return (
            sum +
            (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) *
              [0.2126, 0.7152, 0.0722][i]!
          );
        }, 0);
      const pixel = () => [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      const paint = (color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
      };
      paint(window.getComputedStyle(panels[0]!).color);
      const textLum = lum(pixel());
      ctx.clearRect(0, 0, 1, 1);
      const ancestors: Element[] = [];
      for (let el = panels[0]!.parentElement; el; el = el.parentElement)
        ancestors.unshift(el);
      for (const el of ancestors)
        paint(window.getComputedStyle(el).backgroundColor);
      const layers = colors.map((color) => {
        paint(color);
        const value = lum(pixel());
        return {
          rgb: pixel(),
          contrast:
            (Math.max(textLum, value) + 0.05) /
            (Math.min(textLum, value) + 0.05),
        };
      });
      const pane = document.querySelector(
        '[aria-label="Layered pane"] .kui-pane__content',
      )!;
      const card = document.querySelector(
        '[data-demo="sunken-panel"] wa-card',
      )!;
      const details = card.querySelector('wa-details')!;
      return {
        colors,
        layers,
        pane: window.getComputedStyle(pane).backgroundColor,
        card: window.getComputedStyle(card).backgroundColor,
        details: window.getComputedStyle(
          details.shadowRoot!.querySelector('[part~="details"]')!,
        ).backgroundColor,
      };
    });
    expect(result.colors[0]).toMatch(/^rgba\(/);
    expect(result.colors[1]).toBe(result.colors[0]);
    expect(result.colors[2]).toBe(result.colors[0]);
    expect(result.pane).toBe(result.colors[0]);
    expect(result.card).toBe(result.colors[0]);
    expect(result.details).toBe(result.colors[0]);
    for (let i = 0; i < result.layers.length; i++) {
      expect(result.layers[i]!.contrast).toBeGreaterThanOrEqual(4.5);
      if (i) {
        const current = result.layers[i]!.rgb[0]!;
        const previous = result.layers[i - 1]!.rgb[0]!;
        if (theme === 'light') expect(current).toBeLessThan(previous);
        else expect(current).toBeGreaterThan(previous);
      }
    }
    for (const width of [1200, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const specimen = page.getByRole('region', {
        name: 'First layer',
        exact: true,
      });
      await expect(specimen).toBeVisible();
      expect(
        await specimen.evaluate((el) => el.scrollWidth - el.clientWidth),
      ).toBeLessThanOrEqual(1);
      await specimen.screenshot({
        path: testInfo.outputPath(`sunken-${theme}-${width}.png`),
      });
    }
  }
  await page.emulateMedia({ forcedColors: 'active' });
  const button = page.getByRole('button', { name: 'Focus nested control' });
  await button.focus();
  await expect(button).toBeFocused();
  await page
    .getByRole('region', { name: 'First layer', exact: true })
    .screenshot({ path: testInfo.outputPath('sunken-forced-colors.png') });
});
