/**
 * Dev-mode warning for a stale `index` argument in an `each()` row render
 * (KERF_DEV_WARN_STALE_INDEX=1).
 *
 * `each()` memoizes a row's HTML by object identity, not position, so a reorder
 * or a non-tail insert/remove/move serves a surviving row's cached HTML — which
 * was computed at its OLD index. When the render fn reads that index, the row
 * silently shows a stale value. This warner surfaces it. Tests cover both the
 * snapshot path (plain-array reorder) and the granular path (arraySignal shift),
 * plus the opt-out / arity-gate / tail-append-no-shift / dedup / production
 * paths through the real pipeline.
 */

import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { _resetWarnedForTests, maybeWarnStaleIndex } from '../../src/dev-list-index-warn.js';
import { each } from '../../src/each.js';
import { mount } from '../../src/mount.js';
import { batch, signal } from '../../src/reactive.js';
import { enterProductionShape, restoreDevelopmentShape } from '../helpers/dev-shape.js';

const env = (globalThis as { process: { env: Record<string, string | undefined> } }).process.env;

let root: HTMLElement;
let warnSpy: MockInstance<typeof console.warn>;

beforeEach(() => {
  _resetWarnedForTests();
  root = document.createElement('div');
  document.body.appendChild(root);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = '';
  delete env.KERF_DEV_WARN_STALE_INDEX;
  warnSpy.mockRestore();
});

const texts = (): (string | null)[] => Array.from(root.querySelectorAll('li')).map((l) => l.textContent);

// render fns: one reads the index (arity 2), one does not (arity 1).
const withIndex = (it: { id: string }, i: number) => <li data-key={it.id}>{`${i}:${it.id}`}</li>;
const noIndex = (it: { id: string }) => <li data-key={it.id}>{it.id}</li>;

describe('dev-list-index-warn (KERF_DEV_WARN_STALE_INDEX=1)', () => {
  it('is silent by default (env var unset) even on a reorder', () => {
    const data = signal([{ id: 'a' }, { id: 'b' }]);
    mount(root, () => <ul>{each(data.value, withIndex)}</ul>);
    data.value = [data.value[1], data.value[0]];
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('snapshot path: a plain-array reorder warns once, with the fix', () => {
    env.KERF_DEV_WARN_STALE_INDEX = '1';
    const data = signal([{ id: 'a' }, { id: 'b' }]);
    mount(root, () => <ul>{each(data.value, withIndex)}</ul>);
    data.value = [data.value[1], data.value[0]];
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const msg = warnSpy.mock.calls[0][0] as string;
    expect(msg).toMatch(/reused a memoized row at a new index/);
    expect(msg).toMatch(/cacheKey: \(_, i\) => i/);
    expect(msg).toMatch(/KERF_DEV_WARN_STALE_INDEX=0/);
  });

  it('granular path: a head insert (a shift) warns', () => {
    env.KERF_DEV_WARN_STALE_INDEX = '1';
    const rows = arraySignal([{ id: 'a' }, { id: 'b' }]);
    mount(root, () => <ul>{each(rows, withIndex)}</ul>);
    rows.insert(0, { id: 'c' });
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('granular path: a move warns', () => {
    env.KERF_DEV_WARN_STALE_INDEX = '1';
    const rows = arraySignal([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    mount(root, () => <ul>{each(rows, withIndex)}</ul>);
    rows.move(2, 0);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('granular path: a TAIL append does not shift any existing row — no warn', () => {
    env.KERF_DEV_WARN_STALE_INDEX = '1';
    const rows = arraySignal([{ id: 'a' }, { id: 'b' }]);
    mount(root, () => <ul>{each(rows, withIndex)}</ul>);
    rows.push({ id: 'c' });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('granular path: a TAIL remove does not shift; a head remove does', () => {
    env.KERF_DEV_WARN_STALE_INDEX = '1';
    const rows = arraySignal([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    mount(root, () => <ul>{each(rows, withIndex)}</ul>);
    rows.remove(2); // last row — no shift
    expect(warnSpy).not.toHaveBeenCalled();
    rows.remove(0); // head — shifts the survivors
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('arity gate: a render fn that does not read the index never warns, even on a reorder', () => {
    env.KERF_DEV_WARN_STALE_INDEX = '1';
    const data = signal([{ id: 'a' }, { id: 'b' }]);
    mount(root, () => <ul>{each(data.value, noIndex)}</ul>);
    data.value = [data.value[1], data.value[0]];
    expect(warnSpy).not.toHaveBeenCalled();
    // Granular, too.
    const rows = arraySignal([{ id: 'a' }, { id: 'b' }]);
    mount(document.body.appendChild(document.createElement('div')), () => <ul>{each(rows, noIndex)}</ul>);
    rows.insert(0, { id: 'c' });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('dedups per list id — a second reorder of the same list does not warn again', () => {
    env.KERF_DEV_WARN_STALE_INDEX = '1';
    const data = signal([{ id: 'a' }, { id: 'b' }]);
    mount(root, () => <ul>{each(data.value, withIndex)}</ul>);
    data.value = [data.value[1], data.value[0]];
    data.value = [data.value[1], data.value[0]]; // reorder back — a second shift
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('is silent in production mode even with the env var set', () => {
    env.KERF_DEV_WARN_STALE_INDEX = '1';
    enterProductionShape();
    try {
      const data = signal([{ id: 'a' }, { id: 'b' }]);
      mount(root, () => <ul>{each(data.value, withIndex)}</ul>);
      data.value = [data.value[1], data.value[0]];
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      restoreDevelopmentShape();
    }
  });

  it('KF-424: the cacheKey:(_,i)=>i workaround suppresses the warn when it reroutes to snapshot', () => {
    env.KERF_DEV_WARN_STALE_INDEX = '1';
    const rows = arraySignal([{ id: 'a' }, { id: 'b' }]);
    const dispose = mount(root, () => (
      <ul>{each(rows, (r, i) => <li data-key={r.id}>{`${i}:${r.id}`}</li>, { cacheKey: (_, i) => i })}</ul>
    ));
    rows.insert(0, { id: 'c' }); // shifts a,b → cachekey drift → snapshot re-renders them correctly
    expect(texts()).toEqual(['0:c', '1:a', '2:b']); // output is correct...
    expect(warnSpy).not.toHaveBeenCalled(); // ...so the warn must NOT fire
    dispose();
  });

  it('KF-424: a net-zero insert+remove batch (routes to snapshot) does not warn', () => {
    env.KERF_DEV_WARN_STALE_INDEX = '1';
    const rows = arraySignal([{ id: 'a' }, { id: 'b' }]);
    const dispose = mount(root, () => <ul>{each(rows, withIndex)}</ul>);
    batch(() => { rows.insert(0, { id: 't' }); rows.remove(0); });
    expect(texts()).toEqual(['0:a', '1:b']);
    expect(warnSpy).not.toHaveBeenCalled();
    dispose();
  });

  it('KF-424: a genuinely-stale granular shift (no cacheKey, stays granular) STILL warns', () => {
    env.KERF_DEV_WARN_STALE_INDEX = '1';
    const rows = arraySignal([{ id: 'a' }, { id: 'b' }]);
    const dispose = mount(root, () => <ul>{each(rows, withIndex)}</ul>);
    rows.insert(0, { id: 'c' }); // no cacheKey → no reroute → carried rows keep stale index
    expect(warnSpy).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('KF-425: a fresh insert displaced by a later same-batch insert warns (true positive)', () => {
    env.KERF_DEV_WARN_STALE_INDEX = '1';
    const rows = arraySignal([{ id: 'x' }]);
    const dispose = mount(root, () => <ul>{each(rows, withIndex)}</ul>);
    // 'a' inserted at 1, then 'b' inserted at 1 displaces 'a' to 2 — 'a' rendered at index 1.
    batch(() => { rows.insert(1, { id: 'a' }); rows.insert(1, { id: 'b' }); });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('direct call: dedup set short-circuits, and a different id gets its own warning', () => {
    env.KERF_DEV_WARN_STALE_INDEX = '1';
    maybeWarnStaleIndex('7');
    maybeWarnStaleIndex('7');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    maybeWarnStaleIndex('8');
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});
