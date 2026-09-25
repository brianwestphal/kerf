/**
 * Direct unit coverage for `carryOrRewireRowBindings` (KF-347) — the
 * carry-vs-rewire decision the in-place row-update paths delegate to. The
 * end-to-end behavior is pinned in `bindings-mixed-content-and-rewire.test.ts` ("in-place updates
 * re-wire changed binding instances"); this file covers the argument shapes
 * the live call sites can't produce — both sides undefined, and the
 * defensive `undefined` arms of the length normalization (BoundItem.bindings
 * is optional, so a tolerant signature keeps the helper total). Internal
 * import → `.internal.test.ts` so the dist-full suite excludes it.
 *
 * Also pins `wireRowBindings`' dense-disposer contract (KF-5FM1Z6: a hole
 * whose marker is missing from the row is skipped without leaving a gap in
 * the returned disposer array, so disposal never calls `undefined`).
 */

import { describe, expect, it } from 'vitest';

import {
  BIND_ATTR_ROW,
  type Binding,
  carryOrRewireRowBindings,
  disposeRowBindings,
  ROW_TEXT_PREFIX,
  wireRowBindings,
} from '../../src/bindings.js';
import { signal } from '../../src/reactive.js';

describe('carryOrRewireRowBindings — argument-shape matrix', () => {
  const el = (): Element => document.createElement('div');

  it('both sides undefined → carries (nothing to dispose, nothing to wire)', () => {
    const out = carryOrRewireRowBindings(el(), undefined, undefined, undefined);
    expect(out.bindings).toBeUndefined();
    expect(out.bindingDisposers).toBeUndefined();
  });

  it('old side undefined, new side empty array → carry-equivalent (lengths match at 0)', () => {
    const out = carryOrRewireRowBindings(el(), undefined, undefined, []);
    expect(out.bindings).toBeUndefined();
    expect(out.bindingDisposers).toBeUndefined();
  });

  it('old side present, new side undefined → disposes old, wires nothing', () => {
    let disposed = 0;
    const oldBindings: Binding[] = [
      { kind: 'text', id: 't0', signal: signal('x') },
    ];
    const out = carryOrRewireRowBindings(
      el(),
      oldBindings,
      [
        (): void => {
          disposed++;
        },
      ],
      undefined,
    );
    expect(disposed).toBe(1);
    expect(out.bindings).toBeUndefined();
    expect(out.bindingDisposers).toBeUndefined();
  });

  it('same instances → carries the exact disposer array through', () => {
    const s = signal('x');
    const bindings: Binding[] = [{ kind: 'text', id: 't0', signal: s }];
    const disposers = [(): void => {}];
    const out = carryOrRewireRowBindings(el(), bindings, disposers, [
      ...bindings,
    ]);
    expect(out.bindings).toBe(bindings);
    expect(out.bindingDisposers).toBe(disposers);
  });
});

describe('wireRowBindings — dense disposer array when a marker is missing', () => {
  function row(): Element {
    const tr = document.createElement('div');
    // Root attr hole `a0`, a descendant attr hole `a2`, and a text hole `t4`.
    // Holes `a1` (attr) and `t3` (text) are registered but have NO marker —
    // the defensive skip path the public API never produces.
    tr.setAttribute(BIND_ATTR_ROW, 'a0');
    const child = document.createElement('span');
    child.setAttribute(BIND_ATTR_ROW, 'a2');
    tr.appendChild(child);
    tr.appendChild(document.createComment(`${ROW_TEXT_PREFIX}t4`));
    tr.appendChild(document.createTextNode(''));
    return tr;
  }

  it('skips unmatched holes without leaving holes; disposal is total', () => {
    const cls = signal('x');
    const title = signal('t');
    const text = signal('hello');
    const bindings: Binding[] = [
      { kind: 'attr', id: 'a0', attr: 'class', signal: cls },
      { kind: 'attr', id: 'a1', attr: 'title', signal: signal('missing') },
      { kind: 'attr', id: 'a2', attr: 'title', signal: title },
      { kind: 'text', id: 't3', signal: signal('missing') },
      { kind: 'text', id: 't4', signal: text },
    ];
    const node = row();
    const disposers = wireRowBindings(node, bindings);

    // Three wired holes → three callable entries, no sparse slots.
    expect(disposers).toHaveLength(3);
    for (let i = 0; i < disposers.length; i++) {
      expect(i in disposers).toBe(true);
      expect(typeof disposers[i]).toBe('function');
    }
    expect(node.getAttribute('class')).toBe('x');
    expect(node.firstElementChild?.getAttribute('title')).toBe('t');

    // Disposal walks every entry without a TypeError and detaches effects.
    expect(() => disposeRowBindings(disposers)).not.toThrow();
    cls.value = 'y';
    title.value = 'u';
    expect(node.getAttribute('class')).toBe('x');
    expect(node.firstElementChild?.getAttribute('title')).toBe('t');
  });

  it('a throwing hole after a skipped one still disposes the wired effects', () => {
    const cls = signal('x');
    const boom = {
      get value(): unknown {
        throw new Error('boom');
      },
      peek(): unknown {
        throw new Error('boom');
      },
    } as unknown as Binding['signal'];
    const node = row();
    expect(() =>
      wireRowBindings(node, [
        { kind: 'attr', id: 'a0', attr: 'class', signal: cls },
        { kind: 'attr', id: 'a1', attr: 'title', signal: signal('missing') },
        { kind: 'attr', id: 'a2', attr: 'title', signal: boom },
      ]),
    ).toThrow('boom');
    // The root-hole effect wired before the throw was disposed.
    cls.value = 'y';
    expect(node.getAttribute('class')).toBe('x');
  });
});
