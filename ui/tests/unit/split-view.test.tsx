import { raw } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import { SplitView } from '../../src/split-view.js';

const list = raw('<ul class="list">rows</ul>');
const detail = raw('<section class="detail">detail</section>');

describe('SplitView', () => {
  it('renders both panes side by side on roomy classes', () => {
    const html = String(SplitView({ id: 'sv', label: 'Mail', list, detail, detailTitle: 'Message' }));
    expect(html).toContain('data-component="split-view"');
    expect(html).toContain('data-split-mode="split"');
    expect(html).toContain('data-split-list');
    expect(html).toContain('data-split-detail');
    expect(html).toContain('aria-label="Message"');
    expect(html).not.toContain('kui-resizable-region');
  });

  it('wraps the list in a ResizableRegion when resizable is set', () => {
    const html = String(SplitView({ id: 'sv', label: 'Mail', list, detail, listTitle: 'Threads', resizable: { size: 300, min: 220, max: 480 } }));
    expect(html).toContain('data-component="resizable-region"');
    expect(html).toContain('aria-valuenow="300"');
    expect(html).toContain('aria-valuemin="220"');
    expect(html).toContain('data-split-list');
  });

  it('labels a resizable list region with a default when no listTitle is given', () => {
    const html = String(SplitView({ id: 'sv', label: 'Mail', list, detail, resizable: { size: 300, min: 220, max: 480 } }));
    expect(html).toContain('aria-label="List"');
  });

  it('collapses to a NavStack showing only the list when compact and no detail is active', () => {
    const html = String(SplitView({ id: 'sv', label: 'Mail', list, detail, compact: true, listTitle: 'Threads' }));
    expect(html).toContain('data-split-mode="compact"');
    expect(html).toContain('data-component="nav-stack"');
    expect(html).toContain('data-depth="1"');
    expect(html).not.toContain('data-nav-back');
  });

  it('pushes the detail over the list when compact and a detail is active', () => {
    const html = String(SplitView({ id: 'sv', label: 'Mail', list, detail, compact: true, detailActive: true, listTitle: 'Threads', detailTitle: 'Message', backLabel: 'Threads' }));
    expect(html).toContain('data-depth="2"');
    expect(html).toContain('data-nav-back');
    expect(html).toContain('aria-label="Threads"');
    expect(html).toContain('kui-nav-stack__title" data-component="toolbar-text" data-size="large">Message</span>');
  });

  it('applies a custom className', () => {
    expect(String(SplitView({ id: 'sv', label: 'Mail', list, detail, className: 'tall' }))).toContain('kui-split-view tall');
  });
});
