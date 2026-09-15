/**
 * Integration coverage for the always-on (when installed) missing-row-key
 * diagnostic. The helper-level suite pins its message and branches; this file
 * pins the core call sites that feed it from every `each()` reconciliation
 * path.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { installDevHooks } from '../../src/dev-hooks.js';
import { maybeWarnMissingRowKey } from '../../src/dev-row-key-warn.js';
import { each, mount, signal } from '../../src/index.js';
import { jsx } from '../../src/jsx-runtime.js';
import { enterProductionShape, restoreDevelopmentShape } from '../helpers/dev-shape.js';

interface Row {
  id: number;
  label: string;
}

const MISSING_KEY_MESSAGE = /the first row has no `id` or `data-key`/;

describe('missing-row-key warning — full each() reconciliation pipeline', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    restoreDevelopmentShape();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('samples the first row after initial, granular, snapshot, and in-place reconciliation, but warns once per binding', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const hook = vi.fn(maybeWarnMissingRowKey);
    installDevHooks({ missingRowKey: hook });

    const a: Row = { id: 1, label: 'a' };
    const b: Row = { id: 2, label: 'b' };
    const c: Row = { id: 3, label: 'c' };
    const rows = arraySignal([a, b]);
    const emphasized = signal(false);

    const dispose = mount(root, () => jsx('ul', {
      children: each(
        rows,
        (row) => jsx('li', {
          class: emphasized.value ? 'emphasized' : '',
          children: row.label,
        }),
        () => emphasized.value,
      ),
    }));

    // Initial binding samples its inlined first row, then the normal post-bind
    // reconcile samples the same first row through the in-place path. The
    // binding-level flag still emits the diagnostic only once.
    expect(hook).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls.filter(([message]) => MISSING_KEY_MESSAGE.test(String(message))))
      .toHaveLength(1);

    // A patch-backed insert takes the granular reconciler and samples again.
    rows.insert(2, c);
    expect(Array.from(root.querySelectorAll('li'), (el) => el.textContent)).toEqual(['a', 'b', 'c']);
    expect(hook).toHaveBeenCalledTimes(3);

    // replace() deliberately invalidates granular patching. Reordering the
    // existing refs makes the snapshot reconciler do structural work.
    rows.replace([b, a, c]);
    expect(Array.from(root.querySelectorAll('li'), (el) => el.textContent)).toEqual(['b', 'a', 'c']);
    expect(hook).toHaveBeenCalledTimes(4);

    // With the same refs/order, cacheKey drift routes through the snapshot
    // in-place content path. Pin node identity so this cannot accidentally be
    // satisfied by a different snapshot branch.
    const firstRow = root.querySelector('li');
    emphasized.value = true;
    expect(root.querySelector('li')).toBe(firstRow);
    expect(root.querySelectorAll('li.emphasized')).toHaveLength(3);
    expect(hook).toHaveBeenCalledTimes(5);

    // Every path calls the hook, but the mutable binding context suppresses
    // repeats after the initial decision.
    expect(warn.mock.calls.filter(([message]) => MISSING_KEY_MESSAGE.test(String(message))))
      .toHaveLength(1);

    // Deduplication belongs to one binding, not the process: a second mount
    // gets its own warning decision.
    const secondRoot = document.createElement('div');
    document.body.appendChild(secondRoot);
    const disposeSecond = mount(secondRoot, () => jsx('ul', {
      children: each([a], (row) => jsx('li', { children: row.label })),
    }));
    expect(warn.mock.calls.filter(([message]) => MISSING_KEY_MESSAGE.test(String(message))))
      .toHaveLength(2);

    disposeSecond();
    dispose();
  });

  it('never reaches the warning when kerfjs/dev hooks are not installed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    enterProductionShape();

    const a: Row = { id: 1, label: 'a' };
    const b: Row = { id: 2, label: 'b' };
    const c: Row = { id: 3, label: 'c' };
    const rows = arraySignal([a, b]);
    const emphasized = signal(false);
    const dispose = mount(root, () => jsx('ul', {
      children: each(
        rows,
        (row) => jsx('li', {
          class: emphasized.value ? 'emphasized' : '',
          children: row.label,
        }),
        () => emphasized.value,
      ),
    }));

    // Exercise the same granular → snapshot → in-place sequence with the
    // optional hook absent. Core rendering remains live and silent.
    rows.insert(2, c);
    rows.replace([b, a, c]);
    emphasized.value = true;

    expect(Array.from(root.querySelectorAll('li'), (el) => el.textContent)).toEqual(['b', 'a', 'c']);
    expect(root.querySelectorAll('li.emphasized')).toHaveLength(3);
    expect(warn.mock.calls.filter(([message]) => MISSING_KEY_MESSAGE.test(String(message))))
      .toHaveLength(0);

    dispose();
  });
});
