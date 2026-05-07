/**
 * Unit tests for the structured `Segment` representation that backs
 * `SafeHtml`. These exercise the helpers in isolation; their integration
 * with `mount()` is covered by `mount.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import {
  collectLists,
  flatten,
  flattenWithoutListItems,
  mergeChildSegments,
  type Segment,
  wrapWithTags,
} from '../../src/segment.js';

describe('flatten()', () => {
  it('returns html for a static segment unchanged', () => {
    expect(flatten({ kind: 'static', html: '<p>x</p>' }, false)).toBe('<p>x</p>');
    expect(flatten({ kind: 'static', html: '<p>x</p>' }, true)).toBe('<p>x</p>');
  });

  it('inlines list items and emits a marker comment when withMarkers is true', () => {
    const list: Segment = {
      kind: 'list',
      id: '0',
      items: [
        { ref: { id: 'a' }, cacheKey: 'a', html: '<li>a</li>' },
        { ref: { id: 'b' }, cacheKey: 'b', html: '<li>b</li>' },
      ],
    };
    expect(flatten(list, false)).toBe('<li>a</li><li>b</li>');
    expect(flatten(list, true)).toBe('<!--kf-list:0--><li>a</li><li>b</li>');
  });

  it('walks mixed segments part by part', () => {
    const m: Segment = {
      kind: 'mixed',
      parts: [
        { kind: 'static', html: '<ul>' },
        { kind: 'list', id: '0', items: [{ ref: { id: 1 }, cacheKey: 1, html: '<li>x</li>' }] },
        { kind: 'static', html: '</ul>' },
      ],
    };
    expect(flatten(m, false)).toBe('<ul><li>x</li></ul>');
    expect(flatten(m, true)).toBe('<ul><!--kf-list:0--><li>x</li></ul>');
  });
});

describe('flattenWithoutListItems()', () => {
  it('replaces lists with marker-only output', () => {
    const m: Segment = {
      kind: 'mixed',
      parts: [
        { kind: 'static', html: '<ul>' },
        {
          kind: 'list',
          id: '7',
          items: [
            { ref: { id: 1 }, cacheKey: 1, html: '<li>x</li>' },
            { ref: { id: 2 }, cacheKey: 2, html: '<li>y</li>' },
          ],
        },
        { kind: 'static', html: '</ul>' },
      ],
    };
    expect(flattenWithoutListItems(m)).toBe('<ul><!--kf-list:7--></ul>');
  });

  it('passes static segments through verbatim', () => {
    expect(flattenWithoutListItems({ kind: 'static', html: '<x/>' })).toBe('<x/>');
  });

  it('reduces a bare list segment to its marker', () => {
    expect(flattenWithoutListItems({ kind: 'list', id: '3', items: [] }))
      .toBe('<!--kf-list:3-->');
  });
});

describe('collectLists()', () => {
  it('returns an empty map for a pure-static tree', () => {
    expect(collectLists({ kind: 'static', html: '<p/>' }).size).toBe(0);
  });

  it('returns the single list segment when given one', () => {
    const list: Segment = { kind: 'list', id: '5', items: [] };
    const out = collectLists(list);
    expect(out.size).toBe(1);
    expect(out.get('5')).toBe(list);
  });

  it('walks mixed trees and indexes every list by id', () => {
    const a: Segment = { kind: 'list', id: 'a', items: [] };
    const b: Segment = { kind: 'list', id: 'b', items: [] };
    const m: Segment = {
      kind: 'mixed',
      parts: [
        { kind: 'static', html: '<x>' },
        a,
        { kind: 'static', html: '</x><y>' },
        b,
        { kind: 'static', html: '</y>' },
      ],
    };
    const out = collectLists(m);
    expect(out.size).toBe(2);
    expect(out.get('a')).toBe(a);
    expect(out.get('b')).toBe(b);
  });
});

describe('mergeChildSegments()', () => {
  it('returns an empty static for an empty input', () => {
    const out = mergeChildSegments([]);
    expect(out).toEqual({ kind: 'static', html: '' });
  });

  it('returns a single static when all parts are static', () => {
    const out = mergeChildSegments([
      { kind: 'static', html: '<a>' },
      { kind: 'static', html: 'x' },
      { kind: 'static', html: '</a>' },
    ]);
    expect(out).toEqual({ kind: 'static', html: '<a>x</a>' });
  });

  it('coalesces adjacent statics around a non-static part', () => {
    const list: Segment = { kind: 'list', id: '0', items: [] };
    const out = mergeChildSegments([
      { kind: 'static', html: 'a' },
      { kind: 'static', html: 'b' },
      list,
      { kind: 'static', html: 'c' },
      { kind: 'static', html: 'd' },
    ]);
    expect(out).toEqual({
      kind: 'mixed',
      parts: [
        { kind: 'static', html: 'ab' },
        list,
        { kind: 'static', html: 'cd' },
      ],
    });
  });

  it('handles a non-static part at the very start (no leading static)', () => {
    const list: Segment = { kind: 'list', id: '0', items: [] };
    const out = mergeChildSegments([list, { kind: 'static', html: 'x' }]);
    expect(out).toEqual({
      kind: 'mixed',
      parts: [list, { kind: 'static', html: 'x' }],
    });
  });
});

describe('wrapWithTags()', () => {
  it('absorbs the tags into a static child', () => {
    const out = wrapWithTags({ kind: 'static', html: 'inner' }, '<a>', '</a>');
    expect(out).toEqual({ kind: 'static', html: '<a>inner</a>' });
  });

  it('prepends/appends tag statics around a list child', () => {
    const list: Segment = { kind: 'list', id: '0', items: [] };
    const out = wrapWithTags(list, '<ul>', '</ul>');
    expect(out).toEqual({
      kind: 'mixed',
      parts: [
        { kind: 'static', html: '<ul>' },
        list,
        { kind: 'static', html: '</ul>' },
      ],
    });
  });

  it('inlines parts of a mixed child between the wrapping tags', () => {
    const list: Segment = { kind: 'list', id: '0', items: [] };
    const inner: Segment = {
      kind: 'mixed',
      parts: [{ kind: 'static', html: 'a' }, list, { kind: 'static', html: 'b' }],
    };
    const out = wrapWithTags(inner, '<x>', '</x>');
    expect(out).toEqual({
      kind: 'mixed',
      parts: [
        { kind: 'static', html: '<x>' },
        { kind: 'static', html: 'a' },
        list,
        { kind: 'static', html: 'b' },
        { kind: 'static', html: '</x>' },
      ],
    });
  });
});
