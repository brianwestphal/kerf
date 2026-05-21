import { describe, expect, it } from 'vitest';

import { attr } from '../../src/attrSelector.js';

describe('attr — static overload', () => {
  it('returns name, value, selector, and attrs for a basic attribute', () => {
    const a = attr('data-action', 'add-todo');
    expect(a.name).toBe('data-action');
    expect(a.value).toBe('add-todo');
    expect(a.selector).toBe('[data-action="add-todo"]');
    expect(a.attrs).toEqual({ 'data-action': 'add-todo' });
  });

  it('pre-computes the selector so repeated access returns the same string', () => {
    const a = attr('data-action', 'toggle');
    expect(a.selector).toBe(a.selector);
  });

  it('the returned object is frozen', () => {
    const a = attr('data-x', 'y');
    expect(Object.isFrozen(a)).toBe(true);
  });

  it('.attrs is frozen', () => {
    const a = attr('data-action', 'save');
    expect(Object.isFrozen(a.attrs)).toBe(true);
  });

  it('.attrs key matches the attribute name', () => {
    const a = attr('data-action', 'remove');
    expect(Object.keys(a.attrs)).toEqual(['data-action']);
    expect((a.attrs as Record<string, string>)['data-action']).toBe('remove');
  });

  it('escapes double quotes in values', () => {
    const a = attr('data-label', 'say "hello"');
    expect(a.selector).toBe('[data-label="say \\"hello\\""]');
    expect(a.value).toBe('say "hello"');
  });

  it('escapes backslashes in values', () => {
    expect(attr('data-path', 'C:\\Users\\foo').selector)
      .toBe('[data-path="C:\\\\Users\\\\foo"]');
  });

  it('escapes CSS metacharacters in attribute names', () => {
    expect(attr('my.attr', 'val').selector).toBe('[my\\.attr="val"]');
  });

  it('escapes a leading digit in the attribute name', () => {
    expect(attr('3foo', 'bar').selector).toMatch(/^\[\\33\s?foo="bar"\]$/);
  });

  it('throws on an empty attribute name', () => {
    expect(() => attr('', 'value')).toThrow('attribute name must not be empty');
  });

  it('handles non-ASCII characters in values by leaving them as-is', () => {
    expect(attr('data-label', 'héllo').selector).toBe('[data-label="héllo"]');
  });

  it('handles control chars in values via hex-escape', () => {
    // Newline (U+000A = 0x0A) → '\a '
    expect(attr('data-x', '\n').selector).toBe('[data-x="\\a "]');
  });

  it('replaces null char in attribute name with replacement character', () => {
    expect(attr('\x00', 'val').selector).toBe('[�="val"]');
  });

  it('replaces null char in attribute value with replacement character', () => {
    expect(attr('x', '\x00').selector).toBe('[x="�"]');
  });

  it('hex-escapes control chars in attribute names', () => {
    expect(attr('data\x09attr', 'val').selector).toBe('[data\\9 attr="val"]');
  });

  it('hex-escapes a digit in second position after a leading hyphen', () => {
    expect(attr('-3foo', 'bar').selector).toMatch(/^\[-\\33\s?foo="bar"\]$/);
  });

  it('compound selectors are formed by concatenating .selector strings', () => {
    const compound = attr('data-action', 'toggle').selector + attr('data-id', '42').selector;
    expect(compound).toBe('[data-action="toggle"][data-id="42"]');
  });
});

describe('attr — dynamic overload', () => {
  it('returns a function when called with one argument', () => {
    const factory = attr('data-id');
    expect(typeof factory).toBe('function');
  });

  it('throws on an empty attribute name in the dynamic form', () => {
    expect(() => attr('')).toThrow('attribute name must not be empty');
  });

  it('factory produces an object keyed by the attribute name', () => {
    const factory = attr('data-id');
    const result = factory('42');
    expect(result).toEqual({ 'data-id': '42' });
  });

  it('factory result is frozen', () => {
    const result = attr('data-id')('42');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('factory produces a fresh object on each call', () => {
    const factory = attr('data-id');
    const a = factory('1');
    const b = factory('2');
    expect(a).not.toBe(b);
    expect((a as Record<string, string>)['data-id']).toBe('1');
    expect((b as Record<string, string>)['data-id']).toBe('2');
  });

  it('explicit V generic constrains the factory value type at runtime', () => {
    // V = 'foo'|'bar' — the factory still accepts any string at runtime,
    // but the declared type narrows to the union for callers who specify V.
    const factory = attr<'data-id', 'foo' | 'bar'>('data-id');
    const result = factory('foo');
    expect((result as Record<string, string>)['data-id']).toBe('foo');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('factory result can be spread alongside static .attrs', () => {
    const toggle = attr('data-action', 'toggle');
    const id = attr('data-id');
    const combined = { ...toggle.attrs, ...id('99') };
    expect(combined).toEqual({ 'data-action': 'toggle', 'data-id': '99' });
  });
});
