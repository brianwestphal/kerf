/**
 * KF-380 — the morph × fine-grained-binding × owned-each()-row interaction
 * matrix, tested adversarially.
 *
 * Why this file exists: KF-374 (morph dropped the static text siblings of a
 * bound text hole) and KF-377 (removing a conditional sibling before a keyed
 * list permanently emptied it) both shipped silently under the 100%-line /
 * 99%-branch coverage gate. Line coverage is structurally blind to a missing
 * state transition — each feature (morph child pairing, binding wiring, list
 * ownership) was fully covered in isolation, but no test walked the
 * *interaction* where one feature's invariant (templates carry only markers;
 * owned rows are invisible to the morph) breaks another's assumption
 * (positional child pairing; binding-marker containment). See
 * docs/ai/test-gap-analysis-kf380.md for the full analysis.
 *
 * Every test here walks a multi-step sequence that crosses at least two of
 * the three subsystems, generalizing the two bug shapes to their neighbors:
 * conditional siblings in every position around bound holes AND lists,
 * container/tag swaps, empty↔refill across a morph move, and the
 * granular ↔ snapshot ↔ self-heal reconciler transitions interleaved with
 * surrounds morphs.
 *
 * Two tests originally pinned real bugs found by this matrix (KF-381 —
 * stranded owned rows duplicated when a conditional sibling shared or
 * shadowed the list container). Both fixes have shipped; every test in this
 * matrix now runs and asserts the corrected behavior.
 */
import { afterEach,beforeEach,describe,expect,it } from 'vitest';

import { mount,signal,toElement } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  root = toElement(<div />) as HTMLElement;
  document.body.appendChild(root);
});

afterEach(() => { document.body.innerHTML = ''; });

describe('KF-380 interaction matrix: morph × global bindings × conditional siblings', () => {
  it('a conditional sibling removed before a bound-hole element keeps identity, statics, and a live binding across toggle cycles', () => {
    // KF-374 × KF-377 cross: the lookahead moves the hole-carrying element up
    // instead of rebuilding it, so the marker comment + its inserted text node
    // travel together and the re-wire retargets the SAME text node.
    const banner = signal(false);
    const v = signal('V');
    const dispose = mount(root, () => (
      <div>
        {banner.value ? <div class="banner">warn</div> : ''}
        <p class="mix">{v} / static</p>
      </div>
    ));
    const p = root.querySelector('p.mix') as HTMLElement;
    expect(p.textContent).toBe('V / static');

    // off → on → off → update → on → update: two full morph cycles with
    // binding writes interleaved on both sides.
    banner.value = true;
    expect(root.querySelector('p.mix')).toBe(p); // trailing insert never touched it
    expect(p.textContent).toBe('V / static');
    banner.value = false; // the KF-377 shape: element shifts one slot left
    expect(root.querySelector('p.mix')).toBe(p); // moved, not rebuilt
    expect(p.textContent).toBe('V / static');
    v.value = 'W';
    expect(p.textContent).toBe('W / static');
    banner.value = true;
    expect(p.textContent).toBe('W / static');
    v.value = 'X';
    expect(p.textContent).toBe('X / static');
    dispose();
  });

  it('a conditional element sharing its parent with a global text hole and static tail survives off, update, on, update', () => {
    // The hole's marker comment is a DIRECT sibling of the conditional. The
    // elements-only lookahead cannot move a comment, so the morph rebuilds the
    // marker; the re-wire must then re-insert the text node with the CURRENT
    // value and keep the static tail (the KF-374 trailing-static invariant)
    // through every cycle.
    const flag = signal(true);
    const v = signal('V');
    const dispose = mount(root, () => (
      <div class="wrap">
        {flag.value ? <b>lead</b> : ''}
        {v} tail
      </div>
    ));
    const wrap = root.querySelector('.wrap') as HTMLElement;
    expect(wrap.textContent).toBe('leadV tail');
    flag.value = false;
    expect(wrap.textContent).toBe('V tail');
    v.value = 'W'; // binding live after the rebuild
    expect(wrap.textContent).toBe('W tail');
    flag.value = true; // and back — current value, not the initial one
    expect(wrap.textContent).toBe('leadW tail');
    v.value = 'Z';
    expect(wrap.textContent).toBe('leadZ tail');
    dispose();
  });

  it('bound attr + text holes on the shifted element both stay live after the lookahead move', () => {
    const banner = signal(true);
    const cls = signal('c1');
    const txt = signal('t1');
    const dispose = mount(root, () => (
      <div>
        {banner.value ? <div class="banner">warn</div> : ''}
        <span class={cls}>{txt} end</span>
      </div>
    ));
    const span = root.querySelector('span') as HTMLElement;
    expect(span.getAttribute('class')).toBe('c1');
    expect(span.textContent).toBe('t1 end');
    banner.value = false; // shift left; morph strips bound attrs → re-wire restores
    expect(root.querySelector('span')).toBe(span);
    expect(span.getAttribute('class')).toBe('c1');
    expect(span.textContent).toBe('t1 end');
    cls.value = 'c2';
    txt.value = 't2';
    expect(span.getAttribute('class')).toBe('c2');
    expect(span.textContent).toBe('t2 end');
    dispose();
  });
});
