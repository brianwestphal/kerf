import type { KerfCatalogId } from '../catalog.js';
import type { RecipeId } from '../recipes/loaders.js';
import { AnchoredSurfaceDemo } from './anchored-surface.js';
import { ApplicationTabsDemo } from './application-tabs.js';
import { BackdropImageDemo } from './backdrop-image.js';
import { BadgeDemo, BadgeSettings } from './badge.js';
import { ButtonDemo } from './button.js';
import { CheckboxDemo } from './checkbox.js';
import { ChipDemo } from './chip.js';
import { ChoiceChipsDemo } from './choice-chips.js';
import { CollapsiblePanelDemo } from './collapsible-panel.js';
import { ColorSwatchesDemo } from './color-swatches.js';
import { ColumnTrackDemo } from './column-track.js';
import { ComboboxDemo } from './combobox.js';
import { ContentItemDemo } from './content-item.js';
import { ContentSwapDemo } from './content-swap.js';
import { CornerStatusDemo } from './corner-status.js';
import { DisclosureDemo } from './disclosure.js';
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
import { LayoutDemo } from './layout.js';
import { ListDemo } from './list.js';
import { ListActionRowDemo } from './list-action-row.js';
import { ListDetailDialogDemo } from './list-detail-dialog.js';
import { ListHeaderDemo } from './list-header.js';
import { ListInsetControlDemo } from './list-inset-control.js';
import { ListInsetTextDemo } from './list-inset-text.js';
import { ListItemDemo } from './list-item.js';
import { LoadingSpinnerDemo } from './loading-spinner.js';
import { LucideIconDemo } from './lucide-icon.js';
import { MessageComposerDemo } from './message-composer.js';
import { NavStackDemo } from './nav-stack.js';
import { PaneDemo } from './pane.js';
import { PopupMenuDemo } from './popup-menu.js';
import { ProgressBarDemo } from './progress-bar.js';
import { ProgressRingDemo } from './progress-ring.js';
import { RadioGroupDemo } from './radio-group.js';
import { ResizeDemo } from './resize.js';
import { RowDemo } from './row.js';
import { SearchFieldDemo } from './search-field.js';
import { SegmentedControlDemo } from './segmented-control.js';
import { SelectDemo } from './select.js';
import { SkeletonDemo } from './skeleton.js';
import { SliderDemo } from './slider.js';
import { SpacerDemo } from './spacer.js';
import { SplitButtonDemo } from './split-button.js';
import { SplitViewDemo } from './split-view.js';
import { StateBannerDemo } from './state-banner.js';
import { SummaryRowDemo } from './summary-row.js';
import { SunkenPanelDemo } from './sunken-panel.js';
import { SurfaceScaffoldDemo } from './surface-scaffold.js';
import { SwitchDemo } from './switch.js';
import { TabBarDemo } from './tab-bar.js';
import { TabNavigatorDemo } from './tab-navigator.js';
import { TabsDemo } from './tabs.js';
import { TagFieldDemo } from './tag-field.js';
import { TextDemo } from './text.js';
import { TextFieldDemo } from './text-field.js';
import { ToastDemo } from './toast.js';
import { ToolbarDemo } from './toolbar.js';
import { ToolbarControlGroupDemo } from './toolbar-control-group.js';
import { ToolbarTextDemo } from './toolbar-text.js';
import { TooltipDemo } from './tooltip.js';
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
  'color-swatches': ColorSwatchesDemo,
  disclosure: DisclosureDemo,
  'list-detail-dialog': ListDetailDialogDemo,
  'progress-bar': ProgressBarDemo,
  'progress-ring': ProgressRingDemo,
  'message-composer': MessageComposerDemo,
  slider: SliderDemo,
  'tag-field': TagFieldDemo,
  toast: ToastDemo,
  tooltip: TooltipDemo,
  'search-field': SearchFieldDemo,
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
  button: ButtonDemo,
  'text-field': TextFieldDemo,
  checkbox: CheckboxDemo,
  'radio-group': RadioGroupDemo,
  switch: SwitchDemo,
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
