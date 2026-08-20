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

test('measured virtualization: observeRowHeights sizes rows from real layout', async ({ page }) => {
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = '#mlist{height:200px;overflow:auto}';
    document.head.appendChild(style);

    const parent = document.createElement('div');
    parent.id = 'mlist';
    document.body.appendChild(parent);

    const { bindList, observeRowHeights } = (window as any).kerfList;
    const { signal } = (window as any).kerf;
    const items = signal(Array.from({ length: 500 }, (_, i) => ({ id: i })));
    // Element mode: each row is a real 40px block — but the estimate is 20, so
    // the model is wrong until observeRowHeights measures the natural height.
    const list = bindList(parent, items, {
      key: (i: any) => i.id,
      render: (i: any) => {
        const el = document.createElement('div');
        el.style.height = '40px';
        el.textContent = `row-${i.id}`;
        return el;
      },
      virtualize: { rowHeight: { estimate: 20 }, overscan: 2 },
    });
    (window as any)._stop = observeRowHeights(list);
    (window as any)._dispose = list;
  });

  const rows = page.locator('#mlist > div > div');
  // Virtualized — only a window is in the DOM, not 500 rows.
  expect(await rows.count()).toBeLessThan(40);

  // Measured rows keep their NATURAL height (40px), not the 20px estimate —
  // bindList must not force a height in measured mode, or measurement is circular.
  const firstBox = await rows.first().boundingBox();
  expect(firstBox?.height).toBeCloseTo(40, 0);

  // After the ResizeObserver reports the real heights, the sizer's scrollHeight
  // reflects measured rows (≈40) rather than the 20px estimate — it grows.
  await page.waitForFunction(() => {
    const sizer = (document.getElementById('mlist') as HTMLElement).firstElementChild as HTMLElement;
    return parseFloat(sizer.style.paddingBottom || '0') > 0;
  });
  const scrollHeight = await page.evaluate(() => (document.getElementById('mlist') as HTMLElement).scrollHeight);
  expect(scrollHeight).toBeGreaterThan(500 * 20); // beyond the pure-estimate baseline

  // The window still shifts on scroll.
  await page.evaluate(() => {
    const el = document.getElementById('mlist') as HTMLElement;
    el.scrollTop = 2000;
    el.dispatchEvent(new Event('scroll'));
  });
  await page.waitForFunction(() => {
    const first = document.querySelector('#mlist > div > div');
    return first !== null && first.textContent !== 'row-0';
  });

  await page.evaluate(() => {
    (window as any)._stop();
    (window as any)._dispose();
  });
  await expect(rows).toHaveCount(0);
});
