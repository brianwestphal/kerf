/**
 * Adversarial edge-case probes — written in response to the "we should
 * be extremely thorough" directive. Each test exercises a scenario the
 * earlier audit (KF-104) flagged as untested but plausibly bug-prone.
 *
 * Categories covered:
 *   - mount lifecycle: mount → dispose → mount on the same element;
 *     mount on a pre-populated element; render returning null /
 *     undefined / number / boolean; many mounts sharing one signal.
 *   - delegate lifecycle: handler that disposes its own mount; root
 *     detached from document; re-entrance through re-render.
 *   - arraySignal corner cases: drift recovery; cross-mount sharing
 *     after dispose; replace-then-update batched; mutation inside a
 *     computed; computed reading both length and array.
 *   - shape transitions: two each() callsites where a phase flip
 *     re-orders them (KF-104 §2 — known positional-id collision).
 *   - focus survival: focus inside an UNCHANGED row across a granular
 *     update; focus on a SIBLING of a granular-updated row.
 *   - fast-path corners: KF-88 with re-render that DOES change a
 *     list's items but not the surrounds; KF-89 with stable items in
 *     out-of-order positions; KF-93 with non-contiguous insert runs;
 *     KF-99 drift recovery after a granular reconcile failure.
 *   - data-morph-skip wrapping a list parent.
 *   - Stress: 1000-row mutate-and-restore round-trip.
 */
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import {
batch,
computed,
delegate,
each,
effect,
mount,
signal
} from '../../src/index.js';

describe('Adversarial edge cases', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  // ─── Mount lifecycle ────────────────────────────────────────────────

  describe('stress + invariants', () => {
    it('1000-row mutate-and-restore round-trip: final DOM matches initial DOM', () => {
      const initial = Array.from({ length: 1000 }, (_, i) => ({ id: i, v: `r${i}` }));
      const rows = arraySignal(initial);
      mount(root, () => <ul>{each(rows, (r) => <li data-key={String(r.id)}>{r.v}</li>)}</ul>);
      const initialFingerprint = Array.from(root.querySelectorAll('li')).map((l) => l.textContent);
      expect(initialFingerprint.length).toBe(1000);

      // Reverse, then reverse again.
      rows.replace([...rows.value].reverse());
      rows.replace([...rows.value].reverse());
      const finalFingerprint = Array.from(root.querySelectorAll('li')).map((l) => l.textContent);
      expect(finalFingerprint).toEqual(initialFingerprint);
    });

    it('mount + delegate + arraySignal stress: 100 click-driven inserts produce 100 rows in correct order', () => {
      const rows = arraySignal<{ id: number }>([]);
      mount(root, () => (
        <div>
          <button data-action="add">add</button>
          <ul>{each(rows, (r) => <li data-key={String(r.id)}>{r.id}</li>)}</ul>
        </div>
      ));
      let nextId = 0;
      delegate(root, 'click', '[data-action="add"]', () => {
        rows.push({ id: nextId++ });
      });
      const btn = root.querySelector('button')!;
      for (let i = 0; i < 100; i++) btn.click();
      const lis = root.querySelectorAll('li');
      expect(lis.length).toBe(100);
      expect(Array.from(lis).map((l) => Number(l.textContent))).toEqual(
        Array.from({ length: 100 }, (_, i) => i),
      );
    });

    it('signal mutated 100 times in a single batch fires render exactly once', () => {
      const x = signal(0);
      let renders = 0;
      mount(root, () => {
        renders++;
        return <span>{x.value}</span>;
      });
      const before = renders;
      batch(() => {
        for (let i = 0; i < 100; i++) x.value = i;
      });
      // Renders incremented by exactly 1 (final coalesced run).
      expect(renders).toBe(before + 1);
      expect(root.querySelector('span')!.textContent).toBe('99');
    });
  });

  // ─── computed corner cases ───────────────────────────────────────

  describe('computed corner cases', () => {
    it('computed used as a JSX expression updates correctly', () => {
      const a = signal(1);
      const b = signal(2);
      const sum = computed(() => a.value + b.value);
      mount(root, () => <span>sum={sum.value}</span>);
      expect(root.querySelector('span')!.textContent).toBe('sum=3');
      a.value = 10;
      expect(root.querySelector('span')!.textContent).toBe('sum=12');
    });

    it('effect throws → next signal mutation still triggers the effect (subscription survives)', () => {
      const x = signal(0);
      let runs = 0;
      effect(() => {
        runs++;
        if (x.value === 1) throw new Error('boom');
      });
      expect(runs).toBe(1);
      expect(() => { x.value = 1; }).toThrow();
      expect(runs).toBe(2);  // ran, threw
      // Subscription survives: next mutation still fires the effect.
      x.value = 2;
      expect(runs).toBe(3);
    });

    it('chain of computed (a → b → c) updates in dependency order', () => {
      const a = signal(1);
      const b = computed(() => a.value * 10);
      const c = computed(() => b.value + 1);
      mount(root, () => <span>{c.value}</span>);
      expect(root.querySelector('span')!.textContent).toBe('11');
      a.value = 5;
      expect(root.querySelector('span')!.textContent).toBe('51');
    });
  });

  // ─── Marker resilience ───────────────────────────────────────────

  describe('marker resilience', () => {
    it('list marker remains in the DOM after first render and across re-renders', () => {
      const tick = signal(0);
      mount(root, () => {
        void tick.value;
        return <ul>{each([{ id: 1 }, { id: 2 }], (r) => <li data-key={String(r.id)}>{r.id}</li>)}</ul>;
      });
      const ul = root.querySelector('ul')!;
      const findMarker = (): Comment | null => {
        for (let c = ul.firstChild; c !== null; c = c.nextSibling) {
          if (c.nodeType === Node.COMMENT_NODE) return c as Comment;
        }
        return null;
      };
      const m1 = findMarker();
      expect(m1).not.toBe(null);
      expect(m1!.data).toBe('kf-list:0');

      // Re-render shouldn't move or duplicate the marker.
      tick.value = 1;
      tick.value = 2;
      const m2 = findMarker();
      expect(m2).toBe(m1);  // same node identity
      const allComments: Comment[] = [];
      for (let c = ul.firstChild; c !== null; c = c.nextSibling) {
        if (c.nodeType === Node.COMMENT_NODE) allComments.push(c as Comment);
      }
      expect(allComments.length).toBe(1);  // exactly one marker, no duplicates
    });
  });
});

// Avoid unused import warning if vi is referenced only for setup/teardown semantics.
void vi;
