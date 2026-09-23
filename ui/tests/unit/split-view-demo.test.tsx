import { describe, expect, it } from 'vitest';

import {
  clearSplitViewSelection,
  resetSplitViewDemo,
  selectSplitViewMessage,
  SplitViewDemo,
} from '../../ux-demo/demos/split-view.js';

describe('SplitViewDemo', () => {
  it('moves from the compact list to a selected detail and back', () => {
    resetSplitViewDemo();
    let html = String(SplitViewDemo());
    expect(html).toContain('id="catalog-split-view-compact-stack"');
    expect(html).toContain('data-depth="1"');
    expect(html).not.toContain('Back to inbox');

    selectSplitViewMessage('design-review');
    html = String(SplitViewDemo());
    expect(html).toContain('data-depth="2"');
    expect(html).toContain('Back to inbox');
    expect(html).toContain('Today’s review notes');

    clearSplitViewSelection();
    expect(String(SplitViewDemo())).toContain('data-depth="1"');
  });

  it('ignores an unknown message id', () => {
    resetSplitViewDemo();
    selectSplitViewMessage('missing');
    expect(String(SplitViewDemo())).toContain('data-depth="1"');
  });
});
