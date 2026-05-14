/**
 * Unit tests for the JSX runtime — verifies the JSX → SafeHtml string
 * pipeline produces correctly-escaped, alias-translated, void-tag-aware HTML.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Fragment, isSafeHtml, jsx, raw, SafeHtml } from '../../src/jsx-runtime.js';

describe('SafeHtml', () => {
  it('wraps a string and exposes it via toString()', () => {
    const sh = new SafeHtml('<p>hi</p>');
    expect(sh.toString()).toBe('<p>hi</p>');
    expect(String(sh)).toBe('<p>hi</p>');
  });
});

describe('isSafeHtml() — cross-bundle brand', () => {
  // Regression for KF-14: when a consumer's bundler loads two copies of
  // kerf (e.g. the barrel + the JSX-runtime entry) the per-realm `SafeHtml`
  // classes are no longer === each other. `instanceof` would fail; the brand
  // symbol (`Symbol.for('kerfjs.SafeHtml')`) makes `isSafeHtml()` work anyway.

  it('recognizes real SafeHtml instances', () => {
    expect(isSafeHtml(new SafeHtml('<p>x</p>'))).toBe(true);
    expect(isSafeHtml(raw('<p>x</p>'))).toBe(true);
  });

  it('returns false for non-SafeHtml values', () => {
    expect(isSafeHtml(null)).toBe(false);
    expect(isSafeHtml(undefined)).toBe(false);
    expect(isSafeHtml('hi')).toBe(false);
    expect(isSafeHtml(42)).toBe(false);
    expect(isSafeHtml({})).toBe(false);
    expect(isSafeHtml({ __html: '<p>x</p>' })).toBe(false);
  });

  it('recognizes an instance from a separate SafeHtml class that uses the same brand symbol', () => {
    // Simulate what happens when a consumer's bundler ships two copies of
    // jsx-runtime — each copy defines its own `SafeHtml` class. As long as
    // both classes were built from the same kerf source, they share the
    // global `Symbol.for('kerfjs.SafeHtml')` brand.
    const BRAND = Symbol.for('kerfjs.SafeHtml');
    class OtherSafeHtml {
      readonly __html: string;
      readonly [BRAND] = true as const;
      constructor(html: string) { this.__html = html; }
      toString(): string { return this.__html; }
    }
    const other = new OtherSafeHtml('<b>cross-bundle</b>');
    expect(other instanceof SafeHtml).toBe(false); // sanity: distinct classes
    expect(isSafeHtml(other)).toBe(true);

    // And the runtime accepts it as a JSX child (this is the KF-14 fix).
    const out = jsx('div', { children: other as unknown as SafeHtml });
    expect(out.toString()).toBe('<div><b>cross-bundle</b></div>');
  });

  it('rejects an object that has __html but no brand', () => {
    const fake = { __html: '<p>x</p>', toString() { return this.__html; } };
    expect(isSafeHtml(fake)).toBe(false);
    expect(() => jsx('div', { children: fake as unknown as SafeHtml }).toString())
      .toThrow(/unsupported child of type object/);
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

  it('throws on a plain object child (e.g. forgot store.state.value)', () => {
    expect(() => jsx('div', { children: { foo: 'bar' } as never }).toString())
      .toThrow(/unsupported child of type object/);
  });

  it('throws on a function child', () => {
    expect(() => jsx('div', { children: (() => 'x') as never }).toString())
      .toThrow(/unsupported child of type function/);
  });

  it('throws on a Promise child and names the constructor', () => {
    const p = Promise.resolve('x');
    expect(() => jsx('div', { children: p as never }).toString())
      .toThrow(/object \(Promise\)/);
    p.catch(() => {});
  });

  it('throws on an unsupported attribute value type', () => {
    expect(() => jsx('div', { foo: { x: 1 } } as never).toString())
      .toThrow(/unsupported value for attribute "foo"/);
  });

  it('attribute-error message names the constructor for class instances', () => {
    class MySignal { value = 1 }
    expect(() => jsx('div', { foo: new MySignal() } as never).toString())
      .toThrow(/object \(MySignal\)/);
  });

  it('function-valued onX={fn} attributes throw with a delegate() fix-pointer (KF-178)', () => {
    const handler = () => {};
    expect(() => jsx('button', { onClick: handler, children: 'x' } as never).toString())
      .toThrow(/inline event handlers like onClick=\{fn\} are not supported/);
    expect(() => jsx('button', { onClick: handler, children: 'x' } as never).toString())
      .toThrow(/delegate\(rootEl, 'click', '\[data-action="\.\.\."\]'/);
    expect(() => jsx('input', { onInput: handler } as never).toString())
      .toThrow(/inline event handlers like onInput=\{fn\}/);
  });

  it('function-valued non-onX attributes still hit the generic unsupported-value path', () => {
    const handler = () => {};
    expect(() => jsx('div', { customAttr: handler } as never).toString())
      .toThrow(/unsupported value for attribute "customAttr"/);
  });

  it('accepts a SafeHtml as an attribute value (raw injection for pre-escaped data)', () => {
    const out = jsx('div', { 'data-html': raw('a&amp;b') });
    expect(out.toString()).toBe('<div data-html="a&amp;b"></div>');
  });

  it('attribute-error message names "array" when an array is passed', () => {
    expect(() => jsx('div', { foo: [1, 2, 3] } as never).toString())
      .toThrow(/got array/);
  });

  it('invokes function components with their props', () => {
    interface GreetingProps { name: string }
    const Greeting = ({ name }: GreetingProps) => jsx('p', { children: `hi, ${name}` });
    const out = jsx(Greeting as never, { name: 'world' });
    expect(out.toString()).toBe('<p>hi, world</p>');
  });
});


describe('jsx — dangerous URL attribute filter', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('drops javascript: in href and warns', () => {
    const out = jsx('a', { href: 'javascript:alert(1)', children: 'click' });
    expect(out.toString()).toBe('<a>click</a>');
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toMatch(/dropped dangerous URL value for href/);
  });

  it('drops javascript: in src on img', () => {
    const out = jsx('img', { src: 'javascript:alert(1)' });
    expect(out.toString()).toBe('<img>');
  });

  it('drops javascript: in formaction on button', () => {
    const out = jsx('button', { formaction: 'javascript:alert(1)', children: 'go' });
    expect(out.toString()).toBe('<button>go</button>');
  });

  it('drops javascript: in action on form', () => {
    const out = jsx('form', { action: 'javascript:alert(1)', children: 'x' });
    expect(out.toString()).toBe('<form>x</form>');
  });

  it('drops javascript: in xlink:href via the xlinkHref alias', () => {
    const out = jsx('use', { xlinkHref: 'javascript:alert(1)' });
    expect(out.toString()).toBe('<use></use>');
  });

  it('drops vbscript: URLs', () => {
    const out = jsx('a', { href: 'vbscript:msgbox(1)', children: 'x' });
    expect(out.toString()).toBe('<a>x</a>');
  });

  it('drops mixed-case JAVASCRIPT: with leading whitespace', () => {
    const out = jsx('a', { href: '   JaVaScRiPt:alert(1)', children: 'x' });
    expect(out.toString()).toBe('<a>x</a>');
  });

  it('drops data:text/html URLs', () => {
    const out = jsx('a', { href: 'data:text/html,<script>alert(1)</script>', children: 'x' });
    expect(out.toString()).toBe('<a>x</a>');
  });

  it('preserves safe https URLs', () => {
    const out = jsx('a', { href: 'https://example.com/x?y=1', children: 'ok' });
    expect(out.toString()).toBe('<a href="https://example.com/x?y=1">ok</a>');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('preserves safe data: image URLs', () => {
    const out = jsx('img', { src: 'data:image/png;base64,iVBORw0K' });
    expect(out.toString()).toBe('<img src="data:image/png;base64,iVBORw0K">');
  });

  it('preserves dangerous protocols on non-URL attributes (e.g. data-action)', () => {
    const out = jsx('div', { 'data-action': 'javascript:alert(1)' });
    expect(out.toString()).toBe('<div data-action="javascript:alert(1)"></div>');
  });

  it('lets raw() pass through as the documented opt-out', () => {
    const out = jsx('a', { href: raw('javascript:alert(1)'), children: 'bookmarklet' });
    expect(out.toString()).toBe('<a href="javascript:alert(1)">bookmarklet</a>');
    expect(warnSpy).not.toHaveBeenCalled();
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
