// KF-PYR8XZ: every component the Kerf UI editor can name carries application
// `data-*` metadata (its node marker, a row key) on its root through a
// `rootAttributes` prop, while its own markers stay protected.
import { raw, type SafeHtml } from 'kerfjs';
import { Inbox } from 'lucide';
import { describe, expect, it } from 'vitest';

import { ChoiceChips } from '../../src/choice-chips.js';
import {
  CollapsiblePanel,
  CollapsiblePanelToggle,
} from '../../src/collapsible-panel.js';
import { Combobox } from '../../src/combobox.js';
import { ContentSwap } from '../../src/content-swap.js';
import { CornerStatus } from '../../src/corner-status.js';
import { DisclosureArrow } from '../../src/disclosure-arrow.js';
import { EdgeActivityIndicator } from '../../src/edge-activity-indicator.js';
import { EmptyState } from '../../src/empty-state.js';
import { FileDropZone, FilePickerTrigger } from '../../src/file-picker.js';
import { FloatingToolbar } from '../../src/floating-toolbar.js';
import { ListInsetControl } from '../../src/list-inset-control.js';
import { LoadingSpinner } from '../../src/loading-spinner.js';
import { LucideIcon } from '../../src/lucide-icon.js';
import { NavStack } from '../../src/nav-stack.js';
import { ResizableRegion } from '../../src/resizable-region.js';
import { SearchField } from '../../src/search-field.js';
import { SegmentedControl } from '../../src/segmented-control.js';
import { Select } from '../../src/select.js';
import { Skeleton } from '../../src/skeleton.js';
import { Spacer } from '../../src/spacer.js';
import { SplitView } from '../../src/split-view.js';
import { SunkenPanel } from '../../src/sunken-panel.js';
import { PopupSurface } from '../../src/surface-scaffold.js';
import { TabBar } from '../../src/tab-bar.js';
import { TabNavigator } from '../../src/tab-navigator.js';
import { TagField } from '../../src/tag-field.js';
import { Toolbar } from '../../src/toolbar.js';
import {
  ToolbarActionLink,
  ToolbarControlGroup,
} from '../../src/toolbar-control-group.js';
import { ToolbarText } from '../../src/toolbar-text.js';
import { ValuePreview } from '../../src/value-preview.js';
import { ValueTable, ValueTableRow } from '../../src/value-table.js';
import { Workbench } from '../../src/workbench.js';

const content = raw('<span>content</span>');
const choices = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
];
// Every case passes this; `data-component` must never be overridden.
const rootAttributes = {
  'data-kerf-node': '01JB8Z1M6Q8E1X9V4S7K2R3TRA',
  'data-key': 'row-1',
  'data-component': 'forged',
};

type Case = readonly [name: string, render: () => SafeHtml];
const cases: Case[] = [
  [
    'ChoiceChips',
    () => ChoiceChips({ name: 'pick', label: 'Pick', choices, rootAttributes }),
  ],
  [
    'CollapsiblePanel',
    () =>
      CollapsiblePanel({
        id: 'nav',
        side: 'left',
        children: content,
        rootAttributes,
      }),
  ],
  [
    'CollapsiblePanelToggle',
    () =>
      CollapsiblePanelToggle({
        side: 'left',
        collapsed: false,
        action: 'toggle',
        rootAttributes,
      }),
  ],
  [
    'Combobox',
    () =>
      Combobox({ id: 'c', label: 'Pick', suggestions: ['a'], rootAttributes }),
  ],
  [
    'ContentSwap',
    () => ContentSwap({ active: 'a', a: content, b: content, rootAttributes }),
  ],
  ['CornerStatus', () => CornerStatus({ children: content, rootAttributes })],
  ['DisclosureArrow', () => DisclosureArrow({ open: true, rootAttributes })],
  [
    'EdgeActivityIndicator',
    () => EdgeActivityIndicator({ busy: true, rootAttributes }),
  ],
  ['EmptyState', () => EmptyState({ title: 'Empty', rootAttributes })],
  [
    'FilePickerTrigger',
    () => FilePickerTrigger({ label: 'Add', rootAttributes }),
  ],
  ['FileDropZone', () => FileDropZone({ title: 'Drop', rootAttributes })],
  [
    'FloatingToolbar',
    () =>
      FloatingToolbar({ label: 'Tools', children: content, rootAttributes }),
  ],
  [
    'ListInsetControl',
    () => ListInsetControl({ children: content, rootAttributes }),
  ],
  ['LoadingSpinner', () => LoadingSpinner({ rootAttributes })],
  [
    'LucideIcon',
    () => LucideIcon({ icon: Inbox, name: 'inbox', rootAttributes }),
  ],
  [
    'NavStack',
    () =>
      NavStack({
        id: 'stack',
        label: 'Mail',
        views: [{ key: 'home', content }],
        rootAttributes,
      }),
  ],
  [
    'ResizableRegion',
    () =>
      ResizableRegion({
        id: 'r',
        label: 'Side',
        size: 200,
        min: 100,
        max: 300,
        children: content,
        rootAttributes,
      }),
  ],
  [
    'SearchField',
    () => SearchField({ id: 's', label: 'Search', rootAttributes }),
  ],
  [
    'SegmentedControl',
    () =>
      SegmentedControl({
        id: 'seg',
        label: 'View',
        value: 'a',
        choices,
        rootAttributes,
      }),
  ],
  [
    'Select',
    () =>
      Select({
        name: 'pick',
        label: 'Pick',
        choices,
        value: 'a',
        rootAttributes,
      }),
  ],
  ['Skeleton', () => Skeleton({ rootAttributes })],
  ['Spacer', () => Spacer({ rootAttributes })],
  [
    'SplitView',
    () =>
      SplitView({
        id: 'split',
        label: 'Mail',
        list: content,
        detail: content,
        rootAttributes,
      }),
  ],
  ['SunkenPanel', () => SunkenPanel({ children: content, rootAttributes })],
  ['PopupSurface', () => PopupSurface({ children: content, rootAttributes })],
  [
    'TabBar',
    () =>
      TabBar({ id: 'tabs', label: 'Files', children: content, rootAttributes }),
  ],
  [
    'TabNavigator',
    () =>
      TabNavigator({
        id: 'nav',
        label: 'Sections',
        tabs: [{ id: 'a', label: 'A', content }],
        active: 'a',
        rootAttributes,
      }),
  ],
  [
    'TagField',
    () => TagField({ id: 'tags', label: 'Tags', tags: ['x'], rootAttributes }),
  ],
  ['Toolbar', () => Toolbar({ label: 'Main', rootAttributes })],
  [
    'ToolbarControlGroup',
    () => ToolbarControlGroup({ children: content, rootAttributes }),
  ],
  [
    'ToolbarActionLink',
    () => ToolbarActionLink({ href: '/docs', label: 'Docs', rootAttributes }),
  ],
  ['ToolbarText', () => ToolbarText({ text: 'Title', rootAttributes })],
  [
    'ValuePreview',
    () => ValuePreview({ label: 'Value', value: '42', rootAttributes }),
  ],
  [
    'ValueTable',
    () => ValueTable({ label: 'Facts', children: content, rootAttributes }),
  ],
  [
    'ValueTableRow',
    () => ValueTableRow({ label: 'Owner', value: 'Mara', rootAttributes }),
  ],
  [
    'Workbench',
    () => Workbench({ id: 'wb', label: 'Work', main: content, rootAttributes }),
  ],
];

/** The first element the component renders: its root (or a fragment's first part). */
function rootOf(html: SafeHtml): Element {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  const root = host.firstElementChild;
  if (!root) throw new Error('rendered no element');
  return root;
}

describe('rootAttributes on every component the editor can name', () => {
  it.each(cases)(
    '%s carries application data-* on its root',
    (_name, render) => {
      const root = rootOf(render());
      expect(root.getAttribute('data-kerf-node')).toBe(
        '01JB8Z1M6Q8E1X9V4S7K2R3TRA',
      );
      expect(root.getAttribute('data-key')).toBe('row-1');
      expect(root.getAttribute('data-component')).not.toBe('forged');
    },
  );

  it('keeps every other render unchanged without rootAttributes', () => {
    const plain = EmptyState({ title: 'Empty' });
    expect(String(plain)).not.toContain('data-kerf-node');
    expect(String(LucideIcon({ icon: Inbox, name: 'inbox' }))).not.toContain(
      'data-key',
    );
  });

  it('caches LucideIcon markup per root attributes', () => {
    const one = String(
      LucideIcon({
        icon: Inbox,
        name: 'inbox',
        rootAttributes: { 'data-key': 'one' },
      }),
    );
    const two = String(
      LucideIcon({
        icon: Inbox,
        name: 'inbox',
        rootAttributes: { 'data-key': 'two' },
      }),
    );
    expect(one).toContain('data-key="one"');
    expect(two).toContain('data-key="two"');
  });
});
