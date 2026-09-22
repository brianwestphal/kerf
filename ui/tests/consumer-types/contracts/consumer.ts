import {
  buildEvaluationContexts,
  type UiEvaluationContext,
} from '@kerfjs/ui/evaluator';
import { ListHeader } from '@kerfjs/ui/list-header';
import { PanelHeader } from '@kerfjs/ui/panel-header';
import { SegmentedControl } from '@kerfjs/ui/segmented-control';
import { Select } from '@kerfjs/ui/select';
import { StateBanner, type StateBannerUrgency } from '@kerfjs/ui/state-banner';
import { SunkenPanel, type SunkenPanelShape } from '@kerfjs/ui/sunken-panel';
import { type TabActivation, TabBar } from '@kerfjs/ui/tab-bar';
import { TabScaffold } from '@kerfjs/ui/tab-scaffold';
import {
  type TokenSearchEditorAttributes,
  TokenSearchField,
} from '@kerfjs/ui/token-search-field';
import {
  ToolbarControlGroup,
  type ToolbarControlGroupAppearance,
  type ToolbarControlGroupButtonAppearance,
  type ToolbarControlGroupShape,
  type ToolbarControlGroupTone,
} from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import type {} from '@kerfjs/ui/webawesome';
import { wireTokenSearchFields } from '@kerfjs/ui/wire-token-search-fields';

const icon = ToolbarText({ text: 'Icon' });

const evaluationContexts: UiEvaluationContext[] = buildEvaluationContexts();
void evaluationContexts;

// KUI-T001 positive: every ListHeader mode carries its complete contract.
ListHeader({ label: 'Passive' });
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

// KUI-T007 positive: a summary id cannot exist without summary content.
PanelHeader({
  title: 'Details',
  titleId: 'details-title',
  summary: 'Current selection',
  summaryId: 'details-summary',
});
// @ts-expect-error KUI-T007 summaryId would reference no rendered summary.
PanelHeader({
  title: 'Details',
  titleId: 'details-title',
  summaryId: 'orphan',
});

// KUI-T008 positive: line caps require wrapping.
ToolbarText({ text: 'Long title', wrap: true, maxLines: 2 });
// @ts-expect-error KUI-T008 maxLines is ignored unless wrap is enabled.
ToolbarText({ text: 'Long title', maxLines: 2 });

// KUI-T009 positive: a literal active tab names a declared tab.
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
  // @ts-expect-error KUI-T009 a literal active id must name a declared tab.
  active: 'missing',
  tabs: [{ id: 'home', label: 'Home', content: icon }],
});

// KUI-T010 positive: adjacent-token removal requires a controlled-state callback.
wireTokenSearchFields(document.body, {
  keyboard: { onRemoveToken: () => undefined },
});
wireTokenSearchFields(document.body, {
  keyboard: { removeAdjacentToken: false, moveCaretPastToken: true },
});
wireTokenSearchFields(document.body, {
  // @ts-expect-error KUI-T010 `true` cannot supply the required removal callback.
  keyboard: true,
});
wireTokenSearchFields(document.body, {
  keyboard: {
    removeAdjacentToken: false,
    // @ts-expect-error KUI-T010 a removal callback is invalid when removal is disabled.
    onRemoveToken: () => undefined,
  },
});

// KUI-T011 positive: finite public vocabularies are importable exact unions.
const activation: TabActivation = 'manual';
const urgency: StateBannerUrgency = 'alert';
const appearance: ToolbarControlGroupAppearance = 'borderless';
const tone: ToolbarControlGroupTone = 'dark';
const buttonAppearance: ToolbarControlGroupButtonAppearance = 'push';
const shape: ToolbarControlGroupShape = 'rounded';
const sunkenPanelShape: SunkenPanelShape = 'square';
TabBar({ id: 'tabs', label: 'Tabs', activation, children: icon });
StateBanner({ title: 'Failed', badge: '3', urgency });
ToolbarControlGroup({
  children: icon,
  appearance,
  tone,
  buttonAppearance,
  shape,
});
SunkenPanel({ shape: sunkenPanelShape });
// @ts-expect-error KUI-T011 arbitrary activation strings are rejected.
const invalidActivation: TabActivation = 'eager';
void invalidActivation;
// @ts-expect-error KUI-T011 SunkenPanel uses square, not the ambiguous flat surface term.
const invalidSunkenPanelShape: SunkenPanelShape = 'flat';
void invalidSunkenPanelShape;
