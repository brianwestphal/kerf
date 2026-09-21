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
declare function Toolbar({ leading, center, trailing, label, divider, className, }: ToolbarProps): SafeHtml;

export { Toolbar, type ToolbarProps };
```

## `@kerfjs/ui/toolbar-text`

```ts
import * as kerfjs from 'kerfjs';

type ToolbarTextSize = 'xlarge' | 'large' | 'default' | 'small';
/** ARIA heading level for a title exposed as a heading landmark. */
type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
interface ToolbarTextProps {
    text: string;
    size?: ToolbarTextSize;
    className?: string;
    /** Optional id, e.g. so a dialog can reference the title via aria-labelledby. */
    id?: string;
    /**
     * Expose heading semantics (`role="heading"` + `aria-level`) so the text acts as
     * a heading landmark — e.g. a page's primary title. Omit to keep the plain span
     * (the default), which suits a dialog title referenced via `aria-labelledby`.
     */
    headingLevel?: HeadingLevel;
    /** Render the text as an unanimated loading skeleton instead of its value. */
    placeholder?: boolean;
    /**
     * Wrap onto multiple lines when the text does not fit, instead of the default
     * single line. Combine with `maxLines` to cap the number of lines. Default false.
     */
    wrap?: boolean;
    /**
     * Show a trailing ellipsis (…) where the text is truncated — on the single line
     * (default), or at the `maxLines` boundary when wrapping. Set false to hard-clip
     * instead. Default true.
     */
    ellipsis?: boolean;
    /**
     * Cap wrapped text to this many lines, truncating past it. Only takes effect with
     * `wrap`; ignored on a single line. `null`/omitted wraps without a line cap. Default null.
     */
    maxLines?: number | null;
}
declare function ToolbarText({ text, size, className, id, headingLevel, placeholder, wrap, ellipsis, maxLines, }: ToolbarTextProps): kerfjs.SafeHtml;

export { type HeadingLevel, ToolbarText, type ToolbarTextProps, type ToolbarTextSize };
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
    /** Corner shape: fully round `pill` (default) or a softer `rounded` rectangle. */
    shape?: 'pill' | 'rounded';
}
declare function ToolbarControlGroup({ children, label, className, expanded, single, appearance, tone, buttonAppearance, shape, }: ToolbarControlGroupProps): SafeHtml;

export { ToolbarControlGroup, type ToolbarControlGroupProps };
```

## `@kerfjs/ui/floating-toolbar`

```ts
import { SafeHtml } from 'kerfjs';

/** Where a {@link FloatingToolbar} floats within its positioned container. */
type FloatingToolbarPosition = 'bottom' | 'bottom-start' | 'bottom-end' | 'top' | 'top-start' | 'top-end';
interface FloatingToolbarProps {
    /** Toolbar contents — normally one or more `ToolbarControlGroup`s. */
    children: SafeHtml | SafeHtml[];
    /** Accessible name for the toolbar (required — it exposes `role="toolbar"`). */
    label: string;
    /**
     * Corner or edge it floats to inside its nearest positioned ancestor.
     * Default: `'bottom-end'`.
     */
    position?: FloatingToolbarPosition;
    className?: string;
}
/**
 * A toolbar that floats above the main content of its nearest positioned
 * ancestor — a transparent, forced-dark cluster of controls (e.g. a drawer
 * restore button) that sits over the content but NOT over dialogs or overlays
 * (it is not in the top layer). It is inset from the container edges by
 * `--kui-floating-toolbar-inset` (default `--kui-space-m`, i.e. 8px more than a
 * top toolbar's own inset); override that token to move it. The app owns the
 * controls and their behavior — wire them with `delegate()` as usual.
 */
declare function FloatingToolbar({ children, label, position, className, }: FloatingToolbarProps): SafeHtml;

export { FloatingToolbar, type FloatingToolbarPosition, type FloatingToolbarProps };
```

## `@kerfjs/ui/list-header`

```ts
import { SafeHtml } from 'kerfjs';

type ListHeaderRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-has-badge'?: never;
    'data-has-count'?: never;
    'data-toggle'?: never;
}>;
type ListHeaderTriggerAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-action'?: never;
    popoverTarget?: string;
    popoverTargetAction?: 'toggle' | 'show' | 'hide';
    'aria-controls'?: string;
    'aria-haspopup'?: 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid' | 'true';
}>;
interface ListHeaderBaseProps {
    label: string;
    action?: string;
    actionLabel?: string;
    actionIcon?: SafeHtml;
    actionDisabled?: boolean;
    disabledReason?: string;
    expanded?: boolean;
    toggle?: boolean;
    /** Render as an unanimated loading skeleton: keep the label and action affordance, disable interaction. */
    placeholder?: boolean;
    rootAttributes?: ListHeaderRootAttributes;
    triggerAttributes?: ListHeaderTriggerAttributes;
}
type ListHeaderIndicatorProps = {
    count: number;
    countLabel: string;
    badge?: never;
} | {
    count?: never;
    countLabel?: never;
    badge?: SafeHtml;
};
type ListHeaderProps = ListHeaderBaseProps & ListHeaderIndicatorProps;
declare function ListHeader({ label, count, countLabel, badge, action, actionLabel, actionIcon, actionDisabled, disabledReason, expanded, toggle, placeholder, rootAttributes, triggerAttributes, }: ListHeaderProps): SafeHtml;

export { ListHeader, type ListHeaderProps };
```

## `@kerfjs/ui/list-action-row`

```ts
import { SafeHtml } from 'kerfjs';

type ListActionRowRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-has-icon'?: never;
    'data-multiline'?: never;
    'data-state'?: never;
    'data-selected'?: never;
    'data-pressed'?: never;
}>;
type ListActionRowTrailingAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    popoverTarget?: string;
    popoverTargetAction?: 'toggle' | 'show' | 'hide';
    'aria-controls'?: string;
    'aria-haspopup'?: 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid' | 'true';
}>;
interface ListActionRowProps {
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
    /** Render as an unanimated loading skeleton, disabling both actions. */
    placeholder?: boolean;
    trailingAction: string;
    trailingActionLabel: string;
    /** Decorative dormant content for the trailing button. Must not contain interactive descendants. */
    trailingActionIcon: SafeHtml;
    trailingActionDisabled?: boolean;
    trailingActionTitle?: string;
    className?: string;
    style?: string;
    rootAttributes?: ListActionRowRootAttributes;
    trailingActionAttributes?: ListActionRowTrailingAttributes;
}
declare function ListActionRow({ label, icon, action, itemId, selected, pressed, accessibleLabel, title, multiline, state, disabled, tabIndex, placeholder, trailingAction, trailingActionLabel, trailingActionIcon, trailingActionDisabled, trailingActionTitle, className, style, rootAttributes, trailingActionAttributes, }: ListActionRowProps): SafeHtml;

export { ListActionRow, type ListActionRowProps };
```

## `@kerfjs/ui/list-item`

```ts
import { SafeHtml } from 'kerfjs';

type ListItemRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-has-icon'?: never;
    'data-multiline'?: never;
    'data-state'?: never;
}>;
interface ListItemProps {
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
    /** Render the row as an unanimated loading skeleton, disabling its action. */
    placeholder?: boolean;
    rootAttributes?: ListItemRootAttributes;
}
declare function ListItem({ label, icon, trailing, selected, action, itemId, className, style, pressed, accessibleLabel, title, multiline, state, disabled, tabIndex, placeholder, rootAttributes, }: ListItemProps): SafeHtml;

export { ListItem, type ListItemProps };
```

## `@kerfjs/ui/list-inset-control`

```ts
import { SafeHtml } from 'kerfjs';

interface ListInsetControlProps {
    /** Control(s) that own their own border and padding (e.g. an input, a `wa-*`). */
    children: SafeHtml | SafeHtml[];
    className?: string;
}
/**
 * Insets a control into a pane/list content region: an 8px inline margin (so its
 * edges line up with `.kui-content` items) and a stretch flex row with an 8px gap.
 * Use it for controls that carry their own border and padding but no outer margin
 * — the wrapper adds only the alignment margin and layout, not a second inset.
 */
declare function ListInsetControl({ children, className, }: ListInsetControlProps): SafeHtml;

export { ListInsetControl, type ListInsetControlProps };
```

## `@kerfjs/ui/list-inset-text`

```ts
import { SafeHtml } from 'kerfjs';

interface ListInsetTextProps {
    /** Text (or inline content) that carries no margin, border, or padding of its own. */
    children: SafeHtml | SafeHtml[] | string;
    /**
     * Keep only the horizontal geometry (inline margin, left/right border, and
     * left/right padding) and drop the vertical margin, border, and padding. Use it
     * when the text edge must still align with bordered items but the line should not
     * add its own vertical box space — tight text layout inside a content region.
     */
    horizontalOnly?: boolean;
    className?: string;
}
/**
 * Gives bare text the content-item geometry — an 8px inline margin, a 1px
 * transparent border, and 8px padding — so a plain string lines up with
 * bordered `.kui-content` items (its text edge lands at the same 17px inset).
 * Use it for text elements that have no margin, border, or padding of their own.
 * Pass `horizontalOnly` to keep the horizontal inset but drop the vertical box
 * space for tight text layout.
 */
declare function ListInsetText({ children, horizontalOnly, className, }: ListInsetTextProps): SafeHtml;

export { ListInsetText, type ListInsetTextProps };
```

## `@kerfjs/ui/panel-header`

```ts
import { SafeHtml } from 'kerfjs';
import { HeadingLevel } from './toolbar-text.js';

interface PanelHeaderProps {
    title: string;
    titleId: string;
    summary?: string;
    summaryId?: string;
    icon?: SafeHtml;
    iconClassName?: string;
    actions?: SafeHtml;
    /**
     * Expose the title as a heading landmark (`role="heading"` + `aria-level`). Set it
     * for a PAGE or view heading so screen-reader heading navigation works and the view
     * has a primary heading; omit it (the default) for a dialog title, which is instead
     * referenced via `aria-labelledby={titleId}` and needs no heading landmark.
     */
    headingLevel?: HeadingLevel;
    /** Render the title and summary as unanimated loading skeletons, keeping the icon and actions. */
    placeholder?: boolean;
}
/**
 * The heading of a panel, dialog, or page: a plain `Toolbar` whose leading zone
 * holds an optional icon control group and the title as extra-large `ToolbarText`,
 * whose trailing zone holds the app's action controls, and with an optional
 * subtitle on its own row, left-aligned with the title.
 *
 * PanelHeader overrides no Toolbar styles — it is just a Toolbar with an xl title.
 * The only styling it adds is the icon group's fill/border color and the subtitle.
 * When no icon is provided, the icon group is omitted entirely. The `actions` slot
 * is passed straight into the toolbar's trailing zone; the app supplies whatever
 * trailing controls it needs (typically a `ToolbarControlGroup`).
 */
declare function PanelHeader({ title, titleId, summary, summaryId, icon, iconClassName, actions, headingLevel, placeholder, }: PanelHeaderProps): SafeHtml;

export { PanelHeader, type PanelHeaderProps };
```

## `@kerfjs/ui/value-table`

```ts
import { SafeHtml } from 'kerfjs';

interface ValueTableRowProps {
    label: string | SafeHtml;
    value: string | SafeHtml;
    icon?: SafeHtml;
    className?: string;
    /** Render the value as an unanimated loading skeleton, keeping the field label. */
    placeholder?: boolean;
}
declare function ValueTableRow({ label, value, icon, className, placeholder, }: ValueTableRowProps): SafeHtml;

interface ValueTableProps {
    label: string;
    className?: string;
    children: SafeHtml | readonly SafeHtml[];
}
declare function ValueTable({ label, className, children, }: ValueTableProps): SafeHtml;

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
    /** Render as an unanimated loading skeleton, disabling select/close and dragging. */
    placeholder?: boolean;
    rootAttributes?: AppTabRootAttributes;
}
declare function AppTab({ id, name, selected, closable, draggable, leading, trailing, closeIcon, selectAction, closeAction, className, placeholder, rootAttributes, }: AppTabProps): SafeHtml;

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
    /**
     * Keyboard activation mode for this strip, emitted as `data-tab-activation` for
     * `wireTabBars` to read (overrides its `activation` option). `'automatic'` (default)
     * selects on arrow / Home / End; `'manual'` moves roving focus only and the user
     * selects with Enter / Space / click — use it when selecting a tab is a heavy action.
     */
    activation?: 'automatic' | 'manual';
}
/** Render a controlled tab strip. The application owns selection, order, and persistence. */
declare function TabBar({ id, label, children, leading, trailing, className, activation, }: TabBarProps): SafeHtml;

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
type TabActivation = 'automatic' | 'manual';
interface WireTabBarsOptions {
    onReorder: (change: TabReorder) => void;
    /**
     * How arrow / Home / End keys activate tabs (default `'automatic'`):
     * - `'automatic'` moves roving focus **and** selects the focused tab (clicks it).
     * - `'manual'` moves roving focus only; the user selects with Enter / Space / click
     *   (the ARIA Tabs manual-activation pattern). Use this when activation is a heavy or
     *   side-effecting action (e.g. a tab that loads a project) so arrowing through the
     *   strip doesn't trigger it on every tab.
     *
     * A per-bar `data-tab-activation="manual" | "automatic"` attribute (see the `TabBar`
     * `activation` prop) overrides this option for that strip.
     */
    activation?: TabActivation;
}
declare function reorderTabs<T>(items: readonly T[], getId: (item: T) => string, sourceId: string, targetId: string, position: TabDropPosition): T[];
/** Wire reordering and keyboard navigation while leaving controlled state in the application. */
declare function wireTabBars(root: HTMLElement | Document, { onReorder, activation }: WireTabBarsOptions): () => void;

export { type TabActivation, type TabDropPosition, type TabReorder, type TabReorderSource, type WireTabBarsOptions, reorderTabs, wireTabBars };
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
declare function NavStack({ id, label, views, backLabel, hideToolbar, bottomToolbar, className, }: NavStackProps): SafeHtml;

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
 * A list-detail split. On roomy classes it shows both panes side
 * by side with an optional resizable separator; on compact classes it collapses
 * to a `NavStack` (list → detail). See `docs/23-app-layouts.md` §3.2. Compose the
 * resizable wiring with `wireResizableRegions` and the compact back with
 * `wireNavStack`.
 */
declare function SplitView({ id, label, list, detail, compact, detailActive, listTitle, detailTitle, backLabel, resizable, className, }: SplitViewProps): SafeHtml;

export { SplitView, type SplitViewProps, type SplitViewResizable };
```

## `@kerfjs/ui/pane`

```ts
import { SafeHtml } from 'kerfjs';

/** Logical sides that can show a {@link Pane} separator. */
type PaneSeparatorSide = 'block-start' | 'block-end' | 'inline-start' | 'inline-end';
/** Semantic root elements supported by {@link Pane}. */
type PaneElement = 'article' | 'aside' | 'div' | 'main' | 'section';
/** Semantic elements supported by the scrolling content slot. */
type PaneContentElement = 'div' | 'main' | 'nav' | 'section';
type PaneRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-separator-block-start'?: never;
    'data-separator-block-end'?: never;
    'data-separator-inline-start'?: never;
    'data-separator-inline-end'?: never;
}>;
interface PaneProps {
    /** Optional fixed chrome above the scrolling content, arranged vertically. */
    header?: SafeHtml | readonly SafeHtml[];
    /** The pane's primary vertical, scrolling content stack. */
    children?: SafeHtml | readonly SafeHtml[];
    /** Optional fixed chrome below the scrolling content. */
    footer?: SafeHtml | readonly SafeHtml[];
    /** Root semantics. Defaults to `div`. */
    element?: PaneElement;
    /** Scrolling content semantics. Defaults to `div`. */
    contentElement?: PaneContentElement;
    /** Independent logical-edge separator lines. Defaults to none. */
    separators?: readonly PaneSeparatorSide[];
    id?: string;
    /** Accessible name for a landmark root such as `aside` or `main`. */
    label?: string;
    /** Accessible name for a landmark scrolling slot such as `nav`. */
    contentLabel?: string;
    className?: string;
    headerClassName?: string;
    contentClassName?: string;
    footerClassName?: string;
    /** Safe `data-*` metadata; Pane-owned structural attributes remain protected. */
    rootAttributes?: PaneRootAttributes;
}
/**
 * An unpadded application column with optional fixed header/footer slots and one
 * scrolling vertical content owner. Separator lines are independently opt-in on
 * each logical edge, so the same component works as a sidebar, main area,
 * inspector, or dialog column.
 */
declare function Pane({ header, children, footer, element, contentElement, separators, id, label, contentLabel, className, headerClassName, contentClassName, footerClassName, rootAttributes, }: PaneProps): SafeHtml;

export { Pane, type PaneContentElement, type PaneElement, type PaneProps, type PaneSeparatorSide };
```

## `@kerfjs/ui/workbench`

```ts
import { SafeHtml } from 'kerfjs';

/** A collapsible Workbench panel — a side rail or the bottom drawer. */
interface WorkbenchPanel {
    content: SafeHtml;
    /** Whether the panel is currently collapsed (the app owns this). */
    collapsed?: boolean;
    /** Rail width, or drawer height, in px. Overrides the CSS default. */
    size?: number;
    /** Accessible name for the panel region. */
    label?: string;
}
interface WorkbenchProps {
    id: string;
    label: string;
    /** The central work area. */
    main: SafeHtml;
    leftRail?: WorkbenchPanel;
    rightRail?: WorkbenchPanel;
    bottomDrawer?: WorkbenchPanel;
    className?: string;
}
/**
 * The Xcode-like multi-panel workspace: a collapsible left rail, right rail, and
 * bottom drawer around a central work area (any absent). Collapsing snaps the
 * panel's track to zero in one reflow while its fixed-size content slides out via
 * a composited transform — the instant-width / sliding-content technique, so the
 * work area relayouts once, not per frame. The app owns each `collapsed` flag;
 * the collapse is pure CSS (no wire). See `docs/23-app-layouts.md` §3.3.
 */
declare function Workbench({ id, label, main, leftRail, rightRail, bottomDrawer, className, }: WorkbenchProps): SafeHtml;

export { Workbench, type WorkbenchPanel, type WorkbenchProps };
```

## `@kerfjs/ui/collapsible-panel`

```ts
import { SafeHtml } from 'kerfjs';
import { LucideIcon } from './lucide-icon.js';
import 'lucide';

/** Which edge a {@link CollapsiblePanel} docks to. */
type CollapsiblePanelSide = 'left' | 'right' | 'bottom';
/**
 * The standard collapse/expand icon for a panel `side` and `collapsed` state,
 * so every app's sidebars and drawers use one recognizable convention:
 * `PanelLeft*` for a left rail, `PanelRight*` for a right rail, `PanelBottom*`
 * for a bottom drawer — the `Close` glyph while open, the `Open` glyph while
 * collapsed. Exposed so an app can render its own toggle affordance.
 */
declare function collapsiblePanelToggleIcon(side: CollapsiblePanelSide, collapsed: boolean): {
    icon: Parameters<typeof LucideIcon>[0]['icon'];
    name: string;
};
interface CollapsiblePanelToggleProps {
    /** The panel this toggle controls. */
    side: CollapsiblePanelSide;
    /** The panel's current collapsed state (drives the icon direction). */
    collapsed: boolean;
    /** `data-action` the button carries so `wireSidebar` can delegate its click. */
    action: string;
    /** The panel id the button targets (`data-tab-panel`-style: `data-collapsible-panel`). */
    panelId?: string;
    /** Accessible label; defaults to "Collapse"/"Expand". */
    label?: string;
    className?: string;
}
/**
 * A standard collapse/expand toggle button for a {@link CollapsiblePanel}: the
 * recognizable per-side icon (see {@link collapsiblePanelToggleIcon}) plus the
 * `data-action` / `aria-expanded` `wireSidebar` reads. Placement is the app's —
 * put it in the panel's own header (to collapse) and somewhere always-visible
 * (to expand while collapsed).
 */
declare function CollapsiblePanelToggle({ side, collapsed, action, panelId, label, className, }: CollapsiblePanelToggleProps): SafeHtml;
interface CollapsiblePanelProps {
    /** A stable id for the panel — `wireSidebar` targets it and toggles reference it. */
    id: string;
    /** Which edge the panel docks to: a left/right rail or a bottom drawer. */
    side: CollapsiblePanelSide;
    /** Whether the panel is currently collapsed (the app owns this signal). */
    collapsed?: boolean;
    /** Rail width or drawer height in px. Overrides the CSS default. */
    size?: number;
    /** Accessible label for the panel region. */
    label?: string;
    /** Panel content. */
    children?: SafeHtml | readonly SafeHtml[];
    className?: string;
}
/**
 * A standalone collapsible side rail or bottom drawer, outside the full
 * {@link Workbench} shell. It owns only the presentation: a fixed-size content
 * area that stays laid out while the panel's track snaps to zero and the content
 * slides out via `transform` (one reflow, composited — the same technique
 * `Workbench` and the catalog sidebar use). The app owns the `collapsed` signal;
 * pair it with `wireSidebar` for the toggle, focus, compact-overlay, keyboard,
 * and persistence semantics, and with `CollapsiblePanelToggle` for the standard
 * affordance. See `docs/24-collapsible-panel.md`.
 */
declare function CollapsiblePanel({ id, side, collapsed, size, label, children, className, }: CollapsiblePanelProps): SafeHtml;

export { CollapsiblePanel, type CollapsiblePanelProps, type CollapsiblePanelSide, CollapsiblePanelToggle, type CollapsiblePanelToggleProps, collapsiblePanelToggleIcon };
```

## `@kerfjs/ui/wire-sidebar`

```ts
import { Signal, ReadonlySignal } from 'kerfjs';
import { DeviceClass } from './device-class.js';

/** Minimal `localStorage`-shaped store, so the persistence hook is testable. */
interface SidebarStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
interface WireSidebarPanel {
    /** The panel id — matches `CollapsiblePanel`'s `id` and a toggle's `panelId`. */
    id: string;
    /** The app-owned collapsed signal. `wireSidebar` reads it (focus, overlay) and
     *  writes it (toggle, Escape, backdrop, persistence). */
    collapsed: Signal<boolean>;
    /** `data-action` value the panel's toggle button(s) carry. */
    toggleAction: string;
    /** When set, the collapsed state is loaded from and saved to `storage` under
     *  this key (a persistence hook), so the panel remembers its state. */
    storageKey?: string;
}
interface WireSidebarOptions {
    panels: readonly WireSidebarPanel[];
    /**
     * When provided, the sidebar adopts a compact **overlay** presentation while
     * `deviceClass.compact` is true: an open panel floats over the content with a
     * dismissable backdrop, Escape and backdrop-click collapse it, and focus is
     * trapped within the open panel (the ARIA dialog pattern). Without it the panel
     * is always inline.
     */
    deviceClass?: ReadonlySignal<DeviceClass>;
    /** Persistence store (default `globalThis.localStorage`, if present). */
    storage?: SidebarStorage;
}
/**
 * The reusable sidebar-semantics layer for {@link CollapsiblePanel}s: toggle
 * delegation with focus restore, focus-into on open, an optional compact overlay
 * (backdrop + Escape + focus trap) driven by {@link deviceClass}, and an optional
 * persistence hook. The app owns each `collapsed` signal and the layout; this wire
 * owns the interaction. Returns a disposer. See `docs/24-collapsible-panel.md`.
 */
declare function wireSidebar(root: HTMLElement, { panels, deviceClass, storage }: WireSidebarOptions): () => void;

export { type SidebarStorage, type WireSidebarOptions, type WireSidebarPanel, wireSidebar };
```

## `@kerfjs/ui/tab-scaffold`

```ts
import { SafeHtml } from 'kerfjs';

interface TabScaffoldTab {
    id: string;
    label: string;
    /** Decorative icon shown above the label in the bottom bar. */
    icon?: SafeHtml;
    /** The tab's content — typically a `NavStack` so each tab keeps its own stack. */
    content: SafeHtml;
}
interface TabScaffoldProps {
    id: string;
    /** Accessible name for the tab bar. */
    label: string;
    tabs: TabScaffoldTab[];
    /** The controlled active tab id (the app owns selection). */
    active: string;
    className?: string;
}
/**
 * A mobile-first, iOS-like bottom tab scaffold: a bottom tab bar that switches
 * between major sections, each tab keeping its own content (usually a `NavStack`)
 * mounted so its stack and scroll survive a switch. Controlled — the app owns
 * `active`; wire selection with `@kerfjs/ui/wire-tab-scaffold`'s `wireTabScaffold`.
 * On larger classes, promote the tabs to a `Workbench` rail or sidebar instead of
 * a bottom bar. See `docs/23-app-layouts.md` §3.4.
 */
declare function TabScaffold({ id, label, tabs, active, className, }: TabScaffoldProps): SafeHtml;

export { TabScaffold, type TabScaffoldProps, type TabScaffoldTab };
```

## `@kerfjs/ui/wire-tab-scaffold`

```ts
interface WireTabScaffoldOptions {
    /** Invoked with the selected tab id when a bottom-bar tab is activated. */
    onSelect: (tabId: string) => void;
}
/**
 * Wire a `TabScaffold`'s bottom tab bar: clicking a tab calls `onSelect` with its
 * id (the app then updates its controlled `active`). Returns a disposer.
 */
declare function wireTabScaffold(root: Element, options: WireTabScaffoldOptions): () => void;

export { type WireTabScaffoldOptions, wireTabScaffold };
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
declare function ResizableRegion({ id, label, size, min, max, axis, edge, collapsed, transitioning, handleIcon, children, }: ResizableRegionProps): SafeHtml;

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
declare function wireResizableRegions(root: HTMLElement, { step, largeStep, onPreview, onCommit, }: WireResizableRegionsOptions): () => void;

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

## `@kerfjs/ui/catalog`

```ts
import { SafeHtml } from 'kerfjs';

/** A reference link shown in the detail footer for the active entry. */
interface CatalogResource {
    label: string;
    href: string;
    /** Optional monospace detail (e.g. a file path) shown after the label. */
    detail?: string;
}
/** A related entry offered in the detail footer's "Related entries" popup menu. */
interface CatalogRelated {
    id: string;
    name: string;
    /** Group heading in the menu, e.g. "Uses" / "Used by". */
    group: string;
}
interface CatalogEntry {
    id: string;
    name: string;
    description?: string;
    /** Short metadata tags shown at the trailing edge of the sidebar row. */
    tags?: readonly string[];
    resources?: readonly CatalogResource[];
    related?: readonly CatalogRelated[];
}
interface CatalogSection {
    category: string;
    entries: readonly CatalogEntry[];
}
/**
 * A secondary group of sections shown below the primary sidebar sections with a
 * quieter "ecosystem" treatment (e.g. third-party components). Optionally
 * collapsible — the app owns `expanded` and toggles it from `wireCatalog`'s
 * `onToggleSecondary`.
 */
interface CatalogSecondaryGroup {
    label: string;
    sections: readonly CatalogSection[];
    /** When true, the group's label is a disclosure toggle controlling `expanded`. */
    collapsible?: boolean;
    /** Whether the group is expanded (controlled). Ignored unless `collapsible`. */
    expanded?: boolean;
}
interface CatalogBrand {
    title: string;
    subtitle?: string;
    /** Logo image URL (rendered decorative). Omit for a text-only brand. */
    logoUrl?: string;
}
interface CatalogProps {
    brand: CatalogBrand;
    sections: readonly CatalogSection[];
    /** The controlled active entry id — the app owns this signal. */
    active: string;
    /** The rendered preview for the active entry; the app computes it from `active`. */
    content: SafeHtml;
    /** Whether the sidebar is collapsed (controlled). */
    collapsed?: boolean;
    /** Current theme; when set, a theme toggle is shown that switches to the opposite. Omit to hide it. */
    theme?: 'light' | 'dark';
    /** Extra header controls placed before the theme toggle (each a `ToolbarControlGroup`). */
    headerActions?: SafeHtml;
    /** A secondary "ecosystem" group of sections below the primary category groups. */
    secondarySections?: CatalogSecondaryGroup;
    /** Extra sidebar content below the category groups (and the secondary group). */
    sidebarFooter?: SafeHtml;
    /** Status line content shown at the start of the detail footer. */
    status?: SafeHtml;
    /**
     * Whether to highlight transparent specimens' outer bounds and non-zero
     * margins. Pass a boolean (rather than omitting the prop) when the active
     * entry can switch between component and composition previews;
     * `wireCatalogGeometryOverlay` keeps the overlay synchronized.
     */
    geometryOverlay?: boolean;
    selectAction?: string;
    toggleSidebarAction?: string;
    toggleThemeAction?: string;
    /** Action fired by the secondary group's disclosure toggle (when collapsible). */
    toggleSecondaryAction?: string;
    className?: string;
}
/**
 * A reusable component-catalog shell: a collapsible category sidebar, a titled
 * detail stage that renders the active entry's preview, and a footer with
 * reference links and a related-entry popup menu. Built entirely from public
 * `@kerfjs/ui` primitives. Controlled and stateless — the app owns the `active`,
 * `collapsed`, and `theme` signals and computes `content` from `active` in its own
 * render; wire the sidebar/collapse/theme actions with `wireCatalog`.
 */
declare function Catalog({ brand, sections, active, content, collapsed, theme, headerActions, secondarySections, sidebarFooter, status, geometryOverlay, selectAction, toggleSidebarAction, toggleThemeAction, toggleSecondaryAction, className, }: CatalogProps): SafeHtml;
/**
 * How a {@link CatalogExample}'s content aligns its visible left edge with the
 * example's `ListHeader` label (which sits 16px in — 8px title + 8px label):
 * - `'glyph'` — a bare glyph/text specimen with no inline geometry insets the full 16px.
 * - `'inline-control'` — a control that already carries ~8px of its own inline padding insets 8px so its content lands on the same line.
 * - `'none'` — a content-item / composition that owns its geometry and already aligns; no inset (default).
 */
type CatalogExampleAlign = 'glyph' | 'inline-control' | 'none';
type CatalogExampleRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-catalog-example'?: never;
    'data-catalog-example-stack'?: never;
    'data-align'?: never;
}>;
type CatalogExampleStackRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-catalog-example'?: never;
    'data-catalog-example-stack'?: never;
    'data-align'?: never;
}>;
interface CatalogExampleProps {
    /** The example's label, shown as a `ListHeader` above the specimen. Omit for a bare specimen. */
    label?: string;
    /** Optional explanatory note between the label and the specimen. */
    note?: SafeHtml | string;
    /** Alignment inset for the specimen — see {@link CatalogExampleAlign}. Default `'none'`. */
    align?: CatalogExampleAlign;
    /** Safe authoring `data-*` metadata for the rendered section. Helper-owned structural attributes remain protected. */
    rootAttributes?: CatalogExampleRootAttributes;
    className?: string;
    children?: SafeHtml | readonly SafeHtml[];
}
/**
 * One labeled example in a catalog preview: a `ListHeader` label, an optional
 * note, and the specimen. `align` insets the specimen so its visible left edge
 * lines up with the label text, encoding the catalog's alignment rules as a
 * first-class prop instead of per-demo CSS. The inset is published as the
 * `--kui-catalog-example-align` custom property so a debug overlay can exclude it
 * from a specimen's measured margin.
 */
declare function CatalogExample({ label, note, align, rootAttributes, className, children, }: CatalogExampleProps): SafeHtml;
interface CatalogExampleStackProps {
    /** Accessible label for the stack region. */
    label?: string;
    /** Safe authoring `data-*` metadata for the rendered stack. Helper-owned structural attributes remain protected. */
    rootAttributes?: CatalogExampleStackRootAttributes;
    className?: string;
    children?: SafeHtml | readonly SafeHtml[];
}
/** A vertically-stacked group of {@link CatalogExample}s with the catalog's example rhythm. */
declare function CatalogExampleStack({ label, rootAttributes, className, children, }: CatalogExampleStackProps): SafeHtml;

export { Catalog, type CatalogBrand, type CatalogEntry, CatalogExample, type CatalogExampleAlign, type CatalogExampleProps, CatalogExampleStack, type CatalogExampleStackProps, type CatalogProps, type CatalogRelated, type CatalogResource, type CatalogSecondaryGroup, type CatalogSection };
```

## `@kerfjs/ui/catalog-resources`

```ts
import { CatalogResource } from './catalog.js';
import 'kerfjs';

/**
 * Standard resource labels for a Kerf catalog detail footer. Keep these labels
 * stable across catalogs so people and AI-generated integrations see the same
 * choices in the same vocabulary.
 */
type CatalogResourceKind = 'demoSource' | 'componentSource' | 'designTemplate' | 'guidance' | 'integrationGuidance';
interface CatalogResourceTarget {
    href: string;
    /** Optional monospace detail, normally the repository-relative source path. */
    detail?: string;
}
interface CatalogResourcesInput {
    /** Required source for the runnable demonstration. */
    demoSource: CatalogResourceTarget;
    /** Source for the production component; omit for recipes and integrations. */
    componentSource?: CatalogResourceTarget;
    /** Optional design-tool template associated with the component. */
    designTemplate?: CatalogResourceTarget;
    /** Required UI or integration guidance. */
    guidance: CatalogResourceTarget;
    /** Use `integrationGuidance` when the component implementation is upstream. */
    guidanceKind?: 'guidance' | 'integrationGuidance';
}
/**
 * Build the standard catalog resource group in its canonical order: demo,
 * component, optional design template, then guidance.
 */
declare function catalogResources(input: CatalogResourcesInput): CatalogResource[];

export { type CatalogResourceKind, type CatalogResourceTarget, type CatalogResourcesInput, catalogResources };
```

## `@kerfjs/ui/wire-catalog`

```ts
interface WireCatalogOptions {
    /** Invoked with the entry id when a sidebar item or a related-entry option is chosen. */
    onSelect: (id: string) => void;
    /** Invoked when the sidebar collapse/expand control is activated. */
    onToggleSidebar?: () => void;
    /** Invoked when the theme toggle is activated. */
    onToggleTheme?: () => void;
    /** Invoked when the secondary (ecosystem) group's disclosure toggle is activated. */
    onToggleSecondary?: () => void;
    /** When set, `?<urlParam>=<id>` is written on select via `history.replaceState`. */
    urlParam?: string;
    /**
     * Reveal the chosen sidebar row after selection. `true` uses desktop-safe
     * defaults; pass options to customize scroll alignment or the media guard.
     */
    revealSelection?: boolean | CatalogRevealOptions;
    selectAction?: string;
    toggleSidebarAction?: string;
    toggleThemeAction?: string;
    toggleSecondaryAction?: string;
}
interface CatalogRevealOptions {
    /** Scroll alignment within the sidebar. Default `'nearest'`. */
    block?: ScrollLogicalPosition;
    /** Cross-axis alignment. Default `'nearest'`. */
    inline?: ScrollLogicalPosition;
    /** Scroll behavior. Default `'auto'`. */
    behavior?: ScrollBehavior;
    /**
     * Only reveal when this media query matches. Defaults to the Catalog's
     * desktop layout; pass `false` to reveal at every viewport size.
     */
    media?: string | false;
}
/**
 * Reveal one Catalog sidebar entry after the controlled render settles without
 * moving focus. Returns a cancellation function for rapid selection changes.
 */
declare function revealCatalogEntry(root: HTMLElement, id: string, { block, inline, behavior, media, }?: CatalogRevealOptions): () => void;
/**
 * Keep a Catalog's opt-in geometry overlay synchronized with its preview.
 * Transparent specimens receive a dashed outer bound and positive margins use
 * devtools-style orange bands. Returns a disposer.
 */
declare function wireCatalogGeometryOverlay(root: HTMLElement): () => void;
/**
 * Wire a {@link Catalog}'s interactions with one delegated listener set: sidebar
 * item selection (and the related-entry popup menu), the sidebar collapse toggle, and
 * the theme toggle. The app owns the `active`/`collapsed`/`theme` signals and updates
 * them in the callbacks; optionally mirror the active id into the URL via `urlParam`.
 * Returns a disposer.
 */
declare function wireCatalog(root: HTMLElement, { onSelect, onToggleSidebar, onToggleTheme, onToggleSecondary, urlParam, revealSelection, selectAction, toggleSidebarAction, toggleThemeAction, toggleSecondaryAction, }: WireCatalogOptions): () => void;

export { type CatalogRevealOptions, type WireCatalogOptions, revealCatalogEntry, wireCatalog, wireCatalogGeometryOverlay };
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
    /** Render as an unanimated loading skeleton, disabling every segment. */
    placeholder?: boolean;
}
declare function SegmentedControl({ id, label, value, choices, action, appearance, shape, size, layout, className, placeholder, }: SegmentedControlProps): SafeHtml;

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
    /** Render the title and detail as unanimated loading skeletons, keeping the icon and tone. */
    placeholder?: boolean;
}
declare function StateBanner({ title, detail, icon, action, tone, urgency, className, placeholder, }: StateBannerProps): SafeHtml;

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
declare function EmptyState({ title, detail, icon, action, busy, className, }: EmptyStateProps): SafeHtml;

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

## `@kerfjs/ui/skeleton`

```ts
import * as kerfjs from 'kerfjs';

interface SkeletonProps {
    /** Width as any CSS length (e.g. `remify(120px)`, `60%`). Defaults to filling its slot. */
    width?: string;
    /** Height as any CSS length. Defaults to a single text line. */
    height?: string;
    /** Corner radius override (a CSS length). Defaults to the small radius token. */
    radius?: string;
    /** Render this many stacked lines (the last one shorter), for multi-line text. */
    lines?: number;
    /** Accessible label. Omit to keep the block decorative (`aria-hidden`). */
    label?: string;
    className?: string;
}
/**
 * A subtle, deliberately **unanimated** loading placeholder block. Use it for a
 * value slot whose content is not yet known, on its own or via a component's
 * `placeholder` prop. Decorative by default (`aria-hidden`); pass `label` to
 * announce it. Sizes to its slot unless `width`/`height` are given.
 */
declare function Skeleton({ width, height, radius, lines, label, className, }: SkeletonProps): kerfjs.SafeHtml;

export { Skeleton, type SkeletonProps };
```

## `@kerfjs/ui/sunken-panel`

```ts
import { SafeHtml } from 'kerfjs';

interface SunkenPanelProps {
    children?: SafeHtml | readonly SafeHtml[];
    /** Optional accessible landmark name for a distinct application region. */
    ariaLabel?: string;
    className?: string;
}
/**
 * A lowered application surface with one compact inset and a vertical content
 * stack. The panel owns its background and padding; children own their own
 * borders and internal geometry.
 */
declare function SunkenPanel({ children, ariaLabel, className, }: SunkenPanelProps): SafeHtml;

export { SunkenPanel, type SunkenPanelProps };
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
import { Signal } from 'kerfjs';

interface TokenSearchSubmit {
    id: string;
    editor: HTMLElement;
}
/** Reported to {@link WireTokenSearchFieldsOptions.onEdit} on every editor input. */
interface TokenSearchEdit extends TokenSearchSubmit {
    /**
     * The `InputEvent` that mutated the editor — read `event.inputType` / `event.data`
     * to gate commit behavior (e.g. only parse a chip on whitespace-terminated input)
     * without keeping a separate `input` listener.
     */
    event: InputEvent;
}
/** Reported when adjacent-token keyboard deletion asks the app to drop a chip. */
interface TokenSearchTokenRemoval {
    id: string;
    /** The `data-token-value` of the token the app should remove from its state. */
    value: string;
    editor: HTMLElement;
    /** `'backward'` = the token before the caret (Backspace); `'forward'` = after (Delete). */
    direction: 'backward' | 'forward';
}
/**
 * Opt-in keyboard behavior for the atomic token chips. Off unless `keyboard` is
 * set; each piece defaults on once opted in. The helper never mutates app state:
 * a removal is reported through {@link TokenSearchKeyboardOptions.onRemoveToken}
 * for the caller to apply, while caret movement past a chip is a pure ephemeral
 * mechanic the helper performs itself.
 */
interface TokenSearchKeyboardOptions {
    /**
     * From a collapsed caret with no selection, Backspace removes the token
     * immediately before it and Delete the token immediately after — reported via
     * `onRemoveToken` — instead of deleting a character. Default: true.
     */
    removeAdjacentToken?: boolean;
    /**
     * ArrowRight moves the caret past a trailing atomic token so text typed next
     * lands after the chip. Default: true.
     */
    moveCaretPastToken?: boolean;
    /** Apply the reported removal to your controlled state, then re-render. */
    onRemoveToken?: (removal: TokenSearchTokenRemoval) => void;
}
/**
 * Managed collapsible behavior for the iconic TokenSearchField. Every piece is on
 * by default; disable a specific one to own it in the app. Provide `signals` to
 * drive app-owned `expanded` signals per field id instead of helper-created ones.
 */
interface TokenSearchCollapsibleOptions {
    /** Expand the field and focus its editor when the iconic trigger is activated. Default: true. */
    expandOnActivate?: boolean;
    /** Collapse the field when focus leaves it while it is empty. Default: true. */
    collapseOnEmptyBlur?: boolean;
    /** Collapse an empty field on Escape and restore focus to its trigger. Default: true. */
    collapseOnEscape?: boolean;
    /** Focus the editor on expand and the trigger on Escape-collapse. Default: true. */
    manageFocus?: boolean;
    /**
     * Keep an empty field expanded when focus moves to a caller-owned surface
     * rendered outside the field — a suggestions dropdown, date picker, or help
     * popover shown beside it. Return true for any focus target that must NOT
     * trigger collapse-on-empty-blur. An element carrying `data-token-search-keep-open`
     * (or any node inside one) is always exempt, so this predicate is only needed
     * for surfaces you cannot mark declaratively.
     */
    keepOpenOn?: (target: Node | null) => boolean;
    /** App-owned `expanded` signals keyed by field id; adopted instead of helper-created. */
    signals?: Readonly<Record<string, Signal<boolean>>>;
}
interface WireTokenSearchFieldsOptions {
    onSubmit?: (submission: TokenSearchSubmit) => void;
    /** Fired on every editor `input`, after the browser mutates it, so a caller can drop its own `input` listener. */
    onEdit?: (edit: TokenSearchEdit) => void;
    /** Managed collapsible transient behavior. `true`/omitted = on with defaults; `false` = fully off. */
    collapsible?: boolean | TokenSearchCollapsibleOptions;
    /** Opt-in atomic-chip keyboard behavior (off by default). `true` = on with defaults. */
    keyboard?: boolean | TokenSearchKeyboardOptions;
}
/**
 * The value returned from {@link wireTokenSearchFields}: call it (or `dispose()`) to
 * tear down. When collapsible behavior is managed, it also exposes the transient
 * `expanded` state per field id so the app can read it in render, hand in its own
 * signal, or drive it imperatively.
 */
interface TokenSearchFieldsHandle {
    (): void;
    dispose(): void;
    /** The managed `expanded` signal for a field id (adopted or helper-created); undefined when unmanaged. */
    expanded(id: string): Signal<boolean> | undefined;
    /** Expand the field (and, when focus is managed, focus its editor). */
    open(id: string): void;
    /** Collapse the field (and, when focus is managed, restore focus to its trigger). */
    close(id: string): void;
}
/**
 * Wire every TokenSearchField under `root`: submit on Enter, preserve the caret across
 * controlled token deletion, and (by default) manage the collapsible field's transient
 * expand/collapse/focus. Returns a {@link TokenSearchFieldsHandle} — a disposer that also
 * exposes the managed `expanded` state per field id.
 */
declare function wireTokenSearchFields(root: HTMLElement, { onSubmit, onEdit, collapsible, keyboard, }?: WireTokenSearchFieldsOptions): TokenSearchFieldsHandle;

export { type TokenSearchCollapsibleOptions, type TokenSearchEdit, type TokenSearchFieldsHandle, type TokenSearchKeyboardOptions, type TokenSearchSubmit, type TokenSearchTokenRemoval, type WireTokenSearchFieldsOptions, wireTokenSearchFields };
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
