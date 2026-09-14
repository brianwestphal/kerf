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
    'data-toggle'?: never;
}>;
type MenuHeaderTriggerAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-action'?: never;
    popoverTarget?: string;
    popoverTargetAction?: 'toggle' | 'show' | 'hide';
    'aria-controls'?: string;
    'aria-haspopup'?: 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid' | 'true';
}>;
interface MenuHeaderProps {
    label: string;
    badge?: SafeHtml;
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
declare function MenuHeader({ label, badge, action, actionLabel, actionIcon, actionDisabled, disabledReason, expanded, toggle, rootAttributes, triggerAttributes }: MenuHeaderProps): SafeHtml;

export { MenuHeader, type MenuHeaderProps };
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
    children: SafeHtml | SafeHtml[];
}
declare const clampRegionSize: (size: number, min: number, max: number) => number;
declare const resizeRegionFromPointer: (startSize: number, delta: number, edge: ResizableRegionEdge) => number;
declare function ResizableRegion({ id, label, size, min, max, axis, edge, collapsed, transitioning, children }: ResizableRegionProps): SafeHtml;

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
