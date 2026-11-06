/**
 * KF-HK7WE8 — a delegated click must not re-fire on a target the synchronous
 * re-render recycled in place.
 *
 * Real-browser pin for the unit matrix in
 * tests/unit/delegate-dispatch-snapshot.test.tsx. A TRUSTED click
 * (`page.click`) differs from happy-dom's synthetic dispatch in one way that
 * matters here: the browser runs a microtask checkpoint after every listener
 * callback. The fix must not depend on anything a checkpoint could clear, so
 * this drives the ticket's exact shape — a footer of custom-element buttons
 * whose clicked control the morph recycles into the `cancel` action — through
 * a genuine user click.
 */
import { expect, type Page, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(
    () => (window as unknown as { kerfReady: boolean }).kerfReady === true,
  );
});

/** Mount the ticket's footer and wire the given delegation style. */
async function setup(page: Page, style: 'delegate' | 'actions'): Promise<void> {
  await page.evaluate((style) => {
    const { mount, signal, delegate } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const { delegateActions } = (window as any).kerfActions;
    if (!window.customElements.get('x-button')) {
      window.customElements.define('x-button', class extends HTMLElement {});
    }
    const root = document.getElementById('root')!;
    const confirming = signal(false);
    const hits: string[] = [];
    (window as any).hits = hits;
    (window as any).confirming = confirming;
    mount(root, () =>
      jsx('footer', {
        children: confirming.value
          ? [
              jsx('p', { children: 'Sure?' }),
              jsx('x-button', { 'data-action': 'cancel', children: 'Cancel' }),
              jsx('x-button', {
                'data-action': 'confirm',
                children: 'Confirm',
              }),
            ]
          : [
              jsx('x-button', {
                'data-action': 'request',
                children: 'Delete',
              }),
              jsx('x-button', { 'data-action': 'close', children: 'Close' }),
              jsx('x-button', { 'data-action': 'save', children: 'Save' }),
            ],
      }),
    );
    const request = (): void => {
      hits.push('request');
      confirming.value = true;
    };
    const cancel = (): void => {
      hits.push('cancel');
      confirming.value = false;
    };
    if (style === 'delegate') {
      delegate(root, 'click', '[data-action="request"]', request);
      delegate(root, 'click', '[data-action="cancel"]', cancel);
    } else {
      // Two tables on one root — the second must not see the recycled action.
      delegateActions(root, 'click', { request });
      delegateActions(root, 'click', { cancel });
    }
  }, style);
}

for (const style of ['delegate', 'actions'] as const) {
  test(`${style}: a trusted click on the recycled control fires only its own handler`, async ({
    page,
  }) => {
    await setup(page, style);
    await page.click('[data-action="request"]');
    const after = await page.evaluate(() => ({
      hits: [...(window as any).hits],
      confirming: (window as any).confirming.value,
      first: document
        .querySelector('#root x-button')!
        .getAttribute('data-action'),
    }));
    expect(after.hits).toEqual(['request']);
    expect(after.confirming).toBe(true);
    expect(after.first).toBe('cancel');

    // The recycled control now behaves as `cancel` on the NEXT click.
    await page.click('[data-action="cancel"]');
    const final = await page.evaluate(() => ({
      hits: [...(window as any).hits],
      confirming: (window as any).confirming.value,
    }));
    expect(final.hits).toEqual(['request', 'cancel']);
    expect(final.confirming).toBe(false);
  });
}

test('re-dispatching a stopped event object on another target resolves against the new dispatch (KF-50DWVS: a later delegate could consume a stale snapshot entry)', async ({
  page,
}) => {
  const hits = await page.evaluate(() => {
    const { delegate } = (window as any).kerf;
    const root = document.getElementById('root')!;
    root.innerHTML =
      '<div class="zone-a"><button class="a">a</button></div>' +
      '<div class="zone-b"><button class="b">b</button></div>';
    const out: string[] = [];
    delegate(root.querySelector('.zone-a'), 'click', 'button', (e: Event) => {
      out.push('stop');
      e.stopPropagation();
    });
    delegate(root, 'click', 'button', (_e: Event, el: Element) =>
      out.push(el.className),
    );
    const ev = new MouseEvent('click', { bubbles: true });
    root.querySelector('.a')!.dispatchEvent(ev);
    root.querySelector('.b')!.dispatchEvent(ev);
    return out;
  });
  expect(hits).toEqual(['stop', 'b']);
});
