/**
 * Unit tests for `toElement()`.
 *
 * Uses jsdom (overridden per-file) instead of happy-dom because happy-dom's
 * `DOMParser` has limited `image/svg+xml` support — it returns a document
 * whose `documentElement` is null for SVG inputs. jsdom gets it right, and
 * real browsers get it right; this test file covers both production cases.
 *
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from 'vitest';

import { Fragment,jsx } from '../../src/jsx-runtime.js';
import { toElement } from '../../src/toElement.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('toElement() — HTML', () => {
  it('returns a DOM element from a SafeHtml', () => {
    const el = toElement(jsx('div', { className: 'foo', children: 'hi' }));
    expect(el).toBeInstanceOf(Element);
    expect((el as Element).tagName).toBe('DIV');
    expect((el as Element).className).toBe('foo');
    expect(el.textContent).toBe('hi');
  });

  it('accepts a raw string', () => {
    const el = toElement('<p>hello</p>');
    expect(el).toBeInstanceOf(Element);
    expect((el as Element).tagName).toBe('P');
    expect(el.textContent).toBe('hello');
  });

  it('returns a DocumentFragment when given multiple element roots', () => {
    const frag = toElement('<span>a</span><span>b</span>');
    expect(frag).toBeInstanceOf(DocumentFragment);
    expect(frag.childNodes.length).toBe(2);
    expect((frag.childNodes[0] as Element).tagName).toBe('SPAN');
    expect((frag.childNodes[1] as Element).tagName).toBe('SPAN');
    expect(frag.textContent).toBe('ab');
  });

  it('returns a DocumentFragment when given text + element', () => {
    const frag = toElement('hello <b>world</b>');
    expect(frag).toBeInstanceOf(DocumentFragment);
    expect(frag.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
    expect(frag.childNodes[0].textContent).toBe('hello ');
    expect((frag.childNodes[1] as Element).tagName).toBe('B');
  });

  it('DocumentFragment inlines on appendChild — children move to parent', () => {
    const frag = toElement('<span>a</span> middle <span>b</span>');
    const parent = document.createElement('div');
    parent.appendChild(frag);
    expect(parent.childNodes.length).toBe(3);
    expect(parent.children.length).toBe(2);
    expect(parent.textContent).toBe('a middle b');
    // Source fragment is now empty (DOM spec behavior for fragment insertion).
    expect(frag.childNodes.length).toBe(0);
  });

  it('returns the element when surrounded by only whitespace text', () => {
    const el = toElement('  <p>hi</p>  ');
    expect(el).toBeInstanceOf(Element);
    expect((el as Element).tagName).toBe('P');
  });

  it('throws when given empty string', () => {
    expect(() => toElement('')).toThrow(/produced no element/);
  });

  it('throws when input has no element children (only comments)', () => {
    expect(() => toElement('<!-- nothing -->')).toThrow(/produced no element/);
  });

  it('treats a comment node sibling as a multi-root signal (returns DocumentFragment)', () => {
    // Single element + comment sibling — not "single-root" by our predicate
    // (only whitespace text is tolerated alongside the lone element), so
    // returns a DocumentFragment with both nodes preserved.
    const frag = toElement('<p>x</p><!-- annotation -->');
    expect(frag).toBeInstanceOf(DocumentFragment);
    expect(frag.childNodes.length).toBe(2);
    expect((frag.childNodes[0] as Element).tagName).toBe('P');
    expect(frag.childNodes[1].nodeType).toBe(Node.COMMENT_NODE);
  });

  it('error message includes a truncated excerpt of the input HTML', () => {
    const long = '<!-- ' + 'x'.repeat(200) + ' -->';
    try {
      toElement(long);
      expect.fail('expected toElement to throw');
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('input:');
      expect(msg).toContain('…');
      expect(msg.length).toBeLessThan(long.length + 100);
    }
  });
});

describe('toElement() — SVG', () => {
  it('parses a root-<svg> with proper namespace', () => {
    const el = toElement('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3"/></svg>');
    expect(el).toBeInstanceOf(Element);
    const svg = el as Element;
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    const child = svg.firstElementChild!;
    expect(child.tagName.toLowerCase()).toBe('circle');
    expect(child.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('parses an orphan <path> fragment with proper namespace', () => {
    const el = toElement('<path d="M 0 0 L 10 10" fill="red" />');
    expect(el).toBeInstanceOf(Element);
    const path = el as Element;
    expect(path.tagName.toLowerCase()).toBe('path');
    expect(path.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('parses an orphan <g> fragment with proper namespace', () => {
    const el = toElement('<g><circle cx="5" cy="5" r="3" /></g>');
    expect(el).toBeInstanceOf(Element);
    const g = el as Element;
    expect(g.tagName.toLowerCase()).toBe('g');
    expect(g.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(g.firstElementChild!.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('does NOT route plain HTML through the SVG path', () => {
    const el = toElement('<button>click</button>');
    expect(el).toBeInstanceOf(Element);
    const button = el as Element;
    expect(button.tagName).toBe('BUTTON');
    expect(button.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
  });

  it('throws with input excerpt on a malformed root <svg>', () => {
    expect(() => toElement('<svg><unclosed</svg>')).toThrow(/SVG parse error.*input:/s);
  });

  it('throws with input excerpt on a malformed SVG fragment', () => {
    expect(() => toElement('<g><circle cx=</g>')).toThrow(/SVG fragment parse error.*input:/s);
  });
});

describe('toElement() — fragments with <svg> and siblings (KF-232)', () => {
  // Pre-KF-232, any input whose leading tag was `<svg>` was handed to the
  // image/svg+xml parser, which rejects multi-root input. After KF-232 these
  // shapes return a DocumentFragment that DOM insertion APIs splat into the
  // parent — text nodes preserved, namespaces correct.
  const SPINNER = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>';
  const SPINNER_B = SPINNER.replace('cx="12"', 'cx="6"');
  const SVG_NS = 'http://www.w3.org/2000/svg';

  it('case: <svg/> alone — returns Element', () => {
    const el = toElement(SPINNER);
    expect(el).toBeInstanceOf(Element);
    expect((el as Element).namespaceURI).toBe(SVG_NS);
  });

  it('case: <svg/> followed by text — returns DocumentFragment preserving text', () => {
    const frag = toElement(`${SPINNER} working`);
    expect(frag).toBeInstanceOf(DocumentFragment);
    const parent = document.createElement('div');
    parent.appendChild(frag);
    expect(parent.children.length).toBe(1);
    expect(parent.children[0].namespaceURI).toBe(SVG_NS);
    expect(parent.textContent).toBe(' working');
  });

  it('case: self-closing <svg .../> followed by text — DocumentFragment preserves text', () => {
    const frag = toElement('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" /> label');
    expect(frag).toBeInstanceOf(DocumentFragment);
    const parent = document.createElement('div');
    parent.appendChild(frag);
    expect(parent.children.length).toBe(1);
    expect(parent.children[0].namespaceURI).toBe(SVG_NS);
    expect(parent.textContent).toBe(' label');
  });

  it('case: text followed by <svg/> — DocumentFragment preserves leading text', () => {
    const frag = toElement(`hello ${SPINNER}`);
    expect(frag).toBeInstanceOf(DocumentFragment);
    const parent = document.createElement('div');
    parent.appendChild(frag);
    expect(parent.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
    expect(parent.childNodes[0].textContent).toBe('hello ');
    expect(parent.children.length).toBe(1);
    expect(parent.children[0].namespaceURI).toBe(SVG_NS);
  });

  it('case: <svg/><svg/> back-to-back — DocumentFragment with both svgs', () => {
    const frag = toElement(`${SPINNER}${SPINNER_B}`);
    expect(frag).toBeInstanceOf(DocumentFragment);
    const parent = document.createElement('div');
    parent.appendChild(frag);
    expect(parent.children.length).toBe(2);
    expect(parent.children[0].namespaceURI).toBe(SVG_NS);
    expect(parent.children[1].namespaceURI).toBe(SVG_NS);
    expect(parent.children[0].querySelector('circle')!.getAttribute('cx')).toBe('12');
    expect(parent.children[1].querySelector('circle')!.getAttribute('cx')).toBe('6');
  });

  it('case: <svg/> text <svg/> — DocumentFragment with svg+text+svg', () => {
    const frag = toElement(`${SPINNER} between ${SPINNER_B}`);
    expect(frag).toBeInstanceOf(DocumentFragment);
    const parent = document.createElement('div');
    parent.appendChild(frag);
    expect(parent.children.length).toBe(2);
    expect(parent.textContent?.trim()).toBe('between');
    expect(parent.children[0].namespaceURI).toBe(SVG_NS);
    expect(parent.children[1].namespaceURI).toBe(SVG_NS);
  });

  it('still uses the XML parser for single-svg-root with surrounding whitespace', () => {
    const el = toElement(`  ${SPINNER}\n`);
    expect(el).toBeInstanceOf(Element);
    const svg = el as Element;
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.namespaceURI).toBe(SVG_NS);
    expect(svg.firstElementChild!.namespaceURI).toBe(SVG_NS);
  });

  it('replaceChildren() works directly on the returned DocumentFragment', () => {
    // The downstream-bug shape from HS-8520 — replaceChildren(toElement(<>{ICON} label</>))
    // — now does the obvious thing without a manual two-arg split.
    const host = document.createElement('span');
    host.textContent = 'previous';
    host.replaceChildren(toElement(`${SPINNER} working`));
    expect(host.children.length).toBe(1);
    expect(host.children[0].namespaceURI).toBe(SVG_NS);
    expect(host.textContent).toBe(' working');
  });
});

describe('toElement() — returned node is adopted into the live document (KF-240)', () => {
  // Both parse paths (`<template>.content`, `DOMParser`) produce nodes owned by
  // an INERT document, not `document`. Returning such a node is unsafe to
  // mutate before insertion: `mount()`'s first-render `rootEl.innerHTML = …`
  // against an inert-document element trips a WebKit fragment-parsing bug under
  // rapid bursts (a fresh card inheriting a prior parse's DOM). `toElement`
  // adopts into the live document so `ownerDocument === document` always holds.
  it('single HTML root is owned by the live document', () => {
    const el = toElement(jsx('div', { className: 'card' })) as Element;
    expect(el.ownerDocument).toBe(document);
    expect(el.parentNode).toBeNull(); // detached, but in the live document
  });

  it('the adopted element can be mounted/innerHTML-written safely before insertion', () => {
    // Direct regression for the LingoGist repro shape: build a detached card,
    // then write its innerHTML BEFORE it's inserted. The content must match
    // exactly what was written (no inert-document parse anomaly).
    const card = toElement(jsx('div', { className: 'probe-card' })) as HTMLElement;
    expect(card.ownerDocument).toBe(document);
    card.innerHTML = '<button class="opt">Yes</button>';
    expect(card.querySelectorAll('.selected, button[disabled]').length).toBe(0);
    expect(card.innerHTML).toBe('<button class="opt">Yes</button>');
  });

  it('SVG root is owned by the live document (and adoption preserves namespace)', () => {
    const el = toElement('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><circle r="1"/></svg>') as Element;
    expect(el.ownerDocument).toBe(document);
    expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg'); // namespace survives adoption
    expect(el.firstElementChild!.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('orphan SVG fragment is owned by the live document', () => {
    const el = toElement('<path d="M0 0"/>') as Element;
    expect(el.ownerDocument).toBe(document);
    expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('multi-root DocumentFragment is owned by the live document', () => {
    const frag = toElement(jsx(Fragment, { children: [jsx('span', { children: 'a' }), jsx('span', { children: 'b' })] })) as DocumentFragment;
    expect(frag.ownerDocument).toBe(document);
    for (const child of Array.from(frag.children)) {
      expect(child.ownerDocument).toBe(document);
    }
  });
});
