/**
 * Unit tests for fine-grained signal bindings (KF-294 spike).
 *
 * The headline property: a signal handed straight into an attribute or text
 * hole updates the live DOM WITHOUT re-running the render function — the coarse
 * mount() effect never subscribed to it. These tests pin that (render is spied
 * and must stay at one call across binding-driven updates), plus SSR/toString
 * snapshot fallback, teardown, and survival across a coarse (morph) re-render.
 */

import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';

import { jsx,raw } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';
import { enterProductionShape,restoreDevelopmentShape } from '../helpers/dev-shape.js';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
});

describe('fine-grained bindings — bound-attribute security: throws in dev (KF-297 / KF-340)', () => {
  beforeEach(() => { restoreDevelopmentShape(); });
  afterEach(() => { restoreDevelopmentShape(); });

  it('throws when a bound href resolves to a javascript: URL', () => {
    const url = signal('javascript:alert(1)');
    expect(() => mount(root, () => jsx('a', { id: 'a', href: url, children: 'x' })))
      .toThrow(/dropped dangerous URL value for href/);
  });

  it('throws for a bound src URL-bearing attribute', () => {
    expect(() => mount(root, () => jsx('img', { id: 'img', src: signal('javascript:alert(1)') })))
      .toThrow(/dropped dangerous URL value for src/);
  });

  it('throws for a bound formaction URL-bearing attribute', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    expect(() => mount(host, () => jsx('button', { id: 'b', formaction: signal('javascript:alert(1)'), children: 'go' })))
      .toThrow(/dropped dangerous URL value for formaction/);
    host.remove();
  });

  it('throws when a live update flips the bound URL from safe to dangerous', () => {
    const url = signal('/safe');
    const dispose = mount(root, () => jsx('a', { id: 'a', href: url, children: 'x' }));
    expect((root.querySelector('#a') as HTMLElement).getAttribute('href')).toBe('/safe');
    expect(() => { url.value = 'javascript:alert(1)'; }).toThrow(/dropped dangerous URL value for href/);
    dispose();
  });

  it('throws on the hardened screen — control-char-obfuscated javascript:', () => {
    // KF-304: control-char-obfuscated javascript: caught even on the bound path.
    expect(() => mount(root, () => jsx('a', { id: 'a', href: signal('java\tscript:alert(1)'), children: 'x' })))
      .toThrow(/dropped dangerous URL value for href/);
  });

  it('throws on the hardened screen — script-executing data: subtype', () => {
    // KF-311: script-executing data: subtype dropped.
    expect(() => mount(root, () => jsx('iframe', { id: 'i', src: signal('data:image/svg+xml,<svg onload=alert(1)/>') })))
      .toThrow(/dropped dangerous URL value for src/);
  });

  it('throws on the hardened screen — <object data> document load', () => {
    // KF-312: <object data> screened (loads its target as a document).
    expect(() => mount(root, () => jsx('object', { id: 'o', data: signal('data:text/html,<script>alert(1)</script>') })))
      .toThrow(/dropped dangerous URL value for data/);
  });

  it('does NOT throw for non-URL attributes (screen not triggered)', () => {
    const v = signal('javascript:alert(1)');
    const dispose = mount(root, () => jsx('div', { id: 'd', 'data-action': v }));
    expect((root.querySelector('#d') as HTMLElement).getAttribute('data-action')).toBe('javascript:alert(1)');
    dispose();
  });

  it('lets a SafeHtml (raw()) bound value bypass the screen in dev — the opt-out is unchanged', () => {
    const href = signal(raw('javascript:void(0)'));
    const dispose = mount(root, () => jsx('a', { id: 'a', href, children: 'bookmarklet' }));
    // raw() opts out in BOTH modes: written verbatim, never throws.
    expect((root.querySelector('#a') as HTMLElement).getAttribute('href')).toBe('javascript:void(0)');
    dispose();
  });
});

describe('fine-grained bindings — bound-attribute security: warn+drop in production (KF-297 / KF-340)', () => {
  // Force production mode so the screen warns + drops instead of throwing. The
  // override wins over the ambient NODE_ENV=test; restore it after each test.
  beforeEach(() => { enterProductionShape(); });
  afterEach(() => { restoreDevelopmentShape(); });

  it('drops a bound href that resolves to a javascript: URL, and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const url = signal('javascript:alert(1)');
    const dispose = mount(root, () => jsx('a', { id: 'a', href: url, children: 'x' }));
    const a = root.querySelector('#a') as HTMLElement;
    expect(a.hasAttribute('href')).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/dropped dangerous URL value for href/));
    warn.mockRestore();
    dispose();
  });

  it('screens every URL-bearing attribute (src / formaction / action / xlink:href)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = signal('javascript:alert(1)');
    const dispose = mount(root, () =>
      jsx('div', {
        children: [
          jsx('img', { id: 'img', src: s }),
          jsx('button', { id: 'b', formaction: s, children: 'go' }),
          jsx('form', { id: 'f', action: s, children: 'x' }),
        ],
      }),
    );
    expect((root.querySelector('#img') as HTMLElement).hasAttribute('src')).toBe(false);
    expect((root.querySelector('#b') as HTMLElement).hasAttribute('formaction')).toBe(false);
    expect((root.querySelector('#f') as HTMLElement).hasAttribute('action')).toBe(false);
    warn.mockRestore();
    dispose();
  });

  it('toggles the attribute as the bound URL goes safe → dangerous → safe', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const url = signal('/safe');
    const dispose = mount(root, () => jsx('a', { id: 'a', href: url, children: 'x' }));
    const a = root.querySelector('#a') as HTMLElement;
    expect(a.getAttribute('href')).toBe('/safe');
    url.value = 'javascript:alert(1)';
    expect(a.hasAttribute('href')).toBe(false);      // dropped
    url.value = '/also-safe';
    expect(a.getAttribute('href')).toBe('/also-safe'); // restored
    warn.mockRestore();
    dispose();
  });

  it('does NOT screen non-URL attributes', () => {
    const v = signal('javascript:alert(1)');
    const dispose = mount(root, () => jsx('div', { id: 'd', 'data-action': v }));
    expect((root.querySelector('#d') as HTMLElement).getAttribute('data-action')).toBe('javascript:alert(1)');
    dispose();
  });

  it('applies the hardened screen on the live writer (control-char + data: subtype + <object data>)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // KF-304: control-char-obfuscated javascript: dropped even on the bound path.
    const tabbed = signal('java\tscript:alert(1)');
    // KF-311: script-executing data: subtype dropped; KF-312: <object data> screened.
    const svg = signal('data:image/svg+xml,<svg onload=alert(1)/>');
    const obj = signal('data:text/html,<script>alert(1)</script>');
    const dispose = mount(root, () =>
      jsx('div', {
        children: [
          jsx('a', { id: 'a', href: tabbed, children: 'x' }),
          jsx('iframe', { id: 'i', src: svg }),
          jsx('object', { id: 'o', data: obj }),
        ],
      }),
    );
    expect((root.querySelector('#a') as HTMLElement).hasAttribute('href')).toBe(false);
    expect((root.querySelector('#i') as HTMLElement).hasAttribute('src')).toBe(false);
    expect((root.querySelector('#o') as HTMLElement).hasAttribute('data')).toBe(false);
    warn.mockRestore();
    dispose();
  });

  it('lets a SafeHtml (raw()) bound value bypass the screen — the opt-out', () => {
    const href = signal(raw('javascript:void(0)'));
    const dispose = mount(root, () => jsx('a', { id: 'a', href, children: 'bookmarklet' }));
    // raw() opts out: the value is written verbatim (its __html).
    expect((root.querySelector('#a') as HTMLElement).getAttribute('href')).toBe('javascript:void(0)');
    dispose();
  });

  it('writes a SafeHtml bound attribute value as its __html', () => {
    const v = signal(raw('a&amp;b'));
    const dispose = mount(root, () => jsx('div', { id: 'd', 'data-x': v }));
    expect((root.querySelector('#d') as HTMLElement).getAttribute('data-x')).toBe('a&amp;b');
    dispose();
  });
});
