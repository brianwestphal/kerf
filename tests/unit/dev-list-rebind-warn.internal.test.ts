/**
 * Dev-mode warning for each() containers rebuilt by the morph
 * (KERF_DEV_WARN_LIST_REBIND=1).
 *
 * `maybeWarnListRebind` is called by `mount()`'s `bindListsFromMarkers` from
 * the self-heal branch — an existing list binding whose marker left the mount
 * root because an ancestor's tag changed and `replaceChild` swapped the whole
 * subtree. The recovery repopulates the rows but discards their DOM state;
 * this warner surfaces that. Tests verify the opt-out / opt-in / dedup /
 * production-mode paths through the real mount pipeline.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetWarnedForTests, maybeWarnListRebind } from '../../src/dev-list-rebind-warn.js';
import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
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
  delete env.KERF_DEV_WARN_LIST_REBIND;
  delete (globalThis as { KERF_DEV?: boolean }).KERF_DEV;
  warnSpy.mockRestore();
});

const items = [{ id: 'a' }, { id: 'b' }];

/**
 * The ancestor-tag-swap shape from the self-heal regression tests: the list
 * stays in the segment on both sides, but its wrapper's tag flips, so the
 * morph replaceChild's the subtree and the self-heal re-binds the list.
 */
function mountTagSwap(): { wide: ReturnType<typeof signal<boolean>> } {
  const wide = signal(false);
  mount(root, () =>
    jsx('div', {
      children: wide.value
        ? jsx('section', {
            children: jsx('ul', {
              children: each(items, (it) =>
                jsx('li', { 'data-key': it.id, children: it.id })),
            }),
          })
        : jsx('article', {
            children: jsx('ul', {
              children: each(items, (it) =>
                jsx('li', { 'data-key': it.id, children: it.id })),
            }),
          }),
    }) as never);
  return { wide };
}

describe('dev-list-rebind-warn (KERF_DEV_WARN_LIST_REBIND=1)', () => {
  it('is silent by default (env var unset), even when the self-heal fires', () => {
    const { wide } = mountTagSwap();
    wide.value = true;
    // The self-heal repopulated the rows...
    expect(root.querySelectorAll('li').length).toBe(2);
    // ...without warning.
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns once when the self-heal re-binds a rebuilt container', () => {
    env.KERF_DEV_WARN_LIST_REBIND = '1';
    const { wide } = mountTagSwap();
    wide.value = true;
    expect(root.querySelectorAll('li').length).toBe(2);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const msg = warnSpy.mock.calls[0][0] as string;
    expect(msg).toMatch(/each\(\) list '.+' had its container \(<ul>\) rebuilt/);
    expect(msg).toMatch(/rows were re-created from scratch/);
    expect(msg).toMatch(/KERF_DEV_WARN_LIST_REBIND=0/);
  });

  it('dedups per list id — a second rebuild of the same list does not warn again', () => {
    env.KERF_DEV_WARN_LIST_REBIND = '1';
    const { wide } = mountTagSwap();
    wide.value = true;
    wide.value = false; // swap back — a second rebuild + self-heal
    expect(root.querySelectorAll('li').length).toBe(2);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('is silent in production mode even with the env var set', () => {
    env.KERF_DEV_WARN_LIST_REBIND = '1';
    (globalThis as { KERF_DEV?: boolean }).KERF_DEV = false;
    const { wide } = mountTagSwap();
    wide.value = true;
    expect(root.querySelectorAll('li').length).toBe(2);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('direct call: dedup set short-circuits before message construction', () => {
    env.KERF_DEV_WARN_LIST_REBIND = '1';
    const parent = document.createElement('ul');
    maybeWarnListRebind('7', parent);
    maybeWarnListRebind('7', parent);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    // A different list id gets its own warning.
    maybeWarnListRebind('8', parent);
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});
