/**
 * Unit tests for the private HTML / attribute escaping helpers — src-only
 * (`.internal`) because the dist surface does not expose them.
 */

import { describe, expect, it } from 'vitest';

import { jsx } from '../../src/jsx-runtime.js';
import { escapeAttr, escapeHtml } from '../../src/utils/escapeHtml.js';

describe('escapeHtml / escapeAttr fast path', () => {
  it('returns a value with nothing to escape unchanged, without a replace pass', () => {
    const path = 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z m-1 5h2v6h-2z';
    expect(escapeAttr(path)).toBe(path);
    expect(escapeHtml(path)).toBe(path);
    expect(escapeAttr('')).toBe('');
    expect(escapeHtml("it's")).toBe("it's");
  });

  it('escapes every special character wherever it appears, alone or mixed', () => {
    for (const [input, attr, html] of [
      ['&', '&amp;', '&amp;'],
      ['"', '&quot;', '&quot;'],
      ["'", '&#39;', "'"],
      ['<', '&lt;', '&lt;'],
      ['>', '&gt;', '&gt;'],
      ['a & b', 'a &amp; b', 'a &amp; b'],
      ['x"y\'z<w>', 'x&quot;y&#39;z&lt;w&gt;', "x&quot;y'z&lt;w&gt;"],
      ['tail&', 'tail&amp;', 'tail&amp;'],
    ] as const) {
      expect(escapeAttr(input)).toBe(attr);
      expect(escapeHtml(input)).toBe(html);
    }
    // The renderer escapes through the same helper.
    expect(String(jsx('path', { d: 'M0 0"/><script>' }))).toBe(
      '<path d="M0 0&quot;/&gt;&lt;script&gt;"></path>',
    );
  });

  it('matches a per-character replace chain on a seeded random corpus', () => {
    const chainHtml = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const chainAttr = (s: string) => chainHtml(s).replace(/'/g, '&#39;');
    const alphabet = 'ab &<>"\'é😀;#';
    let seed = 0x2f6e2b1;
    const next = () => (seed = (seed * 1103515245 + 12345) >>> 0);
    for (let n = 0; n < 2000; n += 1) {
      let s = '';
      for (let len = next() % 24; len > 0; len -= 1) {
        s += [...alphabet][next() % [...alphabet].length];
      }
      expect(escapeHtml(s)).toBe(chainHtml(s));
      expect(escapeAttr(s)).toBe(chainAttr(s));
      // Escaping twice in a row starts each scan fresh.
      expect(escapeHtml(s)).toBe(chainHtml(s));
    }
  });
});
