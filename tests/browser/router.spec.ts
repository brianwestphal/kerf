/**
 * Real-browser spec for `kerfjs/router` — the parts happy-dom can't model: real
 * `<a>` click navigation (no full reload), real browser Back/Forward driving
 * `popstate`, and the keyed outlet's DOM identity across route vs param changes.
 * The matching / navigation / link-guard logic is unit-tested in
 * `tests/unit/router.test.ts`.
 */
import { expect, type Page, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as unknown as { kerfReady: boolean }).kerfReady === true);
});

async function setup(page: Page): Promise<void> {
  await page.evaluate(() => {
    const { createRouter } = (window as any).kerfRouter;
    const { mount } = (window as any).kerf;
    const { raw } = (window as any).jsxRuntime;
    history.replaceState(null, '', '/tests/browser/fixtures/index.html');
    const router = createRouter({
      base: '/tests/browser/fixtures/index.html',
      routes: [
        { path: '/', component: () => raw('<div class="page home">Home</div>') },
        { path: '/users/:id', component: (p: any) => raw(`<div class="page user">User ${p.id}</div>`) },
        { path: '*', component: () => raw('<div class="page nf">Not found</div>') },
      ],
    });
    (window as any)._router = router;
    // A sentinel: a full page reload wipes this, so we can prove we did NOT reload.
    (window as any)._noReload = true;
    const app = document.createElement('div');
    app.id = 'app';
    document.body.appendChild(app);
    mount(app, () => raw(
      `<nav>
         <a id="home" href="/tests/browser/fixtures/index.html/" class="${router.activeClass('/', 'active').value}">Home</a>
         <a id="u1" href="/tests/browser/fixtures/index.html/users/1">User 1</a>
         <a id="u2" href="/tests/browser/fixtures/index.html/users/2">User 2</a>
       </nav>`,
    ) as any);
    // The outlet lives in its own mount so navigation only re-renders the routed view.
    const outlet = document.createElement('div');
    outlet.id = 'outlet';
    document.body.appendChild(outlet);
    mount(outlet, () => router.outlet());
  });
}

test('a real link click routes without a reload; the outlet swaps', async ({ page }) => {
  await setup(page);
  await expect(page.locator('#outlet .home')).toHaveText('Home');

  await page.locator('#u1').click();
  // Did NOT full-reload (the sentinel survives) and the URL + outlet changed.
  expect(await page.evaluate(() => (window as any)._noReload)).toBe(true);
  await expect(page.locator('#outlet .user')).toHaveText('User 1');
  expect(page.url()).toContain('/users/1');
  await expect(page.locator('#outlet .home')).toHaveCount(0);
});

test('browser Back / Forward drives popstate → the outlet follows', async ({ page }) => {
  await setup(page);
  await page.locator('#u1').click();
  await page.locator('#u2').click();
  await expect(page.locator('#outlet .user')).toHaveText('User 2');

  await page.goBack();
  await expect(page.locator('#outlet .user')).toHaveText('User 1');
  await page.goForward();
  await expect(page.locator('#outlet .user')).toHaveText('User 2');
});

test('outlet keeps DOM identity on a param change, replaces it across routes', async ({ page }) => {
  await setup(page);
  await page.locator('#u1').click();
  // Tag the current outlet wrapper so we can tell whether it survives.
  await page.evaluate(() => {
    (document.querySelector('#outlet [data-router-outlet]') as HTMLElement).dataset.tag = 'first';
  });

  // Same route, different param → SAME wrapper element (morph in place).
  await page.locator('#u2').click();
  await expect(page.locator('#outlet .user')).toHaveText('User 2');
  expect(await page.evaluate(
    () => (document.querySelector('#outlet [data-router-outlet]') as HTMLElement).dataset.tag,
  )).toBe('first'); // preserved

  // Cross-route → the wrapper is replaced (the tag is gone).
  await page.locator('#home').click();
  await expect(page.locator('#outlet .home')).toHaveText('Home');
  expect(await page.evaluate(
    () => (document.querySelector('#outlet [data-router-outlet]') as HTMLElement | null)?.dataset.tag,
  )).toBeUndefined(); // fresh element
});
