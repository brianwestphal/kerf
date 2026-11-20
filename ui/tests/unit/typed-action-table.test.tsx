import { expect, it } from 'vitest';

import { mountCounter } from '../../docs/examples/typed-action-table.js';

it('routes the UI and native actions through their owning root until disposal', () => {
  const left = document.createElement('div');
  const right = document.createElement('div');
  const disposeLeft = mountCounter(left);
  const disposeRight = mountCounter(right);
  const press = (root: HTMLElement, name: string) =>
    root.querySelector<HTMLElement>(`[data-action="${name}"]`)!.click();
  try {
    press(left, 'increment');
    expect(left.querySelector('output')?.textContent).toBe('1');
    expect(right.querySelector('output')?.textContent).toBe('0');
    press(left, 'reset');
    expect(left.querySelector('output')?.textContent).toBe('0');
    disposeLeft();
    press(right, 'increment');
    expect(right.querySelector('output')?.textContent).toBe('1');
  } finally {
    disposeLeft();
    disposeRight();
  }
});
