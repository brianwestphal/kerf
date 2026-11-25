import { expect, test } from '@playwright/test';
import { raw } from 'kerfjs';

import { Workbench } from '../../dist/workbench.js';

test('Workbench exposes its Pane scroll slot while nested app scrolling stays independent', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=workbench');
  const markup = String(
    Workbench({
      id: 'scroll-hook-specimen',
      label: 'Review',
      mainHeader: raw('<div data-test-fixed-header>Review header</div>'),
      mainPane: { contentClassName: 'app-review-pane-scroll' },
      main: raw(
        '<div class="app-nested-scroll"><div>Nested content</div></div>' +
          '<div data-test-pane-filler>Pane content</div>',
      ),
    }),
  );
  await page.evaluate((html) => {
    const host = document.createElement('div');
    host.style.cssText = 'width:300px;height:220px;background:white';
    host.innerHTML = html;
    document.body.append(host);
    const inner = host.querySelector<HTMLElement>('.app-nested-scroll')!;
    inner.style.cssText = 'height:80px;overflow:auto';
    inner.firstElementChild!.setAttribute('style', 'height:400px');
    host.querySelector<HTMLElement>('[data-test-pane-filler]')!.style.cssText =
      'height:400px;min-height:400px;flex:none';
  }, markup);
  const pane = page.locator('#scroll-hook-specimen [data-component="pane"]');
  const outer = pane.locator(':scope > .app-review-pane-scroll');
  const nested = outer.locator('.app-nested-scroll');
  await expect(outer).toHaveClass(/kui-pane__content/);
  await expect(pane.locator(':scope > .kui-pane__header')).toBeVisible();
  const state = await outer.evaluate((element) => {
    const inner = element.querySelector<HTMLElement>('.app-nested-scroll')!;
    inner.scrollTop = 40;
    const outerAfterInner = element.scrollTop;
    element.scrollTop = 30;
    return {
      outerAfterInner,
      outerAfterOuter: element.scrollTop,
      innerAfterOuter: inner.scrollTop,
      outerOverflow: window.getComputedStyle(element).overflowY,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    };
  });
  expect(state).toMatchObject({
    outerAfterInner: 0,
    outerAfterOuter: 30,
    innerAfterOuter: 40,
    outerOverflow: 'auto',
  });
  expect(state.scrollHeight).toBeGreaterThan(state.clientHeight);
  await expect(nested).toHaveCSS('overflow-y', 'auto');
  await pane.screenshot({
    path: testInfo.outputPath('workbench-scroll-region.png'),
  });
});
