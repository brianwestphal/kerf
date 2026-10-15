import type { KerfCatalogId } from '../catalog.js';
import type { RecipeId } from '../recipes/loaders.js';
import { AnchoredSurfaceDemo } from './anchored-surface.js';
import { ApplicationTabsDemo } from './application-tabs.js';
import { BackdropImageDemo } from './backdrop-image.js';
import { BadgeDemo, BadgeSettings } from './badge.js';
import { ButtonDemo } from './button.js';
import { ChipDemo } from './chip.js';
import { ChoiceChipsDemo } from './choice-chips.js';
import { CollapsiblePanelDemo } from './collapsible-panel.js';
import { ColumnTrackDemo } from './column-track.js';
import { ComboboxDemo } from './combobox.js';
import { ComposerDemo } from './composer.js';
import { ContentItemDemo } from './content-item.js';
import { ContentSwapDemo } from './content-swap.js';
import { CornerStatusDemo } from './corner-status.js';
import { DisclosureArrowDemo } from './disclosure-arrow.js';
import { DocumentBaselineDemo } from './document-baseline.js';
import { EdgeActivityIndicatorDemo } from './edge-activity-indicator.js';
import { EmptyStateDemo } from './empty-state.js';
import { FeedbackDemo } from './feedback.js';
import { FilePickerDemo } from './file-picker.js';
import { FloatingToolbarDemo } from './floating-toolbar.js';
import { FoundationDemo } from './foundation.js';
import { FramedListDemo } from './framed-list.js';
import { GridDemo } from './grid.js';
import { HeadersDemo } from './headers.js';
import { IconButtonDemo } from './icon-button.js';
import { IconToggleButtonDemo } from './icon-toggle-button.js';
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
import { PopupMenuDemo } from './popup-menu.js';
import { ResizeDemo } from './resize.js';
import { RowDemo } from './row.js';
import { SegmentedControlDemo } from './segmented-control.js';
import { SelectDemo } from './select.js';
import { SkeletonDemo } from './skeleton.js';
import { SpacerDemo } from './spacer.js';
import { SplitButtonDemo } from './split-button.js';
import { SplitViewDemo } from './split-view.js';
import { StateBannerDemo } from './state-banner.js';
import { SummaryRowDemo } from './summary-row.js';
import { SunkenPanelDemo } from './sunken-panel.js';
import { SurfaceScaffoldDemo } from './surface-scaffold.js';
import { TabBarDemo } from './tab-bar.js';
import { TabNavigatorDemo } from './tab-navigator.js';
import { TabsDemo } from './tabs.js';
import { TextDemo } from './text.js';
import { TokenSearchFieldDemo } from './token-search-field.js';
import { ToolbarDemo } from './toolbar.js';
import { ToolbarControlGroupDemo } from './toolbar-control-group.js';
import { ToolbarTextDemo } from './toolbar-text.js';
import { ValueTableDemo } from './value-table.js';
import { WorkbenchDemo } from './workbench.js';

export const demos = {
  'anchored-surface': AnchoredSurfaceDemo,
  badge: BadgeDemo,
  chip: ChipDemo,
  'lucide-icon': LucideIconDemo,
  'disclosure-arrow': DisclosureArrowDemo,
  foundation: FoundationDemo,
  'document-baseline': DocumentBaselineDemo,
  layout: LayoutDemo,
  toolbar: ToolbarDemo,
  'toolbar-control-group': ToolbarControlGroupDemo,
  'floating-toolbar': FloatingToolbarDemo,
  'segmented-control': SegmentedControlDemo,
  'choice-chips': ChoiceChipsDemo,
  composer: ComposerDemo,
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
  'content-item': ContentItemDemo,
  'application-tabs': ApplicationTabsDemo,
  tabs: TabsDemo,
  'tab-bar': TabBarDemo,
  headers: HeadersDemo,
  pane: PaneDemo,
  'nav-stack': NavStackDemo,
  'split-view': SplitViewDemo,
  'tab-navigator': TabNavigatorDemo,
  workbench: WorkbenchDemo,
  'collapsible-panel': CollapsiblePanelDemo,
  'value-table': ValueTableDemo,
  resize: ResizeDemo,
  select: SelectDemo,
  feedback: FeedbackDemo,
  'state-banner': StateBannerDemo,
  'popup-menu': PopupMenuDemo,
  'surface-scaffold': SurfaceScaffoldDemo,
  'corner-status': CornerStatusDemo,
  'column-track': ColumnTrackDemo,
  'content-swap': ContentSwapDemo,
  'backdrop-image': BackdropImageDemo,
  'file-picker': FilePickerDemo,
  combobox: ComboboxDemo,
  'summary-row': SummaryRowDemo,
  'edge-activity-indicator': EdgeActivityIndicatorDemo,
  'icon-button': IconButtonDemo,
  button: ButtonDemo,
  'icon-toggle-button': IconToggleButtonDemo,
  'split-button': SplitButtonDemo,
  'framed-list': FramedListDemo,
  'sunken-panel': SunkenPanelDemo,
  'empty-state': EmptyStateDemo,
  'loading-spinner': LoadingSpinnerDemo,
  skeleton: SkeletonDemo,
} satisfies Record<
  Exclude<KerfCatalogId, RecipeId>,
  () => ReturnType<typeof LucideIconDemo>
>;

/** Entries whose preview has settings, rendered in the Catalog's settings pane. */
export const demoSettings: Partial<
  Record<
    Exclude<KerfCatalogId, RecipeId>,
    () => ReturnType<typeof BadgeSettings>
  >
> = {
  badge: BadgeSettings,
};
