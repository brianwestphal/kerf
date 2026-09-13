import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

test('visually audits every sitemap route at desktop, tablet, and mobile widths', async ({ page, request }, testInfo) => {
  test.setTimeout(180_000);
  test.skip(process.env.KERF_FULL_VISUAL_AUDIT !== '1', 'Run explicitly with npm run test:visual.');
  test.skip(testInfo.project.name !== 'chromium', 'One browser captures the responsive visual matrix.');
  const sitemapResponse = await request.get('sitemap.xml');
  expect(sitemapResponse.ok()).toBe(true);
  const sitemap = await sitemapResponse.text();
  const allRoutes = [...sitemap.matchAll(/<loc>https:\/\/brianwestphal\.github\.io\/kerf\/(.*?)<\/loc>/g)]
    .map((match) => match[1] ?? '');
  expect(allRoutes).toHaveLength(52);
  const routes = process.env.KERF_VISUAL_ROUTE
    ? allRoutes.filter((route) => route === process.env.KERF_VISUAL_ROUTE)
    : allRoutes;
  expect(routes.length).toBeGreaterThan(0);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      const response = await page.goto(`./${route}`, { waitUntil: 'load' });
      expect.soft(response?.ok(), `${route || '/'} loads at ${viewport.name}`).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      const health = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>('main');
        const viewportWidth = document.documentElement.clientWidth;
        const brokenImages = [...document.images]
          .filter((image) => image.complete && image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src);
        const overflowingElements = [...document.querySelectorAll<HTMLElement>('body *')]
          .filter((element) => {
            if (element.closest('[data-site-sidebar]')) return false;
            const bounds = element.getBoundingClientRect();
            if (!(bounds.width > 0 && bounds.height > 0 && (bounds.right > viewportWidth + 1 || bounds.left < -1))) return false;
            let ancestor = element.parentElement;
            while (ancestor && ancestor !== document.body) {
              if (['auto', 'hidden', 'scroll', 'clip'].includes(getComputedStyle(ancestor).overflowX)) return false;
              ancestor = ancestor.parentElement;
            }
            return true;
          })
          .slice(0, 12)
          .map((element) => {
            const bounds = element.getBoundingClientRect();
            return `${element.tagName.toLowerCase()}.${element.className || '-'} [${Math.round(bounds.left)}, ${Math.round(bounds.right)}] ${element.textContent?.trim().slice(0, 80)}`;
          });
        return {
          documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          mainWidth: main?.getBoundingClientRect().width ?? 0,
          mainHeight: main?.getBoundingClientRect().height ?? 0,
          brokenImages,
          overflowingElements,
        };
      });
      const slug = route ? route.replaceAll('/', '__').replace(/__$/, '') : 'home';
      await page.screenshot({
        path: testInfo.outputPath(`${viewport.name}--${slug}.png`),
        fullPage: true,
        animations: 'disabled',
      });
      expect.soft(health.documentOverflow, `${route || '/'} horizontal overflow at ${viewport.name}: ${health.overflowingElements.join(' | ')}`).toBeLessThanOrEqual(1);
      expect.soft(health.mainWidth, `${route || '/'} main width at ${viewport.name}`).toBeGreaterThan(0);
      expect.soft(health.mainHeight, `${route || '/'} main height at ${viewport.name}`).toBeGreaterThan(0);
      expect.soft(health.brokenImages, `${route || '/'} broken images at ${viewport.name}`).toEqual([]);
    }
  }
});
