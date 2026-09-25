/**
 * Real-browser regression for mount()'s transactional first render: when the
 * initial render throws AFTER the DOM write (here, an each() row with two
 * top-level elements, which the row contract rejects once the markup is
 * parsed), mount() rethrows the original error, restores the element's
 * pre-mount child nodes, releases the mounted marker and every wired binding,
 * and a retry on the same element mounts and stays reactive.
 */
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(
    () => (window as unknown as { kerfReady: boolean }).kerfReady === true,
  );
});

test('a failed first render rolls back and a retry on the same element works', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { mount, each, signal, computed } = (window as any).kerf;
    const { jsx, Fragment } = (window as any).jsxRuntime;
    const root = document.createElement('div');
    root.innerHTML = '<p id="ssr">server markup</p>';
    document.body.appendChild(root);
    const ssr = root.firstChild;

    const tick = signal(0);
    let reads = 0;
    let message = '';
    try {
      mount(root, () =>
        jsx('div', {
          children: [
            jsx('span', {
              children: computed(() => {
                reads++;
                return `t${tick.value}`;
              }),
            }),
            jsx('ul', {
              children: each([{ id: 1 }], () =>
                jsx(Fragment, {
                  children: [
                    jsx('li', { children: 'one' }),
                    jsx('li', { children: 'two' }),
                  ],
                }),
              ),
            }),
          ],
        }),
      );
    } catch (err) {
      message = (err as Error).message;
    }
    const restored = root.childNodes.length === 1 && root.firstChild === ssr;
    const readsAfterFailure = reads;
    tick.value = 1;
    const bindingReleased = reads === readsAfterFailure;

    const count = signal(1);
    const dispose = mount(root, () => jsx('b', { children: count.value }));
    const first = root.innerHTML;
    count.value = 2;
    const second = root.innerHTML;
    dispose();
    return { message, restored, bindingReleased, first, second };
  });

  expect(result.message).toMatch(/produced 2 top-level elements/);
  expect(result.restored).toBe(true);
  expect(result.bindingReleased).toBe(true);
  expect(result.first).toBe('<b>1</b>');
  expect(result.second).toBe('<b>2</b>');
});
