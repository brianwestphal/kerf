import { expect, it, vi } from 'vitest';

import { createComboboxOwner } from '../../docs/examples/scoped-combobox.js';

it.each([1, 50])(
  'wires %i registrations once, releases on the last field, and can start again',
  (count) => {
    const host = document.createElement('div');
    const add = vi.spyOn(host, 'addEventListener');
    const remove = vi.spyOn(host, 'removeEventListener');
    const observe = vi.spyOn(MutationObserver.prototype, 'observe');
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    try {
      const owner = createComboboxOwner();
      owner.connect(host);
      expect(add).not.toHaveBeenCalled();
      const field = (id: string) => owner.field({ id, onCommit() {} });
      const registrations = Array.from({ length: count }, (_, i) =>
        field(String(i)),
      );
      expect(add.mock.calls.map(([event]) => event)).toEqual([
        'input',
        'focusin',
        'keydown',
        'pointerdown',
        'focusout',
      ]);
      expect(observe).toHaveBeenCalledTimes(1);
      expect(() => field('0')).toThrow('Duplicate');
      const last = registrations.pop()!;
      for (const handle of registrations) handle.dispose();
      expect(disconnect).not.toHaveBeenCalled();
      last.dispose();
      last.dispose();
      expect(remove.mock.calls).toEqual(add.mock.calls);
      expect(disconnect).toHaveBeenCalledTimes(1);
      const replacement = field(String(count - 1));
      last.dispose();
      expect(() => last.render({ label: 'Old', suggestions: [] })).toThrow(
        'disposed',
      );
      expect(
        String(replacement.render({ label: 'New', suggestions: [] })),
      ).toContain('New');
      expect(observe).toHaveBeenCalledTimes(2);
      owner.dispose();
      owner.dispose();
      expect(disconnect).toHaveBeenCalledTimes(2);
      expect(remove.mock.calls).toEqual(add.mock.calls);
      expect(() => field('new')).toThrow('disposed');
    } finally {
      vi.restoreAllMocks();
    }
  },
);

it('rejects overlapping hosts in either order and allows reuse after disposal', () => {
  const outer = document.createElement('div');
  const inner = outer.appendChild(document.createElement('div'));
  const a = createComboboxOwner();
  const b = createComboboxOwner();
  a.connect(inner);
  expect(() => a.connect(inner)).toThrow('Overlapping');
  expect(() => b.connect(outer)).toThrow('Overlapping');
  a.dispose();
  b.connect(outer);
  expect(() => createComboboxOwner().connect(inner)).toThrow('Overlapping');
  b.dispose();
});
