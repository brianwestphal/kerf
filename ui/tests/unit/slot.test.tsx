import type { SafeHtml } from 'kerfjs';
import { Circle } from 'lucide';
import { describe, expect, it } from 'vitest';

import {
  Catalog,
  CatalogExample,
  CatalogExampleStack,
} from '../../src/catalog.js';
import { CollapsiblePanelToggle } from '../../src/collapsible-panel.js';
import {
  AppTab,
  Badge,
  DialogSurface,
  DisclosureArrow,
  EmptyState,
  FloatingToolbar,
  Grid,
  List,
  ListActionRow,
  ListHeader,
  ListInsetControl,
  ListInsetText,
  ListItem,
  LoadingSpinner,
  LucideIcon,
  Pane,
  PopupSurface,
  Row,
  SegmentedControl,
  Select,
  Skeleton,
  Spacer,
  StateBanner,
  SunkenPanel,
  TabBar,
  Text,
  TokenSearchField,
  Toolbar,
  ToolbarActionLink,
  ToolbarControlGroup,
  ToolbarText,
  ValueTable,
  ValueTableRow,
} from '../../src/index.js';
import { NavStack } from '../../src/nav-stack.js';
import { SplitView } from '../../src/split-view.js';
import { TabScaffold } from '../../src/tab-scaffold.js';
import { Workbench } from '../../src/workbench.js';

type SlotCase = {
  name: string;
  render: (slot?: string) => SafeHtml;
};

const content = Text({ children: 'Content' });
const catalogSections = [
  { category: 'Group', entries: [{ id: 'entry', name: 'Entry' }] },
] as const;

const cases: SlotCase[] = [
  {
    name: 'AppTab',
    render: (slot) => AppTab({ id: 'tab', name: 'Tab', slot }),
  },
  { name: 'Badge', render: (slot) => Badge({ children: '1', slot }) },
  {
    name: 'Catalog',
    render: (slot) =>
      Catalog({
        brand: { title: 'Catalog' },
        sections: catalogSections,
        active: 'entry',
        content,
        slot,
      }),
  },
  {
    name: 'CatalogExample',
    render: (slot) => CatalogExample({ children: content, slot }),
  },
  {
    name: 'CatalogExampleStack',
    render: (slot) => CatalogExampleStack({ children: content, slot }),
  },
  {
    name: 'CollapsiblePanelToggle',
    render: (slot) =>
      CollapsiblePanelToggle({
        side: 'left',
        collapsed: false,
        action: 'toggle',
        slot,
      }),
  },
  {
    name: 'DialogSurface',
    render: (slot) => DialogSurface({ children: content, slot }),
  },
  {
    name: 'DisclosureArrow',
    render: (slot) => DisclosureArrow({ open: false, slot }),
  },
  {
    name: 'EmptyState',
    render: (slot) => EmptyState({ title: 'Empty', slot }),
  },
  {
    name: 'FloatingToolbar',
    render: (slot) =>
      FloatingToolbar({ children: content, label: 'Tools', slot }),
  },
  {
    name: 'Grid',
    render: (slot) => Grid({ columns: 1, children: content, slot }),
  },
  { name: 'List', render: (slot) => List({ children: content, slot }) },
  {
    name: 'ListActionRow',
    render: (slot) =>
      ListActionRow({
        label: 'Action',
        action: 'open',
        trailingAction: 'more',
        trailingActionLabel: 'More',
        trailingActionIcon: content,
        slot,
      }),
  },
  {
    name: 'ListHeader passive',
    render: (slot) => ListHeader({ label: 'Header', slot }),
  },
  {
    name: 'ListHeader toggle',
    render: (slot) =>
      ListHeader({
        label: 'Header',
        toggle: true,
        action: 'toggle',
        expanded: false,
        slot,
      }),
  },
  {
    name: 'ListInsetControl',
    render: (slot) => ListInsetControl({ children: content, slot }),
  },
  {
    name: 'ListInsetText',
    render: (slot) => ListInsetText({ children: 'Copy', slot }),
  },
  {
    name: 'ListItem',
    render: (slot) => ListItem({ label: 'Item', action: 'open', slot }),
  },
  { name: 'LoadingSpinner', render: (slot) => LoadingSpinner({ slot }) },
  {
    name: 'LucideIcon',
    render: (slot) => LucideIcon({ icon: Circle, name: 'circle', slot }),
  },
  {
    name: 'NavStack',
    render: (slot) =>
      NavStack({
        id: 'stack',
        label: 'Stack',
        views: [{ key: 'root', content }],
        slot,
      }),
  },
  ...(['article', 'aside', 'div', 'main', 'section'] as const).map(
    (element): SlotCase => ({
      name: `Pane ${element}`,
      render: (slot) => Pane({ element, children: content, slot }),
    }),
  ),
  {
    name: 'PopupSurface',
    render: (slot) => PopupSurface({ children: content, slot }),
  },
  { name: 'Row', render: (slot) => Row({ children: content, slot }) },
  {
    name: 'SegmentedControl',
    render: (slot) =>
      SegmentedControl({
        id: 'segments',
        label: 'Segments',
        value: 'one',
        choices: [{ value: 'one', label: 'One' }],
        slot,
      }),
  },
  {
    name: 'Select',
    render: (slot) =>
      Select({
        name: 'choice',
        label: 'Choice',
        value: 'one',
        choices: [{ value: 'one', label: 'One' }],
        slot,
      }),
  },
  {
    name: 'Select placeholder',
    render: (slot) =>
      Select({
        name: 'choice',
        label: 'Choice',
        value: 'one',
        choices: [{ value: 'one', label: 'One' }],
        placeholder: true,
        slot,
      }),
  },
  { name: 'Skeleton', render: (slot) => Skeleton({ slot }) },
  { name: 'Skeleton lines', render: (slot) => Skeleton({ lines: 2, slot }) },
  { name: 'Spacer', render: (slot) => Spacer({ slot }) },
  {
    name: 'SplitView split',
    render: (slot) =>
      SplitView({
        id: 'split',
        label: 'Split',
        list: content,
        detail: content,
        slot,
      }),
  },
  {
    name: 'SplitView compact',
    render: (slot) =>
      SplitView({
        id: 'split',
        label: 'Split',
        list: content,
        detail: content,
        compact: true,
        slot,
      }),
  },
  {
    name: 'StateBanner',
    render: (slot) => StateBanner({ title: 'State', slot }),
  },
  {
    name: 'SunkenPanel',
    render: (slot) => SunkenPanel({ children: content, slot }),
  },
  {
    name: 'TabBar',
    render: (slot) =>
      TabBar({ id: 'tabs', label: 'Tabs', children: content, slot }),
  },
  {
    name: 'TabScaffold',
    render: (slot) =>
      TabScaffold({
        id: 'scaffold',
        label: 'Tabs',
        active: 'one',
        tabs: [{ id: 'one', label: 'One', content }],
        slot,
      }),
  },
  { name: 'Text', render: (slot) => Text({ children: 'Copy', slot }) },
  {
    name: 'TokenSearchField',
    render: (slot) => TokenSearchField({ id: 'search', label: 'Search', slot }),
  },
  { name: 'Toolbar', render: (slot) => Toolbar({ leading: content, slot }) },
  {
    name: 'ToolbarActionLink',
    render: (slot) => ToolbarActionLink({ href: '/', label: 'Home', slot }),
  },
  {
    name: 'ToolbarControlGroup',
    render: (slot) => ToolbarControlGroup({ children: content, slot }),
  },
  {
    name: 'ToolbarText',
    render: (slot) => ToolbarText({ text: 'Title', slot }),
  },
  {
    name: 'ValueTable',
    render: (slot) => ValueTable({ label: 'Values', children: content, slot }),
  },
  {
    name: 'ValueTableRow',
    render: (slot) => ValueTableRow({ label: 'Name', value: 'Value', slot }),
  },
  {
    name: 'Workbench',
    render: (slot) =>
      Workbench({ id: 'workbench', label: 'Workbench', main: content, slot }),
  },
];

function openingTag(rendered: SafeHtml): string {
  const html = String(rendered);
  return html.slice(0, html.indexOf('>') + 1);
}

describe('native slot forwarding', () => {
  it.each(cases)('$name forwards slot to every stable root', ({ render }) => {
    expect(openingTag(render('named'))).toContain('slot="named"');
  });

  it.each(cases)('$name omits slot when it is not supplied', ({ render }) => {
    expect(openingTag(render())).not.toContain(' slot=');
  });
});
