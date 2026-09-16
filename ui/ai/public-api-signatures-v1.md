# Public API signatures for the UI authoring corpus

Generated from emitted declarations for `@kerfjs/ui@4.4.1` and `kerfjs@4.4.1`. This bounded reference covers only APIs used by the seven-task corpus. It is interface evidence, not an implementation or runtime guarantee.

## `@kerfjs/ui/disclosure-arrow`

```ts
import { SafeHtml } from 'kerfjs';

type DisclosureDirection = 'up' | 'down' | 'left' | 'right';
interface DisclosureArrowProps {
    open: boolean;
    openDirection?: DisclosureDirection;
    closedDirection?: DisclosureDirection;
    /** Replacement icons should use right as their unrotated orientation. */
    icon?: SafeHtml;
    className?: string;
}
declare function DisclosureArrow({ open, openDirection, closedDirection, icon, className, }: DisclosureArrowProps): SafeHtml;

export { DisclosureArrow, type DisclosureArrowProps, type DisclosureDirection };
```

## `@kerfjs/ui/toolbar`

```ts
import { SafeHtml } from 'kerfjs';

interface ToolbarProps {
    leading?: SafeHtml;
    center?: SafeHtml;
    trailing?: SafeHtml;
    label?: string;
    divider?: boolean;
    className?: string;
}
declare function Toolbar({ leading, center, trailing, label, divider, className }: ToolbarProps): SafeHtml;

export { Toolbar, type ToolbarProps };
```

## `@kerfjs/ui/toolbar-text`

```ts
import * as kerfjs from 'kerfjs';

type ToolbarTextSize = 'large' | 'default' | 'small';
interface ToolbarTextProps {
    text: string;
    size?: ToolbarTextSize;
    className?: string;
}
declare function ToolbarText({ text, size, className }: ToolbarTextProps): kerfjs.SafeHtml;

export { ToolbarText, type ToolbarTextProps, type ToolbarTextSize };
```

## `@kerfjs/ui/toolbar-control-group`

```ts
import { SafeHtml } from 'kerfjs';

interface ToolbarControlGroupProps {
    children: SafeHtml | SafeHtml[];
    label?: string;
    className?: string;
    expanded?: boolean;
    single?: boolean;
    appearance?: 'contained' | 'borderless';
    tone?: 'default' | 'dark';
    buttonAppearance?: 'plain' | 'push';
}
declare function ToolbarControlGroup({ children, label, className, expanded, single, appearance, tone, buttonAppearance }: ToolbarControlGroupProps): SafeHtml;

export { ToolbarControlGroup, type ToolbarControlGroupProps };
```

## `@kerfjs/ui/menu-header`

```ts
import { SafeHtml } from 'kerfjs';

type MenuHeaderRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-has-badge'?: never;
    'data-has-count'?: never;
    'data-toggle'?: never;
}>;
type MenuHeaderTriggerAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-action'?: never;
    popoverTarget?: string;
    popoverTargetAction?: 'toggle' | 'show' | 'hide';
    'aria-controls'?: string;
    'aria-haspopup'?: 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid' | 'true';
}>;
interface MenuHeaderBaseProps {
    label: string;
    action?: string;
    actionLabel?: string;
    actionIcon?: SafeHtml;
    actionDisabled?: boolean;
    disabledReason?: string;
    expanded?: boolean;
    toggle?: boolean;
    rootAttributes?: MenuHeaderRootAttributes;
    triggerAttributes?: MenuHeaderTriggerAttributes;
}
type MenuHeaderIndicatorProps = {
    count: number;
    countLabel: string;
    badge?: never;
} | {
    count?: never;
    countLabel?: never;
    badge?: SafeHtml;
};
type MenuHeaderProps = MenuHeaderBaseProps & MenuHeaderIndicatorProps;
declare function MenuHeader({ label, count, countLabel, badge, action, actionLabel, actionIcon, actionDisabled, disabledReason, expanded, toggle, rootAttributes, triggerAttributes }: MenuHeaderProps): SafeHtml;

export { MenuHeader, type MenuHeaderProps };
```

## `@kerfjs/ui/menu-action-row`

```ts
import { SafeHtml } from 'kerfjs';

type MenuActionRowRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-has-icon'?: never;
    'data-multiline'?: never;
    'data-state'?: never;
    'data-selected'?: never;
    'data-pressed'?: never;
}>;
type MenuActionRowTrailingAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    popoverTarget?: string;
    popoverTargetAction?: 'toggle' | 'show' | 'hide';
    'aria-controls'?: string;
    'aria-haspopup'?: 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid' | 'true';
}>;
interface MenuActionRowProps {
    /** Visible dormant content for the primary button. Must not contain interactive descendants. */
    label: string | SafeHtml;
    /** Decorative dormant content for the primary button. Must not contain interactive descendants. */
    icon?: SafeHtml;
    action: string;
    itemId?: string;
    selected?: boolean;
    pressed?: boolean;
    accessibleLabel?: string;
    title?: string;
    multiline?: boolean;
    state?: string;
    disabled?: boolean;
    tabIndex?: number;
    trailingAction: string;
    trailingActionLabel: string;
    /** Decorative dormant content for the trailing button. Must not contain interactive descendants. */
    trailingActionIcon: SafeHtml;
    trailingActionDisabled?: boolean;
    trailingActionTitle?: string;
    className?: string;
    style?: string;
    rootAttributes?: MenuActionRowRootAttributes;
    trailingActionAttributes?: MenuActionRowTrailingAttributes;
}
declare function MenuActionRow({ label, icon, action, itemId, selected, pressed, accessibleLabel, title, multiline, state, disabled, tabIndex, trailingAction, trailingActionLabel, trailingActionIcon, trailingActionDisabled, trailingActionTitle, className, style, rootAttributes, trailingActionAttributes }: MenuActionRowProps): SafeHtml;

export { MenuActionRow, type MenuActionRowProps };
```

## `@kerfjs/ui/menu-item`

```ts
import { SafeHtml } from 'kerfjs';

type MenuItemRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-has-icon'?: never;
    'data-multiline'?: never;
    'data-state'?: never;
}>;
interface MenuItemProps {
    label: string | SafeHtml;
    icon?: SafeHtml;
    trailing?: SafeHtml;
    selected?: boolean;
    action: string;
    itemId?: string;
    className?: string;
    style?: string;
    pressed?: boolean;
    accessibleLabel?: string;
    title?: string;
    multiline?: boolean;
    state?: string;
    disabled?: boolean;
    tabIndex?: number;
    rootAttributes?: MenuItemRootAttributes;
}
declare function MenuItem({ label, icon, trailing, selected, action, itemId, className, style, pressed, accessibleLabel, title, multiline, state, disabled, tabIndex, rootAttributes }: MenuItemProps): SafeHtml;

export { MenuItem, type MenuItemProps };
```

## `@kerfjs/ui/page-header`

```ts
import { SafeHtml } from 'kerfjs';

interface PageHeaderProps {
    title: string | SafeHtml;
    action?: SafeHtml;
}
declare function PageHeader({ title, action }: PageHeaderProps): SafeHtml;

export { PageHeader, type PageHeaderProps };
```

## `@kerfjs/ui/dialog-header`

```ts
import { SafeHtml } from 'kerfjs';

interface DialogHeaderProps {
    title: string;
    titleId: string;
    summary?: string;
    summaryId?: string;
    icon?: SafeHtml;
    iconClassName?: string;
    actions?: SafeHtml;
    actionsLabel?: string;
}
declare function DialogHeader({ title, titleId, summary, summaryId, icon, iconClassName, actions, actionsLabel }: DialogHeaderProps): SafeHtml;

export { DialogHeader, type DialogHeaderProps };
```

## `@kerfjs/ui/value-table`

```ts
import { SafeHtml } from 'kerfjs';

interface ValueTableRowProps {
    label: string | SafeHtml;
    value: string | SafeHtml;
    icon?: SafeHtml;
    className?: string;
}
declare function ValueTableRow({ label, value, icon, className }: ValueTableRowProps): SafeHtml;

interface ValueTableProps {
    label: string;
    className?: string;
    children: SafeHtml | readonly SafeHtml[];
}
declare function ValueTable({ label, className, children }: ValueTableProps): SafeHtml;

export { ValueTable, type ValueTableProps, ValueTableRow, type ValueTableRowProps };
```

## `@kerfjs/ui/app-tab`

```ts
import { SafeHtml } from 'kerfjs';

type AppTabRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-tab-id'?: never;
    'data-selected'?: never;
    'data-tab-dragging'?: never;
    'data-tab-drop-position'?: never;
}>;
interface AppTabProps {
    id: string;
    name: string;
    selected?: boolean;
    closable?: boolean;
    draggable?: boolean;
    leading?: SafeHtml;
    trailing?: SafeHtml;
    /** Decorative dormant content for the close button. Must not contain interactive descendants. */
    closeIcon?: SafeHtml;
    selectAction?: string;
    closeAction?: string;
    className?: string;
    rootAttributes?: AppTabRootAttributes;
}
declare function AppTab({ id, name, selected, closable, draggable, leading, trailing, closeIcon, selectAction, closeAction, className, rootAttributes }: AppTabProps): SafeHtml;

export { AppTab, type AppTabProps };
```

## `@kerfjs/ui/tab-bar`

```ts
import { SafeHtml } from 'kerfjs';

interface TabBarProps {
    id: string;
    label: string;
    children: SafeHtml | readonly SafeHtml[];
    leading?: SafeHtml;
    trailing?: SafeHtml;
    className?: string;
}
/** Render a controlled tab strip. The application owns selection, order, and persistence. */
declare function TabBar({ id, label, children, leading, trailing, className }: TabBarProps): SafeHtml;

export { TabBar, type TabBarProps };
```

## `@kerfjs/ui/wire-tab-bars`

```ts
type TabReorderSource = 'pointer' | 'keyboard';
type TabDropPosition = 'before' | 'after';
interface TabReorder {
    barId: string;
    sourceId: string;
    targetId: string;
    position: TabDropPosition;
    source: TabReorderSource;
}
interface WireTabBarsOptions {
    onReorder: (change: TabReorder) => void;
}
declare function reorderTabs<T>(items: readonly T[], getId: (item: T) => string, sourceId: string, targetId: string, position: TabDropPosition): T[];
/** Wire reordering and keyboard navigation while leaving controlled state in the application. */
declare function wireTabBars(root: HTMLElement | Document, { onReorder }: WireTabBarsOptions): () => void;

export { type TabDropPosition, type TabReorder, type TabReorderSource, type WireTabBarsOptions, reorderTabs, wireTabBars };
```

## `@kerfjs/ui/nav-stack`

```ts
import { SafeHtml } from 'kerfjs';

/**
 * One entry in a {@link NavStack}. The app owns the stack as an array (usually a
 * signal); `NavStack` renders it and `wireNavStack` animates the transitions.
 */
interface NavStackView {
    /** Stable identity for keyed reconcile and transition direction. */
    key: string;
    content: SafeHtml;
    /** Title shown in the top toolbar for this view. */
    title?: string;
    /** Trailing actions for this view's top toolbar. */
    toolbar?: SafeHtml;
}
interface NavStackProps {
    id: string;
    /** Accessible name for the stack region. */
    label: string;
    /** The stack, root first; the last entry is the active top view. */
    views: NavStackView[];
    /** Accessible label for the back control (default "Back"). */
    backLabel?: string;
    /** Hide the top toolbar entirely (rare — a fully custom-chrome view). */
    hideToolbar?: boolean;
    /** Optional persistent bottom toolbar. */
    bottomToolbar?: SafeHtml;
    className?: string;
}
/**
 * A navigation stack (iOS-style push/pop). Renders every entry stacked, the last
 * one active; `@kerfjs/ui/wire-nav-stack`'s `wireNavStack` slides the content and
 * cross-fades the chrome across a change. A single-pane layout is a `NavStack`
 * with one entry. See `docs/23-app-layouts.md` §3.1.
 */
declare function NavStack({ id, label, views, backLabel, hideToolbar, bottomToolbar, className }: NavStackProps): SafeHtml;

export { NavStack, type NavStackProps, type NavStackView };
```

## `@kerfjs/ui/wire-nav-stack`

```ts
interface WireNavStackOptions {
    /** Invoked when the back control is activated. The app pops its own stack. */
    onBack?: () => void;
    /** Transition duration in ms (default 200). Set 0 to disable animation. */
    duration?: number;
}
/**
 * Animate a `NavStack`'s push/pop transitions and wire its back control. The app
 * owns the stack (a signal of `NavStackView[]`) and re-renders `NavStack` when it
 * changes; this helper slides the content and settles the chrome across each
 * change, and calls `onBack` when the back control is used. Returns a disposer.
 */
declare function wireNavStack(root: Element, options?: WireNavStackOptions): () => void;

export { type WireNavStackOptions, wireNavStack };
```

## `@kerfjs/ui/split-view`

```ts
import { SafeHtml } from 'kerfjs';

interface SplitViewResizable {
    size: number;
    min: number;
    max: number;
}
interface SplitViewProps {
    id: string;
    label: string;
    /** The list (primary) pane. */
    list: SafeHtml;
    /** The detail (secondary) pane. */
    detail: SafeHtml;
    /**
     * Compact ("one pane at a time") classes — a handset or portrait tablet.
     * Derive from `deviceClass().value.compact`. When true the split collapses to
     * a `NavStack`: the list is the root and the detail is pushed over it.
     */
    compact?: boolean;
    /** In compact mode, whether the detail is currently pushed over the list. */
    detailActive?: boolean;
    /** Title/label for the list (compact NavStack root + region label). */
    listTitle?: string;
    /** Title/label for the detail (compact NavStack pushed view + region label). */
    detailTitle?: string;
    /** Back label for the compact NavStack (default "Back"). */
    backLabel?: string;
    /** A resizable separator on roomy classes (min/max px). Omit for a fixed split. */
    resizable?: SplitViewResizable;
    className?: string;
}
/**
 * A list-detail (master-detail) split. On roomy classes it shows both panes side
 * by side with an optional resizable separator; on compact classes it collapses
 * to a `NavStack` (list → detail). See `docs/23-app-layouts.md` §3.2. Compose the
 * resizable wiring with `wireResizableRegions` and the compact back with
 * `wireNavStack`.
 */
declare function SplitView({ id, label, list, detail, compact, detailActive, listTitle, detailTitle, backLabel, resizable, className }: SplitViewProps): SafeHtml;

export { SplitView, type SplitViewProps, type SplitViewResizable };
```

## `@kerfjs/ui/resizable-region`

```ts
import { SafeHtml } from 'kerfjs';

type ResizableRegionAxis = 'horizontal' | 'vertical';
type ResizableRegionEdge = 'start' | 'end';
interface ResizableRegionProps {
    id: string;
    label: string;
    size: number;
    min: number;
    max: number;
    axis?: ResizableRegionAxis;
    edge?: ResizableRegionEdge;
    collapsed?: boolean;
    transitioning?: boolean;
    /** Decorative dormant content for the separator handle. Must not contain interactive descendants. */
    handleIcon?: SafeHtml;
    children: SafeHtml | SafeHtml[];
}
declare const clampRegionSize: (size: number, min: number, max: number) => number;
declare const resizeRegionFromPointer: (startSize: number, delta: number, edge: ResizableRegionEdge) => number;
declare function ResizableRegion({ id, label, size, min, max, axis, edge, collapsed, transitioning, handleIcon, children }: ResizableRegionProps): SafeHtml;

export { ResizableRegion, type ResizableRegionAxis, type ResizableRegionEdge, type ResizableRegionProps, clampRegionSize, resizeRegionFromPointer };
```

## `@kerfjs/ui/wire-resizable-regions`

```ts
interface ResizeCommit {
    id: string;
    size: number;
    source: 'keyboard' | 'pointer';
}
interface WireResizableRegionsOptions {
    step?: number;
    largeStep?: number;
    onPreview?: (change: ResizeCommit) => void;
    onCommit: (change: ResizeCommit) => void;
}
/** Wire pointer and separator-keyboard behavior for every ResizableRegion below root. */
declare function wireResizableRegions(root: HTMLElement, { step, largeStep, onPreview, onCommit }: WireResizableRegionsOptions): () => void;

export { type ResizeCommit, type WireResizableRegionsOptions, wireResizableRegions };
```

## `@kerfjs/ui/device-class`

```ts
import { ReadonlySignal } from 'kerfjs';

/**
 * Reactive device-class detection for `@kerfjs/ui` (see `docs/23-app-layouts.md`
 * §2). `deviceClass()` returns a `ReadonlySignal<DeviceClass>` describing the
 * current viewport as a size bucket × orientation × viewport-segment count, so a
 * layout can pick its presentation reactively instead of hand-wiring `matchMedia`.
 *
 * One shared viewport source backs every reader; the pure `classifyViewport`
 * core is DOM-free and directly unit-tested.
 */
type DeviceSize = 'xs-mobile' | 'mobile' | 'tablet' | 'desktop' | 'xl-desktop';
type DeviceOrientation = 'portrait' | 'landscape';
/** Minimum widths (px) at which each larger bucket begins. `xs-mobile` is 0. */
interface DeviceBreakpoints {
    mobile: number;
    tablet: number;
    desktop: number;
    'xl-desktop': number;
}
interface DeviceClass {
    size: DeviceSize;
    orientation: DeviceOrientation;
    /** Horizontal viewport segments (foldables / dual-screen); 1 on ordinary devices. */
    segments: number;
    /** Vertical viewport segments; 1 on ordinary devices. */
    verticalSegments: number;
    /** Small phones — `xs-mobile` or `mobile`. */
    handset: boolean;
    /** "One pane at a time" — a handset or a portrait tablet. */
    compact: boolean;
    /** True when the current size is `size` or larger, e.g. `atLeast('tablet')`. */
    atLeast(size: DeviceSize): boolean;
}
/** A raw viewport snapshot, before breakpoints are applied. */
interface Viewport {
    width: number;
    height: number;
    segments: number;
    verticalSegments: number;
}
interface DeviceClassOptions {
    /** Override any of the default bucket thresholds. */
    breakpoints?: Partial<DeviceBreakpoints>;
    /** The viewport assumed when there is no DOM (SSR). Defaults to 1024×768, one segment. */
    ssr?: Partial<Viewport>;
}
declare const DEFAULT_BREAKPOINTS: DeviceBreakpoints;
/**
 * Classify a raw viewport into a {@link DeviceClass}. Pure and DOM-free — the
 * single source of truth for the bucketing rules.
 */
declare function classifyViewport(width: number, orientation: DeviceOrientation, segments?: number, verticalSegments?: number, breakpoints?: DeviceBreakpoints): DeviceClass;
/**
 * A reactive signal of the current {@link DeviceClass}. Reading it inside an
 * `effect`/`computed` re-runs when the viewport crosses a breakpoint, rotates,
 * or changes its segment count. Without a DOM it resolves to `options.ssr`
 * (default 1024×768, landscape, one segment).
 */
declare function deviceClass(options?: DeviceClassOptions): ReadonlySignal<DeviceClass>;

export { DEFAULT_BREAKPOINTS, type DeviceBreakpoints, type DeviceClass, type DeviceClassOptions, type DeviceOrientation, type DeviceSize, type Viewport, classifyViewport, deviceClass };
```

## `@kerfjs/ui/segmented-control`

```ts
import { SafeHtml } from 'kerfjs';

type SegmentedControlAppearance = 'filled' | 'outlined' | 'toolbar';
type SegmentedControlShape = 'rounded' | 'pill';
type SegmentedControlSize = 'small' | 'default';
type SegmentedControlLayout = 'content' | 'equal';
interface SegmentedControlChoice {
    value: string;
    label: string;
    content?: SafeHtml;
    title?: string;
    disabled?: boolean;
}
interface SegmentedControlProps {
    id: string;
    label: string;
    value: string;
    choices: readonly SegmentedControlChoice[];
    action?: string;
    appearance?: SegmentedControlAppearance;
    shape?: SegmentedControlShape;
    size?: SegmentedControlSize;
    layout?: SegmentedControlLayout;
    className?: string;
}
declare function SegmentedControl({ id, label, value, choices, action, appearance, shape, size, layout, className, }: SegmentedControlProps): SafeHtml;

export { SegmentedControl, type SegmentedControlAppearance, type SegmentedControlChoice, type SegmentedControlLayout, type SegmentedControlProps, type SegmentedControlShape, type SegmentedControlSize };
```

## `@kerfjs/ui/state-banner`

```ts
import { SafeHtml } from 'kerfjs';

type StateBannerTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
interface StateBannerProps {
    title: string;
    detail?: string;
    icon?: SafeHtml;
    action?: SafeHtml;
    tone?: StateBannerTone;
    urgency?: 'status' | 'alert';
    className?: string;
}
declare function StateBanner({ title, detail, icon, action, tone, urgency, className }: StateBannerProps): SafeHtml;

export { StateBanner, type StateBannerProps, type StateBannerTone };
```

## `@kerfjs/ui/empty-state`

```ts
import { SafeHtml } from 'kerfjs';

interface EmptyStateProps {
    title: string;
    detail?: string;
    icon?: SafeHtml;
    action?: SafeHtml;
    busy?: boolean;
    className?: string;
}
declare function EmptyState({ title, detail, icon, action, busy, className }: EmptyStateProps): SafeHtml;

export { EmptyState, type EmptyStateProps };
```

## `@kerfjs/ui/loading-spinner`

```ts
import * as kerfjs from 'kerfjs';

interface LoadingSpinnerProps {
    className?: string;
    label?: string;
}
/** Stable viewBox-centered progress ring based on svg-spinners' MIT-licensed 180-ring. */
declare function LoadingSpinner({ className, label }: LoadingSpinnerProps): kerfjs.SafeHtml;

export { LoadingSpinner, type LoadingSpinnerProps };
```

## `@kerfjs/ui/token-search-field`

```ts
import { SafeHtml } from 'kerfjs';

interface TokenSearchToken {
    value: string;
    label: string;
    offset?: number;
    accessibleLabel?: string;
}
interface TokenSearchFieldProps {
    id: string;
    label: string;
    query?: string;
    tokens?: readonly TokenSearchToken[];
    placeholder?: string;
    tokenPlaceholder?: string;
    disabled?: boolean;
    autofocus?: boolean;
    /** Allow an empty field to render as one iconic action. */
    collapsible?: boolean;
    /** Keep an empty collapsible field open while the application owns focus. */
    expanded?: boolean;
    expandAction?: string;
    expandLabel?: string;
    leading?: SafeHtml;
    trailing?: SafeHtml;
    editAction?: string;
    removeAction?: string;
    clearAction?: string;
    clearLabel?: string;
    className?: string;
    editorAttributes?: Readonly<Record<`data-${string}`, string>>;
}
interface TokenSearchFieldValue {
    query: string;
    tokens: TokenSearchToken[];
}
declare function TokenSearchField({ id, label, query, tokens, placeholder, tokenPlaceholder, disabled, autofocus, collapsible, expanded, expandAction, expandLabel, leading, trailing, editAction, removeAction, clearAction, clearLabel, className, editorAttributes, }: TokenSearchFieldProps): SafeHtml;
/** Read editable text and ordered token offsets from a rendered TokenSearchField editor. */
declare function readTokenSearchField(editor: HTMLElement, knownTokens?: readonly TokenSearchToken[]): TokenSearchFieldValue;
/** Focus an editor and place its caret at a text offset, skipping atomic token chips. */
declare function placeTokenSearchCaret(editor: HTMLElement, offset?: number): void;

export { TokenSearchField, type TokenSearchFieldProps, type TokenSearchFieldValue, type TokenSearchToken, placeTokenSearchCaret, readTokenSearchField };
```

## `@kerfjs/ui/wire-token-search-fields`

```ts
interface TokenSearchSubmit {
    id: string;
    editor: HTMLElement;
}
interface WireTokenSearchFieldsOptions {
    onSubmit: (submission: TokenSearchSubmit) => void;
}
/** Keep TokenSearchField wrapping, submit Enter, and preserve its caret across controlled token deletion. */
declare function wireTokenSearchFields(root: HTMLElement, { onSubmit }: WireTokenSearchFieldsOptions): () => void;

export { type TokenSearchSubmit, type WireTokenSearchFieldsOptions, wireTokenSearchFields };
```

## `kerfjs/actions`

```ts
import { A as AttrSpec } from './attrSelector-Cmu2ZoGO.js';
import { D as DelegateOptions } from './delegate-CL9VTZFb.js';

/**
 * `kerfjs/actions` — the delegated action-table helper.
 *
 * The most-reinvented idiom across real kerf apps: one table of `data-action`
 * attribute specs used as the single source of truth for BOTH the JSX attribute
 * and the delegate selector, plus a hand-rolled `switch (dataset.action)`
 * dispatcher. This subpath blesses it as two thin helpers over the existing
 * `attr()` + `delegate()` — it does NOT replace them.
 *
 *   import { action, delegateActions } from 'kerfjs/actions';
 *
 *   const A = {
 *     select: action('select-file'),
 *     remove: action('remove-file'),
 *   };
 *
 *   // JSX — spread the attr (rename-safe; no hardcoded attribute name):
 *   //   <button {...A.select.attrs} data-id={id}>…</button>
 *
 *   // Wire the whole table with ONE delegated listener; returns a disposer:
 *   const dispose = delegateActions(root, 'click', {
 *     [A.select.value]: (_e, el) => selectFile(el.getAttribute('data-id')),
 *     [A.remove.value]: (_e, el) => removeFile(el.getAttribute('data-id')),
 *   });
 *
 * Contract: `delegateActions` returns a `() => void` disposer and holds no
 * per-instance state — the same shape as `delegate()`, which it builds on (so
 * it inherits the single-listener dispatch and the capture auto-promotion for
 * well-known non-bubbling event types). One event type per call, mirroring
 * `delegate()`; collect the disposers for a root that needs several.
 */

/**
 * A handler in a {@link delegateActions} table. Receives the DOM event and the
 * matched element (walk-up `closest()` match by default) — the same shape as a
 * `delegate()` handler.
 */
type ActionHandler<E extends Element = Element> = (event: Event, el: E) => void;
/**
 * `action(value)` — an {@link AttrSpec} on `data-action`. A thin specialization
 * of `attr('data-action', value)`: spread its `.attrs` in JSX and use its
 * `.value` as the handler-table key, so the action name lives in exactly one
 * place and can't drift between the markup and the dispatcher.
 */
declare function action<V extends string>(value: V): AttrSpec<'data-action', V>;
/** Options for {@link delegateActions}. Extends {@link DelegateOptions}. */
interface DelegateActionsOptions extends DelegateOptions {
    /**
     * The attribute the table keys on. Default `'data-action'`. Override it only
     * if you also author the specs with `attr(yourName, …)` instead of `action()`.
     */
    attr?: string;
}
/**
 * Wire a whole table of action handlers with ONE delegated listener.
 *
 * On `eventType`, the nearest element carrying the action attribute (walk-up
 * `closest()` by default; pass `{ match: 'direct' }` for an exact-element match)
 * is looked up in `table` by its attribute value, and the matching handler
 * runs. An element whose action is absent from the table is ignored — the same
 * behavior as a `switch (dataset.action)` with no matching `case`.
 *
 * Returns a `() => void` disposer. One event type per call (the smallest
 * surface, mirroring `delegate()`); collect the disposers when a root needs
 * several event types.
 */
declare function delegateActions<E extends Element = Element>(root: HTMLElement, eventType: string, table: Readonly<Record<string, ActionHandler<E>>>, options?: DelegateActionsOptions): () => void;

export { type ActionHandler, type DelegateActionsOptions, action, delegateActions };
```
