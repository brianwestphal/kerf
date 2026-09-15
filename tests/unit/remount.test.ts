import { afterEach, describe, expect, it } from 'vitest';

import { jsx } from '../../src/jsx-runtime.js';
import { signal } from '../../src/reactive.js';
import { remountOn } from '../../src/remount.js';

afterEach(() => {
  document.body.innerHTML = '';
});

function host(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('remountOn()', () => {
  it('renders once, and on an unchanged key leaves the subtree (its DOM identity) alone', () => {
    const parent = host();
    const key = signal(1);
    const label = signal('a');
    const stop = remountOn(parent, key, () => jsx('span', { class: 'x', children: label.value }));

    const first = parent.querySelector('.x')!;
    expect(first.textContent).toBe('a');

    // A content signal changes → fine-grained update WITHIN the same mount, no remount.
    label.value = 'b';
    expect(parent.querySelector('.x')).toBe(first); // same node
    expect(first.textContent).toBe('b');

    // Writing the key its current value → no remount.
    key.value = 1;
    expect(parent.querySelector('.x')).toBe(first);
    stop();
  });

  it('replaces the subtree wholesale when the key changes (a fresh DOM node)', () => {
    const parent = host();
    const key = signal('file-1');
    const stop = remountOn(parent, key, () => jsx('div', { class: 'pane', children: key.value }));

    const firstNode = parent.querySelector('.pane')!;
    expect(firstNode.textContent).toBe('file-1');

    key.value = 'file-2';
    const secondNode = parent.querySelector('.pane')!;
    expect(secondNode).not.toBe(firstNode); // wholesale replaced, not morphed
    expect(firstNode.isConnected).toBe(false); // old node removed from the DOM
    expect(secondNode.textContent).toBe('file-2');
    stop();
  });

  it('accepts a thunk key that combines several signals', () => {
    const parent = host();
    const a = signal(1);
    const b = signal('x');
    const stop = remountOn(parent, () => `${a.value}:${b.value}`, () =>
      jsx('p', { class: 'p', children: `${a.value}-${b.value}` }),
    );

    const n1 = parent.querySelector('.p')!;
    expect(n1.textContent).toBe('1-x');

    a.value = 2; // combined key changes → remount
    const n2 = parent.querySelector('.p')!;
    expect(n2).not.toBe(n1);
    expect(n2.textContent).toBe('2-x');
    stop();
  });

  it('a thunk key whose inputs change but whose value stays equal does not remount', () => {
    const parent = host();
    const n = signal(1);
    const stop = remountOn(parent, () => (n.value > 0 ? 'pos' : 'neg'), () =>
      jsx('div', { class: 'g', children: n.value > 0 ? 'positive' : 'negative' }),
    );

    const node = parent.querySelector('.g')!;
    expect(node.textContent).toBe('positive');

    n.value = 5; // thunk re-evaluates (n changed) but the key is still 'pos' → no remount
    expect(parent.querySelector('.g')).toBe(node); // same node

    n.value = -1; // key flips to 'neg' → remount
    expect(parent.querySelector('.g')).not.toBe(node);
    expect(parent.querySelector('.g')?.textContent).toBe('negative');
    stop();
  });

  it('the fresh subtree is live — its own signals update in place after a remount', () => {
    const parent = host();
    const key = signal(1);
    const inner = signal('a');
    const stop = remountOn(parent, key, () => jsx('span', { class: 's', children: inner.value }));

    key.value = 2; // remount
    const node = parent.querySelector('.s')!;
    inner.value = 'b'; // the NEW mount reacts
    expect(parent.querySelectorAll('.s').length).toBe(1);
    expect(parent.querySelector('.s')).toBe(node); // same node — fine-grained, not a remount
    expect(node.textContent).toBe('b');
    stop();
  });

  it('the disposer tears down the current subtree and stops watching the key', () => {
    const parent = host();
    const key = signal(1);
    const seen: number[] = [];
    const stop = remountOn(parent, key, () => {
      seen.push(key.value);
      return jsx('div', { class: 'd', children: String(key.value) });
    });

    expect(parent.querySelector('.d')).not.toBeNull();
    const buildsBeforeStop = seen.length;

    stop();
    expect(parent.querySelector('.d')).toBeNull(); // subtree cleared

    key.value = 2; // must NOT remount after stop
    expect(seen.length).toBe(buildsBeforeStop);
    expect(parent.querySelector('.d')).toBeNull();
  });

  it('the disposer is idempotent and does not remove external content added after disposal', () => {
    const parent = host();
    const key = signal(1);
    let cleanupCalls = 0;
    const stop = remountOn(parent, key, () => jsx('div', { class: 'owned' }), {
      onMount: () => () => {
        cleanupCalls += 1;
      },
    });
    const owned = parent.querySelector('.owned')!;

    stop();
    expect(owned.isConnected).toBe(false);
    expect(cleanupCalls).toBe(1);

    const external = document.createElement('p');
    external.className = 'external';
    parent.replaceChildren(external);
    stop();

    expect(parent.firstElementChild).toBe(external);
    expect(external.isConnected).toBe(true);
    expect(cleanupCalls).toBe(1);
  });

  it('a disposer called reentrantly from cleanup does not mount a fresh subtree', () => {
    const parent = host();
    const key = signal(1);
    let stop!: () => void;
    let renderCalls = 0;
    stop = remountOn(
      parent,
      key,
      () => {
        renderCalls += 1;
        return jsx('div', { class: 'owned' });
      },
      { onMount: () => () => stop() },
    );

    key.value = 2;

    expect(renderCalls).toBe(1);
    expect(parent.childElementCount).toBe(0);
    key.value = 3;
    expect(renderCalls).toBe(1);
  });

  it('a disposer called reentrantly from render tears down the mount that finishes afterward', () => {
    const parent = host();
    const key = signal(1);
    let stop = (): void => {};
    let renderCalls = 0;
    stop = remountOn(parent, key, () => {
      renderCalls += 1;
      if (key.value === 2) stop();
      return jsx('div', { class: 'owned' });
    });

    key.value = 2;

    expect(renderCalls).toBe(2);
    expect(parent.childElementCount).toBe(0);
    key.value = 3;
    expect(renderCalls).toBe(2);
  });

  it('a disposer called reentrantly from onMount runs the cleanup returned afterward', () => {
    const parent = host();
    const key = signal(1);
    let stop = (): void => {};
    const cleanups: number[] = [];
    stop = remountOn(parent, key, () => jsx('div', { class: 'owned' }), {
      onMount: () => {
        const at = key.value;
        if (at === 2) stop();
        return () => cleanups.push(at);
      },
    });

    key.value = 2;

    expect(cleanups).toEqual([1, 2]);
    expect(parent.childElementCount).toBe(0);
    key.value = 3;
    expect(cleanups).toEqual([1, 2]);
  });

  describe('onMount hook', () => {
    it('runs after each (re)mount with the live, freshly-rendered subtree', () => {
      const parent = host();
      const key = signal('a');
      const seen: (string | null)[] = [];
      const stop = remountOn(parent, key, () => jsx('div', { class: 'x', children: key.value }), {
        onMount: (root) => { seen.push(root.querySelector('.x')?.textContent ?? null); },
      });

      expect(seen).toEqual(['a']); // fired after the initial mount, node already live
      key.value = 'b';
      expect(seen).toEqual(['a', 'b']); // fired again after the remount, on the fresh node
      stop();
    });

    it('runs the onMount cleanup before the next remount and on dispose', () => {
      const parent = host();
      const key = signal(1);
      const log: string[] = [];
      const stop = remountOn(parent, key, () => jsx('div', { class: 'x' }), {
        onMount: () => {
          const at = key.value;
          log.push(`mount:${at}`);
          return () => log.push(`cleanup:${at}`);
        },
      });

      expect(log).toEqual(['mount:1']);
      key.value = 2; // cleanup(1) fires BEFORE mount(2)
      expect(log).toEqual(['mount:1', 'cleanup:1', 'mount:2']);
      stop(); // final dispose runs the last cleanup
      expect(log).toEqual(['mount:1', 'cleanup:1', 'mount:2', 'cleanup:2']);
    });

    it('an onMount that returns no cleanup is fine across remounts', () => {
      const parent = host();
      const key = signal(1);
      const stop = remountOn(parent, key, () => jsx('div', { class: 'x' }), { onMount: () => { /* no cleanup */ } });
      key.value = 2; // must not throw despite no cleanup returned
      expect(parent.querySelector('.x')).not.toBeNull();
      stop();
    });
  });
});
