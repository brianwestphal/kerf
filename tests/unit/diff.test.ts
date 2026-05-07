/**
 * Unit tests for `diff()` — kerf's native general-purpose DOM reconciliation,
 * the morphdom replacement. Focus is on the algorithm itself in isolation;
 * its integration with `mount()` is covered by the existing mount tests.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { diff } from '../../src/diff.js';

let live: HTMLElement;

beforeEach(() => {
  live = document.createElement('div');
  document.body.appendChild(live);
});

afterEach(() => {
  document.body.innerHTML = '';
});

function renderTemplate(html: string): HTMLElement {
  const tpl = document.createElement('div');
  tpl.innerHTML = html;
  return tpl;
}

describe('diff()', () => {
  it('inserts new nodes when live is empty', () => {
    const tpl = renderTemplate('<p>hi</p>');
    diff(live, tpl, new Set());
    expect(live.innerHTML).toBe('<p>hi</p>');
  });

  it('removes nodes that disappear from the template', () => {
    live.innerHTML = '<p>a</p><p>b</p>';
    const tpl = renderTemplate('<p>a</p>');
    diff(live, tpl, new Set());
    expect(live.innerHTML).toBe('<p>a</p>');
  });

  it('updates text content via positional match', () => {
    live.innerHTML = '<p>old</p>';
    const tpl = renderTemplate('<p>new</p>');
    diff(live, tpl, new Set());
    expect(live.innerHTML).toBe('<p>new</p>');
  });

  it('reorders children matched by id', () => {
    live.innerHTML = '<p id="a">A</p><p id="b">B</p><p id="c">C</p>';
    const before = Array.from(live.children) as HTMLElement[];
    const tpl = renderTemplate('<p id="c">C</p><p id="a">A</p><p id="b">B</p>');
    diff(live, tpl, new Set());
    const after = Array.from(live.children) as HTMLElement[];
    expect(after.map((el) => el.id)).toEqual(['c', 'a', 'b']);
    // Reorders use the SAME nodes (move, not replace).
    expect(after[0]).toBe(before[2]);
    expect(after[1]).toBe(before[0]);
    expect(after[2]).toBe(before[1]);
  });

  it('matches by data-key when ids are absent', () => {
    live.innerHTML = '<li data-key="1">1</li><li data-key="2">2</li>';
    const before = Array.from(live.children);
    const tpl = renderTemplate('<li data-key="2">2</li><li data-key="1">1</li>');
    diff(live, tpl, new Set());
    expect(live.children[0]).toBe(before[1]);
    expect(live.children[1]).toBe(before[0]);
  });

  it('removes a keyed live node that is missing from the template (orphan path)', () => {
    live.innerHTML = '<p id="a">A</p><p id="b">B</p><p id="c">C</p>';
    // Template skips "b" but keeps "a" and "c".
    const tpl = renderTemplate('<p id="a">A</p><p id="c">C</p>');
    diff(live, tpl, new Set());
    expect(live.children.length).toBe(2);
    expect((live.children[0] as HTMLElement).id).toBe('a');
    expect((live.children[1] as HTMLElement).id).toBe('c');
  });

  it('adds attributes that are new on the template', () => {
    live.innerHTML = '<p>x</p>';
    const tpl = renderTemplate('<p class="hot">x</p>');
    diff(live, tpl, new Set());
    expect(live.querySelector('p')!.getAttribute('class')).toBe('hot');
  });

  it('removes attributes that disappear from the template', () => {
    live.innerHTML = '<p class="hot" data-x="1">x</p>';
    const tpl = renderTemplate('<p>x</p>');
    diff(live, tpl, new Set());
    const p = live.querySelector('p')!;
    expect(p.hasAttribute('class')).toBe(false);
    expect(p.hasAttribute('data-x')).toBe(false);
  });

  it('updates attribute values when they change', () => {
    live.innerHTML = '<p class="cold">x</p>';
    const tpl = renderTemplate('<p class="hot">x</p>');
    diff(live, tpl, new Set());
    expect(live.querySelector('p')!.getAttribute('class')).toBe('hot');
  });

  it('replaces the element when a keyed match has a different tag', () => {
    // Same id (key match) but the tag changed — morphElement falls through
    // to a clone-and-replace path because morphing across tags isn't safe.
    live.innerHTML = '<span id="thing">x</span>';
    const tpl = renderTemplate('<p id="thing">x</p>');
    diff(live, tpl, new Set());
    expect(live.firstElementChild!.tagName).toBe('P');
    expect(live.firstElementChild!.id).toBe('thing');
  });

  it('positional match without a key requires matching tag (else clones a fresh node)', () => {
    live.innerHTML = '<span>x</span>';
    const tpl = renderTemplate('<p>x</p>');
    diff(live, tpl, new Set());
    expect(live.firstElementChild!.tagName).toBe('P');
  });

  it('updates a text node in place', () => {
    live.appendChild(document.createTextNode('old'));
    const tpl = document.createElement('div');
    tpl.appendChild(document.createTextNode('new'));
    diff(live, tpl, new Set());
    expect(live.firstChild!.nodeType).toBe(3);
    expect(live.textContent).toBe('new');
  });

  it('updates a comment node in place', () => {
    live.appendChild(document.createComment('old'));
    const tpl = document.createElement('div');
    tpl.appendChild(document.createComment('new'));
    diff(live, tpl, new Set());
    const c = live.firstChild as Comment;
    expect(c.nodeType).toBe(8);
    expect(c.data).toBe('new');
  });

  it('does not touch a subtree marked data-morph-skip', () => {
    live.innerHTML = '<div data-morph-skip><span>library-owned</span></div>';
    const inner = live.querySelector('span');
    const tpl = renderTemplate('<div data-morph-skip><b>different</b></div>');
    diff(live, tpl, new Set());
    expect(live.querySelector('span')).toBe(inner);
    expect(live.querySelector('b')).toBe(null);
  });

  it('skips children of an element listed in listParents (kerf list reconciler owns them)', () => {
    live.innerHTML = '<ul><li>row 1</li><li>row 2</li></ul>';
    const ul = live.querySelector('ul')!;
    const tpl = renderTemplate('<ul><!--marker--></ul>');
    diff(live, tpl, new Set([ul]));
    // Children unchanged.
    expect(ul.children.length).toBe(2);
    expect(ul.querySelectorAll('li').length).toBe(2);
  });

  it('still updates list-parent attributes even when children are skipped', () => {
    live.innerHTML = '<ul class="old"><li>a</li><li>b</li></ul>';
    const ul = live.querySelector('ul')!;
    const tpl = renderTemplate('<ul class="new"><!--marker--></ul>');
    diff(live, tpl, new Set([ul]));
    expect(ul.getAttribute('class')).toBe('new');
    expect(ul.children.length).toBe(2);
  });

  it('short-circuits on isEqualNode-equal subtrees', () => {
    live.innerHTML = '<p><span>a</span><span>b</span></p>';
    const innerSpan = live.querySelector('span');
    const tpl = renderTemplate('<p><span>a</span><span>b</span></p>');
    diff(live, tpl, new Set());
    // Same nodes, no replacement happened.
    expect(live.querySelector('span')).toBe(innerSpan);
  });

  it('preserves a focused input value + selection across a re-render', () => {
    live.innerHTML = '<input type="text" />';
    const input = live.querySelector('input') as HTMLInputElement;
    input.focus();
    input.value = 'typing';
    input.setSelectionRange(2, 5);
    const tpl = renderTemplate('<input type="text" data-x="now" />');
    diff(live, tpl, new Set());
    const after = live.querySelector('input') as HTMLInputElement;
    expect(after).toBe(input);
    expect(after.value).toBe('typing');
    expect(after.selectionStart).toBe(2);
    expect(after.selectionEnd).toBe(5);
  });

  it('skips a focused contenteditable subtree entirely (KF-19 behaviour)', () => {
    live.innerHTML = '<div contenteditable="true">user typed</div>';
    const editable = live.querySelector('div')!;
    editable.focus();
    const tpl = renderTemplate('<div contenteditable="true">replacement</div>');
    diff(live, tpl, new Set());
    // Subtree preserved verbatim while focused.
    expect(editable.textContent).toBe('user typed');
  });

  it('namespaced attributes are added, updated, and removed (SVG xlink:href)', () => {
    const NS = 'http://www.w3.org/1999/xlink';
    const liveSvg = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    liveSvg.setAttributeNS(NS, 'xlink:href', '#old');
    live.appendChild(liveSvg);

    const tplWrap = document.createElement('div');
    const tplUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    tplUse.setAttributeNS(NS, 'xlink:href', '#new');
    tplWrap.appendChild(tplUse);
    diff(live, tplWrap, new Set());
    expect((live.firstElementChild as Element).getAttributeNS(NS, 'href')).toBe('#new');

    // And removal.
    const tplWrap2 = document.createElement('div');
    const tplUse2 = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    tplWrap2.appendChild(tplUse2);
    diff(live, tplWrap2, new Set());
    expect((live.firstElementChild as Element).hasAttributeNS(NS, 'href')).toBe(false);
  });
});
