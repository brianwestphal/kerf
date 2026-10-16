import { expect, test } from '@playwright/test';

// A List or Row's `middle`/`center` gathers its children in the middle with
// their gap; `space-around` spreads them.
test('List middle and Row center gather children; space-around spreads them', async ({
  page,
}) => {
  await page.goto('/?component=badge');
  const gaps = await page.evaluate(() => {
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;inset:0 auto auto 0;width:240px;height:240px';
    host.innerHTML = `
      <div class="kui-list" data-fill="true" data-h-align="center" data-v-align="middle" style="--_kui-list-gap:4px" id="middle"><span>Title</span><span>Copy</span></div>`;
    document.body.append(host);
    const measure = (vAlign: string, hAlign: string) => {
      const list = host.querySelector<HTMLElement>('#middle')!;
      list.dataset.vAlign = vAlign;
      list.dataset.hAlign = hAlign;
      const [a, b] = [...list.children].map((child) =>
        child.getBoundingClientRect(),
      );
      const box = list.getBoundingClientRect();
      return {
        gap: b!.top - a!.bottom,
        center: (a!.top + b!.bottom) / 2 - (box.top + box.bottom) / 2,
      };
    };
    const middle = measure('middle', 'center');
    const around = measure('around', 'around');
    host.innerHTML = `<div class="kui-row" data-h-align="center" data-v-align="middle" style="width:240px;--_kui-row-gap:4px"><span>A</span><span>B</span></div>`;
    const row = host.firstElementChild as HTMLElement;
    const [a, b] = [...row.children].map((child) =>
      child.getBoundingClientRect(),
    );
    const rowCenter = b!.left - a!.right;
    row.dataset.hAlign = 'around';
    const [c, d] = [...row.children].map((child) =>
      child.getBoundingClientRect(),
    );
    host.remove();
    return { middle, around, rowCenter, rowAround: d!.left - c!.right };
  });
  expect(gaps.middle.gap).toBeCloseTo(4, 0);
  expect(Math.abs(gaps.middle.center)).toBeLessThanOrEqual(1);
  expect(gaps.around.gap).toBeGreaterThan(40);
  expect(gaps.rowCenter).toBeCloseTo(4, 0);
  expect(gaps.rowAround).toBeGreaterThan(40);
});
