import { Check, Circle, Folder, Plus } from 'lucide';
import { describe, expect, it } from 'vitest';

import { AppTab } from '../../src/app-tab.js';
import { DisclosureArrow } from '../../src/disclosure-arrow.js';
import { EmptyState } from '../../src/empty-state.js';
import { FloatingToolbar } from '../../src/floating-toolbar.js';
import { List } from '../../src/list.js';
import { ListActionRow } from '../../src/list-action-row.js';
import { ListHeader, type ListHeaderProps } from '../../src/list-header.js';
import { ListInsetControl } from '../../src/list-inset-control.js';
import { ListInsetText } from '../../src/list-inset-text.js';
import { ListItem } from '../../src/list-item.js';
import { LoadingSpinner } from '../../src/loading-spinner.js';
import { LucideIcon } from '../../src/lucide-icon.js';
import {
  clampRegionSize,
  ResizableRegion,
  resizeRegionFromPointer,
} from '../../src/resizable-region.js';
import { SegmentedControl } from '../../src/segmented-control.js';
import { Select, type SelectChoice } from '../../src/select.js';
import { StateBanner } from '../../src/state-banner.js';
import { TabBar } from '../../src/tab-bar.js';
import { Toolbar } from '../../src/toolbar.js';
import { ToolbarControlGroup } from '../../src/toolbar-control-group.js';
import { ToolbarText } from '../../src/toolbar-text.js';
import { ValueTable, ValueTableRow } from '../../src/value-table.js';

const asHtml = (value: unknown) => String(value);
const icon = LucideIcon({ icon: Circle, name: 'circle' });

describe('production UI primitives', () => {
  it('renders decorative and meaningfully labeled Lucide-compatible icons', () => {
    expect(asHtml(icon)).toContain('data-lucide="circle" aria-hidden="true"');
    const labeled = asHtml(
      LucideIcon({
        icon: Circle,
        name: 'status',
        className: 'status-icon',
        label: 'Ready',
      }),
    );
    expect(labeled).toContain(
      'class="status-icon" data-lucide="status" role="img" aria-label="Ready"',
    );
    expect(labeled).not.toContain('aria-hidden');
  });

  it('renders a rotating disclosure arrow with configurable state directions and icon', () => {
    const closed = asHtml(DisclosureArrow({ open: false }));
    expect(closed).toContain(
      'data-component="disclosure-arrow" data-open="false" data-direction="right" aria-hidden="true"',
    );
    expect(closed).toContain('style="--_kui-disclosure-arrow-rotation:0deg"');
    expect(closed).toContain('data-lucide="chevron-right"');

    const open = asHtml(
      DisclosureArrow({
        open: true,
        openDirection: 'left',
        closedDirection: 'up',
        icon: <span>Custom</span>,
        className: 'custom-arrow',
      }),
    );
    expect(open).toContain('class="kui-disclosure-arrow custom-arrow"');
    expect(open).toContain('style="--_kui-disclosure-arrow-rotation:180deg"');
    expect(open).toContain('data-open="true" data-direction="left"');
    expect(open).toContain('<span>Custom</span>');

    const clockwise = asHtml(
      DisclosureArrow({
        open: true,
        openDirection: 'up',
        closedDirection: 'left',
      }),
    );
    expect(clockwise).toContain(
      'style="--_kui-disclosure-arrow-rotation:270deg"',
    );

    const counterclockwise = asHtml(
      DisclosureArrow({
        open: true,
        openDirection: 'up',
        closedDirection: 'right',
      }),
    );
    expect(counterclockwise).toContain(
      'style="--_kui-disclosure-arrow-rotation:-90deg"',
    );

    const counterclockwiseTie = asHtml(
      DisclosureArrow({
        open: true,
        openDirection: 'left',
        closedDirection: 'right',
      }),
    );
    expect(counterclockwiseTie).toContain(
      'style="--_kui-disclosure-arrow-rotation:-180deg"',
    );

    const wrappedClockwise = asHtml(
      DisclosureArrow({
        open: true,
        openDirection: 'right',
        closedDirection: 'up',
      }),
    );
    expect(wrappedClockwise).toContain(
      'style="--_kui-disclosure-arrow-rotation:360deg"',
    );
  });

  it('composes toolbar slots, groups, and text variants', () => {
    const group = ToolbarControlGroup({
      children: [icon],
      label: 'View',
      expanded: true,
      single: true,
      appearance: 'borderless',
      tone: 'dark',
      buttonAppearance: 'push',
      className: 'extra',
    });
    const html = asHtml(
      Toolbar({
        leading: ToolbarText({ text: 'Library', size: 'large' }),
        center: ToolbarText({ text: 'Center' }),
        trailing: group,
        label: 'Tools',
        dividerSides: 'tr',
        className: 'wide',
      }),
    );
    expect(html).toContain('class="kui-toolbar wide"');
    expect(html).toContain(
      'divider-sides="tr" data-has-center="true" aria-label="Tools"',
    );
    expect(asHtml(group)).toContain(
      'role="group" aria-label="View" data-appearance="borderless" data-tone="dark" data-button-appearance="push" data-expanded="true" data-single="true"',
    );
    expect(
      asHtml(
        Toolbar({
          leading: ToolbarText({
            text: 'Small',
            size: 'small',
            className: 'mono',
          }),
        }),
      ),
    ).toContain('data-has-center="false"');
    expect(asHtml(ToolbarText({ text: 'Default' }))).toContain(
      'data-size="default"',
    );
    expect(asHtml(ToolbarControlGroup({ children: icon }))).not.toContain(
      'role="group"',
    );
    // Corner shape defaults to pill; `rounded` is opt-in.
    expect(asHtml(ToolbarControlGroup({ children: icon }))).toContain(
      'data-shape="pill"',
    );
    expect(
      asHtml(ToolbarControlGroup({ children: icon, shape: 'rounded' })),
    ).toContain('data-shape="rounded"');
  });

  it('composes stretch-aligned lists with gap, flex, scroll, and dividers', () => {
    const html = asHtml(
      List({
        children: [<span>One</span>, <span>Two</span>],
        gap: '12px',
        flex: '2 1 20rem',
        scrollable: true,
        dividerSides: 'trbl',
        className: 'results',
      }),
    );
    expect(html).toContain('class="kui-list results"');
    expect(html).toContain(
      'data-component="list" data-gap="true" data-flex="true" data-scrollable="true" divider-sides="trbl"',
    );
    expect(html).toContain(
      'style="--_kui-list-gap:12px;--_kui-list-flex:2 1 20rem"',
    );
    expect(html).toContain('<span>One</span><span>Two</span>');

    const defaults = asHtml(List({ children: <span>Only</span> }));
    expect(defaults).toContain(
      'data-gap="false" data-flex="false" data-scrollable="false"',
    );
    expect(defaults).not.toContain('divider-sides');
    expect(defaults).not.toContain('style=');

    expect(asHtml(List({ gap: true, flex: true }))).toContain(
      'style="--_kui-list-gap:var(--kui-list-gap);--_kui-list-flex:1 1 auto"',
    );
  });

  it('renders a labeled floating toolbar with a default and custom position', () => {
    const floating = asHtml(
      FloatingToolbar({ children: icon, label: 'Drawer' }),
    );
    expect(floating).toContain('class="kui-floating-toolbar"');
    expect(floating).toContain(
      'data-component="floating-toolbar" data-position="bottom-end" role="toolbar" aria-label="Drawer"',
    );
    expect(
      asHtml(
        FloatingToolbar({
          children: icon,
          label: 'Drawer',
          position: 'top-start',
          className: 'extra',
        }),
      ),
    ).toContain(
      'class="kui-floating-toolbar extra" data-component="floating-toolbar" data-position="top-start"',
    );
  });

  it('renders menu navigation, toggle, action, disabled, and multiline states', () => {
    const item = asHtml(
      ListItem({
        label: 'Projects',
        icon,
        trailing: icon,
        selected: true,
        action: 'open',
        itemId: 'projects',
        className: 'project',
        style: 'color:blue',
        pressed: false,
        accessibleLabel: 'Open projects',
        title: 'Projects',
        multiline: true,
        state: 'ready',
        tabIndex: -1,
        rootAttributes: {
          'data-command-color': '#123456',
          'data-optional': undefined,
        },
      }),
    );
    expect(item).toContain('data-action="open"');
    expect(item).toContain('data-item-id="projects"');
    expect(item).toContain('data-has-icon="true"');
    expect(item).toContain('data-multiline="true"');
    expect(item).toContain('data-state="ready"');
    expect(item).toContain('data-command-color="#123456"');
    expect(item).not.toContain('data-action="ignored"');
    expect(item).not.toContain('data-optional');
    expect(item).toContain('aria-label="Open projects"');
    expect(item).toContain('aria-current="page"');
    expect(item).toContain('aria-pressed="false"');
    const iconless = asHtml(
      ListItem({ label: 'Disabled', action: 'none', disabled: true }),
    );
    expect(iconless).toContain('data-has-icon="false"');
    expect(iconless).toContain('disabled');
    const toggle = asHtml(
      ListHeader({
        label: 'Tools',
        count: 2,
        countLabel: '2 tools',
        action: 'toggle',
        expanded: false,
        toggle: true,
        rootAttributes: { 'data-command-group': 'tools' },
        triggerAttributes: { 'aria-controls': 'tools-panel' },
      }),
    );
    expect(toggle).toContain('aria-expanded="false"');
    expect(toggle).toContain('data-command-group="tools"');
    expect(toggle).toContain('aria-controls="tools-panel"');
    expect(toggle).not.toContain('data-action="ignored"');
    expect(toggle).not.toContain('aria-expanded="true"');
    expect(toggle).toContain(
      'aria-label="Tools, 2 tools" aria-expanded="false"',
    );
    expect(toggle).toContain(
      'class="kui-list-header__count" aria-hidden="true">2</span>',
    );
    expect(toggle).toContain('data-has-badge="false" data-has-count="true"');
    expect(toggle).toContain('class="kui-list-header__action-layer"');
    expect(toggle.match(/data-component="disclosure-arrow"/g)).toHaveLength(1);
    expect(toggle).toContain(
      'data-open="false" data-direction="right" aria-hidden="true"',
    );
    const openToggle = asHtml(
      ListHeader({
        label: 'Tools',
        action: 'toggle',
        expanded: true,
        toggle: true,
      }),
    );
    expect(openToggle).toContain('aria-expanded="true"');
    expect(openToggle).toContain(
      'data-open="true" data-direction="down" aria-hidden="true"',
    );
    const disabledToggle = asHtml(
      ListHeader({
        label: 'Locked tools',
        action: 'toggle',
        expanded: false,
        toggle: true,
        actionDisabled: true,
        disabledReason: 'Unavailable',
      }),
    );
    expect(disabledToggle).toContain('title="Unavailable"');
    expect(disabledToggle).toContain(' disabled');
    const customToggle = asHtml(
      ListHeader({
        label: 'Custom tools',
        action: 'toggle',
        actionIcon: <span>Custom</span>,
        expanded: false,
        toggle: true,
      }),
    );
    expect(customToggle).toContain('<span>Custom</span>');
    expect(customToggle).not.toContain('data-component="disclosure-arrow"');
    const header = asHtml(
      ListHeader({
        label: 'Workspace',
        count: 0,
        countLabel: '0 workspaces',
        action: 'add',
        actionLabel: 'Add',
        actionIcon: icon,
        actionDisabled: true,
        disabledReason: 'Unavailable',
        rootAttributes: { 'data-section-id': 'workspace' },
        triggerAttributes: {
          popoverTarget: 'workspace-popover',
          popoverTargetAction: 'show',
          'aria-controls': 'workspace-popover',
          'aria-haspopup': 'dialog',
        },
      }),
    );
    expect(header).toContain(
      '<h2 class="kui-list-header__label" aria-label="Workspace, 0 workspaces">Workspace</h2>',
    );
    expect(header).toContain(
      'class="kui-list-header__count" aria-hidden="true">0</span>',
    );
    expect(header).toContain('data-has-badge="false" data-has-count="true"');
    expect(header).toContain('data-section-id="workspace"');
    expect(header).toContain(
      'popoverTarget="workspace-popover" popoverTargetAction="show" aria-controls="workspace-popover" aria-haspopup="dialog"',
    );
    expect(header).toContain('title="Unavailable"');
    expect(header).toContain(' disabled');
    expect(header).toContain('data-action="add"');
    expect(header).toContain('aria-label="Add"');
    expect(header).not.toContain('data-action="ignored"');
    expect(header).not.toContain('aria-label="Ignored"');
    const badge = asHtml(
      ListHeader({ label: 'Preview', badge: <span>New</span> }),
    );
    expect(badge).toContain('data-has-badge="true" data-has-count="false"');
    expect(badge).toContain('class="kui-list-header__badge"><span>New</span>');
    expect(
      asHtml(
        ListHeader({
          label: 'Enabled',
          action: 'add',
          actionLabel: 'Add',
          actionIcon: icon,
        }),
      ),
    ).toContain('title="Add"');
    expect(asHtml(ListHeader({ label: 'Plain' }))).not.toContain('<button');
    ListItem({
      label: 'Unsafe menu role',
      action: 'unsafe',
      // @ts-expect-error A lone role=menuitem does not provide a complete menu widget.
      rootAttributes: { role: 'menuitem' },
    });
    ListItem({
      label: 'Unsafe selection',
      action: 'unsafe',
      // @ts-expect-error Selection semantics remain owned by ListItem props.
      rootAttributes: { 'aria-current': 'false' },
    });
    ListItem({
      label: 'Unsafe action',
      action: 'safe',
      // @ts-expect-error Action dispatch remains owned by ListItem.action.
      rootAttributes: { 'data-action': 'unsafe' },
    });
    ListHeader({
      label: 'Unsafe disclosure',
      toggle: true,
      // @ts-expect-error Disclosure state remains owned by ListHeader.expanded.
      triggerAttributes: { 'aria-expanded': 'true' },
    });
    ListHeader({
      label: 'Unsafe action',
      action: 'safe',
      // @ts-expect-error Action dispatch remains owned by ListHeader.action.
      triggerAttributes: { 'data-action': 'unsafe' },
    });
    ListHeader({
      label: 'Unsafe root action',
      // @ts-expect-error Dormant ListHeader roots cannot become delegated actions.
      rootAttributes: { 'data-action': 'unsafe' },
    });
    // @ts-expect-error Count labels are required for counted headers.
    ListHeader({ label: 'Missing count label', count: 2 });
    // @ts-expect-error Count labels cannot be supplied without a count.
    ListHeader({ label: 'Orphan count label', countLabel: '2 items' });
    // @ts-expect-error Count metadata and legacy badge content are mutually exclusive.
    ListHeader({
      label: 'Competing indicators',
      count: 2,
      countLabel: '2 items',
      badge: <span>New</span>,
    });
    // @ts-expect-error Legacy badges cannot carry an orphaned count label.
    ListHeader({
      label: 'Badge with count label',
      countLabel: '2 items',
      badge: <span>New</span>,
    });
    ListHeader({
      label: 'Unsafe count presence',
      // @ts-expect-error Component-owned count presence cannot be overridden.
      rootAttributes: { 'data-has-count': 'false' },
    });
  });

  it('normalizes ListHeader counts and keeps widened legacy badges safe', () => {
    const widened = (props: Record<string, unknown>) =>
      ListHeader(props as unknown as ListHeaderProps);
    const valid = asHtml(
      widened({
        label: 'Notes <unsafe>',
        count: 12,
        countLabel: '12 "notes" <unsafe>',
        badge: <span>Legacy</span>,
      }),
    );
    expect(valid).toContain('data-has-badge="false" data-has-count="true"');
    expect(valid).toContain(
      'aria-label="Notes &lt;unsafe&gt;, 12 &quot;notes&quot; &lt;unsafe&gt;"',
    );
    expect(valid).toContain('>Notes &lt;unsafe&gt;</h2>');
    expect(valid).toContain('aria-hidden="true">12</span>');
    expect(valid).not.toContain('Legacy');

    for (const count of [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
      '4',
      null,
    ]) {
      const invalid = asHtml(
        widened({
          label: 'Invalid count',
          count,
          countLabel: 'invalid',
          badge: <span>{'<script>alert(1)</script>'}</span>,
        }),
      );
      expect(invalid, String(count)).toContain(
        'data-has-badge="true" data-has-count="false"',
      );
      expect(invalid, String(count)).not.toContain('kui-list-header__count');
      expect(invalid, String(count)).toContain(
        '&lt;script&gt;alert(1)&lt;/script&gt;',
      );
      expect(invalid, String(count)).not.toContain('<script>alert(1)</script>');
    }

    const fallbackLabel = asHtml(
      widened({ label: 'Attachments', count: 3, countLabel: '' }),
    );
    expect(fallbackLabel).toContain('aria-label="Attachments, 3"');
  });

  it('insets a self-bordered control and bare text into a content region', () => {
    const control = asHtml(
      ListInsetControl({ children: <input type="search" /> }),
    );
    expect(control).toContain(
      'class="kui-list-inset-control" data-component="list-inset-control"',
    );
    expect(control).toContain('<input type="search"');

    const multi = asHtml(
      ListInsetControl({ children: [icon, icon], className: 'extra' }),
    );
    expect(multi).toContain('class="kui-list-inset-control extra"');

    const text = asHtml(ListInsetText({ children: 'Sorted by name' }));
    expect(text).toContain(
      'class="kui-list-inset-text" data-component="list-inset-text"',
    );
    expect(text).toContain('>Sorted by name</div>');

    const rich = asHtml(
      ListInsetText({ children: <span>Rich</span>, className: 'note' }),
    );
    expect(rich).toContain('class="kui-list-inset-text note"');
    expect(rich).toContain('<span>Rich</span>');

    const horizontal = asHtml(
      ListInsetText({ children: 'Tight', horizontalOnly: true }),
    );
    expect(horizontal).toContain(
      'class="kui-list-inset-text kui-list-inset-text--horizontal" data-component="list-inset-text"',
    );

    const horizontalExtra = asHtml(
      ListInsetText({
        children: 'Tight',
        horizontalOnly: true,
        className: 'note',
      }),
    );
    expect(horizontalExtra).toContain(
      'class="kui-list-inset-text kui-list-inset-text--horizontal note"',
    );
  });

  it('filters widened menu extension objects before rendering them', () => {
    const widenedItemRoot = {
      'data-command-color': '#123456',
      'data-Action': 'case-variant-action',
      'data-ITEM-ID': 'case-variant-item',
      'data-': 'malformed',
      'data-optional': undefined,
      role: 'menuitem',
      'aria-current': 'false',
      disabled: 'disabled',
    };
    const itemHtml = asHtml(
      ListItem({
        label: 'Projects',
        action: 'open',
        itemId: 'projects',
        selected: true,
        rootAttributes: widenedItemRoot,
      }),
    );

    expect(itemHtml).toContain('data-command-color="#123456"');
    expect(itemHtml).not.toContain('case-variant-action');
    expect(itemHtml).not.toContain('case-variant-item');
    expect(itemHtml).not.toContain('role="menuitem"');
    expect(itemHtml).not.toContain('data-="malformed"');
    document.body.innerHTML = itemHtml;
    const item = document.body.querySelector<HTMLButtonElement>(
      '[data-component="list-item"]',
    );
    expect(item?.getAttribute('data-action')).toBe('open');
    expect(item?.getAttribute('data-item-id')).toBe('projects');
    expect(item?.getAttribute('data-command-color')).toBe('#123456');
    expect(item?.getAttribute('role')).toBeNull();
    expect(item?.getAttribute('aria-current')).toBe('page');
    expect(item?.disabled).toBe(false);

    const widenedHeaderRoot = {
      'data-section-id': 'workspace',
      'data-ACTION': 'case-variant-root-action',
      'data-HAS-BADGE': 'true',
      'data-HAS-COUNT': 'true',
      'data-TOGGLE': 'false',
      role: 'menu',
    };
    const widenedTrigger = {
      'data-trigger-source': 'catalog',
      'data-Action': 'case-variant-trigger-action',
      popoverTarget: 'workspace-popover',
      popoverTargetAction: 'show' as const,
      'aria-controls': 'workspace-popover',
      'aria-haspopup': 'dialog' as const,
      role: 'menuitem',
      'aria-label': 'Injected label',
      'aria-expanded': 'true',
      disabled: 'disabled',
    };
    const headerHtml = asHtml(
      ListHeader({
        label: 'Workspace',
        action: 'add',
        actionLabel: 'Add workspace',
        actionIcon: icon,
        rootAttributes: widenedHeaderRoot,
        triggerAttributes: widenedTrigger,
      }),
    );

    expect(headerHtml).toContain('data-section-id="workspace"');
    expect(headerHtml).toContain('data-trigger-source="catalog"');
    expect(headerHtml).toContain('popoverTarget="workspace-popover"');
    expect(headerHtml).toContain('popoverTargetAction="show"');
    expect(headerHtml).not.toContain('case-variant-root-action');
    expect(headerHtml).not.toContain('case-variant-trigger-action');
    expect(headerHtml).not.toContain('role="menu"');
    expect(headerHtml).not.toContain('role="menuitem"');
    expect(headerHtml).not.toContain('Injected label');
    document.body.innerHTML = headerHtml;
    const header = document.body.querySelector<HTMLElement>(
      '[data-component="list-header"]',
    );
    const trigger = header?.querySelector<HTMLButtonElement>('button');
    expect(header?.getAttribute('data-action')).toBeNull();
    expect(header?.getAttribute('data-toggle')).toBe('false');
    expect(header?.getAttribute('data-has-badge')).toBe('false');
    expect(header?.getAttribute('data-has-count')).toBe('false');
    expect(header?.getAttribute('role')).toBeNull();
    expect(trigger?.getAttribute('data-action')).toBe('add');
    expect(trigger?.getAttribute('data-trigger-source')).toBe('catalog');
    expect(trigger?.getAttribute('popovertarget')).toBe('workspace-popover');
    expect(trigger?.getAttribute('popovertargetaction')).toBe('show');
    expect(trigger?.getAttribute('aria-controls')).toBe('workspace-popover');
    expect(trigger?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger?.getAttribute('aria-label')).toBe('Add workspace');
    expect(trigger?.getAttribute('role')).toBeNull();
    expect(trigger?.disabled).toBe(false);
  });

  it('renders sibling primary and trailing menu actions without nesting controls', () => {
    const widenedRootAttributes = {
      'data-file-kind': 'source',
      'data-Action': 'injected-root-action',
      role: 'menuitem',
    };
    const widenedTrailingAttributes = {
      'data-menu-source': 'repository',
      'data-Action': 'injected-trailing-action',
      popoverTarget: 'file-actions',
      popoverTargetAction: 'toggle' as const,
      'aria-controls': 'file-actions',
      'aria-haspopup': 'menu' as const,
      role: 'menuitem',
      'aria-label': 'Injected label',
      disabled: 'disabled',
    };
    const html = asHtml(
      ListActionRow({
        label: <span>src/main.ts</span>,
        icon,
        action: 'select-file',
        itemId: 'src/main.ts',
        pressed: true,
        accessibleLabel: 'Select src/main.ts',
        multiline: true,
        state: 'modified',
        trailingAction: 'open-file-actions',
        trailingActionLabel: 'Actions for src/main.ts',
        trailingActionIcon: icon,
        rootAttributes: widenedRootAttributes,
        trailingActionAttributes: widenedTrailingAttributes,
      }),
    );

    expect(html).toContain('data-component="list-action-row"');
    expect(html).toContain('data-file-kind="source"');
    expect(html).toContain('data-menu-source="repository"');
    expect(html).not.toContain('injected-root-action');
    expect(html).not.toContain('injected-trailing-action');
    expect(html).not.toContain('Injected label');
    expect(html).not.toContain('role="menuitem"');

    document.body.innerHTML = html;
    const root = document.body.querySelector<HTMLElement>(
      '[data-component="list-action-row"]',
    );
    const controls =
      root?.querySelectorAll<HTMLButtonElement>(':scope > button');
    const primary = controls?.[0];
    const trailing = controls?.[1];
    expect(root?.tagName).toBe('DIV');
    expect(root?.getAttribute('role')).toBeNull();
    expect(root?.getAttribute('data-action')).toBeNull();
    expect(root?.dataset.pressed).toBe('true');
    expect(root?.dataset.state).toBe('modified');
    expect(controls).toHaveLength(2);
    expect(primary?.querySelector('button, a, [role="button"]')).toBeNull();
    expect(trailing?.querySelector('button, a, [role="button"]')).toBeNull();
    expect(primary?.dataset.action).toBe('select-file');
    expect(primary?.dataset.itemId).toBe('src/main.ts');
    expect(primary?.getAttribute('aria-label')).toBe('Select src/main.ts');
    expect(primary?.getAttribute('aria-pressed')).toBe('true');
    expect(primary?.getAttribute('aria-current')).toBeNull();
    expect(trailing?.dataset.action).toBe('open-file-actions');
    expect(trailing?.dataset.itemId).toBe('src/main.ts');
    expect(trailing?.getAttribute('aria-label')).toBe(
      'Actions for src/main.ts',
    );
    expect(trailing?.getAttribute('popovertarget')).toBe('file-actions');
    expect(trailing?.getAttribute('popovertargetaction')).toBe('toggle');
    expect(trailing?.getAttribute('aria-controls')).toBe('file-actions');
    expect(trailing?.getAttribute('aria-haspopup')).toBe('menu');
    expect(trailing?.getAttribute('role')).toBeNull();
    expect(trailing?.disabled).toBe(false);

    const independentlyDisabled = asHtml(
      ListActionRow({
        label: 'Unavailable primary',
        action: 'select-disabled',
        disabled: true,
        trailingAction: 'available-actions',
        trailingActionLabel: 'Available actions',
        trailingActionIcon: icon,
      }),
    );
    document.body.innerHTML = independentlyDisabled;
    const disabledControls = document.body.querySelectorAll<HTMLButtonElement>(
      '[data-component="list-action-row"] > button',
    );
    expect(disabledControls[0]?.disabled).toBe(true);
    expect(disabledControls[1]?.disabled).toBe(false);

    const disabledTrailing = asHtml(
      ListActionRow({
        label: 'Available primary',
        action: 'select-available',
        selected: true,
        trailingAction: 'disabled-actions',
        trailingActionLabel: 'Disabled actions',
        trailingActionIcon: icon,
        trailingActionDisabled: true,
        trailingActionTitle: 'Actions unavailable',
      }),
    );
    expect(disabledTrailing).toContain('data-selected="true"');
    expect(disabledTrailing).toContain('aria-current="page"');
    expect(disabledTrailing).toContain('title="Actions unavailable" disabled');

    ListActionRow({
      label: 'Unsafe',
      action: 'safe',
      trailingAction: 'more',
      trailingActionLabel: 'More',
      trailingActionIcon: icon,
      // @ts-expect-error The noninteractive row root cannot own delegated actions.
      rootAttributes: { 'data-action': 'unsafe' },
    });
    ListActionRow({
      label: 'Unsafe',
      action: 'safe',
      trailingAction: 'more',
      trailingActionLabel: 'More',
      trailingActionIcon: icon,
      // @ts-expect-error The trailing action's accessible name is component-owned.
      trailingActionAttributes: { 'aria-label': 'unsafe' },
    });
  });

  it('renders generalized tabs with roving tabindex and optional close affordances', () => {
    const widenedRootAttributes = {
      'data-project-id': 'project-one',
      'data-Tab-Id': 'ignored-case-variant',
      'data-Action': 'unsafe-root-action',
      'data-Component': 'unsafe-component',
      'data-Selected': 'false',
      'data-Tab-Dragging': 'true',
      'data-Tab-Drop-Position': 'before',
      role: 'menuitem',
    };
    const selected = asHtml(
      AppTab({
        id: 'first',
        name: 'First',
        selected: true,
        leading: icon,
        trailing: icon,
        closeIcon: <span data-custom-close-icon>×</span>,
        draggable: true,
        selectAction: 'pick',
        closeAction: 'dismiss',
        className: 'document',
        rootAttributes: widenedRootAttributes,
      }),
    );
    expect(selected).toContain('data-selected="true" draggable="true"');
    expect(selected).toContain('data-project-id="project-one"');
    expect(selected).toContain('data-tab-id="first"');
    expect(selected).not.toContain('ignored-case-variant');
    expect(selected).not.toContain('unsafe-root-action');
    expect(selected).not.toContain('unsafe-component');
    expect(selected).not.toContain('data-tab-dragging');
    expect(selected).not.toContain('data-tab-drop-position');
    expect(selected).not.toContain('role="menuitem"');
    expect(selected).toContain('data-action="dismiss"');
    expect(selected).toContain(
      'role="tab" aria-selected="true" aria-keyshortcuts="Delete Backspace Alt+Shift+ArrowLeft Alt+Shift+ArrowRight" data-action="pick"',
    );
    expect(selected).toContain('tabindex="0"');
    const host = document.createElement('div');
    host.innerHTML = selected;
    const selectedRoot = host.querySelector<HTMLElement>(
      '[data-component="app-tab"]',
    )!;
    expect(selectedRoot.dataset.tabId).toBe('first');
    expect(selectedRoot.dataset.selected).toBe('true');
    expect(selectedRoot.dataset.projectId).toBe('project-one');
    expect(selectedRoot.hasAttribute('data-action')).toBe(false);
    expect(selectedRoot.hasAttribute('role')).toBe(false);
    const closeIcon = selectedRoot.querySelector<HTMLElement>(
      '.kui-app-tab__close-icon',
    )!;
    expect(closeIcon.getAttribute('aria-hidden')).toBe('true');
    expect(
      closeIcon.querySelector('[data-custom-close-icon]')?.textContent,
    ).toBe('×');
    const fixed = asHtml(
      AppTab({ id: 'fixed', name: 'Fixed', closable: false }),
    );
    expect(fixed).toContain('tabindex="-1"');
    expect(fixed).not.toContain('Close Fixed');
    const bar = asHtml(
      TabBar({
        id: 'work',
        label: 'Open work',
        leading: icon,
        trailing: icon,
        children: [AppTab({ id: 'first', name: 'First', selected: true })],
      }),
    );
    expect(bar).toContain(
      'data-component="tab-bar" data-tab-bar-id="work" aria-label="Open work"',
    );
    expect(bar).toContain(
      'class="kui-tab-bar__tabs" role="tablist" aria-label="Open work" data-kui-tab-list',
    );

    AppTab({
      id: 'unsafe',
      name: 'Unsafe',
      // @ts-expect-error The noninteractive tab root cannot own delegated actions.
      rootAttributes: { 'data-action': 'unsafe' },
    });
    AppTab({
      id: 'unsafe',
      name: 'Unsafe',
      // @ts-expect-error Tab identity is component-owned.
      rootAttributes: { 'data-tab-id': 'unsafe' },
    });
    AppTab({
      id: 'unsafe',
      name: 'Unsafe',
      // @ts-expect-error Drag lifecycle state is wireTabBars-owned.
      rootAttributes: { 'data-tab-dragging': 'true' },
    });
    AppTab({
      id: 'unsafe',
      name: 'Unsafe',
      // @ts-expect-error Drop lifecycle state is wireTabBars-owned.
      rootAttributes: { 'data-tab-drop-position': 'before' },
    });
  });

  it('renders a semantic value table', () => {
    const plainRow = ValueTableRow({ label: 'Version', value: '4' });
    const iconRow = asHtml(
      ValueTableRow({
        label: 'Runtime',
        value: 'Kerf',
        icon,
        className: 'featured',
      }),
    );
    const values = asHtml(
      ValueTable({ label: 'Metadata', className: 'dense', children: plainRow }),
    );
    expect(values).toContain('class="kui-value-table dense"');
    expect(values).toContain('aria-label="Metadata"');
    expect(asHtml(plainRow)).toContain('data-has-icon="false"');
    expect(asHtml(plainRow)).not.toContain('kui-value-table__icon');
    expect(iconRow).toContain(
      'class="kui-value-table__row featured" data-has-icon="true"',
    );
    expect(iconRow).toContain('class="kui-value-table__icon"');
    expect(iconRow).toContain(
      '<span class="kui-value-table__label">Runtime</span>',
    );
  });

  it('exposes optional heading semantics for page/section titles', () => {
    // ToolbarText opts into role="heading" + aria-level via headingLevel.
    const plainText = asHtml(ToolbarText({ text: 'Section' }));
    expect(plainText).not.toContain('role="heading"');
    expect(plainText).not.toContain('aria-level');
    const heading = asHtml(
      ToolbarText({ text: 'Overview', size: 'large', headingLevel: 2 }),
    );
    expect(heading).toContain('role="heading"');
    expect(heading).toContain('aria-level="2"');

    // Overflow: default is single-line + ellipsis (no wrap/ellipsis/max-lines attrs).
    const defaultOverflow = asHtml(
      ToolbarText({ text: 'Fits on one line or ellipsizes' }),
    );
    expect(defaultOverflow).not.toContain('data-wrap');
    expect(defaultOverflow).not.toContain('data-ellipsis');
    expect(defaultOverflow).not.toContain('data-max-lines');

    // ellipsis: false emits the hard-clip hook; wrap: true emits the wrap hook.
    expect(asHtml(ToolbarText({ text: 'Clip me', ellipsis: false }))).toContain(
      'data-ellipsis="false"',
    );
    expect(asHtml(ToolbarText({ text: 'Wrap me', wrap: true }))).toContain(
      'data-wrap="true"',
    );

    // maxLines only takes effect with wrap, and sets both the attribute and the CSS var.
    const capped = asHtml(
      ToolbarText({ text: 'Cap me', wrap: true, maxLines: 2 }),
    );
    expect(capped).toContain('data-wrap="true"');
    expect(capped).toContain('data-max-lines="2"');
    expect(capped).toContain('--kui-toolbar-text-max-lines:2');
    // maxLines without wrap is ignored (single line), and a non-positive value is dropped.
    expect(
      asHtml(
        ToolbarText({
          text: 'No wrap',
          maxLines: 3,
        } as unknown as Parameters<typeof ToolbarText>[0]),
      ),
    ).not.toContain('data-max-lines');
    expect(
      asHtml(ToolbarText({ text: 'Zero', wrap: true, maxLines: 0 })),
    ).not.toContain('data-max-lines');
  });

  it('renders labeled or decorative progress and generic feedback', () => {
    expect(
      asHtml(LoadingSpinner({ label: 'Loading', className: 'small' })),
    ).toContain('role="img" aria-label="Loading"');
    expect(asHtml(LoadingSpinner({}))).toContain('aria-hidden="true"');
    const banner = asHtml(
      StateBanner({
        title: 'Offline',
        detail: 'Reconnect',
        badge: '3',
        icon,
        action: icon,
        tone: 'danger',
        urgency: 'alert',
        className: 'network',
      }),
    );
    expect(banner).toContain(
      'data-tone="danger" role="alert" aria-live="assertive"',
    );
    expect(banner).toContain('class="kui-state-banner__badge">3</span>');
    expect(banner).toContain(
      'class="kui-state-banner__detail">Reconnect</span>',
    );
    expect(asHtml(StateBanner({ title: 'Ready' }))).toContain(
      'data-tone="info" role="status" aria-live="polite"',
    );
    for (const tone of [
      'neutral',
      'info',
      'success',
      'warning',
      'danger',
    ] as const) {
      expect(asHtml(StateBanner({ title: tone, tone }))).toContain(
        `data-tone="${tone}"`,
      );
    }
    const empty = asHtml(
      EmptyState({
        title: 'No results',
        detail: 'Try again',
        icon,
        action: icon,
      }),
    );
    expect(empty).toContain(
      'data-busy="false" role="status" aria-busy="false"',
    );
    expect(asHtml(EmptyState({ title: 'Loading', busy: true }))).toContain(
      'kui-loading-spinner',
    );
  });

  it('renders grouped and ungrouped Web Awesome select choices without registering elements', () => {
    const grouped = asHtml(
      Select({
        name: 'mode',
        value: 'balanced',
        label: 'Mode',
        choices: [
          { value: 'auto', label: 'Auto' },
          {
            value: 'balanced',
            label: 'Balanced',
            icon: Check,
            iconName: 'check',
            color: 'green',
            group: 'Recommended',
          },
          {
            value: 'manual',
            label: 'Manual',
            icon: Folder,
            group: 'Other',
            separatorBefore: true,
          },
        ],
        fitMenu: true,
        renderSelected: (choice) => <strong>{choice.label}</strong>,
      }),
    );
    expect(grouped).toContain(
      'kui-select--custom-selected kui-select--fit-menu',
    );
    expect(grouped).toContain('role="group" aria-label="Recommended"');
    expect(grouped).toContain('<wa-divider></wa-divider>');
    expect(grouped).toContain('<strong>Balanced</strong>');
    expect(grouped).toContain(
      'data-key="mode:balanced:custom-selected" slot="start" class="kui-select__custom-selected"',
    );
    expect(grouped).toContain(
      'data-key="mode:balanced:option" data-morph-skip slot="start" class="kui-select__icon"',
    );
    expect(grouped).toContain(
      'data-key="mode:manual:option" data-morph-skip slot="start" class="kui-select__icon"',
    );
    const plain = asHtml(
      Select({
        name: 'plain',
        value: 'one',
        ariaLabel: 'Plain',
        placeholderText: 'Choose',
        disabled: true,
        choices: [{ value: 'one', label: 'One', icon: Plus }],
      }),
    );
    expect(plain).toContain(
      'aria-label="Plain" value="one" placeholder="Choose" disabled',
    );
    expect(plain).toContain(
      'data-key="plain:one:selected" data-morph-skip slot="start" class="kui-select__icon kui-select__icon--selected"',
    );
    expect(plain).toContain(
      'data-key="plain:one:option" data-morph-skip slot="start" class="kui-select__icon"',
    );
    expect(plain).toContain('data-lucide="one"');
    expect(
      asHtml(
        Select({
          name: 'none',
          value: 'missing',
          ariaLabel: 'No selected choice',
          choices: [{ value: 'one', label: 'One' }] as SelectChoice[],
        }),
      ),
    ).not.toContain('slot="start"');
    const onlyGrouped = asHtml(
      Select({
        name: 'grouped',
        value: 'plain',
        ariaLabel: 'Grouped choices',
        choices: [{ value: 'plain', label: 'Plain', group: 'Only' }],
      }),
    );
    expect(onlyGrouped).toContain('class="kui-select__group" role="group"');
  });

  it('renders controlled segmented choices with stable action and presentation hooks', () => {
    const control = asHtml(
      SegmentedControl({
        id: 'inspector-section',
        label: 'Inspector section',
        value: 'activity',
        action: 'choose-section',
        appearance: 'outlined',
        shape: 'pill',
        size: 'small',
        layout: 'equal',
        className: 'scoped-palette',
        choices: [
          { value: 'summary', label: 'Summary' },
          {
            value: 'activity',
            label: 'Activity',
            content: <strong>Recent activity</strong>,
            title: 'Show recent activity',
          },
          { value: 'files', label: 'Files', disabled: true },
        ],
      }),
    );
    expect(control).toContain('class="kui-segmented-control scoped-palette"');
    expect(control).toContain(
      'data-segmented-control-id="inspector-section" data-value="activity" data-appearance="outlined" data-shape="pill" data-size="small" data-layout="equal" role="group" aria-label="Inspector section"',
    );
    expect(control).toContain(
      'data-action="choose-section" data-segment-value="summary" data-selected="false" aria-label="Summary" aria-pressed="false"',
    );
    expect(control).toContain(
      'data-segment-value="activity" data-selected="true" aria-label="Activity" aria-pressed="true" title="Show recent activity"',
    );
    expect(control).toContain('<strong>Recent activity</strong>');
    expect(control).toContain(
      'data-segment-value="files" data-selected="false" aria-label="Files" aria-pressed="false" disabled tabindex="0"',
    );
    const defaults = asHtml(
      SegmentedControl({
        id: 'mode',
        label: 'Mode',
        value: 'one',
        choices: [{ value: 'one', label: 'One' }],
      }),
    );
    expect(defaults).toContain('data-action="select-segment"');
    expect(defaults).toContain(
      'data-appearance="filled" data-shape="rounded" data-size="default" data-layout="content"',
    );
    expect(defaults).toContain('<span>One</span>');
  });

  it('clamps and describes horizontal, vertical, and collapsed resizable regions', () => {
    expect(clampRegionSize(10.6, 20, 50)).toBe(20);
    expect(clampRegionSize(80, 20, 50)).toBe(50);
    expect(clampRegionSize(31.7, 20, 50)).toBe(32);
    expect(resizeRegionFromPointer(100, 12, 'end')).toBe(112);
    expect(resizeRegionFromPointer(100, 12, 'start')).toBe(88);
    const horizontal = asHtml(
      ResizableRegion({
        id: 'sidebar',
        label: 'Sidebar',
        size: 240,
        min: 180,
        max: 400,
        handleIcon: <span data-custom-handle-icon>⋮</span>,
        children: icon,
      }),
    );
    expect(horizontal).toContain(
      'data-axis="horizontal" data-edge="end" data-collapsed="false"',
    );
    expect(horizontal).toContain(
      'aria-orientation="vertical" aria-valuemin="180" aria-valuemax="400" aria-valuenow="240"',
    );
    const host = document.createElement('div');
    host.innerHTML = horizontal;
    const handleIcon = host.querySelector<HTMLElement>(
      '.kui-resizable-region__handle-icon',
    )!;
    expect(handleIcon.getAttribute('aria-hidden')).toBe('true');
    expect(
      handleIcon.querySelector('[data-custom-handle-icon]')?.textContent,
    ).toBe('⋮');
    const vertical = asHtml(
      ResizableRegion({
        id: 'drawer',
        label: 'Drawer',
        size: 220,
        min: 120,
        max: 500,
        axis: 'vertical',
        edge: 'start',
        collapsed: true,
        transitioning: true,
        children: icon,
      }),
    );
    expect(vertical).toContain(
      'data-axis="vertical" data-edge="start" data-collapsed="true" data-transitioning="true"',
    );
    expect(vertical).toContain('aria-orientation="horizontal"');
    expect(vertical).toContain('aria-valuemin="0"');
    expect(vertical).toContain('aria-valuenow="0"');
  });
});
