import { describe, expect, it } from 'vitest';

import {
  applySelection,
  isApplePlatform,
  type SelectionGesture,
  selectionGesture,
} from '../../src/selection.js';

const items = ['a', 'b', 'c', 'd', 'e'];
const none = { shiftKey: false, metaKey: false, ctrlKey: false };

describe('selectionGesture', () => {
  it('normalizes the toggle modifier for the host platform', () => {
    expect(selectionGesture(none, true)).toBe('replace');
    expect(selectionGesture({ ...none, metaKey: true }, true)).toBe('toggle');
    expect(selectionGesture({ ...none, ctrlKey: true }, true)).toBe('replace');
    expect(selectionGesture({ ...none, ctrlKey: true }, false)).toBe('toggle');
    expect(selectionGesture({ ...none, metaKey: true }, false)).toBe('replace');
    // Shift wins over the toggle key on every platform.
    expect(
      selectionGesture({ shiftKey: true, metaKey: true, ctrlKey: true }, true),
    ).toBe('extend');
  });

  it('detects Apple platforms from platform, client hints, or the user agent', () => {
    expect(isApplePlatform(undefined)).toBe(false);
    expect(isApplePlatform({ platform: 'MacIntel', userAgent: '' })).toBe(true);
    expect(isApplePlatform({ platform: 'Win32', userAgent: '' })).toBe(false);
    expect(
      isApplePlatform({ platform: '', userAgent: 'Mozilla (iPhone; …)' }),
    ).toBe(true);
    expect(
      isApplePlatform({
        platform: 'Linux',
        userAgent: '',
        userAgentData: { platform: 'macOS' },
      } as unknown as Navigator),
    ).toBe(true);
    // The default reads the ambient navigator.
    expect(typeof isApplePlatform()).toBe('boolean');
  });
});

describe('applySelection', () => {
  const step = (
    state: { selected: string[]; anchor?: string },
    target: string,
    gesture: SelectionGesture,
  ) => applySelection({ items, ...state, target, gesture });

  it('replaces, toggles, and extends from the anchor', () => {
    expect(step({ selected: ['a', 'c'] }, 'b', 'replace')).toEqual({
      selected: ['b'],
      anchor: 'b',
    });
    expect(step({ selected: ['c', 'a'], anchor: 'a' }, 'd', 'toggle')).toEqual({
      selected: ['a', 'c', 'd'],
      anchor: 'd',
    });
    expect(step({ selected: ['a', 'd'], anchor: 'd' }, 'd', 'toggle')).toEqual({
      selected: ['a'],
      anchor: 'd',
    });
    expect(step({ selected: ['b'], anchor: 'b' }, 'd', 'extend')).toEqual({
      selected: ['b', 'c', 'd'],
      anchor: 'b',
    });
    // Extending backward selects the same inclusive range in display order.
    expect(step({ selected: ['d'], anchor: 'd' }, 'b', 'extend')).toEqual({
      selected: ['b', 'c', 'd'],
      anchor: 'd',
    });
  });

  it('extends from the first selected item, then the target, without a usable anchor', () => {
    expect(step({ selected: ['d', 'b'] }, 'e', 'extend')).toEqual({
      selected: ['b', 'c', 'd', 'e'],
      anchor: 'b',
    });
    expect(step({ selected: ['b'], anchor: 'z' }, 'd', 'extend')).toEqual({
      selected: ['b', 'c', 'd'],
      anchor: 'b',
    });
    expect(step({ selected: [] }, 'c', 'extend')).toEqual({
      selected: ['c'],
      anchor: 'c',
    });
    expect(step({ selected: ['z'], anchor: 'z' }, 'b', 'extend')).toEqual({
      selected: ['b'],
      anchor: 'b',
    });
  });

  it('ignores an unselectable target and drops unknown ids', () => {
    expect(step({ selected: ['b', 'z'], anchor: 'b' }, 'x', 'toggle')).toEqual({
      selected: ['b'],
      anchor: 'b',
    });
    expect(step({ selected: [] }, 'x', 'replace')).toEqual({
      selected: [],
      anchor: 'x',
    });
  });

  it('walks a realistic sequence across every gesture', () => {
    let state: { selected: string[]; anchor?: string } = { selected: [] };
    const run = (target: string, gesture: SelectionGesture) => {
      state = step(state, target, gesture);
      return state.selected;
    };
    expect(run('b', 'replace')).toEqual(['b']);
    expect(run('d', 'extend')).toEqual(['b', 'c', 'd']);
    // A second Shift pivots around the same anchor and shrinks the range.
    expect(run('c', 'extend')).toEqual(['b', 'c']);
    expect(run('e', 'toggle')).toEqual(['b', 'c', 'e']);
    // The toggle moved the anchor, so the next range starts at e.
    expect(run('d', 'extend')).toEqual(['d', 'e']);
    expect(run('d', 'toggle')).toEqual(['e']);
    expect(run('e', 'toggle')).toEqual([]);
    expect(run('a', 'extend')).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(run('c', 'replace')).toEqual(['c']);
  });
});
