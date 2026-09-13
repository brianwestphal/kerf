import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

const distRoot = fileURLToPath(new URL('../dist/', import.meta.url));

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

const clientRedirects = new Map([
  ['examples/basics/09-raw-sanitise/', '**/examples/basics/09-raw-sanitize/'],
]);

async function builtHtmlRoutes(directory = distRoot): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const routes = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return builtHtmlRoutes(path);
    if (!entry.isFile() || !entry.name.endsWith('.html')) return [];

    const outputPath = relative(distRoot, path).split(sep).join('/');
    if (outputPath === 'index.html') return [''];
    if (outputPath.endsWith('/index.html')) return [outputPath.slice(0, -'index.html'.length)];
    return [outputPath];
  }));
  return routes.flat();
}

test('visually audits every built HTML surface at desktop, tablet, and mobile widths', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  test.skip(process.env.KERF_FULL_VISUAL_AUDIT !== '1', 'Run explicitly with npm run test:visual.');
  test.skip(testInfo.project.name !== 'chromium', 'One browser captures the responsive visual matrix.');
  const allRoutes = (await builtHtmlRoutes()).sort();
  expect(allRoutes).toHaveLength(75);
  const routes = process.env.KERF_VISUAL_ROUTE
    ? allRoutes.filter((route) => route === process.env.KERF_VISUAL_ROUTE)
    : allRoutes;
  expect(routes.length).toBeGreaterThan(0);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      const response = await page.goto(`./${route}`, { waitUntil: 'load' });
      const responseIsHealthy = response?.ok() || (route === '404.html' && response?.status() === 404);
      expect.soft(responseIsHealthy, `${route || '/'} loads at ${viewport.name}`).toBe(true);
      const redirectDestination = clientRedirects.get(route);
      if (redirectDestination) await page.waitForURL(redirectDestination);
      await page.evaluate(() => document.fonts.ready);
      const health = await page.evaluate(() => {
        const content = document.querySelector<HTMLElement>('main, [role="main"], #app, #root') ?? document.body;
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
          contentWidth: content.getBoundingClientRect().width,
          contentHeight: content.getBoundingClientRect().height,
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
      expect.soft(health.contentWidth, `${route || '/'} content width at ${viewport.name}`).toBeGreaterThan(0);
      expect.soft(health.contentHeight, `${route || '/'} content height at ${viewport.name}`).toBeGreaterThan(0);
      expect.soft(health.brokenImages, `${route || '/'} broken images at ${viewport.name}`).toEqual([]);
    }
  }
});
