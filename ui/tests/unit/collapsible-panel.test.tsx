import { raw } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import {
  CollapsiblePanel,
  CollapsiblePanelToggle,
  collapsiblePanelToggleIcon,
} from '../../src/collapsible-panel.js';

const html = (value: unknown) => String(value);

describe('CollapsiblePanel', () => {
  it('renders a docked panel with side, collapsed, label, and a sliding content wrapper', () => {
    const open = html(
      CollapsiblePanel({
        id: 'nav',
        side: 'left',
        label: 'Navigator',
        size: 320,
        children: raw('<p>items</p>'),
      }),
    );
    expect(open).toContain('data-component="collapsible-panel"');
    expect(open).toContain('kui-collapsible-panel--left');
    expect(open).toContain('data-collapsible-panel="nav"');
    expect(open).toContain('data-side="left"');
    expect(open).toContain('data-collapsed="false"');
    expect(open).toContain('aria-label="Navigator"');
    expect(open).toContain('--kui-collapsible-panel-width: 320px');
    expect(open).toContain('class="kui-collapsible-panel__content"');
    expect(open).not.toContain('aria-hidden');

    const collapsed = html(
      CollapsiblePanel({
        id: 'nav',
        side: 'left',
        collapsed: true,
        children: raw('<p>items</p>'),
      }),
    );
    expect(collapsed).toContain('data-collapsed="true"');
    expect(collapsed).toContain('aria-hidden="true"');
  });

  it('uses the height custom property for a bottom drawer', () => {
    const drawer = html(
      CollapsiblePanel({
        id: 'console',
        side: 'bottom',
        size: 240,
        children: raw('<x/>'),
      }),
    );
    expect(drawer).toContain('kui-collapsible-panel--bottom');
    expect(drawer).toContain('--kui-collapsible-panel-height: 240px');
  });

  it('projects panel policies and renders a collapsed safe-area restore control', () => {
    const drawer = html(
      CollapsiblePanel({
        id: 'console',
        side: 'bottom',
        collapsed: true,
        separator: 'hidden',
        collapseMotion: 'fade-slide',
        contentOverflow: 'visible',
        presentation: 'overlay',
        restoreControl: raw('<button>Show console</button>'),
        children: raw('<x/>'),
      }),
    );
    expect(drawer).toContain('data-separator="hidden"');
    expect(drawer).toContain('data-collapse-motion="fade-slide"');
    expect(drawer).toContain('data-content-overflow="visible"');
    expect(drawer).toContain('data-presentation="overlay"');
    expect(drawer).toContain(
      'class="kui-collapsible-panel__restore" data-panel-restore="console" data-position="bottom-end"',
    );
    const replacement = html(
      CollapsiblePanel({
        id: 'nav',
        side: 'left',
        collapsed: true,
        presentation: 'hidden',
        restoreControl: raw('<button>Suppressed</button>'),
        restorePosition: 'bottom-end',
      }),
    );
    expect(replacement).toContain('data-presentation="hidden"');
    expect(replacement).toContain('aria-hidden="true"');
    expect(replacement).not.toContain('Suppressed');
  });

  it('picks the standard per-side collapse/expand glyph', () => {
    expect(collapsiblePanelToggleIcon('left', false).name).toBe(
      'panel-left-close',
    );
    expect(collapsiblePanelToggleIcon('left', true).name).toBe(
      'panel-left-open',
    );
    expect(collapsiblePanelToggleIcon('right', false).name).toBe(
      'panel-right-close',
    );
    expect(collapsiblePanelToggleIcon('right', true).name).toBe(
      'panel-right-open',
    );
    expect(collapsiblePanelToggleIcon('bottom', false).name).toBe(
      'panel-bottom-close',
    );
    expect(collapsiblePanelToggleIcon('bottom', true).name).toBe(
      'panel-bottom-open',
    );
  });

  it('renders a standard toggle button with the action, aria-expanded, and target', () => {
    const collapse = html(
      CollapsiblePanelToggle({
        side: 'left',
        collapsed: false,
        action: 'toggle-nav',
        panelId: 'nav',
      }),
    );
    expect(collapse).toContain('data-action="toggle-nav"');
    expect(collapse).toContain('data-collapsible-target="nav"');
    expect(collapse).toContain('aria-expanded="true"');
    expect(collapse).toContain('aria-label="Collapse"');
    expect(collapse).toContain('data-lucide="panel-left-close"');

    const expand = html(
      CollapsiblePanelToggle({
        side: 'left',
        collapsed: true,
        action: 'toggle-nav',
        label: 'Show navigator',
      }),
    );
    expect(expand).toContain('aria-expanded="false"');
    expect(expand).toContain('aria-label="Show navigator"');
    expect(expand).toContain('data-lucide="panel-left-open"');
  });
});
