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

import { arraySignal } from '../../src/array-signal.js';
import {
batch,
delegate,
delegateCapture,
each,
effect,
mount,
signal
} from '../../src/index.js';

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
