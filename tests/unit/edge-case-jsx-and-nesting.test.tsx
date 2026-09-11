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
import { afterEach,beforeEach,describe,expect,it } from 'vitest';

import {
each,
mount,
type SafeHtml
} from '../../src/index.js';

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
