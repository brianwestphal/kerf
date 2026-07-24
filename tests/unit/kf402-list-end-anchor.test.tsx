/**
 * The list's end anchor is the node right after its last row — of ANY node
 * type.
 *
 * `endAnchor()` used `nextElementSibling`, which walks past every non-element
 * node on the way to the next element. Two things live exactly there, and both
 * produced silently wrong renders:
 *
 *  - **Static content after the list** (a footer row, a totals line, an "add"
 *    control). Skipping it made the anchor `null`, so an inserted row was
 *    appended at the parent's tail — *after* the static sibling. Correct on
 *    first paint, wrong from the second row on.
 *  - **The next sibling list's `<!--kf-list:…-->` marker.** With two lists in
 *    one parent, the earlier list's rows were inserted past the later list's
 *    marker. When both start empty this reverses them outright: the first list
 *    to fill has no element to anchor against and appends, so the second list's
 *    rows end up *first*.
 *
 * These reproduce with keyed lists, so none of it is list-identity shift. Both
 * were found by the property-based harness in `reconciler-fuzz.test.ts` — the
 * differential invariant (incremental must equal a from-scratch render) caught
 * the marker case before any hand-written test would have thought to look.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { each, mount, signal } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

const texts = (sel = 'li'): (string | null)[] =>
  Array.from(root.querySelectorAll(sel)).map((el) => el.textContent);

describe('KF-402/KF-404: a list ends at its last row, whatever node comes next', () => {
  it('two sibling lists that both start EMPTY fill in source order', () => {
    const s = signal<{ id: string }[]>([]);
    const dispose = mount(root, () => (
      <div>
        {each(s.value, (r) => <li data-key={`A_${r.id}`}>A{r.id}</li>, { key: 'LA' })}
        {each(s.value, (r) => <li data-key={`B_${r.id}`}>B{r.id}</li>, { key: 'LB' })}
      </div>
    ));
    s.value = [{ id: '1' }, { id: '2' }];
    expect(texts()).toEqual(['A1', 'A2', 'B1', 'B2']);
    dispose();
  });

  it('filling only the SECOND of two empty sibling lists still places its rows after the first marker', () => {
    const a = signal<{ id: string }[]>([]);
    const b = signal<{ id: string }[]>([]);
    const dispose = mount(root, () => (
      <div>
        {each(a.value, (r) => <li data-key={`A_${r.id}`}>A{r.id}</li>, { key: 'LA' })}
        {each(b.value, (r) => <li data-key={`B_${r.id}`}>B{r.id}</li>, { key: 'LB' })}
      </div>
    ));
    b.value = [{ id: '1' }];
    expect(texts()).toEqual(['B1']);
    // Now fill the first list — its rows must land ahead of the second's.
    a.value = [{ id: '1' }];
    expect(texts()).toEqual(['A1', 'B1']);
    dispose();
  });

  it('each marker stays immediately before its own rows across a re-render', () => {
    const s = signal([{ id: 'a' }]);
    const dispose = mount(root, () => (
      <ul data-key="c">
        {each(s.value, (r) => <li data-key={`L0_${r.id}`}>{r.id}</li>, { key: 'L0' })}
        {each(s.value, (r) => <li data-key={`L1_${r.id}`}>{r.id}</li>, { key: 'L1' })}
      </ul>
    ));
    s.value = [{ id: 'a2' }];
    // A row that jumped its own list's region would show up as two adjacent
    // markers here — the shape that made `afterListRegion` believe the first
    // list owned nothing.
    expect(root.querySelector('ul')?.innerHTML).toBe(
      '<!--kf-list:k:L0--><li data-key="L0_a2">a2</li>'
      + '<!--kf-list:k:L1--><li data-key="L1_a2">a2</li>',
    );
    dispose();
  });

  it('a row inserted into an arraySignal list lands before a trailing static text sibling', () => {
    const s = arraySignal([{ id: 'a' }]);
    const dispose = mount(root, () => (
      <ul>
        {each(s, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'L' })}
        footer
      </ul>
    ));
    s.push({ id: 'b' });
    expect(root.querySelector('ul')?.textContent).toBe('abfooter');
    // …and after a remove + insert, which is how the fuzz case found it.
    s.remove(0);
    s.insert(1, { id: 'c' });
    expect(root.querySelector('ul')?.textContent).toBe('bcfooter');
    dispose();
  });

  it('the same holds for a plain-array list (snapshot path) and an element sibling', () => {
    const s = signal([{ id: 'a' }]);
    const dispose = mount(root, () => (
      <ul>
        {each(s.value, (r) => <li data-key={r.id} class="row">{r.id}</li>, { key: 'L' })}
        <li data-key="footer" class="foot">footer</li>
      </ul>
    ));
    s.value = [{ id: 'a' }, { id: 'b' }];
    expect(texts()).toEqual(['a', 'b', 'footer']);
    dispose();
  });

  it('a static sibling BEFORE the list keeps its place too', () => {
    const s = arraySignal<{ id: string }>([]);
    const dispose = mount(root, () => (
      <ul>
        <li data-key="head" class="head">head</li>
        {each(s, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'L' })}
        footer
      </ul>
    ));
    s.push({ id: 'a' });
    s.push({ id: 'b' });
    expect(root.querySelector('ul')?.textContent).toBe('headabfooter');
    dispose();
  });

  it('three sibling lists in one parent stay in order through interleaved growth', () => {
    const a = arraySignal<{ id: string }>([]);
    const b = arraySignal<{ id: string }>([]);
    const c = arraySignal<{ id: string }>([]);
    const dispose = mount(root, () => (
      <div>
        {each(a, (r) => <li data-key={`a${r.id}`}>a{r.id}</li>, { key: 'A' })}
        {each(b, (r) => <li data-key={`b${r.id}`}>b{r.id}</li>, { key: 'B' })}
        {each(c, (r) => <li data-key={`c${r.id}`}>c{r.id}</li>, { key: 'C' })}
      </div>
    ));
    c.push({ id: '1' });
    a.push({ id: '1' });
    b.push({ id: '1' });
    a.push({ id: '2' });
    c.push({ id: '2' });
    expect(texts()).toEqual(['a1', 'a2', 'b1', 'c1', 'c2']);
    dispose();
  });
});
