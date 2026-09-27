/**
 * KF-174: opt-in dev-mode warning when a node carrying an imperative
 * `addEventListener` listener is removed/rebuilt by the morph. The
 * `rebuiltListeners` switch is read through `devFlag()` — an
 * `enableWarnings()` override first, then `KERF_DEV_WARN_REBUILT_LISTENERS`
 * as the environment fallback — once per `mount()` call, at creation. These
 * tests set the env var in `beforeEach`, before any mount is created.
 *
 * The MutationObserver fires its callback asynchronously (microtask after
 * the mutation), so tests await `Promise.resolve()` (or use vi.waitFor)
 * before asserting on the warn spy.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';

import { devHooks } from '../../src/dev-hooks.js';
import { maybeWarnMissingRowKey } from '../../src/dev-row-key-warn.js';
import { each } from '../../src/each.js';
import { jsx, raw } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { popover } from '../../src/overlay.js';
import { signal } from '../../src/reactive.js';
import {
  enterProductionShape,
  restoreDevelopmentShape,
} from '../helpers/dev-shape.js';

const env = (
  globalThis as { process: { env: Record<string, string | undefined> } }
).process.env;

let root: HTMLElement;
let warnSpy: MockInstance<typeof console.warn>;

beforeEach(() => {
  env.KERF_DEV_WARN_REBUILT_LISTENERS = '1';
  root = document.createElement('div');
  document.body.appendChild(root);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = '';
  delete env.KERF_DEV_WARN_REBUILT_LISTENERS;
  warnSpy.mockRestore();
});

async function flushMutationObserver(): Promise<void> {
  // MutationObserver delivery is a microtask. Two awaits to cover environments
  // that batch deliveries through a second microtask.
  await Promise.resolve();
  await Promise.resolve();
}

describe('dev-listener-warn (KF-174, opt-in)', () => {
  function renderList(items: { id: number }[]): unknown {
    return jsx('ul', {
      children: each(items, (it) =>
        jsx('li', { 'data-key': String(it.id), children: String(it.id) }),
      ),
    });
  }

  it('warns when a listener-bearing row is rebuilt by the morph', async () => {
    const items = signal([{ id: 1 }]);
    mount(root, () => renderList(items.value) as never);
    const li1 = root.querySelector('li') as HTMLElement;
    li1.addEventListener('click', () => {});
    // Fresh-ref item — cache miss forces each() to rebuild the row node.
    items.value = [{ id: 1 }];
    await flushMutationObserver();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(
      /inside a mount\(\)-managed tree was removed\/rebuilt/,
    );
    expect(warnSpy.mock.calls[0][0]).toMatch(/delegate\(rootEl/);
  });

  it('warns at most once per mount (one-shot)', async () => {
    const items = signal([{ id: 1 }]);
    mount(root, () => renderList(items.value) as never);
    const li1 = root.querySelector('li') as HTMLElement;
    li1.addEventListener('click', () => {});
    items.value = [{ id: 1 }];
    await flushMutationObserver();
    const li2 = root.querySelector('li') as HTMLElement;
    li2.addEventListener('click', () => {});
    items.value = [{ id: 1 }];
    await flushMutationObserver();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('dedups per mount, not per process: a second mount still warns once', async () => {
    // docs/11 §11.3.2 — the owner of the rebuilt-listeners one-shot is the
    // mount. A module-global flag would silence every later buggy mount.
    const rootB = document.createElement('div');
    document.body.appendChild(rootB);
    const a = signal([{ id: 1 }]);
    const b = signal([{ id: 1 }]);
    mount(root, () => renderList(a.value) as never);
    mount(rootB, () => renderList(b.value) as never);

    (root.querySelector('li') as HTMLElement).addEventListener(
      'click',
      () => {},
    );
    a.value = [{ id: 1 }];
    await flushMutationObserver();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    // Mount A repeats the antipattern — still deduped for A.
    (root.querySelector('li') as HTMLElement).addEventListener(
      'click',
      () => {},
    );
    a.value = [{ id: 1 }];
    await flushMutationObserver();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    // Mount B has its own owner, so its first rebuild warns.
    (rootB.querySelector('li') as HTMLElement).addEventListener(
      'click',
      () => {},
    );
    b.value = [{ id: 1 }];
    await flushMutationObserver();
    expect(warnSpy).toHaveBeenCalledTimes(2);

    // ...and only once.
    (rootB.querySelector('li') as HTMLElement).addEventListener(
      'click',
      () => {},
    );
    b.value = [{ id: 1 }];
    await flushMutationObserver();
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('does NOT warn when the env var is unset (default off)', async () => {
    delete env.KERF_DEV_WARN_REBUILT_LISTENERS;
    const items = signal([{ id: 1 }]);
    mount(root, () => renderList(items.value) as never);
    const li1 = root.querySelector('li') as HTMLElement;
    li1.addEventListener('click', () => {});
    items.value = [{ id: 1 }];
    await flushMutationObserver();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn in production shape (no kerfjs/dev installed) even with the env var set', async () => {
    enterProductionShape();
    try {
      const items = signal([{ id: 1 }]);
      mount(root, () => renderList(items.value) as never);
      const li1 = root.querySelector('li') as HTMLElement;
      li1.addEventListener('click', () => {});
      items.value = [{ id: 1 }];
      await flushMutationObserver();
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      restoreDevelopmentShape();
    }
  });

  it('does NOT warn when a listener-bearing node survives the morph (no removal)', async () => {
    const cls = signal('a');
    mount(
      root,
      () =>
        jsx('div', {
          className: cls.value,
          children: jsx('span', { children: 'stable' }),
        }) as never,
    );
    const span = root.querySelector('span') as HTMLElement;
    span.addEventListener('click', () => {});
    cls.value = 'b';
    await flushMutationObserver();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('detects a marked descendant removed as part of a subtree removal', async () => {
    const items = signal([{ id: 1 }]);
    mount(
      root,
      () =>
        jsx('ul', {
          children: each(items.value, (it) =>
            jsx('li', {
              'data-key': String(it.id),
              children: jsx('span', { className: 'leaf', children: 'x' }),
            }),
          ),
        }) as never,
    );
    const leaf = root.querySelector('.leaf') as HTMLElement;
    leaf.addEventListener('click', () => {});
    items.value = [{ id: 1 }];
    await flushMutationObserver();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('walks deeper than one level: detects a marked grandchild', async () => {
    // Row layout: <li> > <div> > <span class="leaf">.
    // The walker pops <li>, finds no marker, pushes <div> (line 92 logic).
    // Pops <div>, finds no marker, pushes <span> (line 96 — inner-loop push).
    // Pops <span>, finds marker, returns true.
    const items = signal([{ id: 1 }]);
    mount(
      root,
      () =>
        jsx('ul', {
          children: each(items.value, (it) =>
            jsx('li', {
              'data-key': String(it.id),
              children: jsx('div', {
                children: jsx('span', { className: 'leaf', children: 'x' }),
              }),
            }),
          ),
        }) as never,
    );
    const leaf = root.querySelector('.leaf') as HTMLElement;
    leaf.addEventListener('click', () => {});
    items.value = [{ id: 1 }];
    await flushMutationObserver();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('does NOT warn when a removed subtree contains no listener-marked nodes', async () => {
    // Trigger the observer with a removal whose subtree has zero markers.
    // Exercises the descendant-walk's full traversal returning false.
    const items = signal([{ id: 1 }]);
    mount(root, () => renderList(items.value) as never);
    items.value = []; // removes the row; nothing was marked
    await flushMutationObserver();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not mark non-Element receivers when their addEventListener is called', () => {
    // Force the patched addEventListener to hit the `this instanceof Element`
    // false-branch by attaching a listener to document.
    mount(root, () => renderList([{ id: 1 }]) as never);
    document.addEventListener('click', () => {});
    expect(
      (document as unknown as Record<symbol, boolean>)[
        Symbol.for('kerfjs.devListener')
      ],
    ).toBeUndefined();
  });

  it('disconnects the observer on dispose so post-dispose mutations do not warn', async () => {
    const items = signal([{ id: 1 }]);
    const dispose = mount(root, () => renderList(items.value) as never);
    const li1 = root.querySelector('li') as HTMLElement;
    li1.addEventListener('click', () => {});
    dispose();
    // After dispose, manually remove the li to simulate post-teardown DOM churn.
    li1.remove();
    await flushMutationObserver();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('dev-listener-warn at the overlay host slot boundary (KF-J31B0Q)', () => {
  // A `kerfjs/overlay` surface in a `[data-kerf-overlay-host][data-morph-skip]`
  // slot is another mount's territory: the enclosing mount's morph never
  // touches it, so a removal there is never "rebuilt by this mount".
  function mountWithSlot(): HTMLElement {
    mount(root, () =>
      jsx('div', {
        children: [
          jsx('button', { id: 'anchor', children: 'open' }),
          jsx('div', {
            'data-kerf-overlay-host': '',
            'data-morph-skip': '',
          }),
        ],
      }),
    );
    return root.querySelector('[data-kerf-overlay-host]') as HTMLElement;
  }

  it('closing a slot-hosted popover whose control carries a listener does not warn', async () => {
    const slot = mountWithSlot();
    const pop = popover(
      document.getElementById('anchor') as HTMLElement,
      raw('<button id="pick">pick</button>'),
      { container: slot },
    );
    (document.getElementById('pick') as HTMLElement).addEventListener(
      'click',
      () => {},
    );
    pop.close();
    await flushMutationObserver();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("a genuine rebuild inside the surface is reported once, by the surface's own mount", async () => {
    const slot = mountWithSlot();
    const rows = signal([{ id: 1 }]);
    const pop = popover(
      document.getElementById('anchor') as HTMLElement,
      () =>
        jsx('ul', {
          children: each(rows.value, (r) =>
            jsx('li', { 'data-key': String(r.id), children: String(r.id) }),
          ),
        }) as never,
      { container: slot },
    );
    (pop.el.querySelector('li') as HTMLElement).addEventListener(
      'click',
      () => {},
    );
    rows.value = [{ id: 1 }]; // fresh ref: the row node is rebuilt
    await flushMutationObserver();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    pop.close();
  });

  it("the enclosing mount removing the slot itself does not report the surface's listeners", async () => {
    const withSlot = signal(true);
    mount(root, () =>
      jsx('div', {
        children: [
          jsx('button', { id: 'anchor', children: 'open' }),
          withSlot.value
            ? jsx('div', {
                'data-kerf-overlay-host': '',
                'data-morph-skip': '',
              })
            : '',
        ],
      }),
    );
    const slot = root.querySelector('[data-kerf-overlay-host]') as HTMLElement;
    const inner = document.createElement('button');
    slot.appendChild(inner);
    inner.addEventListener('click', () => {});
    withSlot.value = false;
    await flushMutationObserver();
    expect(slot.isConnected).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('a mount whose own root is a slot still reports its own rebuilds', async () => {
    root.setAttribute('data-kerf-overlay-host', '');
    root.setAttribute('data-morph-skip', '');
    const show = signal(true);
    mount(root, () =>
      show.value ? jsx('button', { id: 'gone', children: 'x' }) : jsx('p', {}),
    );
    (document.getElementById('gone') as HTMLElement).addEventListener(
      'click',
      () => {},
    );
    show.value = false;
    await flushMutationObserver();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('a listener-bearing node removed outside the slot still warns', async () => {
    const show = signal(true);
    mount(root, () =>
      jsx('div', {
        children: [
          show.value ? jsx('button', { id: 'gone', children: 'x' }) : '',
          jsx('div', { 'data-kerf-overlay-host': '', 'data-morph-skip': '' }),
        ],
      }),
    );
    (document.getElementById('gone') as HTMLElement).addEventListener(
      'click',
      () => {},
    );
    show.value = false;
    await flushMutationObserver();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe('maybeWarnMissingRowKey (KF-173 helper, branch coverage)', () => {
  let warnSpy: MockInstance<typeof console.warn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('is unreachable in production — the hook slot is empty without kerfjs/dev', () => {
    // The warner no longer self-gates on NODE_ENV. "Production" now means the
    // consumer never imported `kerfjs/dev`, so core's call site short-circuits
    // on an undefined slot and this module is never even loaded. Assert the
    // seam rather than an internal env read.
    enterProductionShape();
    try {
      expect(devHooks.missingRowKey).toBeUndefined();
      const el = document.createElement('li');
      const binding = {};
      devHooks.missingRowKey?.(el, '<li>x</li>', binding);
      expect(warnSpy).not.toHaveBeenCalled();
      // The flag is untouched, so a later dev-shape call still evaluates.
      expect(
        (binding as { warnedMissingKey?: boolean }).warnedMissingKey,
      ).toBeUndefined();
    } finally {
      restoreDevelopmentShape();
    }
  });

  it('is wired into the hook registry when kerfjs/dev is installed', () => {
    expect(devHooks.missingRowKey).toBe(maybeWarnMissingRowKey);
  });

  it('sets the warned flag on first call and short-circuits on subsequent calls', () => {
    const el = document.createElement('li');
    const binding = {};
    maybeWarnMissingRowKey(el, '<li>x</li>', binding);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect((binding as { warnedMissingKey?: boolean }).warnedMissingKey).toBe(
      true,
    );
    // Second call short-circuits at the flag check.
    maybeWarnMissingRowKey(el, '<li>y</li>', binding);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('does not warn (but sets the flag) when the row has an id', () => {
    const el = document.createElement('li');
    el.id = 'row-1';
    const binding = {};
    maybeWarnMissingRowKey(el, '<li id="row-1">x</li>', binding);
    expect(warnSpy).not.toHaveBeenCalled();
    expect((binding as { warnedMissingKey?: boolean }).warnedMissingKey).toBe(
      true,
    );
  });

  it('does not warn (but sets the flag) when the row has a data-key', () => {
    const el = document.createElement('li');
    el.setAttribute('data-key', '1');
    const binding = {};
    maybeWarnMissingRowKey(el, '<li data-key="1">x</li>', binding);
    expect(warnSpy).not.toHaveBeenCalled();
    expect((binding as { warnedMissingKey?: boolean }).warnedMissingKey).toBe(
      true,
    );
  });
});
