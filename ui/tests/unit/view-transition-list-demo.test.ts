import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  changeViewTransitionList,
  nextViewTransitionListRows,
  viewTransitionListRows,
} from '../../ux-demo/demos/view-transition-list-state.js';

const initial = [
  { id: 'a' as const, label: 'Alpha' },
  { id: 'b' as const, label: 'Beta' },
  { id: 'c' as const, label: 'Gamma' },
];
const startDescriptor = Object.getOwnPropertyDescriptor(
  document,
  'startViewTransition',
);

afterEach(() => {
  viewTransitionListRows.value = initial;
  document.documentElement.classList.remove('demo-reduced-motion');
  if (startDescriptor)
    Object.defineProperty(document, 'startViewTransition', startDescriptor);
  else Reflect.deleteProperty(document, 'startViewTransition');
  vi.restoreAllMocks();
});

describe('List View Transitions demo actions', () => {
  it('keeps IDs stable through reorder, insert, remove, and reset', () => {
    const reversed = nextViewTransitionListRows(initial, 'reorder');
    expect(reversed.map((row) => row.id)).toEqual(['c', 'b', 'a']);
    const inserted = nextViewTransitionListRows(reversed, 'insert');
    expect(inserted.map((row) => row.id)).toEqual(['c', 'd', 'b', 'a']);
    expect(nextViewTransitionListRows(inserted, 'insert')).toBe(inserted);
    expect(
      nextViewTransitionListRows(inserted, 'remove').map((row) => row.id),
    ).toEqual(['c', 'd', 'b']);
    expect(nextViewTransitionListRows([], 'remove')).toEqual([]);
    expect(nextViewTransitionListRows([], 'reset')).toEqual(initial);
  });

  it('updates directly when the API is missing or the catalog reduces motion', () => {
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: undefined,
    });
    changeViewTransitionList('reorder');
    expect(viewTransitionListRows.value.map((row) => row.id)).toEqual([
      'c',
      'b',
      'a',
    ]);
    const start = vi.fn();
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: start,
    });
    document.documentElement.classList.add('demo-reduced-motion');
    changeViewTransitionList('reset');
    expect(viewTransitionListRows.value.map((row) => row.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(start).not.toHaveBeenCalled();
  });

  it('queues rapid edits during snapshot capture and applies them in order', async () => {
    let capture: (() => void) | undefined;
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const start = vi.fn((callback: () => void) => {
      capture = callback;
      return { finished } as ViewTransition;
    });
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: start,
    });
    changeViewTransitionList('reorder');
    changeViewTransitionList('insert');
    expect(start).toHaveBeenCalledTimes(1);
    expect(viewTransitionListRows.value.map((row) => row.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    capture!();
    expect(viewTransitionListRows.value.map((row) => row.id)).toEqual([
      'c',
      'd',
      'b',
      'a',
    ]);
    changeViewTransitionList('remove');
    expect(viewTransitionListRows.value.map((row) => row.id)).toEqual([
      'c',
      'd',
      'b',
    ]);
    finish();
    await finished;
  });
});
