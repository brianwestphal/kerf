import type {
  AppTabNameOverflow,
  AppTabPresentation,
  AppTabSize,
  KerfUiContent,
  SelectFocusRingOwner,
  SelectPresentation,
  SelectSelectedPresentation,
  SelectSize,
  SemanticTone,
  TabBarAllocation,
  TabBarPresentation,
  TabBarTrailingPlacement,
  TextFont,
  TextSize,
  TextTone,
  TextVariant,
  ToolbarControlGroupContent,
  ToolbarControlGroupDensity,
  ToolbarControlGroupSelectedChrome,
  ToolbarControlGroupSelectedTone,
  ToolbarControlGroupSize,
} from '@kerfjs/ui';
import { type CssValue, em, px } from '@kerfjs/ui';
import * as UI from '@kerfjs/ui';
import { Badge, type BadgeTone } from '@kerfjs/ui/badge';
import {
  Catalog,
  CatalogExample,
  CatalogExampleStack,
} from '@kerfjs/ui/catalog';
import { Chip } from '@kerfjs/ui/chip';
import {
  CollapsiblePanel,
  CollapsiblePanelToggle,
} from '@kerfjs/ui/collapsible-panel';
import {
  ContentItem,
  type ContentItemAppearance,
  type ContentItemFrame,
  type ContentItemShape,
} from '@kerfjs/ui/content-item';
import {
  calc,
  colorVar,
  type CssColor,
  type CssFlex,
  type CssForegroundColor,
  type CssLength,
  type CssLengthExpression,
  type CssSize,
  flex,
  foregroundColor,
  foregroundColorVar,
  lengthVar,
  pct,
  plus,
  rem,
  space,
  uiColor,
  type UiSpaceName,
} from '@kerfjs/ui/css-values';
import {
  buildEvaluationContexts,
  type UiEvaluationContext,
} from '@kerfjs/ui/evaluator';
import { Grid } from '@kerfjs/ui/grid';
import { List, type Sides } from '@kerfjs/ui/list';
import { ListActionRow } from '@kerfjs/ui/list-action-row';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { NavStack } from '@kerfjs/ui/nav-stack';
import { ResizableRegion } from '@kerfjs/ui/resizable-region';
import {
  type HorizontalAlignment,
  Row,
  type VerticalAlignment,
} from '@kerfjs/ui/row';
import { SegmentedControl } from '@kerfjs/ui/segmented-control';
import { Select, type SelectChoice } from '@kerfjs/ui/select';
import { Skeleton } from '@kerfjs/ui/skeleton';
import { Spacer } from '@kerfjs/ui/spacer';
import { SplitView } from '@kerfjs/ui/split-view';
import {
  StateBanner,
  type StateBannerTone,
  type StateBannerUrgency,
} from '@kerfjs/ui/state-banner';
import { SunkenPanel, type SunkenPanelShape } from '@kerfjs/ui/sunken-panel';
import { type TabActivation, TabBar } from '@kerfjs/ui/tab-bar';
import { TabScaffold } from '@kerfjs/ui/tab-scaffold';
import { Text } from '@kerfjs/ui/text';
import {
  type TokenSearchEditorAttributes,
  TokenSearchField,
} from '@kerfjs/ui/token-search-field';
import { Toolbar } from '@kerfjs/ui/toolbar';
import {
  ToolbarControlGroup,
  type ToolbarControlGroupAppearance,
  type ToolbarControlGroupButtonAppearance,
  type ToolbarControlGroupShape,
  type ToolbarControlGroupTone,
} from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import type {} from '@kerfjs/ui/webawesome';
import type { CatalogRevealOptions } from '@kerfjs/ui/wire-catalog';
import {
  type ScrollDividerTarget,
  wireScrollDividers,
} from '@kerfjs/ui/wire-scroll-dividers';
import { wireTokenSearchFields } from '@kerfjs/ui/wire-token-search-fields';
import { Workbench } from '@kerfjs/ui/workbench';

const icon = ToolbarText({ text: 'Icon' });
Chip({
  children: 'Urgent',
  removeAction: 'remove-tag',
  removeLabel: 'Remove Urgent tag',
});
Chip({ children: 'Backlog', size: 'compact', disabled: true });
// @ts-expect-error A removable chip requires a specific accessible name.
Chip({ children: 'Unlabeled', removeAction: 'remove-tag' });
// @ts-expect-error A plain chip cannot carry an orphan remove label.
Chip({ children: 'Unlabeled', removeLabel: 'Remove tag' });
const textVariant: TextVariant = 'h3';
const inlineTextVariant: TextVariant = 'span';
const textTone: TextTone = 'quiet';
const textSize: TextSize = 'compact';
const textFont: TextFont = 'monospace';
Text({
  variant: textVariant,
  tone: textTone,
  size: textSize,
  font: textFont,
  class: 'section-title',
  id: 'section-title',
  'aria-describedby': 'section-summary',
  children: 'Section',
});
Text({ children: 'Paragraph by default' });
Text({ children: 'Warning', color: uiColor('warning-on-quiet') });
Text({ children: 'Custom', color: foregroundColor('rebeccapurple') });
// @ts-expect-error Text colors require a foreground token or explicit custom-color builder.
Text({ children: 'Invalid', color: uiColor('warning-fill-quiet') });
// @ts-expect-error Raw color strings do not bypass the typed color contract.
Text({ children: 'Invalid', color: 'red' });
Text({ variant: inlineTextVariant, children: 'Inline metadata' });
// @ts-expect-error Text variants are limited to native headings, paragraphs, and spans.
Text({ variant: 'div', children: 'Invalid' });
// @ts-expect-error Text tones are a finite semantic vocabulary.
Text({ tone: 'muted', children: 'Invalid' });
// @ts-expect-error Text sizes are independent of heading variants and finite.
Text({ size: 'small', children: 'Invalid' });
// @ts-expect-error Text fonts are a finite role vocabulary.
Text({ font: 'code', children: 'Invalid' });

// KUI-T012 positive: complete branded lengths and finite spacing shorthands
// compose without accepting intermediate expressions or arbitrary CSS strings.
const expression: CssLengthExpression = plus(rem(0.25), pct(10));
const responsiveGap: CssLength = calc(expression);
const genericCssValue: CssValue = responsiveGap;
const spacingName: UiSpaceName = 'xs';
List({ gap: spacingName });
List({ gap: responsiveGap });
List({ gap: space('m') });
List({ gap: lengthVar('--app-gap', px(4)) });
List({ gap: em(0.5) });
Row({ gap: spacingName });
Row({ gap: responsiveGap });
Grid({ columns: 3, gap: spacingName });
Grid({ columns: 3, gap: responsiveGap });
Grid({ minColumnWidth: px(376), gap: 'm' });
// @ts-expect-error Grid modes cannot combine a fixed count and minimum width.
Grid({ columns: 2, minColumnWidth: px(376) });
// @ts-expect-error Grid autoFill is only meaningful with a minimum column width.
Grid({ columns: 2, autoFill: true });
Grid({ minColumnWidth: px(160), autoFill: true });
// @ts-expect-error Responsive Grid requires a typed CSS length.
Grid({ minColumnWidth: '376px' });
Spacer({ width: spacingName, height: responsiveGap, flex: true });
void genericCssValue;
// @ts-expect-error KUI-T012 an incomplete expression must be wrapped in calc().
List({ gap: expression });
// @ts-expect-error KUI-T012 raw CSS strings do not satisfy the typed length contract.
List({ gap: '0.25rem' });
// @ts-expect-error KUI-T012 Row uses the same typed gap contract.
Row({ gap: '0.25rem' });
// @ts-expect-error KUI-T012 Grid uses the same typed gap contract.
Grid({ columns: 2, gap: '0.25rem' });
// @ts-expect-error KUI-T012 Spacer dimensions use the same typed length contract.
Spacer({ width: '0.25rem' });
// @ts-expect-error KUI-T012 spacing shorthands are a finite vocabulary.
space('xxs');
// @ts-expect-error KUI-T012 custom property names keep their leading dashes.
lengthVar('app-gap');

// KUI-T013 positive: each remaining CSS-valued prop accepts only its own
// grammar, while semantic keywords remain finite and media queries stay raw.
const listFlex: CssFlex = flex(2, 1, rem(20));
const skeletonWidth: CssSize = pct(60);
const choiceColor: CssForegroundColor = foregroundColorVar(
  '--app-choice-color',
  uiColor('success-on-quiet'),
);
const semanticChoiceColor: CssForegroundColor = uiColor('text-quiet');
const onQuietChoiceColor: CssForegroundColor = uiColor('warning-on-quiet');
// A foreground color is still a complete color; a fill stays a plain color.
const foregroundIsColor: CssColor = choiceColor;
const fillColor: CssColor = colorVar(
  '--app-fill-color',
  uiColor('success-fill-quiet'),
);
void [semanticChoiceColor, onQuietChoiceColor, foregroundIsColor, fillColor];
List({ flex: listFlex });
List({ flex: 'none' });
Row({ flex: listFlex });
Row({ flex: true });
Row({ flex: 'auto' });
Grid({ columns: 2, flex: listFlex });
Grid({ columns: 2, flex: true });
Grid({ columns: 2, flex: 'initial' });
const horizontalAlignment: HorizontalAlignment = 'space-between';
const verticalAlignment: VerticalAlignment = 'space-around';
Row({
  hAlign: horizontalAlignment,
  vAlign: verticalAlignment,
  wrap: true,
});
Row({ vAlign: 'baseline' });
List({ hAlign: 'c', vAlign: 'b' });
// @ts-expect-error alignment aliases are finite.
Row({ hAlign: 'between' });
// @ts-expect-error alignment aliases are finite.
List({ vAlign: 'baseline' });
Skeleton({ width: skeletonWidth, height: em(1.5), radius: px(999) });
Skeleton({ width: 'fit-content' });
const coloredChoice: SelectChoice<'ready'> = {
  value: 'ready',
  label: 'Ready',
  color: choiceColor,
};
Select({
  name: 'state',
  value: 'ready',
  label: 'State',
  labelMaxWidth: 120,
  choices: [coloredChoice],
});
Select<'bug' | 'docs'>({
  name: 'labels',
  multiple: true,
  value: ['bug'],
  label: 'Labels',
  selectAllLabel: 'Select all',
  clearLabel: 'Clear',
  choices: [
    { value: 'bug', label: 'Bug' },
    {
      value: 'docs',
      label: 'Docs',
      disabled: true,
      disabledReason: 'Unavailable',
    },
  ],
});
// @ts-expect-error Bulk actions are only available for multiple Selects.
Select({
  name: 'state',
  value: 'ready',
  label: 'State',
  choices: [],
  selectAllLabel: 'Select all',
});
// @ts-expect-error A multiple Select's value is an array of choice values.
Select({
  name: 'labels',
  multiple: true,
  value: 'bug',
  label: 'Labels',
  choices: [],
});
// @ts-expect-error A single Select's value is one choice value, not an array.
Select({ name: 'state', value: ['ready'], label: 'State', choices: [] });
Select({
  name: 'labels',
  multiple: true,
  value: [],
  label: 'Labels',
  choices: [],
  // @ts-expect-error A multiple Select summarizes its labels; it has no single selected choice to render.
  renderSelected: () => undefined,
});
const filterIcon = UI.LucideIcon({ icon: [], name: 'funnel' });
UI.LucideIcon({ icon: [], name: 'star', appearance: 'solid' });
UI.LucideIcon({
  icon: [],
  name: 'alert',
  color: UI.uiColor('warning-on-quiet'),
});
UI.LucideIcon({
  icon: [],
  name: 'custom',
  color: UI.foregroundColor('rgba(20, 40, 60, 0.8)'),
});
UI.LucideIcon({
  icon: [],
  name: 'pale',
  // @ts-expect-error Icon colors require a foreground token or explicit custom-color builder.
  color: UI.uiColor('warning-fill-quiet'),
});
// @ts-expect-error Raw color strings do not bypass the typed color contract.
UI.LucideIcon({ icon: [], name: 'raw', color: 'red' });
// @ts-expect-error LucideIcon appearance accepts only outline or solid.
UI.LucideIcon({ icon: [], name: 'star', appearance: 'filled' });
// A multiple icon-only trigger (a toolbar filter menu) shows a fixed icon.
Select<'bug' | 'docs'>({
  name: 'label-filter',
  multiple: true,
  value: ['bug'],
  ariaLabel: 'Filter by label',
  presentation: 'toolbar-borderless',
  selectedPresentation: 'icon-only',
  triggerIcon: filterIcon,
  choices: [
    { value: 'bug', label: 'Bug' },
    { value: 'docs', label: 'Docs' },
  ],
});
// @ts-expect-error A multiple icon-only trigger has no selected choice icon, so it needs a triggerIcon.
Select({
  name: 'labels',
  multiple: true,
  value: [],
  label: 'Labels',
  choices: [],
  selectedPresentation: 'icon-only',
});
// @ts-expect-error A label-presentation multiple Select shows its summary, not a trigger icon.
Select({
  name: 'labels',
  multiple: true,
  value: [],
  label: 'Labels',
  choices: [],
  triggerIcon: filterIcon,
});
// @ts-expect-error A single Select's icon-only trigger shows the selected choice's icon.
Select({
  name: 'state',
  value: 'ready',
  label: 'State',
  choices: [],
  selectedPresentation: 'icon-only',
  triggerIcon: filterIcon,
});
const responsiveReveal: CatalogRevealOptions = {
  media: '(max-width: 40rem)',
};
void responsiveReveal;
// @ts-expect-error KUI-T013 raw flex strings bypass the structured flex grammar.
List({ flex: '2 1 20rem' });
// @ts-expect-error KUI-T013 lengths are not complete flex shorthands.
List({ flex: rem(20) });
// @ts-expect-error KUI-T013 Row rejects raw flex strings too.
Row({ flex: '2 1 20rem' });
// @ts-expect-error KUI-T013 Row flex does not accept a length grammar.
Row({ flex: rem(20) });
// @ts-expect-error KUI-T013 Grid rejects raw flex strings too.
Grid({ columns: 2, flex: '2 1 20rem' });
// @ts-expect-error KUI-T013 Grid flex does not accept a length grammar.
Grid({ columns: 2, flex: rem(20) });
// @ts-expect-error Grid requires an explicit equal-track count.
Grid({});
// @ts-expect-error Grid column counts are numeric.
Grid({ columns: '2' });
// @ts-expect-error KUI-T013 raw dimension strings bypass the size grammar.
Skeleton({ width: '10em' });
// @ts-expect-error KUI-T013 a flex shorthand is not a dimension.
Skeleton({ height: listFlex });
// @ts-expect-error KUI-T013 radius accepts lengths, not intrinsic size keywords.
Skeleton({ radius: 'fit-content' });
const rawColorChoice: SelectChoice = {
  value: 'raw',
  label: 'Raw',
  // @ts-expect-error KUI-T013 choice icon colors require a semantic or application-owned color.
  color: 'red',
};
void rawColorChoice;
const lengthColorChoice: SelectChoice = {
  value: 'wrong',
  label: 'Wrong',
  // @ts-expect-error KUI-T013 length values are not color values.
  color: px(1),
};
void lengthColorChoice;
// @ts-expect-error KUI-T013 the removed pre-release color aliases are not token names.
uiColor('success');
const fillTokenChoice: SelectChoice = {
  value: 'fill-token',
  label: 'Fill token',
  // @ts-expect-error KUI-T013 fill tokens are not foreground tokens.
  color: uiColor('danger-fill-quiet'),
};
void fillTokenChoice;
const plainVarChoice: SelectChoice = {
  value: 'plain-var',
  label: 'Plain var',
  // @ts-expect-error KUI-T013 an unqualified app color may be a fill; use foregroundColorVar().
  color: colorVar('--app-choice-color'),
};
void plainVarChoice;
// @ts-expect-error KUI-T013 a foreground fallback cannot be a fill token.
foregroundColorVar('--app-choice-color', uiColor('warning-fill-quiet'));
// @ts-expect-error KUI-T013 row declaration strings were removed; use className and public tokens.
ListItem({ label: 'Item', style: 'color:red' });
// @ts-expect-error KUI-T013 row declaration strings were removed; use className and public tokens.
ListActionRow({ label: 'Action', style: 'color:red' });

// KUI-T011 positive: semantic component zones accept recursively nested,
// readonly component content and runtime-empty values.
const semanticContent: KerfUiContent = [icon, [false, null, undefined]];
List({ children: semanticContent });
// @ts-expect-error KUI-T011 semantic component zones reject arbitrary raw text.
List({ children: 'plain text' });

const evaluationContexts: UiEvaluationContext[] = buildEvaluationContexts();
void evaluationContexts;

// KUI-T014 positive: every stable single-root visual component accepts the
// explicit native slot attribute without opening an arbitrary-attribute bag.
const slottedContent = UI.Text({ children: 'Content', slot: 'named' });
UI.AppTab({ id: 'tab', name: 'Tab', slot: 'named' });
const appTabNameOverflow: AppTabNameOverflow = 'visible';
UI.AppTab({
  id: 'drop',
  name: 'Drop target',
  dropTarget: true,
  pinned: true,
  nameOverflow: appTabNameOverflow,
});
// @ts-expect-error AppTab name overflow has a finite public vocabulary.
UI.AppTab({ id: 'bad-overflow', name: 'Bad', nameOverflow: 'wrap' });
UI.Badge({ children: '1', slot: 'named' });
Catalog({
  brand: { title: 'Catalog' },
  sections: [{ category: 'Group', entries: [{ id: 'entry', name: 'Entry' }] }],
  active: 'entry',
  content: slottedContent,
  slot: 'named',
});
CatalogExample({ children: slottedContent, slot: 'named' });
CatalogExampleStack({ children: slottedContent, slot: 'named' });
CollapsiblePanelToggle({
  side: 'left',
  collapsed: false,
  action: 'toggle',
  slot: 'named',
});
UI.DialogSurface({ children: slottedContent, slot: 'named' });
UI.DisclosureArrow({ open: false, slot: 'named' });
UI.EmptyState({ title: 'Empty', slot: 'named' });
UI.FloatingToolbar({ children: slottedContent, label: 'Tools', slot: 'named' });
UI.Grid({ columns: 1, children: slottedContent, slot: 'named' });
UI.List({ children: slottedContent, slot: 'named' });
UI.ListActionRow({
  label: 'Action',
  action: 'open',
  trailingAction: 'more',
  trailingActionLabel: 'More',
  trailingActionIcon: slottedContent,
  slot: 'named',
});
UI.ListHeader({ label: 'Header', slot: 'named' });
UI.ListInsetControl({ children: slottedContent, slot: 'named' });
UI.ListInsetText({ children: 'Copy', slot: 'named' });
UI.ContentItem({ children: slottedContent, slot: 'named' });
UI.ListItem({ label: 'Item', action: 'open', slot: 'named' });
UI.ListItemLink({
  label: 'Item',
  href: '/item',
  external: true,
  slot: 'named',
});
// @ts-expect-error links own href navigation, not action dispatch
UI.ListItemLink({ label: 'Item', href: '/item', action: 'open' });
// @ts-expect-error pressed applies to button actions, not links
UI.ListItemLink({ label: 'Item', href: '/item', pressed: true });
UI.LoadingSpinner({ slot: 'named' });
UI.LoadingSpinner({ color: UI.uiColor('warning-on-quiet') });
UI.LoadingSpinner({ color: UI.foregroundColor('rebeccapurple') });
// @ts-expect-error Spinner colors require a foreground token or explicit custom-color builder.
UI.LoadingSpinner({ color: UI.uiColor('warning-fill-quiet') });
// @ts-expect-error Raw color strings do not bypass the typed color contract.
UI.LoadingSpinner({ color: 'red' });
UI.LucideIcon({ icon: [], name: 'empty', slot: 'named' });
NavStack({
  id: 'stack',
  label: 'Stack',
  views: [{ key: 'root', content: slottedContent }],
  slot: 'named',
});
UI.Pane({ children: slottedContent, slot: 'named' });
UI.PopupSurface({ children: slottedContent, slot: 'named' });
UI.Row({ children: slottedContent, slot: 'named' });
UI.SegmentedControl({
  id: 'segments',
  label: 'Segments',
  value: 'one',
  choices: [{ value: 'one', label: 'One' }],
  slot: 'named',
});
UI.Select({
  name: 'choice',
  label: 'Choice',
  value: 'one',
  choices: [{ value: 'one', label: 'One' }],
  slot: 'named',
});
UI.Skeleton({ slot: 'named' });
UI.Spacer({ slot: 'named' });
SplitView({
  id: 'split',
  label: 'Split',
  list: slottedContent,
  detail: slottedContent,
  slot: 'named',
});
UI.StateBanner({ title: 'State', slot: 'named' });
UI.SunkenPanel({ children: slottedContent, slot: 'named' });
UI.TabBar({
  id: 'tabs',
  label: 'Tabs',
  children: slottedContent,
  trailing: slottedContent,
  end: slottedContent,
  trailingPlacement: 'adjacent',
  slot: 'named',
});
TabScaffold({
  id: 'scaffold',
  label: 'Tabs',
  active: 'one',
  tabs: [{ id: 'one', label: 'One', content: slottedContent }],
  slot: 'named',
});
UI.TokenSearchField({ id: 'search', label: 'Search', slot: 'named' });
UI.Toolbar({ leading: slottedContent, slot: 'named' });
UI.ToolbarActionLink({ href: '/', label: 'Home', slot: 'named' });
UI.ToolbarControlGroup({ children: slottedContent, slot: 'named' });
UI.ToolbarText({ text: 'Title', slot: 'named' });
UI.ValueTable({ label: 'Values', children: slottedContent, slot: 'named' });
UI.ValueTableRow({ label: 'Name', value: 'Value', slot: 'named' });
Workbench({
  id: 'workbench',
  label: 'Workbench',
  main: slottedContent,
  slot: 'named',
});
// @ts-expect-error KUI-T014 multi-root CollapsiblePanel has no unambiguous slot owner.
CollapsiblePanel({ id: 'panel', side: 'left', slot: 'named' });
ResizableRegion({
  id: 'region',
  label: 'Region',
  size: 200,
  min: 100,
  max: 300,
  // @ts-expect-error KUI-T014 multi-root ResizableRegion has no unambiguous slot owner.
  slot: 'named',
});
// @ts-expect-error KUI-T014 slot support does not broaden components to arbitrary native attributes.
UI.Badge({ children: '1', draggable: true });

// A Badge dot is text-free and must state its accessible story: its own
// label, or ariaHidden because the owning component announces it.
UI.Badge({ size: 'dot', tone: 'danger', label: 'New activity' });
UI.Badge({ size: 'dot', ariaHidden: true });
const badgeDotProps: UI.BadgeDotProps = { size: 'dot', ariaHidden: true };
const badgeTextProps: UI.BadgeTextProps = { children: '3', size: 'compact' };
void badgeDotProps;
void badgeTextProps;
// @ts-expect-error a dot has no visible text, so it needs a label or ariaHidden.
UI.Badge({ size: 'dot' });
// @ts-expect-error a dot renders no children.
UI.Badge({ size: 'dot', ariaHidden: true, children: '3' });
// @ts-expect-error a dot is always a solid fill; appearance is a text-badge axis.
UI.Badge({ size: 'dot', ariaHidden: true, appearance: 'outline' });
// @ts-expect-error a dot is always a circle; shape is a text-badge axis.
UI.Badge({ size: 'dot', ariaHidden: true, shape: 'rounded' });
// @ts-expect-error a labeled dot cannot also be hidden from assistive technology.
UI.Badge({ size: 'dot', label: 'New', ariaHidden: true });
// @ts-expect-error a text badge still requires its visible children.
UI.Badge({ size: 'compact' });

// KUI-T010 positive: every finite presentation axis is available from the
// convenience root barrel in both source and packed declarations.
const rootBarrelPresentationTypes: [
  AppTabNameOverflow,
  AppTabPresentation,
  AppTabSize,
  TabBarAllocation,
  TabBarPresentation,
  TabBarTrailingPlacement,
  ToolbarControlGroupSize,
  ToolbarControlGroupDensity,
  ToolbarControlGroupContent,
  ToolbarControlGroupSelectedChrome,
  ToolbarControlGroupSelectedTone,
  SelectPresentation,
  SelectSize,
  SelectSelectedPresentation,
  SelectFocusRingOwner,
] = [
  'visible',
  'segmented',
  'compact',
  'fill',
  'inspector',
  'adjacent',
  'compact',
  'tight',
  'mixed',
  'outline',
  'pop',
  'navigation',
  'compact',
  'icon-only',
  'group',
];
void rootBarrelPresentationTypes;

// KUI-T001 positive: every ListHeader mode carries its complete contract.
ListHeader({ label: 'Passive' });
ListHeader({ label: 'Inline passive', inline: true });
ListHeader({ label: 'Featured', badge: icon, indicatorTone: 'pop' });
ListHeader({
  label: 'Action',
  action: 'add',
  actionLabel: 'Add item',
  actionIcon: icon,
});
ListHeader({
  label: 'Toggle',
  toggle: true,
  action: 'toggle',
  expanded: false,
});
// @ts-expect-error KUI-T001 toggle mode requires controlled expanded state.
ListHeader({ label: 'Toggle', toggle: true, action: 'toggle' });
// @ts-expect-error KUI-T001 a trailing action requires its accessible label and icon.
ListHeader({ label: 'Action', action: 'add' });
// @ts-expect-error KUI-T001 passive mode cannot carry orphaned expanded state.
ListHeader({ label: 'Passive', expanded: false });

// KUI-T002 positive: Select always has a visible or ARIA label.
Select({
  name: 'tone',
  label: 'Tone',
  value: 'quiet',
  choices: [{ value: 'quiet', label: 'Quiet' }],
});
// @ts-expect-error KUI-T002 Select cannot be unnamed.
Select({
  name: 'tone',
  value: 'quiet',
  choices: [{ value: 'quiet', label: 'Quiet' }],
});

// KUI-T003 positive: literal controlled values come from their choices.
Select({
  name: 'tone',
  ariaLabel: 'Tone',
  value: 'quiet',
  choices: [
    { value: 'quiet', label: 'Quiet' },
    { value: 'loud', label: 'Loud' },
  ],
});
Select<string>({
  name: 'dynamic-tone',
  ariaLabel: 'Dynamic tone',
  value: 'loaded-at-runtime',
  choices: [{ value: 'quiet', label: 'Quiet' }],
});
Select({
  name: 'tone',
  ariaLabel: 'Tone',
  // @ts-expect-error KUI-T003 a literal Select value must name a declared choice.
  value: 'missing',
  choices: [{ value: 'quiet', label: 'Quiet' }],
});

// KUI-T004 positive: SegmentedControl has the same literal identity relation.
SegmentedControl({
  id: 'view',
  label: 'View',
  value: 'list',
  choices: [
    { value: 'list', label: 'List' },
    { value: 'board', label: 'Board' },
  ],
});
SegmentedControl({
  id: 'view',
  label: 'View',
  // @ts-expect-error KUI-T004 a literal value must name a declared segment.
  value: 'missing',
  choices: [{ value: 'list', label: 'List' }],
});

// KUI-T005 positive: collapsible-only state is carried only by that variant.
TokenSearchField({
  id: 'search',
  label: 'Search',
  collapsible: true,
  expanded: false,
  expandLabel: 'Open search',
});
TokenSearchField({ id: 'search', label: 'Search' });
TokenSearchField({
  id: 'saved-query',
  label: 'Search query',
  presentation: 'form-field',
  hint: 'Add filters.',
  required: true,
});
// @ts-expect-error A visible hint requires the form-field presentation.
TokenSearchField({ id: 'search', label: 'Search', hint: 'Add filters.' });
// @ts-expect-error KUI-T005 expanded has no effect on a non-collapsible field.
TokenSearchField({ id: 'search', label: 'Search', expanded: true });

// KUI-T006 positive: author metadata cannot replace editor-owned wiring state.
const editorAttributes: TokenSearchEditorAttributes = {
  'data-domain': 'tickets',
};
TokenSearchField({ id: 'search', label: 'Search', editorAttributes });
TokenSearchField({
  id: 'search',
  label: 'Search',
  editorAttributes: {
    // @ts-expect-error KUI-T006 TokenSearchField owns editor identity.
    'data-token-search-editor': 'replacement',
  },
});

// KUI-T007 positive: line caps require wrapping.
ToolbarText({ text: 'Long title', wrap: true, maxLines: 2 });
// @ts-expect-error KUI-T007 maxLines is ignored unless wrap is enabled.
ToolbarText({ text: 'Long title', maxLines: 2 });

// KUI-T008 positive: a literal active tab names a declared tab.
TabScaffold({
  id: 'app',
  label: 'Sections',
  active: 'home',
  tabs: [
    { id: 'home', label: 'Home', content: icon },
    { id: 'settings', label: 'Settings', content: icon },
  ],
});
// A tab badge is a count or short string with an optional localized phrase.
TabScaffold({
  id: 'app',
  label: 'Sections',
  active: 'inbox',
  tabs: [
    {
      id: 'inbox',
      label: 'Inbox',
      content: icon,
      badge: 3,
      badgeLabel: '3 unread',
    },
    { id: 'updates', label: 'Updates', content: icon, badge: 'New' },
  ],
});
// The dot form (new content without a count) requires its localized phrase.
TabScaffold({
  id: 'app',
  label: 'Sections',
  active: 'feed',
  tabs: [
    {
      id: 'feed',
      label: 'Feed',
      content: icon,
      badge: true,
      badgeLabel: 'New activity',
    },
  ],
});
TabScaffold({
  id: 'app',
  label: 'Sections',
  active: 'inbox',
  // @ts-expect-error a dot badge has no text, so badgeLabel is required.
  tabs: [{ id: 'inbox', label: 'Inbox', content: icon, badge: true }],
});
TabScaffold({
  id: 'app',
  label: 'Sections',
  active: 'inbox',
  // @ts-expect-error a tab badge is text, a number, or the `true` dot — not false.
  tabs: [{ id: 'inbox', label: 'Inbox', content: icon, badge: false }],
});
TabScaffold({
  id: 'app',
  label: 'Sections',
  active: 'inbox',
  // @ts-expect-error a tab badge is text, a number, or the dot — not markup.
  tabs: [{ id: 'inbox', label: 'Inbox', content: icon, badge: icon }],
});
TabScaffold({
  id: 'app',
  label: 'Sections',
  // @ts-expect-error KUI-T008 a literal active id must name a declared tab.
  active: 'missing',
  tabs: [{ id: 'home', label: 'Home', content: icon }],
});

// KUI-T009 positive: adjacent-token removal requires a controlled-state callback.
wireTokenSearchFields(document.body, {
  keyboard: { onRemoveToken: () => undefined },
});
wireTokenSearchFields(document.body, {
  keyboard: { removeAdjacentToken: false, moveCaretPastToken: true },
});
wireTokenSearchFields(document.body, {
  // @ts-expect-error KUI-T009 `true` cannot supply the required removal callback.
  keyboard: true,
});
wireTokenSearchFields(document.body, {
  keyboard: {
    removeAdjacentToken: false,
    // @ts-expect-error KUI-T009 a removal callback is invalid when removal is disabled.
    onRemoveToken: () => undefined,
  },
});

// KUI-T010 positive: finite public vocabularies are importable exact unions.
const activation: TabActivation = 'manual';
const urgency: StateBannerUrgency = 'alert';
const stateBannerTone: StateBannerTone = 'pop';
const semanticTones: SemanticTone[] = [
  'neutral',
  'info',
  'pop',
  'success',
  'warning',
  'danger',
];
for (const semanticTone of semanticTones) {
  const badgeTone: BadgeTone = semanticTone;
  Badge({ children: 'Status', tone: badgeTone });
  Chip({ children: 'Tag', tone: semanticTone });
  StateBanner({ title: 'Status', tone: semanticTone });
  ContentItem({ appearance: semanticTone });
}
// @ts-expect-error Semantic component tones use info; brand names the underlying color tokens.
Badge({ children: 'Status', tone: 'brand' });
// @ts-expect-error Chip shares the finite semantic tone vocabulary.
Chip({ children: 'Tag', tone: 'brand' });
const appearance: ToolbarControlGroupAppearance = 'borderless';
const tone: ToolbarControlGroupTone = 'dark';
const buttonAppearance: ToolbarControlGroupButtonAppearance = 'push';
const shape: ToolbarControlGroupShape = 'rounded';
const sunkenPanelShape: SunkenPanelShape = 'square';
const dividerSides: Sides = 'tr';
const insetSides: Sides = 'tbl';
TabBar({ id: 'tabs', label: 'Tabs', activation, children: icon });
StateBanner({ title: 'Featured', badge: '3', tone: stateBannerTone, urgency });
ToolbarControlGroup({
  children: icon,
  appearance,
  tone,
  buttonAppearance,
  shape,
  selectedTone: 'pop',
});
SunkenPanel({ shape: sunkenPanelShape });
const contentItemFrame: ContentItemFrame = 'framed';
const contentItemAppearance: ContentItemAppearance = 'success';
const contentItemShape: ContentItemShape = 'pill';
ContentItem({
  appearance: contentItemAppearance,
  children: 'Copy',
  frame: contentItemFrame,
  shape: contentItemShape,
  ariaLabel: 'Details',
  focusTarget: true,
  rootAttributes: { 'data-item': 'details' },
});
ContentItem({ appearance: 'transparent' });
ContentItem({ appearance: 'surface' });
// @ts-expect-error ContentItem appearances are base surfaces or finite semantic tones.
ContentItem({ appearance: 'primary' });
ContentItem({
  interactive: true,
  action: 'select-line',
  selectionMode: 'multiple',
  selected: true,
  children: icon,
});
// @ts-expect-error KUI-T010 ContentItem frames are none or framed; a fill is SunkenPanel.
ContentItem({ frame: 'filled' });
// @ts-expect-error KUI-T010 ContentItem shapes are rounded or pill.
ContentItem({ shape: 'square' });
// @ts-expect-error ContentItem protects its component marker.
ContentItem({ rootAttributes: { 'data-component': 'spoof' } });
List({
  children: icon,
  selectionMode: 'multiple',
  ariaLabel: 'Demand lines',
  gap: true,
  flex: flex(1, 1, px(0)),
  scrollable: true,
  dividerSides,
  textInsets: insetSides,
  controlInsets: 'r',
});
Row({ children: icon, textInsets: insetSides, controlInsets: 'r' });
// @ts-expect-error KUI-T010 inset sides use canonical t/r/b/l order.
List({ textInsets: 'lr' });
Toolbar({ leading: icon, dividerSides });
// @ts-expect-error KUI-T010 divider sides use canonical t/r/b/l order.
List({ dividerSides: 'rt' });
// @ts-expect-error KUI-T010 Toolbar's former boolean divider prop was replaced by dividerSides.
Toolbar({ leading: icon, divider: true });
// @ts-expect-error KUI-T010 arbitrary activation strings are rejected.
const invalidActivation: TabActivation = 'eager';
void invalidActivation;
// @ts-expect-error KUI-T010 SunkenPanel uses square, not the ambiguous flat surface term.
const invalidSunkenPanelShape: SunkenPanelShape = 'flat';
void invalidSunkenPanelShape;

// Scroll dividers: one call per root returns a disposer; app-owned targets
// name the scroller and chrome by id on physical sides.
const scrollTargets: ScrollDividerTarget[] = [
  { scroller: 'results', top: 'results-toolbar', bottom: 'status' },
];
const stopScrollDividers: () => void = wireScrollDividers(
  document.createElement('div'),
  { targets: scrollTargets },
);
stopScrollDividers();
wireScrollDividers(document);
// @ts-expect-error A target needs the id of its scrolling element.
wireScrollDividers(document, { targets: [{ top: 'header' }] });
// @ts-expect-error Target sides are physical: top, right, bottom, left.
wireScrollDividers(document, { targets: [{ scroller: 'x', start: 'y' }] });
UI.Pane({ children: icon, chromeDividers: 'always' });
UI.Pane({ children: icon, chromeDividers: 'none' });
const paneChromeDividers: UI.PaneChromeDividers = 'scroll';
void paneChromeDividers;
// @ts-expect-error KUI-T010 chrome dividers are scroll, always, or none.
UI.Pane({ children: icon, chromeDividers: 'hover' });
UI.Pane({
  children: icon,
  // @ts-expect-error Pane protects its chrome-divider attribute.
  rootAttributes: { 'data-chrome-dividers': 'always' },
});
