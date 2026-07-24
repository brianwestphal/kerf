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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { _resetWarnedForTests, maybeWarnStaleIndex } from '../../src/dev-list-index-warn.js';
import { each } from '../../src/each.js';
import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';

const env = (globalThis as { process: { env: Record<string, string | undefined> } }).process.env;

let root: HTMLElement;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  _resetWarnedForTests();
  root = document.createElement('div');
  document.body.appendChild(root);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = '';
  delete env.KERF_DEV_WARN_STALE_INDEX;
  delete (globalThis as { KERF_DEV?: boolean }).KERF_DEV;
  warnSpy.mockRestore();
});

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
    (globalThis as { KERF_DEV?: boolean }).KERF_DEV = false;
    const data = signal([{ id: 'a' }, { id: 'b' }]);
    mount(root, () => <ul>{each(data.value, withIndex)}</ul>);
    data.value = [data.value[1], data.value[0]];
    expect(warnSpy).not.toHaveBeenCalled();
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
