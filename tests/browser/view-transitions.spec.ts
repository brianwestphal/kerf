/** Consumer-owned View Transition recipes over the shipped list paths. */
import { expect, type Page, test } from '@playwright/test';

type ListKind = 'each' | 'bindList';
type SourceKind = 'signal' | 'arraySignal';

const CSS = `
  body { margin: 0; font: 16px system-ui, sans-serif; }
  #root { padding: 24px; }
  .vt-list { display: grid; gap: 8px; width: 240px; padding: 0; list-style: none; }
  .vt-row { box-sizing: border-box; display: flex; align-items: center; gap: 8px;
    height: 48px; padding: 8px 12px; border-radius: 8px; background: #ddeafb;
    view-transition-name: var(--row-vt-name); }
  .vt-row input { min-width: 0; width: 90px; }
  ::view-transition-old(root), ::view-transition-new(root) { animation: none; }
  ::view-transition-group(vt-primary-a), ::view-transition-group(vt-primary-b),
  ::view-transition-group(vt-primary-c), ::view-transition-group(vt-primary-d) {
    animation-duration: 400ms; }
  ::view-transition-old(vt-primary-a), ::view-transition-old(vt-primary-b),
  ::view-transition-old(vt-primary-c), ::view-transition-old(vt-primary-d) {
    animation: 400ms ease-out both vt-leave; }
  ::view-transition-new(vt-primary-a), ::view-transition-new(vt-primary-b),
  ::view-transition-new(vt-primary-c), ::view-transition-new(vt-primary-d) {
    animation: 400ms ease-out both vt-enter; }
  @keyframes vt-enter { from { opacity: 0; } to { opacity: 1; } }
  @keyframes vt-leave { from { opacity: 1; } to { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) {
      animation-duration: 0.01ms !important; }
  }
`;

async function setup(page: Page, kind: ListKind, source: SourceKind) {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(
    () => (window as unknown as { kerfReady: boolean }).kerfReady === true,
  );
  await page.addStyleTag({ content: CSS });
  await page.evaluate(
    async ({ kind, source }) => {
      const { each, mount, signal } = (window as any).kerf;
      const { bindList } = (window as any).kerfList;
      const { jsx } = (window as any).jsxRuntime;
      const { arraySignal } = await import('kerfjs/array-signal');
      type Row = { id: string; label: string };
      const initial: Row[] = [
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta' },
        { id: 'c', label: 'Gamma' },
      ];
      const rows: any =
        source === 'arraySignal' ? arraySignal(initial) : signal(initial);
      const host = document.getElementById('root')!;
      const render = (row: Row) =>
        jsx('li', {
          class: 'vt-row',
          'data-key': row.id,
          style: `--row-vt-name:vt-primary-${row.id}`,
          children: [
            row.label,
            jsx('input', { 'aria-label': `${row.label} note` }),
          ],
        });
      if (kind === 'each') {
        mount(host, () =>
          jsx('ul', {
            class: 'vt-list',
            children: each(
              source === 'arraySignal' ? rows : rows.value,
              render,
            ),
          }),
        );
      } else {
        host.className = 'vt-list';
        bindList(host, rows, {
          key: (row: Row) => row.id,
          render: (row: Row) => {
            const li = document.createElement('li');
            li.className = 'vt-row';
            li.dataset.key = row.id;
            li.style.setProperty('--row-vt-name', `vt-primary-${row.id}`);
            li.textContent = row.label;
            const input = document.createElement('input');
            input.setAttribute('aria-label', `${row.label} note`);
            li.append(input);
            return li;
          },
        });
      }
      const events: string[] = [];
      const apply = (
        action: 'reorder' | 'insert' | 'remove' | 'empty' | 'refill',
      ) => {
        events.push(`update:${action}`);
        if (source === 'arraySignal') {
          if (action === 'reorder') rows.move(2, 0);
          else if (action === 'insert')
            rows.insert(1, { id: 'd', label: 'Delta' });
          else if (action === 'remove') rows.remove(2);
          else if (action === 'empty') rows.replace([]);
          else rows.replace(initial);
        } else {
          const current = rows.value as Row[];
          if (action === 'reorder')
            rows.value = [current[2]!, current[0]!, current[1]!];
          else if (action === 'insert')
            rows.value = [
              current[0]!,
              { id: 'd', label: 'Delta' },
              ...current.slice(1),
            ];
          else if (action === 'remove')
            rows.value = current.filter((row) => row.id !== 'a');
          else if (action === 'empty') rows.value = [];
          else rows.value = initial;
        }
        events.push(
          `dom:${[...host.querySelectorAll('[data-key]')].map((el) => (el as HTMLElement).dataset.key).join(',')}`,
        );
      };
      const queued: Parameters<typeof apply>[0][] = [];
      let pendingCapture = false;
      let active: ViewTransition | undefined;
      const change = (action: Parameters<typeof apply>[0]) => {
        const update = () => apply(action);
        if (
          !document.startViewTransition ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          update();
          return undefined;
        }
        if (pendingCapture) {
          events.push(`queued:${action}`);
          queued.push(action);
          return active;
        }
        if (active) {
          update();
          return active;
        }
        events.push(`start:${action}`);
        pendingCapture = true;
        const transition = document.startViewTransition(() => {
          try {
            update();
            for (const next of queued.splice(0)) apply(next);
          } finally {
            pendingCapture = false;
          }
        });
        active = transition;
        void transition.finished.then(
          () => {
            if (active === transition) active = undefined;
          },
          () => {
            if (active === transition) active = undefined;
          },
        );
        (window as any)._transition = transition;
        return transition;
      };
      (window as any)._vt = { rows, apply, change, events };
    },
    { kind, source },
  );
}

async function order(page: Page) {
  return page
    .locator('#root [data-key]')
    .evaluateAll((elements) =>
      elements.map((element) => (element as HTMLElement).dataset.key),
    );
}

for (const kind of ['each', 'bindList'] as const) {
  for (const source of ['signal', 'arraySignal'] as const) {
    test(`${kind} ${source}: app transition wraps reorder, insert, remove, empty and refill`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: 900, height: 700 });
      await setup(page, kind, source);
      expect(await order(page)).toEqual(['a', 'b', 'c']);
      const supported = await page.evaluate(() =>
        Boolean(document.startViewTransition),
      );

      const before = await page.evaluate(() => {
        const vt = (window as any)._vt;
        const transition = vt.change('reorder');
        return { events: [...vt.events], transition: Boolean(transition) };
      });
      expect(before.transition).toBe(supported);
      if (supported) expect(before.events).toEqual(['start:reorder']);
      await page.evaluate(async () => {
        await (window as any)._transition?.updateCallbackDone;
      });
      expect(await order(page)).toEqual(['c', 'a', 'b']);
      const events = await page.evaluate(() => (window as any)._vt.events);
      expect(events).toContain('dom:c,a,b');
      if (supported) {
        await page.evaluate(async () => (window as any)._transition.ready);
        const animations = await page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((animation) =>
                (
                  animation.effect as KeyframeEffect | null
                )?.pseudoElement?.includes('view-transition'),
              ).length,
        );
        expect(animations).toBeGreaterThan(0);
        if (
          kind === 'each' &&
          source === 'signal' &&
          testInfo.project.name === 'chromium'
        )
          await page.screenshot({
            path: testInfo.outputPath('view-transition-reorder.png'),
          });
      }
      await page.evaluate(async () => (window as any)._transition?.finished);
      for (const [action, expected] of [
        ['insert', ['c', 'd', 'a', 'b']],
        ['remove', ['c', 'd', 'b']],
        ['empty', []],
        ['refill', ['a', 'b', 'c']],
      ] as const) {
        await page.evaluate(async (next) => {
          const transition = (window as any)._vt.change(next);
          await transition?.updateCallbackDone;
        }, action);
        expect(await order(page)).toEqual(expected);
        await page.evaluate(async () => (window as any)._transition?.finished);
      }
    });
  }
}

test('narrow viewport keeps named rows readable through reorder', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, 'each', 'signal');
  const transitionSupported = await page.evaluate(() =>
    Boolean(document.startViewTransition),
  );
  await page.evaluate(async () => {
    const transition = (window as any)._vt.change('reorder');
    await transition?.ready;
  });
  expect(await order(page)).toEqual(['c', 'a', 'b']);
  const rows = await page.locator('#root .vt-row').evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    }),
  );
  expect(
    rows.every((row) => row.left >= 0 && row.right <= 390 && row.width >= 200),
  ).toBe(true);
  if (transitionSupported && testInfo.project.name === 'chromium') {
    await page.screenshot({
      path: testInfo.outputPath('view-transition-narrow-reorder.png'),
    });
  }
});

test('one snapshot updates nested each rows and a sibling bindList with unique names', async ({
  page,
}) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as any).kerfReady === true);
  await page.addStyleTag({ content: CSS });
  const result = await page.evaluate(async () => {
    const { each, mount, signal } = (window as any).kerf;
    const { bindList } = (window as any).kerfList;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;
    const nested = signal([{ id: 'one' }, { id: 'two' }]);
    const sibling = signal([{ id: 'one' }, { id: 'two' }]);
    const row = (scope: string, id: string) =>
      jsx('li', {
        class: 'vt-row',
        'data-key': `${scope}-${id}`,
        style: `--row-vt-name:vt-${scope}-${id}`,
        children: id,
      });
    const nestedHost = document.createElement('div');
    const siblingHost = document.createElement('ul');
    siblingHost.className = 'vt-list';
    root.replaceChildren(nestedHost, siblingHost);
    mount(nestedHost, () =>
      jsx('section', {
        children: jsx('ul', {
          class: 'vt-list',
          children: each(nested.value, (item: { id: string }) =>
            row('nested', item.id),
          ),
        }),
      }),
    );
    bindList(siblingHost, sibling, {
      key: (item: { id: string }) => item.id,
      render: (item: { id: string }) => {
        const li = document.createElement('li');
        li.className = 'vt-row';
        li.dataset.key = `sibling-${item.id}`;
        li.style.setProperty('--row-vt-name', `vt-sibling-${item.id}`);
        li.textContent = item.id;
        return li;
      },
    });
    const namesBefore = [...root.querySelectorAll('.vt-row')].map(
      (element) => window.getComputedStyle(element).viewTransitionName,
    );
    const update = () => {
      nested.value = [{ id: 'two' }, { id: 'three' }];
      sibling.value = [{ id: 'two' }, { id: 'three' }];
    };
    const transition = document.startViewTransition?.(update);
    if (transition) await transition.updateCallbackDone;
    else update();
    const namesAfter = [...root.querySelectorAll('.vt-row')].map(
      (element) => window.getComputedStyle(element).viewTransitionName,
    );
    return {
      namesBefore,
      namesAfter,
      keys: [...root.querySelectorAll('[data-key]')].map(
        (element) => (element as HTMLElement).dataset.key,
      ),
      ready: transition
        ? await transition.ready.then(
            () => true,
            () => false,
          )
        : undefined,
    };
  });
  expect(new Set(result.namesBefore).size).toBe(4);
  expect(new Set(result.namesAfter).size).toBe(4);
  expect(result.keys).toEqual([
    'nested-two',
    'nested-three',
    'sibling-two',
    'sibling-three',
  ]);
  if (result.ready !== undefined) expect(result.ready).toBe(true);
});

test('unsupported API and reduced motion update directly once', async ({
  page,
}) => {
  await setup(page, 'each', 'signal');
  await page.evaluate(() => {
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: undefined,
    });
    (window as any)._vt.change('reorder');
  });
  expect(await order(page)).toEqual(['c', 'a', 'b']);
  expect(await page.evaluate(() => (window as any)._vt.events)).toEqual([
    'update:reorder',
    'dom:c,a,b',
  ]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page, 'each', 'signal');
  await page.evaluate(() => (window as any)._vt.change('reorder'));
  expect(await order(page)).toEqual(['c', 'a', 'b']);
  expect(await page.evaluate(() => (window as any)._vt.events)).toEqual([
    'update:reorder',
    'dom:c,a,b',
  ]);
});

test('rapid edits preserve update order and apply during motion without waiting', async ({
  page,
}) => {
  await setup(page, 'each', 'arraySignal');
  const supported = await page.evaluate(() =>
    Boolean(document.startViewTransition),
  );
  await page.evaluate(() => {
    const vt = (window as any)._vt;
    vt.change('reorder');
    vt.change('insert');
    vt.change('remove');
  });
  await page.evaluate(
    async () => (window as any)._transition?.updateCallbackDone,
  );
  expect(await order(page)).toEqual(['c', 'd', 'b']);
  const events = await page.evaluate(() => (window as any)._vt.events);
  if (supported) {
    expect(events.slice(0, 3)).toEqual([
      'start:reorder',
      'queued:insert',
      'queued:remove',
    ]);
    await page.evaluate(async () => (window as any)._transition.ready);
    await page.evaluate(() => (window as any)._vt.change('refill'));
    expect(await order(page)).toEqual(['a', 'b', 'c']);
  }
});

for (const kind of ['each', 'bindList'] as const) {
  test(`${kind} retains focused row input and selection through reorder`, async ({
    page,
  }) => {
    await setup(page, kind, 'signal');
    const input = page.getByRole('textbox', { name: 'Beta note' });
    await input.fill('draft');
    await input.evaluate((element: HTMLInputElement) => {
      element.focus();
      element.setSelectionRange(2, 2);
      (window as any)._focusedInput = element;
    });
    await page.evaluate(async () => {
      const transition = (window as any)._vt.change('reorder');
      await transition?.updateCallbackDone;
    });
    expect(await order(page)).toEqual(['c', 'a', 'b']);
    expect(await input.inputValue()).toBe('draft');
    expect(
      await input.evaluate((element: HTMLInputElement) => ({
        same: element === (window as any)._focusedInput,
        focused: element === document.activeElement,
        selection: element.selectionStart,
      })),
    ).toEqual({ same: true, focused: true, selection: 2 });
  });
}
