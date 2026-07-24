/**
 * A list-identity shift costs a rebuild, never correctness.
 *
 * An unkeyed list is identified by its position among the `each()` calls, so a
 * render that changes how many of them run can hand an id to a different list.
 * The documented consequence is a from-scratch rebuild — rows lose DOM identity,
 * and with it focus, scroll and IME state. What actually happened was worse:
 * **the surviving list rendered the departed list's rows.**
 *
 * Two structures were being read as the arriving list's own:
 *
 *  - the per-item HTML memo, which two lists over one source hit identically
 *    (same refs, same `cacheKey`) — so the wrong row markup was emitted. The
 *    recorded-source guard cannot see this, because a shared source is
 *    identical by construction.
 *  - the live `ListBinding`, which was reused whenever *a* marker with that id
 *    was still in the tree rather than the same marker NODE — so the arriving
 *    list inherited the previous occupant's parent and anchor, and its rows
 *    landed inside the wrong container.
 *
 * Found by the property-based harness in `reconciler-fuzz.test.ts`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { batch, each, mount, signal } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
  // The identity-shift advisory is always-on and expected throughout this file.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const at = (sel: string): string[] =>
  Array.from(root.querySelectorAll(sel)).map((el) => el.getAttribute('data-key') ?? '');

describe('KF-403: an identity shift rebuilds, and never renders another list’s rows', () => {
  it('the surviving list renders its OWN rows when a conditional list ahead of it disappears', () => {
    const cond = signal(true);
    const s = arraySignal([{ id: 'a' }]);
    const dispose = mount(root, () => (
      <div>
        {cond.value ? each(s, (r) => <li data-list="0" data-key={`L0_${r.id}`}>{r.id}</li>) : ''}
        <p>{each(s, (r) => <li data-list="1" data-key={`L1_${r.id}`}>{r.id}</li>)}</p>
      </div>
    ));
    expect(at('[data-list="0"]')).toEqual(['L0_a']);
    expect(at('[data-list="1"]')).toEqual(['L1_a']);

    cond.value = false;
    expect(at('[data-list="0"]')).toEqual([]);
    expect(at('p > [data-list="1"]')).toEqual(['L1_a']);

    // …and back, where the arriving list must not adopt the other's container.
    cond.value = true;
    expect(at('div > [data-list="0"]')).toEqual(['L0_a']);
    expect(at('p > [data-list="1"]')).toEqual(['L1_a']);
    expect(at('p > [data-list="0"]')).toEqual([]);
    dispose();
  });

  it('survives repeated toggles without either list drifting', () => {
    const cond = signal(true);
    const s = arraySignal([{ id: 'a' }, { id: 'b' }]);
    const dispose = mount(root, () => (
      <div>
        {cond.value ? each(s, (r) => <li data-list="0" data-key={`L0_${r.id}`}>{r.id}</li>) : ''}
        <p>{each(s, (r) => <li data-list="1" data-key={`L1_${r.id}`}>{r.id}</li>)}</p>
      </div>
    ));
    for (let i = 0; i < 4; i++) {
      cond.value = !cond.value;
      expect(at('p > [data-list="1"]')).toEqual(['L1_a', 'L1_b']);
      expect(at('[data-list="0"]')).toEqual(cond.value ? ['L0_a', 'L0_b'] : []);
    }
    dispose();
  });

  it('a shift batched with a mutation of the shared source still renders each list its own data', () => {
    const cond = signal(true);
    const s = arraySignal([{ id: 'a' }]);
    const dispose = mount(root, () => (
      <div>
        {cond.value ? each(s, (r) => <li data-list="0" data-key={`L0_${r.id}`}>{r.id}</li>) : ''}
        <p>{each(s, (r) => <li data-list="1" data-key={`L1_${r.id}`}>{r.id}</li>)}</p>
      </div>
    ));
    batch(() => {
      cond.value = false;
      s.push({ id: 'b' });
    });
    expect(at('p > [data-list="1"]')).toEqual(['L1_a', 'L1_b']);
    expect(at('[data-list="0"]')).toEqual([]);
    dispose();
  });

  it('the shift costs a rebuild, not correctness — content is right even where node identity is lost', () => {
    const cond = signal(true);
    const a = [{ id: 'a1' }];
    const b = [{ id: 'b1' }, { id: 'b2' }];
    const dispose = mount(root, () => (
      <div>
        {cond.value ? <ul class="first">{each(a, (r) => <li data-key={r.id}>{r.id}</li>)}</ul> : ''}
        <ul class="second">{each(b, (r) => <li data-key={r.id}>{r.id}</li>)}</ul>
      </div>
    ));
    cond.value = false;
    expect(at('ul.second li')).toEqual(['b1', 'b2']);
    cond.value = true;
    expect(at('ul.first li')).toEqual(['a1']);
    expect(at('ul.second li')).toEqual(['b1', 'b2']);
    dispose();
  });

  it('KEYED lists are untouched by the reset — they keep row identity across the same toggle', () => {
    const cond = signal(true);
    const a = arraySignal([{ id: 'a1' }]);
    const b = arraySignal([{ id: 'b1' }]);
    const dispose = mount(root, () => (
      <div>
        {cond.value
          ? <ul data-key="ca">{each(a, (r) => <li data-key={r.id}>{r.id}</li>)}</ul>
          : ''}
        <ul data-key="cb">{each(b, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'B' })}</ul>
      </div>
    ));
    const row = root.querySelector('ul[data-key="cb"] li[data-key="b1"]');
    cond.value = false;
    expect(root.querySelector('ul[data-key="cb"] li[data-key="b1"]')).toBe(row);
    cond.value = true;
    expect(root.querySelector('ul[data-key="cb"] li[data-key="b1"]')).toBe(row);
    dispose();
  });

  it('a steady-state render does not pay the extra pass (unchanged call count, cache intact)', () => {
    const bump = signal(0);
    const rows = [{ id: 'r1' }, { id: 'r2' }];
    let renderCalls = 0;
    const dispose = mount(root, () => {
      renderCalls++;
      return (
        <div>
          <p>{String(bump.value)}</p>
          <ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>)}</ul>
        </div>
      );
    });
    expect(renderCalls).toBe(1);
    bump.value = 1;
    // One render pass, not two: the reset-and-retry only fires when the number
    // of unkeyed each() calls actually moved.
    expect(renderCalls).toBe(2);
    bump.value = 2;
    expect(renderCalls).toBe(3);
    dispose();
  });
});
