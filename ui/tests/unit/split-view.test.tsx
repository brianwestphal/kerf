import { raw } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import { SplitView } from '../../src/components/layout/split-view/split-view.js';

const list = raw('<ul class="list">rows</ul>');
const detail = raw('<section class="detail">detail</section>');

describe('SplitView', () => {
  it('renders both panes side by side on roomy classes', () => {
    const html = String(
      SplitView({
        id: 'sv',
        label: 'Mail',
        list,
        detail,
        detailTitle: 'Message',
      }),
    );
    expect(html).toContain('data-component="split-view"');
    expect(html).toContain('data-split-mode="split"');
    expect(html).toContain('data-split-list');
    expect(html).toContain('data-resizable="false"');
    expect(html).toContain('data-split-detail');
    expect(html).toContain('aria-label="Message"');
    expect(html).not.toContain('kui-resizable-region');
  });

  it('wraps the list in a ResizableRegion when resizable is set', () => {
    const html = String(
      SplitView({
        id: 'sv',
        label: 'Mail',
        list,
        detail,
        listTitle: 'Threads',
        resizable: { size: 300, min: 220, max: 480 },
      }),
    );
    expect(html).toContain('data-component="resizable-region"');
    expect(html).toContain('aria-valuenow="300"');
    expect(html).toContain('aria-valuemin="220"');
    expect(html).toContain('data-split-list');
    expect(html).toContain('data-resizable="true"');
  });

  it('labels a resizable list region with a default when no listTitle is given', () => {
    const html = String(
      SplitView({
        id: 'sv',
        label: 'Mail',
        list,
        detail,
        resizable: { size: 300, min: 220, max: 480 },
      }),
    );
    expect(html).toContain('aria-label="List"');
  });

  it('collapses to a NavStack showing only the list when compact and no detail is active', () => {
    const html = String(
      SplitView({
        id: 'sv',
        label: 'Mail',
        list,
        detail,
        compact: true,
        listTitle: 'Threads',
      }),
    );
    expect(html).toContain('data-split-mode="compact"');
    expect(html).toContain('data-component="nav-stack"');
    expect(html).toContain('data-depth="1"');
    expect(html).not.toContain('data-nav-back');
  });

  it('pushes the detail over the list when compact and a detail is active', () => {
    const html = String(
      SplitView({
        id: 'sv',
        label: 'Mail',
        list,
        detail,
        compact: true,
        detailActive: true,
        listTitle: 'Threads',
        detailTitle: 'Message',
        backLabel: 'Threads',
      }),
    );
    expect(html).toContain('data-depth="2"');
    expect(html).toContain('data-nav-back');
    expect(html).toContain('aria-label="Threads"');
    expect(html).toContain(
      '<span class="kui-toolbar-text" data-component="toolbar-text" data-size="large" data-fill="true"><span class="kui-toolbar-text__text">Message</span></span>',
    );
  });

  it('keeps the ResizableRegion defaults when no region options are given', () => {
    const host = document.createElement('div');
    host.innerHTML = String(
      SplitView({
        id: 'sv',
        label: 'Mail',
        list,
        detail,
        resizable: { size: 300, min: 220, max: 480 },
      }),
    );
    const region = host.querySelector<HTMLElement>(
      '[data-component="resizable-region"]',
    )!;
    expect(region.dataset).toMatchObject({
      separator: 'auto',
      contentOverflow: 'clip',
      collapseMotion: 'slide',
      collapsed: 'false',
      transitioning: 'false',
    });
    expect(host.querySelector('.kui-resizable-region__restore')).toBeNull();
  });

  it('forwards the ResizableRegion configuration to the list region', () => {
    const host = document.createElement('div');
    host.innerHTML = String(
      SplitView({
        id: 'sv',
        label: 'Mail',
        list,
        detail,
        listTitle: 'Threads',
        resizable: {
          size: 300,
          min: 220,
          max: 480,
          separator: 'hidden',
          handleIcon: raw('<span class="grip"></span>'),
          contentOverflow: 'visible',
          collapsed: true,
          transitioning: true,
          collapseMotion: 'fade-slide',
          restoreControl: raw('<button class="restore">Show</button>'),
          restorePosition: 'bottom-end',
        },
      }),
    );
    const region = host.querySelector<HTMLElement>(
      '[data-component="resizable-region"]',
    )!;
    expect(region.dataset).toMatchObject({
      separator: 'hidden',
      contentOverflow: 'visible',
      collapseMotion: 'fade-slide',
      collapsed: 'true',
      transitioning: 'true',
    });
    expect(region.querySelector('.grip')).not.toBeNull();
    const restore = host.querySelector<HTMLElement>(
      '.kui-resizable-region__restore',
    )!;
    expect(restore.dataset.position).toBe('bottom-end');
    expect(restore.querySelector('.restore')).not.toBeNull();
  });

  it('forwards the compact NavStack configuration and per-view toolbars', () => {
    const host = document.createElement('div');
    host.innerHTML = String(
      SplitView({
        id: 'sv',
        label: 'Mail',
        list,
        detail,
        compact: true,
        detailActive: true,
        listTitle: 'Threads',
        detailTitle: 'Message',
        compactStack: {
          backIcon: raw('<svg class="back-glyph"></svg>'),
          backText: 'Threads',
          toolbarConfig: { dividerSides: 'b', headingLevel: 2 },
          bottomToolbar: {
            label: 'Fallback',
            leading: raw('<nav class="fallback">fallback</nav>'),
          },
          list: {
            toolbar: {
              trailing: raw('<div class="list-actions">compose</div>'),
            },
          },
          detail: {
            toolbar: {
              leading: raw('<div class="detail-lead">lead</div>'),
              center: raw('<div class="detail-center">center</div>'),
              trailing: raw('<div class="detail-actions">reply</div>'),
            },
            bottomToolbar: {
              label: 'Detail tools',
              leading: raw('<nav class="detail-bottom">move</nav>'),
            },
          },
        },
      }),
    );
    const toolbar = host.querySelector<HTMLElement>(
      '[data-nav-stack-chrome] > [data-component="toolbar"]',
    )!;
    expect(toolbar.getAttribute('divider-sides')).toBe('b');
    expect(
      toolbar
        .querySelector('.kui-toolbar-text[data-fill="true"]')!
        .getAttribute('aria-level'),
    ).toBe('2');
    const back = toolbar.querySelector<HTMLElement>('[data-nav-back]')!;
    expect(back.querySelector('.back-glyph')).not.toBeNull();
    expect(back.textContent).toBe('Threads');
    // The active (detail) view's groups fill the toolbar and bottom chrome.
    expect(
      toolbar.querySelector('.kui-toolbar__leading .detail-lead'),
    ).not.toBeNull();
    expect(
      toolbar.querySelector('.kui-toolbar__center .detail-center'),
    ).not.toBeNull();
    expect(
      toolbar.querySelector('.kui-toolbar__trailing .detail-actions'),
    ).not.toBeNull();
    expect(host.querySelector('.list-actions')).toBeNull();
    expect(
      host.querySelector('[data-nav-stack-bottom] .detail-bottom'),
    ).not.toBeNull();
    expect(host.querySelector('.fallback')).toBeNull();
  });

  it('shows the list view toolbars and the persistent bottom fallback at the root', () => {
    const host = document.createElement('div');
    host.innerHTML = String(
      SplitView({
        id: 'sv',
        label: 'Mail',
        list,
        detail,
        compact: true,
        listTitle: 'Threads',
        compactStack: {
          hideToolbar: false,
          bottomToolbar: {
            label: 'Fallback',
            leading: raw('<nav class="fallback">fallback</nav>'),
          },
          list: {
            toolbar: {
              trailing: raw('<div class="list-actions">compose</div>'),
            },
          },
          detail: {
            toolbar: {
              trailing: raw('<div class="detail-actions">reply</div>'),
            },
          },
        },
      }),
    );
    expect(
      host.querySelector('.kui-toolbar__trailing .list-actions'),
    ).not.toBeNull();
    expect(host.querySelector('.detail-actions')).toBeNull();
    expect(
      host.querySelector('[data-nav-stack-bottom] .fallback'),
    ).not.toBeNull();
  });

  it('can hide the compact toolbar', () => {
    const html = String(
      SplitView({
        id: 'sv',
        label: 'Mail',
        list,
        detail,
        compact: true,
        compactStack: { hideToolbar: true },
      }),
    );
    expect(html).not.toContain('data-nav-stack-chrome');
  });

  it('applies a custom className', () => {
    expect(
      String(
        SplitView({ id: 'sv', label: 'Mail', list, detail, className: 'tall' }),
      ),
    ).toContain('kui-split-view tall');
  });
});
