/**
 * Direct-function bail-branch coverage for `list-reconcile-fast-paths.ts`.
 *
 * Exercises the bail branches that don't naturally surface through the
 * arraySignal-driven public-API tests in
 * `list-reconcile-fast-paths.test.ts`. We call the internal helpers with
 * crafted HTML strings and a stand-in live element built to match.
 *
 * Suffix `.internal.test.ts` so the dist-full suite skips this file —
 * `tryAttributeOnlyFastPath` / `tryTextContentFastPath` aren't part of the
 * public dist barrel and dist-full mode can't honestly verify them.
 */

import { describe, expect, it } from 'vitest';

import {
  tryAttributeOnlyFastPath,
  tryTextContentFastPath,
} from '../../src/list-reconcile-fast-paths.js';

function buildLive(html: string): Element {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content.firstElementChild as Element;
}

describe('fast-paths internal — tryAttributeOnlyFastPath bail branches', () => {
  it('bails when oldHtml has no \'>\' at all', () => {
    const live = buildLive('<li></li>');
    expect(tryAttributeOnlyFastPath(live, 'no-tag-here', '<li></li>')).toBe(false);
  });

  it('bails when newHtml has no \'>\' at all', () => {
    const live = buildLive('<li></li>');
    expect(tryAttributeOnlyFastPath(live, '<li></li>', 'no-tag-here')).toBe(false);
  });

  it('bails when the tail after \'>\' differs in length', () => {
    const live = buildLive('<li>x</li>');
    expect(tryAttributeOnlyFastPath(live, '<li>x</li>', '<li>xx</li>')).toBe(false);
  });

  it('bails when the tail after \'>\' differs in content', () => {
    const live = buildLive('<li>x</li>');
    expect(tryAttributeOnlyFastPath(live, '<li>x</li>', '<li>y</li>')).toBe(false);
  });

  it('bails when tag names differ', () => {
    const live = buildLive('<li class="a"></li>');
    expect(tryAttributeOnlyFastPath(
      live,
      '<li class="a"></li>',
      '<ul class="b"></ul>',
    )).toBe(false);
  });

  it('bails when an attribute name is namespaced (contains \':\')', () => {
    // `xlink:href` is the SVG-namespace attribute kerf might emit alongside
    // SVG `<use>` elements. parseOpeningTag accepts the name (no `:` lexer
    // rule), but the pre-validate sweep rejects it.
    const oldHtml = '<use xlink:href="#a"></use>';
    const newHtml = '<use xlink:href="#b"></use>';
    const live = buildLive(oldHtml);
    expect(tryAttributeOnlyFastPath(live, oldHtml, newHtml)).toBe(false);
  });

  it('bails on malformed parseOpeningTag: empty tag name', () => {
    const live = buildLive('<li></li>');
    expect(tryAttributeOnlyFastPath(live, '< x="a"></li>', '< x="b"></li>')).toBe(false);
  });

  it('bails on malformed parseOpeningTag: unquoted attribute value', () => {
    const live = buildLive('<li></li>');
    expect(tryAttributeOnlyFastPath(live, '<li x=a></li>', '<li x=b></li>')).toBe(false);
  });

  it('bails on malformed parseOpeningTag: empty attribute name (stray \'=\')', () => {
    const live = buildLive('<li></li>');
    expect(tryAttributeOnlyFastPath(live, '<li ="a"></li>', '<li ="b"></li>')).toBe(false);
  });

  it('bails on malformed parseOpeningTag: unterminated quoted value', () => {
    const live = buildLive('<li></li>');
    expect(tryAttributeOnlyFastPath(live, '<li x="a></li>', '<li x="b></li>')).toBe(false);
  });

  it('bails on malformed input: \'=\' at end of opening tag with no value', () => {
    const live = buildLive('<li></li>');
    expect(tryAttributeOnlyFastPath(live, '<li x= ></li>', '<li y= ></li>')).toBe(false);
  });

  it('bails when the opening tag does not start with \'<\' (HTML without leading tag)', () => {
    const live = buildLive('<li></li>');
    expect(tryAttributeOnlyFastPath(live, 'a>b<li></li>', 'a>c<li></li>')).toBe(false);
  });
});

describe('fast-paths internal — tryAttributeOnlyFastPath success branches', () => {
  it('parses a boolean attribute (no \'=value\') without bailing', () => {
    const live = document.createElement('input');
    live.setAttribute('autofocus', '');
    expect(tryAttributeOnlyFastPath(live, '<input autofocus>', '<input>')).toBe(true);
    expect(live.hasAttribute('autofocus')).toBe(false);
  });

  it('keeps user-agent-owned <details open> when JSX no longer mentions it', () => {
    const live = document.createElement('details');
    live.setAttribute('class', 'a');
    live.setAttribute('open', '');
    const oldHtml = '<details class="a" open=""></details>';
    const newHtml = '<details class="b"></details>';
    expect(tryAttributeOnlyFastPath(live, oldHtml, newHtml)).toBe(true);
    expect(live.getAttribute('class')).toBe('b');
    expect(live.hasAttribute('open')).toBe(true);
  });

  it('keeps user-agent-owned <dialog open> when JSX no longer mentions it', () => {
    const live = document.createElement('dialog');
    live.setAttribute('class', 'a');
    live.setAttribute('open', '');
    const oldHtml = '<dialog class="a" open=""></dialog>';
    const newHtml = '<dialog class="b"></dialog>';
    expect(tryAttributeOnlyFastPath(live, oldHtml, newHtml)).toBe(true);
    expect(live.getAttribute('class')).toBe('b');
    expect(live.hasAttribute('open')).toBe(true);
  });

  it('tolerates whitespace around \'=\' in attribute syntax', () => {
    // Hand-crafted HTML with `attr = "value"`. Kerf's JSX runtime never
    // emits this shape, but the parser handles it for robustness.
    const live = document.createElement('li');
    live.setAttribute('x', 'a');
    expect(tryAttributeOnlyFastPath(live, '<li x = "a"></li>', '<li x = "b"></li>')).toBe(true);
    expect(live.getAttribute('x')).toBe('b');
  });

  it('parses self-closing-style opening tag (trailing slash before \'>\')', () => {
    const live = document.createElement('br');
    live.setAttribute('class', 'a');
    expect(tryAttributeOnlyFastPath(live, '<br class="a"/>', '<br class="b"/>')).toBe(true);
    expect(live.getAttribute('class')).toBe('b');
  });

  it('tolerates trailing whitespace inside the opening tag', () => {
    const live = document.createElement('li');
    live.setAttribute('x', 'a');
    expect(tryAttributeOnlyFastPath(live, '<li x="a" ></li>', '<li x="b" ></li>')).toBe(true);
    expect(live.getAttribute('x')).toBe('b');
  });
});

describe('fast-paths internal — tryTextContentFastPath bail branches', () => {
  it('bails when the equal-prefix is zero (diff starts at column 0)', () => {
    const live = buildLive('<li>x</li>');
    expect(tryTextContentFastPath(live, '<li>x</li>', '<ul>x</ul>')).toBe(false);
  });

  it('bails when the boundary char before the diff is unsafe (inside an attr value)', () => {
    const live = buildLive('<li title="x">y</li>');
    expect(tryTextContentFastPath(
      live,
      '<li title="x">y</li>',
      '<li title="z">y</li>',
    )).toBe(false);
  });

  it('bails when the diff window contains \'<\' (structural change)', () => {
    const live = buildLive('<li>a</li>');
    expect(tryTextContentFastPath(live, '<li>a</li>', '<li>a<br></li>')).toBe(false);
  });

  it('bails when the live text node does not match what oldHtml expected', () => {
    const live = buildLive('<li>original</li>');
    (live.firstChild as Text).nodeValue = 'mutated';
    expect(tryTextContentFastPath(
      live,
      '<li>original</li>',
      '<li>updated</li>',
    )).toBe(false);
  });

  it('bails when oldHtml has no preceding \'>\' (degenerate input)', () => {
    const live = buildLive('<li>x</li>');
    expect(tryTextContentFastPath(live, 'abcde', 'abcfg')).toBe(false);
  });

  it('bails when oldHtml has no following \'<\' after the diff (degenerate input)', () => {
    const live = buildLive('<li>x</li>');
    expect(tryTextContentFastPath(live, '<li>old', '<li>new')).toBe(false);
  });

  it('bails when the text node index walks past the live tree', () => {
    const live = document.createElement('li');
    expect(tryTextContentFastPath(live, '<li>x</li>', '<li>y</li>')).toBe(false);
  });

  it('bails when a binding text marker precedes the diff (KF-374 — the live row carries an inserted node the HTML lacks)', () => {
    // A live row with a wired text hole holds [marker, inserted bound node,
    // static text] where the HTML has only [marker, static text] — the
    // nth-text-node mapping is off by one. Worse, the nodeValue safety net
    // can be defeated by a coincidence: here the bound node's live value
    // ('7 / ') EQUALS the static text the HTML expects at that index, so
    // without the marker guard the fast path would patch the BOUND node
    // instead of the static one.
    const live = buildLive('<li><span>x</span><!--kfbr:t0-->7 / </li>');
    const marker = live.childNodes[1] as Comment;
    marker.after(document.createTextNode('7 / ')); // the wiring-inserted bound node
    expect(tryTextContentFastPath(
      live,
      '<li><span>x</span><!--kfbr:t0-->7 / </li>',
      '<li><span>x</span><!--kfbr:t0-->8 / </li>',
    )).toBe(false);
    // Neither the bound node nor the static text was touched.
    expect(live.textContent).toBe('x7 / 7 / ');
  });

  it('stays on the fast path when the only binding marker sits after the diff', () => {
    const live = buildLive('<li>1 / <!--kfbr:t0--></li>');
    expect(tryTextContentFastPath(
      live,
      '<li>1 / <!--kfbr:t0--></li>',
      '<li>2 / <!--kfbr:t0--></li>',
    )).toBe(true);
    expect(live.textContent).toBe('2 / ');
  });
});

describe('fast-paths internal — tryTextContentFastPath walk-and-find', () => {
  it('finds and patches a non-first text node (walks past earlier text)', () => {
    // countTextNodesBefore walks past 'x' (text branch);
    // nthTextNodeDescendant walks past 'x' (count++) before reaching the target.
    const live = buildLive('<li>x<span>y</span></li>');
    expect(tryTextContentFastPath(
      live,
      '<li>x<span>y</span></li>',
      '<li>x<span>z</span></li>',
    )).toBe(true);
    expect(live.outerHTML).toBe('<li>x<span>z</span></li>');
  });

  it('does not re-enter sibling walk after finding the target text node', () => {
    // After walk(span) sets result, the parent walk(li)'s loop iterates
    // to 'z' but the early-return guard short-circuits.
    const live = buildLive('<li><span>y</span>z</li>');
    expect(tryTextContentFastPath(
      live,
      '<li><span>y</span>z</li>',
      '<li><span>w</span>z</li>',
    )).toBe(true);
    expect(live.outerHTML).toBe('<li><span>w</span>z</li>');
  });
});
