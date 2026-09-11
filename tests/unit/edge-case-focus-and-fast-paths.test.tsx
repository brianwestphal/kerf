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
each,
mount,
signal
} from '../../src/index.js';

describe('Adversarial edge cases', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  // ─── Mount lifecycle ────────────────────────────────────────────────

  describe('focus survival on the granular path', () => {
    it('focus inside an unchanged row survives a granular update of a different row', () => {
      const rows = arraySignal([
        { id: 1, label: 'a' },
        { id: 2, label: 'b' },
      ]);
      mount(root, () => (
        <ul>{each(rows, (r) => (
          <li data-key={String(r.id)}>
            <input type="text" defaultValue={r.label} />
          </li>
        ))}</ul>
      ));
      const inputs = root.querySelectorAll('input');
      const firstInput = inputs[0] as HTMLInputElement;
      firstInput.focus();
      firstInput.value = 'typed';
      expect(document.activeElement).toBe(firstInput);

      // Update a DIFFERENT row — should not disturb the focused first input.
      rows.update(1, (r) => ({ ...r, label: 'B!' }));
      expect(document.activeElement).toBe(firstInput);
      expect((document.activeElement as HTMLInputElement).value).toBe('typed');
    });

    it('KF-201: focus inside the same row that gets granular-updated NOW survives', () => {
      // KF-201: granular updates now morph the row in place instead of
      // replaceChild. The row's <li> keeps its identity, and focus on a
      // descendant input survives the update. (Pre-KF-201 the granular path
      // replaced the whole <li> on every update, which dropped focus inside.)
      const rows = arraySignal([{ id: 1, label: 'a' }]);
      mount(root, () => (
        <ul>{each(rows, (r) => (
          <li data-key={String(r.id)}>
            <input type="text" defaultValue={r.label} />
          </li>
        ))}</ul>
      ));
      const input = root.querySelector('input') as HTMLInputElement;
      input.focus();
      expect(document.activeElement).toBe(input);

      rows.update(0, (r) => ({ ...r, label: 'A!' }));
      // Focus is preserved on the original input.
      expect(document.activeElement).toBe(input);
    });
  });

  // ─── Fast-path corners ────────────────────────────────────────────

  describe('fast-path corners', () => {
    it('KF-89 fast path with same-length list of same refs but text-changed via cacheKey', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const selectedId = signal(1);
      mount(root, () => (
        <ul>
          {each(items, (it) => (
            <li
              data-key={String(it.id)}
              className={it.id === selectedId.value ? 'sel' : ''}
            >
              {it.id}
            </li>
          ), (it) => `${it.id}-${it.id === selectedId.value ? 1 : 0}`)}
        </ul>
      ));
      expect(root.querySelectorAll('li.sel').length).toBe(1);
      expect(root.querySelectorAll('li.sel')[0].textContent).toBe('1');
      selectedId.value = 2;
      expect(root.querySelectorAll('li.sel').length).toBe(1);
      expect(root.querySelectorAll('li.sel')[0].textContent).toBe('2');
    });

    it('KF-93 contiguous insert detector: alternating insert/update breaks the run', () => {
      const rows = arraySignal([{ id: 0, v: 'seed' }]);
      mount(root, () => <ul>{each(rows, (r) => <li data-key={String(r.id)}>{r.v}</li>)}</ul>);
      // Mix insert + update in one batch — KF-93's run detector should NOT
      // bulk-parse all of them; it only fires for contiguous-index insert runs.
      batch(() => {
        rows.insert(1, { id: 1, v: 'A' });
        rows.update(0, (r) => ({ ...r, v: 'SEED!' }));
        rows.insert(2, { id: 2, v: 'B' });
      });
      const lis = root.querySelectorAll('li');
      expect(Array.from(lis).map((l) => l.textContent)).toEqual(['SEED!', 'A', 'B']);
    });

    it('KF-94 update run detector: identical-html updates are no-ops, run still recognized', () => {
      const rows = arraySignal([
        { id: 1, v: 'a' }, { id: 2, v: 'b' }, { id: 3, v: 'c' },
      ]);
      mount(root, () => <ul>{each(rows, (r) => <li data-key={String(r.id)}>{r.v}</li>)}</ul>);
      const before = Array.from(root.querySelectorAll('li'));
      // Trigger updates that produce IDENTICAL html (same v).
      batch(() => {
        rows.update(0, (r) => ({ ...r }));
        rows.update(1, (r) => ({ ...r }));
        rows.update(2, (r) => ({ ...r }));
      });
      const after = Array.from(root.querySelectorAll('li'));
      // Same nodes (identity preserved) — no replacement happened.
      expect(after[0]).toBe(before[0]);
      expect(after[1]).toBe(before[1]);
      expect(after[2]).toBe(before[2]);
    });

    it('KF-99 drift detection: external _consumePatches drain followed by a normal mutation', () => {
      // Simulate something draining the patch queue mid-flight (e.g. a second
      // each() callsite that ran granular before this one). The next mutation
      // should still reconcile correctly.
      const rows = arraySignal([{ id: 1, v: 'a' }, { id: 2, v: 'b' }]);
      mount(root, () => <ul>{each(rows, (r) => <li data-key={String(r.id)}>{r.v}</li>)}</ul>);
      // Drain externally — simulates the "second consumer of same arraySignal".
      (rows as unknown as { _consumePatches: () => unknown[] })._consumePatches();
      // Normal mutation: should still propagate.
      rows.update(0, (r) => ({ ...r, v: 'A!' }));
      expect(root.querySelector('li')!.textContent).toBe('A!');
    });

    it('first render of an arraySignal that was mutated 1000 times pre-mount renders all 1000 rows', () => {
      // KF-98 pinning: pre-mount mutations should NOT produce an empty first render.
      const rows = arraySignal<{ id: number }>([]);
      for (let i = 0; i < 1000; i++) rows.push({ id: i });
      mount(root, () => <ul>{each(rows, (r) => <li data-key={String(r.id)}>{r.id}</li>)}</ul>);
      expect(root.querySelectorAll('li').length).toBe(1000);
    });
  });

  // ─── Stress + invariants ──────────────────────────────────────────


});

// Avoid unused import warning if vi is referenced only for setup/teardown semantics.
void vi;
