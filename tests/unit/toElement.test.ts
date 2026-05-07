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

import { jsx } from '../../src/jsx-runtime.js';
import { toElement } from '../../src/toElement.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('toElement() — HTML', () => {
  it('returns a DOM element from a SafeHtml', () => {
    const el = toElement(jsx('div', { className: 'foo', children: 'hi' }));
    expect(el.tagName).toBe('DIV');
    expect(el.className).toBe('foo');
    expect(el.textContent).toBe('hi');
  });

  it('accepts a raw string', () => {
    const el = toElement('<p>hello</p>');
    expect(el.tagName).toBe('P');
    expect(el.textContent).toBe('hello');
  });

  it('returns the FIRST element when given multiple roots', () => {
    const el = toElement('<span>a</span><span>b</span>');
    expect(el.tagName).toBe('SPAN');
    expect(el.textContent).toBe('a');
  });

  it('throws when given empty string', () => {
    expect(() => toElement('')).toThrow(/produced no element/);
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
    expect(el.tagName.toLowerCase()).toBe('svg');
    expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
    const child = el.firstElementChild!;
    expect(child.tagName.toLowerCase()).toBe('circle');
    expect(child.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('parses an orphan <path> fragment with proper namespace', () => {
    const el = toElement('<path d="M 0 0 L 10 10" fill="red" />');
    expect(el.tagName.toLowerCase()).toBe('path');
    expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('parses an orphan <g> fragment with proper namespace', () => {
    const el = toElement('<g><circle cx="5" cy="5" r="3" /></g>');
    expect(el.tagName.toLowerCase()).toBe('g');
    expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(el.firstElementChild!.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('does NOT route plain HTML through the SVG path', () => {
    const el = toElement('<button>click</button>');
    expect(el.tagName).toBe('BUTTON');
    expect(el.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
  });

  it('throws with input excerpt on a malformed root <svg>', () => {
    expect(() => toElement('<svg><unclosed</svg>')).toThrow(/SVG parse error.*input:/s);
  });

  it('throws with input excerpt on a malformed SVG fragment', () => {
    expect(() => toElement('<g><circle cx=</g>')).toThrow(/SVG fragment parse error.*input:/s);
  });
});
