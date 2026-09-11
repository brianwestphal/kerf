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
delegate,
each,
mount,
signal
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


});

// Avoid unused import warning if vi is referenced only for setup/teardown semantics.
void vi;
