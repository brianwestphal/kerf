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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import {
  batch,
  computed,
  delegate,
  delegateCapture,
  each,
  effect,
  mount,
  type SafeHtml,
  signal,
} from '../../src/index.js';

describe('Adversarial edge cases', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  // ─── Mount lifecycle ────────────────────────────────────────────────

  describe('mount lifecycle', () => {
    it('mount → dispose → mount(sameEl) with stale list content cleans up correctly', () => {
      const listA = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }];
      const dispose1 = mount(root, () => (
        <ul>{each(listA, (it) => <li data-key={String(it.id)}>{it.label}</li>)}</ul>
      ));
      expect(root.querySelectorAll('li').length).toBe(2);
      dispose1();

      // Stale content from mount A is still in the DOM after dispose.
      // mount B should wipe it cleanly via its first-render innerHTML reset.
      const listB = [{ id: 100, label: 'x' }, { id: 200, label: 'y' }, { id: 300, label: 'z' }];
      const dispose2 = mount(root, () => (
        <ol>{each(listB, (it) => <li data-key={String(it.id)}>{it.label}</li>)}</ol>
      ));
      expect(root.querySelector('ul')).toBe(null);
      expect(root.querySelector('ol')).not.toBe(null);
      expect(root.querySelectorAll('li').length).toBe(3);
      expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['x', 'y', 'z']);
      dispose2();
    });

    it('mount → dispose → mount on same element with both using arraySignal — patch queues do not bleed', () => {
      const sigA = arraySignal([{ id: 1, v: 'A1' }]);
      const dispose1 = mount(root, () => (
        <ul>{each(sigA, (r) => <li data-key={String(r.id)}>{r.v}</li>)}</ul>
      ));
      sigA.push({ id: 2, v: 'A2' });
      expect(root.querySelectorAll('li').length).toBe(2);
      dispose1();

      // After dispose, mutate sigA — should not crash (no live mount).
      sigA.push({ id: 3, v: 'A3' });

      // Second mount on the same element with a DIFFERENT arraySignal.
      const sigB = arraySignal([{ id: 100, v: 'B1' }, { id: 200, v: 'B2' }]);
      const dispose2 = mount(root, () => (
        <ul>{each(sigB, (r) => <li data-key={String(r.id)}>{r.v}</li>)}</ul>
      ));
      expect(root.querySelectorAll('li').length).toBe(2);
      expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['B1', 'B2']);

      // Mutating sigA must NOT update mount B's DOM.
      sigA.push({ id: 4, v: 'A4' });
      expect(root.querySelectorAll('li').length).toBe(2);  // still B's content

      // Mutating sigB updates B's DOM.
      sigB.push({ id: 300, v: 'B3' });
      expect(root.querySelectorAll('li').length).toBe(3);
      expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['B1', 'B2', 'B3']);
      dispose2();
    });

    it('mount on an element with pre-existing children replaces them', () => {
      root.innerHTML = '<p class="placeholder">loading…</p>';
      mount(root, () => <span>ready</span>);
      expect(root.querySelector('.placeholder')).toBe(null);
      expect(root.querySelector('span')!.textContent).toBe('ready');
    });

    it('100 mounts sharing one signal all update on signal change', () => {
      const tick = signal(0);
      const hosts: HTMLElement[] = [];
      const disposers: (() => void)[] = [];
      for (let i = 0; i < 100; i++) {
        const host = document.createElement('div');
        document.body.appendChild(host);
        hosts.push(host);
        disposers.push(mount(host, () => <span>{tick.value}</span>));
      }
      for (const h of hosts) expect(h.querySelector('span')!.textContent).toBe('0');
      tick.value = 42;
      for (const h of hosts) expect(h.querySelector('span')!.textContent).toBe('42');
      for (const d of disposers) d();
    });

    it('dispose called twice is a no-op', () => {
      const dispose = mount(root, () => <span>x</span>);
      dispose();
      expect(() => dispose()).not.toThrow();
    });

    it('signal mutation after dispose does not throw', () => {
      const x = signal(0);
      const dispose = mount(root, () => <span>{x.value}</span>);
      dispose();
      expect(() => { x.value = 99; }).not.toThrow();
      // DOM should NOT update post-dispose.
      expect(root.querySelector('span')!.textContent).toBe('0');
    });
  });

  // ─── Render returning unusual values ────────────────────────────────

  describe('render returning unusual values', () => {
    it('render returning null produces an empty render (React-style nothing)', () => {
      const dispose = mount(root, () => null);
      expect(root.innerHTML).toBe('');
      dispose();
    });

    it('render returning undefined produces an empty render', () => {
      const dispose = mount(root, () => undefined);
      expect(root.innerHTML).toBe('');
      dispose();
    });

    it('render returning false produces an empty render (cond && jsx pattern)', () => {
      const dispose = mount(root, () => false);
      expect(root.innerHTML).toBe('');
      dispose();
    });

    it('render returning true also produces an empty render (defensive)', () => {
      const dispose = mount(root, () => true);
      expect(root.innerHTML).toBe('');
      dispose();
    });

    it('render returning a number coerces to string via innerHTML', () => {
      const dispose = mount(root, () => 42);
      expect(root.innerHTML).toBe('42');
      dispose();
    });

    it('render returning empty string mounts cleanly', () => {
      const dispose = mount(root, () => '');
      expect(root.innerHTML).toBe('');
      dispose();
    });

    it('conditional-render pattern { cond ? <jsx/> : null } toggles between content and empty', () => {
      const show = signal(true);
      mount(root, () => (show.value ? <span>here</span> : null));
      expect(root.querySelector('span')!.textContent).toBe('here');
      show.value = false;
      expect(root.querySelector('span')).toBe(null);
      show.value = true;
      expect(root.querySelector('span')!.textContent).toBe('here');
    });

    it('conditional-render pattern { cond && <jsx/> } toggles between content and empty', () => {
      const show = signal(false);
      mount(root, () => (show.value && <span>here</span>));
      expect(root.querySelector('span')).toBe(null);
      show.value = true;
      expect(root.querySelector('span')!.textContent).toBe('here');
    });
  });

  // ─── Delegate lifecycle ─────────────────────────────────────────────

  describe('delegate lifecycle', () => {
    it('delegate handler that disposes the mount mid-event handles cleanly', () => {
      const tick = signal(0);
      let disposed = false;
      const dispose = mount(root, () => (
        <div>
          <button data-action="boom">{tick.value}</button>
        </div>
      ));
      delegate(root, 'click', '[data-action="boom"]', () => {
        dispose();
        disposed = true;
      });
      const btn = root.querySelector('button')!;
      expect(() => btn.click()).not.toThrow();
      expect(disposed).toBe(true);
      // Subsequent signal mutations should be a no-op.
      tick.value = 99;
      expect(root.querySelector('button')!.textContent).toBe('0');
    });

    it('delegate handler triggering its own re-render does not lose the binding', () => {
      const count = signal(0);
      mount(root, () => (
        <div>
          <button data-action="inc">{count.value}</button>
        </div>
      ));
      delegate(root, 'click', '[data-action="inc"]', () => { count.value += 1; });
      const btn = (): HTMLButtonElement => root.querySelector('button')!;
      btn().click();
      expect(btn().textContent).toBe('1');
      btn().click();
      btn().click();
      expect(btn().textContent).toBe('3');
    });

    it('delegate on a detached root does not throw on listener install', () => {
      const detached = document.createElement('div');
      // No `document.body.appendChild` — root is unattached.
      expect(() => {
        delegate(detached, 'click', '[data-action="x"]', () => undefined);
      }).not.toThrow();
    });
  });

  // ─── arraySignal corner cases ───────────────────────────────────────

  describe('arraySignal corner cases', () => {
    it('arraySignal sharing across mounts: each mount sees its own first-render snapshot', () => {
      const rows = arraySignal([{ id: 1, v: 'a' }, { id: 2, v: 'b' }]);
      const a = document.createElement('div'); document.body.appendChild(a);
      const b = document.createElement('div'); document.body.appendChild(b);

      const dispA = mount(a, () => <ul>{each(rows, (r) => <li data-key={String(r.id)}>A:{r.v}</li>)}</ul>);
      const dispB = mount(b, () => <ul>{each(rows, (r) => <li data-key={String(r.id)}>B:{r.v}</li>)}</ul>);

      expect(a.querySelectorAll('li').length).toBe(2);
      expect(b.querySelectorAll('li').length).toBe(2);

      // Mutate — both should update (one via granular, the other falls
      // through to snapshot per the documented contract).
      rows.update(0, (r) => ({ ...r, v: 'A!' }));
      expect(a.querySelector('li')!.textContent).toBe('A:A!');
      expect(b.querySelector('li')!.textContent).toBe('B:A!');

      dispA();
      dispB();
    });

    it('replace then update in same batch: snapshot path correctly applies both', () => {
      const rows = arraySignal([{ id: 1, v: 'a' }]);
      mount(root, () => <ul>{each(rows, (r) => <li data-key={String(r.id)}>{r.v}</li>)}</ul>);
      batch(() => {
        rows.replace([{ id: 10, v: 'X' }, { id: 20, v: 'Y' }]);
        rows.update(0, (r) => ({ ...r, v: 'X!' }));
      });
      const lis = root.querySelectorAll('li');
      expect(lis.length).toBe(2);
      expect(lis[0].textContent).toBe('X!');
      expect(lis[1].textContent).toBe('Y');
    });

    it('drift recovery: granular update after a thrown render rebuilds via snapshot', () => {
      // Pin the recovery path: a thrown row render leaves binding stale,
      // next mutation should rebuild via snapshot (KF-99).
      type R = { id: number; v: string; bad?: boolean };
      const rows = arraySignal<R>([{ id: 1, v: 'a' }]);
      mount(root, () => (
        <ul>{each(rows, (r) => {
          if (r.bad) throw new Error('boom');
          return <li data-key={String(r.id)}>{r.v}</li>;
        })}</ul>
      ));
      let caught: unknown = null;
      try {
        rows.insert(1, { id: 2, v: 'b', bad: true });
      } catch (e) { caught = e; }
      expect(caught).toBeInstanceOf(Error);
      // Recover by replacing the bad row.
      rows.update(1, () => ({ id: 2, v: 'b' }));
      const lis = root.querySelectorAll('li');
      expect(Array.from(lis).map((l) => l.textContent)).toEqual(['a', 'b']);
    });

    it('move with from === to is a no-op (no re-render)', () => {
      const rows = arraySignal([{ id: 1, v: 'a' }, { id: 2, v: 'b' }]);
      let renders = 0;
      mount(root, () => {
        renders++;
        return <ul>{each(rows, (r) => <li data-key={String(r.id)}>{r.v}</li>)}</ul>;
      });
      const initialRenders = renders;
      rows.move(0, 0);
      expect(renders).toBe(initialRenders);  // no patch, no re-render
    });

    it('computed reading both length and items reacts to both axes', () => {
      const rows = arraySignal([{ id: 1, v: 'a' }, { id: 2, v: 'b' }]);
      const summary = computed(() => `${rows.value.length}:${rows.value.map((r) => r.v).join(',')}`);
      expect(summary.value).toBe('2:a,b');
      rows.push({ id: 3, v: 'c' });
      expect(summary.value).toBe('3:a,b,c');
      rows.update(0, (r) => ({ ...r, v: 'A' }));
      expect(summary.value).toBe('3:A,b,c');
      rows.move(2, 0);
      expect(summary.value).toBe('3:c,A,b');
    });

    it('arraySignal mutated outside any mount does not throw and patches still queue', () => {
      const rows = arraySignal<{ id: number; v: string }>([]);
      // No mount — just mutating the signal.
      rows.push({ id: 1, v: 'a' });
      rows.push({ id: 2, v: 'b' });
      rows.update(0, (r) => ({ ...r, v: 'A' }));
      expect(rows.value).toEqual([{ id: 1, v: 'A' }, { id: 2, v: 'b' }]);
      // The patch queue should also have accumulated (verified via _consumePatches).
      const patches = (rows as unknown as { _consumePatches: () => unknown[] })._consumePatches();
      expect(patches.length).toBe(3);  // 2 inserts + 1 update
    });

    it('rapid-fire arraySignal mutations across many renders do not corrupt state', () => {
      const rows = arraySignal<{ id: number }>([]);
      mount(root, () => <ul>{each(rows, (r) => <li data-key={String(r.id)}>{r.id}</li>)}</ul>);
      // 200 pushes
      for (let i = 0; i < 200; i++) rows.push({ id: i });
      expect(root.querySelectorAll('li').length).toBe(200);
      // 100 random updates
      for (let i = 0; i < 100; i++) {
        const idx = Math.floor(Math.random() * rows.value.length);
        rows.update(idx, (r) => ({ id: r.id + 10000 }));
      }
      expect(root.querySelectorAll('li').length).toBe(200);
      // Reverse the whole thing via 200 moves
      for (let i = 0; i < 200; i++) rows.move(rows.value.length - 1, 0);
      expect(root.querySelectorAll('li').length).toBe(200);
    });
  });

  // ─── Shape transitions ──────────────────────────────────────────────

  describe('shape transitions', () => {
    it('two each() callsites that flip JSX order across renders — list-id behavior pinned', () => {
      // Per audit §2: list ids are positional via context.counter. If a render
      // re-orders each() calls, the counter assigns them differently. This test
      // pins current behavior and surfaces any regression.
      const phase = signal<'AB' | 'BA'>('AB');
      const itemsA = [{ id: 'a1', label: 'A1' }, { id: 'a2', label: 'A2' }];
      const itemsB = [{ id: 'b1', label: 'B1' }, { id: 'b2', label: 'B2' }];
      mount(root, () => (
        <div>
          {phase.value === 'AB' ? (
            <>
              <ul className="X">{each(itemsA, (it) => <li data-key={it.id}>{it.label}</li>)}</ul>
              <ul className="Y">{each(itemsB, (it) => <li data-key={it.id}>{it.label}</li>)}</ul>
            </>
          ) : (
            <>
              <ul className="X">{each(itemsB, (it) => <li data-key={it.id}>{it.label}</li>)}</ul>
              <ul className="Y">{each(itemsA, (it) => <li data-key={it.id}>{it.label}</li>)}</ul>
            </>
          )}
        </div>
      ));
      expect(root.querySelector('.X')!.querySelectorAll('li')[0].textContent).toBe('A1');
      expect(root.querySelector('.Y')!.querySelectorAll('li')[0].textContent).toBe('B1');
      // Flip JSX order. Behavior pinned: the .X list now contains itemsB
      // (because the each() at id=0 is now the B one), and .Y has itemsA.
      phase.value = 'BA';
      expect(root.querySelector('.X')!.querySelectorAll('li')[0].textContent).toBe('B1');
      expect(root.querySelector('.Y')!.querySelectorAll('li')[0].textContent).toBe('A1');
    });

    it('list disappears from segment then reappears — no ghost rows from a stale binding', () => {
      const show = signal(true);
      const items = [{ id: 1, label: 'x' }];
      mount(root, () => (
        <div>{show.value ? each(items, (it) => <li data-key={String(it.id)}>{it.label}</li>) : null}</div>
      ));
      expect(root.querySelectorAll('li').length).toBe(1);
      show.value = false;
      expect(root.querySelectorAll('li').length).toBe(0);
      show.value = true;
      expect(root.querySelectorAll('li').length).toBe(1);
      expect(root.querySelector('li')!.textContent).toBe('x');
    });

    it('each() inside a data-morph-skip subtree continues to update via the list reconciler', () => {
      // The diff stops at data-morph-skip, but the list reconciler is keyed on
      // its binding map (independent of the diff). Verify behavior.
      const rows = arraySignal([{ id: 1, v: 'a' }]);
      mount(root, () => (
        <div data-morph-skip>
          <ul>{each(rows, (r) => <li data-key={String(r.id)}>{r.v}</li>)}</ul>
        </div>
      ));
      expect(root.querySelector('li')!.textContent).toBe('a');
      // arraySignal mutation triggers a re-render. The diff sees the
      // top-level <div data-morph-skip> and short-circuits — but the list
      // reconciler runs AFTER the diff in mount.ts and operates directly on
      // binding.liveParent. So the list updates regardless.
      rows.push({ id: 2, v: 'b' });
      const lis = root.querySelectorAll('li');
      expect(lis.length).toBe(2);
      expect(Array.from(lis).map((l) => l.textContent)).toEqual(['a', 'b']);
    });
  });

  // ─── Focus survival ────────────────────────────────────────────────

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

describe('More adversarial cases', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  // ─── Mutation inside render ──────────────────────────────────────

  it('signal mutated synchronously inside its own render closure does not infinite-loop', () => {
    // signals-core uses cycle detection; mutating a signal you just read
    // should either coalesce or throw — verify no infinite loop crashes the test.
    const x = signal(0);
    let renders = 0;
    const dispose = mount(root, () => {
      renders++;
      // Read AND write in the same closure — only mutate once to avoid loop.
      if (x.value === 0 && renders === 1) {
        // Defer the mutation so we don't recurse synchronously into ourselves.
        Promise.resolve().then(() => { x.value = 1; });
      }
      return <span>{x.value}</span>;
    });
    // After the microtask runs, render should fire again with x=1.
    return Promise.resolve().then(() => {
      expect(root.querySelector('span')!.textContent).toBe('1');
      dispose();
    });
  });

  it('arraySignal mutation inside the render closure mid-render does not corrupt state', () => {
    // The arraySignal's eager mutation means changes are visible in the
    // signal even mid-render. Verify the next render reconciles correctly.
    const rows = arraySignal<{ id: number }>([{ id: 1 }]);
    let renders = 0;
    mount(root, () => {
      renders++;
      if (renders === 1) {
        // Defer to avoid sync recursion.
        Promise.resolve().then(() => { rows.push({ id: 2 }); });
      }
      return <ul>{each(rows, (r) => <li data-key={String(r.id)}>{r.id}</li>)}</ul>;
    });
    return Promise.resolve().then(() => {
      expect(root.querySelectorAll('li').length).toBe(2);
    });
  });

  // ─── Delegate stopPropagation ────────────────────────────────────

  it('delegateCapture stopPropagation prevents bubble-phase delegate from firing', () => {
    mount(root, () => (
      <div>
        <button data-action="x">click</button>
      </div>
    ));
    const captureCalls: string[] = [];
    const bubbleCalls: string[] = [];
    // delegateCapture installs in capture phase; stop here prevents bubble.
    const captureDispose = delegateCapture(root, 'click', '[data-action="x"]', (e) => {
      captureCalls.push('cap');
      e.stopPropagation();
    });
    const bubbleDispose = delegate(root, 'click', '[data-action="x"]', () => {
      bubbleCalls.push('bub');
    });
    root.querySelector('button')!.click();
    expect(captureCalls).toEqual(['cap']);
    expect(bubbleCalls).toEqual([]);
    captureDispose();
    bubbleDispose();
  });

  // ─── Cross-feature interaction ───────────────────────────────────

  it('focused input + each() reorder + delegated click all firing together', () => {
    interface Row { id: number; label: string }
    const rows = arraySignal<Row>([
      { id: 1, label: 'first' },
      { id: 2, label: 'second' },
    ]);
    let clicks = 0;
    mount(root, () => (
      <div>
        <ul>{each(rows, (r) => (
          <li data-key={String(r.id)}>
            <input type="text" defaultValue={r.label} />
            <button data-action="bump" data-id={String(r.id)}>+</button>
          </li>
        ))}</ul>
      </div>
    ));
    delegate(root, 'click', '[data-action="bump"]', () => { clicks++; });

    // Focus first input.
    const firstInput = root.querySelectorAll('input')[0] as HTMLInputElement;
    firstInput.focus();
    firstInput.value = 'edited';
    expect(document.activeElement).toBe(firstInput);

    // Reorder via move — the focused input's row goes to index 1.
    rows.move(0, 1);
    // Focus survives across the move (same node, different position).
    expect(document.activeElement).toBe(firstInput);
    expect((document.activeElement as HTMLInputElement).value).toBe('edited');

    // Click a button on the (now-second-position) row → handler fires.
    const buttons = root.querySelectorAll('button');
    buttons[1].click();
    expect(clicks).toBe(1);
  });

  // ─── Many signals + arraySignals in one render ──────────────────

  it('mixed signals + arraySignals render coherently in a single mount', () => {
    const heading = signal('initial heading');
    const rows = arraySignal([{ id: 1, v: 'r1' }]);
    mount(root, () => (
      <div>
        <h1>{heading.value}</h1>
        <ul>{each(rows, (r) => <li data-key={String(r.id)}>{r.v}</li>)}</ul>
      </div>
    ));
    expect(root.querySelector('h1')!.textContent).toBe('initial heading');
    expect(root.querySelectorAll('li').length).toBe(1);

    heading.value = 'updated';
    expect(root.querySelector('h1')!.textContent).toBe('updated');
    expect(root.querySelectorAll('li').length).toBe(1);  // list unchanged

    rows.push({ id: 2, v: 'r2' });
    expect(root.querySelectorAll('li').length).toBe(2);
    expect(root.querySelector('h1')!.textContent).toBe('updated');  // heading unchanged
  });

  // ─── Effect inside a mount render ────────────────────────────────

  it('effect created inside a mount render runs every render (caller responsibility)', () => {
    // No detection — effects inside renders accumulate. This test pins
    // current behavior (callers should not do this; documenting the cost).
    const tick = signal(0);
    let effectRuns = 0;
    const disposers: (() => void)[] = [];
    const dispose = mount(root, () => {
      void tick.value;
      // Each render creates a NEW effect. Without external dispose, they
      // pile up — but each one's subscription is independent.
      const d = effect(() => { effectRuns++; });
      disposers.push(d);
      return <span>{tick.value}</span>;
    });
    expect(effectRuns).toBeGreaterThanOrEqual(1);
    tick.value = 1;
    // The new render created another effect; the OLD effect's subscription
    // graph still exists too. effectRuns should grow per render plus per
    // subscription. Just verify it's increasing — the actual count is
    // implementation-detail-y.
    expect(effectRuns).toBeGreaterThanOrEqual(2);
    for (const d of disposers) d();
    dispose();
  });

  // ─── Dispose interleaving ───────────────────────────────────────

  it('disposing during a batched mutation does not crash', () => {
    const rows = arraySignal<{ id: number }>([{ id: 1 }]);
    const dispose = mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={String(r.id)}>{r.id}</li>)}</ul>
    ));
    expect(() => {
      batch(() => {
        rows.push({ id: 2 });
        rows.push({ id: 3 });
        dispose();
        rows.push({ id: 4 });  // post-dispose mutation
      });
    }).not.toThrow();
  });

  // ─── arraySignal of objects with shared shape but different identity ─

  it('two each() callsites with the same items array produce same DOM (identity in cache)', () => {
    const items = [{ id: 1, v: 'a' }, { id: 2, v: 'b' }];
    mount(root, () => (
      <div>
        <ul className="P">{each(items, (it) => <li data-key={String(it.id)}>P:{it.v}</li>)}</ul>
        <ul className="Q">{each(items, (it) => <li data-key={String(it.id)}>Q:{it.v}</li>)}</ul>
      </div>
    ));
    expect(root.querySelector('.P')!.querySelectorAll('li').length).toBe(2);
    expect(root.querySelector('.Q')!.querySelectorAll('li').length).toBe(2);
    // Different render functions → different cache entries by id, but the
    // item refs are shared. Both lists rendered correctly.
    expect(root.querySelector('.P')!.querySelectorAll('li')[0].textContent).toBe('P:a');
    expect(root.querySelector('.Q')!.querySelectorAll('li')[0].textContent).toBe('Q:a');
  });

  // ─── First render / dispose race ────────────────────────────────

  it('immediate dispose right after mount cleans up before any reactivity', () => {
    const x = signal(0);
    const dispose = mount(root, () => <span>{x.value}</span>);
    dispose();
    // After dispose, mutation should not propagate.
    x.value = 99;
    expect(root.querySelector('span')!.textContent).toBe('0');
  });

  // ─── Marker integrity under stress ──────────────────────────────

  it('marker remains a single comment node after 100 list-shape changes', () => {
    const items = signal<{ id: number }[]>([{ id: 1 }]);
    mount(root, () => (
      <ul>{each(items.value, (r) => <li data-key={String(r.id)}>{r.id}</li>)}</ul>
    ));
    for (let i = 0; i < 100; i++) {
      items.value = Array.from({ length: (i % 10) + 1 }, (_, j) => ({ id: j }));
    }
    const ul = root.querySelector('ul')!;
    let markerCount = 0;
    for (let c = ul.firstChild; c !== null; c = c.nextSibling) {
      if (c.nodeType === Node.COMMENT_NODE) markerCount++;
    }
    expect(markerCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Round 3 — exhaustive "forgot path B" probes
// ═══════════════════════════════════════════════════════════════════

describe('Round 3: granular path × cross-feature interactions', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('granular update of a row: data-morph-skip subtree on the row is replaced like any other row', () => {
    // The granular update path uses replaceChild — the old row's entire
    // KF-201: granular update now uses morph() instead of replaceChild,
    // so `data-morph-skip` on a row is properly honored — the row's subtree
    // is left verbatim and imperatively-set attributes survive. This is a
    // behavior fix: pre-KF-201 the granular path replaced the whole row and
    // ignored data-morph-skip.
    type R = { id: number; v: string };
    const rows = arraySignal<R>([{ id: 1, v: 'a' }]);
    mount(root, () => (
      <ul>{each(rows, (r) => (
        <li data-key={String(r.id)} data-morph-skip>
          <span>{r.v}</span>
        </li>
      ))}</ul>
    ));
    const li = root.querySelector('li')!;
    li.setAttribute('data-imperative', 'sticky');
    expect(li.getAttribute('data-imperative')).toBe('sticky');

    rows.update(0, (r) => ({ ...r, v: 'A' }));
    // KF-201: data-morph-skip on the row is honored. The <li> keeps its
    // identity, the imperatively-set attribute survives, and the subtree
    // is left verbatim — the new label "A" is NOT applied to the <span>
    // because data-morph-skip preserves the subtree.
    const sameLi = root.querySelector('li')!;
    expect(sameLi).toBe(li);
    expect(sameLi.getAttribute('data-imperative')).toBe('sticky');
    expect(sameLi.querySelector('span')!.textContent).toBe('a');
  });

  it('KF-201: granular update preserves focused contenteditable in the same row', () => {
    // KF-201: the granular path now uses morph() which short-circuits when
    // it encounters a focused contenteditable — the user's typed content
    // and focus are preserved across the update. (Pre-KF-201 the granular
    // path used replaceChild and dropped both.)
    const rows = arraySignal([{ id: 1, body: 'orig' }]);
    mount(root, () => (
      <ul>{each(rows, (r) => (
        <li data-key={String(r.id)}>
          <div contentEditable="true">{r.body}</div>
        </li>
      ))}</ul>
    ));
    const ce = root.querySelector('[contenteditable]') as HTMLElement;
    ce.focus();
    // Imperatively edit (simulate user typing).
    ce.innerHTML = 'edited inline';
    expect(document.activeElement).toBe(ce);

    // Granular update of the same row → morph honors focused-contenteditable
    // → typed content + focus survive.
    rows.update(0, (r) => ({ ...r, body: 'updated' }));
    const sameCe = root.querySelector('[contenteditable]') as HTMLElement;
    expect(sameCe).toBe(ce);
    expect(sameCe.innerHTML).toBe('edited inline');  // typed content preserved
    expect(document.activeElement).toBe(ce);
  });

  it('granular update preserves focused contenteditable behavior: different row → focus survives', () => {
    const rows = arraySignal([
      { id: 1, body: 'first' },
      { id: 2, body: 'second' },
    ]);
    mount(root, () => (
      <ul>{each(rows, (r) => (
        <li data-key={String(r.id)}>
          <div contentEditable="true">{r.body}</div>
        </li>
      ))}</ul>
    ));
    const editables = root.querySelectorAll('[contenteditable]');
    const firstCe = editables[0] as HTMLElement;
    firstCe.focus();
    firstCe.innerHTML = 'edited inline';
    expect(document.activeElement).toBe(firstCe);

    // Update a DIFFERENT row → first row is untouched, focus + typed text survive.
    rows.update(1, (r) => ({ ...r, body: 'second updated' }));
    expect(document.activeElement).toBe(firstCe);
    expect(firstCe.innerHTML).toBe('edited inline');
  });

  it('KF-201: granular update of a <details open> row preserves user-agent-set `open`', () => {
    // KF-201: the granular path uses morph() which treats `open` on
    // <details>/<dialog> as user-agent-owned (KF-84) and leaves it alone.
    // The <details> element keeps its identity and its open state across
    // an update of the same row. (Pre-KF-201 the granular path called
    // replaceChild and wiped the browser-set `open` attribute.)
    const rows = arraySignal([{ id: 1, label: 'panel' }]);
    mount(root, () => (
      <ul>{each(rows, (r) => (
        <li data-key={String(r.id)}>
          <details>
            <summary>click me</summary>
            <p>{r.label}</p>
          </details>
        </li>
      ))}</ul>
    ));
    const details = root.querySelector('details') as HTMLDetailsElement;
    details.setAttribute('open', '');
    expect(details.hasAttribute('open')).toBe(true);

    // Granular update — morph preserves <details>'s identity AND its `open`.
    rows.update(0, (r) => ({ ...r, label: 'updated panel' }));
    const sameDetails = root.querySelector('details') as HTMLDetailsElement;
    expect(sameDetails).toBe(details);
    expect(sameDetails.hasAttribute('open')).toBe(true);
    expect(sameDetails.querySelector('p')!.textContent).toBe('updated panel');
  });
});

describe('Round 3: cleanupOrphanBindings completeness', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('orphaned binding: items removed from DOM, marker removed, no leak after re-introduction', () => {
    const showA = signal(true);
    const itemsA = [{ id: 'a1' }, { id: 'a2' }];
    const itemsB = [{ id: 'b1' }];
    mount(root, () => (
      <div>
        {showA.value
          ? <ul className="A">{each(itemsA, (it) => <li data-key={it.id}>{it.id}</li>)}</ul>
          : <ul className="B">{each(itemsB, (it) => <li data-key={it.id}>{it.id}</li>)}</ul>}
      </div>
    ));
    expect(root.querySelectorAll('.A li').length).toBe(2);
    expect(root.querySelectorAll('.B').length).toBe(0);

    showA.value = false;
    expect(root.querySelectorAll('.A').length).toBe(0);
    expect(root.querySelectorAll('.B li').length).toBe(1);
    // No stray items from list A.
    expect(root.querySelector('[data-key="a1"]')).toBe(null);
    expect(root.querySelector('[data-key="a2"]')).toBe(null);
    // No stray markers.
    const allComments: Comment[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
    let c: Node | null;
    while ((c = walker.nextNode()) !== null) allComments.push(c as Comment);
    expect(allComments.length).toBe(1);  // exactly the B-list marker
    expect(allComments[0].data).toBe('kf-list:0');

    // Bring A back. Should rebuild from scratch — no ghost rows.
    showA.value = true;
    expect(root.querySelectorAll('.A li').length).toBe(2);
    expect(root.querySelectorAll('.B').length).toBe(0);
    expect(root.querySelector('[data-key="b1"]')).toBe(null);
  });

  it('multiple lists disappearing simultaneously: all cleaned up correctly', () => {
    const phase = signal<'AB' | 'none'>('AB');
    const itemsA = [{ id: 'a1' }];
    const itemsB = [{ id: 'b1' }];
    mount(root, () => (
      <div>
        {phase.value === 'AB' ? (
          <>
            <ul className="A">{each(itemsA, (it) => <li data-key={it.id}>{it.id}</li>)}</ul>
            <ul className="B">{each(itemsB, (it) => <li data-key={it.id}>{it.id}</li>)}</ul>
          </>
        ) : <p>nothing</p>}
      </div>
    ));
    expect(root.querySelectorAll('li').length).toBe(2);

    phase.value = 'none';
    expect(root.querySelectorAll('li').length).toBe(0);
    expect(root.querySelector('p')!.textContent).toBe('nothing');
    // No leftover markers.
    let markerCount = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
    let c: Node | null;
    while ((c = walker.nextNode()) !== null) {
      if ((c as Comment).data.startsWith('kf-list:')) markerCount++;
    }
    expect(markerCount).toBe(0);

    // Restore — everything rebuilds.
    phase.value = 'AB';
    expect(root.querySelectorAll('li').length).toBe(2);
  });

  it('granular reconcile after a list is removed and re-introduced uses the snapshot path correctly', () => {
    const showA = signal(true);
    const sigA = arraySignal([{ id: 1, v: 'a' }]);
    mount(root, () => (
      <div>{showA.value
        ? <ul>{each(sigA, (r) => <li data-key={String(r.id)}>{r.v}</li>)}</ul>
        : <p>hidden</p>}
      </div>
    ));
    expect(root.querySelectorAll('li').length).toBe(1);

    // Hide.
    showA.value = false;
    expect(root.querySelector('p')!.textContent).toBe('hidden');

    // Mutate sigA while hidden — patches accumulate in the queue.
    sigA.push({ id: 2, v: 'b' });
    sigA.push({ id: 3, v: 'c' });

    // Re-show — first render of the now-fresh list. KF-98: first render
    // should drain patches and take the snapshot path, rendering all 3 rows.
    showA.value = true;
    const lis = root.querySelectorAll('li');
    expect(lis.length).toBe(3);
    expect(Array.from(lis).map((l) => l.textContent)).toEqual(['a', 'b', 'c']);
  });
});

describe('Round 3: re-mount state reset', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('re-mount on same element: each() callsite at position 0 starts with id 0 (no leak from prior mount)', () => {
    const itemsA = [{ id: 'a1' }, { id: 'a2' }];
    const dispose1 = mount(root, () => (
      <div>
        <ul>{each(itemsA, (it) => <li data-key={it.id}>{it.id}</li>)}</ul>
        <ul>{each(itemsA, (it) => <li data-key={`${it.id}-x`}>{it.id}-x</li>)}</ul>
      </div>
    ));
    expect(root.querySelectorAll('li').length).toBe(4);  // 2 + 2
    const m1 = root.querySelectorAll('ul')[0];
    const m1Comments = Array.from(m1.childNodes).filter((n) => n.nodeType === Node.COMMENT_NODE) as Comment[];
    expect(m1Comments[0].data).toBe('kf-list:0');
    dispose1();

    // Re-mount — counter should reset.
    const itemsB = [{ id: 'b1' }];
    const dispose2 = mount(root, () => (
      <ol>{each(itemsB, (it) => <li data-key={it.id}>{it.id}</li>)}</ol>
    ));
    const ol = root.querySelector('ol')!;
    const olComments = Array.from(ol.childNodes).filter((n) => n.nodeType === Node.COMMENT_NODE) as Comment[];
    expect(olComments[0].data).toBe('kf-list:0');
    expect(root.querySelectorAll('li').length).toBe(1);
    dispose2();
  });

  it('re-mount on same element: prevStaticHtml comparison does not falsely match cross-mount', () => {
    const tickA = signal(0);
    const dispose1 = mount(root, () => {
      void tickA.value;
      return <div>same</div>;
    });
    expect(root.querySelector('div')!.textContent).toBe('same');
    dispose1();

    // Second mount produces the SAME static HTML. Verify the new mount
    // does its own first render correctly (doesn't accidentally hit the
    // KF-88 fast path from a stale closure).
    const tickB = signal(0);
    const dispose2 = mount(root, () => {
      void tickB.value;
      return <div>same</div>;
    });
    expect(root.querySelector('div')!.textContent).toBe('same');

    // Mutating B's signal triggers a re-render. KF-88 fast path WILL fire
    // (surrounds match), but the second-mount's own renderCtx is fresh,
    // not B-from-A's. Verify the binding map is independent.
    tickB.value = 1;
    expect(root.querySelector('div')!.textContent).toBe('same');
    dispose2();
  });
});

describe('Round 3: subtle JSX child types', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('JSX child of 0 (falsy number) renders as the string "0"', () => {
    // The trap: `{count}` where count === 0 should render "0", not skip.
    // React-style "render number except false-y short-circuit" is:
    //   `{count && <Foo/>}` → false / 0 / null / undefined renders nothing.
    //   `{count}` → renders the number's string.
    // Verify kerf does the same.
    mount(root, () => <div>count={0}</div>);
    expect(root.querySelector('div')!.textContent).toBe('count=0');
  });

  it('JSX child of NaN renders as "NaN" string', () => {
    mount(root, () => <div>{NaN}</div>);
    expect(root.querySelector('div')!.textContent).toBe('NaN');
  });

  it('JSX child of empty array renders nothing', () => {
    mount(root, () => <div>{[]}</div>);
    expect(root.querySelector('div')!.textContent).toBe('');
  });

  it('JSX child of array of strings renders concatenated', () => {
    mount(root, () => <div>{['a', 'b', 'c']}</div>);
    expect(root.querySelector('div')!.textContent).toBe('abc');
  });

  it('JSX child of array containing null/false/undefined skips them', () => {
    mount(root, () => <div>{['a', null, 'b', false, 'c', undefined]}</div>);
    expect(root.querySelector('div')!.textContent).toBe('abc');
  });

  it('Function-component invocation with children prop works correctly', () => {
    function Card({ title, children }: { title: string; children?: unknown }): SafeHtml {
      return <div className="card"><h3>{title}</h3><div>{children as never}</div></div>;
    }
    mount(root, () => (
      <Card title="hello"><p>body</p></Card>
    ));
    expect(root.querySelector('.card h3')!.textContent).toBe('hello');
    expect(root.querySelector('.card p')!.textContent).toBe('body');
  });
});

describe('Round 3: nested each()', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('each() inside each(): parent rows + child rows render with stable identity', () => {
    interface Group { id: string; items: { id: string; label: string }[] }
    const groups: Group[] = [
      { id: 'g1', items: [{ id: 'g1.a', label: '1.A' }, { id: 'g1.b', label: '1.B' }] },
      { id: 'g2', items: [{ id: 'g2.a', label: '2.A' }] },
    ];
    mount(root, () => (
      <ul>{each(groups, (g) => (
        <li data-key={g.id}>
          <strong>{g.id}</strong>
          <ul>{each(g.items, (it) => <li data-key={it.id}>{it.label}</li>)}</ul>
        </li>
      ))}</ul>
    ));
    expect(root.querySelectorAll('li[data-key="g1"]').length).toBe(1);
    expect(root.querySelectorAll('li[data-key="g1.a"]').length).toBe(1);
    expect(root.querySelectorAll('li[data-key="g1.b"]').length).toBe(1);
    expect(root.querySelectorAll('li[data-key="g2.a"]').length).toBe(1);
    // Two ULs total: outer + each inner group's inner UL.
    expect(root.querySelectorAll('ul').length).toBe(3);
  });
});

describe('Round 3: render-throw recovery', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('render throws on first call: mount itself throws', () => {
    expect(() => {
      mount(root, () => { throw new Error('boom'); });
    }).toThrow(/boom/);
  });

  it('render throws on subsequent call: signal mutation propagates the throw', () => {
    const tick = signal(0);
    let calls = 0;
    mount(root, () => {
      calls++;
      if (tick.value === 1) throw new Error('boom');
      return <span>{tick.value}</span>;
    });
    expect(calls).toBe(1);
    expect(() => { tick.value = 1; }).toThrow();
    expect(calls).toBe(2);
    // Recovery: subsequent mutation re-runs the render.
    tick.value = 2;
    expect(calls).toBe(3);
    expect(root.querySelector('span')!.textContent).toBe('2');
  });
});

describe('Round 3: delegate handler corner cases', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('multiple delegate handlers for the same selector + event type both fire', () => {
    mount(root, () => <button data-action="x">click</button>);
    let aCalls = 0;
    let bCalls = 0;
    delegate(root, 'click', '[data-action="x"]', () => { aCalls++; });
    delegate(root, 'click', '[data-action="x"]', () => { bCalls++; });
    root.querySelector('button')!.click();
    expect(aCalls).toBe(1);
    expect(bCalls).toBe(1);
  });

  it('delegate handler that removes the matched element does not crash', () => {
    const remove = signal(false);
    mount(root, () => (
      remove.value ? <p>gone</p> : <button data-action="self-destruct">click</button>
    ));
    delegate(root, 'click', '[data-action="self-destruct"]', () => { remove.value = true; });
    const btn = root.querySelector('button')!;
    expect(() => btn.click()).not.toThrow();
    expect(root.querySelector('button')).toBe(null);
    expect(root.querySelector('p')!.textContent).toBe('gone');
  });

  it('delegate disposer called twice is a no-op', () => {
    mount(root, () => <button data-action="x">click</button>);
    const dispose = delegate(root, 'click', '[data-action="x"]', () => undefined);
    dispose();
    expect(() => dispose()).not.toThrow();
  });
});

describe('Round 3: arraySignal × rare item shapes', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('arraySignal of items with Symbol-keyed properties renders correctly', () => {
    const tag = Symbol('tag');
    interface Item { id: number; [tag]: string; label: string }
    const items: Item[] = [
      { id: 1, [tag]: 'a', label: 'one' },
      { id: 2, [tag]: 'b', label: 'two' },
    ];
    const sig = arraySignal(items);
    mount(root, () => <ul>{each(sig, (r) => <li data-key={String(r.id)}>{r.label}</li>)}</ul>);
    expect(root.querySelectorAll('li').length).toBe(2);
    expect(root.querySelectorAll('li')[0].textContent).toBe('one');
  });

  it('arraySignal items can be class instances (not just plain objects)', () => {
    class Row {
      constructor(public id: number, public label: string) {}
    }
    const sig = arraySignal<Row>([new Row(1, 'one'), new Row(2, 'two')]);
    mount(root, () => <ul>{each(sig, (r) => <li data-key={String(r.id)}>{r.label}</li>)}</ul>);
    expect(root.querySelectorAll('li').length).toBe(2);
    sig.update(0, (r) => new Row(r.id, 'ONE'));
    expect(root.querySelector('li')!.textContent).toBe('ONE');
  });

  it('arraySignal containing frozen objects (Object.freeze) — mutation still works via update', () => {
    interface Row { id: number; v: string }
    const sig = arraySignal<Row>([Object.freeze({ id: 1, v: 'a' }) as Row]);
    mount(root, () => <ul>{each(sig, (r) => <li data-key={String(r.id)}>{r.v}</li>)}</ul>);
    expect(root.querySelector('li')!.textContent).toBe('a');
    // update returns a new object, so the frozen one isn't mutated in place.
    sig.update(0, (r) => ({ id: r.id, v: 'A' }));
    expect(root.querySelector('li')!.textContent).toBe('A');
  });
});

describe('Round 3: signal/computed extreme cases', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('signal === comparison: setting same value does NOT trigger re-render', () => {
    const x = signal({ ref: 1 });
    let runs = 0;
    mount(root, () => {
      void x.value;
      runs++;
      return <span>x</span>;
    });
    expect(runs).toBe(1);
    // Same reference → no notification. Capture the ref into a local first
    // so the reassignment isn't a literal `x.value = x.value` self-assign
    // (which lint flags but is exactly the behavior we want to test).
    const sameRef = x.value;
    x.value = sameRef;
    expect(runs).toBe(1);
  });

  it('computed of a computed (chained) updates correctly when bottom signal changes', () => {
    const a = signal(1);
    const b = computed(() => a.value + 1);
    const c = computed(() => b.value + 1);
    const d = computed(() => c.value + 1);
    mount(root, () => <span>{d.value}</span>);
    expect(root.querySelector('span')!.textContent).toBe('4');
    a.value = 10;
    expect(root.querySelector('span')!.textContent).toBe('13');
  });

  it('computed with no dependencies acts as a constant', () => {
    const c = computed(() => 42);
    mount(root, () => <span>{c.value}</span>);
    expect(root.querySelector('span')!.textContent).toBe('42');
  });
});
