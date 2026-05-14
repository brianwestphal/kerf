/**
 * KF-174: opt-in dev-mode warning when a node carrying an imperative
 * `addEventListener` listener is removed/rebuilt by the morph. The
 * `KERF_DEV_WARN_REBUILT_LISTENERS=1` gate is read on each `mount()` call,
 * so flipping the env var per-test is sufficient.
 *
 * The MutationObserver fires its callback asynchronously (microtask after
 * the mutation), so tests await `Promise.resolve()` (or use vi.waitFor)
 * before asserting on the warn spy.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetWarnedForTests } from '../../src/dev-listener-warn.js';
import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';
import { maybeWarnMissingRowKey } from '../../src/utils/rowContract.js';

const env = (globalThis as { process: { env: Record<string, string | undefined> } }).process.env;

let root: HTMLElement;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  env.KERF_DEV_WARN_REBUILT_LISTENERS = '1';
  _resetWarnedForTests();
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
      children: each(items, (it) => jsx('li', { 'data-key': String(it.id), children: String(it.id) })),
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
    expect(warnSpy.mock.calls[0][0]).toMatch(/inside a mount\(\)-managed tree was removed\/rebuilt/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/delegate\(rootEl/);
  });

  it('warns at most once per process (one-shot)', async () => {
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

  it('does NOT warn when NODE_ENV === \'production\' even with the env var set', async () => {
    const prevEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      const items = signal([{ id: 1 }]);
      mount(root, () => renderList(items.value) as never);
      const li1 = root.querySelector('li') as HTMLElement;
      li1.addEventListener('click', () => {});
      items.value = [{ id: 1 }];
      await flushMutationObserver();
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      env.NODE_ENV = prevEnv;
    }
  });

  it('does NOT warn when a listener-bearing node survives the morph (no removal)', async () => {
    const cls = signal('a');
    mount(root, () => jsx('div', { className: cls.value, children: jsx('span', { children: 'stable' }) }) as never);
    const span = root.querySelector('span') as HTMLElement;
    span.addEventListener('click', () => {});
    cls.value = 'b';
    await flushMutationObserver();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('detects a marked descendant removed as part of a subtree removal', async () => {
    const items = signal([{ id: 1 }]);
    mount(root, () => jsx('ul', {
      children: each(items.value, (it) => jsx('li', {
        'data-key': String(it.id),
        children: jsx('span', { className: 'leaf', children: 'x' }),
      })),
    }) as never);
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
    mount(root, () => jsx('ul', {
      children: each(items.value, (it) => jsx('li', {
        'data-key': String(it.id),
        children: jsx('div', { children: jsx('span', { className: 'leaf', children: 'x' }) }),
      })),
    }) as never);
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
    expect((document as unknown as Record<symbol, boolean>)[Symbol.for('kerfjs.devListener')]).toBeUndefined();
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

describe('maybeWarnMissingRowKey (KF-173 helper, branch coverage)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('is a no-op in production (NODE_ENV === \'production\')', () => {
    const prevEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      const el = document.createElement('li');
      const binding = {};
      maybeWarnMissingRowKey(el, 0, '<li>x</li>', binding);
      expect(warnSpy).not.toHaveBeenCalled();
      // The flag is NOT set in production — we short-circuit before the
      // mutation, so a subsequent dev-mode invocation on the same binding
      // still gets to evaluate.
      expect((binding as { warnedMissingKey?: boolean }).warnedMissingKey).toBeUndefined();
    } finally {
      env.NODE_ENV = prevEnv;
    }
  });

  it('sets the warned flag on first call and short-circuits on subsequent calls', () => {
    const el = document.createElement('li');
    const binding = {};
    maybeWarnMissingRowKey(el, 0, '<li>x</li>', binding);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect((binding as { warnedMissingKey?: boolean }).warnedMissingKey).toBe(true);
    // Second call short-circuits at the flag check.
    maybeWarnMissingRowKey(el, 1, '<li>y</li>', binding);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('does not warn (but sets the flag) when the row has an id', () => {
    const el = document.createElement('li');
    el.id = 'row-1';
    const binding = {};
    maybeWarnMissingRowKey(el, 0, '<li id="row-1">x</li>', binding);
    expect(warnSpy).not.toHaveBeenCalled();
    expect((binding as { warnedMissingKey?: boolean }).warnedMissingKey).toBe(true);
  });

  it('does not warn (but sets the flag) when the row has a data-key', () => {
    const el = document.createElement('li');
    el.setAttribute('data-key', '1');
    const binding = {};
    maybeWarnMissingRowKey(el, 0, '<li data-key="1">x</li>', binding);
    expect(warnSpy).not.toHaveBeenCalled();
    expect((binding as { warnedMissingKey?: boolean }).warnedMissingKey).toBe(true);
  });
});
