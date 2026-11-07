import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { signal } from '../../src/reactive.js';
import {
  createScope,
  disposeScope,
  disposeSubtree,
  observeRemovals,
} from '../../src/scope.js';

// A throwing disposer is reported through `reportError` after the teardown
// loop (KF-C0S46R). happy-dom has no `reportError`, so stub it for every test
// (an unstubbed run would fall back to a microtask rethrow, which vitest
// reports as an unhandled error).
let reported: unknown[] = [];
beforeEach(() => {
  reported = [];
  vi.stubGlobal('reportError', (error: unknown) => {
    reported.push(error);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('disposer errors are reported, not swallowed', () => {
  it('createScope(): every disposer runs, then each error is reported in run order after the signal aborts', () => {
    const scope = createScope();
    const signalAtReport: boolean[] = [];
    const sig = scope.signal;
    vi.stubGlobal('reportError', (error: unknown) => {
      reported.push(error);
      signalAtReport.push(sig.aborted);
    });
    const a = new Error('a');
    const b = new Error('b');
    const ran: string[] = [];
    scope.add(() => {
      ran.push('first');
      throw a;
    });
    scope.add(() => ran.push('middle'));
    scope.add(() => {
      ran.push('last');
      throw b;
    });
    expect(() => scope.dispose()).not.toThrow();
    expect(ran).toEqual(['last', 'middle', 'first']);
    expect(reported).toEqual([b, a]); // newest-first run order
    expect(signalAtReport).toEqual([true, true]); // reported after teardown
  });

  it('disposeScope(): errors are reported after every disposer ran', () => {
    const el = document.createElement('div');
    const s = disposeScope(el);
    const ran: string[] = [];
    const boom = new Error('boom');
    vi.stubGlobal('reportError', (error: unknown) => {
      reported.push(error);
      ran.push('reported');
    });
    s.add(() => {
      ran.push('a');
      throw boom;
    });
    s.add(() => ran.push('b'));
    s.dispose();
    expect(ran).toEqual(['a', 'b', 'reported']);
    expect(reported).toEqual([boom]);
    s.dispose(); // idempotent: nothing reported twice
    expect(reported).toEqual([boom]);
  });

  it('a registration on a disposed handle that throws is reported too', () => {
    const el = document.createElement('div');
    const s = disposeScope(el);
    s.dispose();
    const late = new Error('late');
    s.add(() => {
      throw late;
    });
    expect(reported).toEqual([late]);
  });

  it('disposeSubtree() reports each scope’s errors and still disposes the rest', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p></p><span></span>';
    const e1 = new Error('p');
    const after = vi.fn();
    disposeScope(root.querySelector('p')!).add(() => {
      throw e1;
    });
    disposeScope(root.querySelector('span')!).add(after);
    disposeSubtree(root);
    expect(after).toHaveBeenCalledTimes(1);
    expect(reported).toEqual([e1]);
  });

  it('without reportError, the error is rethrown from a microtask', async () => {
    vi.stubGlobal('reportError', undefined);
    const thrown: unknown[] = [];
    const queued: Array<() => void> = [];
    vi.stubGlobal('queueMicrotask', (fn: () => void) => queued.push(fn));
    const boom = new Error('boom');
    const scope = createScope();
    scope.add(() => {
      throw boom;
    });
    expect(() => scope.dispose()).not.toThrow();
    expect(queued).toHaveLength(1);
    try {
      queued[0]();
    } catch (error) {
      thrown.push(error);
    }
    expect(thrown).toEqual([boom]);
  });

  it('a clean teardown reports nothing', () => {
    const scope = createScope();
    scope.add(() => {});
    scope.dispose();
    const s = disposeScope(document.createElement('div'));
    s.add(() => {});
    s.dispose();
    expect(reported).toEqual([]);
  });
});

describe('createScope()', () => {
  it('runs newest first, keeps going after errors, and rotates its signal after cleanup', () => {
    const scope = createScope();
    const order: string[] = [];
    const firstSignal = scope.signal;
    const first = () => order.push('first');
    expect(scope.add(first)).toBe(first);
    scope.add(() => {
      order.push(`second:${firstSignal.aborted}`);
      throw new Error('cleanup failed');
    });
    scope.add(() => order.push('third'));
    expect(scope.size).toBe(3);
    const dispose = scope.dispose;
    expect(() => dispose()).not.toThrow();
    expect(order).toEqual(['third', 'second:false', 'first']);
    expect(firstSignal.aborted).toBe(true);
    dispose();
    expect(scope.signal).not.toBe(firstSignal);
    expect(scope.signal.aborted).toBe(false);
    expect(scope.size).toBe(0);
    dispose();
    expect(order).toHaveLength(3);
  });

  it('refills after empty and populated disposals, including registrations during disposal', () => {
    const scope = createScope();
    const initialSignal = scope.signal;
    scope.dispose();
    expect(initialSignal.aborted).toBe(true);
    const nextSignal = scope.signal;
    const calls: string[] = [];
    scope.add(() => calls.push('old'));
    scope.add(() => {
      calls.push('register');
      scope.add(() => calls.push('new'));
      scope.dispose(); // nested disposal cannot consume the new generation
    });
    scope.dispose();
    expect(calls).toEqual(['register', 'old']);
    expect(nextSignal.aborted).toBe(true);
    expect(scope.size).toBe(1);
    const finalSignal = scope.signal;
    expect(finalSignal.aborted).toBe(false);
    scope.dispose();
    expect(calls).toEqual(['register', 'old', 'new']);
    expect(finalSignal.aborted).toBe(true);
    scope.dispose();
    expect(calls).toHaveLength(3);
    const signalOnly = scope.signal;
    scope.dispose();
    expect(signalOnly.aborted).toBe(true);
  });
});

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
    s.effect(() => {
      runs.push(sig.value);
    });
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

describe('observeRemovals() — nested roots (KF-4EA89E)', () => {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  function nested(): {
    outer: HTMLElement;
    inner: HTMLElement;
    card: HTMLElement;
    calls: string[];
  } {
    const outer = document.createElement('main');
    const inner = document.createElement('section');
    const card = document.createElement('div');
    inner.appendChild(card);
    outer.appendChild(inner);
    document.body.appendChild(outer);
    const calls: string[] = [];
    disposeScope(card).add(() => calls.push('card'));
    return { outer, inner, card, calls };
  }

  it('both active: a removal disposes once (the second observer finds nothing left)', async () => {
    const { outer, inner, card, calls } = nested();
    const stopOuter = observeRemovals(outer);
    const stopInner = observeRemovals(inner);
    card.remove();
    await tick();
    expect(calls).toEqual(['card']);
    stopOuter();
    stopInner();
    outer.remove();
  });

  it('inner stopped: the outer observer still disposes a removal inside the inner root', async () => {
    const { outer, inner, card, calls } = nested();
    const stopOuter = observeRemovals(outer);
    const stopInner = observeRemovals(inner);
    stopInner();
    card.remove();
    await tick();
    expect(calls).toEqual(['card']);
    stopOuter();
    outer.remove();
  });

  it('inner stopped: a move out of the inner root but within the outer root keeps the scope alive', async () => {
    const { outer, card, calls } = nested();
    const stopOuter = observeRemovals(outer);
    const stopInner = observeRemovals(outer.querySelector('section')!);
    stopInner();
    outer.appendChild(card); // leaves inner, stays inside outer
    await tick();
    expect(calls).toEqual([]);
    card.remove();
    await tick();
    expect(calls).toEqual(['card']);
    stopOuter();
    outer.remove();
  });

  it('inner active: a move out of the inner root disposes (each root judges containment by itself)', async () => {
    const { outer, inner, card, calls } = nested();
    const stopOuter = observeRemovals(outer);
    const stopInner = observeRemovals(inner);
    outer.appendChild(card);
    await tick();
    expect(calls).toEqual(['card']);
    stopOuter();
    stopInner();
    outer.remove();
  });

  it('outer stopped, inner active: a removal inside the inner root still disposes; outside it does not', async () => {
    const { outer, inner, card, calls } = nested();
    const sibling = document.createElement('div');
    outer.appendChild(sibling);
    disposeScope(sibling).add(() => calls.push('sibling'));
    const stopOuter = observeRemovals(outer);
    const stopInner = observeRemovals(inner);
    stopOuter();
    card.remove();
    sibling.remove();
    await tick();
    expect(calls).toEqual(['card']);
    stopInner();
    outer.remove();
  });
});

describe('observeRemovals()', () => {
  it("auto-disposes a removed node's scope and its descendants", async () => {
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

  it('preserves a scoped node moved from parent A to parent B within the observed root', async () => {
    const root = document.createElement('main');
    const parentA = document.createElement('section');
    const parentB = document.createElement('section');
    const card = document.createElement('div');
    parentA.appendChild(card);
    root.append(parentA, parentB);
    document.body.appendChild(root);
    const stop = observeRemovals(root);
    const calls: string[] = [];
    disposeScope(card).add(() => calls.push('card'));

    parentB.appendChild(card);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toEqual([]);

    card.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toEqual(['card']);
    stop();
  });

  it('preserves a scoped node reordered within the same parent', async () => {
    const root = document.createElement('main');
    const first = document.createElement('div');
    const card = document.createElement('div');
    root.append(first, card);
    document.body.appendChild(root);
    const stop = observeRemovals(root);
    const calls: string[] = [];
    disposeScope(card).add(() => calls.push('card'));

    root.prepend(card);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toEqual([]);

    disposeSubtree(root);
    expect(calls).toEqual(['card']);
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

describe('a disposed scope handle (KF-DFGD1R: registrations after dispose tear down at once)', () => {
  it('dispose → old handle .effect() → the effect runs once, then never again', () => {
    const el = document.createElement('div');
    const s = disposeScope(el);
    s.dispose();
    const sig = signal(0);
    const runs: number[] = [];
    const stop = s.effect(() => {
      runs.push(sig.value);
    });
    expect(runs).toEqual([0]); // effect() runs synchronously on creation
    sig.value = 1;
    expect(runs).toEqual([0]); // torn down at once — no leaked subscription
    expect(() => stop()).not.toThrow(); // the returned disposer is still safe to call
  });

  it('dispose → old handle .add(fn) → fn runs immediately (best-effort)', () => {
    const el = document.createElement('div');
    const s = disposeScope(el);
    s.dispose();
    const fn = vi.fn();
    expect(s.add(fn)).toBe(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(() =>
      s.add(() => {
        throw new Error('boom');
      }),
    ).not.toThrow();
    s.dispose(); // still idempotent — fn does not run a second time
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('dispose → old handle .mount() / .delegate() → neither updates nor listens', () => {
    const el = document.createElement('div');
    el.innerHTML = '<button class="b">b</button>';
    document.body.appendChild(el);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const s = disposeScope(el);
    s.dispose();

    const label = signal('x');
    s.mount(host, () => label.value);
    expect(host.textContent).toBe('x'); // first render happened
    label.value = 'y';
    expect(host.textContent).toBe('x'); // but the mount is already disposed

    const fn = vi.fn();
    s.delegate(el, 'click', '.b', fn);
    (el.querySelector('.b') as HTMLElement).click();
    expect(fn).not.toHaveBeenCalled();
  });

  it('a disposer that registers a new effect during dispose() does not leak it', () => {
    const el = document.createElement('div');
    const s = disposeScope(el);
    const sig = signal(0);
    const runs: number[] = [];
    s.add(() => {
      s.effect(() => {
        runs.push(sig.value);
      });
    });
    s.dispose();
    expect(runs).toEqual([0]);
    sig.value = 1;
    expect(runs).toEqual([0]);
  });

  it('the disposed handle stays dead after disposeScope(el) hands out a fresh scope', () => {
    const el = document.createElement('div');
    const old = disposeScope(el);
    old.dispose();
    const fresh = disposeScope(el);
    const calls: string[] = [];
    old.add(() => calls.push('old'));
    fresh.add(() => calls.push('fresh'));
    expect(calls).toEqual(['old']); // the old handle disposed immediately
    fresh.dispose();
    expect(calls).toEqual(['old', 'fresh']);
  });

  it('disposeSubtree → reinsert → observeRemovals disposes the fresh scope on a later removal', async () => {
    const root = document.createElement('main');
    document.body.appendChild(root);
    const card = document.createElement('div');
    root.appendChild(card);
    const calls: string[] = [];
    const first = disposeScope(card);
    first.add(() => calls.push('first'));

    disposeSubtree(card);
    card.remove();
    expect(calls).toEqual(['first']);

    const stop = observeRemovals(root);
    root.appendChild(card); // reinserted
    const second = disposeScope(card);
    expect(second).not.toBe(first);
    second.add(() => calls.push('second'));
    first.add(() => calls.push('first-late')); // old handle: runs at once
    expect(calls).toEqual(['first', 'first-late']);

    card.remove();
    await new Promise((resolve) => setTimeout(resolve, 0)); // MutationObserver is async
    expect(calls).toEqual(['first', 'first-late', 'second']);
    stop();
  });
});
