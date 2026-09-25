# Public API signatures for the UI authoring corpus

Generated from emitted declarations for `@kerfjs/ui@4.4.1` and `kerfjs@4.4.1`. This bounded reference covers only APIs used by the seven-task corpus. It is interface evidence, not an implementation or runtime guarantee.

## `@kerfjs/ui/css-values`

```ts
declare const cssValueBrand: unique symbol;
declare const cssLengthBrand: unique symbol;
declare const cssLengthExpressionBrand: unique symbol;
declare const cssFlexBrand: unique symbol;
declare const cssColorBrand: unique symbol;
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
type CssFlexKeyword = 'none' | 'auto' | 'initial';
type CssFlexBasis = CssLength | 'auto' | 'content' | 'min-content' | 'max-content' | 'fit-content';
type CssSizeKeyword = 'auto' | 'min-content' | 'max-content' | 'fit-content';
/** A complete width/height value accepted by dimension-valued UI props. */
type CssSize = CssLength | CssSizeKeyword;
declare const uiColorNames: readonly ["accent", "accent-text", "border", "border-quiet", "brand-border-loud", "brand-border-normal", "brand-border-quiet", "brand-fill-loud", "brand-fill-normal", "brand-fill-quiet", "brand-on-fill", "brand-on-loud", "brand-on-normal", "brand-on-quiet", "danger", "danger-border-loud", "danger-border-normal", "danger-border-quiet", "danger-fill-loud", "danger-fill-normal", "danger-fill-quiet", "danger-on-loud", "danger-on-normal", "danger-on-quiet", "danger-text", "neutral-border-loud", "neutral-border-normal", "neutral-border-quiet", "neutral-fill-loud", "neutral-fill-normal", "neutral-fill-quiet", "neutral-on-loud", "neutral-on-normal", "neutral-on-quiet", "pop", "pop-border-loud", "pop-border-normal", "pop-border-quiet", "pop-fill-loud", "pop-fill-normal", "pop-fill-quiet", "pop-on-fill", "pop-on-loud", "pop-on-normal", "pop-on-quiet", "pop-text", "success", "success-border-loud", "success-border-normal", "success-border-quiet", "success-fill-loud", "success-fill-normal", "success-fill-quiet", "success-on-fill", "success-on-loud", "success-on-normal", "success-on-quiet", "success-text", "surface", "surface-lowered", "surface-raised", "text", "text-link", "text-quiet", "warning", "warning-border-loud", "warning-border-normal", "warning-border-quiet", "warning-fill-loud", "warning-fill-normal", "warning-fill-quiet", "warning-on-fill", "warning-on-loud", "warning-on-normal", "warning-on-quiet", "warning-text"];
/** Names of the public `--kui-color-*` semantic tokens. */
type UiColorName = (typeof uiColorNames)[number];
/** Kerf UI's complete spacing-token vocabulary. `s` and `xl` are exceptions. */
type UiSpaceName = 'none' | '2xs' | 'xs' | 's' | 'm' | 'l' | 'xl';
/** Create a complete pixel length. */
declare function px(value: number): CssLength;
/** Create a complete root-font-relative length. */
declare function rem(value: number): CssLength;
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
/** Resolve a public Kerf UI semantic color token. */
declare function uiColor(name: UiColorName): CssColor;
/** Reference an application-owned custom property whose contract is a color. */
declare function colorVar(name: `--${string}`, fallback?: CssColor): CssColor;

export { type CssColor, type CssFlex, type CssFlexBasis, type CssFlexKeyword, type CssLength, type CssLengthExpression, type CssSize, type CssSizeKeyword, type CssValue, type UiColorName, type UiSpaceName, calc, colorVar, em, flex, lengthVar, pct, plus, px, rem, space, uiColor };
```

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
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function DisclosureArrow({ open, openDirection, closedDirection, icon, className, slot, }: DisclosureArrowProps): SafeHtml;

export { DisclosureArrow, type DisclosureArrowProps, type DisclosureDirection };
```

## `@kerfjs/ui/toolbar`

```ts
import * as kerfjs from 'kerfjs';
import { D as DividerSides } from './divider-sides-BzB6rphT.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

interface ToolbarProps {
    leading?: KerfUiContent;
    center?: KerfUiContent;
    trailing?: KerfUiContent;
    label?: string;
    /** Physical divider edges in canonical top/right/bottom/left order. Defaults to bottom. */
    dividerSides?: DividerSides;
    /** Horizontal treatment of the center zone. Defaults to centered content. */
    centerAlign?: 'center' | 'stretch';
    /** Component-owned responsive layout; applications choose the policy rather than restyling toolbar internals. */
    responsive?: 'none' | 'stack' | 'center-priority';
    /** Container width at which `responsive="stack"` activates. */
    responsiveAt?: 'compact' | 'narrow';
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function Toolbar({ leading, center, trailing, label, dividerSides, centerAlign, responsive, responsiveAt, className, slot, }: ToolbarProps): kerfjs.SafeHtml;

export { DividerSides, Toolbar, type ToolbarProps };
```

## `@kerfjs/ui/toolbar-text`

```ts
import * as kerfjs from 'kerfjs';

type ToolbarTextSize = 'xlarge' | 'large' | 'default' | 'small';
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
declare function ToolbarText({ text, size, className, id, headingLevel, placeholder, wrap, ellipsis, maxLines, slot, }: ToolbarTextProps): kerfjs.SafeHtml;

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
    /** Add contrast behind photo-backed avatar content. */
    scrim?: boolean;
    /**
     * Avatar image URL. A single-control group paints it on the group; a
     * multi-control group paints it only on the pressed selection highlight.
     */
    avatarImage?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function ToolbarControlGroup({ children, label, className, expanded, single, appearance, tone, buttonAppearance, shape, size, density, content, focusRing, selectedChrome, selectedTone, nestedDropdown, menuInset, overflow, visibility, scrim, avatarImage, slot, }: ToolbarControlGroupProps): kerfjs.SafeHtml;

export { ToolbarActionLink, type ToolbarActionLinkProps, ToolbarControlGroup, type ToolbarControlGroupAppearance, type ToolbarControlGroupButtonAppearance, type ToolbarControlGroupContent, type ToolbarControlGroupDensity, type ToolbarControlGroupFocusRing, type ToolbarControlGroupMenuInset, type ToolbarControlGroupOverflow, type ToolbarControlGroupProps, type ToolbarControlGroupSelectedChrome, type ToolbarControlGroupSelectedTone, type ToolbarControlGroupShape, type ToolbarControlGroupSize, type ToolbarControlGroupTone, type ToolbarControlGroupVisibility };
```

## `@kerfjs/ui/floating-toolbar`

```ts
import * as kerfjs from 'kerfjs';
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
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
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
declare function FloatingToolbar({ children, label, position, className, slot, }: FloatingToolbarProps): kerfjs.SafeHtml;

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
    'data-density'?: never;
    'data-divider'?: never;
    'data-inline'?: never;
    'data-width'?: never;
    'data-indicator-tone'?: never;
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
    action: string;
    expanded: boolean;
    actionIcon?: SafeHtml;
    actionLabel?: never;
    actionDisabled?: boolean;
    disabledReason?: string;
} | {
    /** Render a separately named trailing action. */
    toggle?: false;
    action: string;
    actionLabel: string;
    actionIcon: SafeHtml;
    expanded?: never;
    actionDisabled?: boolean;
    disabledReason?: string;
} | {
    /** Render a passive section heading. */
    toggle?: false;
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
declare function ListHeader({ label, count, countLabel, badge, status, density, divider, inline, width, indicatorTone, action, actionLabel, actionIcon, actionDisabled, disabledReason, expanded, toggle, placeholder, rootAttributes, triggerAttributes, slot, }: ListHeaderProps): SafeHtml;

export { ListHeader, type ListHeaderProps };
```

## `@kerfjs/ui/list`

```ts
import * as kerfjs from 'kerfjs';
import { UiSpaceName, CssLength, CssFlexKeyword, CssFlex } from './css-values.js';
import { D as DividerSides, S as Sides } from './divider-sides-BzB6rphT.js';
import { H as HorizontalAlignment, L as ListVerticalAlignment } from './flex-alignment-4ms8ZbV8.js';
export { V as VerticalAlignment } from './flex-alignment-4ms8ZbV8.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

interface ListProps {
    children?: KerfUiContent;
    /** Use the standard item gap, a named UI spacing token, or a typed CSS length. Defaults to no gap. */
    gap?: boolean | UiSpaceName | CssLength;
    /** Allow this list to grow/shrink, use a keyword, or supply a typed CSS flex shorthand. */
    flex?: boolean | CssFlexKeyword | CssFlex;
    /** Horizontal alignment. Defaults to full to preserve stretch-aligned list children. */
    hAlign?: HorizontalAlignment;
    /** Vertical distribution. Defaults to top. */
    vAlign?: ListVerticalAlignment;
    /** Own vertical scrolling and overscroll containment. */
    scrollable?: boolean;
    /** Physical divider edges in canonical top/right/bottom/left order. */
    dividerSides?: DividerSides;
    /** Physical sides that receive the standard 17px text inset. */
    textInsets?: Sides;
    /** Physical sides that receive the standard 8px control inset. Text insets win on overlap. */
    controlInsets?: Sides;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** A stretch-aligned vertical stack with optional gap, flex, scroll, and dividers. */
declare function List({ children, gap, flex, hAlign, vAlign, scrollable, dividerSides, textInsets, controlInsets, className, slot, }: ListProps): kerfjs.SafeHtml;

export { CssFlex, CssFlexKeyword, CssLength, DividerSides, HorizontalAlignment, List, type ListProps, ListVerticalAlignment, Sides, UiSpaceName };
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
    /** Render as an unanimated loading skeleton, disabling both actions. */
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
}>;
interface ListItemProps {
    label: string | SafeHtml;
    /** App-owned supporting text rendered in the component's stable label stack. */
    description?: string | SafeHtml;
    icon?: SafeHtml;
    trailing?: KerfUiContent;
    /** Dormant status metadata rendered before trailing content. */
    status?: string | SafeHtml;
    /** Show a progress indicator and expose the row as busy without replacing its content. */
    busy?: boolean;
    density?: 'standard' | 'compact';
    divider?: 'none' | 'before' | 'after' | 'both';
    selected?: boolean;
    action: string;
    itemId?: string;
    className?: string;
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
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function ListItem({ label, description, icon, trailing, status, busy, density, divider, selected, action, itemId, className, pressed, accessibleLabel, title, multiline, state, disabled, tabIndex, placeholder, rootAttributes, slot, }: ListItemProps): SafeHtml;

export { ListItem, type ListItemProps };
```

## `@kerfjs/ui/list-inset-control`

```ts
import * as kerfjs from 'kerfjs';
import { S as Sides } from './divider-sides-BzB6rphT.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

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
import { S as Sides } from './divider-sides-BzB6rphT.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

interface ListInsetTextProps {
    /** Text (or inline content) that carries no margin, border, or padding of its own. */
    children: KerfUiContent | string;
    /** Physical inset sides in canonical top/right/bottom/left order. Defaults to all sides. */
    sides?: Sides;
    /**
     * @deprecated Pass `sides="rl"` instead. Keep only the horizontal geometry (inline margin, left/right border, and
     * left/right padding) and drop the vertical margin, border, and padding. Use it
     * when the text edge must still align with bordered items but the line should not
     * add its own vertical box space — tight text layout inside a content region.
     */
    horizontalOnly?: boolean;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * Gives bare text the content-item geometry — an 8px inline margin, a 1px
 * transparent border, and 8px padding — so a plain string lines up with
 * bordered `.kui-content` items (its text edge lands at the same 17px inset).
 * Use it for text elements that have no margin, border, or padding of their own.
 * Pass `horizontalOnly` to keep the horizontal inset but drop the vertical box
 * space for tight text layout.
 */
declare function ListInsetText({ children, sides, horizontalOnly, className, slot, }: ListInsetTextProps): kerfjs.SafeHtml;

export { ListInsetText, type ListInsetTextProps, Sides };
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
    className?: string;
    children: KerfUiContent;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function ValueTable({ label, className, children, slot, }: ValueTableProps): kerfjs.SafeHtml;

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
}>;
type AppTabPresentation = 'pill' | 'segmented' | 'icon-only';
type AppTabSize = 'default' | 'compact';
interface AppTabProps {
    id: string;
    name: string;
    selected?: boolean;
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
    /** Decorative dormant content for the close button. Must not contain interactive descendants. */
    closeIcon?: SafeHtml;
    selectAction?: string;
    closeAction?: string;
    className?: string;
    /** Render as an unanimated loading skeleton, disabling select/close and dragging. */
    placeholder?: boolean;
    rootAttributes?: AppTabRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function AppTab({ id, name, selected, closable, draggable, leading, trailing, presentation, size, labelMaxWidth, closeIcon, selectAction, closeAction, className, placeholder, rootAttributes, slot, }: AppTabProps): SafeHtml;

export { AppTab, type AppTabPresentation, type AppTabProps, type AppTabSize };
```

## `@kerfjs/ui/tab-bar`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type TabActivation = 'automatic' | 'manual';
type TabBarAllocation = 'intrinsic' | 'fill';
type TabBarPresentation = 'rail' | 'segmented' | 'inspector';
type TabBarTrailingPlacement = 'separate' | 'adjacent';
interface TabBarProps {
    id: string;
    label: string;
    children: KerfUiContent;
    leading?: KerfUiContent;
    trailing?: KerfUiContent;
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
    /** Keep a trailing action beside the final tab or at the far edge of the bar. */
    trailingPlacement?: TabBarTrailingPlacement;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** Render a controlled tab strip. The application owns selection, order, and persistence. */
declare function TabBar({ id, label, children, leading, trailing, className, activation, allocation, presentation, trailingPlacement, slot, }: TabBarProps): kerfjs.SafeHtml;

export { type TabActivation, TabBar, type TabBarAllocation, type TabBarPresentation, type TabBarProps, type TabBarTrailingPlacement };
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

## `@kerfjs/ui/nav-stack`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

/**
 * One entry in a {@link NavStack}. The app owns the stack as an array (usually a
 * signal); `NavStack` renders it and `wireNavStack` animates the transitions.
 */
interface NavStackView {
    /** Stable identity for keyed reconcile and transition direction. */
    key: string;
    content: KerfUiContent;
    /** Title shown in the top toolbar for this view. */
    title?: string;
    /** Trailing actions for this view's top toolbar. */
    toolbar?: KerfUiContent;
    /** Bottom toolbar for this view. Cross-fades with the top chrome on navigation. */
    bottomToolbar?: KerfUiContent;
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
    /** Optional persistent bottom toolbar used when the active view does not provide one. */
    bottomToolbar?: KerfUiContent;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A navigation stack (iOS-style push/pop). Renders every entry stacked, the last
 * one active; `@kerfjs/ui/wire-nav-stack`'s `wireNavStack` slides the content and
 * cross-fades the chrome across a change. A single-pane layout is a `NavStack`
 * with one entry. See `docs/23-app-layouts.md` §3.1.
 */
declare function NavStack({ id, label, views, backLabel, hideToolbar, bottomToolbar, className, slot, }: NavStackProps): kerfjs.SafeHtml;

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
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

interface SplitViewResizable {
    size: number;
    min: number;
    max: number;
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
declare function SplitView({ id, label, list, detail, compact, detailActive, listTitle, detailTitle, backLabel, resizable, className, slot, }: SplitViewProps): kerfjs.SafeHtml;

export { SplitView, type SplitViewProps, type SplitViewResizable };
```

## `@kerfjs/ui/pane`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

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
    header?: KerfUiContent;
    /** The pane's primary vertical, scrolling content stack. */
    children?: KerfUiContent;
    /** Optional fixed chrome below the scrolling content. */
    footer?: KerfUiContent;
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
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * An unpadded application column with optional fixed header/footer slots and one
 * scrolling vertical content owner. Separator lines are independently opt-in on
 * each logical edge, so the same component works as a sidebar, main area,
 * inspector, or dialog column.
 */
declare function Pane({ header, children, footer, element, contentElement, separators, id, label, contentLabel, className, headerClassName, contentClassName, footerClassName, rootAttributes, slot, }: PaneProps): kerfjs.SafeHtml;

export { Pane, type PaneContentElement, type PaneElement, type PaneProps, type PaneSeparatorSide };
```

## `@kerfjs/ui/workbench`

```ts
import { SafeHtml } from 'kerfjs';
import { ResizableRegionSeparator, ResizableRegionCollapseMotion, ResizableRegionContentOverflow, ResizableRegionPresentation, ResizableRegionRestorePosition } from './resizable-region.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

/** A collapsible Workbench panel — a side rail or the bottom drawer. */
interface WorkbenchPanel {
    content: KerfUiContent;
    /** Whether the panel is currently collapsed (the app owns this). */
    collapsed?: boolean;
    /** Rail width, or drawer height, in px. Overrides the CSS default. */
    size?: number;
    /** Accessible name for the panel region. */
    label?: string;
    separator?: ResizableRegionSeparator;
    collapseMotion?: ResizableRegionCollapseMotion;
    contentOverflow?: ResizableRegionContentOverflow;
    presentation?: ResizableRegionPresentation;
    /** Control shown in a safe-area-aware viewport corner while collapsed. */
    restoreControl?: SafeHtml;
    restorePosition?: ResizableRegionRestorePosition;
}
interface WorkbenchProps {
    id: string;
    label: string;
    /** The central work area. */
    main: KerfUiContent;
    leftRail?: WorkbenchPanel;
    rightRail?: WorkbenchPanel;
    bottomDrawer?: WorkbenchPanel;
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
 * each `collapsed` flag; the collapse is pure CSS (no wire). See
 * `docs/23-app-layouts.md` §3.3.
 */
declare function Workbench({ id, label, main, leftRail, rightRail, bottomDrawer, className, slot, }: WorkbenchProps): SafeHtml;

export { Workbench, type WorkbenchPanel, type WorkbenchProps };
```

## `@kerfjs/ui/collapsible-panel`

```ts
import { SafeHtml } from 'kerfjs';
import { LucideIcon } from './lucide-icon.js';
import { ResizableRegionSeparator, ResizableRegionCollapseMotion, ResizableRegionContentOverflow, ResizableRegionPresentation, ResizableRegionRestorePosition } from './resizable-region.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
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
    separator?: ResizableRegionSeparator;
    collapseMotion?: ResizableRegionCollapseMotion;
    contentOverflow?: ResizableRegionContentOverflow;
    presentation?: ResizableRegionPresentation;
    /** Control shown in a safe-area-aware viewport corner while collapsed. */
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
 * underneath the transform transition. The app owns the `collapsed` signal;
 * pair it with `wireSidebar` for the toggle, focus, compact-overlay, keyboard,
 * and persistence semantics, and with `CollapsiblePanelToggle` for the standard
 * affordance. See `docs/24-collapsible-panel.md`.
 */
declare function CollapsiblePanel({ id, side, collapsed, size, label, children, separator, collapseMotion, contentOverflow, presentation, restoreControl, restorePosition, className, }: CollapsiblePanelProps): SafeHtml;

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
 * owns the interaction. Returns a disposer. See `docs/24-collapsible-panel.md`.
 */
declare function wireSidebar(root: HTMLElement, { panels, deviceClass, compactPresentation, exclusiveCompact, storage, }: WireSidebarOptions): () => void;

export { type SidebarStorage, type WireSidebarOptions, type WireSidebarPanel, wireSidebar };
```

## `@kerfjs/ui/tab-scaffold`

```ts
import { SafeHtml } from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

interface TabScaffoldTab<Id extends string = string> {
    id: Id;
    label: string;
    /** Decorative icon shown above the label in the bottom bar. */
    icon?: SafeHtml;
    /** The tab's content — typically a `NavStack` so each tab keeps its own stack. */
    content: KerfUiContent;
}
interface TabScaffoldProps<Id extends string = string> {
    id: string;
    /** Accessible name for the tab bar. */
    label: string;
    tabs: readonly TabScaffoldTab<Id>[];
    /** The controlled active tab id (the app owns selection). */
    active: NoInfer<Id>;
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
declare function TabScaffold<Id extends string>({ id, label, tabs, active, className, slot, }: TabScaffoldProps<Id>): SafeHtml;

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
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type ResizableRegionAxis = 'horizontal' | 'vertical';
type ResizableRegionEdge = 'start' | 'end';
type ResizableRegionSeparator = 'auto' | 'hidden';
type ResizableRegionCollapseMotion = 'none' | 'slide' | 'fade-slide';
type ResizableRegionContentOverflow = 'clip' | 'auto' | 'visible';
type ResizableRegionPresentation = 'inline' | 'overlay' | 'hidden';
type ResizableRegionRestorePosition = 'bottom-start' | 'bottom-end';
type ResizableRegionResponsiveFillAt = 'compact' | 'narrow';
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
    /** Whether the separator line is painted. The resize hit target remains available. */
    separator?: ResizableRegionSeparator;
    /** Keep the track change instant while optionally sliding the fixed-size content. */
    collapseMotion?: ResizableRegionCollapseMotion;
    /** Overflow policy for content such as an open popup inside a bottom drawer. */
    contentOverflow?: ResizableRegionContentOverflow;
    /** Inline layout, an edge overlay, or a responsive replacement that removes the region. */
    presentation?: ResizableRegionPresentation;
    /** Always-available control rendered while collapsed, outside the clipped region. */
    restoreControl?: SafeHtml;
    /** Safe-area-aware viewport corner for `restoreControl`. */
    restorePosition?: ResizableRegionRestorePosition;
    /** Fill the available inline track and hide the separator below a container breakpoint. */
    responsiveFillAt?: ResizableRegionResponsiveFillAt;
    /** Decorative dormant content for the separator handle. Must not contain interactive descendants. */
    handleIcon?: SafeHtml;
    children: KerfUiContent;
}
declare const clampRegionSize: (size: number, min: number, max: number) => number;
declare const resizeRegionFromPointer: (startSize: number, delta: number, edge: ResizableRegionEdge) => number;
declare function ResizableRegion({ id, label, size, min, max, axis, edge, collapsed, transitioning, separator, collapseMotion, contentOverflow, presentation, restoreControl, restorePosition, responsiveFillAt, handleIcon, children, }: ResizableRegionProps): SafeHtml;

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
import * as kerfjs from 'kerfjs';
import { SafeHtml } from 'kerfjs';
import { a as CatalogProps } from './types-CzgSrFXP.js';
export { b as CatalogBrand, c as CatalogEntry, d as CatalogRelated, C as CatalogResource, e as CatalogSecondaryGroup, f as CatalogSection } from './types-CzgSrFXP.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

/** Controlled, stateless component-catalog shell. */
declare function Catalog({ brand, sections, active, content, collapsed, theme, headerActions, secondarySections, sidebarFooter, status, geometryOverlay, selectAction, toggleSidebarAction, toggleThemeAction, toggleSecondaryAction, className, slot, }: CatalogProps): kerfjs.SafeHtml;

/** How a specimen aligns its visible edge with its `ListHeader` label. */
type CatalogExampleAlign = 'glyph' | 'inline-control' | 'none';
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
    rootAttributes?: CatalogExampleRootAttributes;
    className?: string;
    children?: KerfUiContent;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** A labeled catalog specimen with optional explanatory text and alignment. */
declare function CatalogExample({ label, note, align, rootAttributes, className, children, slot, }: CatalogExampleProps): SafeHtml;

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

export { Catalog, CatalogExample, type CatalogExampleAlign, type CatalogExampleProps, CatalogExampleStack, type CatalogExampleStackProps, CatalogProps };
```

## `@kerfjs/ui/catalog-resources`

```ts
import { C as CatalogResource } from './types-CzgSrFXP.js';
import './semantic-content-BbzjvSu9.js';
import 'kerfjs';

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
 * Returns a disposer.
 */
declare function wireCatalog(root: HTMLElement, { onSelect, onToggleSidebar, onToggleTheme, onToggleSecondary, urlParam, revealSelection, selectAction, toggleSidebarAction, toggleThemeAction, toggleSecondaryAction, }: WireCatalogOptions): () => void;

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
    /** Render as an unanimated loading skeleton, disabling every segment. */
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
import { CssColor } from './css-values.js';
import { LucideNode } from './lucide-icon.js';
import 'lucide';

interface SelectChoice<Value extends string = string> {
    value: Value;
    label: string;
    icon?: LucideNode;
    iconName?: string;
    /** Typed semantic or application-owned color for the optional icon. */
    color?: CssColor;
    group?: string;
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
interface SelectBaseProps<Value extends string = string> {
    name: string;
    value: NoInfer<Value>;
    choices: readonly SelectChoice<Value>[];
    className?: string;
    /** Empty-value hint text shown in the closed control (the native select placeholder). */
    placeholderText?: string;
    /** Supporting text shown below the control and associated with its combobox. */
    hint?: string;
    disabled?: boolean;
    fitMenu?: boolean;
    renderSelected?: (choice: SelectChoice<Value>) => SafeHtml;
    /** Render as an unanimated loading skeleton: the label above a static, empty control box. */
    placeholder?: boolean;
    /** Form (default), borderless toolbar, or intrinsic navigation chrome. */
    presentation?: SelectPresentation;
    size?: SelectSize;
    /** Show only the selected choice icon while retaining the Select's accessible name. */
    selectedPresentation?: SelectSelectedPresentation;
    /** Let an enclosing ToolbarControlGroup paint the composed focus ring. */
    focusRingOwner?: SelectFocusRingOwner;
    /** Maximum closed-control label width in CSS pixels before ellipsis. */
    labelMaxWidth?: number;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
type SelectProps<Value extends string = string> = SelectBaseProps<Value> & SelectAccessibleName;
declare function Select<Value extends string>({ name, value, label, ariaLabel, choices, className, placeholderText, hint, disabled, fitMenu, renderSelected, placeholder, presentation, size, selectedPresentation, focusRingOwner, labelMaxWidth, slot, }: SelectProps<Value>): SafeHtml;

export { Select, type SelectChoice, type SelectFocusRingOwner, type SelectPresentation, type SelectProps, type SelectSelectedPresentation, type SelectSize };
```

## `@kerfjs/ui/state-banner`

```ts
import { SafeHtml } from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type StateBannerTone = 'neutral' | 'info' | 'pop' | 'success' | 'warning' | 'danger';
type StateBannerUrgency = 'status' | 'alert';
interface StateBannerProps {
    title: string;
    detail?: string;
    /** Optional compact status or count shown beside the title. */
    badge?: string;
    icon?: SafeHtml;
    action?: KerfUiContent;
    tone?: StateBannerTone;
    urgency?: StateBannerUrgency;
    className?: string;
    /** Render the title, badge, and detail as unanimated loading skeletons, keeping the icon and tone. */
    placeholder?: boolean;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function StateBanner({ title, detail, badge, icon, action, tone, urgency, className, placeholder, slot, }: StateBannerProps): SafeHtml;

export { StateBanner, type StateBannerProps, type StateBannerTone, type StateBannerUrgency };
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
declare function Skeleton({ width, height, radius, lines, label, className, slot, }: SkeletonProps): kerfjs.SafeHtml;

export { Skeleton, type SkeletonProps };
```

## `@kerfjs/ui/sunken-panel`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type SunkenPanelShape = 'rounded' | 'square';
interface SunkenPanelProps {
    children?: KerfUiContent;
    /** Optional accessible landmark name for a distinct application region. */
    ariaLabel?: string;
    /** Corner shape: a rounded rectangle (default) or square corners. */
    shape?: SunkenPanelShape;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A lowered application surface with one compact inset and a vertical content
 * stack. The panel owns its background and padding; children own their own
 * borders and internal geometry.
 */
declare function SunkenPanel({ children, ariaLabel, shape, className, slot, }: SunkenPanelProps): kerfjs.SafeHtml;

export { SunkenPanel, type SunkenPanelProps, type SunkenPanelShape };
```

## `@kerfjs/ui/token-search-field`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

interface TokenSearchToken {
    value: string;
    label: string;
    offset?: number;
    accessibleLabel?: string;
}
type TokenSearchEditorAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-key'?: never;
    'data-morph-skip'?: never;
    'data-token-search-editor'?: never;
    'data-token-count'?: never;
    'data-placeholder'?: never;
}>;
interface TokenSearchFieldBaseProps {
    id: string;
    label: string;
    query?: string;
    tokens?: readonly TokenSearchToken[];
    placeholder?: string;
    tokenPlaceholder?: string;
    disabled?: boolean;
    autofocus?: boolean;
    leading?: KerfUiContent;
    trailing?: KerfUiContent;
    /** Standalone field chrome or the inset visual layer of a configured toolbar group. */
    presentation?: 'standalone' | 'toolbar-group';
    editAction?: string;
    removeAction?: string;
    clearAction?: string;
    clearLabel?: string;
    className?: string;
    editorAttributes?: TokenSearchEditorAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
type TokenSearchCollapsibleProps = {
    /** Allow an empty field to render as one iconic action. */
    collapsible: true;
    /** Keep an empty collapsible field open while the application owns focus. */
    expanded?: boolean;
    expandAction?: string;
    expandLabel?: string;
} | {
    collapsible?: false;
    expanded?: never;
    expandAction?: never;
    expandLabel?: never;
};
type TokenSearchFieldProps = TokenSearchFieldBaseProps & TokenSearchCollapsibleProps;
interface TokenSearchFieldValue {
    query: string;
    tokens: TokenSearchToken[];
}
declare function TokenSearchField({ id, label, query, tokens, placeholder, tokenPlaceholder, disabled, autofocus, collapsible, expanded, expandAction, expandLabel, leading, trailing, presentation, editAction, removeAction, clearAction, clearLabel, className, editorAttributes, slot, }: TokenSearchFieldProps): kerfjs.SafeHtml;
/** Read editable text and ordered token offsets from a rendered TokenSearchField editor. */
declare function readTokenSearchField(editor: HTMLElement, knownTokens?: readonly TokenSearchToken[]): TokenSearchFieldValue;
/** Focus an editor and place its caret at a text offset, skipping atomic token chips. */
declare function placeTokenSearchCaret(editor: HTMLElement, offset?: number): void;

export { type TokenSearchEditorAttributes, TokenSearchField, type TokenSearchFieldProps, type TokenSearchFieldValue, type TokenSearchToken, placeTokenSearchCaret, readTokenSearchField };
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

## `@kerfjs/ui/badge`

```ts
import { SafeHtml } from 'kerfjs';

type BadgeTone = 'neutral' | 'brand' | 'pop' | 'success' | 'warning' | 'danger';
type BadgeAppearance = 'quiet' | 'solid' | 'outline';
type BadgeShape = 'pill' | 'rounded';
type BadgeSize = 'compact' | 'default';
interface BadgeProps {
    children: SafeHtml | string | number;
    tone?: BadgeTone;
    appearance?: BadgeAppearance;
    shape?: BadgeShape;
    size?: BadgeSize;
    /** Optional accessible name when the visible content is abbreviated. */
    label?: string;
    /** Hide a repeated visual badge from assistive technology. */
    ariaHidden?: boolean;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** Compact, non-interactive metadata whose tone, emphasis, and shape are configured by props. */
declare function Badge({ children, tone, appearance, shape, size, label, ariaHidden, className, slot, }: BadgeProps): SafeHtml;

export { Badge, type BadgeAppearance, type BadgeProps, type BadgeShape, type BadgeSize, type BadgeTone };
```

## `@kerfjs/ui/lucide-icon`

```ts
import * as kerfjs from 'kerfjs';
import { IconNode } from 'lucide';

type LucideNode = IconNode;
interface LucideIconProps {
    icon: LucideNode;
    name: string;
    className?: string;
    label?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** Render a Lucide-compatible icon node without copying icon SVG strings. */
declare function LucideIcon({ icon, name, className, label, slot, }: LucideIconProps): kerfjs.SafeHtml;

export { LucideIcon, type LucideIconProps, type LucideNode };
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

type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';
type TextTone = 'default' | 'quiet' | 'danger';
type TextSize = 'default' | 'compact';
type TextFont = 'default' | 'monospace';
type TextBorder = 'transparent' | 'none';
type TextContent = KerfUiContent | string | number | readonly TextContent[];
type TextProps = Omit<KerfBaseAttrs, 'children' | 'class' | 'className'> & {
    /** Native heading or paragraph element to render. Defaults to `p`. */
    variant?: TextVariant;
    /** Semantic foreground treatment. Defaults to the inherited foreground. */
    tone?: TextTone;
    /** Text sizing independent of the native semantic element. */
    size?: TextSize;
    /** Font family independent of the native semantic element. */
    font?: TextFont;
    /** Transparent alignment border or no border when embedded in owner chrome. */
    border?: TextBorder;
    children: TextContent;
    class?: string;
    className?: string;
};
/**
 * Semantic heading or paragraph text with the standard content-item padding.
 * All ordinary native heading/paragraph attributes pass through to the element.
 */
declare function Text({ variant: Variant, tone, size, font, border, children, class: classValue, className, ...attributes }: TextProps): kerfjs.SafeHtml;

export { Text, type TextBorder, type TextContent, type TextFont, type TextProps, type TextSize, type TextTone, type TextVariant };
```

## `@kerfjs/ui/row`

```ts
import * as kerfjs from 'kerfjs';
import { UiSpaceName, CssLength, CssFlexKeyword, CssFlex } from './css-values.js';
import { S as Sides } from './divider-sides-BzB6rphT.js';
import { H as HorizontalAlignment, V as VerticalAlignment } from './flex-alignment-4ms8ZbV8.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

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
    /** Allow children to wrap onto additional lines. */
    wrap?: boolean;
    /** Physical sides that receive the standard 17px text inset. */
    textInsets?: Sides;
    /** Physical sides that receive the standard 8px control inset. Text insets win on overlap. */
    controlInsets?: Sides;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** A horizontal flex row with explicit physical-axis alignment and spacing. */
declare function Row({ children, hAlign, vAlign, gap, flex, wrap, textInsets, controlInsets, className, slot, }: RowProps): kerfjs.SafeHtml;

export { CssFlex, CssFlexKeyword, CssLength, HorizontalAlignment, Row, type RowProps, Sides, UiSpaceName, VerticalAlignment };
```

## `@kerfjs/ui/grid`

```ts
import * as kerfjs from 'kerfjs';
import { UiSpaceName, CssLength, CssFlexKeyword, CssFlex } from './css-values.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

interface GridProps {
    children?: KerfUiContent;
    /** Number of equal-width columns. Must be a positive safe integer. */
    columns: number;
    /** A named UI spacing token or typed CSS length. Defaults to xs. */
    gap?: UiSpaceName | CssLength;
    /** Allow this grid to grow/shrink, use a keyword, or supply a typed CSS flex shorthand. */
    flex?: boolean | CssFlexKeyword | CssFlex;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** A fixed-count grid whose columns share the available width equally. */
declare function Grid({ children, columns, gap, flex, className, slot, }: GridProps): kerfjs.SafeHtml;

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
