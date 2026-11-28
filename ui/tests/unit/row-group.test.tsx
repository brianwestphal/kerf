import { describe, expect, it, vi } from 'vitest';

import { Row } from '../../src/components/layout/row/row.js';
import { wireRowControlAlignment } from '../../src/components/layout/row/wiring/wire-row-control-alignment.js';

// KF-7V2VGS: a Row of related controls can name itself as a group.
describe('Row ariaLabel', () => {
  it('names the row as a group only when labeled', () => {
    const labeled = String(
      Row({
        ariaLabel: 'Filter Suggestions',
        rootAttributes: { 'data-search-field-keep-open': '' },
      }),
    );
    expect(labeled).toContain('role="group"');
    expect(labeled).toContain('aria-label="Filter Suggestions"');
    expect(labeled).toContain('data-search-field-keep-open=""');
    expect(String(Row({}))).not.toContain('role=');
  });
});

it('aligns each line independently and releases offsets and observers', async () => {
  const host = document.createElement('div');
  host.innerHTML = String(Row({ vAlign: 'control', wrap: true }));
  const row = host.firstElementChild as HTMLElement;
  row.innerHTML =
    '<div><span data-row-control></span></div><button>Remove</button><button>Next</button><svg></svg><span hidden></span>';
  document.body.append(host);
  const [field, action, next] = Array.from(row.children) as HTMLElement[];
  const box = field.querySelector('span')!;
  const offset = '--_kui-row-control-offset';
  const rect = (top: number, height: number) => new DOMRect(0, top, 60, height);
  const measure = (element: HTMLElement, naturalTop: number) =>
    naturalTop +
    (Number.parseFloat(element.style.getPropertyValue(offset)) || 0);
  const observed = new Set<Element>();
  let resized: () => void = () => {};
  let label = 20;
  let secondLine = 100;
  const observer = {
    observe: (element: Element) => observed.add(element),
    unobserve: (element: Element) => observed.delete(element),
    disconnect: () => observed.clear(),
  };
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resized = callback;
        Object.assign(this, observer);
      }
    },
  );
  vi.spyOn(field, 'getBoundingClientRect').mockImplementation(() =>
    rect(measure(field, 0), 80),
  );
  vi.spyOn(box, 'getBoundingClientRect').mockImplementation(() =>
    rect(measure(field, 0) + label, 44),
  );
  vi.spyOn(action, 'getBoundingClientRect').mockImplementation(() =>
    rect(measure(action, 0), 44),
  );
  vi.spyOn(next, 'getBoundingClientRect').mockImplementation(() =>
    rect(measure(next, secondLine), 44),
  );
  const dispose = wireRowControlAlignment(host);
  try {
    expect(row.dataset.vAlign).toBe('control');
    expect(action.style.getPropertyValue(offset)).toBe('20px');
    expect(next.style.getPropertyValue(offset)).toBe('');
    expect(observed.has(box)).toBe(true);
    action.style.removeProperty(offset);
    await vi.waitFor(() =>
      expect(action.style.getPropertyValue(offset)).toBe('20px'),
    );
    label = 32;
    secondLine = 0;
    resized();
    resized();
    await vi.waitFor(() =>
      expect(next.style.getPropertyValue(offset)).toBe('32px'),
    );
    action.remove();
    await vi.waitFor(() => expect(observed.has(action)).toBe(false));
    expect(action.style.getPropertyValue(offset)).toBe('');
    resized();
  } finally {
    dispose();
    try {
      expect(next.style.getPropertyValue(offset)).toBe('');
      expect(observed.size).toBe(0);
      const disposeDirect = wireRowControlAlignment(row);
      try {
        expect(next.style.getPropertyValue(offset)).toBe('32px');
      } finally {
        disposeDirect();
      }
      expect(next.hasAttribute('data-row-control-shifted')).toBe(false);
    } finally {
      host.remove();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  }
});
