import { expect, test } from '@playwright/test';

test('the catalog opts into the full-height document baseline', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=workbench');

  const app = page.locator('#app');
  await expect(app).toHaveClass(/kui-app-root/);
  const geometry = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('#app')!;
    const anchor = document.createElement('a');
    anchor.textContent = 'Baseline link';
    root.append(anchor);
    const probe = document.createElement('span');
    probe.style.color = 'var(--kui-color-text)';
    probe.style.backgroundColor = 'var(--kui-color-surface-lowered)';
    probe.style.fontFamily = 'var(--kui-font-sans)';
    root.append(probe);
    const linkProbe = document.createElement('span');
    linkProbe.style.color = 'var(--kui-color-text-link)';
    root.append(linkProbe);
    const style = (element: Element, pseudo?: string) =>
      globalThis.getComputedStyle(element, pseudo);
    const result = {
      htmlHeight: style(document.documentElement).height,
      bodyHeight: style(document.body).height,
      rootHeight: style(root).height,
      bodyMargin: style(document.body).margin,
      bodyFont: style(document.body).fontFamily,
      bodyLineHeight: style(document.body).lineHeight,
      bodyColor: style(document.body).color,
      bodyBackground: style(document.body).backgroundColor,
      tokenFont: style(probe).fontFamily,
      tokenColor: style(probe).color,
      tokenBackground: style(probe).backgroundColor,
      linkColor: style(anchor).color,
      tokenLink: style(linkProbe).color,
      boxSizing: style(document.body, '::before').boxSizing,
    };
    anchor.remove();
    probe.remove();
    linkProbe.remove();
    return result;
  });
  expect(geometry).toMatchObject({
    htmlHeight: '900px',
    bodyHeight: '900px',
    rootHeight: '900px',
    bodyMargin: '0px',
    boxSizing: 'border-box',
  });
  // WebKit serializes the computed 1.45 line height as 23.200001px.
  expect(Number.parseFloat(geometry.bodyLineHeight)).toBeCloseTo(23.2, 3);
  expect(geometry.bodyFont).toBe(geometry.tokenFont);
  expect(geometry.bodyColor).toBe(geometry.tokenColor);
  expect(geometry.bodyBackground).toBe(geometry.tokenBackground);
  expect(geometry.linkColor).toBe(geometry.tokenLink);
  await page.screenshot({
    path: 'test-results/document-baseline-wide.png',
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
  await page.screenshot({
    path: 'test-results/document-baseline-narrow.png',
    fullPage: true,
  });
});
