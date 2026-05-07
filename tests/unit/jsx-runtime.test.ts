/**
 * Unit tests for the JSX runtime — verifies the JSX → SafeHtml string
 * pipeline produces correctly-escaped, alias-translated, void-tag-aware HTML.
 */

import { describe, expect, it } from 'vitest';

import { Fragment, jsx, raw, SafeHtml } from '../../src/jsx-runtime.js';

describe('SafeHtml', () => {
  it('wraps a string and exposes it via toString()', () => {
    const sh = new SafeHtml('<p>hi</p>');
    expect(sh.toString()).toBe('<p>hi</p>');
    expect(String(sh)).toBe('<p>hi</p>');
  });
});

describe('raw()', () => {
  it('returns a SafeHtml that bypasses escaping when used as a child', () => {
    const danger = raw('<script>x</script>');
    const out = jsx('div', { children: danger });
    expect(out.toString()).toBe('<div><script>x</script></div>');
  });
});

describe('jsx()', () => {
  it('renders a basic element with text children (HTML-escaped)', () => {
    const out = jsx('p', { children: 'a < b > c & "d"' });
    expect(out.toString()).toBe('<p>a &lt; b &gt; c &amp; &quot;d&quot;</p>');
  });

  it('renders numeric children without escaping', () => {
    const out = jsx('span', { children: 42 });
    expect(out.toString()).toBe('<span>42</span>');
  });

  it('omits null / undefined / boolean children', () => {
    expect(jsx('div', { children: null }).toString()).toBe('<div></div>');
    expect(jsx('div', { children: undefined }).toString()).toBe('<div></div>');
    expect(jsx('div', { children: true }).toString()).toBe('<div></div>');
    expect(jsx('div', { children: false }).toString()).toBe('<div></div>');
  });

  it('joins array children', () => {
    const out = jsx('ul', { children: [
      jsx('li', { children: 'a' }),
      jsx('li', { children: 'b' }),
    ]});
    expect(out.toString()).toBe('<ul><li>a</li><li>b</li></ul>');
  });

  it('escapes attribute values', () => {
    const out = jsx('a', { href: 'https://example.com/?q=a&b="c"' });
    expect(out.toString()).toContain('href="https://example.com/?q=a&amp;b=&quot;c&quot;"');
  });

  it('translates className → class', () => {
    const out = jsx('div', { className: 'foo bar' });
    expect(out.toString()).toBe('<div class="foo bar"></div>');
  });

  it('translates strokeWidth → stroke-width', () => {
    const out = jsx('path', { strokeWidth: 2 });
    expect(out.toString()).toContain('stroke-width="2"');
  });

  it('renders boolean true attributes as bare names', () => {
    const out = jsx('input', { type: 'checkbox', checked: true });
    expect(out.toString()).toBe('<input type="checkbox" checked>');
  });

  it('omits attributes whose value is false / null / undefined', () => {
    const out = jsx('input', { type: 'checkbox', checked: false, disabled: null, hidden: undefined });
    expect(out.toString()).toBe('<input type="checkbox">');
  });

  it('produces self-closing void tags without a closing tag', () => {
    expect(jsx('br', {}).toString()).toBe('<br>');
    expect(jsx('img', { src: 'x.png' }).toString()).toBe('<img src="x.png">');
    expect(jsx('input', { type: 'text' }).toString()).toBe('<input type="text">');
  });

  it('throws when a DOM node is passed as a child', () => {
    const fakeNode = { nodeType: 1, outerHTML: '<x>' };
    expect(() => jsx('div', { children: fakeNode as never }).toString()).toThrow(/DOM elements cannot be passed as children/);
  });

  it('invokes function components with their props', () => {
    interface GreetingProps { name: string }
    const Greeting = ({ name }: GreetingProps) => jsx('p', { children: `hi, ${name}` });
    const out = jsx(Greeting as never, { name: 'world' });
    expect(out.toString()).toBe('<p>hi, world</p>');
  });
});

describe('Fragment', () => {
  it('renders without a wrapper tag', () => {
    const out = Fragment({ children: [
      jsx('span', { children: 'a' }),
      jsx('span', { children: 'b' }),
    ]});
    expect(out.toString()).toBe('<span>a</span><span>b</span>');
  });

  it('renders empty when given no children', () => {
    expect(Fragment({}).toString()).toBe('');
  });
});
