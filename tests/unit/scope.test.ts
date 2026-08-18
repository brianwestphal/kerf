import { afterEach, describe, expect, it, vi } from 'vitest';

import { signal } from '../../src/reactive.js';
import { disposeScope, disposeSubtree, observeRemovals } from '../../src/scope.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('disposeScope()', () => {
  it('returns the SAME scope for the same element (keyed, accumulating)', () => {
    const el = document.createElement('div');
    expect(disposeScope(el)).toBe(disposeScope(el));
  });

  it('add() registers a disposer; dispose() runs them all best-effort and is idempotent', () => {
    const el = document.createElement('div');
    const s = disposeScope(el);
    const order: string[] = [];
    s.add(() => order.push('a'));
    s.add(() => {
      throw new Error('boom'); // a throwing disposer must not strand the rest
    });
    expect(s.add(() => order.push('c'))).toBeInstanceOf(Function); // add returns the disposer

    expect(() => s.dispose()).not.toThrow();
    expect(order).toEqual(['a', 'c']);

    s.dispose(); // idempotent — nothing runs again
    expect(order).toEqual(['a', 'c']);
  });

  it('after dispose(), disposeScope(el) starts a fresh scope', () => {
    const el = document.createElement('div');
    const s1 = disposeScope(el);
    s1.dispose();
    expect(disposeScope(el)).not.toBe(s1);
  });

  it('scope.mount registers the mount disposer (stops updating after dispose)', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const label = signal('x');
    const s = disposeScope(el);
    s.mount(el, () => label.value);
    expect(el.textContent).toBe('x');
    label.value = 'y';
    expect(el.textContent).toBe('y');
    s.dispose();
    label.value = 'z';
    expect(el.textContent).toBe('y'); // mount disposed — no more updates
  });

  it('scope.effect registers the effect disposer (stops re-running after dispose)', () => {
    const el = document.createElement('div');
    const sig = signal(0);
    const runs: number[] = [];
    const s = disposeScope(el);
    s.effect(() => { runs.push(sig.value); });
    sig.value = 1;
    expect(runs).toEqual([0, 1]);
    s.dispose();
    sig.value = 2;
    expect(runs).toEqual([0, 1]);
  });

  it('scope.delegate registers the delegate disposer (listener removed after dispose)', () => {
    const el = document.createElement('div');
    el.innerHTML = '<button class="b">b</button>';
    document.body.appendChild(el);
    const fn = vi.fn();
    const s = disposeScope(el);
    s.delegate(el, 'click', '.b', fn);
    (el.querySelector('.b') as HTMLElement).click();
    expect(fn).toHaveBeenCalledTimes(1);
    s.dispose();
    (el.querySelector('.b') as HTMLElement).click();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('disposeSubtree()', () => {
  it('disposes the root scope AND every descendant scope, then clears them', () => {
    const root = document.createElement('div');
    const child = document.createElement('div');
    root.appendChild(child);
    document.body.appendChild(root);

    const calls: string[] = [];
    disposeScope(root).add(() => calls.push('root'));
    disposeScope(child).add(() => calls.push('child'));

    disposeSubtree(root);
    expect(calls.sort()).toEqual(['child', 'root']);

    // Both scopes are cleared — a fresh scope's disposer is unaffected by a second sweep.
    const fresh: string[] = [];
    disposeScope(child).add(() => fresh.push('again'));
    disposeSubtree(root);
    expect(fresh).toEqual(['again']);
  });

  it('is a no-op for a subtree with no scopes', () => {
    const root = document.createElement('div');
    root.innerHTML = '<span></span>';
    document.body.appendChild(root);
    expect(() => disposeSubtree(root)).not.toThrow();
  });
});

describe('observeRemovals()', () => {
  it('auto-disposes a removed node\'s scope and its descendants', async () => {
    const stop = observeRemovals(document.body);
    const card = document.createElement('div');
    const inner = document.createElement('span');
    card.appendChild(inner);
    document.body.appendChild(card);

    const calls: string[] = [];
    disposeScope(card).add(() => calls.push('card'));
    disposeScope(inner).add(() => calls.push('inner'));

    card.remove();
    await new Promise((resolve) => setTimeout(resolve, 0)); // MutationObserver is async
    expect(calls.sort()).toEqual(['card', 'inner']);

    stop();
  });

  it('ignores removed non-element nodes (e.g. a text node)', async () => {
    const stop = observeRemovals(document.body);
    const host = document.createElement('div');
    host.append('text');
    document.body.appendChild(host);
    const textNode = host.firstChild as ChildNode;
    expect(() => host.removeChild(textNode)).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
    stop();
  });

  it('stop() disconnects the observer (no more auto-dispose)', async () => {
    const stop = observeRemovals(document.body);
    stop();
    const card = document.createElement('div');
    document.body.appendChild(card);
    const calls: string[] = [];
    disposeScope(card).add(() => calls.push('card'));
    card.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toEqual([]); // observer disconnected — not disposed
  });
});
