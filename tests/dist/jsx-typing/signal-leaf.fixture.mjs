import { expect, test } from 'vitest';

import { renderLabel as bound } from './bound';
import { renderLabel as coarse } from './signal-leaf';

test('the applied ESLint suggestions preserve the visible text and title across writes', () => {
  for (const [render, expectedRenders] of [
    [coarse, 3],
    [bound, 1],
  ]) {
    const root = document.createElement('div');
    const view = render(root);
    try {
      for (const label of ['first', 'A & <B>', '']) {
        view.label.value = label;
        const span = root.querySelector('span');
        expect(span.textContent).toBe(label);
        expect(span.getAttribute('title')).toBe(label);
      }
      expect(view.renders()).toBe(expectedRenders);
    } finally {
      view.dispose();
    }
  }
});
