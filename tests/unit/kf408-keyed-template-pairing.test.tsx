/**
 * The morph's positional pairing must not repurpose a node that is something
 * else.
 *
 * Its fallback required only that the *live* node be unkeyed. So when a
 * conditional element reappeared, the template element could be paired with
 * whatever same-tag node happened to sit at that index — and then every rule
 * that protects a node's contents kept the *wrong* contents alive inside the
 * repurposed host:
 *
 *  - `data-morph-skip` — the skipped widget swallowed the reappearing element
 *    (its content never rendered) and was duplicated when the template's own
 *    skipped element was built fresh. For a library-owned subtree that means a
 *    second live widget instance on a node the library doesn't know about.
 *  - `data-morph-preserve` — the preserved child stayed under a foreign host,
 *    so it appeared twice.
 *  - a binding marker's inserted text node — stepped past by the mixed-content
 *    rule, so a bound hole's text leaked into the reappearing element and
 *    rendered twice.
 *
 * Each of those rules is right in isolation; the pairing they were applied to
 * was the bug. Three symmetries now gate it, in decreasing reliance on the
 * author:
 *
 *  1. **Key.** A template element carrying an `id`/`data-key` matches by key or
 *     not at all — step 1 already searched every live child for that key, so if
 *     it wasn't found the element genuinely isn't there.
 *  2. **`data-morph-skip`.** Both sides must agree. Needs nothing from the
 *     author, since the attribute is in the template already, and covers the
 *     case where neither side has a key.
 *  3. **Marker kind.** A comment that anchors kerf state (`kf-list:`, `kfb:`,
 *     `kfbr:`) only pairs with a comment of the same kind. Two different kinds
 *     of anchor are never each other's counterpart.
 *
 * All of it was found by the property-based harness in `reconciler-fuzz.test.ts`
 * once the dev invariant checks were soaked alongside it.
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

describe('KF-407/408/409: a keyed template element never matches positionally', () => {
  it('a data-morph-skip sibling no longer swallows a reappearing conditional element', () => {
    const cond = signal(true);
    const dispose = mount(root, () => (
      <div>
        {cond.value ? <ul data-key="head">head</ul> : ''}
        <ul data-morph-skip>widget</ul>
      </div>
    ));
    const widget = root.querySelector('[data-morph-skip]');
    cond.value = false;
    expect(root.querySelectorAll('[data-morph-skip]').length).toBe(1);
    cond.value = true;
    // The conditional element is back, the widget exists exactly once, and it
    // is the SAME node — a rebuilt widget is a second live library instance.
    expect(root.querySelector('[data-key="head"]')?.textContent).toBe('head');
    expect(root.querySelectorAll('[data-morph-skip]').length).toBe(1);
    expect(root.querySelector('[data-morph-skip]')).toBe(widget);
    dispose();
  });

  it('a data-morph-preserve child is not duplicated when a sibling reappears', () => {
    const cond = signal(true);
    const dispose = mount(root, () => (
      <div data-key="outer">
        {cond.value ? <span data-key="head">head</span> : ''}
        <span class="body"><ul data-key="kept" data-morph-preserve>kept</ul></span>
      </div>
    ));
    cond.value = false;
    cond.value = true;
    expect(root.querySelectorAll('[data-morph-preserve]').length).toBe(1);
    expect(root.querySelector('span.body > [data-morph-preserve]')).not.toBeNull();
    dispose();
  });

  it("a bound hole's text does not leak into a reappearing conditional element", () => {
    const cond = signal(true);
    const label = signal('v1');
    const rows = arraySignal<{ id: string }>([]);
    const dispose = mount(root, () => (
      <div>
        {cond.value
          ? <span data-key="box">{each(rows, (r) => <li data-key={r.id}>{r.id}</li>)}</span>
          : ''}
        <span data-hole="h">{label}</span>
      </div>
    ));
    cond.value = false;
    cond.value = true;
    expect(root.textContent).toBe('v1');
    expect(root.querySelector('[data-hole="h"]')?.textContent).toBe('v1');
    // …and the hole is still live after the churn.
    label.value = 'v2';
    expect(root.textContent).toBe('v2');
    dispose();
  });

  it('the list inside the reappearing element still reconciles against its own signal', () => {
    const cond = signal(true);
    const rows = arraySignal([{ id: 'a' }]);
    const dispose = mount(root, () => (
      <div>
        {cond.value
          ? <span data-key="box">{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'L' })}</span>
          : ''}
        <span class="other">other</span>
      </div>
    ));
    cond.value = false;
    cond.value = true;
    rows.push({ id: 'b' });
    expect(Array.from(root.querySelectorAll('li')).map((li) => li.textContent)).toEqual(['a', 'b']);
    dispose();
  });

  it('an UNKEYED template element still matches positionally (the lookahead is unaffected)', () => {
    // The fix must not disturb the conditional-sibling recovery, which exists
    // precisely so an unkeyed element shifted by a removed sibling is moved up
    // rather than rebuilt.
    const cond = signal(true);
    const dispose = mount(root, () => (
      <div>
        {cond.value ? <p>banner</p> : ''}
        <ul>list</ul>
      </div>
    ));
    const list = root.querySelector('ul');
    cond.value = false;
    expect(root.querySelector('ul')).toBe(list);
    cond.value = true;
    expect(root.querySelector('ul')).toBe(list);
    expect(root.querySelector('p')?.textContent).toBe('banner');
    dispose();
  });

  it('an UNKEYED element is not paired with a data-morph-skip sibling either', () => {
    // The key rule can't help when neither side has one, so the skip flag is
    // compared directly: a live library-owned subtree is never the counterpart
    // of a template element that makes no such claim.
    const cond = signal(true);
    const dispose = mount(root, () => (
      <div>
        {cond.value ? <ul>head</ul> : ''}
        <ul data-morph-skip>widget</ul>
      </div>
    ));
    const widget = root.querySelector('[data-morph-skip]');
    cond.value = false;
    cond.value = true;
    expect(root.querySelectorAll('[data-morph-skip]').length).toBe(1);
    expect(root.querySelector('[data-morph-skip]')).toBe(widget);
    expect(Array.from(root.querySelectorAll('ul')).map((u) => u.textContent))
      .toEqual(['head', 'widget']);
    dispose();
  });

  it('a list marker is never paired with a binding marker, so bound text cannot leak', () => {
    // Both spans unkeyed, so the pairing is allowed at the element level — but
    // their comment children are different kinds of kerf anchor, and pairing
    // those would carry the binding's inserted text node into the list.
    const cond = signal(true);
    const label = signal('v1');
    const rows = arraySignal<{ id: string }>([]);
    const dispose = mount(root, () => (
      <div>
        {cond.value ? <span>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>)}</span> : ''}
        <span data-hole="h">{label}</span>
      </div>
    ));
    cond.value = false;
    cond.value = true;
    expect(root.textContent).toBe('v1');
    label.value = 'v2';
    expect(root.textContent).toBe('v2');
    dispose();
  });

  it('the positional LOOKAHEAD also refuses to move up a skipped element', () => {
    // Same rule one step further along: when the immediate positional match
    // fails, the forward scan must not adopt a skipped element either — it
    // would move a library-owned subtree into a slot that isn't its own.
    const cond = signal(true);
    const dispose = mount(root, () => (
      <div>
        {cond.value ? <p>head</p> : ''}
        <span>mid</span>
        <p data-morph-skip>widget</p>
      </div>
    ));
    const kids = (): (string | null)[] =>
      Array.from((root.firstElementChild as Element).children).map((c) => c.textContent);
    const widget = root.querySelector('[data-morph-skip]');
    cond.value = false;
    expect(kids()).toEqual(['mid', 'widget']);
    expect(root.querySelector('[data-morph-skip]')).toBe(widget);
    cond.value = true;
    expect(kids()).toEqual(['head', 'mid', 'widget']);
    expect(root.querySelectorAll('[data-morph-skip]').length).toBe(1);
    expect(root.querySelector('[data-morph-skip]')).toBe(widget);
    dispose();
  });

  it('a keyed element still matches its key across a reorder', () => {
    const flip = signal(false);
    const dispose = mount(root, () => (
      <div>
        {flip.value
          ? [<span data-key="b">B</span>, <span data-key="a">A</span>]
          : [<span data-key="a">A</span>, <span data-key="b">B</span>]}
      </div>
    ));
    const a = root.querySelector('[data-key="a"]');
    const b = root.querySelector('[data-key="b"]');
    flip.value = true;
    expect(Array.from(root.querySelectorAll('span')).map((s) => s.getAttribute('data-key')))
      .toEqual(['b', 'a']);
    expect(root.querySelector('[data-key="a"]')).toBe(a);
    expect(root.querySelector('[data-key="b"]')).toBe(b);
    dispose();
  });
});
