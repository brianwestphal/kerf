/**
 * The opt-in structural invariant checks (`KERF_DEV_INVARIANTS`).
 *
 * Each case corrupts a binding the way a real defect did, then asserts the
 * checker names it. The corruption is applied directly to the binding/DOM
 * rather than provoked through a bug, for the obvious reason that the bugs are
 * fixed — the point of these checks is to catch the *next* one, so what must be
 * tested is that each shape is detected at all.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { findListInvariantViolations, maybeCheckListInvariants } from '../../src/dev-invariants.js';
import type { BoundItem, ListBinding } from '../../src/list-binding.js';

const env = (globalThis as { process: { env: Record<string, string | undefined> } }).process.env;

let root: HTMLElement;

/** Build a live `<ul>` with a marker and `n` rows, plus a matching binding. */
function makeList(id: string, n: number, parent: Element = root): ListBinding {
  const marker = document.createComment(`kf-list:${id}`);
  parent.appendChild(marker);
  const items: BoundItem[] = [];
  for (let i = 0; i < n; i++) {
    const li = document.createElement('li');
    li.setAttribute('data-key', `${id}-${i}`);
    parent.appendChild(li);
    items.push({ ref: {}, cacheKey: undefined, html: li.outerHTML, node: li });
  }
  return { liveParent: parent, items, marker };
}

const check = (
  bindings: Record<string, ListBinding>,
  expectedCounts?: Record<string, number>,
): string[] =>
  findListInvariantViolations(
    root,
    new Map(Object.entries(bindings)),
    expectedCounts === undefined ? undefined : new Map(Object.entries(expectedCounts)),
  );

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
  // The suite runs with KERF_DEV_INVARIANTS=throw globally (vitest.config.ts);
  // these tests set the mode themselves, so start from unset.
  delete env.KERF_DEV_INVARIANTS;
});

afterEach(() => {
  delete env.KERF_DEV_INVARIANTS;
  vi.restoreAllMocks();
});

describe('dev invariants: detection', () => {
  it('a healthy binding reports nothing', () => {
    expect(check({ '0': makeList('0', 3) })).toEqual([]);
  });

  it('flags a binding holding fewer rows than its source (KF-416 — the KF-411 shape)', () => {
    // A self-healed empty binding is internally perfect but rendered nothing.
    const b = makeList('0', 0);
    expect(check({ '0': b }, { '0': 3 })[0]).toMatch(/holds 0 row\(s\) but its source has 3/);
  });

  it('flags a binding holding MORE rows than its source (duplicated rows)', () => {
    const b = makeList('0', 4);
    expect(check({ '0': b }, { '0': 2 })[0]).toMatch(/holds 4 row\(s\) but its source has 2/);
  });

  it('a matching row count reports nothing', () => {
    expect(check({ '0': makeList('0', 3) }, { '0': 3 })).toEqual([]);
  });

  it('a list absent from expectedCounts skips the count check (still DOM-checked)', () => {
    // Only lists in the current render supply an expected count; others (e.g. a
    // list that disappeared) are count-exempt but still structurally audited.
    expect(check({ '0': makeList('0', 2) }, { '1': 5 })).toEqual([]);
  });

  it('two healthy lists in one parent report nothing', () => {
    expect(check({ '0': makeList('0', 2), '1': makeList('1', 2) })).toEqual([]);
  });

  it('flags a marker that left the mount root', () => {
    const b = makeList('0', 1);
    b.marker.remove();
    expect(check({ '0': b })[0]).toMatch(/marker comment is no longer inside the mount root/);
  });

  it('flags an id carried by a different marker node', () => {
    // The shape of a call-order id handed to another list: the binding is
    // filed under '0' but its marker now reads a different list.
    const b = makeList('0', 1);
    b.marker.data = 'kf-list:7';
    expect(check({ '0': b })[0]).toMatch(/its marker reads 'kf-list:7'/);
  });

  it('flags a marker attached somewhere other than the recorded parent', () => {
    const other = document.createElement('section');
    root.appendChild(other);
    const b = makeList('0', 1);
    other.appendChild(b.marker); // still in root, but not in liveParent
    expect(check({ '0': b })[0]).toMatch(/marker is not a child of the parent the binding records/);
  });

  it('flags a bound row that was detached', () => {
    const b = makeList('0', 2);
    b.items[1].node.remove();
    expect(check({ '0': b })[0]).toMatch(/bound row 1 is not a child of the list's parent.*detached/);
  });

  it('flags a bound row that is attached elsewhere in the document', () => {
    const other = document.createElement('section');
    root.appendChild(other);
    const b = makeList('0', 2);
    other.appendChild(b.items[1].node);
    expect(check({ '0': b })[0]).toMatch(/attached elsewhere in the document/);
  });

  it('flags rows that are out of order', () => {
    const b = makeList('0', 2);
    // Swap the two rows in the DOM without telling the binding.
    b.items[0].node.after(b.items[1].node.nextSibling ?? b.items[1].node);
    b.liveParent.insertBefore(b.items[1].node, b.items[0].node);
    expect(check({ '0': b })[0]).toMatch(/is not after the previous one/);
  });

  it('flags a row that crossed its own marker', () => {
    const b = makeList('0', 1);
    b.liveParent.insertBefore(b.items[0].node, b.marker);
    expect(check({ '0': b })[0]).toMatch(/is not after the previous one/);
  });

  it('flags a row claimed by two bindings', () => {
    const a = makeList('0', 1);
    const b = makeList('1', 1);
    b.items[0] = a.items[0]; // both bindings now point at the same node
    expect(check({ '0': a, '1': b }).some((p) => /also claimed by list '0'/.test(p))).toBe(true);
  });

  it('flags two lists whose row regions overlap in one parent', () => {
    const a = makeList('0', 2);
    const b = makeList('1', 2);
    // Move one of b's rows up between a's rows — the interleaving shape.
    a.liveParent.insertBefore(b.items[0].node, a.items[1].node);
    const problems = check({ '0': a, '1': b });
    expect(problems.some((p) => /overlap those of list/.test(p))).toBe(true);
  });

  it('lists in DIFFERENT parents never overlap', () => {
    const other = document.createElement('section');
    root.appendChild(other);
    expect(check({ '0': makeList('0', 2), '1': makeList('1', 2, other) })).toEqual([]);
  });

  it('an empty list contributes no span, so it cannot overlap anything', () => {
    expect(check({ '0': makeList('0', 0), '1': makeList('1', 2) })).toEqual([]);
  });
});

describe('dev invariants: reporting modes', () => {
  it('is a no-op when the env var is unset', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const b = makeList('0', 1);
    b.marker.remove();
    maybeCheckListInvariants(root, new Map([['0', b]]));
    expect(warn).not.toHaveBeenCalled();
  });

  it('is a no-op for any other env value', () => {
    env.KERF_DEV_INVARIANTS = 'yes';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const b = makeList('0', 1);
    b.marker.remove();
    maybeCheckListInvariants(root, new Map([['0', b]]));
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns when set to 1', () => {
    env.KERF_DEV_INVARIANTS = '1';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const b = makeList('0', 1);
    b.marker.remove();
    maybeCheckListInvariants(root, new Map([['0', b]]));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/kerf invariant violated after reconcile/);
  });

  it('stays quiet when set to 1 and everything is healthy', () => {
    env.KERF_DEV_INVARIANTS = '1';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    maybeCheckListInvariants(root, new Map([['0', makeList('0', 2)]]));
    expect(warn).not.toHaveBeenCalled();
  });

  it('throws when set to throw', () => {
    env.KERF_DEV_INVARIANTS = 'throw';
    const b = makeList('0', 1);
    b.marker.remove();
    expect(() => maybeCheckListInvariants(root, new Map([['0', b]])))
      .toThrow(/kerf invariant violated after reconcile/);
  });

  it('is off in production even when set', () => {
    env.KERF_DEV_INVARIANTS = 'throw';
    (globalThis as { KERF_DEV?: boolean }).KERF_DEV = false;
    try {
      const b = makeList('0', 1);
      b.marker.remove();
      expect(() => maybeCheckListInvariants(root, new Map([['0', b]]))).not.toThrow();
    } finally {
      delete (globalThis as { KERF_DEV?: boolean }).KERF_DEV;
    }
  });
});
