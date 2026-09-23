import type {
  AppTabPresentation,
  AppTabSize,
  KerfUiContent,
  SelectFocusRingOwner,
  SelectPresentation,
  SelectSelectedPresentation,
  SelectSize,
  TabBarAllocation,
  TabBarPresentation,
  TabBarTrailingPlacement,
  ToolbarControlGroupContent,
  ToolbarControlGroupDensity,
  ToolbarControlGroupSelectedChrome,
  ToolbarControlGroupSelectedTone,
  ToolbarControlGroupSize,
} from '@kerfjs/ui';
import { type CssValue, em, px } from '@kerfjs/ui';
import {
  calc,
  colorVar,
  type CssColor,
  type CssFlex,
  type CssLength,
  type CssLengthExpression,
  type CssSize,
  flex,
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
import { type DividerSides, List } from '@kerfjs/ui/list';
import { ListActionRow } from '@kerfjs/ui/list-action-row';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import {
  type HorizontalAlignment,
  Row,
  type VerticalAlignment,
} from '@kerfjs/ui/row';
import { SegmentedControl } from '@kerfjs/ui/segmented-control';
import { Select, type SelectChoice } from '@kerfjs/ui/select';
import { Skeleton } from '@kerfjs/ui/skeleton';
import {
  StateBanner,
  type StateBannerTone,
  type StateBannerUrgency,
} from '@kerfjs/ui/state-banner';
import { SunkenPanel, type SunkenPanelShape } from '@kerfjs/ui/sunken-panel';
import { type TabActivation, TabBar } from '@kerfjs/ui/tab-bar';
import { TabScaffold } from '@kerfjs/ui/tab-scaffold';
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
import { wireTokenSearchFields } from '@kerfjs/ui/wire-token-search-fields';

const icon = ToolbarText({ text: 'Icon' });

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
void genericCssValue;
// @ts-expect-error KUI-T012 an incomplete expression must be wrapped in calc().
List({ gap: expression });
// @ts-expect-error KUI-T012 raw CSS strings do not satisfy the typed length contract.
List({ gap: '0.25rem' });
// @ts-expect-error KUI-T012 Row uses the same typed gap contract.
Row({ gap: '0.25rem' });
// @ts-expect-error KUI-T012 spacing shorthands are a finite vocabulary.
space('xxs');
// @ts-expect-error KUI-T012 custom property names keep their leading dashes.
lengthVar('app-gap');

// KUI-T013 positive: each remaining CSS-valued prop accepts only its own
// grammar, while semantic keywords remain finite and media queries stay raw.
const listFlex: CssFlex = flex(2, 1, rem(20));
const skeletonWidth: CssSize = pct(60);
const choiceColor: CssColor = colorVar(
  '--app-choice-color',
  uiColor('success'),
);
List({ flex: listFlex });
List({ flex: 'none' });
const horizontalAlignment: HorizontalAlignment = 'space-between';
const verticalAlignment: VerticalAlignment = 'space-around';
Row({
  hAlign: horizontalAlignment,
  vAlign: verticalAlignment,
  wrap: true,
});
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
const responsiveReveal: CatalogRevealOptions = {
  media: '(max-width: 40rem)',
};
void responsiveReveal;
// @ts-expect-error KUI-T013 raw flex strings bypass the structured flex grammar.
List({ flex: '2 1 20rem' });
// @ts-expect-error KUI-T013 lengths are not complete flex shorthands.
List({ flex: rem(20) });
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

// KUI-T010 positive: every finite presentation axis is available from the
// convenience root barrel in both source and packed declarations.
const rootBarrelPresentationTypes: [
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
const appearance: ToolbarControlGroupAppearance = 'borderless';
const tone: ToolbarControlGroupTone = 'dark';
const buttonAppearance: ToolbarControlGroupButtonAppearance = 'push';
const shape: ToolbarControlGroupShape = 'rounded';
const sunkenPanelShape: SunkenPanelShape = 'square';
const dividerSides: DividerSides = 'tr';
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
List({
  children: icon,
  gap: true,
  flex: flex(1, 1, px(0)),
  scrollable: true,
  dividerSides,
});
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
