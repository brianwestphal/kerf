import type { KerfCatalogId } from '../catalog.js';
import type { RecipeId } from '../recipes/loaders.js';
import { ApplicationTabsDemo } from './application-tabs.js';
import { BadgeDemo } from './badge.js';
import { CollapsiblePanelDemo } from './collapsible-panel.js';
import { DisclosureArrowDemo } from './disclosure-arrow.js';
import { EmptyStateDemo } from './empty-state.js';
import { FeedbackDemo } from './feedback.js';
import { FloatingToolbarDemo } from './floating-toolbar.js';
import { FoundationDemo } from './foundation.js';
import { GridDemo } from './grid.js';
import { HeadersDemo } from './headers.js';
import { LayoutDemo } from './layout.js';
import { ListDemo } from './list.js';
import { ListActionRowDemo } from './list-action-row.js';
import { ListHeaderDemo } from './list-header.js';
import { ListInsetControlDemo } from './list-inset-control.js';
import { ListInsetTextDemo } from './list-inset-text.js';
import { ListItemDemo } from './list-item.js';
import { LoadingSpinnerDemo } from './loading-spinner.js';
import { LucideIconDemo } from './lucide-icon.js';
import { NavStackDemo } from './nav-stack.js';
import { PaneDemo } from './pane.js';
import { ResizeDemo } from './resize.js';
import { RowDemo } from './row.js';
import { SegmentedControlDemo } from './segmented-control.js';
import { SelectDemo } from './select.js';
import { SkeletonDemo } from './skeleton.js';
import { SpacerDemo } from './spacer.js';
import { SplitViewDemo } from './split-view.js';
import { StateBannerDemo } from './state-banner.js';
import { SunkenPanelDemo } from './sunken-panel.js';
import { SurfaceScaffoldDemo } from './surface-scaffold.js';
import { TabBarDemo } from './tab-bar.js';
import { TabScaffoldDemo } from './tab-scaffold.js';
import { TabsDemo } from './tabs.js';
import { TextDemo } from './text.js';
import { TokenSearchFieldDemo } from './token-search-field.js';
import { ToolbarDemo } from './toolbar.js';
import { ToolbarControlGroupDemo } from './toolbar-control-group.js';
import { ToolbarTextDemo } from './toolbar-text.js';
import { ValueTableDemo } from './value-table.js';
import { WorkbenchDemo } from './workbench.js';

export const demos = {
  badge: BadgeDemo,
  'lucide-icon': LucideIconDemo,
  'disclosure-arrow': DisclosureArrowDemo,
  foundation: FoundationDemo,
  layout: LayoutDemo,
  toolbar: ToolbarDemo,
  'toolbar-control-group': ToolbarControlGroupDemo,
  'floating-toolbar': FloatingToolbarDemo,
  'segmented-control': SegmentedControlDemo,
  'token-search-field': TokenSearchFieldDemo,
  'toolbar-text': ToolbarTextDemo,
  text: TextDemo,
  list: ListDemo,
  row: RowDemo,
  grid: GridDemo,
  spacer: SpacerDemo,
  'list-header': ListHeaderDemo,
  'list-action-row': ListActionRowDemo,
  'list-item': ListItemDemo,
  'list-inset-control': ListInsetControlDemo,
  'list-inset-text': ListInsetTextDemo,
  'application-tabs': ApplicationTabsDemo,
  tabs: TabsDemo,
  'tab-bar': TabBarDemo,
  headers: HeadersDemo,
  pane: PaneDemo,
  'nav-stack': NavStackDemo,
  'split-view': SplitViewDemo,
  'tab-scaffold': TabScaffoldDemo,
  workbench: WorkbenchDemo,
  'collapsible-panel': CollapsiblePanelDemo,
  'value-table': ValueTableDemo,
  resize: ResizeDemo,
  select: SelectDemo,
  feedback: FeedbackDemo,
  'state-banner': StateBannerDemo,
  'surface-scaffold': SurfaceScaffoldDemo,
  'sunken-panel': SunkenPanelDemo,
  'empty-state': EmptyStateDemo,
  'loading-spinner': LoadingSpinnerDemo,
  skeleton: SkeletonDemo,
} satisfies Record<
  Exclude<KerfCatalogId, RecipeId>,
  () => ReturnType<typeof LucideIconDemo>
>;
