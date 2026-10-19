import { effect } from 'kerfjs';
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
  document.documentElement.style.removeProperty(
    '--demo-list-view-transition-clip',
  );
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

  it('restores a scrolling ancestor after a row update changes its position', () => {
    const pane = document.createElement('div');
    const specimen = document.createElement('div');
    specimen.dataset.demoViewTransitions = '';
    pane.append(specimen);
    document.body.append(pane);
    Object.defineProperties(pane, {
      scrollHeight: { configurable: true, value: 500 },
      clientHeight: { configurable: true, value: 100 },
    });
    const stop = effect(() => {
      if (viewTransitionListRows.value) pane.scrollTop = 52;
    });
    pane.scrollTop = 187;
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: undefined,
    });
    try {
      changeViewTransitionList('reorder');
      expect(pane.scrollTop).toBe(187);
    } finally {
      stop();
      pane.remove();
    }
  });

  it('clips document snapshots to the visible specimen and clears the clip', async () => {
    const pane = document.createElement('div');
    const specimen = document.createElement('div');
    specimen.dataset.demoViewTransitions = '';
    pane.append(specimen);
    document.body.append(pane);
    Object.defineProperties(pane, {
      scrollHeight: { configurable: true, value: 500 },
      clientHeight: { configurable: true, value: 100 },
    });
    vi.spyOn(pane, 'getBoundingClientRect').mockReturnValue({
      top: 20,
      right: 180,
      bottom: 120,
      left: 10,
    } as DOMRect);
    vi.spyOn(specimen, 'getBoundingClientRect').mockReturnValue({
      top: 30,
      right: 200,
      bottom: 180,
      left: 20,
    } as DOMRect);
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: vi.fn((update: () => void) => {
        update();
        return { finished } as ViewTransition;
      }),
    });
    try {
      changeViewTransitionList('reorder');
      expect(
        document.documentElement.style.getPropertyValue(
          '--demo-list-view-transition-clip',
        ),
      ).toBe(
        `inset(30px ${window.innerWidth - 180}px ${window.innerHeight - 120}px 20px)`,
      );
      finish();
      await finished;
      await Promise.resolve();
      expect(
        document.documentElement.style.getPropertyValue(
          '--demo-list-view-transition-clip',
        ),
      ).toBe('');
    } finally {
      pane.remove();
    }
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
