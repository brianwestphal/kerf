import { Check, Circle, Folder, Plus } from 'lucide';
import { describe, expect, it } from 'vitest';

import { AppTab } from '../../src/app-tab.js';
import { DialogHeader } from '../../src/dialog-header.js';
import { EmptyState } from '../../src/empty-state.js';
import { LoadingSpinner } from '../../src/loading-spinner.js';
import { LucideIcon } from '../../src/lucide-icon.js';
import { MenuHeader } from '../../src/menu-header.js';
import { MenuItem } from '../../src/menu-item.js';
import { PageHeader } from '../../src/page-header.js';
import { clampRegionSize, ResizableRegion, resizeRegionFromPointer } from '../../src/resizable-region.js';
import { Select } from '../../src/select.js';
import { StateBanner } from '../../src/state-banner.js';
import { TabBar } from '../../src/tab-bar.js';
import { Toolbar } from '../../src/toolbar.js';
import { ToolbarControlGroup } from '../../src/toolbar-control-group.js';
import { ToolbarText } from '../../src/toolbar-text.js';
import { ValueTable } from '../../src/value-table.js';

const asHtml = (value: unknown) => String(value);
const icon = LucideIcon({ icon: Circle, name: 'circle' });

describe('production UI primitives', () => {
  it('renders decorative and meaningfully labeled Lucide-compatible icons', () => {
    expect(asHtml(icon)).toContain('data-lucide="circle" aria-hidden="true"');
    const labeled = asHtml(LucideIcon({ icon: Circle, name: 'status', className: 'status-icon', label: 'Ready' }));
    expect(labeled).toContain('class="status-icon" data-lucide="status" role="img" aria-label="Ready"');
    expect(labeled).not.toContain('aria-hidden');
  });

  it('composes toolbar slots, groups, and text variants', () => {
    const group = ToolbarControlGroup({ children: [icon], label: 'View', expanded: true, single: true, appearance: 'borderless', tone: 'dark', buttonAppearance: 'push', className: 'extra' });
    const html = asHtml(Toolbar({ leading: ToolbarText({ text: 'Library', size: 'large' }), center: ToolbarText({ text: 'Center' }), trailing: group, label: 'Tools', divider: false, className: 'wide' }));
    expect(html).toContain('class="kui-toolbar wide"');
    expect(html).toContain('data-divider="false" data-has-center="true" aria-label="Tools"');
    expect(asHtml(group)).toContain('role="group" aria-label="View" data-appearance="borderless" data-tone="dark" data-button-appearance="push" data-expanded="true" data-single="true"');
    expect(asHtml(Toolbar({ leading: ToolbarText({ text: 'Small', size: 'small', className: 'mono' }) }))).toContain('data-has-center="false"');
    expect(asHtml(ToolbarText({ text: 'Default' }))).toContain('data-size="default"');
    expect(asHtml(ToolbarControlGroup({ children: icon }))).not.toContain('role="group"');
  });

  it('renders menu navigation, toggle, action, disabled, and multiline states', () => {
    const item = asHtml(MenuItem({ label: 'Projects', icon, trailing: icon, selected: true, action: 'open', itemId: 'projects', className: 'project', style: 'color:blue', pressed: false, accessibleLabel: 'Open projects', title: 'Projects', multiline: true, state: 'ready', tabIndex: -1 }));
    expect(item).toContain('data-action="open" data-item-id="projects" data-multiline="true" data-state="ready"');
    expect(item).toContain('aria-label="Open projects" aria-current="page" aria-pressed="false"');
    expect(asHtml(MenuItem({ label: 'Disabled', action: 'none', disabled: true }))).toContain('disabled');
    expect(asHtml(MenuHeader({ label: 'Tools', action: 'toggle', actionIcon: icon, expanded: false, toggle: true }))).toContain('aria-expanded="false"');
    const header = asHtml(MenuHeader({ label: 'Workspace', action: 'add', actionLabel: 'Add', actionIcon: icon, actionDisabled: true, disabledReason: 'Unavailable' }));
    expect(header).toContain('<h2>Workspace</h2>');
    expect(header).toContain('title="Unavailable" disabled');
    expect(asHtml(MenuHeader({ label: 'Enabled', action: 'add', actionLabel: 'Add', actionIcon: icon }))).toContain('title="Add"');
    expect(asHtml(MenuHeader({ label: 'Plain' }))).not.toContain('<button');
  });

  it('renders generalized tabs with roving tabindex and optional close affordances', () => {
    const selected = asHtml(AppTab({ id: 'first', name: 'First', selected: true, leading: icon, trailing: icon, draggable: true, selectAction: 'pick', closeAction: 'dismiss', className: 'document', rootAttributes: { 'data-project-id': 'project-one', 'data-tab-id': 'ignored' } }));
    expect(selected).toContain('data-selected="true" draggable="true"');
    expect(selected).toContain('data-project-id="project-one"');
    expect(selected).toContain('data-tab-id="first"');
    expect(selected).not.toContain('data-tab-id="ignored"');
    expect(selected).toContain('data-action="dismiss"');
    expect(selected).toContain('role="tab" aria-selected="true" aria-keyshortcuts="Delete Backspace Alt+Shift+ArrowLeft Alt+Shift+ArrowRight" data-action="pick"');
    expect(selected).toContain('tabindex="0"');
    const fixed = asHtml(AppTab({ id: 'fixed', name: 'Fixed', closable: false }));
    expect(fixed).toContain('tabindex="-1"');
    expect(fixed).not.toContain('Close Fixed');
    const bar = asHtml(TabBar({ id: 'work', label: 'Open work', leading: icon, trailing: icon, children: [AppTab({ id: 'first', name: 'First', selected: true })] }));
    expect(bar).toContain('data-component="tab-bar" data-tab-bar-id="work" aria-label="Open work"');
    expect(bar).toContain('class="kui-tab-bar__tabs" role="tablist" aria-label="Open work" data-kui-tab-list');
  });

  it('renders page and dialog hierarchy plus a semantic value table', () => {
    expect(asHtml(PageHeader({ title: 'Settings', action: icon }))).toContain('<h1>Settings</h1>');
    expect(asHtml(PageHeader({ title: 'Plain' }))).not.toContain('kui-page-header__action');
    const dialog = asHtml(DialogHeader({ title: 'Details', titleId: 'details-title', summary: 'Current state', summaryId: 'details-summary', icon, iconClassName: 'accent', actions: icon }));
    expect(dialog).toContain('data-has-icon="true"');
    expect(dialog).toContain('<h2 id="details-title">Details</h2><p id="details-summary">Current state</p>');
    expect(asHtml(DialogHeader({ title: 'Plain', titleId: 'plain-title', summary: 'Summary' }))).toContain('data-has-icon="false"');
    const values = asHtml(ValueTable({ label: 'Metadata', className: 'dense', children: <div><dt>Version</dt><dd>4</dd></div> }));
    expect(values).toContain('class="kui-value-table dense"');
    expect(values).toContain('aria-label="Metadata"');
  });

  it('renders labeled or decorative progress and generic feedback', () => {
    expect(asHtml(LoadingSpinner({ label: 'Loading', className: 'small' }))).toContain('role="img" aria-label="Loading"');
    expect(asHtml(LoadingSpinner({}))).toContain('aria-hidden="true"');
    const banner = asHtml(StateBanner({ title: 'Offline', detail: 'Reconnect', icon, action: icon, tone: 'danger', urgency: 'alert', className: 'network' }));
    expect(banner).toContain('data-tone="danger" role="alert" aria-live="assertive"');
    expect(asHtml(StateBanner({ title: 'Ready' }))).toContain('data-tone="info" role="status" aria-live="polite"');
    for (const tone of ['neutral', 'info', 'success', 'warning', 'danger'] as const) {
      expect(asHtml(StateBanner({ title: tone, tone }))).toContain(`data-tone="${tone}"`);
    }
    const empty = asHtml(EmptyState({ title: 'No results', detail: 'Try again', icon, action: icon }));
    expect(empty).toContain('data-busy="false" role="status" aria-busy="false"');
    expect(asHtml(EmptyState({ title: 'Loading', busy: true }))).toContain('kui-loading-spinner');
  });

  it('renders grouped and ungrouped Web Awesome select choices without registering elements', () => {
    const grouped = asHtml(Select({ name: 'mode', value: 'balanced', label: 'Mode', choices: [
      { value: 'auto', label: 'Auto' },
      { value: 'balanced', label: 'Balanced', icon: Check, iconName: 'check', color: 'green', group: 'Recommended' },
      { value: 'manual', label: 'Manual', icon: Folder, group: 'Other', separatorBefore: true },
    ], fitMenu: true, renderSelected: (choice) => <strong>{choice.label}</strong> }));
    expect(grouped).toContain('kui-select--custom-selected kui-select--fit-menu');
    expect(grouped).toContain('role="group" aria-label="Recommended"');
    expect(grouped).toContain('<wa-divider></wa-divider>');
    expect(grouped).toContain('<strong>Balanced</strong>');
    const plain = asHtml(Select({ name: 'plain', value: 'one', ariaLabel: 'Plain', placeholder: 'Choose', disabled: true, choices: [{ value: 'one', label: 'One', icon: Plus }] }));
    expect(plain).toContain('aria-label="Plain" value="one" placeholder="Choose" disabled');
    expect(plain).toContain('data-lucide="one"');
    expect(asHtml(Select({ name: 'none', value: 'missing', choices: [{ value: 'one', label: 'One' }] }))).not.toContain('slot="start"');
    const onlyGrouped = asHtml(Select({ name: 'grouped', value: 'plain', choices: [{ value: 'plain', label: 'Plain', group: 'Only' }] }));
    expect(onlyGrouped).toContain('class="kui-select__group" role="group"');
  });

  it('clamps and describes horizontal, vertical, and collapsed resizable regions', () => {
    expect(clampRegionSize(10.6, 20, 50)).toBe(20);
    expect(clampRegionSize(80, 20, 50)).toBe(50);
    expect(clampRegionSize(31.7, 20, 50)).toBe(32);
    expect(resizeRegionFromPointer(100, 12, 'end')).toBe(112);
    expect(resizeRegionFromPointer(100, 12, 'start')).toBe(88);
    const horizontal = asHtml(ResizableRegion({ id: 'sidebar', label: 'Sidebar', size: 240, min: 180, max: 400, children: icon }));
    expect(horizontal).toContain('data-axis="horizontal" data-edge="end" data-collapsed="false"');
    expect(horizontal).toContain('aria-orientation="vertical" aria-valuemin="180" aria-valuemax="400" aria-valuenow="240"');
    const vertical = asHtml(ResizableRegion({ id: 'drawer', label: 'Drawer', size: 220, min: 120, max: 500, axis: 'vertical', edge: 'start', collapsed: true, transitioning: true, children: icon }));
    expect(vertical).toContain('data-axis="vertical" data-edge="start" data-collapsed="true" data-transitioning="true"');
    expect(vertical).toContain('aria-orientation="horizontal"');
    expect(vertical).toContain('aria-valuemin="0"');
    expect(vertical).toContain('aria-valuenow="0"');
  });
});
