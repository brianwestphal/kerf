import { raw } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import {
  CollapsiblePanel,
  CollapsiblePanelRelocated,
  type CollapsiblePanelToolbar,
} from '../../src/collapsible-panel.js';

const group = (name: string) =>
  raw(
    `<div data-component="toolbar-control-group" data-group="${name}"><button type="button">${name}</button></div>`,
  );

const toolbar: CollapsiblePanelToolbar = {
  label: 'Navigator',
  title: raw('<h2 data-component="toolbar-text">Navigator</h2>'),
  panelOnly: group('only'),
  constant: group('constant'),
  toggle: { action: 'toggle-nav', name: 'navigator' },
};

const html = (value: unknown) => {
  const host = document.createElement('div');
  host.innerHTML = String(value);
  return host;
};

describe('CollapsiblePanel toolbar', () => {
  it('composes the panel toolbar with the roles in order and keeps content in a Pane', () => {
    const host = html(
      CollapsiblePanel({
        id: 'nav',
        side: 'left',
        toolbar,
        footer: raw('<p data-footer>footer</p>'),
        children: raw('<p data-content>files</p>'),
      }),
    );
    const bar = host.querySelector('.kui-pane__header .kui-toolbar')!;
    expect(
      [...bar.querySelectorAll('.kui-toolbar__leading [data-group]')].map(
        (node) => node.getAttribute('data-group'),
      ),
    ).toEqual(['only']);
    const trailing = bar.querySelector('.kui-toolbar__trailing')!;
    expect(
      trailing.querySelector('[data-group]')!.getAttribute('data-group'),
    ).toBe('constant');
    const toggle = trailing.querySelector<HTMLButtonElement>(
      '[data-action="toggle-nav"]',
    )!;
    expect(toggle.getAttribute('aria-label')).toBe('Hide navigator');
    expect(toggle.getAttribute('data-collapsible-target')).toBe('nav');
    expect(toggle.getAttribute('data-key')).toBe('nav-toggle');
    expect(toggle.querySelector('svg')!.getAttribute('data-lucide')).toBe(
      'panel-left-close',
    );
    expect(
      host.querySelector('.kui-pane__content [data-content]'),
    ).not.toBeNull();
    expect(
      host.querySelector('.kui-pane__footer [data-footer]'),
    ).not.toBeNull();
  });

  it('renders content as given without a toolbar', () => {
    const host = html(
      CollapsiblePanel({
        id: 'nav',
        side: 'left',
        children: raw('<p data-content>files</p>'),
      }),
    );
    expect(
      host.querySelector('.kui-collapsible-panel__content > [data-content]'),
    ).not.toBeNull();
  });

  it('relocates constant groups and the toggle only while collapsed', () => {
    expect(
      String(
        CollapsiblePanelRelocated({
          panelId: 'nav',
          side: 'left',
          collapsed: false,
          toolbar,
        }),
      ).trim(),
    ).toBe('');
    const host = html(
      CollapsiblePanelRelocated({
        panelId: 'nav',
        side: 'right',
        collapsed: true,
        toolbar,
      }),
    );
    expect(host.querySelector('[data-group="constant"]')).not.toBeNull();
    expect(host.querySelector('[data-group="only"]')).toBeNull();
    const toggle = host.querySelector('[data-action="toggle-nav"]')!;
    expect(toggle.getAttribute('aria-label')).toBe('Show navigator');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.querySelector('svg')!.getAttribute('data-lucide')).toBe(
      'panel-right-open',
    );
  });

  it('forwards toolbar configuration and toggle labels to its Toolbar', () => {
    const host = html(
      CollapsiblePanel({
        id: 'nav',
        side: 'left',
        toolbar: {
          ...toolbar,
          dividerSides: '',
          responsive: 'wrap',
          center: group('center'),
          toggle: { ...toolbar.toggle!, hideLabel: 'Close navigator' },
        },
        children: raw('<p data-content>files</p>'),
      }),
    );
    const bar = host.querySelector('.kui-pane__header .kui-toolbar')!;
    expect(bar.getAttribute('divider-sides')).toBeNull();
    expect(bar.getAttribute('data-responsive')).toBe('wrap');
    expect(
      bar.querySelector('.kui-toolbar__center [data-group="center"]'),
    ).not.toBeNull();
    expect(
      bar
        .querySelector('[data-collapsible-target="nav"]')!
        .getAttribute('aria-label'),
    ).toBe('Close navigator');
  });

  it('forwards pane configuration to its Pane, keeping the defaults when omitted or undefined', () => {
    const configured = html(
      CollapsiblePanel({
        id: 'nav',
        side: 'left',
        toolbar,
        pane: {
          contentElement: 'nav',
          contentLabel: 'Sections',
          separators: ['block-end'],
          safeAreaEdges: [],
        },
        children: raw('<p data-content>files</p>'),
      }),
    );
    const pane = configured.querySelector('[data-component="pane"]')!;
    const content = pane.querySelector(':scope > .kui-pane__content')!;
    expect(content.tagName).toBe('NAV');
    expect(content.getAttribute('aria-label')).toBe('Sections');
    expect(pane.getAttribute('data-separator-block-end')).toBe('true');
    expect(pane.getAttribute('data-safe-area-inline-start')).toBe('false');

    const props = {
      id: 'nav',
      side: 'left' as const,
      toolbar,
      children: raw('<p data-content>files</p>'),
    };
    const plain = html(CollapsiblePanel(props));
    expect(
      html(
        CollapsiblePanel({
          ...props,
          pane: { contentElement: undefined, safeAreaEdges: undefined },
        }),
      ).innerHTML,
    ).toBe(plain.innerHTML);
    expect(
      plain.querySelector('[data-component="pane"] > .kui-pane__content')!
        .tagName,
    ).toBe('DIV');

    // Without a toolbar there is no Pane, so the configuration is ignored.
    const bare = html(
      CollapsiblePanel({
        id: 'nav',
        side: 'left',
        pane: { contentElement: 'nav' },
        children: raw('<p data-content>files</p>'),
      }),
    );
    expect(bare.querySelector('[data-component="pane"]')).toBeNull();
  });
});
