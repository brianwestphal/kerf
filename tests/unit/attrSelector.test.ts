import { describe, expect, it } from 'vitest';

import { attrSelector } from '../../src/attrSelector.js';

describe('attrSelector', () => {
  it('produces a single attribute selector for one attr', () => {
    expect(attrSelector({ 'data-action': 'add-todo' })).toBe('[data-action="add-todo"]');
  });

  it('concatenates multiple selectors for multiple attrs', () => {
    const result = attrSelector({ 'data-action': 'toggle', 'data-id': '42' });
    expect(result).toBe('[data-action="toggle"][data-id="42"]');
  });

  it('escapes double quotes in values', () => {
    const result = attrSelector({ 'data-label': 'say "hello"' });
    expect(result).toBe('[data-label="say \\"hello\\""]');
  });

  it('escapes backslashes in values', () => {
    const result = attrSelector({ 'data-path': 'C:\\Users\\foo' });
    expect(result).toBe('[data-path="C:\\\\Users\\\\foo"]');
  });

  it('escapes CSS metacharacters in attribute names', () => {
    // A name with a dot (unusual but defensive)
    const result = attrSelector({ 'my.attr': 'val' });
    expect(result).toBe('[my\\.attr="val"]');
  });

  it('escapes a leading digit in the attribute name', () => {
    const result = attrSelector({ '3foo': 'bar' });
    // Leading digit → hex-escaped
    expect(result).toMatch(/^\[\\33\s?foo="bar"\]$/);
  });

  it('returns an empty string for an empty attrs object', () => {
    expect(attrSelector({})).toBe('');
  });

  it('throws on an empty attribute name', () => {
    expect(() => attrSelector({ '': 'value' })).toThrow('attribute name must not be empty');
  });

  it('handles non-ASCII characters in values by leaving them as-is', () => {
    const result = attrSelector({ 'data-label': 'héllo' });
    expect(result).toBe('[data-label="héllo"]');
  });

  it('handles control chars in values via hex-escape', () => {
    const result = attrSelector({ 'data-x': '\n' });
    // Newline (U+000A = 0x0A) → '\a '
    expect(result).toBe('[data-x="\\a "]');
  });

  it('replaces null char in attribute name with replacement character', () => {
    const result = attrSelector({ '\x00': 'val' });
    expect(result).toBe('[�="val"]');
  });

  it('replaces null char in attribute value with replacement character', () => {
    const result = attrSelector({ x: '\x00' });
    expect(result).toBe('[x="�"]');
  });

  it('hex-escapes control chars in attribute names', () => {
    // Tab (U+0009) in a name goes through cssEscapeIdent's control-char branch
    const result = attrSelector({ ['data\x09attr']: 'val' });
    expect(result).toBe('[data\\9 attr="val"]');
  });

  it('hex-escapes a digit in second position after a leading hyphen', () => {
    // "-3foo": the '-' is safe, the '3' at index 1 (after '-') must be hex-escaped
    const result = attrSelector({ '-3foo': 'bar' });
    expect(result).toMatch(/^\[-\\33\s?foo="bar"\]$/);
  });
});
