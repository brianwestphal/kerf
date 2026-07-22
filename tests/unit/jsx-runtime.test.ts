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


// KF-340: the URL screen throws in dev, warns + drops in prod. This block pins
// the PRODUCTION warn+drop behavior across the full obfuscation/subtype matrix;
// it forces `KERF_DEV = false` (the override wins over the ambient NODE_ENV=test)
// so the screen warns instead of throwing. The matching dev-throw behavior is
// covered by the 'throws in dev' block below.
describe('jsx — dangerous URL attribute filter (production warn+drop)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    (globalThis as Record<string, unknown>).KERF_DEV = false;
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    delete (globalThis as Record<string, unknown>).KERF_DEV;
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

  // KF-304: control-character / whitespace obfuscation of the scheme. Browsers
  // strip C0 controls and remove TAB/LF/CR from anywhere before resolving the
  // scheme, so these all still resolve to javascript: — the screen must too.
  it('drops javascript: obfuscated with a leading C0 control char', () => {
    const out = jsx('a', { href: 'javascript:alert(1)', children: 'x' });
    expect(out.toString()).toBe('<a>x</a>');
  });

  it('drops javascript: obfuscated with a leading NUL', () => {
    const out = jsx('a', { href: ' javascript:alert(1)', children: 'x' });
    expect(out.toString()).toBe('<a>x</a>');
  });

  it('drops javascript: with a TAB inside the scheme', () => {
    const out = jsx('a', { href: 'java\tscript:alert(1)', children: 'x' });
    expect(out.toString()).toBe('<a>x</a>');
  });

  it('drops javascript: with a newline inside the scheme', () => {
    const out = jsx('a', { href: 'java\nscript:alert(1)', children: 'x' });
    expect(out.toString()).toBe('<a>x</a>');
  });

  it('drops javascript: with a NUL before the colon', () => {
    const out = jsx('a', { href: 'javascript :alert(1)', children: 'x' });
    expect(out.toString()).toBe('<a>x</a>');
  });

  it('keeps a scheme with a real internal space (browser treats as relative URL)', () => {
    // `java script:` is NOT the javascript: scheme in a browser — a space isn't
    // a valid scheme char — so the screen must not "repair" it into a block.
    const out = jsx('a', { href: 'java script:alert(1)', children: 'x' });
    expect(out.toString()).toBe('<a href="java script:alert(1)">x</a>');
  });

  // KF-311: the data: denylist is subtype-specific. Document-loading subtypes
  // that run script are blocked; inert media families stay allowed.
  it('drops data:image/svg+xml (SVG can carry <script>)', () => {
    const out = jsx('iframe', { src: 'data:image/svg+xml,<svg onload=alert(1)/>' });
    expect(out.toString()).toBe('<iframe></iframe>');
  });

  it('drops data:application/xhtml+xml', () => {
    const out = jsx('iframe', { src: 'data:application/xhtml+xml,<html/>' });
    expect(out.toString()).toBe('<iframe></iframe>');
  });

  it('drops an unknown data: subtype (fails closed)', () => {
    const out = jsx('object', { data: 'data:application/x-evil,payload' });
    expect(out.toString()).toBe('<object></object>');
  });

  it('preserves inert data: media (empty, plain text, css, image, font, audio, video)', () => {
    const inert = [
      'data:,just some text',
      'data:text/plain,hi',
      'data:text/css,body{}',
      'data:image/png;base64,iVBORw0K',
      'data:font/woff2;base64,d09GMg',
      'data:audio/mpeg;base64,SUQz',
      'data:video/mp4;base64,AAAA',
    ];
    for (const href of inert) {
      expect(jsx('a', { href, children: 'x' }).toString()).toBe(`<a href="${href}">x</a>`);
    }
    expect(warnSpy).not.toHaveBeenCalled();
  });

  // KF-312: <object data> is a URL-bearing, document-loading attribute.
  it('screens the data attribute on <object> (data:text/html XSS)', () => {
    const out = jsx('object', { data: 'data:text/html,<script>alert(1)</script>' });
    expect(out.toString()).toBe('<object></object>');
  });

  it('screens javascript: in the data attribute on <object>', () => {
    const out = jsx('object', { data: 'javascript:alert(1)' });
    expect(out.toString()).toBe('<object></object>');
  });
});

describe('attribute name safety (KF-306)', () => {
  // Spreading an object with attacker-controlled KEYS into JSX must not let a
  // key break out of the open tag. The name is validated, not just the value.
  type AttrBag = Parameters<typeof jsx>[1];

  it('throws on an attribute name that would break out of the tag', () => {
    const evil = { 'x><img src=q onerror=alert(1)>': 'y', children: 'z' } as unknown as AttrBag;
    expect(() => jsx('div', evil).toString()).toThrow(/invalid attribute name/);
  });

  it('throws on an attribute name carrying an injected handler (no > needed)', () => {
    const evil = { 'x onmouseover=alert(1)': '', children: 'z' } as unknown as AttrBag;
    expect(() => jsx('div', evil).toString()).toThrow(/invalid attribute name/);
  });

  it('rejects a string-valued on* attribute (would be a live inline handler)', () => {
    const bag = { onclick: 'alert(1)', children: 'go' } as unknown as AttrBag;
    expect(() => jsx('button', bag).toString()).toThrow(/event-handler attribute/);
  });

  it('rejects a lowercase-keyed function handler the old /^on[A-Z]/ guard missed', () => {
    const bag = { onclick: () => {}, children: 'go' } as unknown as AttrBag;
    expect(() => jsx('button', bag).toString()).toThrow(/inline event handlers/);
  });

  it('still accepts valid namespaced / data / aria attribute names', () => {
    expect(jsx('use', { 'xlink:href': '#icon' } as unknown as AttrBag).toString())
      .toBe('<use xlink:href="#icon"></use>');
    expect(jsx('div', { 'data-id': '1', 'aria-label': 'ok', children: 'z' }).toString())
      .toBe('<div data-id="1" aria-label="ok">z</div>');
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

// The static string serializer (`renderAttr`) shares the URL screen with the
// bound writer. KF-340: it THROWS in dev (fail loudly at the developer's desk),
// warns + drops the attribute in prod. `renderAttr` runs eagerly inside `jsx()`,
// so the dev throw surfaces at the `jsx(...)` call, not at `.toString()`.
describe('static renderAttr URL screen — throws in dev (KF-297 / KF-340)', () => {
  beforeEach(() => { (globalThis as Record<string, unknown>).KERF_DEV = true; });
  afterEach(() => { delete (globalThis as Record<string, unknown>).KERF_DEV; });

  it('throws on a javascript: href', () => {
    expect(() => jsx('a', { href: 'javascript:alert(1)', children: 'x' }))
      .toThrow(/dropped dangerous URL value for href/);
  });

  it('throws on a script-executing data: src (hardened subtype screen)', () => {
    expect(() => jsx('iframe', { src: 'data:text/html,<script>alert(1)</script>' }))
      .toThrow(/dropped dangerous URL value for src/);
  });

  it('does NOT throw for a safe URL', () => {
    expect(jsx('a', { href: '/safe', children: 'x' }).toString()).toBe('<a href="/safe">x</a>');
  });

  it('lets a raw()/SafeHtml href bypass the screen in dev — no throw', () => {
    expect(jsx('a', { href: raw('javascript:void(0)'), children: 'go' }).toString())
      .toBe('<a href="javascript:void(0)">go</a>');
  });

  it('emits a JSX-prefixed diagnostic identical to the prod warn body', () => {
    // The thrown Error message matches the prod console.warn text byte-for-byte
    // (same `dangerousUrlWarning` body, same `JSX:` prefix).
    expect(() => jsx('a', { href: 'vbscript:msgbox(1)', children: 'x' }))
      .toThrow(/^JSX: dropped dangerous URL value for href/);
  });

  it('falls back to NODE_ENV when no KERF_DEV override is set (ambient dev throws)', () => {
    // With the override cleared, isDevMode() reads NODE_ENV; the suite runs under
    // NODE_ENV=test (≠ 'production'), so dev mode is active and the screen throws.
    delete (globalThis as Record<string, unknown>).KERF_DEV;
    expect(() => jsx('a', { href: 'javascript:alert(1)', children: 'x' }))
      .toThrow(/dropped dangerous URL value for href/);
  });
});
