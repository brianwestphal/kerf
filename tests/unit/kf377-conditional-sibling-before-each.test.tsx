/**
 * KF-377 regression tests — removing a conditionally-rendered sibling that
 * precedes a keyed `each()` list must not empty the list.
 *
 * The bug: with live children `[banner, ul]` and template children `[ul]`
 * (banner removed this render), the morph's positional match failed on
 * DIV-vs-UL, cloned a FRESH empty `<ul><!--kf-list:N--></ul>` from the
 * template, and the trailing-removal pass then removed the original `<ul>` —
 * taking every owned row with it (only the rows are owned, not their parent).
 * `bindListsFromMarkers` next found the cloned marker but skipped re-binding
 * because a binding for the id already existed — permanently pointed at the
 * detached subtree, so every later reconcile mutated a dead tree and the live
 * list rendered zero rows forever, with no errors.
 *
 * The fix is two-layered:
 *  - `morph.ts` step 2.5 positional lookahead: when the positional match
 *    fails, scan later live siblings for a same-tag unkeyed element and move
 *    it up (the same move the keyed branch performs), so the list container —
 *    and any stateful element — survives a preceding sibling's removal.
 *  - `mount.ts` `bindListsFromMarkers` self-heal: if a binding's marker is no
 *    longer inside the mount root (the container was genuinely rebuilt, e.g.
 *    an ancestor's tag changed so replaceChild swapped the subtree), drop the
 *    stale binding and re-bind against the live marker so the next reconcile
 *    repopulates instead of permanently rendering nothing.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { each, mount, signal, toElement } from '../../src/index.js';

interface Item { id: string; label: string }
const ROWS: Item[] = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
];

function host(): HTMLElement {
  const el = toElement(<div />) as HTMLElement;
  document.body.appendChild(el);
  return el;
}

function labels(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('li')).map((li) => li.textContent ?? '');
}

describe('KF-377: conditional sibling removed before a keyed each() list', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it("direct sibling with '' false-branch: rows survive ON → OFF → ON", () => {
    const banner = signal(false);
    const root = host();
    mount(root, () => (
      <div>
        {banner.value ? <div class="banner">warn</div> : ''}
        <ul>{each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
      </div>
    ));
    expect(labels(root)).toEqual(['A', 'B']);
    const liA = root.querySelector('li[data-key="a"]');

    banner.value = true;
    expect(root.querySelector('.banner')).not.toBeNull();
    expect(labels(root)).toEqual(['A', 'B']);

    banner.value = false;   // the buggy step: banner removed → list emptied
    expect(root.querySelector('.banner')).toBeNull();
    expect(labels(root)).toEqual(['A', 'B']);
    // The morph lookahead must have preserved the container in place, so the
    // row nodes keep their DOM identity (focus/listeners on them survive).
    expect(root.querySelector('li[data-key="a"]')).toBe(liA);

    banner.value = true;    // recovery direction of the original repro table
    expect(labels(root)).toEqual(['A', 'B']);
  });

  it('direct sibling with null false-branch reproduces identically', () => {
    const banner = signal<boolean>(false);
    const root = host();
    mount(root, () => (
      <div>
        {banner.value ? <div class="banner">warn</div> : null}
        <ul>{each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
      </div>
    ));
    banner.value = true;
    banner.value = false;
    expect(labels(root)).toEqual(['A', 'B']);
  });

  it('after a toggle, replacing the items with new identities re-renders rows', () => {
    const banner = signal(false);
    const rows = signal<Item[]>(ROWS);
    const root = host();
    mount(root, () => (
      <div>
        {banner.value ? <div class="banner">warn</div> : ''}
        <ul>{each(rows.value, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
      </div>
    ));
    banner.value = true;
    banner.value = false;
    rows.value = [{ id: 'c', label: 'C' }, { id: 'd', label: 'D' }];
    expect(labels(root)).toEqual(['C', 'D']);
  });

  it('nested shape: banner is a sibling of the section that contains the list', () => {
    const banner = signal(false);
    const root = host();
    mount(root, () => (
      <div>
        <header>Header</header>
        {banner.value ? <div class="banner">warn</div> : ''}
        <section class="two">
          <ul>{each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
        </section>
      </div>
    ));
    banner.value = true;
    expect(labels(root)).toEqual(['A', 'B']);
    banner.value = false;
    expect(root.querySelector('.banner')).toBeNull();
    expect(labels(root)).toEqual(['A', 'B']);
  });

  it('conditional AFTER the list: removal exercises the trailing pass without touching rows', () => {
    const footer = signal(true);
    const root = host();
    mount(root, () => (
      <div>
        <ul>{each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
        {footer.value ? <div class="footer">bye</div> : ''}
      </div>
    ));
    expect(labels(root)).toEqual(['A', 'B']);
    footer.value = false;
    expect(root.querySelector('.footer')).toBeNull();
    expect(labels(root)).toEqual(['A', 'B']);
    footer.value = true;
    expect(labels(root)).toEqual(['A', 'B']);
  });

  it('arraySignal-backed list: rows survive the toggle and granular patches still apply after it', () => {
    const banner = signal(false);
    const rows = arraySignal<Item>([...ROWS]);
    const root = host();
    mount(root, () => (
      <div>
        {banner.value ? <div class="banner">warn</div> : ''}
        <ul>{each(rows, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
      </div>
    ));
    banner.value = true;
    banner.value = false;
    expect(labels(root)).toEqual(['A', 'B']);
    // The binding survived in place, so the granular patch path still works.
    rows.push({ id: 'c', label: 'C' });
    expect(labels(root)).toEqual(['A', 'B', 'C']);
    rows.remove(0);
    expect(labels(root)).toEqual(['B', 'C']);
  });

  it('pin: conditionally swapping the each() container itself (<p> ↔ <ul>) keeps working', () => {
    // Verified OK on 2.0.0 (the list leaves the segment entirely on the <p>
    // side, so its binding is cleaned up as an orphan) — pinned here because
    // it is one replaceChild away from the KF-377 shape.
    const showList = signal(true);
    const root = host();
    mount(root, () => (
      <div>
        {showList.value
          ? <ul>{each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
          : <p>empty</p>}
      </div>
    ));
    expect(labels(root)).toEqual(['A', 'B']);
    showList.value = false;
    expect(labels(root)).toEqual([]);
    expect(root.querySelector('p')?.textContent).toBe('empty');
    showList.value = true;
    expect(labels(root)).toEqual(['A', 'B']);
  });

  it('self-heal: an ancestor tag swap that rebuilds the container re-renders the rows', () => {
    // The list stays in the segment on both sides, but its wrapper's tag
    // changes — morphElement's tag-mismatch path replaceChild's the whole
    // subtree, cloning a fresh marker. The stale-binding self-heal in
    // bindListsFromMarkers must drop the detached binding and re-bind, so the
    // rows repopulate (with fresh DOM nodes) instead of vanishing forever.
    const wide = signal(false);
    const root = host();
    mount(root, () => (
      <div>
        {wide.value
          ? <section class="w"><ul>{each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}</ul></section>
          : <article class="n"><ul>{each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}</ul></article>}
      </div>
    ));
    expect(labels(root)).toEqual(['A', 'B']);
    wide.value = true;
    expect(root.querySelector('section.w')).not.toBeNull();
    expect(labels(root)).toEqual(['A', 'B']);
    wide.value = false;
    expect(root.querySelector('article.n')).not.toBeNull();
    expect(labels(root)).toEqual(['A', 'B']);
  });
});
