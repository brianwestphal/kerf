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

// Keyed reorders relocate rows with `Node.prototype.moveBefore()` where the
// engine ships it (Chromium) and fall back to `insertBefore()` elsewhere
// (Firefox / WebKit). Either way a reorder is not a removal: an attach()ed
// widget inside a moved row keeps its node and is torn down only when its row
// genuinely leaves. happy-dom has no moveBefore, so the unit suite can run only
// the insertBefore fallback; this spec exercises the real engines.
for (const host of ['each()', 'bindList'] as const) {
  test(`attach(): a widget in a ${host} row survives a keyed reorder and tears down on removal`, async ({
    page,
  }) => {
    const result = await page.evaluate(async (hostKind) => {
      const { mount, each, signal } = (window as any).kerf;
      const { jsx } = (window as any).jsxRuntime;
      const { bindList } = (window as any).kerfList;
      const { attach } = (window as any).kerfAttach;
      // attach() observes removal with a MutationObserver; a macrotask turn
      // flushes its records.
      const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

      // Count real moveBefore calls so the spec proves which path ran.
      const proto = Element.prototype as unknown as {
        moveBefore?: (node: Node, ref: Node | null) => void;
      };
      const nativeMove = proto.moveBefore;
      let moveBeforeCalls = 0;
      if (nativeMove !== undefined) {
        proto.moveBefore = function (this: Element, node, ref) {
          moveBeforeCalls++;
          nativeMove.call(this, node, ref);
        };
      }

      const root = document.createElement('div');
      document.body.appendChild(root);
      const a = { id: 'a' };
      const b = { id: 'b' };
      const c = { id: 'c' };
      const rows = signal([a, b, c]);
      const teardowns: string[] = [];
      const widgets = new Map<string, HTMLElement>();
      const wire = (id: string, widget: HTMLElement) => {
        widget.dataset.id = id;
        widgets.set(id, widget);
        attach(widget, () => () => teardowns.push(id));
      };

      if (hostKind === 'each()') {
        mount(root, () =>
          jsx('ul', {
            children: each(
              rows.value,
              (r: any) =>
                jsx('li', {
                  'data-key': r.id,
                  children: jsx('div', {
                    class: 'widget',
                    'data-morph-skip': true,
                  }),
                }),
              (r: any) => r.id,
            ),
          }),
        );
        for (const id of ['a', 'b', 'c']) {
          wire(
            id,
            root.querySelector<HTMLElement>(`li[data-key="${id}"] .widget`)!,
          );
        }
      } else {
        bindList(root, rows, {
          key: (r: any) => r.id,
          render: (r: any) => {
            const el = document.createElement('div');
            el.className = 'widget';
            wire(r.id, el);
            return el;
          },
        });
      }
      await flush();

      const live = () => [...root.querySelectorAll<HTMLElement>('.widget')];
      const order = () => live().map((el) => el.dataset.id);

      rows.value = [c, a, b];
      await flush();
      const afterReorder = {
        order: order(),
        sameNodes: [...widgets.values()].every((el) => live().includes(el)),
        teardowns: [...teardowns],
      };

      rows.value = [c, b];
      await flush();
      const afterRemoval = { order: order(), teardowns: [...teardowns] };

      if (nativeMove !== undefined) proto.moveBefore = nativeMove;
      return {
        supportsMoveBefore: nativeMove !== undefined,
        moveBeforeCalls,
        afterReorder,
        afterRemoval,
      };
    }, host);

    expect(result.afterReorder).toEqual({
      order: ['c', 'a', 'b'],
      sameNodes: true,
      teardowns: [],
    });
    expect(result.afterRemoval).toEqual({
      order: ['c', 'b'],
      teardowns: ['a'],
    });
    // Where the engine ships moveBefore, the reorder must have used it.
    if (result.supportsMoveBefore) {
      expect(result.moveBeforeCalls).toBeGreaterThan(0);
    } else {
      expect(result.moveBeforeCalls).toBe(0);
    }
  });
}
