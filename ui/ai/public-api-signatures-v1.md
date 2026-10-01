# Public API signatures for the UI authoring corpus

Generated from emitted declarations for `@kerfjs/ui@5.0.0` and `kerfjs@4.4.1`. This bounded reference covers only APIs used by the seven-task corpus. It is interface evidence, not an implementation or runtime guarantee.

## `@kerfjs/ui/css-values`

```ts
declare const cssValueBrand: unique symbol;
declare const cssLengthBrand: unique symbol;
declare const cssLengthExpressionBrand: unique symbol;
declare const cssFlexBrand: unique symbol;
declare const cssColorBrand: unique symbol;
declare const cssForegroundColorBrand: unique symbol;
/**
 * A complete typed CSS value minted by a property-specific Kerf UI builder.
 *
 * This brand is an authoring correctness aid, not a sanitizer or security
 * boundary. Prefer the narrower property grammar, such as {@link CssLength},
 * whenever one is available.
 */
type CssValue = string & {
    readonly [cssValueBrand]: 'CssValue';
};
/**
 * A complete CSS length-percentage value suitable for dimension-valued UI
 * props. Despite the concise name, percentages are intentionally included.
 */
type CssLength = CssValue & {
    readonly [cssLengthBrand]: 'CssLength';
};
/**
 * An incomplete arithmetic expression. Wrap it with {@link calc} before
 * passing it to a prop that accepts {@link CssLength}.
 */
type CssLengthExpression = string & {
    readonly [cssLengthExpressionBrand]: 'CssLengthExpression';
};
/** A complete CSS `flex` shorthand. It is not interchangeable with a length. */
type CssFlex = CssValue & {
    readonly [cssFlexBrand]: 'CssFlex';
};
/** A complete CSS color value. It is not interchangeable with a length. */
type CssColor = CssValue & {
    readonly [cssColorBrand]: 'CssColor';
};
/**
 * A complete CSS color meant to paint a foreground: text or an icon drawn over
 * a surface. Mint it with {@link uiColor} and a foreground token name
 * ({@link UiForegroundColorName}) or with {@link foregroundColorVar}. It is a
 * {@link CssColor}, but a plain `CssColor` is not a foreground color: fill,
 * border, and surface tokens are pale backgrounds that leave a foreground
 * nearly invisible.
 */
type CssForegroundColor = CssColor & {
    readonly [cssForegroundColorBrand]: 'CssForegroundColor';
};
type CssFlexKeyword = 'none' | 'auto' | 'initial';
type CssFlexBasis = CssLength | 'auto' | 'content' | 'min-content' | 'max-content' | 'fit-content';
type CssSizeKeyword = 'auto' | 'min-content' | 'max-content' | 'fit-content';
/** A complete width/height value accepted by dimension-valued UI props. */
type CssSize = CssLength | CssSizeKeyword;
declare const uiColorNames: readonly ["brand-border-loud", "brand-border-normal", "brand-border-quiet", "brand-fill-loud", "brand-fill-normal", "brand-fill-quiet", "brand-on-fill", "brand-on-loud", "brand-on-normal", "brand-on-quiet", "danger-border-loud", "danger-border-normal", "danger-border-quiet", "danger-fill-loud", "danger-fill-normal", "danger-fill-quiet", "danger-on-fill", "danger-on-loud", "danger-on-normal", "danger-on-quiet", "neutral-border-loud", "neutral-border-normal", "neutral-border-quiet", "neutral-fill-loud", "neutral-fill-normal", "neutral-fill-quiet", "neutral-on-loud", "neutral-on-normal", "neutral-on-quiet", "pop-border-loud", "pop-border-normal", "pop-border-quiet", "pop-fill-loud", "pop-fill-normal", "pop-fill-quiet", "pop-on-fill", "pop-on-loud", "pop-on-normal", "pop-on-quiet", "success-border-loud", "success-border-normal", "success-border-quiet", "success-fill-loud", "success-fill-normal", "success-fill-quiet", "success-on-fill", "success-on-loud", "success-on-normal", "success-on-quiet", "surface", "surface-lowered", "surface-raised", "text", "text-link", "text-quiet", "warning-border-loud", "warning-border-normal", "warning-border-quiet", "warning-fill-loud", "warning-fill-normal", "warning-fill-quiet", "warning-on-fill", "warning-on-loud", "warning-on-normal", "warning-on-quiet"];
/** Names of the public `--kui-color-*` semantic tokens. */
type UiColorName = (typeof uiColorNames)[number];
/** The semantic tokens that paint a foreground: the `*-on-*` and text roles. */
type UiForegroundColorName = Extract<UiColorName, `${string}-on-${string}` | 'text' | 'text-quiet' | 'text-link'>;
/** Kerf UI's complete spacing-token vocabulary. `s` and `xl` are exceptions. */
type UiSpaceName = 'none' | '2xs' | 'xs' | 's' | 'm' | 'l' | 'xl';
/** Create a complete pixel length. */
declare function px(value: number): CssLength;
/** Create a complete root-font-relative length. */
declare function rem(value: number): CssLength;
/** Converts a pixel value into rem units by dividing by 16. */
declare function remify(value: number): CssLength;
/** Create a complete current-font-relative length. */
declare function em(value: number): CssLength;
/** Create a complete percentage length. */
declare function pct(value: number): CssLength;
/** Resolve a Kerf UI spacing step to its public custom property. */
declare function space(name: UiSpaceName): CssLength;
/**
 * Reference an application-owned custom property whose contract is a CSS
 * length-percentage. The deliberately narrow name grammar keeps this helper
 * from becoming an arbitrary CSS-string constructor.
 */
declare function lengthVar(name: `--${string}`, fallback?: CssLength): CssLength;
/** Combine two or more complete lengths into a non-standalone sum. */
declare function plus(first: CssLength, second: CssLength, ...rest: readonly CssLength[]): CssLengthExpression;
/** Turn a typed length expression into a complete CSS `calc()` value. */
declare function calc(expression: CssLengthExpression): CssLength;
/** Build a complete, structured CSS flex shorthand. */
declare function flex(grow: number, shrink?: number, basis?: CssFlexBasis): CssFlex;
/**
 * The brand {@link uiColor} returns for a token name: a
 * {@link CssForegroundColor} for a foreground token, otherwise a plain
 * {@link CssColor}.
 */
type UiColor<Name extends UiColorName> = Name extends UiForegroundColorName ? CssForegroundColor : CssColor;
/**
 * Resolve a public Kerf UI semantic color token. A foreground token name
 * (`success-on-quiet`, `text-quiet`, …) returns a {@link CssForegroundColor};
 * any other token returns a plain {@link CssColor}.
 */
declare function uiColor<Name extends UiColorName>(name: Name): UiColor<Name>;
/** Reference an application-owned custom property whose contract is a color. */
declare function colorVar(name: `--${string}`, fallback?: CssColor): CssColor;
/**
 * Reference an application-owned custom property whose contract is a
 * foreground color (text or an icon over a surface). Use it where a prop
 * accepts only {@link CssForegroundColor}, such as `SelectChoice.color`.
 */
declare function foregroundColorVar(name: `--${string}`, fallback?: CssForegroundColor): CssForegroundColor;

export { type CssColor, type CssFlex, type CssFlexBasis, type CssFlexKeyword, type CssForegroundColor, type CssLength, type CssLengthExpression, type CssSize, type CssSizeKeyword, type CssValue, type UiColor, type UiColorName, type UiForegroundColorName, type UiSpaceName, calc, colorVar, em, flex, foregroundColorVar, lengthVar, pct, plus, px, rem, remify, space, uiColor };
```

## `@kerfjs/ui/disclosure-arrow`

```ts
import { SafeHtml } from 'kerfjs';
import { CssLength } from './css-values.js';

type DisclosureDirection = 'up' | 'down' | 'left' | 'right';
interface DisclosureArrowProps {
    open: boolean;
    openDirection?: DisclosureDirection;
    closedDirection?: DisclosureDirection;
    /** Replacement icons should use right as their unrotated orientation. */
    icon?: SafeHtml;
    /** Typed box size for the square visual. Default: `remify(18px)`. */
    size?: CssLength;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function DisclosureArrow({ open, openDirection, closedDirection, icon, size, className, slot, }: DisclosureArrowProps): SafeHtml;

export { DisclosureArrow, type DisclosureArrowProps, type DisclosureDirection };
```

## `@kerfjs/ui/toolbar`

```ts
import * as kerfjs from 'kerfjs';
import { PaneSeparatorSide } from './pane.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { S as Sides } from './sides-BPSWde0A.js';

type ToolbarPosition = 'header' | 'footer';
interface ToolbarProps {
    leading?: KerfUiContent;
    center?: KerfUiContent;
    trailing?: KerfUiContent;
    label?: string;
    /** Use footer semantics for a bottom toolbar; defaults to header. */
    position?: ToolbarPosition;
    /**
     * Physical divider edges in canonical top/right/bottom/left order, drawn
     * always. Defaults to none: a toolbar pinned over or under scrolling content
     * gets its divider from the scroll state instead — a `Pane` draws the line
     * between its chrome and content while content is scrolled away beneath it,
     * and `wireScrollDividers` `targets` can name a toolbar as chrome, which
     * then draws its facing side the same way.
     */
    dividerSides?: Sides;
    /** `balanced` gives both side zones equal tracks, centering the middle zone on the toolbar even if only one side has controls. */
    centerAlign?: 'center' | 'stretch' | 'balanced';
    /**
     * Component-owned responsive layout; applications choose the policy rather
     * than restyling toolbar internals. Under every policy the trailing zone
     * wraps its groups instead of clipping an action, and the center zone keeps
     * its whole content width: when the zones do not fit one row, the leading
     * title truncates with an ellipsis rather than the center overlapping it.
     * - `none` keeps one row; the leading identity truncates first.
     * - `stack` stacks the zones at `responsiveAt`, wrapping stacked control
     *   groups onto further rows.
     * - `wrap` keeps one row while every zone fits at its natural width, and
     *   otherwise moves the trailing zone below a whole leading identity.
     * - `center-priority` gives an expanded center control the full row.
     * - `trailing-priority` moves an expanded trailing control to a full row
     *   below the leading identity at `responsiveAt`.
     */
    responsive?: 'none' | 'stack' | 'wrap' | 'center-priority' | 'trailing-priority';
    /** Container width at which `stack` or `trailing-priority` activates. */
    responsiveAt?: 'compact' | 'narrow';
    /**
     * Screen edges this toolbar claims for device safe-area compensation, for an
     * app bar or bottom bar that sits directly at a screen edge rather than in a
     * Pane header or footer. Each listed side pads by the inset its surrounding
     * layout reports through `--kui-edge-inset-*`, or the full device inset when
     * nothing routes that edge, while the toolbar's box and dividers paint
     * through. Omitted, the toolbar pads only the inline edges an owner such as
     * a Pane header hands it, and never a block edge.
     */
    safeAreaEdges?: readonly PaneSeparatorSide[];
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A toolbar's configuration, apart from its content: the props a composite
 * that renders a `Toolbar` for the app (a Workbench or CollapsiblePanel
 * toolbar) forwards, so the app configures that toolbar instead of styling it.
 */
type ToolbarConfig = Pick<ToolbarProps, 'dividerSides' | 'centerAlign' | 'responsive' | 'responsiveAt' | 'safeAreaEdges'>;
declare function Toolbar({ leading, center, trailing, label, position, dividerSides, centerAlign, responsive, responsiveAt, safeAreaEdges, className, slot, }: ToolbarProps): kerfjs.SafeHtml;

export { Sides, Toolbar, type ToolbarConfig, type ToolbarPosition, type ToolbarProps };
```

## `@kerfjs/ui/toolbar-text`

```ts
import * as kerfjs from 'kerfjs';

type ToolbarTextSize = 'xlarge' | 'xlarge-fixed' | 'large' | 'default' | 'small' | 'xsmall';
/** ARIA heading level for a title exposed as a heading landmark. */
type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
interface ToolbarTextBaseProps {
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
     * Show a trailing ellipsis (…) where the text is truncated — on the single line
     * (default), or at the `maxLines` boundary when wrapping. Set false to hard-clip
     * instead. Default true.
     */
    ellipsis?: boolean;
    /**
     * Grow to fill the free space of the flex row it sits in (a Toolbar zone),
     * truncating at the space left by its siblings instead of taking only its
     * text's width. Default false.
     */
    fill?: boolean;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
type ToolbarTextWrappingProps = {
    /** Wrap onto multiple lines; combine with `maxLines` to cap them. */
    wrap: true;
    maxLines?: number | null;
} | {
    wrap?: false;
    maxLines?: never;
};
type ToolbarTextProps = ToolbarTextBaseProps & ToolbarTextWrappingProps;
declare function ToolbarText({ text, size, className, id, headingLevel, placeholder, wrap, ellipsis, maxLines, fill, slot, }: ToolbarTextProps): kerfjs.SafeHtml;

export { type HeadingLevel, ToolbarText, type ToolbarTextProps, type ToolbarTextSize };
```

## `@kerfjs/ui/toolbar-control-group`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type ToolbarControlGroupAppearance = 'contained' | 'borderless';
type ToolbarControlGroupTone = 'default' | 'dark';
type ToolbarControlGroupButtonAppearance = 'plain' | 'push';
type ToolbarControlGroupShape = 'pill' | 'rounded';
type ToolbarControlGroupSize = 'default' | 'compact';
type ToolbarControlGroupDensity = 'comfortable' | 'tight';
type ToolbarControlGroupContent = 'icon' | 'text' | 'mixed' | 'avatar' | 'search';
type ToolbarControlGroupFocusRing = 'control' | 'outline' | 'halo';
type ToolbarControlGroupSelectedChrome = 'raised' | 'filled' | 'outline';
type ToolbarControlGroupSelectedTone = 'brand' | 'neutral' | 'pop';
type ToolbarControlGroupOverflow = 'visible' | 'scroll';
type ToolbarControlGroupMenuInset = 'standard' | 'compact' | 'list-zero';
type ToolbarControlGroupVisibility = 'always' | 'compact-only';
interface ToolbarActionLinkProps {
    href: string;
    label: string;
    icon?: KerfUiContent;
    /** Optional machine-readable detail hidden visually but included in the default accessible name. */
    detail?: string;
    /** Override the accessible name when surrounding context is needed. */
    ariaLabel?: string;
    /** Open in a new tab with a safe rel and announce that behavior. */
    external?: boolean;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** A semantic anchor with ToolbarControlGroup-owned action geometry. */
declare function ToolbarActionLink({ href, label, icon, detail, ariaLabel, external, className, slot, }: ToolbarActionLinkProps): kerfjs.SafeHtml;
interface ToolbarControlGroupProps {
    children: KerfUiContent;
    label?: string;
    className?: string;
    expanded?: boolean;
    single?: boolean;
    appearance?: ToolbarControlGroupAppearance;
    tone?: ToolbarControlGroupTone;
    buttonAppearance?: ToolbarControlGroupButtonAppearance;
    /** Corner shape: fully round `pill` (default) or a softer `rounded` rectangle. */
    shape?: ToolbarControlGroupShape;
    size?: ToolbarControlGroupSize;
    density?: ToolbarControlGroupDensity;
    content?: ToolbarControlGroupContent;
    /** Whether controls paint focus individually or the group paints an outline/halo on focus-within. */
    focusRing?: ToolbarControlGroupFocusRing;
    selectedChrome?: ToolbarControlGroupSelectedChrome;
    selectedTone?: ToolbarControlGroupSelectedTone;
    /** Size a nested Web Awesome dropdown trigger as part of this group. */
    nestedDropdown?: boolean;
    /** Configure the nested dropdown menu inset without consumer ::part() CSS. */
    menuInset?: ToolbarControlGroupMenuInset;
    /** Keep an overlong row of actions inside the available width with horizontal scrolling. */
    overflow?: ToolbarControlGroupOverflow;
    /** Responsive visibility owned by the enclosing Toolbar container. */
    visibility?: ToolbarControlGroupVisibility;
    /** Move this group into the work-area toolbar when its panel collapses. */
    relocateOnCollapse?: boolean;
    /** Add contrast behind photo-backed avatar content. */
    scrim?: boolean;
    /** Block the group's controls and show a spinner without changing its dimensions. */
    busy?: boolean;
    /** Announced status while busy; defaults to “Working”. */
    busyLabel?: string;
    /**
     * Avatar image URL. A single-control group paints it on the group; a
     * multi-control group paints it only on the pressed selection highlight.
     */
    avatarImage?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function ToolbarControlGroup({ children, label, className, expanded, single, appearance, tone, buttonAppearance, shape, size, density, content, focusRing, selectedChrome, selectedTone, nestedDropdown, menuInset, overflow, visibility, relocateOnCollapse, scrim, busy, busyLabel, avatarImage, slot, }: ToolbarControlGroupProps): kerfjs.SafeHtml;

export { ToolbarActionLink, type ToolbarActionLinkProps, ToolbarControlGroup, type ToolbarControlGroupAppearance, type ToolbarControlGroupButtonAppearance, type ToolbarControlGroupContent, type ToolbarControlGroupDensity, type ToolbarControlGroupFocusRing, type ToolbarControlGroupMenuInset, type ToolbarControlGroupOverflow, type ToolbarControlGroupProps, type ToolbarControlGroupSelectedChrome, type ToolbarControlGroupSelectedTone, type ToolbarControlGroupShape, type ToolbarControlGroupSize, type ToolbarControlGroupTone, type ToolbarControlGroupVisibility };
```

## `@kerfjs/ui/floating-toolbar`

```ts
import * as kerfjs from 'kerfjs';
import { CssLength } from './css-values.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

/** Where a {@link FloatingToolbar} floats within its positioned container. */
type FloatingToolbarPosition = 'bottom' | 'bottom-start' | 'bottom-end' | 'top' | 'top-start' | 'top-end';
interface FloatingToolbarProps {
    /** Toolbar contents — normally one or more `ToolbarControlGroup`s. */
    children: KerfUiContent;
    /** Accessible name for the toolbar (required — it exposes `role="toolbar"`). */
    label: string;
    /**
     * Corner or edge it floats to inside its nearest positioned ancestor.
     * Default: `'bottom-end'`.
     */
    position?: FloatingToolbarPosition;
    /** Keep the toolbar in normal document flow instead of floating over content. */
    placement?: 'floating' | 'inline';
    /**
     * Distance from the container edges named by `position`. Default:
     * `space('m')` (16px, 8px past a top toolbar's own inset). Omit it inside a
     * `Workbench`, `CollapsiblePanel`, or `ResizableRegion` restore corner: the
     * corner owns the inset there and sets it to zero.
     */
    inset?: CssLength;
    /** Add device or layout-routed safe-area insets to the positioned edges. */
    safeAreaInsets?: boolean;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A toolbar that floats above the main content of its nearest positioned
 * ancestor — a transparent, forced-dark cluster of controls (e.g. a drawer
 * restore button) that sits over the content but NOT over dialogs or overlays
 * (it is not in the top layer). It is inset from the container edges by
 * `inset` (default `--kui-space-m`, i.e. 8px more than a top toolbar's own
 * inset); pass a typed length to move it. Inside a `Workbench`, `CollapsiblePanel`, or
 * `ResizableRegion` restore corner the corner owns the inset, so the toolbar
 * floats from the corner's own position. While one of those layouts has a
 * side overlay open over the toolbar's region (a Workbench rail overlay, a
 * `wireSidebar` compact overlay, an overlay `CollapsiblePanel` or horizontal
 * `ResizableRegion`), the toolbar is hidden — unfocusable and out of the
 * accessibility tree — until the overlay closes. The app owns the controls
 * and their behavior — wire them with `delegate()` as usual. Set
 * `placement="inline"` for normal flow when an owner already positions the
 * control; floating placement can add safe-area insets to its per-edge tokens.
 */
declare function FloatingToolbar({ children, label, position, placement, inset, safeAreaInsets, className, slot, }: FloatingToolbarProps): kerfjs.SafeHtml;

export { FloatingToolbar, type FloatingToolbarPosition, type FloatingToolbarProps };
```

## `@kerfjs/ui/popup-menu`

```ts
import { SafeHtml } from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type PopupMenuPlacement = 'bottom-start' | 'bottom' | 'bottom-end' | 'top-start' | 'top' | 'top-end';
type PopupMenuDataAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-action'?: never;
    'data-component'?: never;
    'data-key'?: never;
    'data-morph-skip-children'?: never;
}>;
/** One command in the menu. */
interface PopupMenuItem {
    kind?: 'item';
    label: string;
    /** Delegated `data-action` the app handles when the item is chosen. */
    action?: string;
    /** Native `wa-dropdown-item` value, reported by its `wa-select` event. */
    value?: string;
    /** Leading icon, typically a `LucideIcon`; it is placed in the item's icon slot. */
    icon?: SafeHtml;
    /** A checked menu choice, including nested choices. */
    checked?: boolean;
    /** Trailing safe content, such as a selected-choice tick. */
    details?: SafeHtml;
    /** Destructive command styling. */
    tone?: 'default' | 'danger';
    disabled?: boolean;
    /** Native tooltip text for a disabled command. */
    disabledReason?: string;
    /** Application `data-*` metadata such as a record id. */
    attributes?: PopupMenuDataAttributes;
    /** Child commands, headings, and dividers opened by hover or keyboard navigation. */
    submenu?: readonly PopupMenuEntry[];
}
/** A labeled group heading; items that follow it belong to the group. */
interface PopupMenuHeading {
    kind: 'heading';
    label: string;
}
/** A separator between groups of items. */
interface PopupMenuDivider {
    kind: 'divider';
}
type PopupMenuEntry = PopupMenuItem | PopupMenuHeading | PopupMenuDivider;
type PopupMenuTriggerName = {
    /** Visible trigger text, which is also its accessible name. */
    text: string;
    label?: never;
} | {
    text?: never;
    /**
     * Accessible name of an icon-only trigger, rendered as visually hidden
     * slotted text (a Web Awesome button takes its name from its content).
     */
    label: string;
};
type PopupMenuTrigger = (PopupMenuTriggerName & {
    context?: false;
}) | {
    context: true;
    label: string;
    text?: never;
    icon?: never;
    caret?: never;
    disabled?: never;
};
type PopupMenuProps = PopupMenuTrigger & {
    /** Trigger icon, typically a `LucideIcon`, before any visible text. */
    icon?: KerfUiContent;
    items: readonly PopupMenuEntry[];
    /** Where the menu opens relative to its trigger. Defaults to `bottom-start`. */
    placement?: PopupMenuPlacement;
    /** Show the disclosure caret after the trigger content. Defaults to true. */
    caret?: boolean;
    disabled?: boolean;
    /** Application `data-*` metadata on the menu root. */
    rootAttributes?: PopupMenuDataAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
};
/** A rendered context PopupMenu with Web Awesome's controlled open state. */
type PopupMenuElement = HTMLElement & {
    open: boolean;
};
/** Open a context PopupMenu at viewport pointer coordinates. */
declare function openPopupMenuAt(menu: PopupMenuElement, x: number, y: number): void;
/** Close a programmatically opened PopupMenu. */
declare function closePopupMenu(menu: PopupMenuElement): void;
/**
 * An action menu: a trigger button that opens a list of commands. Renders the
 * `wa-dropdown` root directly, so a `single` `ToolbarControlGroup` (with
 * `nestedDropdown`) or a `PopupSurface` sizes and insets it as usual. Items
 * dispatch through delegated `data-action`s; the app owns the commands and any
 * open-state reaction. Import `@kerfjs/ui/popup-menu/register` once to register
 * the Web Awesome elements.
 */
declare function PopupMenu({ text, label, icon, items, placement, caret, disabled, rootAttributes, slot, context, }: PopupMenuProps): SafeHtml;

export { PopupMenu, type PopupMenuDivider, type PopupMenuElement, type PopupMenuEntry, type PopupMenuHeading, type PopupMenuItem, type PopupMenuPlacement, type PopupMenuProps, closePopupMenu, openPopupMenuAt };
```

## `@kerfjs/ui/list-header`

```ts
import { SafeHtml } from 'kerfjs';
import { HeadingLevel } from './toolbar-text.js';

type ListHeaderRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-has-badge'?: never;
    'data-has-count'?: never;
    'data-density'?: never;
    'data-divider'?: never;
    'data-inline'?: never;
    'data-width'?: never;
    'data-indicator-tone'?: never;
    'data-toggle'?: never;
}>;
type ListHeaderTriggerAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-action'?: never;
    'data-kui-disabled'?: never;
    popoverTarget?: string;
    popoverTargetAction?: 'toggle' | 'show' | 'hide';
    'aria-controls'?: string;
    'aria-haspopup'?: 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid' | 'true';
}>;
interface ListHeaderBaseProps {
    label: string;
    density?: 'standard' | 'compact';
    divider?: 'none' | 'before' | 'after' | 'both';
    /** Shrink-wrap the header without its default outer margin, border, or padding. */
    inline?: boolean;
    /** Fill the available row or shrink-wrap while retaining normal header geometry. */
    width?: 'fill' | 'content';
    indicatorTone?: 'neutral' | 'accent' | 'pop' | 'danger';
    /** Render as an unanimated loading skeleton: keep the label and action affordance, disable interaction. */
    placeholder?: boolean;
    rootAttributes?: ListHeaderRootAttributes;
    triggerAttributes?: ListHeaderTriggerAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
type ListHeaderModeProps = {
    /** Render the title as a controlled disclosure trigger. */
    toggle: true;
    /** A toggle's label is its button text, not a heading. */
    headingLevel?: never;
    action: string;
    expanded: boolean;
    actionIcon?: SafeHtml;
    actionLabel?: never;
    actionDisabled?: boolean;
    disabledReason?: string;
} | {
    /** Render a separately named trailing action. */
    toggle?: false;
    /**
     * Native heading level (`h1`–`h6`) of the label. Default `2`. Match the
     * document outline; the visual treatment does not change.
     */
    headingLevel?: HeadingLevel;
    action: string;
    actionLabel: string;
    actionIcon: SafeHtml;
    expanded?: never;
    actionDisabled?: boolean;
    disabledReason?: string;
} | {
    /** Render a passive section heading. */
    toggle?: false;
    /**
     * Native heading level (`h1`–`h6`) of the label. Default `2`. Match the
     * document outline; the visual treatment does not change.
     */
    headingLevel?: HeadingLevel;
    action?: never;
    actionLabel?: never;
    actionIcon?: never;
    expanded?: never;
    actionDisabled?: never;
    disabledReason?: never;
};
type ListHeaderIndicatorProps = {
    count: number;
    countLabel: string;
    badge?: never;
    status?: never;
} | {
    count?: never;
    countLabel?: never;
    badge: SafeHtml;
    status?: never;
} | {
    count?: never;
    countLabel?: never;
    badge?: never;
    status?: SafeHtml;
};
type ListHeaderProps = ListHeaderBaseProps & ListHeaderIndicatorProps & ListHeaderModeProps;
declare function ListHeader({ label, headingLevel, count, countLabel, badge, status, density, divider, inline, width, indicatorTone, action, actionLabel, actionIcon, actionDisabled, disabledReason, expanded, toggle, placeholder, rootAttributes, triggerAttributes, slot, }: ListHeaderProps): SafeHtml;

export { ListHeader, type ListHeaderProps };
```

## `@kerfjs/ui/list`

```ts
import * as kerfjs from 'kerfjs';
import { UiSpaceName, CssLength, CssFlexKeyword, CssFlex } from './css-values.js';
import { H as HorizontalAlignment, L as ListVerticalAlignment } from './flex-alignment-4ms8ZbV8.js';
export { V as VerticalAlignment } from './flex-alignment-4ms8ZbV8.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { S as Sides } from './sides-BPSWde0A.js';

type ListRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-gap'?: never;
    'data-flex'?: never;
    'data-fill'?: never;
    'data-h-align'?: never;
    'data-v-align'?: never;
    'data-scrollable'?: never;
    'data-text-insets'?: never;
    'data-control-insets'?: never;
}>;
interface ListProps {
    children?: KerfUiContent;
    /** Use the standard item gap, a named UI spacing token, or a typed CSS length. Defaults to no gap. */
    gap?: boolean | UiSpaceName | CssLength;
    /** Allow this list to grow/shrink, use a keyword, or supply a typed CSS flex shorthand. */
    flex?: boolean | CssFlexKeyword | CssFlex;
    /**
     * Fill the height of a parent with a definite height, such as an app root or
     * a fixed-height frame, when this list is that parent's layout root. Inside a
     * flex layout use `flex` instead. Defaults to false.
     */
    fill?: boolean;
    /** Horizontal alignment. Defaults to full to preserve stretch-aligned list children. */
    hAlign?: HorizontalAlignment;
    /** Vertical distribution. Defaults to top. */
    vAlign?: ListVerticalAlignment;
    /** Own vertical scrolling and overscroll containment. */
    scrollable?: boolean;
    /** Physical divider edges in canonical top/right/bottom/left order. */
    dividerSides?: Sides;
    /** Physical sides that receive the standard 17px text inset. */
    textInsets?: Sides;
    /** Physical sides that receive the standard 8px control inset. Text insets win on overlap. */
    controlInsets?: Sides;
    className?: string;
    /** Safe `data-*` metadata; List-owned structural attributes remain protected. */
    rootAttributes?: ListRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A list's configuration, apart from its content and styling hooks: the props a
 * composite that renders a `List` for the app (the Workbench's `mainHeader` /
 * `mainFooter` chrome) forwards, so the app configures that list instead of
 * styling it. An omitted or `undefined` field keeps the composite's default.
 */
type ListConfig = Pick<ListProps, 'gap' | 'hAlign' | 'vAlign' | 'dividerSides' | 'textInsets' | 'controlInsets'>;
/** A stretch-aligned vertical stack with optional gap, flex, fill, scroll, and dividers. */
declare function List({ children, gap, flex, fill, hAlign, vAlign, scrollable, dividerSides, textInsets, controlInsets, className, rootAttributes, slot, }: ListProps): kerfjs.SafeHtml;

export { CssFlex, CssFlexKeyword, CssLength, HorizontalAlignment, List, type ListConfig, type ListProps, ListVerticalAlignment, Sides, UiSpaceName };
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
    'data-density'?: never;
    'data-divider'?: never;
    'data-busy'?: never;
    'data-trailing-visibility'?: never;
    'data-state'?: never;
    'data-selected'?: never;
    'data-pressed'?: never;
}>;
type ListActionRowTrailingAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-kui-disabled'?: never;
    popoverTarget?: string;
    popoverTargetAction?: 'toggle' | 'show' | 'hide';
    'aria-controls'?: string;
    'aria-haspopup'?: 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid' | 'true';
}>;
interface ListActionRowProps {
    /** Visible dormant content for the primary button. Must not contain interactive descendants. */
    label: string | SafeHtml;
    description?: string | SafeHtml;
    status?: string | SafeHtml;
    busy?: boolean;
    density?: 'standard' | 'compact';
    divider?: 'none' | 'before' | 'after' | 'both';
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
    /** Render as an unanimated loading skeleton, disabling both actions: label, description, icon, and status text become skeletons; the `busy` indicator stays live. */
    placeholder?: boolean;
    trailingAction: string;
    trailingActionLabel: string;
    /** Decorative dormant content for the trailing button. Must not contain interactive descendants. */
    trailingActionIcon: SafeHtml;
    trailingActionDisabled?: boolean;
    trailingActionTitle?: string;
    trailingActionVisibility?: 'always' | 'interaction';
    className?: string;
    rootAttributes?: ListActionRowRootAttributes;
    trailingActionAttributes?: ListActionRowTrailingAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function ListActionRow({ label, description, status, busy, density, divider, icon, action, itemId, selected, pressed, accessibleLabel, title, multiline, state, disabled, tabIndex, placeholder, trailingAction, trailingActionLabel, trailingActionIcon, trailingActionDisabled, trailingActionTitle, trailingActionVisibility, className, rootAttributes, trailingActionAttributes, slot, }: ListActionRowProps): SafeHtml;

export { ListActionRow, type ListActionRowProps };
```

## `@kerfjs/ui/list-item`

```ts
import { SafeHtml } from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type ListItemRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-has-icon'?: never;
    'data-has-description'?: never;
    'data-multiline'?: never;
    'data-density'?: never;
    'data-divider'?: never;
    'data-busy'?: never;
    'data-state'?: never;
    'data-kui-disabled'?: never;
    'data-icon-align'?: never;
}>;
interface ListItemProps {
    label: string | SafeHtml;
    /** App-owned supporting text rendered in the component's stable label stack. */
    description?: string | SafeHtml;
    icon?: SafeHtml;
    /** Dormant author content at the row's end; a placeholder renders it as a skeleton. */
    trailing?: KerfUiContent;
    /** Dormant status metadata rendered before trailing content; a placeholder renders it as a skeleton. */
    status?: string | SafeHtml;
    /** Show a progress indicator and expose the row as busy without replacing its content; a placeholder keeps the indicator. */
    busy?: boolean;
    density?: 'standard' | 'compact' | 'spacious';
    divider?: 'none' | 'before' | 'after' | 'both';
    selected?: boolean;
    action: string;
    itemId?: string;
    className?: string;
    pressed?: boolean;
    accessibleLabel?: string;
    title?: string;
    multiline?: boolean;
    /** Alignment of an icon beside a wrapped label. Defaults to its first line. */
    multilineIconAlign?: 'first-line' | 'center';
    state?: string;
    disabled?: boolean;
    tabIndex?: number;
    /** Render the row as an unanimated loading skeleton, disabling its action: label, description, icon, status, and trailing content become skeletons; the `busy` indicator stays live. */
    placeholder?: boolean;
    rootAttributes?: ListItemRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
interface ListItemLinkProps extends Omit<ListItemProps, 'action' | 'pressed'> {
    /** Native destination for this navigation row. */
    href: string;
    /** Open in a new tab with a safe rel and announce that behavior. */
    external?: boolean;
    action?: never;
    pressed?: never;
}
declare function ListItem({ label, description, icon, trailing, status, busy, density, divider, selected, action, itemId, className, pressed, accessibleLabel, title, multiline, multilineIconAlign, state, disabled, tabIndex, placeholder, rootAttributes, slot, }: ListItemProps): SafeHtml;
/** A navigation row with native link activation and ListItem geometry. */
declare function ListItemLink({ href, external, label, description, icon, trailing, status, busy, density, divider, selected, itemId, className, accessibleLabel, title, multiline, multilineIconAlign, state, disabled, tabIndex, placeholder, rootAttributes, slot, }: ListItemLinkProps): SafeHtml;

export { ListItem, ListItemLink, type ListItemLinkProps, type ListItemProps };
```

## `@kerfjs/ui/list-inset-control`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { S as Sides } from './sides-BPSWde0A.js';

interface ListInsetControlProps {
    /** Control(s) that own their own border and padding (e.g. an input, a `wa-*`). */
    children: KerfUiContent;
    /** Physical inset sides in canonical top/right/bottom/left order. Defaults to all sides. */
    sides?: Sides;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * Insets a control into a pane/list content region: an 8px inline margin (so its
 * edges line up with `.kui-content` items) and a stretch flex row with an 8px gap.
 * Use it for controls that carry their own border and padding but no outer margin
 * — the wrapper adds only the alignment margin and layout, not a second inset.
 */
declare function ListInsetControl({ children, sides, className, slot, }: ListInsetControlProps): kerfjs.SafeHtml;

export { ListInsetControl, type ListInsetControlProps, Sides };
```

## `@kerfjs/ui/list-inset-text`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { S as Sides } from './sides-BPSWde0A.js';

type ListInsetTextRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-sides'?: never;
}>;
interface ListInsetTextProps {
    /** Text (or inline content) that carries no margin, border, or padding of its own. */
    children: KerfUiContent | string;
    /** Physical inset sides in canonical top/right/bottom/left order. Defaults to all sides. */
    sides?: Sides;
    className?: string;
    /** Safe `data-*` metadata; component-owned structural attributes stay protected. */
    rootAttributes?: ListInsetTextRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * Gives bare text the content-item geometry — an 8px inline margin, a 1px
 * transparent border, and 8px padding — so a plain string lines up with
 * bordered `.kui-content` items (its text edge lands at the same 17px inset).
 * Use it for text elements that have no margin, border, or padding of their own.
 * Pass `sides="rl"` to keep the horizontal inset but drop the vertical box
 * space for tight text layout.
 */
declare function ListInsetText({ children, sides, className, rootAttributes, slot, }: ListInsetTextProps): kerfjs.SafeHtml;

export { ListInsetText, type ListInsetTextProps, Sides };
```

## `@kerfjs/ui/content-item`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

/** Whether the item's always-reserved 1px border is transparent or visible. */
type ContentItemFrame = 'none' | 'framed';
/** Corner shape: the 12px rounded rectangle or the 22px pill. */
type ContentItemShape = 'rounded' | 'pill';
/** `single` uses option selection; `toggle` uses a pressed button. */
type ContentItemSelectionMode = 'none' | 'single' | 'toggle';
type ContentItemRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
}>;
type ContentItemInteractiveRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-interactive'?: never;
    'data-selected'?: never;
    'data-disabled'?: never;
    'data-selection-mode'?: never;
    'data-kui-pressed'?: never;
}>;
interface ContentItemBaseProps {
    /** Item content; a plain string is allowed for bare copy. */
    children?: KerfUiContent | string;
    /**
     * `framed` paints the standard neutral border in the 1px the item always
     * reserves, so framing never changes geometry. Frame only an item that
     * marks a real distinction. Defaults to `none` (transparent border).
     */
    frame?: ContentItemFrame;
    /** Corner shape. Defaults to `rounded`. */
    shape?: ContentItemShape;
    /**
     * Names the item as a distinct region (`role="region"`). Omit it for an
     * ordinary item, which stays a non-landmark grouping.
     */
    ariaLabel?: string;
    /**
     * Makes the item a programmatic focus target (`tabindex="-1"`, never a tab
     * stop), for example the preferred initial focus of a NavStack view when
     * combined with `data-nav-focus` in `rootAttributes`.
     */
    focusTarget?: boolean;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
type ContentItemProps = ContentItemBaseProps & ({
    interactive?: false;
    action?: never;
    itemId?: never;
    selectionMode?: never;
    selected?: never;
    disabled?: never;
    /** Existing static `data-*` metadata remains available. */
    rootAttributes?: ContentItemRootAttributes;
} | {
    /** Enable a keyboard reachable card; wire `wireContentItems` once on its containing root. */
    interactive: true;
    /** Delegated action dispatched by pointer, Enter, or Space. */
    action: string;
    itemId?: string;
    selectionMode?: ContentItemSelectionMode;
    selected?: boolean;
    disabled?: boolean;
    /** Safe app metadata; interaction attributes are component-owned. */
    rootAttributes?: ContentItemInteractiveRootAttributes;
});
/**
 * One self-contained `.kui-content` child: an 8px inline margin, a real 1px
 * border (transparent unless `framed`), 8px padding, and a rounded or pill
 * radius. It owns that whole geometry, so wrappers must not add more.
 */
declare function ContentItem({ children, frame, shape, ariaLabel, focusTarget, interactive, action, itemId, selectionMode, selected, disabled, className, rootAttributes, slot, }: ContentItemProps): kerfjs.SafeHtml;

export { ContentItem, type ContentItemFrame, type ContentItemProps, type ContentItemSelectionMode, type ContentItemShape };
```

## `@kerfjs/ui/value-table`

```ts
import * as kerfjs from 'kerfjs';
import { SafeHtml } from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

interface ValueTableRowProps {
    label: string | SafeHtml;
    value: string | SafeHtml;
    icon?: SafeHtml;
    className?: string;
    /** Render the value as an unanimated loading skeleton, keeping the field label. */
    placeholder?: boolean;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function ValueTableRow({ label, value, icon, className, placeholder, slot, }: ValueTableRowProps): SafeHtml;

interface ValueTableProps {
    label: string;
    /** Compact row spacing for metadata-dense surfaces. */
    density?: 'default' | 'compact';
    className?: string;
    children: KerfUiContent;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function ValueTable({ label, density, className, children, slot, }: ValueTableProps): kerfjs.SafeHtml;

export { ValueTable, type ValueTableProps, ValueTableRow, type ValueTableRowProps };
```

## `@kerfjs/ui/app-tab`

```ts
import { SafeHtml } from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type AppTabRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-tab-id'?: never;
    'data-selected'?: never;
    'data-tab-dragging'?: never;
    'data-tab-drop-position'?: never;
    'data-attention'?: never;
    'data-drop-target'?: never;
    'data-name-overflow'?: never;
    'data-pinned'?: never;
}>;
type AppTabPresentation = 'pill' | 'segmented' | 'icon-only';
type AppTabSize = 'default' | 'compact';
type AppTabNameOverflow = 'ellipsis' | 'visible';
interface AppTabProps {
    id: string;
    name: string;
    selected?: boolean;
    /** Emphasize the visible tab name with the attention color token. */
    attention?: boolean;
    /** Highlight this tab as the target of a drag over its content. */
    dropTarget?: boolean;
    /** Keep the leading tab visible within its TabBar tablist while peers scroll. */
    pinned?: boolean;
    closable?: boolean;
    draggable?: boolean;
    leading?: KerfUiContent;
    trailing?: KerfUiContent;
    /** Visual treatment within a TabBar. Icon-only tabs retain `name` as their accessible name. */
    presentation?: AppTabPresentation;
    /** Compact tabs use the 32px application-rail height. */
    size?: AppTabSize;
    /** Maximum visible label width in CSS pixels before ellipsis. */
    labelMaxWidth?: number;
    /** Keep the full name visible for an inline loading treatment. */
    nameOverflow?: AppTabNameOverflow;
    /** Decorative dormant content for the close button. Must not contain interactive descendants. */
    closeIcon?: SafeHtml;
    selectAction?: string;
    closeAction?: string;
    className?: string;
    /** Render as an unanimated loading skeleton, disabling select/close and dragging. */
    placeholder?: boolean;
    /**
     * Named and still opening: the tab is known but its content is loading.
     * Keeps `name` visible in the quiet text color and as the tab's accessible
     * name, shows `trailing` (for example a `LoadingSpinner`), and marks the
     * tab `aria-busy`. Unlike `placeholder` it stays selectable — the
     * application shows placeholder content in its panel until loading
     * completes — while close and dragging stay disabled. Same pill geometry
     * as the live tab, so swapping it in place does not shift the bar.
     * `placeholder` wins when both are set.
     */
    pending?: boolean;
    rootAttributes?: AppTabRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function AppTab({ id, name, selected, attention, dropTarget, pinned, closable, draggable, leading, trailing, presentation, size, labelMaxWidth, nameOverflow, closeIcon, selectAction, closeAction, className, placeholder, pending, rootAttributes, slot, }: AppTabProps): SafeHtml;

export { AppTab, type AppTabNameOverflow, type AppTabPresentation, type AppTabProps, type AppTabSize };
```

## `@kerfjs/ui/tab-bar`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type TabActivation = 'automatic' | 'manual';
type TabBarAllocation = 'intrinsic' | 'fill';
type TabBarPresentation = 'rail' | 'segmented' | 'inspector';
type TabBarTrailingPlacement = 'separate' | 'adjacent';
/** Tablist width where segmented AppTabs switch to icon-only. */
type TabBarIconOnlyAt = 'wide' | 'narrow' | 'compact';
interface TabBarProps {
    id: string;
    label: string;
    children: KerfUiContent;
    leading?: KerfUiContent;
    trailing?: KerfUiContent;
    /**
     * Action pinned to the far edge of the bar. Combine with an adjacent `trailing`
     * action when the tab-local and workspace-level actions must remain distinct.
     */
    end?: KerfUiContent;
    className?: string;
    /**
     * Keyboard activation mode for this strip, emitted as `data-tab-activation` for
     * `wireTabBars` to read (overrides its `activation` option). `'automatic'` (default)
     * selects on arrow / Home / End; `'manual'` moves roving focus only and the user
     * selects with Enter / Space / click — use it when selecting a tab is a heavy action.
     */
    activation?: TabActivation;
    /** How available strip width is allocated across child AppTabs. */
    allocation?: TabBarAllocation;
    /** Named strip chrome for application rails, segmented tabs, or inspectors. */
    presentation?: TabBarPresentation;
    /** Switch segmented AppTabs to icon-only at tablist widths of 832, 704, or 448px. Each tab needs a leading icon. */
    iconOnlyAt?: TabBarIconOnlyAt;
    /** Keep a trailing action beside the final tab or at the far edge of the bar. */
    trailingPlacement?: TabBarTrailingPlacement;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** Render a controlled tab strip. The application owns selection, order, and persistence. */
declare function TabBar({ id, label, children, leading, trailing, end, className, activation, allocation, presentation, iconOnlyAt, trailingPlacement, slot, }: TabBarProps): kerfjs.SafeHtml;

export { type TabActivation, TabBar, type TabBarAllocation, type TabBarIconOnlyAt, type TabBarPresentation, type TabBarProps, type TabBarTrailingPlacement };
```

## `@kerfjs/ui/wire-tab-bars`

```ts
import { TabActivation } from './tab-bar.js';
import 'kerfjs';
import './semantic-content-BbzjvSu9.js';

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

export { TabActivation, type TabDropPosition, type TabReorder, type TabReorderSource, type WireTabBarsOptions, reorderTabs, wireTabBars };
```

## `@kerfjs/ui/wire-scroll-dividers`

```ts
/**
 * An app-owned scroll arrangement outside a `Pane`: the `id` of the element
 * that scrolls and the `id`s of the pinned chrome on each physical side of it.
 * Each named chrome element shows its divider on the side facing the scroller
 * while content is scrolled away beyond that side. Ids are resolved below the
 * wired root on every refresh, so a re-render that replaces an element keeps
 * the pairing.
 */
interface ScrollDividerTarget {
    /** The `id` of the scrolling element. */
    scroller: string;
    /** Chrome above the scroller: shows its bottom divider once scrolled down. */
    top?: string;
    /**
     * Chrome right of the scroller: shows its left divider while content is
     * hidden beyond the scroller's right edge (never when nothing overflows).
     */
    right?: string;
    /**
     * Chrome below the scroller: shows its top divider while content is hidden
     * beyond the scroller's bottom edge (never when nothing overflows).
     */
    bottom?: string;
    /** Chrome left of the scroller: shows its right divider once scrolled right. */
    left?: string;
}
interface WireScrollDividersOptions {
    /**
     * App-owned scroll arrangements to pair beyond the ones found by structure
     * (every `Pane`'s header and footer around its content, every `NavStack`'s
     * and `TabScaffold`'s chrome around its active region, and every `TabBar`
     * strip).
     */
    targets?: readonly ScrollDividerTarget[];
}
/**
 * Wire scroll dividers below `root`: a divider between pinned chrome and the
 * content that scrolls beside it shows only while content is scrolled away
 * from that edge. Near edges (top, left) hide at the scroll start; far edges
 * (bottom, right) hide at the scroll end and whenever nothing overflows.
 *
 * The wiring only reports scroll state; each component draws its own divider
 * from it. It writes `data-scroll-overflow` (the edges with hidden content, in
 * canonical `t`/`r`/`b`/`l` order) on each scroller, and `data-scroll-divider`
 * (the sides to draw) on each paired chrome element:
 *
 * - every `Pane` with a header or footer: its header shows a bottom divider and
 *   its footer a top divider (drawn by the Pane, per its `chromeDividers`);
 * - every `NavStack`'s top chrome and bottom toolbar around its active view,
 *   and every `TabScaffold`'s bar under its active scene: the chrome shows a
 *   bottom (top chrome) or top (bottom toolbar, bar) divider. The scroller is
 *   whichever element actually scrolls there: the view or scene itself, or,
 *   through a sole child with no chrome of its own on that edge, a `Pane`'s
 *   content or a nested `NavStack` / `TabScaffold` region (a Pane's own header
 *   or footer draws that boundary instead);
 * - every `TabBar` strip: the bar draws a divider on each side of the strip
 *   whose tabs are scrolled out of view;
 * - each app-owned `targets` pairing: a `Toolbar` or `List` named as chrome
 *   draws the divider on its facing side.
 *
 * Structure is re-read after every DOM change below root (a re-render that
 * drops the attributes gets them back before paint), scroll is tracked with
 * one capturing listener, and size changes of each scroller and its children
 * with a `ResizeObserver`. Returns a disposer that removes every attribute it
 * wrote. See `docs/23-app-layouts.md` §3.7.
 */
declare function wireScrollDividers(root: HTMLElement | Document, { targets }?: WireScrollDividersOptions): () => void;

export { type ScrollDividerTarget, type WireScrollDividersOptions, wireScrollDividers };
```

## `@kerfjs/ui/nav-stack`

```ts
import * as kerfjs from 'kerfjs';
import { PaneAppearance } from './pane.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { ToolbarConfig } from './toolbar.js';
import { ToolbarTextSize, HeadingLevel } from './toolbar-text.js';
import './sides-BPSWde0A.js';

/**
 * One entry in a {@link NavStack}. The app owns the stack as an array (usually a
 * signal); `NavStack` renders it and `wireNavStack` animates the transitions.
 */
interface NavStackView {
    /** Stable identity for keyed reconcile and transition direction. */
    key: string;
    content: KerfUiContent;
    /** Background of this view's scrolling work surface. */
    appearance?: PaneAppearance;
    /** Title shown in the top toolbar for this view. */
    title?: string;
    /** Leading groups for this view's top toolbar, after the back control and before the title. */
    leading?: KerfUiContent;
    /** Center content for this view's top toolbar (placed per `toolbarConfig.centerAlign`). */
    center?: KerfUiContent;
    /** Trailing actions for this view's top toolbar. */
    toolbar?: KerfUiContent;
    /** Bottom toolbar for this view. Cross-fades with the top chrome on navigation. */
    bottomToolbar?: KerfUiContent;
}
/**
 * The top toolbar's configuration. Its `ToolbarConfig` forwards to the real
 * `Toolbar` the stack renders; by default that toolbar draws no divider and
 * claims the top and side safe-area edges the stack still touches.
 */
interface NavStackToolbarConfig extends ToolbarConfig {
    /** Accessible name of the top toolbar (default: none). */
    label?: string;
    /** Size of the view title's `ToolbarText` (default `large`). */
    titleSize?: ToolbarTextSize;
    /** Expose the view title as a heading at this level (default: a plain span). */
    headingLevel?: HeadingLevel;
}
interface NavStackProps {
    id: string;
    /** Accessible name for the stack region. */
    label: string;
    /** The stack, root first; the last entry is the active top view. */
    views: NavStackView[];
    /** Accessible label for the icon-only back control (default "Back"). */
    backLabel?: string;
    /** The back control's icon (default a chevron-left `LucideIcon`). */
    backIcon?: KerfUiContent;
    /**
     * Visible text beside the back icon, such as the previous view's title
     * (default: icon only). When set, the text names the control and
     * `backLabel` is not used.
     */
    backText?: string;
    /** The top toolbar's configuration, forwarded to its `Toolbar`. */
    toolbarConfig?: NavStackToolbarConfig;
    /** Hide the top toolbar entirely (rare — a fully custom-chrome view). */
    hideToolbar?: boolean;
    /** Optional persistent bottom toolbar used when the active view does not provide one. */
    bottomToolbar?: KerfUiContent;
    /**
     * The line under the top chrome and over the bottom toolbar, where they
     * meet the active view. `scroll` (default) shows the chrome's line only
     * while the view's content is scrolled beneath it, and the bottom
     * toolbar's only while more content lies below — never when the content
     * fits — once `wireScrollDividers` (`@kerfjs/ui/wire-scroll-dividers`) is
     * wired above the stack; unwired, neither shows. `always` shows both
     * without the wiring; `none` neither, even when wired. The line is drawn
     * inside the chrome, so no state moves the chrome or the content. A
     * `toolbarConfig.dividerSides` edge is the Toolbar's own and is unaffected.
     */
    chromeDividers?: 'scroll' | 'always' | 'none';
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A navigation stack (iOS-style push/pop). Renders every entry stacked, the last
 * one active; `@kerfjs/ui/wire-nav-stack`'s `wireNavStack` slides the content and
 * cross-fades the chrome across a change. Its top chrome is a real `Toolbar`: the
 * back control and title lead, the active view's `leading` / `center` / `toolbar`
 * content fills the zones, and `toolbarConfig` configures it. A single-pane
 * layout is a `NavStack` with one entry. See `docs/23-app-layouts.md` §3.1.
 */
declare function NavStack({ id, label, views, backLabel, backIcon, backText, toolbarConfig, hideToolbar, bottomToolbar, chromeDividers, className, slot, }: NavStackProps): kerfjs.SafeHtml;

export { NavStack, type NavStackProps, type NavStackToolbarConfig, type NavStackView };
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
 * change, moves focus into every new top view, restores that view's last focused
 * descendant on pop, and calls `onBack` when the back control is used. Mark a
 * preferred initial target with `data-nav-focus`; otherwise the first focusable
 * descendant (or the view itself) receives focus. Returns a disposer.
 */
declare function wireNavStack(root: Element, options?: WireNavStackOptions): () => void;

export { type WireNavStackOptions, wireNavStack };
```

## `@kerfjs/ui/split-view`

```ts
import * as kerfjs from 'kerfjs';
import { NavStackProps, NavStackView } from './nav-stack.js';
import { ResizableRegionProps } from './resizable-region.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import './pane.js';
import './toolbar.js';
import './sides-BPSWde0A.js';
import './toolbar-text.js';
import './css-values.js';

/**
 * The roomy list pane's `ResizableRegion`: its committed `size` and `min` /
 * `max` limits, plus the region configuration that forwards unchanged
 * (`separator`, `handleIcon`, `contentOverflow`, and collapse:
 * `collapsed`, `transitioning`, `collapseMotion`, `restoreControl`,
 * `restorePosition`). Omitted options keep the region's defaults.
 */
interface SplitViewResizable extends Pick<ResizableRegionProps, 'separator' | 'handleIcon' | 'contentOverflow' | 'collapsed' | 'transitioning' | 'collapseMotion' | 'restoreControl' | 'restorePosition'> {
    size: number;
    min: number;
    max: number;
}
/** One compact view's top- and bottom-toolbar content (see `NavStackView`). */
type SplitViewCompactViewToolbars = Pick<NavStackView, 'leading' | 'center' | 'toolbar' | 'bottomToolbar'>;
/**
 * The compact `NavStack`'s configuration: its toolbar configuration, back
 * control, persistent bottom toolbar, and chrome dividers forward to the
 * stack, and `list` / `detail` give each view its own toolbar groups.
 */
interface SplitViewCompactStack extends Pick<NavStackProps, 'toolbarConfig' | 'backIcon' | 'backText' | 'hideToolbar' | 'bottomToolbar' | 'chromeDividers'> {
    /** Toolbar content for the list (root) view. */
    list?: SplitViewCompactViewToolbars;
    /** Toolbar content for the pushed detail view. */
    detail?: SplitViewCompactViewToolbars;
}
interface SplitViewProps {
    id: string;
    label: string;
    /** The list (primary) pane. */
    list: KerfUiContent;
    /** The detail (secondary) pane. */
    detail: KerfUiContent;
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
    /** Compact NavStack configuration and per-view toolbars. */
    compactStack?: SplitViewCompactStack;
    /** A resizable separator on roomy classes (min/max px). Omit for a fixed split. */
    resizable?: SplitViewResizable;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A list-detail split. On roomy classes it shows both panes side
 * by side with an optional resizable separator; on compact classes it collapses
 * to a `NavStack` (list → detail). See `docs/23-app-layouts.md` §3.2. Compose the
 * resizable wiring with `wireResizableRegions` and the compact back with
 * `wireNavStack`.
 */
declare function SplitView({ id, label, list, detail, compact, detailActive, listTitle, detailTitle, backLabel, compactStack, resizable, className, slot, }: SplitViewProps): kerfjs.SafeHtml;

export { SplitView, type SplitViewCompactStack, type SplitViewCompactViewToolbars, type SplitViewProps, type SplitViewResizable };
```

## `@kerfjs/ui/pane`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

/**
 * Logical pane sides: where a {@link Pane} can show a separator and where it can
 * compensate for a device safe-area inset.
 */
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
    'data-safe-area-block-start'?: never;
    'data-safe-area-block-end'?: never;
    'data-safe-area-inline-start'?: never;
    'data-safe-area-inline-end'?: never;
    'data-chrome-placement'?: never;
    'data-chrome-dividers'?: never;
    'data-appearance'?: never;
}>;
/** How a Pane's header and footer relate to its scrolling content. */
type PaneChromePlacement = 'fixed' | 'auto';
/**
 * When a Pane draws the divider between its pinned header or footer and its
 * scrolling content: `scroll` while content is scrolled away beneath that
 * chrome, as `wireScrollDividers` reports; `always`; or `none`.
 */
type PaneChromeDividers = 'scroll' | 'always' | 'none';
/** Background treatment of the Pane's scrolling work surface. */
type PaneAppearance = 'default' | 'sunken';
interface PaneProps {
    /** Optional fixed chrome above the scrolling content, arranged vertically. */
    header?: KerfUiContent;
    /** The pane's primary vertical, scrolling content stack. */
    children?: KerfUiContent;
    /** Optional fixed chrome below the scrolling content. */
    footer?: KerfUiContent;
    /**
     * Whether the header and footer stay pinned around the scrolling content.
     * `fixed` (default) always pins them. `auto` pins them while the pane is
     * tall enough, and below 480px of height (30rem, so it scales with the text
     * size) lets the whole pane scroll as one column, so tall chrome can never
     * squeeze the content to nothing.
     */
    chromePlacement?: PaneChromePlacement;
    /**
     * The divider under the header and over the footer, where they meet the
     * scrolling content. Omitted defaults to `scroll` for a plain pane and
     * `always` for `appearance="sunken"`. `scroll` shows the header's divider only
     * while the content is scrolled down, and the footer's only while more
     * content lies below — never when the content fits — once
     * `wireScrollDividers` (`@kerfjs/ui/wire-scroll-dividers`) is wired above
     * the pane; unwired, neither shows. `always` shows both; `none` neither.
     * The line is drawn inside the chrome, so no state moves the content.
     */
    chromeDividers?: PaneChromeDividers;
    /** Paint the scrolling work surface with the shared lowered-surface color. */
    appearance?: PaneAppearance;
    /** Root semantics. Defaults to `div`. */
    element?: PaneElement;
    /** Scrolling content semantics. Defaults to `div`. */
    contentElement?: PaneContentElement;
    /** Independent logical-edge separator lines. Defaults to none. */
    separators?: readonly PaneSeparatorSide[];
    /**
     * Sides on which the pane may compensate for a device safe-area inset.
     * Defaults to every side: the pane pads its slots for each side that still
     * reaches an unsafe screen edge, as its surrounding layout reports, while its
     * background and separators paint through. List only the sides an app-owned
     * layout places at a screen edge, or pass `[]` to opt out.
     */
    safeAreaEdges?: readonly PaneSeparatorSide[];
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
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A pane's configuration, apart from its content and styling hooks: the props a
 * composite that renders a `Pane` for the app (a Workbench panel or work area,
 * or a CollapsiblePanel) forwards, so the app configures that pane instead of
 * styling it. An omitted or `undefined` field keeps the composite's default.
 */
type PaneConfig = Pick<PaneProps, 'contentElement' | 'contentLabel' | 'separators' | 'safeAreaEdges' | 'chromeDividers' | 'appearance'>;
/**
 * An unpadded application column with optional fixed header/footer slots and one
 * scrolling vertical content owner. Separator lines are independently opt-in on
 * each logical edge, so the same component works as a sidebar, main area,
 * inspector, or dialog column.
 */
declare function Pane({ header, children, footer, chromePlacement, chromeDividers, appearance, element, contentElement, separators, safeAreaEdges, id, label, contentLabel, className, headerClassName, contentClassName, footerClassName, rootAttributes, slot, }: PaneProps): kerfjs.SafeHtml;

export { Pane, type PaneAppearance, type PaneChromeDividers, type PaneChromePlacement, type PaneConfig, type PaneContentElement, type PaneElement, type PaneProps, type PaneSeparatorSide };
```

## `@kerfjs/ui/workbench`

```ts
import { SafeHtml } from 'kerfjs';
import { ListConfig } from './list.js';
import { PaneConfig } from './pane.js';
import { ResizableRegionSeparator, ResizableRegionCollapseMotion, ResizableRegionContentOverflow, ResizableRegionPresentation, ResizableRegionRestorePosition } from './resizable-region.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { a as PanelToolbar, b as PanelToggle } from './panel-toolbar-DqwtBxQL.js';
import { ToolbarConfig } from './toolbar.js';
import './css-values.js';
import './flex-alignment-4ms8ZbV8.js';
import './sides-BPSWde0A.js';
import './lucide-icon.js';
import 'lucide';

/** The standard toggle a Workbench renders for a panel (see {@link PanelToggle}). */
type WorkbenchPanelToggle = PanelToggle;
/**
 * A Workbench panel's top toolbar, composed by the Workbench so its groups can
 * follow the panel's open state (see {@link PanelToolbar} for the roles).
 * A collapsed rail's marked groups and toggle go to the leading edge of
 * `mainToolbar` (left rail) or its trailing edge (right rail); a collapsed
 * drawer's go to the trailing edge of `mainBottomToolbar`, else to a
 * `FloatingToolbar` in the work area's bottom-end corner.
 */
type WorkbenchPanelToolbar = PanelToolbar;
/**
 * The work area's top toolbar; collapsed rails add their groups to it. Its
 * configuration forwards to its `Toolbar`. It draws no divider of its own by
 * default: the work area's `Pane` draws one under its header chrome, wherever
 * that chrome ends, while `main` is scrolled (`mainPane.chromeDividers`).
 */
interface WorkbenchMainToolbar extends ToolbarConfig {
    label: string;
    /** The work area's title, usually an extra-large `ToolbarText`. */
    title?: KerfUiContent;
    /** Groups after the title. */
    leading?: KerfUiContent;
    center?: KerfUiContent;
    /** Groups at the trailing edge, before a collapsed right rail's groups. */
    trailing?: KerfUiContent;
}
/**
 * The work area's bottom toolbar; a collapsed drawer adds its groups to it.
 * Its configuration forwards to its `Toolbar`. It draws no divider of its own
 * by default: the work area's `Pane` draws one over its footer chrome while
 * more of `main` lies below (`mainPane.chromeDividers`).
 */
interface WorkbenchMainBottomToolbar extends ToolbarConfig {
    label: string;
    leading?: KerfUiContent;
    center?: KerfUiContent;
    trailing?: KerfUiContent;
}
/**
 * Whether the work area's header or footer chrome stays pinned (`fixed`),
 * scrolls away with the content (`scroll`), or stays pinned while the work
 * area is tall enough and scrolls with the content when it is short (`auto`,
 * the Pane's `chromePlacement="auto"`; it applies to the pinned header and
 * footer together).
 */
type WorkbenchChromePlacement = 'fixed' | 'scroll' | 'auto';

/**
 * The Workbench container breakpoint below which a panel presents as an
 * overlay: `narrow` (704px or less) or `compact` (448px or less) — the same
 * breakpoints as `ResizableRegion`'s `responsiveFillAt` — or `never` to keep
 * it inline at every width.
 */
type WorkbenchResponsiveOverlayAt = 'compact' | 'narrow' | 'never';
/**
 * How wide a rail's overlay is in a compact (448px or less) Workbench: `inset`
 * fills the Workbench less a dismiss margin on the side away from the rail's
 * edge, so a press beside it closes it; `full` fills the Workbench.
 */
type WorkbenchCompactOverlay = 'inset' | 'full';
/** Drag-resize limits for a resizable Workbench panel, in px. */
interface WorkbenchPanelResizable {
    /** Smallest size (default 180 for a rail, 120 for the drawer). */
    min?: number;
    /** Largest size (default 480). */
    max?: number;
}
/** A collapsible Workbench panel — a side rail or the bottom drawer. */
interface WorkbenchPanel {
    content: KerfUiContent;
    /**
     * The panel's top toolbar, composed by the Workbench: its marked groups
     * and standard `toggle` move to the work area's toolbar while the panel is
     * collapsed. With it, `content` renders in a `Pane` below the toolbar.
     */
    toolbar?: WorkbenchPanelToolbar;
    /** Optional bottom toolbar under a `toolbar` panel's content. */
    footer?: KerfUiContent;
    /**
     * Configuration for a `toolbar` panel's `Pane` (`contentElement`,
     * `contentLabel`, `separators`, `safeAreaEdges`, `chromeDividers`) — for example
     * `{ contentElement: 'nav', contentLabel: 'Sections' }` for a navigation
     * rail. Omitted or `undefined` fields keep the `Pane` defaults. Ignored
     * without a `toolbar`, where `content` renders as given.
     */
    pane?: PaneConfig;
    /** Whether the panel is currently collapsed (the app owns this). */
    collapsed?: boolean;
    /**
     * Rail width, or drawer height, in px. Overrides the CSS default. For a
     * resizable panel it is the current size (default 280 for a rail, 220 for
     * the drawer), clamped to the limits; the app owns it and `wireWorkbench`
     * reports each resize.
     */
    size?: number;
    /**
     * Opt in to drag and keyboard resizing on the panel's inner separator:
     * `true` for the default limits, or `{ min, max }`. Off by default. Pair it
     * with `wireWorkbench` from `@kerfjs/ui/wire-workbench`.
     */
    resizable?: boolean | WorkbenchPanelResizable;
    /** Accessible name for the panel region. */
    label?: string;
    separator?: ResizableRegionSeparator;
    collapseMotion?: ResizableRegionCollapseMotion;
    contentOverflow?: ResizableRegionContentOverflow;
    presentation?: ResizableRegionPresentation;
    /**
     * Present the panel as an overlay, without a separator, below a Workbench
     * container breakpoint, and inline above it — the CSS decides, so the app
     * needs no device-class check. A rail overlays from its side at full
     * height, over the work area and an open drawer; the bottom drawer
     * overlays the bottom of the work-area column. Rails default to `narrow`
     * (pass `never` to keep one inline); the drawer defaults to inline.
     */
    responsiveOverlayAt?: WorkbenchResponsiveOverlayAt;
    /**
     * A rail's overlay width in a compact Workbench (default `inset`: the
     * Workbench less `--kui-workbench-overlay-dismiss-margin`, 44px). Ignored
     * by the drawer.
     */
    compactOverlay?: WorkbenchCompactOverlay;
    /**
     * Control shown while collapsed, in a safe-area-aware corner of the
     * Workbench (not the viewport); the bottom drawer's sits in the work-area
     * column. Prefer `toolbar.toggle`, which the Workbench relocates into the
     * work area's toolbar (or this corner when that toolbar is absent).
     */
    restoreControl?: SafeHtml;
    restorePosition?: ResizableRegionRestorePosition;
}
interface WorkbenchProps {
    /**
     * The Workbench's `id`. Each panel's `id` derives from it —
     * `<id>-left-rail`, `<id>-right-rail`, `<id>-bottom-drawer` — so a toggle
     * can name the panel it shows and hides with `aria-controls`.
     */
    id: string;
    label: string;
    /** The central work area. */
    main: KerfUiContent;
    /**
     * The work area's top toolbar. A collapsed left rail's marked groups
     * and toggle lead it; a collapsed right rail's trail it. With it, `main`
     * renders in a `Pane` below the toolbar.
     */
    mainToolbar?: WorkbenchMainToolbar;
    /**
     * Fixed content under `mainToolbar` — supporting copy such as a
     * description — divided from the scrolling `main` below it.
     */
    mainHeader?: KerfUiContent;
    /**
     * Fixed content over `mainBottomToolbar` — a status line or a resource
     * toolbar — divided from the scrolling `main` above it.
     */
    mainFooter?: KerfUiContent;
    /**
     * The work area's bottom toolbar. A collapsed drawer's marked groups and
     * toggle trail it; without it they float in the work area's corner.
     */
    mainBottomToolbar?: WorkbenchMainBottomToolbar;
    /**
     * Whether `mainToolbar` and `mainHeader` stay pinned (`fixed`, default),
     * scroll away with `main` (`scroll`) — useful where large text would leave
     * pinned chrome little room — or stay pinned while the work area is tall
     * enough and scroll with `main` when it is short (`auto`).
     */
    mainHeaderPlacement?: WorkbenchChromePlacement;
    /** The same for `mainFooter` and `mainBottomToolbar` (default `fixed`). */
    mainFooterPlacement?: WorkbenchChromePlacement;
    /**
     * Configuration for the work area's `Pane` (`contentElement`,
     * `contentLabel`, `separators`, `safeAreaEdges`, `chromeDividers`), which it has whenever it
     * has a toolbar, `mainHeader`, or `mainFooter`; without that chrome, `main`
     * renders as given and this is ignored. Omitted or `undefined` fields keep
     * the `Pane` defaults.
     */
    mainPane?: PaneConfig;
    /**
     * Configuration for the `List` that holds `mainHeader` (`gap`, `hAlign`,
     * `vAlign`, `dividerSides`, `textInsets`, `controlInsets`). Omitted or
     * `undefined` fields keep the defaults (no divider: the work area's
     * `Pane` draws the line under its header chrome).
     */
    mainHeaderList?: ListConfig;
    /**
     * The same for the `List` that holds `mainFooter` (no divider by default:
     * the work area's `Pane` draws the line over its footer chrome).
     */
    mainFooterList?: ListConfig;
    leftRail?: WorkbenchPanel;
    rightRail?: WorkbenchPanel;
    bottomDrawer?: WorkbenchPanel;
    /**
     * Minimum width, in px, the work area keeps beside the inline rails, fixed
     * or `resizable` (default 320; `0` turns it off). Resizing a rail stops
     * where the work area would drop below it, and inline rails shrink
     * proportionally when the Workbench gets narrower. Workbenches without a
     * rail ignore it.
     */
    mainMinSize?: number;
    /**
     * Minimum height, in px, the work area keeps above an inline bottom drawer,
     * fixed or `resizable` (default 120; `0` turns it off) — the drawer's
     * counterpart of `mainMinSize`. Resizing the drawer stops where the work
     * area would drop below it, and the drawer shrinks when the Workbench gets
     * shorter. Workbenches without a drawer ignore it.
     */
    mainMinHeight?: number;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * The Xcode-like multi-panel workspace: a collapsible left rail, right rail, and
 * bottom drawer around a central work area (any absent). Collapsing snaps the
 * panel's track to zero in one reflow while its fixed-size content slides out via
 * a composited transform — the instant-width / sliding-content technique, so the
 * work area relayouts once, not per frame. Bottom-drawer content stays anchored
 * to the shell's stable bottom edge throughout that transition. The app owns
 * each `collapsed` flag; the collapse is pure CSS. A collapsed panel renders
 * `inert` and `aria-hidden`, so neither Tab nor assistive technology reaches
 * controls that have slid out of view or an empty landmark (its restore control
 * lives outside it and stays reachable). A panel may opt in to drag and keyboard resizing with
 * `resizable`, which `wireWorkbench` drives. See `docs/23-app-layouts.md` §3.3.
 */
declare function Workbench({ id, label, main, leftRail, rightRail, bottomDrawer, mainToolbar, mainHeader, mainFooter, mainBottomToolbar, mainHeaderPlacement, mainFooterPlacement, mainPane, mainHeaderList, mainFooterList, mainMinSize, mainMinHeight, className, slot, }: WorkbenchProps): SafeHtml;

export { Workbench, type WorkbenchChromePlacement, type WorkbenchCompactOverlay, type WorkbenchMainBottomToolbar, type WorkbenchMainToolbar, type WorkbenchPanel, type WorkbenchPanelResizable, type WorkbenchPanelToggle, type WorkbenchPanelToolbar, type WorkbenchProps, type WorkbenchResponsiveOverlayAt };
```

## `@kerfjs/ui/wire-workbench`

```ts
import { Signal, ReadonlySignal } from 'kerfjs';
import { DeviceClass } from './device-class.js';

/** A Workbench panel slot, named after its `WorkbenchProps` prop. */
type WorkbenchPanelKey = 'leftRail' | 'rightRail' | 'bottomDrawer';

/** Minimal `localStorage`-shaped store, so the persistence hook is testable. */
interface WorkbenchStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
/** One Workbench panel's app-owned state. */
interface WireWorkbenchPanel {
    /**
     * The app-owned size signal a `resizable` panel renders as its `size`.
     * `wireWorkbench` writes each committed resize here; collapsing never
     * touches it, so an expanded panel returns at the size it had. Omit it for
     * a panel that is not resizable.
     */
    size?: Signal<number>;
    /**
     * When set with `size`, the size is loaded from and saved to `storage`
     * under this key, so the panel remembers the user's size.
     */
    storageKey?: string;
    /**
     * The app-owned signal the panel renders as its `collapsed`. With it (and
     * `dismissOverlays`, on by default) `wireWorkbench` treats the panel as a
     * transient overlay while it presents as one: it collapses when its
     * `responsiveOverlayAt` breakpoint begins to apply and gets its inline state
     * back when the breakpoint stops applying, an open overlay takes focus and
     * keeps Tab inside it, and it closes on Escape or a press outside it.
     */
    collapsed?: Signal<boolean>;
}
/** A resize the user made, after `wireWorkbench` wrote it to the size signal. */
interface WorkbenchResize {
    panel: WorkbenchPanelKey;
    size: number;
    source: 'keyboard' | 'pointer';
}
interface WireWorkbenchOptions {
    /** The `id` the `Workbench` was rendered with. */
    id: string;
    /**
     * The wired panels, keyed like the `Workbench` props. Render a panel given
     * a `size` with `resizable` and `size={panel.size.value}`, and one given a
     * `collapsed` signal with `collapsed={panel.collapsed.value}`.
     */
    panels: Partial<Record<WorkbenchPanelKey, WireWorkbenchPanel>>;
    /**
     * When provided, resizing is suspended while `deviceClass.compact` is true —
     * the classes where rails become overlay drawers or are replaced.
     */
    deviceClass?: ReadonlySignal<DeviceClass>;
    /** Persistence store (default `globalThis.localStorage`, if present). */
    storage?: WorkbenchStorage;
    /** Keyboard step in px (default 16). */
    step?: number;
    /** Shift+arrow step in px (default 64). */
    largeStep?: number;
    /** Called after each committed resize. */
    onResize?: (change: WorkbenchResize) => void;
    /**
     * Treat the panels given a `collapsed` signal as transient overlays while
     * they present as overlays (default `true`), like `wireSidebar`'s compact
     * overlay: a panel whose `responsiveOverlayAt` breakpoint begins to apply
     * starts collapsed, with no collapse motion, and gets its inline collapsed
     * state back when the breakpoint stops applying (and on disposal); an open
     * overlay panel, responsive or `presentation: "overlay"`, closes on Escape
     * or a press that starts and ends outside it. A panel that opens as an
     * overlay takes focus on its first focusable control, and while it is open
     * Tab and Shift+Tab cycle through its controls instead of reaching the
     * work area it covers (the ARIA dialog pattern of `wireSidebar`'s compact
     * overlay); inline panels never move focus. Focus stranded in a closing
     * panel — however it closed, the app's own control inside it included —
     * returns to the control that had it when the panel opened, else to the
     * panel's restore control, else to a control outside the panel whose
     * `aria-controls` names it (each panel's `id` is its region id, e.g.
     * `studio-left-rail`) — the fallback for a panel already open at wire-up.
     * An opener inside a panel that has closed since is skipped. `false` leaves
     * every `collapsed` write and all focus handling to the app.
     */
    dismissOverlays?: boolean;
    /**
     * Keep overlays exclusive (default `true`), like `wireSidebar`'s
     * `exclusiveCompact`: when a panel opens while it presents as an overlay,
     * every other open overlay panel — rails and the bottom drawer alike —
     * closes, so one overlay never covers another's controls. Panels presenting
     * inline are never closed by it. Applies only with `dismissOverlays`.
     */
    exclusiveOverlays?: boolean;
}
/**
 * Wire a `Workbench`'s panels. For `resizable` panels given a `size` signal:
 * pointer drags and arrow / Shift+arrow / Home / End on each panel's
 * separator, clamped to the panel's limits and to the room that leaves the
 * work area its minimum width and height, committed to the app-owned size signals.
 * Optional persistence loads and saves each size; optional `deviceClass`
 * suspends resizing on compact classes. Collapse stays the app's `collapsed`
 * flag and never changes a size. For panels given a `collapsed` signal,
 * overlays are transient (`dismissOverlays`): a responsive overlay starts
 * collapsed, an open overlay takes focus and keeps Tab inside it, it closes
 * on Escape or an outside press, and
 * opening one overlay closes the others (`exclusiveOverlays`). Returns a disposer. See `docs/23-app-layouts.md` §3.3.
 */
declare function wireWorkbench(root: HTMLElement, { id, panels, deviceClass, storage, step, largeStep, onResize, dismissOverlays, exclusiveOverlays, }: WireWorkbenchOptions): () => void;

export { type WireWorkbenchOptions, type WireWorkbenchPanel, type WorkbenchPanelKey, type WorkbenchResize, type WorkbenchStorage, wireWorkbench };
```

## `@kerfjs/ui/collapsible-panel`

```ts
import { SafeHtml } from 'kerfjs';
import { PaneConfig } from './pane.js';
import { P as PanelSide, a as PanelToolbar, b as PanelToggle } from './panel-toolbar-DqwtBxQL.js';
export { c as collapsiblePanelToggleIcon } from './panel-toolbar-DqwtBxQL.js';
import { ResizableRegionSeparator, ResizableRegionCollapseMotion, ResizableRegionContentOverflow, ResizableRegionPresentation, ResizableRegionRestorePosition } from './resizable-region.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import './lucide-icon.js';
import 'lucide';
import './toolbar.js';
import './sides-BPSWde0A.js';
import './css-values.js';

/** Which edge a {@link CollapsiblePanel} docks to. */
type CollapsiblePanelSide = PanelSide;
/** The standard toggle a panel toolbar renders (see {@link CollapsiblePanelToolbar}). */
type CollapsiblePanelToolbarToggle = PanelToggle;
/**
 * A panel's composed top toolbar. Its groups occupy `leading`, `center`, and
 * `trailing` while open; groups marked `relocateOnCollapse` and the standard
 * toggle move to the work-area toolbar through
 * {@link CollapsiblePanelRelocated} while it is collapsed.
 */
type CollapsiblePanelToolbar = PanelToolbar;
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
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A standard collapse/expand toggle button for a {@link CollapsiblePanel}: the
 * recognizable per-side icon (see {@link collapsiblePanelToggleIcon}) plus the
 * `data-action` / `aria-expanded` `wireSidebar` reads. Placement is the app's —
 * put it in the panel's own header (to collapse) and somewhere always-visible
 * (to expand while collapsed).
 */
declare function CollapsiblePanelToggle({ side, collapsed, action, panelId, label, className, slot, }: CollapsiblePanelToggleProps): SafeHtml;
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
    children?: KerfUiContent;
    /**
     * The panel's top toolbar, composed so its groups follow the panel's open
     * state. With it, `children` renders in a `Pane` below the toolbar; render
     * {@link CollapsiblePanelRelocated} in the app's work-area toolbar so the
     * marked groups and toggle stay reachable while the panel is collapsed.
     */
    toolbar?: CollapsiblePanelToolbar;
    /** Optional bottom toolbar under a `toolbar` panel's content. */
    footer?: KerfUiContent;
    /**
     * Configuration for a `toolbar` panel's `Pane` (`contentElement`,
     * `contentLabel`, `separators`, `safeAreaEdges`, `chromeDividers`) — for example
     * `{ contentElement: 'nav', contentLabel: 'Sections' }` for a navigation
     * rail. Omitted or `undefined` fields keep the `Pane` defaults. Ignored
     * without a `toolbar`, where `children` renders as given.
     */
    pane?: PaneConfig;
    separator?: ResizableRegionSeparator;
    collapseMotion?: ResizableRegionCollapseMotion;
    contentOverflow?: ResizableRegionContentOverflow;
    presentation?: ResizableRegionPresentation;
    /** Control shown while collapsed, in a safe-area-aware corner of the panel's container (not the viewport). */
    restoreControl?: SafeHtml;
    restorePosition?: ResizableRegionRestorePosition;
    className?: string;
}
/**
 * A standalone collapsible side rail or bottom drawer, outside the full
 * {@link Workbench} shell. It owns only the presentation: a fixed-size content
 * area that stays laid out while the panel's track snaps to zero and the content
 * slides out via `transform` (one reflow, composited — the same technique
 * `Workbench` and the catalog sidebar use). Bottom-drawer content stays anchored
 * to the panel's fixed bottom edge, so the track cannot move its layout origin
 * underneath the transform transition. A collapsed panel renders `inert` (with
 * `aria-hidden`), so neither Tab, pointer, nor assistive technology reaches
 * content that has slid out of view; its `restoreControl` renders outside the
 * panel and stays reachable.
 * The app owns the `collapsed` signal;
 * pair it with `wireSidebar` for the toggle, focus, compact-overlay, keyboard,
 * and persistence semantics, and with `CollapsiblePanelToggle` for the standard
 * affordance. See `ui/docs/collapsible-panel.md` and `docs/23-app-layouts.md`.
 */
declare function CollapsiblePanel({ id, side, collapsed, size, label, children, toolbar, footer, pane, separator, collapseMotion, contentOverflow, presentation, restoreControl, restorePosition, className, }: CollapsiblePanelProps): SafeHtml;
interface CollapsiblePanelRelocatedProps {
    /** The panel's `id`. */
    panelId: string;
    side: CollapsiblePanelSide;
    /** The panel's current collapsed state. */
    collapsed: boolean;
    /** The same `toolbar` the panel receives. */
    toolbar: CollapsiblePanelToolbar;
}
/**
 * A collapsed {@link CollapsiblePanel}'s marked groups and standard
 * toggle, for the app's work-area toolbar — nothing while the panel is open.
 * Put it first in the leading zone for a left rail, last in the trailing zone
 * for a right rail, and last in a bottom toolbar (or a `FloatingToolbar`
 * `restoreControl`) for a bottom drawer. `wireSidebar` hands focus to it when
 * the panel closes from its own toggle.
 */
declare function CollapsiblePanelRelocated({ panelId, side, collapsed, toolbar, }: CollapsiblePanelRelocatedProps): SafeHtml;

export { CollapsiblePanel, type CollapsiblePanelProps, CollapsiblePanelRelocated, type CollapsiblePanelRelocatedProps, type CollapsiblePanelSide, CollapsiblePanelToggle, type CollapsiblePanelToggleProps, type CollapsiblePanelToolbar, type CollapsiblePanelToolbarToggle };
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
    /** When set, the panel's inline collapsed state is loaded from and saved to
     *  `storage` under this key (a persistence hook), so the panel remembers the
     *  user's inline choice. A compact overlay's open/closed state is transient
     *  and is never persisted. */
    storageKey?: string;
    /** The panel's inline (non-compact) collapsed state when `storage` holds no
     *  choice for it; wire-up seeds the signal with it. Defaults to the signal's
     *  own value. Set it when the app seeds the signal from the device class
     *  (`signal(device.value.compact)`) so a compact first render already starts
     *  collapsed while a later crossing to a wide class still restores this
     *  inline default. */
    inlineCollapsed?: boolean;
}
interface WireSidebarOptions {
    panels: readonly WireSidebarPanel[];
    /**
     * When provided, the sidebar adopts a compact **overlay** presentation while
     * `deviceClass.compact` is true: an open panel floats over the content with a
     * dismissable backdrop, Escape and backdrop-click collapse it, and focus is
     * trapped within the open panel (the ARIA dialog pattern). Without it the panel
     * is always inline.
     *
     * An overlay is transient and user-initiated: whenever the compact overlay
     * presentation begins (wire-up on a compact device, or a crossing from a wide
     * class), every panel starts collapsed so nothing blocks the page until the
     * user opens it. The inline state is remembered and restored when the device
     * crosses back to a wide class (and on disposal).
     */
    deviceClass?: ReadonlySignal<DeviceClass>;
    /** Compact devices either overlay the panels (default) or hide them in favor
     *  of an application-owned responsive replacement. */
    compactPresentation?: 'overlay' | 'hidden';
    /** Collapse the other panels when one opens in compact overlay mode. */
    exclusiveCompact?: boolean;
    /** Persistence store (default `globalThis.localStorage`, if present). */
    storage?: SidebarStorage;
}
/**
 * The reusable sidebar-semantics layer for {@link CollapsiblePanel}s: toggle
 * delegation with focus restore, focus-into on open, an optional compact overlay
 * (backdrop + Escape + focus trap) driven by {@link deviceClass}, and an optional
 * persistence hook. The app owns each `collapsed` signal and the layout; this wire
 * owns the interaction. Returns a disposer. See `ui/docs/collapsible-panel.md` and `docs/23-app-layouts.md`.
 */
declare function wireSidebar(root: HTMLElement, { panels, deviceClass, compactPresentation, exclusiveCompact, storage, }: WireSidebarOptions): () => void;

export { type SidebarStorage, type WireSidebarOptions, type WireSidebarPanel, wireSidebar };
```

## `@kerfjs/ui/tab-scaffold`

```ts
import { SafeHtml } from 'kerfjs';
import { PaneAppearance } from './pane.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

interface TabScaffoldTabBase<Id extends string> {
    id: Id;
    label: string;
    /** Decorative icon shown above the label in the bottom bar. */
    icon?: SafeHtml;
    /** The tab's content — typically a `NavStack` so each tab keeps its own stack. */
    content: KerfUiContent;
    /** Background of this scene's scrolling work surface. */
    appearance?: PaneAppearance;
}
/** A tab with an optional count or short-status badge. */
interface TabScaffoldTabCountBadge {
    /**
     * Optional count or short status shown as a solid danger `Badge` at the
     * top-trailing corner of the tab icon (the iOS tab-bar badge). Omitted, `''`,
     * or non-finite numbers render no badge. The visual badge is `aria-hidden`;
     * its meaning reaches assistive technology through `badgeLabel`.
     *
     * Pass `true` instead for the text-free dot (new content without a count).
     */
    badge?: string | number;
    /**
     * Localized phrase folded into the tab's accessible name as
     * `"<label>, <badgeLabel>"` (for example `"3 unread"` → `"Inbox, 3 unread"`).
     * Defaults to the badge text itself. Ignored when no badge renders.
     */
    badgeLabel?: string;
}
/** A tab with the text-free dot badge (new content without a count). */
interface TabScaffoldTabDotBadge {
    /**
     * `true` shows a solid danger dot `Badge` at the top-trailing corner of the
     * tab icon — the iOS tab-bar dot for new content without a count.
     */
    badge: true;
    /**
     * Required localized phrase folded into the tab's accessible name as
     * `"<label>, <badgeLabel>"` (for example `"New activity"` →
     * `"Feed, New activity"`). A dot has no text, so this is its only meaning.
     */
    badgeLabel: string;
}
/** One bottom-bar destination: its label, optional icon and badge, and content. */
type TabScaffoldTab<Id extends string = string> = TabScaffoldTabBase<Id> & (TabScaffoldTabCountBadge | TabScaffoldTabDotBadge);
interface TabScaffoldProps<Id extends string = string> {
    id: string;
    /** Accessible name for the tab bar. */
    label: string;
    tabs: readonly TabScaffoldTab<Id>[];
    /** The controlled active tab id (the app owns selection). */
    active: NoInfer<Id>;
    /**
     * The line over the tab bar, where it meets the active scene. `scroll`
     * (default) shows it only while more of the scene's content lies below —
     * never at the scroll end or when the content fits — once
     * `wireScrollDividers` (`@kerfjs/ui/wire-scroll-dividers`) is wired above
     * the scaffold; unwired, it does not show. `always` shows it without the
     * wiring; `none` never, even when wired. The line is the bar's own 1px top
     * border, so no state moves the bar or a tab.
     */
    chromeDividers?: 'scroll' | 'always' | 'none';
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A mobile-first, iOS-like bottom tab scaffold: a bottom tab bar that switches
 * between major sections, each tab keeping its own content (usually a `NavStack`)
 * mounted so its stack and scroll survive a switch. Controlled — the app owns
 * `active`; wire selection with `@kerfjs/ui/wire-tab-scaffold`'s `wireTabScaffold`.
 * On larger classes, promote the tabs to a `Workbench` rail or sidebar instead of
 * a bottom bar. See `docs/23-app-layouts.md` §3.4.
 */
declare function TabScaffold<Id extends string>({ id, label, tabs, active, chromeDividers, className, slot, }: TabScaffoldProps<Id>): SafeHtml;

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
import { CssLength } from './css-values.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type ResizableRegionAxis = 'horizontal' | 'vertical';
type ResizableRegionEdge = 'start' | 'end';
type ResizableRegionSeparator = 'auto' | 'hidden';
type ResizableRegionCollapseMotion = 'none' | 'slide' | 'fade-slide';
type ResizableRegionContentOverflow = 'clip' | 'auto' | 'visible';
type ResizableRegionPresentation = 'inline' | 'overlay' | 'hidden';
type ResizableRegionRestorePosition = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
type ResizableRegionResponsiveFillAt = 'compact' | 'narrow';
interface ResizableRegionProps {
    id: string;
    label: string;
    size: number;
    min: number;
    max: number;
    axis?: ResizableRegionAxis;
    edge?: ResizableRegionEdge;
    /** Snap the track to zero. The region renders `inert` and `aria-hidden`
     * while collapsed, so neither Tab nor assistive technology reaches it or
     * lands on an empty landmark; `restoreControl` renders outside the region. */
    collapsed?: boolean;
    transitioning?: boolean;
    /** Whether the separator line is painted. The resize hit target remains available. */
    separator?: ResizableRegionSeparator;
    /** Keep the track change instant while optionally sliding the fixed-size content. */
    collapseMotion?: ResizableRegionCollapseMotion;
    /** Use `visible` while an anchored popup must escape the content box; it raises the region to the popup layer. */
    contentOverflow?: ResizableRegionContentOverflow;
    /** Inline layout, an edge overlay, or a responsive replacement that removes the region. */
    presentation?: ResizableRegionPresentation;
    /** Always-available control rendered while collapsed, outside the clipped region. */
    restoreControl?: SafeHtml;
    /** Safe-area-aware corner of the region's container (not the viewport) for `restoreControl`. */
    restorePosition?: ResizableRegionRestorePosition;
    /** Position a restore control in its container corner or leave it in normal flow. */
    restorePlacement?: 'corner' | 'inline';
    /** Corner distance before the container's safe-area inset. */
    restoreInset?: CssLength;
    /** Fill the available inline track and hide the separator below a container breakpoint. */
    responsiveFillAt?: ResizableRegionResponsiveFillAt;
    /** Decorative dormant content for the separator handle. Must not contain interactive descendants. */
    handleIcon?: SafeHtml;
    children: KerfUiContent;
}
declare const clampRegionSize: (size: number, min: number, max: number) => number;
declare const resizeRegionFromPointer: (startSize: number, delta: number, edge: ResizableRegionEdge) => number;
declare function ResizableRegion({ id, label, size, min, max, axis, edge, collapsed, transitioning, separator, collapseMotion, contentOverflow, presentation, restoreControl, restorePosition, restorePlacement, restoreInset, responsiveFillAt, handleIcon, children, }: ResizableRegionProps): SafeHtml;

export { ResizableRegion, type ResizableRegionAxis, type ResizableRegionCollapseMotion, type ResizableRegionContentOverflow, type ResizableRegionEdge, type ResizableRegionPresentation, type ResizableRegionProps, type ResizableRegionResponsiveFillAt, type ResizableRegionRestorePosition, type ResizableRegionSeparator, clampRegionSize, resizeRegionFromPointer };
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
declare function wireResizableRegions(root: HTMLElement, options: WireResizableRegionsOptions): () => void;

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
import * as kerfjs from 'kerfjs';
import { SafeHtml } from 'kerfjs';
import { a as CatalogProps } from './types-BuHELdXR.js';
export { b as CatalogBrand, c as CatalogEntry, d as CatalogRelated, C as CatalogResource, e as CatalogSecondaryGroup, f as CatalogSection, g as CatalogStageRootAttributes } from './types-BuHELdXR.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import './toolbar.js';
import './pane.js';
import './sides-BPSWde0A.js';
import './workbench.js';
import './list.js';
import './css-values.js';
import './flex-alignment-4ms8ZbV8.js';
import './resizable-region.js';
import './panel-toolbar-DqwtBxQL.js';
import './lucide-icon.js';
import 'lucide';

/**
 * Controlled, stateless component-catalog shell: a `Workbench` whose left rail
 * is the catalog navigation and whose work area is the active entry — its
 * toolbar, description, preview stage, and resource footer. The sidebar's
 * standard toggle moves into the entry toolbar while it is collapsed, and on
 * a small screen the sidebar overlays the stage like any Workbench rail.
 */
declare function Catalog({ id, brand, sections, active, content, collapsed, theme, headerActions, secondarySections, sidebarFooter, status, geometryOverlay, stageRootAttributes, selectAction, toggleSidebarAction, toggleThemeAction, toggleSecondaryAction, headerPlacement, footerPlacement, sidebar, mainToolbar, footerToolbar, className, slot, }: CatalogProps): kerfjs.SafeHtml;

/** How a specimen aligns its visible edge with its `ListHeader` label. */
type CatalogExampleAlign = 'glyph' | 'inline-control' | 'none';
interface CatalogExampleViewport {
    layout?: 'grid' | 'flex' | 'flex-column';
    width?: 'full' | 'compact' | 'medium' | 'wide' | 'text' | 'control';
    /** Fixed specimen height; `app` frames an application-sized recipe or layout.
     *  A fixed height is definite, so a child that fills with `height: 100%`
     *  (a horizontal `ResizableRegion`, say) spans the whole frame. */
    height?: 'short' | 'reduced' | 'medium' | 'tall' | 'app';
    /** A minimum the frame may grow past. It is not a definite height: a child
     *  sized with `height: 100%` falls back to its content height, so use
     *  `height` when the specimen must fill the frame. */
    minHeight?: 'short' | 'medium';
    frame?: 'solid' | 'dashed';
    surface?: 'default' | 'lowered';
    overflow?: 'hidden' | 'auto-x';
    responsive?: 'roomy-only';
    shadow?: boolean;
    /** Public component custom properties applied to the specimen viewport. */
    tokens?: Readonly<Record<`--${string}`, string>>;
}
type CatalogExampleRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-catalog-example'?: never;
    'data-catalog-example-stack'?: never;
    'data-catalog-example-label'?: never;
    'data-catalog-example-note'?: never;
    'data-align'?: never;
}>;
interface CatalogExampleProps {
    label?: string;
    note?: SafeHtml | string;
    align?: CatalogExampleAlign;
    /** Optional catalog-owned constraints for demonstrating layout components. */
    viewport?: CatalogExampleViewport;
    /** Replacement guidance shown when a roomy-only viewport is hidden. */
    compactFallback?: SafeHtml | string;
    rootAttributes?: CatalogExampleRootAttributes;
    className?: string;
    children?: KerfUiContent;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** A labeled catalog specimen with optional explanatory text and alignment. */
declare function CatalogExample({ label, note, align, viewport, compactFallback, rootAttributes, className, children, slot, }: CatalogExampleProps): SafeHtml;

type CatalogExampleStackRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-catalog-example'?: never;
    'data-catalog-example-stack'?: never;
    'data-catalog-example-label'?: never;
    'data-catalog-example-note'?: never;
    'data-align'?: never;
}>;
interface CatalogExampleStackProps {
    label?: string;
    rootAttributes?: CatalogExampleStackRootAttributes;
    className?: string;
    children?: KerfUiContent;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** A vertically stacked group of catalog examples. */
declare function CatalogExampleStack({ label, rootAttributes, className, children, slot, }: CatalogExampleStackProps): kerfjs.SafeHtml;

export { Catalog, CatalogExample, type CatalogExampleAlign, type CatalogExampleProps, CatalogExampleStack, type CatalogExampleStackProps, type CatalogExampleViewport, CatalogProps };
```

## `@kerfjs/ui/catalog-resources`

```ts
import { C as CatalogResource } from './types-BuHELdXR.js';
import './semantic-content-BbzjvSu9.js';
import 'kerfjs';
import './toolbar.js';
import './pane.js';
import './sides-BPSWde0A.js';
import './workbench.js';
import './list.js';
import './css-values.js';
import './flex-alignment-4ms8ZbV8.js';
import './resizable-region.js';
import './panel-toolbar-DqwtBxQL.js';
import './lucide-icon.js';
import 'lucide';

/**
 * Standard resource labels for a Kerf catalog detail footer. Keep these labels
 * stable across catalogs so people and AI-generated integrations see the same
 * choices in the same vocabulary.
 */
type CatalogResourceKind = 'demoSource' | 'componentSource' | 'designTemplate' | 'guidance' | 'integrationGuidance';
type CatalogGuidanceKind = 'guidance' | 'integrationGuidance';
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
    guidanceKind?: CatalogGuidanceKind;
}
/**
 * Build the standard catalog resource group in its canonical order: demo,
 * component, optional design template, then guidance.
 */
declare function catalogResources(input: CatalogResourcesInput): CatalogResource[];

export { type CatalogGuidanceKind, type CatalogResourceKind, type CatalogResourceTarget, type CatalogResourcesInput, catalogResources };
```

## `@kerfjs/ui/wire-catalog`

```ts
import { Signal } from 'kerfjs';

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
    /**
     * The sidebar's app-owned collapsed flag. With it, the catalog's Workbench
     * sidebar is wired like any Workbench rail: it becomes a transient overlay
     * on a small screen (collapsed as the breakpoint applies, closed on Escape
     * or a press outside, focus handed back), and choosing an entry from the
     * open overlay closes it.
     */
    collapsed?: Signal<boolean>;
    /**
     * The app-owned sidebar width signal for a Catalog rendered with
     * `sidebar={{ resizable: true, size: sidebarSize.value }}`. Each committed
     * drag or keyboard resize is written to it.
     */
    sidebarSize?: Signal<number>;
    /**
     * With `sidebarSize`, load and save the width under this storage key so the
     * catalog remembers the user's sidebar width.
     */
    sidebarStorageKey?: string;
    /** The Catalog's `id`, when it is not the default `kui-catalog`. */
    id?: string;
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
 * Specimens receive computed border highlights (or a dashed bound when they
 * have no border and are transparent), while positive computed margins use
 * devtools-style orange bands. CSS/stylesheet-only changes are observed too.
 * Returns a disposer.
 */
declare function wireCatalogGeometryOverlay(root: HTMLElement): () => void;
/**
 * Wire a {@link Catalog}'s interactions with one delegated listener set: sidebar
 * item selection (and the related-entry popup menu), the sidebar collapse toggle, and
 * the theme toggle. The app owns the `active`/`collapsed`/`theme` signals and updates
 * them in the callbacks; optionally mirror the active id into the URL via `urlParam`.
 * It also wires the scroll dividers below root (`wireScrollDividers`), so the
 * catalog's panes and every example in it show their chrome dividers only
 * while scrolled. Returns a disposer.
 */
declare function wireCatalog(root: HTMLElement, { onSelect, onToggleSidebar, onToggleTheme, onToggleSecondary, urlParam, revealSelection, selectAction, toggleSidebarAction, toggleThemeAction, toggleSecondaryAction, collapsed, sidebarSize, sidebarStorageKey, id: catalogId, }: WireCatalogOptions): () => void;

export { type CatalogRevealOptions, type WireCatalogOptions, revealCatalogEntry, wireCatalog, wireCatalogGeometryOverlay };
```

## `@kerfjs/ui/segmented-control`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type SegmentedControlAppearance = 'filled' | 'outlined' | 'toolbar';
type SegmentedControlShape = 'rounded' | 'pill';
type SegmentedControlSize = 'small' | 'default';
type SegmentedControlLayout = 'content' | 'equal';
interface SegmentedControlChoice<Value extends string = string> {
    value: Value;
    label: string;
    content?: KerfUiContent;
    title?: string;
    disabled?: boolean;
}
interface SegmentedControlProps<Value extends string = string> {
    id: string;
    label: string;
    value: NoInfer<Value>;
    choices: readonly SegmentedControlChoice<Value>[];
    action?: string;
    appearance?: SegmentedControlAppearance;
    shape?: SegmentedControlShape;
    size?: SegmentedControlSize;
    layout?: SegmentedControlLayout;
    className?: string;
    /** Render as a loading placeholder: every choice keeps its live label or icon, none is selected, and every segment is disabled. */
    placeholder?: boolean;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function SegmentedControl<Value extends string>({ id, label, value, choices, action, appearance, shape, size, layout, className, placeholder, slot, }: SegmentedControlProps<Value>): kerfjs.SafeHtml;

export { SegmentedControl, type SegmentedControlAppearance, type SegmentedControlChoice, type SegmentedControlLayout, type SegmentedControlProps, type SegmentedControlShape, type SegmentedControlSize };
```

## `@kerfjs/ui/select`

```ts
import { SafeHtml } from 'kerfjs';
import { CssForegroundColor } from './css-values.js';
import { LucideNode } from './lucide-icon.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import 'lucide';

interface SelectChoice<Value extends string = string> {
    value: Value;
    label: string;
    icon?: LucideNode;
    iconName?: string;
    /**
     * Foreground color for the optional icon: a semantic foreground token such
     * as `uiColor('success-on-quiet')`, or an application-owned
     * `foregroundColorVar('--app-icon-color')`. Fill tokens such as
     * `uiColor('success-fill-quiet')` are pale background tints and do not
     * type-check.
     */
    color?: CssForegroundColor;
    group?: string;
    /** Keep an unavailable choice visible but prevent selection. */
    disabled?: boolean;
    /** Optional explanation exposed as the disabled option's native tooltip. */
    disabledReason?: string;
    /**
     * Draw a divider between this choice and the previous choice in the same
     * list. A group boundary is already a separator, so the first choice of a
     * group (or of the whole menu) never draws a second one.
     */
    separatorBefore?: boolean;
}
type SelectAccessibleName = {
    label: string;
    ariaLabel?: string;
} | {
    label?: never;
    ariaLabel: string;
};
type SelectPresentation = 'form' | 'toolbar-borderless' | 'navigation';
type SelectSize = 'default' | 'compact';
type SelectSelectedPresentation = 'label' | 'icon-only';
type SelectFocusRingOwner = 'select' | 'group';
type SelectTriggerWidth = 'fit-content' | 'max-content' | 'fill';
interface SelectBaseProps<Value extends string = string> {
    name: string;
    choices: readonly SelectChoice<Value>[];
    className?: string;
    /** Empty-value hint text shown in the closed control (the native select placeholder). */
    placeholderText?: string;
    /** Supporting text shown below the control and associated with its combobox. */
    hint?: string;
    disabled?: boolean;
    fitMenu?: boolean;
    /** Render as an unanimated loading skeleton: the label above a static, empty control box. */
    placeholder?: boolean;
    /** Form (default), borderless toolbar, or intrinsic navigation chrome. */
    presentation?: SelectPresentation;
    size?: SelectSize;
    /** Closed trigger width; omit to keep the presentation's default. */
    triggerWidth?: SelectTriggerWidth;
    /** Show the disclosure caret (default); omit it for a compact icon-only trigger. */
    caret?: boolean;
    /** Let an enclosing ToolbarControlGroup paint the composed focus ring. */
    focusRingOwner?: SelectFocusRingOwner;
    /** Maximum closed-control label width in CSS pixels before ellipsis. */
    labelMaxWidth?: number;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** One chosen value (the default). */
interface SelectSingleValueProps<Value extends string = string> {
    multiple?: false;
    value: NoInfer<Value>;
    renderSelected?: (choice: SelectChoice<Value>) => SafeHtml;
    /** Show only the selected choice icon while retaining the Select's accessible name. */
    selectedPresentation?: SelectSelectedPresentation;
    triggerIcon?: never;
    selectAllLabel?: never;
    clearLabel?: never;
}
/**
 * Any number of chosen values. The popup stays open while the person toggles
 * choices and closes on an outside click, Escape, or focus leaving; the closed
 * control summarizes the chosen labels in choice order.
 */
interface SelectMultipleLabelProps<Value extends string = string> {
    multiple: true;
    value: readonly NoInfer<Value>[];
    renderSelected?: never;
    selectedPresentation?: 'label';
    triggerIcon?: never;
    /** Opt in to a footer action that selects every enabled choice. */
    selectAllLabel?: string;
    /** Opt in to a footer action that clears the current selection. */
    clearLabel?: string;
}
/**
 * A multiple Select drawn as an icon-only toolbar trigger, such as a
 * "Filter by label" funnel. No single choice is selected, so the trigger shows
 * a fixed `triggerIcon` naming the menu's purpose; while any choice is chosen
 * a count badge sits beside it, and the combobox's accessible name ends with
 * the chosen labels in choice order.
 */
interface SelectMultipleIconProps<Value extends string = string> {
    multiple: true;
    value: readonly NoInfer<Value>[];
    renderSelected?: never;
    selectedPresentation: 'icon-only';
    /**
     * The trigger's fixed icon, typically a `LucideIcon` naming the menu's
     * purpose (a funnel for a filter), independent of the selection.
     */
    triggerIcon: KerfUiContent;
    /** Opt in to a footer action that selects every enabled choice. */
    selectAllLabel?: string;
    /** Opt in to a footer action that clears the current selection. */
    clearLabel?: string;
}
type SelectMultipleValueProps<Value extends string = string> = SelectMultipleLabelProps<Value> | SelectMultipleIconProps<Value>;
type SelectProps<Value extends string = string> = SelectBaseProps<Value> & SelectAccessibleName & (SelectSingleValueProps<Value> | SelectMultipleValueProps<Value>);
declare function Select<Value extends string>(props: SelectProps<Value>): SafeHtml;

export { Select, type SelectChoice, type SelectFocusRingOwner, type SelectMultipleIconProps, type SelectMultipleLabelProps, type SelectMultipleValueProps, type SelectPresentation, type SelectProps, type SelectSelectedPresentation, type SelectSingleValueProps, type SelectSize, type SelectTriggerWidth };
```

## `@kerfjs/ui/state-banner`

```ts
import { SafeHtml } from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type StateBannerTone = 'neutral' | 'info' | 'pop' | 'success' | 'warning' | 'danger';
type StateBannerUrgency = 'status' | 'alert';
type StateBannerCopyLayout = 'inline' | 'stacked';
type StateBannerActionPlacement = 'trailing' | 'below';
interface StateBannerProps {
    title: string;
    detail?: string;
    /** Optional compact status or count shown beside the title. */
    badge?: string;
    icon?: SafeHtml;
    action?: KerfUiContent;
    tone?: StateBannerTone;
    urgency?: StateBannerUrgency;
    /** Keep the detail beside the title, or give it its own line. */
    copyLayout?: StateBannerCopyLayout;
    /** Place the action beside the copy or on a separate trailing row. */
    actionPlacement?: StateBannerActionPlacement;
    className?: string;
    /** Render the title, badge, and detail as unanimated loading skeletons, keeping the icon and tone. The detail line appears only when `detail` is set, as in the live banner. */
    placeholder?: boolean;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function StateBanner({ title, detail, badge, icon, action, tone, urgency, copyLayout, actionPlacement, className, placeholder, slot, }: StateBannerProps): SafeHtml;

export { StateBanner, type StateBannerActionPlacement, type StateBannerCopyLayout, type StateBannerProps, type StateBannerTone, type StateBannerUrgency };
```

## `@kerfjs/ui/empty-state`

```ts
import { SafeHtml } from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

interface EmptyStateProps {
    title: string;
    detail?: string;
    icon?: SafeHtml;
    action?: KerfUiContent;
    busy?: boolean;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function EmptyState({ title, detail, icon, action, busy, className, slot, }: EmptyStateProps): SafeHtml;

export { EmptyState, type EmptyStateProps };
```

## `@kerfjs/ui/loading-spinner`

```ts
import * as kerfjs from 'kerfjs';

interface LoadingSpinnerProps {
    className?: string;
    label?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** Stable viewBox-centered progress ring based on svg-spinners' MIT-licensed 180-ring. */
declare function LoadingSpinner({ className, label, slot, }: LoadingSpinnerProps): kerfjs.SafeHtml;

export { LoadingSpinner, type LoadingSpinnerProps };
```

## `@kerfjs/ui/skeleton`

```ts
import * as kerfjs from 'kerfjs';
import { CssSize, CssLength } from './css-values.js';

interface SkeletonProps {
    /** Typed width or intrinsic sizing keyword. Defaults to filling its slot. */
    width?: CssSize;
    /** Typed height or intrinsic sizing keyword. Defaults to a single text line. */
    height?: CssSize;
    /** Typed corner-radius override. Defaults to the small radius token. */
    radius?: CssLength;
    /** Render this many stacked lines (the last one shorter), for multi-line text. */
    lines?: number;
    /** Lay the block out as `display: block` instead of the default
     *  `inline-block`, so it takes no text line of its own: no baseline gap
     *  below it, and it centers like an icon in a slot. Defaults to `false`. */
    block?: boolean;
    /** Accessible label. Omit to keep the block decorative (`aria-hidden`). */
    label?: string;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A subtle, deliberately **unanimated** loading placeholder block. Use it for a
 * value slot whose content is not yet known, on its own or via a component's
 * `placeholder` prop. Decorative by default (`aria-hidden`); pass `label` to
 * announce it. Sizes to its slot unless `width`/`height` are given.
 */
declare function Skeleton({ width, height, radius, lines, block, label, className, slot, }: SkeletonProps): kerfjs.SafeHtml;

export { Skeleton, type SkeletonProps };
```

## `@kerfjs/ui/sunken-panel`

```ts
import * as kerfjs from 'kerfjs';
import { CssFlexKeyword, CssFlex } from './css-values.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type SunkenPanelShape = 'rounded' | 'square';
interface SunkenPanelProps {
    children?: KerfUiContent;
    /** Optional accessible landmark name for a distinct application region. */
    ariaLabel?: string;
    /** Corner shape: a rounded rectangle (default) or square corners. */
    shape?: SunkenPanelShape;
    /** Grow or shrink within a flex parent, using Grid's typed flex contract. */
    flex?: boolean | CssFlexKeyword | CssFlex;
    /** Fill a parent with a definite height; use flex inside a flex layout. */
    fill?: boolean;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A lowered application surface with one compact inset and a vertical content
 * stack. The panel owns its background and padding; children own their own
 * borders and internal geometry.
 */
declare function SunkenPanel({ children, ariaLabel, shape, flex, fill, className, slot, }: SunkenPanelProps): kerfjs.SafeHtml;

export { SunkenPanel, type SunkenPanelProps, type SunkenPanelShape };
```

## `@kerfjs/ui/token-search-field`

```ts
import 'kerfjs';
import './semantic-content-BbzjvSu9.js';
export { T as TokenSearchEditorAttributes, a as TokenSearchField, b as TokenSearchFieldProps, c as TokenSearchFieldValue, j as TokenSearchToken, p as placeTokenSearchCaret, r as readTokenSearchField } from './token-search-field-DvgFLhLL.js';
```

## `@kerfjs/ui/wire-token-search-fields`

```ts
import { Signal } from 'kerfjs';
import { d as TokenSearchModel } from './token-search-field-DvgFLhLL.js';
import './semantic-content-BbzjvSu9.js';

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
interface TokenSearchKeyboardBaseOptions {
    /**
     * From a collapsed caret with no selection, Backspace removes the token
     * immediately before it and Delete the token immediately after — reported via
     * `onRemoveToken` — instead of deleting a character. Default: true.
     */
    /**
     * ArrowRight moves the caret past a trailing atomic token so text typed next
     * lands after the chip. Default: true.
     */
    moveCaretPastToken?: boolean;
}
type TokenSearchKeyboardOptions = TokenSearchKeyboardBaseOptions & ({
    removeAdjacentToken?: true;
    /** Apply the reported removal to your controlled state, then re-render. */
    onRemoveToken: (removal: TokenSearchTokenRemoval) => void;
} | {
    removeAdjacentToken: false;
    onRemoveToken?: never;
});
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
    /** Focus the editor on expand/controlled clear and the trigger on Escape-collapse. Default: true. */
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
    /** Optional automatic grammar/suggestion models, keyed by TokenSearchField id. */
    models?: Readonly<Record<string, TokenSearchModel>>;
    onSubmit?: (submission: TokenSearchSubmit) => void;
    /** Fired on every editor `input`, after the browser mutates it, so a caller can drop its own `input` listener. */
    onEdit?: (edit: TokenSearchEdit) => void;
    /** Managed collapsible transient behavior. `true`/omitted = on with defaults; `false` = fully off. */
    collapsible?: boolean | TokenSearchCollapsibleOptions;
    /** Opt-in atomic-chip keyboard behavior (off by default). */
    keyboard?: false | TokenSearchKeyboardOptions;
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
declare function wireTokenSearchFields(root: HTMLElement, { models, onSubmit, onEdit, collapsible, keyboard, }?: WireTokenSearchFieldsOptions): TokenSearchFieldsHandle;

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

## `@kerfjs/ui/badge`

```ts
import { SafeHtml } from 'kerfjs';

type BadgeTone = 'neutral' | 'brand' | 'pop' | 'success' | 'warning' | 'danger';
type BadgeAppearance = 'quiet' | 'solid' | 'outline';
type BadgeShape = 'pill' | 'rounded';
/** Size of a text badge. A text-free dot is the separate `size: 'dot'` form. */
type BadgeSize = 'compact' | 'default';
interface BadgeCommonProps {
    tone?: BadgeTone;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** A badge that shows a short status, count, or category as visible text. */
interface BadgeTextProps extends BadgeCommonProps {
    children: SafeHtml | string | number;
    appearance?: BadgeAppearance;
    shape?: BadgeShape;
    size?: BadgeSize;
    /** Optional accessible name when the visible content is abbreviated. */
    label?: string;
    /** Hide a repeated visual badge from assistive technology. */
    ariaHidden?: boolean;
}
/** A labeled dot, announced as an image with its own accessible name. */
interface BadgeDotLabeled {
    /** Accessible name for the dot, for example `"New activity"`. */
    label: string;
    ariaHidden?: false;
}
/** A decorative dot whose meaning the owning component already announces. */
interface BadgeDotDecorative {
    label?: never;
    ariaHidden: true;
}
/**
 * A text-free status dot (the iOS "new content" dot): a small solid circle in
 * the badge's tone. It has no visible text, so it must either carry its own
 * accessible `label` (exposed as an image) or be `ariaHidden` because the
 * surrounding component already folds its meaning into an accessible name.
 */
type BadgeDotProps = BadgeCommonProps & {
    size: 'dot';
    children?: never;
    appearance?: never;
    shape?: never;
} & (BadgeDotLabeled | BadgeDotDecorative);
type BadgeProps = BadgeTextProps | BadgeDotProps;
/** Compact, non-interactive metadata whose tone, emphasis, and shape are configured by props. */
declare function Badge(props: BadgeProps): SafeHtml;

export { Badge, type BadgeAppearance, type BadgeDotProps, type BadgeProps, type BadgeShape, type BadgeSize, type BadgeTextProps, type BadgeTone };
```

## `@kerfjs/ui/chip`

```ts
import { SafeHtml } from 'kerfjs';
import { BadgeTone, BadgeAppearance, BadgeShape, BadgeSize } from './badge.js';

interface ChipCommonProps {
    /** Decorative leading icon, normally an unsized LucideIcon. */
    icon?: SafeHtml;
    tone?: BadgeTone;
    appearance?: BadgeAppearance;
    shape?: BadgeShape;
    size?: BadgeSize;
    disabled?: boolean;
    /** Record identifier available to an application delegated action handler. */
    itemId?: string;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** A removable chip needs both a delegated action and a specific accessible name. */
type ChipProps = ChipCommonProps & ({
    children: SafeHtml | string | number;
    truncate?: false;
} | {
    children: string;
    truncate: true;
}) & ({
    removeAction: string;
    removeLabel: string;
} | {
    removeAction?: never;
    removeLabel?: never;
});
/** A short label with an optional native remove button. The application owns removal. */
declare function Chip({ children, icon, truncate, tone, appearance, shape, size, disabled, itemId, className, slot, ...remove }: ChipProps): SafeHtml;

export { Chip, type ChipProps };
```

## `@kerfjs/ui/lucide-icon`

```ts
import * as kerfjs from 'kerfjs';
import { IconNode } from 'lucide';

type LucideNode = IconNode;
type LucideIconSize = 'xs' | 's' | 'm' | 'l' | 'xl' | number;
interface LucideIconProps {
    icon: LucideNode;
    name: string;
    className?: string;
    label?: string;
    /** Named icon scale or positive pixel size, converted to rem. Omit for 1em. */
    size?: LucideIconSize;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** Render a Lucide-compatible icon node without copying icon SVG strings. */
declare function LucideIcon({ icon, name, className, label, size, slot, }: LucideIconProps): kerfjs.SafeHtml;

export { LucideIcon, type LucideIconProps, type LucideIconSize, type LucideNode };
```

## `@kerfjs/ui/surface-scaffold`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type DialogSurfaceSize = 'small' | 'medium' | 'large';
type DialogSurfacePresentation = 'modal' | 'side-sheet' | 'fullscreen';
type SurfaceInset = 'none' | 'compact' | 'comfortable';
interface DialogSurfaceProps {
    children: KerfUiContent;
    size?: DialogSurfaceSize;
    presentation?: DialogSurfacePresentation;
    bodyInset?: SurfaceInset;
    footerInset?: SurfaceInset;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** Configure recurring Web Awesome dialog geometry without consumer ::part() CSS. */
declare function DialogSurface({ children, size, presentation, bodyInset, footerInset, className, slot, }: DialogSurfaceProps): kerfjs.SafeHtml;
type PopupSurfaceInset = 'standard' | 'compact' | 'list-zero';
interface PopupSurfaceProps {
    children: KerfUiContent;
    inset?: PopupSurfaceInset;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** Configure recurring Web Awesome dropdown-menu geometry without consumer ::part() CSS. */
declare function PopupSurface({ children, inset, className, slot, }: PopupSurfaceProps): kerfjs.SafeHtml;

export { DialogSurface, type DialogSurfacePresentation, type DialogSurfaceProps, type DialogSurfaceSize, PopupSurface, type PopupSurfaceInset, type PopupSurfaceProps, type SurfaceInset };
```

## `@kerfjs/ui/text`

```ts
import * as kerfjs from 'kerfjs';
import { KerfBaseAttrs } from 'kerfjs/jsx-runtime';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
type TextTone = 'default' | 'quiet' | 'danger';
type TextSize = 'compact' | 'default' | 'large' | 'xlarge';
type TextFont = 'default' | 'monospace';
type TextBorder = 'transparent' | 'none';
type TextLineHeight = 'default' | 'tight';
type TextWrap = 'normal' | 'anywhere' | 'nowrap' | 'truncate';
type TextContent = KerfUiContent | string | number | readonly TextContent[];
type TextCommonProps = Omit<KerfBaseAttrs, 'children' | 'class' | 'className'> & {
    /** Native heading, paragraph, or inline span element to render. Defaults to `p`. */
    variant?: TextVariant;
    /** Semantic foreground treatment. Defaults to the inherited foreground. */
    tone?: TextTone;
    /** Text sizing independent of the native semantic element. */
    size?: TextSize;
    /** Font family independent of the native semantic element. */
    font?: TextFont;
    /** Transparent alignment border or no border when embedded in owner chrome. */
    border?: TextBorder;
    /** Remove the block variant's item padding and border in compact content. */
    flush?: boolean;
    /** Use compact leading for short dialog or metadata copy. */
    lineHeight?: TextLineHeight;
    children: TextContent;
    class?: string;
    className?: string;
};
type TextProps = TextCommonProps & ({
    /** Wrap normally or break long unbroken strings. Defaults to normal. */
    wrap?: 'normal' | 'anywhere';
    /** Cap wrapped text to this positive number of lines. */
    maxLines?: number;
} | {
    /** Keep one line, with or without an ellipsis. */
    wrap: 'nowrap' | 'truncate';
    maxLines?: never;
});
/**
 * Semantic heading, paragraph, or inline text. Block variants use the standard
 * content-item padding; `span` adds no box geometry.
 * All ordinary native heading/paragraph attributes pass through to the element.
 */
declare function Text({ variant: Variant, tone, size, font, border, flush, lineHeight, wrap, maxLines, children, class: classValue, className, ...attributes }: TextProps): kerfjs.SafeHtml;

export { Text, type TextBorder, type TextContent, type TextFont, type TextLineHeight, type TextProps, type TextSize, type TextTone, type TextVariant, type TextWrap };
```

## `@kerfjs/ui/row`

```ts
import * as kerfjs from 'kerfjs';
import { UiSpaceName, CssLength, CssFlexKeyword, CssFlex } from './css-values.js';
import { H as HorizontalAlignment, V as VerticalAlignment } from './flex-alignment-4ms8ZbV8.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { S as Sides } from './sides-BPSWde0A.js';

type RowRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-h-align'?: never;
    'data-v-align'?: never;
    'data-flex'?: never;
    'data-fill'?: never;
    'data-wrap'?: never;
    'data-text-insets'?: never;
    'data-control-insets'?: never;
}>;
interface RowProps {
    children?: KerfUiContent;
    /** Horizontal distribution. Defaults to left. */
    hAlign?: HorizontalAlignment;
    /** Vertical alignment and wrapped-line distribution. Defaults to full. */
    vAlign?: VerticalAlignment;
    /** A named UI spacing token or typed CSS length. Defaults to xs. */
    gap?: UiSpaceName | CssLength;
    /** Allow this row to grow/shrink, use a keyword, or supply a typed CSS flex shorthand. */
    flex?: boolean | CssFlexKeyword | CssFlex;
    /**
     * Fill the height of a parent with a definite height, such as an app root or
     * a fixed-height frame, when this row is that parent's layout root. Inside a
     * flex layout use `flex` instead. Defaults to false.
     */
    fill?: boolean;
    /** Allow children to wrap onto additional lines. */
    wrap?: boolean;
    /** Physical sides that receive the standard 17px text inset. */
    textInsets?: Sides;
    /** Physical sides that receive the standard 8px control inset. Text insets win on overlap. */
    controlInsets?: Sides;
    className?: string;
    /** Safe `data-*` metadata; Row-owned structural attributes remain protected. */
    rootAttributes?: RowRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** A horizontal flex row with explicit physical-axis alignment and spacing. */
declare function Row({ children, hAlign, vAlign, gap, flex, fill, wrap, textInsets, controlInsets, className, rootAttributes, slot, }: RowProps): kerfjs.SafeHtml;

export { CssFlex, CssFlexKeyword, CssLength, HorizontalAlignment, Row, type RowProps, Sides, UiSpaceName, VerticalAlignment };
```

## `@kerfjs/ui/grid`

```ts
import * as kerfjs from 'kerfjs';
import { UiSpaceName, CssLength, CssFlexKeyword, CssFlex } from './css-values.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type GridRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-columns'?: never;
    'data-min-column-width'?: never;
    'data-flex'?: never;
    'data-fill'?: never;
}>;
interface GridCommonProps {
    children?: KerfUiContent;
    /** A named UI spacing token or typed CSS length. Defaults to xs. */
    gap?: UiSpaceName | CssLength;
    /** Allow this grid to grow/shrink, use a keyword, or supply a typed CSS flex shorthand. */
    flex?: boolean | CssFlexKeyword | CssFlex;
    /**
     * Fill the height of a parent with a definite height, such as an app root or
     * a fixed-height frame, when this grid is that parent's layout root. Inside a
     * flex layout use `flex` instead. Defaults to false.
     */
    fill?: boolean;
    className?: string;
    /** Safe `data-*` metadata; Grid-owned structural attributes remain protected. */
    rootAttributes?: GridRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
type GridProps = GridCommonProps & ({
    /** Number of equal-width columns. Must be a positive safe integer. */
    columns: number;
    minColumnWidth?: never;
} | {
    columns?: never;
    /** Fit equal columns of at least this width; collapse as the container narrows. */
    minColumnWidth: CssLength;
});
/** Render equal tracks with a fixed count or a responsive minimum width. */
declare function Grid({ children, columns, minColumnWidth, gap, flex, fill, className, rootAttributes, slot, }: GridProps): kerfjs.SafeHtml;

export { CssFlex, CssFlexKeyword, CssLength, Grid, type GridProps, UiSpaceName };
```

## `@kerfjs/ui/spacer`

```ts
import * as kerfjs from 'kerfjs';
import { UiSpaceName, CssLength } from './css-values.js';

interface SpacerProps {
    /** Grow and shrink to fill the available space along a parent's flex axis. */
    flex?: boolean;
    /** A named UI spacing token or typed physical width. */
    width?: UiSpaceName | CssLength;
    /** A named UI spacing token or typed physical height. */
    height?: UiSpaceName | CssLength;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** A decorative fixed-size or flexible gap for Row, List, and other flex layouts. */
declare function Spacer({ flex, width, height, className, slot, }: SpacerProps): kerfjs.SafeHtml;

export { CssLength, Spacer, type SpacerProps, UiSpaceName };
```

## `@kerfjs/ui/token-search-model`

```ts
import 'kerfjs';
export { d as TokenSearchModel, e as TokenSearchModelOptions, f as TokenSearchResolvedToken, g as TokenSearchRule, h as TokenSearchState, i as TokenSearchSuggestion, k as createTokenSearchModel } from './token-search-field-DvgFLhLL.js';
import './semantic-content-BbzjvSu9.js';
```
