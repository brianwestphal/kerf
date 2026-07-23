/**
 * KF-384 — `data-morph-preserve` nodes interleaved with `each()`-owned rows
 * during a positional shift. The last open item from the KF-380 gap analysis.
 *
 * Why this pairing is interesting: preserved nodes and owned rows are BOTH
 * protected from the morph's trailing-removal pass, but by different
 * mechanisms and on behalf of different owners (the consumer vs. the list
 * reconciler). They now meet three separate node-moving recovery paths:
 * the element lookahead (`morph.ts` 2.5), the marker + owned-row unit move
 * (2.6), and `mount()`'s stale-binding self-heal, which removes still-live
 * rows. Nothing previously tested them together.
 *
 * The sweep found two real defects, filed rather than fixed (this is a
 * test-and-analysis ticket; runtime is frozen):
 *
 *   - **KF-385** — a non-owned node between the marker and its rows truncates
 *     the 2.6 run collector, so the marker moves alone and a trailing template
 *     sibling wedges in ahead of the rows. This is precisely the failure the
 *     unit-move exists to prevent.
 *   - **KF-386** — a preserved node inside a container that gets rebuilt is
 *     destroyed with the container. It is consumer-owned, so nothing
 *     re-creates it: silent, permanent loss.
 *
 * Both are pinned below asserting CURRENT behavior with `KNOWN BUG` comments.
 * When either is fixed, its assertion flips and the test must be updated —
 * that is the intent.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { each, mount, signal } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => { document.body.innerHTML = ''; });

const ROWS = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];

/** The `each()` begin-anchor comment inside `parent`, if any. */
function markerIn(parent: Element): Comment {
  for (let c: Node | null = parent.firstChild; c !== null; c = c.nextSibling) {
    if (c.nodeType === Node.COMMENT_NODE
      && (c as Comment).data.startsWith('kf-list:')) return c as Comment;
  }
  throw new Error('no kf-list marker found');
}

/**
 * A compact one-line shape of a parent's child nodes, so the assertions read
 * as the DOM order they are actually pinning. `[P]` marks a preserved node.
 */
function shape(parent: Element): string {
  return Array.from(parent.childNodes).map((n) => {
    if (n.nodeType === Node.COMMENT_NODE) return 'marker';
    if (n.nodeType === Node.TEXT_NODE) return `"${n.nodeValue ?? ''}"`;
    const el = n as Element;
    const cls = el.className ? `.${el.className}` : '';
    const pres = el.hasAttribute('data-morph-preserve') ? '[P]' : '';
    return `${el.tagName.toLowerCase()}${cls}${pres}`;
  }).join(' ');
}

/** Imperatively inject a consumer-owned preserved node before `ref`. */
function injectPreserved(parent: Element, ref: Node | null): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-morph-preserve', '');
  el.className = 'pres';
  parent.insertBefore(el, ref);
  return el;
}

describe('KF-384: data-morph-preserve nodes interleaved with owned each() rows', () => {
  it('a preserved node BETWEEN the marker and its rows survives a marker shift, rows keep identity', () => {
    const hd = signal(true);
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}
      </ul>
    ));
    const ul = root.querySelector('ul') as HTMLElement;
    const preserved = injectPreserved(ul, markerIn(ul).nextSibling);
    const rowA = ul.querySelector('li[data-key="a"]');
    expect(shape(ul)).toBe('li.hd marker div.pres[P] li li');

    hd.value = false;

    // The marker moved up past the removed header; the preserved node and the
    // rows stayed in their relative order behind it.
    expect(shape(ul)).toBe('marker div.pres[P] li li');
    expect(ul.contains(preserved)).toBe(true);
    expect(ul.querySelector('li[data-key="a"]')).toBe(rowA);
    dispose();
  });

  it('a preserved node BEFORE the marker survives, but the unit-move relocates it after the rows', () => {
    const hd = signal(true);
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}
      </ul>
    ));
    const ul = root.querySelector('ul') as HTMLElement;
    const preserved = injectPreserved(ul, markerIn(ul));
    const rowA = ul.querySelector('li[data-key="a"]');
    expect(shape(ul)).toBe('li.hd div.pres[P] marker li li');

    hd.value = false;

    // Survival is the contract and it holds. Position is NOT part of the
    // contract: the marker + rows jump to the cursor, so anything they leap
    // over ends up behind them. Flagged as a lower-severity observation on
    // KF-385 — a consumer who injected a banner ABOVE the list now finds it
    // below. Pinned so a deliberate change to relative-order handling shows up.
    expect(ul.contains(preserved)).toBe(true);
    expect(shape(ul)).toBe('marker li li div.pres[P]');
    expect(ul.querySelector('li[data-key="a"]')).toBe(rowA);
    dispose();
  });

  it('KNOWN BUG KF-386: a preserved node is destroyed when its container is rebuilt', () => {
    // The KF-383 shape-2 hijack: a same-tag conditional sibling takes the list
    // container's place, so the real container is removed wholesale and a
    // fresh one cloned. Rows come back (mount re-renders them); the
    // consumer-owned preserved node does not — it is silently, permanently
    // gone. Fix or documented-boundary decision tracked in KF-386.
    const banner = signal(true);
    const dispose = mount(root, () => (
      <div>
        {banner.value ? <ul class="banner"><li class="hd">warn</li></ul> : ''}
        <ul class="list">{each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
      </div>
    ));
    const list = root.querySelector('ul.list') as HTMLElement;
    const preserved = injectPreserved(list, null);
    expect(root.contains(preserved)).toBe(true);

    banner.value = false;

    // Rows recover…
    expect(Array.from(root.querySelectorAll('li[data-key]')).map((l) => l.textContent))
      .toEqual(['A', 'B']);
    // …the preserved node does not. KNOWN BUG (KF-386) — flip when fixed.
    expect(root.contains(preserved)).toBe(false);
    expect(root.querySelectorAll('.pres').length).toBe(0);
    dispose();
  });

  it('KNOWN BUG KF-385: a node between marker and rows truncates the run, letting a trailing sibling wedge in', () => {
    // With an uninterrupted run this is the shape KF-382 fixed:
    // `tests/unit/kf380-interaction-matrix.test.tsx` › "KF-382: a trailing
    // template sibling cannot wedge between the marker and its rows".
    // Interposing ANY non-owned node truncates the 2.6 run collector to just
    // the marker, so the marker moves alone and the element lookahead then
    // lands <button> at the cursor — ahead of the rows, against JSX order.
    const hd = signal(true);
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}
        <button class="more">more</button>
      </ul>
    ));
    const ul = root.querySelector('ul') as HTMLElement;
    injectPreserved(ul, markerIn(ul).nextSibling);
    expect(shape(ul)).toBe('li.hd marker div.pres[P] li li button.more');

    hd.value = false;

    // KNOWN BUG (KF-385): the correct order is `marker div.pres[P] li li
    // button.more` — the button must stay last. Flip this when KF-385 lands.
    expect(shape(ul)).toBe('marker button.more div.pres[P] li li');
    dispose();
  });

  it('the KF-383 container key also protects a preserved node from the rebuild (KF-386 workaround)', () => {
    // Keying the list's own container prevents the hijack, so the container is
    // never rebuilt and the preserved node is never collateral. Guards the
    // cross-reference KF-386 proposes as a low-cost resolution.
    const banner = signal(true);
    const dispose = mount(root, () => (
      <div>
        {banner.value ? <ul class="banner"><li class="hd">warn</li></ul> : ''}
        <ul class="list" data-key="the-list">
          {each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}
        </ul>
      </div>
    ));
    const list = root.querySelector('ul.list') as HTMLElement;
    const preserved = injectPreserved(list, null);

    banner.value = false;
    expect(root.contains(preserved)).toBe(true);
    banner.value = true;
    expect(root.contains(preserved)).toBe(true);
    expect(root.querySelectorAll('.pres').length).toBe(1);
    dispose();
  });
});
