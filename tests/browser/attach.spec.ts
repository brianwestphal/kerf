import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(
    () => (window as unknown as { kerfReady: boolean }).kerfReady === true,
  );
});

test('attach(): a disconnected node tears down after later insertion and ancestor removal', async ({
  page,
}) => {
  const events = await page.evaluate(async () => {
    const parent = document.createElement('section');
    const node = document.createElement('div');
    parent.appendChild(node);
    const lifecycle: string[] = [];
    (window as any).kerfAttach.attach(node, () => {
      lifecycle.push('setup');
      return () => lifecycle.push('teardown');
    });

    document.body.appendChild(document.createElement('aside'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    lifecycle.push('still-disconnected');

    document.body.appendChild(parent);
    await new Promise((resolve) => setTimeout(resolve, 0));
    lifecycle.push('connected');

    parent.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return lifecycle;
  });

  expect(events).toEqual([
    'setup',
    'still-disconnected',
    'connected',
    'teardown',
  ]);
});

test('attach(): a disconnected shadow-tree node tears down when its host is removed', async ({
  page,
}) => {
  const events = await page.evaluate(async () => {
    const host = document.createElement('section');
    const shadow = host.attachShadow({ mode: 'closed' });
    const node = document.createElement('div');
    shadow.appendChild(node);
    const lifecycle: string[] = [];
    (window as any).kerfAttach.attach(node, () => {
      lifecycle.push('setup');
      return () => lifecycle.push('teardown');
    });

    document.body.appendChild(host);
    await new Promise((resolve) => setTimeout(resolve, 0));
    lifecycle.push('connected');

    host.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return lifecycle;
  });

  expect(events).toEqual(['setup', 'connected', 'teardown']);
});

test('attach(): detects direct insertion into an already-connected shadow root', async ({
  page,
}) => {
  const events = await page.evaluate(async () => {
    const host = document.createElement('section');
    const shadow = host.attachShadow({ mode: 'closed' });
    document.body.appendChild(host);
    const node = document.createElement('div');
    const lifecycle: string[] = [];
    (window as any).kerfAttach.attach(node, () => {
      lifecycle.push('setup');
      return () => lifecycle.push('teardown');
    });

    shadow.appendChild(node);
    await new Promise((resolve) =>
      globalThis.requestAnimationFrame(() => resolve(undefined)),
    );
    lifecycle.push('connected');

    node.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return lifecycle;
  });

  expect(events).toEqual(['setup', 'connected', 'teardown']);
});
