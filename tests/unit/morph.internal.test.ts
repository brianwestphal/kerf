/**
 * Unit tests for `morph()` — kerf's native general-purpose DOM reconciliation,
 * the morphdom replacement. Focus is on the algorithm itself in isolation;
 * its integration with `mount()` is covered by the existing mount tests.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { raw } from '../../src/jsx-runtime.js';
import { morph } from '../../src/morph.js';

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

describe('morph()', () => {
  it('inserts new nodes when live is empty', () => {
    const tpl = renderTemplate('<p>hi</p>');
    morph(live, tpl, new Set());
    expect(live.innerHTML).toBe('<p>hi</p>');
  });

  it('removes nodes that disappear from the template', () => {
    live.innerHTML = '<p>a</p><p>b</p>';
    const tpl = renderTemplate('<p>a</p>');
    morph(live, tpl, new Set());
    expect(live.innerHTML).toBe('<p>a</p>');
  });

  it('updates text content via positional match', () => {
    live.innerHTML = '<p>old</p>';
    const tpl = renderTemplate('<p>new</p>');
    morph(live, tpl, new Set());
    expect(live.innerHTML).toBe('<p>new</p>');
  });

  it('reorders children matched by id', () => {
    live.innerHTML = '<p id="a">A</p><p id="b">B</p><p id="c">C</p>';
    const before = Array.from(live.children) as HTMLElement[];
    const tpl = renderTemplate('<p id="c">C</p><p id="a">A</p><p id="b">B</p>');
    morph(live, tpl, new Set());
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
    morph(live, tpl, new Set());
    expect(live.children[0]).toBe(before[1]);
    expect(live.children[1]).toBe(before[0]);
  });

  it('removes a keyed live node that is missing from the template (orphan path)', () => {
    live.innerHTML = '<p id="a">A</p><p id="b">B</p><p id="c">C</p>';
    // Template skips "b" but keeps "a" and "c".
    const tpl = renderTemplate('<p id="a">A</p><p id="c">C</p>');
    morph(live, tpl, new Set());
    expect(live.children.length).toBe(2);
    expect((live.children[0] as HTMLElement).id).toBe('a');
    expect((live.children[1] as HTMLElement).id).toBe('c');
  });

  it('adds attributes that are new on the template', () => {
    live.innerHTML = '<p>x</p>';
    const tpl = renderTemplate('<p class="hot">x</p>');
    morph(live, tpl, new Set());
    expect(live.querySelector('p')!.getAttribute('class')).toBe('hot');
  });

  it('removes attributes that disappear from the template', () => {
    live.innerHTML = '<p class="hot" data-x="1">x</p>';
    const tpl = renderTemplate('<p>x</p>');
    morph(live, tpl, new Set());
    const p = live.querySelector('p')!;
    expect(p.hasAttribute('class')).toBe(false);
    expect(p.hasAttribute('data-x')).toBe(false);
  });

  it('updates attribute values when they change', () => {
    live.innerHTML = '<p class="cold">x</p>';
    const tpl = renderTemplate('<p class="hot">x</p>');
    morph(live, tpl, new Set());
    expect(live.querySelector('p')!.getAttribute('class')).toBe('hot');
  });

  it('replaces the element when a keyed match has a different tag', () => {
    // Same id (key match) but the tag changed — morphElement falls through
    // to a clone-and-replace path because morphing across tags isn't safe.
    live.innerHTML = '<span id="thing">x</span>';
    const tpl = renderTemplate('<p id="thing">x</p>');
    morph(live, tpl, new Set());
    expect(live.firstElementChild!.tagName).toBe('P');
    expect(live.firstElementChild!.id).toBe('thing');
  });

  it('positional match without a key requires matching tag (else clones a fresh node)', () => {
    live.innerHTML = '<span>x</span>';
    const tpl = renderTemplate('<p>x</p>');
    morph(live, tpl, new Set());
    expect(live.firstElementChild!.tagName).toBe('P');
  });

  it('updates a text node in place', () => {
    live.appendChild(document.createTextNode('old'));
    const tpl = document.createElement('div');
    tpl.appendChild(document.createTextNode('new'));
    morph(live, tpl, new Set());
    expect(live.firstChild!.nodeType).toBe(3);
    expect(live.textContent).toBe('new');
  });

  it('updates a comment node in place', () => {
    live.appendChild(document.createComment('old'));
    const tpl = document.createElement('div');
    tpl.appendChild(document.createComment('new'));
    morph(live, tpl, new Set());
    const c = live.firstChild as Comment;
    expect(c.nodeType).toBe(8);
    expect(c.data).toBe('new');
  });

  it('does not touch a subtree marked data-morph-skip', () => {
    live.innerHTML = '<div data-morph-skip><span>library-owned</span></div>';
    const inner = live.querySelector('span');
    const tpl = renderTemplate('<div data-morph-skip><b>different</b></div>');
    morph(live, tpl, new Set());
    expect(live.querySelector('span')).toBe(inner);
    expect(live.querySelector('b')).toBe(null);
  });

  it('KF-152: data-morph-skip-children morphs attrs but leaves children intact', () => {
    // The slot's classes flip from "is-loading" to "is-ready" across renders
    // (server-driven state) but the children were imperatively painted by the
    // client and must survive the morph.
    live.innerHTML = '<div data-morph-skip-children class="slot is-loading"><span>client-painted</span></div>';
    const inner = live.querySelector('span');
    const tpl = renderTemplate('<div data-morph-skip-children class="slot is-ready"><b>different</b></div>');
    morph(live, tpl, new Set());
    // Attribute morph still happened on the slot itself…
    expect(live.querySelector('div')?.getAttribute('class')).toBe('slot is-ready');
    // …but the children are untouched.
    expect(live.querySelector('span')).toBe(inner);
    expect(live.querySelector('b')).toBe(null);
  });

  it('KF-151: data-morph-preserve survives the trailing-removal pass', () => {
    // Simulates an imperatively-injected node: the template renders just <a>,
    // but the live tree has an extra <video data-morph-preserve> that some
    // client-side module appended after first render. The morph must keep it.
    live.innerHTML = '<div><a>kept</a><video data-morph-preserve></video><b>unmarked</b></div>';
    const host = live.querySelector('div')!;
    const preserved = host.querySelector('video');
    const tpl = renderTemplate('<div><a>kept</a></div>');
    morph(live, tpl, new Set());
    // The preserved node survives despite not being in the new template…
    expect(host.querySelector('video')).toBe(preserved);
    // …while the unmarked unmatched sibling is removed as usual.
    expect(host.querySelector('b')).toBe(null);
  });

  it('skips elements listed in ownedItems (kerf list reconciler owns them)', () => {
    live.innerHTML = '<ul><!--marker--><li>row 1</li><li>row 2</li></ul>';
    const ul = live.querySelector('ul')!;
    const items = Array.from(ul.querySelectorAll('li'));
    const tpl = renderTemplate('<ul><!--marker--></ul>');
    morph(live, tpl, new Set(items));
    // Owned items survive the diff even though the template doesn't mention them.
    expect(ul.children.length).toBe(2);
    expect(ul.querySelectorAll('li').length).toBe(2);
  });

  it('still updates list-parent attributes even when children are owned', () => {
    live.innerHTML = '<ul class="old"><!--marker--><li>a</li><li>b</li></ul>';
    const ul = live.querySelector('ul')!;
    const items = Array.from(ul.querySelectorAll('li'));
    const tpl = renderTemplate('<ul class="new"><!--marker--></ul>');
    morph(live, tpl, new Set(items));
    expect(ul.getAttribute('class')).toBe('new');
    expect(ul.children.length).toBe(2);
  });

  it('reconciles non-list siblings of an owned-item region (KF-102 round 2)', () => {
    // The list parent contains: [marker, ownedItem1, ownedItem2, sibling]
    // The diff should walk children, skip owned items, and update sibling.
    live.innerHTML = '<div><!--marker--><li data-key="a">A</li><li data-key="b">B</li><button class="old">x</button></div>';
    const wrap = live.querySelector('div')!;
    const items = Array.from(wrap.querySelectorAll('li'));
    const tpl = renderTemplate('<div><!--marker--><button class="new">x</button></div>');
    morph(live, tpl, new Set(items));
    // Owned items survive; sibling's class updates.
    expect(wrap.querySelectorAll('li').length).toBe(2);
    expect(wrap.querySelector('button')!.getAttribute('class')).toBe('new');
    // Marker also still present.
    expect(wrap.firstChild!.nodeType).toBe(Node.COMMENT_NODE);
  });

  it('short-circuits on isEqualNode-equal subtrees', () => {
    live.innerHTML = '<p><span>a</span><span>b</span></p>';
    const innerSpan = live.querySelector('span');
    const tpl = renderTemplate('<p><span>a</span><span>b</span></p>');
    morph(live, tpl, new Set());
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
    morph(live, tpl, new Set());
    const after = live.querySelector('input') as HTMLInputElement;
    expect(after).toBe(input);
    expect(after.value).toBe('typing');
    expect(after.selectionStart).toBe(2);
    expect(after.selectionEnd).toBe(5);
  });

  it('skips a focused contenteditable subtree entirely (KF-19 behavior)', () => {
    live.innerHTML = '<div contenteditable="true">user typed</div>';
    const editable = live.querySelector('div')!;
    editable.focus();
    const tpl = renderTemplate('<div contenteditable="true">replacement</div>');
    morph(live, tpl, new Set());
    // Subtree preserved verbatim while focused.
    expect(editable.textContent).toBe('user typed');
  });

  describe('KF-150 public surface', () => {
    it('accepts a raw HTML string as the template', () => {
      live.innerHTML = '<p>old</p>';
      morph(live, '<p>new</p>');
      expect(live.innerHTML).toBe('<p>new</p>');
    });

    it('accepts a SafeHtml as the template', () => {
      live.innerHTML = '<p>old</p>';
      morph(live, raw('<p>safe-new</p>'));
      expect(live.innerHTML).toBe('<p>safe-new</p>');
    });

    it('an empty string template removes all live children', () => {
      live.innerHTML = '<a>x</a><b>y</b>';
      morph(live, '');
      expect(live.innerHTML).toBe('');
    });

    it('omits ownedItems entirely — non-list trees reconcile normally', () => {
      live.innerHTML = '<ul><li data-key="a">a</li><li data-key="b">b</li></ul>';
      morph(live, '<ul><li data-key="b">b</li><li data-key="a">a</li></ul>');
      const items = Array.from(live.querySelectorAll('li'));
      expect(items.map((li) => li.dataset.key)).toEqual(['b', 'a']);
    });

    it('preserves a focused text input across a string-template morph', () => {
      live.innerHTML = '<input type="text" value="" />';
      const input = live.querySelector('input')!;
      input.focus();
      input.value = 'user typed';
      input.setSelectionRange(4, 4);
      morph(live, '<input type="text" placeholder="hi" value="" />');
      // The user's typed value survives even though the template's value="" would clobber it
      // through a naive replace. Selection range is preserved too.
      expect(input.value).toBe('user typed');
      expect(input.selectionStart).toBe(4);
      expect(input.getAttribute('placeholder')).toBe('hi');
    });
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
    morph(live, tplWrap, new Set());
    expect((live.firstElementChild as Element).getAttributeNS(NS, 'href')).toBe('#new');

    // And removal.
    const tplWrap2 = document.createElement('div');
    const tplUse2 = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    tplWrap2.appendChild(tplUse2);
    morph(live, tplWrap2, new Set());
    expect((live.firstElementChild as Element).hasAttributeNS(NS, 'href')).toBe(false);
  });
});
