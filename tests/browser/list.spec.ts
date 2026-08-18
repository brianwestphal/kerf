/**
 * Real-browser spec for `kerfjs/list` virtualization — real layout (clientHeight
 * / scrollTop) and real scroll events, which happy-dom can't model. The keyed
 * reconcile + per-row reactivity are unit-tested in `tests/unit/list.test.ts`.
 */
import { expect, test } from '@playwright/test';

 

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as unknown as { kerfReady: boolean }).kerfReady === true);
});

test('virtualization: only the viewport window renders, and it shifts on real scroll', async ({ page }) => {
  await page.evaluate(() => {
    // Only the scroll host needs CSS; bindList sizes the rows itself (rowHeight).
    const style = document.createElement('style');
    style.textContent = '#vlist{height:200px;overflow:auto}';
    document.head.appendChild(style);

    const parent = document.createElement('div');
    parent.id = 'vlist';
    document.body.appendChild(parent);

    const { bindList } = (window as any).kerfList;
    const { signal } = (window as any).kerf;
    const items = signal(Array.from({ length: 1000 }, (_, i) => ({ id: i, label: `row-${i}` })));
    (window as any)._dispose = bindList(parent, items, {
      key: (i: any) => i.id,
      tag: 'div',
      render: (i: any) => i.label,
      virtualize: { rowHeight: 20, overscan: 3 },
    });
  });

  // Rows live inside the inner sizer: #vlist (scroll host) > div (sizer) > div (rows).
  const rows = page.locator('#vlist > div > div');

  // Only the viewport window is in the DOM — nowhere near 1000 rows.
  const initial = await rows.count();
  expect(initial).toBeLessThan(40);
  await expect(rows.first()).toHaveText('row-0');

  // Scroll down 200 rows; confirm the container is actually scrollable there.
  const scrolled = await page.evaluate(() => {
    const el = document.getElementById('vlist') as HTMLElement;
    el.scrollTop = 4000;
    el.dispatchEvent(new Event('scroll'));
    return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight };
  });
  expect(scrolled.scrollHeight).toBeGreaterThan(19000);
  expect(scrolled.scrollTop).toBeGreaterThan(3000);

  // The window shifts (rAF-throttled) to around row 197.
  await page.waitForFunction(() => {
    const first = document.querySelector('#vlist > div > div');
    return first !== null && first.textContent !== 'row-0';
  });
  const firstText = await rows.first().textContent();
  expect(Number(firstText?.replace('row-', ''))).toBeGreaterThan(190);

  // Padding on the inner sizer keeps scrollHeight honest (total ≈ 1000 * 20 = 20000).
  const padTop = await page.evaluate(
    () => ((document.getElementById('vlist') as HTMLElement).firstElementChild as HTMLElement).style.paddingTop,
  );
  expect(Number(padTop.replace('px', ''))).toBeGreaterThan(3000);

  await page.evaluate(() => (window as any)._dispose());
  await expect(rows).toHaveCount(0);
});
