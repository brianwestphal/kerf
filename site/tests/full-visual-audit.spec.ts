import { readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

const SITE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = resolve(SITE_ROOT, 'dist');
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

function emittedRoutes(): string[] {
  return readdirSync(DIST, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => relative(DIST, resolve(entry.parentPath, entry.name)))
    .map((path) => path.replaceAll('\\', '/'))
    .map((path) =>
      path === 'index.html'
        ? ''
        : path.endsWith('/index.html')
          ? path.slice(0, -'index.html'.length)
          : path,
    )
    .sort();
}

function normalizeRequestedRoute(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  let path = raw.trim();
  if (/^https?:\/\//.test(path)) path = new URL(path).pathname;
  path = path.replace(/[?#].*$/, '').replace(/^\/+|\/+$/g, '');
  if (path === 'kerf') return '';
  path = path.replace(/^kerf\//, '').replace(/\/+$/, '');
  if (path === '') return '';
  return path.endsWith('.html') ? path : `${path}/`;
}

function screenshotName(route: string): string {
  return route === '' ? 'root' : encodeURIComponent(route);
}

test('normalizes route filters and discovers every emitted HTML surface', () => {
  expect(normalizeRequestedRoute(undefined)).toBeUndefined();
  expect(normalizeRequestedRoute('/')).toBe('');
  expect(normalizeRequestedRoute('/kerf')).toBe('');
  expect(normalizeRequestedRoute('https://brianwestphal.github.io/kerf/')).toBe(
    '',
  );
  expect(normalizeRequestedRoute('api')).toBe('api/');
  expect(normalizeRequestedRoute('/kerf/api/')).toBe('api/');
  expect(
    normalizeRequestedRoute(
      'https://brianwestphal.github.io/kerf/api/?x=1#top',
    ),
  ).toBe('api/');
  expect(normalizeRequestedRoute('/kerf/404.html')).toBe('404.html');

  const routes = emittedRoutes();
  expect(routes).toContain('');
  expect(routes).toContain('404.html');
  expect(new Set(routes.map(screenshotName)).size).toBe(routes.length);
  expect(screenshotName('')).not.toBe(screenshotName('root/'));
  expect(screenshotName('a/b/')).not.toBe(screenshotName('a__b/'));
});

test('visually audits every emitted site route at desktop, tablet, and mobile widths', async ({
  page,
}, testInfo) => {
  test.setTimeout(300_000);
  const allRoutes = emittedRoutes();
  expect(
    allRoutes.length,
    'the built site should emit at least one route',
  ).toBeGreaterThan(0);

  const filter = normalizeRequestedRoute(process.env.KERF_VISUAL_ROUTE);
  const routes =
    filter === undefined
      ? allRoutes
      : allRoutes.filter((route) => route === filter);
  expect(
    routes,
    `KERF_VISUAL_ROUTE=${process.env.KERF_VISUAL_ROUTE} did not match an emitted route`,
  ).not.toHaveLength(0);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      const response = await page.goto(`./${route}`, { waitUntil: 'load' });
      expect
        .soft(response?.ok(), `${route || '/'} loads at ${viewport.name}`)
        .toBe(true);
      // Some emitted compatibility pages use an immediate meta refresh. Let
      // that navigation settle before measuring the destination document.
      await page.waitForTimeout(100);
      await page.waitForLoadState('load');
      await page.waitForFunction(() => document.fonts.status === 'loaded');
      await page.evaluate(async () => {
        const images = [...document.images];
        for (const image of images) image.loading = 'eager';
        await Promise.race([
          Promise.all(
            images.map((image) =>
              image.complete
                ? Promise.resolve()
                : new Promise<void>((resolveImage) => {
                    image.addEventListener('load', () => resolveImage(), {
                      once: true,
                    });
                    image.addEventListener('error', () => resolveImage(), {
                      once: true,
                    });
                  }),
            ),
          ),
          new Promise<void>((resolveTimeout) => {
            setTimeout(resolveTimeout, 10_000);
          }),
        ]);
      });
      const health = await page.evaluate(() => {
        const contentRoot =
          document.querySelector<HTMLElement>(
            'main, [role="main"], #app, .demo-page',
          ) ?? document.body;
        const viewportWidth = document.documentElement.clientWidth;
        const brokenImages = [...document.images]
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src);
        const overflowingElements = [
          ...document.querySelectorAll<HTMLElement>('body *'),
        ]
          .filter((element) => {
            if (element.closest('[data-site-sidebar]')) return false;
            const bounds = element.getBoundingClientRect();
            if (!(
              bounds.width > 0 &&
              bounds.height > 0 &&
              (bounds.right > viewportWidth + 1 || bounds.left < -1)
            )) {
              return false;
            }
            let ancestor = element.parentElement;
            while (ancestor && ancestor !== document.body) {
              if (
                ['auto', 'hidden', 'scroll', 'clip'].includes(
                  getComputedStyle(ancestor).overflowX,
                )
              ) {
                return false;
              }
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
          documentOverflow:
            document.documentElement.scrollWidth - viewportWidth,
          contentWidth: contentRoot?.getBoundingClientRect().width ?? 0,
          contentHeight: contentRoot?.getBoundingClientRect().height ?? 0,
          brokenImages,
          overflowingElements,
        };
      });
      await page.screenshot({
        path: testInfo.outputPath(
          `${viewport.name}--${screenshotName(route)}.png`,
        ),
        fullPage: true,
        animations: 'disabled',
      });
      expect
        .soft(
          health.documentOverflow,
          `${route || '/'} horizontal overflow at ${viewport.name}: ${health.overflowingElements.join(' | ')}`,
        )
        .toBeLessThanOrEqual(1);
      expect
        .soft(
          health.contentWidth,
          `${route || '/'} primary content width at ${viewport.name}`,
        )
        .toBeGreaterThan(0);
      expect
        .soft(
          health.contentHeight,
          `${route || '/'} primary content height at ${viewport.name}`,
        )
        .toBeGreaterThan(0);
      expect
        .soft(
          health.brokenImages,
          `${route || '/'} broken images at ${viewport.name}`,
        )
        .toEqual([]);
    }
  }
});
