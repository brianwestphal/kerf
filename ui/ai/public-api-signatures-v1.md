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
/** A token or complete typed length for one gap axis. */
type UiGapValue = UiSpaceName | CssLength;
/** A shared gap or independent column and row gaps. */
type UiGap = UiGapValue | Readonly<{
    column: UiGapValue;
    row: UiGapValue;
}>;
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
/**
 * Use an application-chosen CSS color for foreground content. The browser
 * resolves the color syntax; this checks only that it is one declaration value.
 */
declare function foregroundColor(value: string): CssForegroundColor;
/**
 * Use an application-chosen CSS color as a fill: a `ChoiceChips` swatch, a list
 * row's `iconTile` color, or any other prop that takes a plain
 * {@link CssColor}. It returns a `CssColor`, not a {@link CssForegroundColor},
 * so a fill literal cannot reach a prop that paints text or an icon. The browser
 * resolves the color syntax; this checks only that it is one declaration value.
 */
declare function fillColor(value: string): CssColor;

export { type CssColor, type CssFlex, type CssFlexBasis, type CssFlexKeyword, type CssForegroundColor, type CssLength, type CssLengthExpression, type CssSize, type CssSizeKeyword, type CssValue, type UiColor, type UiColorName, type UiForegroundColorName, type UiGap, type UiGapValue, type UiSpaceName, calc, colorVar, em, fillColor, flex, foregroundColor, foregroundColorVar, lengthVar, pct, plus, px, rem, remify, space, uiColor };
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
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { S as Sides } from './sides-BPSWde0A.js';
import { PaneSeparatorSide } from './pane.js';
import './scroll-clearance-BikHljTc.js';
import './css-values.js';

type ToolbarPosition = 'header' | 'footer';
/** Control-band density: `default` (60px with 44px groups) or `compact`. */
type ToolbarDensity = 'default' | 'compact';
interface ToolbarProps {
    leading?: KerfUiContent;
    center?: KerfUiContent;
    trailing?: KerfUiContent;
    label?: string;
    /** Use footer semantics for a bottom toolbar; defaults to header. */
    position?: ToolbarPosition;
    /**
     * `compact` sizes the toolbar to a 34px control band with 3px block
     * insets — 40px tall — for a header embedded in a panel or card. Fill it
     * with `ToolbarControlGroup size="compact"` groups; inline insets and the
     * gap between zones are unchanged. Composites that render a Toolbar from a
     * `ToolbarConfig` (Workbench, CollapsiblePanel, NavStack, SplitView) forward
     * it and size the groups they compose to match. Defaults to `default`.
     */
    density?: ToolbarDensity;
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
type ToolbarConfig = Pick<ToolbarProps, 'density' | 'dividerSides' | 'centerAlign' | 'responsive' | 'responsiveAt' | 'safeAreaEdges'>;
declare function Toolbar({ leading, center, trailing, label, position, density, dividerSides, centerAlign, responsive, responsiveAt, safeAreaEdges, className, slot, }: ToolbarProps): kerfjs.SafeHtml;

export { Sides, Toolbar, type ToolbarConfig, type ToolbarDensity, type ToolbarPosition, type ToolbarProps };
```

## `@kerfjs/ui/toolbar-text`

```ts
import * as kerfjs from 'kerfjs';
import { CssLength } from './css-values.js';

type ToolbarTextSize = 'xlarge' | 'xlarge-fixed' | 'large' | 'default' | 'small' | 'xsmall';
type ToolbarTextTone = 'default' | 'dark';
/** ARIA heading level for a title exposed as a heading landmark. */
type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
interface ToolbarTextBaseProps {
    text: string;
    size?: ToolbarTextSize;
    /**
     * Use loud-toolbar foregrounds on a toolbar painted with the inverse loud
     * fill, matching dark control groups; like them it inverts with the color
     * scheme. Over a dark photo or scrim keep the default tone inside a
     * `BackdropImage` overlay, which takes the dark scheme under its scrim.
     */
    tone?: ToolbarTextTone;
    /** Hide below this Toolbar content width; requires wireToolbarVisibility. */
    hideBelow?: CssLength;
    /** Show only below this Toolbar content width; requires wireToolbarVisibility. */
    showBelow?: CssLength;
    className?: string;
    /** Optional id, e.g. so a dialog can reference the title via aria-labelledby. */
    id?: string;
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
type ToolbarTextProps = ToolbarTextBaseProps & (({
    action?: never;
    /** Expose `role="heading"` and `aria-level` on read-only text. */
    headingLevel?: HeadingLevel;
    /** Render an unanimated loading skeleton instead of the text. */
    placeholder?: boolean;
    /**
     * Quiet, single-line supporting copy under the title ("Changes save
     * automatically."), truncating with an ellipsis. Title and description
     * share the toolbar's control band and the same text start, with or
     * without a leading icon group. With a description, `id` and
     * `headingLevel` apply to the title alone, so a dialog's
     * `aria-labelledby` names only the title.
     */
    description?: string;
    /** Id for the description, for a dialog's `aria-describedby`. */
    descriptionId?: string;
} & ToolbarTextWrappingProps) | {
    /** Render a native button with this delegated action; the app owns editing. */
    action: string;
    headingLevel?: never;
    placeholder?: never;
    wrap?: never;
    maxLines?: never;
    description?: never;
    descriptionId?: never;
});
declare function ToolbarText({ text, size, tone, hideBelow, showBelow, className, id, headingLevel, placeholder, wrap, ellipsis, maxLines, fill, slot, action, description, descriptionId, }: ToolbarTextProps): kerfjs.SafeHtml;

export { type HeadingLevel, ToolbarText, type ToolbarTextProps, type ToolbarTextSize, type ToolbarTextTone };
```

## `@kerfjs/ui/toolbar-control-group`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { CssLength } from './css-values.js';

type ToolbarControlGroupAppearance = 'contained' | 'borderless';
type ToolbarControlGroupTone = 'default' | 'dark';
/** Surface material: the opaque `solid` fill (default) or translucent `glass`. */
type ToolbarControlGroupMaterial = 'solid' | 'glass';
/** Quiet palette for a contained, single decorative icon tile. */
type ToolbarControlGroupTileTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
type ToolbarControlGroupButtonAppearance = 'plain' | 'push';
type ToolbarControlGroupShape = 'pill' | 'rounded';
type ToolbarControlGroupSize = 'default' | 'compact';
type ToolbarControlGroupDensity = 'comfortable' | 'tight';
type ToolbarControlGroupContent = 'icon' | 'text' | 'mixed' | 'avatar' | 'search';
type ToolbarControlGroupFocusRing = 'control' | 'outline' | 'halo';
type ToolbarControlGroupSelectedChrome = 'raised' | 'filled' | 'outline' | 'none';
type ToolbarControlGroupSelectedTone = 'brand' | 'neutral' | 'pop';
type ToolbarControlGroupOverflow = 'visible' | 'scroll' | 'wrap';
type ToolbarControlGroupExpandedOverflow = 'clip' | 'visible';
type ToolbarControlGroupMenuInset = 'standard' | 'compact' | 'list-zero';
type ToolbarControlGroupVisibility = 'always' | 'compact-only' | 'hide-collapsed-tiny' | 'yield-to-expanded-sibling';
type ToolbarControlGroupSizing = 'content' | 'grow' | 'fill';
type ToolbarControlGroupPlacement = 'start' | 'end';
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
    /**
     * `glass` paints the group on the translucent chrome material (backdrop
     * blur and saturation) with a specular edge and a soft shadow, for a group
     * floating over imagery or a clear toolbar. Controls take the normal text
     * color so they keep AA over any content; the fill turns opaque under
     * reduced transparency, increased contrast, static effects, or without
     * backdrop-filter support. A borderless group has no surface and ignores it.
     */
    material?: ToolbarControlGroupMaterial;
    /** Quiet fill, matching border and foreground for a contained single group whose only child is a decorative SVG. Ignored for interactive or mixed content. */
    tileTone?: ToolbarControlGroupTileTone;
    buttonAppearance?: ToolbarControlGroupButtonAppearance;
    /** Corner shape: fully round `pill` (default) or a softer `rounded` rectangle. */
    shape?: ToolbarControlGroupShape;
    size?: ToolbarControlGroupSize;
    density?: ToolbarControlGroupDensity;
    content?: ToolbarControlGroupContent;
    /** Whether controls paint focus individually or the group paints an outline/halo on focus-within. */
    focusRing?: ToolbarControlGroupFocusRing;
    /**
     * Chrome a pressed (`aria-pressed="true"`) control paints. `none` keeps a
     * pressed control looking like its neighbors, for an icon-state toggle whose
     * glyph already shows the state (an empty or filled star); hover and the
     * focus ring are unchanged. One control can opt out alone with
     * `data-selected-chrome="none"` on its own button.
     */
    selectedChrome?: ToolbarControlGroupSelectedChrome;
    selectedTone?: ToolbarControlGroupSelectedTone;
    /** Size a nested Web Awesome dropdown trigger as part of this group. */
    nestedDropdown?: boolean;
    /** Configure the nested dropdown menu inset without consumer ::part() CSS. */
    menuInset?: ToolbarControlGroupMenuInset;
    /** Keep an overlong row inside the available width by scrolling or wrapping. */
    overflow?: ToolbarControlGroupOverflow;
    /** Let app-owned anchored surfaces extend outside an expanded search group. Collapsed searches retain their clipping. */
    expandedOverflow?: ToolbarControlGroupExpandedOverflow;
    /** Responsive visibility owned by the enclosing Toolbar container. */
    visibility?: ToolbarControlGroupVisibility;
    /** Hide below this Toolbar content width; requires wireToolbarVisibility. */
    hideBelow?: CssLength;
    /** Show only below this Toolbar content width; requires wireToolbarVisibility. */
    showBelow?: CssLength;
    /** Intrinsic (default), grow from a basis, or occupy a full wrapping row. */
    sizing?: ToolbarControlGroupSizing;
    /** Place this group at the end of its flex row in a wrapping Toolbar zone. */
    placement?: ToolbarControlGroupPlacement;
    /** CSS length used as the minimum width and flex basis for `sizing="grow"`; defaults to 19rem. */
    growBasis?: string;
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
declare function ToolbarControlGroup({ children, label, className, expanded, single, appearance, tone, material, tileTone, buttonAppearance, shape, size, density, content, focusRing, selectedChrome, selectedTone, nestedDropdown, menuInset, overflow, expandedOverflow, visibility, hideBelow, showBelow, sizing, placement, growBasis, relocateOnCollapse, scrim, busy, busyLabel, avatarImage, slot, }: ToolbarControlGroupProps): kerfjs.SafeHtml;

export { ToolbarActionLink, type ToolbarActionLinkProps, ToolbarControlGroup, type ToolbarControlGroupAppearance, type ToolbarControlGroupButtonAppearance, type ToolbarControlGroupContent, type ToolbarControlGroupDensity, type ToolbarControlGroupExpandedOverflow, type ToolbarControlGroupFocusRing, type ToolbarControlGroupMaterial, type ToolbarControlGroupMenuInset, type ToolbarControlGroupOverflow, type ToolbarControlGroupPlacement, type ToolbarControlGroupProps, type ToolbarControlGroupSelectedChrome, type ToolbarControlGroupSelectedTone, type ToolbarControlGroupShape, type ToolbarControlGroupSize, type ToolbarControlGroupSizing, type ToolbarControlGroupTileTone, type ToolbarControlGroupTone, type ToolbarControlGroupVisibility };
```

## `@kerfjs/ui/floating-toolbar`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { CssLength } from './css-values.js';

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
    /** The item's value, reported in the menu's `kui-menu-select` event. */
    value?: string;
    /** Leading icon, typically a `LucideIcon`, before the label. */
    icon?: SafeHtml;
    /** A checkbox choice, including nested choices; omit for a plain command. */
    checked?: boolean;
    /** Trailing safe content, such as secondary status. */
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
    triggerContent?: never;
} | {
    text?: never;
    /**
     * Accessible name of an icon-only trigger, rendered as visually hidden
     * text inside the trigger button.
     */
    label: string;
    triggerContent?: never;
} | {
    text?: never;
    /**
     * The trigger's accessible name ("Status: Started"); the visible
     * content is hidden from assistive technology.
     */
    label: string;
    /**
     * Visible content that is the whole trigger, such as a `Badge` showing
     * the current status. Kerf owns the bare button around it (no chrome,
     * a pill focus ring, the pointer cursor, `aria-haspopup`), and the
     * caret is off unless `caret` is set.
     */
    triggerContent: KerfUiContent;
    icon?: never;
};
/** A context PopupMenu's viewport anchor point. */
interface PopupMenuAnchor {
    x: number;
    y: number;
}
type PopupMenuTrigger = (PopupMenuTriggerName & {
    context?: false;
    anchor?: never;
}) | {
    context: true;
    label: string;
    triggerContent?: never;
    /**
     * The viewport point (CSS pixels, as in `MouseEvent.clientX/Y`) the
     * menu opens from. Rendered into the menu itself, so it survives
     * re-renders and replacement; open it with `openPopupMenu`.
     */
    anchor?: PopupMenuAnchor;
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
/** A rendered PopupMenu root, the element the open and close helpers take. */
type PopupMenuElement = HTMLElement;
/**
 * Open a PopupMenu at viewport pointer coordinates. A `context` menu rendered
 * without `anchor` moves its invisible anchor there (a menu rendered with
 * `anchor` opens with `openPopupMenu` instead). A button-triggered menu (such
 * as a `ListActionRow` trailing menu) opens `bottom-start` from the point,
 * like a context menu, for this opening only; its next opening returns to its
 * trigger and placement. Needs the `/register` entry.
 */
declare function openPopupMenuAt(menu: PopupMenuElement, x: number, y: number): void;
/**
 * Open a PopupMenu from its trigger, or a context PopupMenu at the `anchor`
 * it was rendered with (or the point a previous `openPopupMenuAt` set).
 * Needs the `/register` entry.
 */
declare function openPopupMenu(menu: PopupMenuElement): void;
/** Close an open PopupMenu, and any submenu it shows. */
declare function closePopupMenu(menu: PopupMenuElement): void;
/**
 * An action menu: a trigger button that opens a list of commands in the top
 * layer. A `single` `ToolbarControlGroup` (with `nestedDropdown`) or a
 * `PopupSurface` sizes and insets it as usual. Items dispatch through
 * delegated `data-action`s, and the root reports each choice as a bubbling
 * `kui-menu-select` event; the app owns the commands and any open-state reaction.
 * Import `@kerfjs/ui/popup-menu/register` once to wire opening, keyboard
 * navigation, submenus, and dismissal. At viewport widths up to 480px,
 * submenus appear above or below their parent menu so their rows do not cover
 * the parent list.
 */
declare function PopupMenu({ text, label, icon, triggerContent, items, placement, caret, disabled, rootAttributes, slot, context, anchor, }: PopupMenuProps): SafeHtml;

export { PopupMenu, type PopupMenuAnchor, type PopupMenuDivider, type PopupMenuElement, type PopupMenuEntry, type PopupMenuHeading, type PopupMenuItem, type PopupMenuPlacement, type PopupMenuProps, closePopupMenu, openPopupMenu, openPopupMenuAt };
```

## `@kerfjs/ui/list-header`

```ts
import { SafeHtml } from 'kerfjs';
import { HeadingLevel } from './toolbar-text.js';
import './css-values.js';

type ListHeaderRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-has-badge'?: never;
    'data-has-count'?: never;
    'data-density'?: never;
    'data-size'?: never;
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
    /** Visual label size, independent of the native heading level. Default `sm`. */
    size?: 'xs' | 'sm' | 'm' | 'l' | 'xl';
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
    badge?: SafeHtml | undefined;
    status?: SafeHtml | undefined;
};
type ListHeaderProps = ListHeaderBaseProps & ListHeaderIndicatorProps & ListHeaderModeProps;
declare function ListHeader({ label, size, headingLevel, count, countLabel, badge, status, density, divider, inline, width, indicatorTone, action, actionLabel, actionIcon, actionDisabled, disabledReason, expanded, toggle, placeholder, rootAttributes, triggerAttributes, slot, }: ListHeaderProps): SafeHtml;

export { ListHeader, type ListHeaderProps };
```

## `@kerfjs/ui/list`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { S as StructuralRootAttributes } from './extension-attributes-mu8MFUl0.js';
import { H as HorizontalAlignment, L as ListVerticalAlignment } from './flex-alignment-4ms8ZbV8.js';
export { V as VerticalAlignment } from './flex-alignment-4ms8ZbV8.js';
import { S as ScrollClearance } from './scroll-clearance-BikHljTc.js';
import { S as Sides } from './sides-BPSWde0A.js';
import { UiGap, CssFlexKeyword, CssFlex, CssLength } from './css-values.js';
export { UiGapValue, UiSpaceName } from './css-values.js';

type ListRootAttributes = StructuralRootAttributes & Readonly<{
    'data-component'?: never;
    'data-gap'?: never;
    'data-flex'?: never;
    'data-fill'?: never;
    'data-h-align'?: never;
    'data-v-align'?: never;
    'data-scrollable'?: never;
    'data-scroll-clearance'?: never;
    'data-frame'?: never;
    'data-surface'?: never;
    'data-inset'?: never;
    'data-content-width'?: never;
    'data-content-align'?: never;
    'data-text-insets'?: never;
    'data-control-insets'?: never;
}>;
/**
 * A solid surface painted behind a List: `base` is the page surface
 * (`--kui-color-surface`), `raised` the raised surface
 * (`--kui-color-surface-raised`). A lowered region is a `SunkenPanel`.
 */
type ListSurface = 'base' | 'raised';
/**
 * A preset inset on all four sides. `document` is the reading inset for long
 * content such as a reader view: 24px block and 32px inline, narrowing to
 * 16px inline below 576px. It replaces any `textInsets`/`controlInsets`.
 */
type ListInset = 'document';
/**
 * A readable measure for a page's content column: `compact` 440px, `medium`
 * 640px, or `wide` 864px of content, the same steps as a catalog example's
 * `contentWidth`.
 */
type ListContentWidth = 'compact' | 'medium' | 'wide';
interface ListProps {
    children?: KerfUiContent;
    /** Make this list a labeled multi-select grid for `ContentItem selectionMode="multiple"` rows. */
    selectionMode?: 'multiple';
    /** Accessible name for the multi-select grid. */
    ariaLabel?: string;
    /** Standard gap (`true`), one spacing value, or separate column and row values. Defaults to no gap. */
    gap?: boolean | UiGap;
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
    /**
     * Own vertical scrolling and overscroll containment. Children keep their
     * natural height and scroll instead of shrinking. To bound the list by a
     * `max-height` ancestor (no definite height), give that ancestor a flex
     * column and use `flex`; `fill` needs a definite-height parent.
     */
    scrollable?: boolean;
    /**
     * Clear chrome that lies over this scrollable List's block-start and/or
     * block-end edge, such as a `DialogSurface` floating footer. The List adds
     * the inherited `--kui-scroll-clearance-block-*` context that chrome
     * publishes to its own block padding and `scroll-padding`, so its rows
     * scroll visibly beneath the chrome while the first and last rows (and any
     * row focused or scrolled into view) can still rest clear of it. Opt in only
     * the one scroller that reaches the covered edge. Defaults to none.
     */
    scrollClearance?: ScrollClearance;
    /**
     * Draw a bordered, rounded frame around the stack: a 1px neutral border,
     * the standard control radius, and a 4px inset on every side that keeps the
     * first and last rows' focus rings inside a scrolling frame's clip. It
     * replaces any `inset`/`textInsets`/`controlInsets`. With `scrollable` and
     * `maxHeight` it is a bounded result picker of `ListItem` rows.
     */
    frame?: boolean;
    /**
     * The List's maximum block size, a typed `CssLength` from
     * `@kerfjs/ui/css-values` (such as `rem(14)`). Pair it with `scrollable` so
     * rows beyond it scroll; it bounds the List without a flex-column ancestor.
     */
    maxHeight?: CssLength;
    /**
     * The List's minimum block size, a typed `CssLength` (such as `rem(4.25)`),
     * so a short or empty result set keeps a stable box. Defaults to no minimum.
     */
    minHeight?: CssLength;
    /**
     * Paint a solid surface behind the stack, including its insets: for a strip
     * of chrome (a banner above a sunken work area) that must not show the
     * lowered tint around its content. Omitted, the List is transparent.
     */
    surface?: ListSurface;
    /** Physical divider edges in canonical top/right/bottom/left order. */
    dividerSides?: Sides;
    /** A preset four-sided inset; see `ListInset`. */
    /**
     * Cap the list's content at a readable measure, plus its insets, so a page
     * column needs no application CSS. Composes with `inset="document"`.
     */
    contentWidth?: ListContentWidth;
    /** Where a `contentWidth` column sits: `center` (default) or `start`. */
    contentAlign?: 'start' | 'center';
    inset?: ListInset;
    /** Physical sides that receive the standard 17px text inset. */
    textInsets?: Sides;
    /** Physical sides that receive the standard 8px control inset. Text insets win on overlap. */
    controlInsets?: Sides;
    className?: string;
    /**
     * Safe `data-*`, `aria-*`, and structural `role` metadata (a named drop
     * `region`, `aria-busy`); List-owned structural attributes remain
     * protected, and a multi-select List owns its grid role and name.
     */
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
declare function List({ children, selectionMode, ariaLabel, gap, flex, fill, hAlign, vAlign, scrollable, scrollClearance, frame, maxHeight, minHeight, surface, inset, contentWidth, contentAlign, dividerSides, textInsets, controlInsets, className, rootAttributes, slot, }: ListProps): kerfjs.SafeHtml;

export { CssFlex, CssFlexKeyword, CssLength, HorizontalAlignment, List, type ListConfig, type ListContentWidth, type ListInset, type ListProps, type ListSurface, ListVerticalAlignment, ScrollClearance, Sides, UiGap };
```

## `@kerfjs/ui/list-action-row`

```ts
import { SafeHtml } from 'kerfjs';
import { L as ListIconTile } from './list-icon-tile-B8dr97OW.js';
export { a as ListIconTileColor, b as ListIconTileTone } from './list-icon-tile-B8dr97OW.js';
import { PopupMenuEntry, PopupMenuPlacement } from './popup-menu.js';
import './css-values.js';
import './semantic-content-BbzjvSu9.js';

type ListActionRowRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-has-icon'?: never;
    'data-icon-tile'?: never;
    'data-icon-tile-tone'?: never;
    'data-multiline'?: never;
    'data-density'?: never;
    'data-divider'?: never;
    'data-busy'?: never;
    'data-trailing-visibility'?: never;
    'data-state'?: never;
    'data-selected'?: never;
    'data-pressed'?: never;
    'data-dragging'?: never;
    'data-drop-position'?: never;
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
/** A trailing overflow `PopupMenu` rendered as the row's sibling trailing control. */
interface ListActionRowTrailingMenu {
    /** Accessible name of the icon-only menu trigger, such as `Actions for report.json`. */
    label: string;
    /** Decorative trigger icon, typically a `MoreHorizontal` `LucideIcon`. */
    icon: SafeHtml;
    /** The menu's commands, headings, and dividers; items dispatch their own `data-action`s. */
    items: readonly PopupMenuEntry[];
    /** Where the menu opens relative to its trigger. Defaults to `bottom-end`. */
    placement?: PopupMenuPlacement;
    disabled?: boolean;
}
interface ListActionRowTrailingButtonProps {
    trailingAction: string;
    trailingActionLabel: string;
    /** Decorative dormant content for the trailing button. Must not contain interactive descendants. */
    trailingActionIcon: SafeHtml;
    trailingActionDisabled?: boolean;
    trailingActionTitle?: string;
    trailingActionAttributes?: ListActionRowTrailingAttributes;
    trailingMenu?: never;
}
interface ListActionRowTrailingMenuProps {
    /** A trailing overflow menu in place of the trailing button. Import `@kerfjs/ui/popup-menu/register` once. */
    trailingMenu: ListActionRowTrailingMenu;
    trailingAction?: never;
    trailingActionLabel?: never;
    trailingActionIcon?: never;
    trailingActionDisabled?: never;
    trailingActionTitle?: never;
    trailingActionAttributes?: never;
}
interface ListActionRowCommonProps {
    /** Visible dormant content for the primary button. Must not contain interactive descendants. */
    label: string | SafeHtml;
    description?: string | SafeHtml;
    status?: string | SafeHtml;
    busy?: boolean;
    /** Row height: `standard` is 44px; `compact` is 36px (42px with `iconTile`), the height of a compact `ListItem`. */
    density?: 'standard' | 'compact';
    divider?: 'none' | 'before' | 'after' | 'both';
    /** Decorative dormant content for the primary button. Must not contain interactive descendants. */
    icon?: SafeHtml;
    /** Present `icon` in a filled 32px rounded tile with an 18px glyph: a quiet tone preset, or `{ color, foreground? }` for an application color. */
    iconTile?: ListIconTile;
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
    /** Native HTML drag source (`draggable="true"` on the row root); a placeholder is never draggable. Pair with `wireListReorder` for pointer and keyboard reordering. */
    draggable?: boolean;
    /** Dim this row as one of the rows being dragged. */
    dragging?: boolean;
    /** Draw the insertion line at this row's leading (`before`) or trailing (`after`) block edge. */
    dropPosition?: 'before' | 'after';
    trailingActionVisibility?: 'always' | 'interaction';
    className?: string;
    rootAttributes?: ListActionRowRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** Exactly one trailing control: a native button (`trailingAction*`) or an overflow menu (`trailingMenu`). */
type ListActionRowProps = ListActionRowCommonProps & (ListActionRowTrailingButtonProps | ListActionRowTrailingMenuProps);
declare function ListActionRow({ label, description, status, busy, density, divider, icon, iconTile, action, itemId, selected, pressed, accessibleLabel, title, multiline, state, disabled, tabIndex, placeholder, draggable, dragging, dropPosition, trailingAction, trailingActionLabel, trailingActionIcon, trailingActionDisabled, trailingActionTitle, trailingActionVisibility, trailingMenu, className, rootAttributes, trailingActionAttributes, slot, }: ListActionRowProps): SafeHtml;

export { ListActionRow, type ListActionRowProps, type ListActionRowTrailingMenu, ListIconTile };
```

## `@kerfjs/ui/list-item`

```ts
import { SafeHtml } from 'kerfjs';
import { L as ListIconTile } from './list-icon-tile-B8dr97OW.js';
export { a as ListIconTileColor, b as ListIconTileTone } from './list-icon-tile-B8dr97OW.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import './css-values.js';

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
    'data-icon-tile'?: never;
    'data-icon-tile-tone'?: never;
    'data-dragging'?: never;
    'data-drop-position'?: never;
}>;
interface ListItemProps {
    label: string | SafeHtml;
    /** App-owned supporting text rendered in the component's stable label stack. */
    description?: string | SafeHtml;
    icon?: SafeHtml;
    /** Present `icon` in a filled 32px rounded tile with an 18px glyph: a quiet tone preset, or `{ color, foreground? }` for an application color. */
    iconTile?: ListIconTile;
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
    /** Native HTML drag source (`draggable="true"`); a placeholder is never draggable. Pair with `wireListReorder` for pointer and keyboard reordering. */
    draggable?: boolean;
    /** Dim this row as one of the rows being dragged. */
    dragging?: boolean;
    /** Draw the insertion line at this row's leading (`before`) or trailing (`after`) block edge. */
    dropPosition?: 'before' | 'after';
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
declare function ListItem({ label, description, icon, iconTile, trailing, status, busy, density, divider, selected, action, itemId, className, pressed, accessibleLabel, title, multiline, multilineIconAlign, state, disabled, tabIndex, placeholder, draggable, dragging, dropPosition, rootAttributes, slot, }: ListItemProps): SafeHtml;
/** A navigation row with native link activation and ListItem geometry. */
declare function ListItemLink({ href, external, label, description, icon, iconTile, trailing, status, busy, density, divider, selected, itemId, className, accessibleLabel, title, multiline, multilineIconAlign, state, disabled, tabIndex, placeholder, draggable, dragging, dropPosition, rootAttributes, slot, }: ListItemLinkProps): SafeHtml;

export { ListIconTile, ListItem, ListItemLink, type ListItemLinkProps, type ListItemProps };
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
import { S as SemanticTone } from './semantic-tone-CdW013KF.js';

/**
 * Base surface treatment, semantic status colors, or `brand-loud`: the solid
 * brand fill with its on-loud foreground (a transcript's own messages).
 */
type ContentItemAppearance = 'transparent' | 'surface' | 'brand-loud' | SemanticTone;
/**
 * A chat-bubble layout for transcripts: the item fits its content up to 80%
 * of the row and sits at the `start` (other participants) or `end` (the
 * person's own messages) of the line.
 */
type ContentItemBubble = 'start' | 'end';
/** Whether the item's always-reserved 1px border is transparent or visible. */
type ContentItemFrame = 'none' | 'framed';
/** Corner shape: the 12px rounded rectangle or the 22px pill. */
type ContentItemShape = 'rounded' | 'pill';
/** `single` uses an option; `multiple` uses a grid row; `toggle` uses a pressed button. */
type ContentItemSelectionMode = 'none' | 'single' | 'multiple' | 'toggle';
type ContentItemRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-appearance'?: never;
    'data-outlined'?: never;
    'data-bubble'?: never;
    'data-grid-row'?: never;
}>;
type ContentItemInteractiveRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-appearance'?: never;
    'data-outlined'?: never;
    'data-bubble'?: never;
    'data-grid-row'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-interactive'?: never;
    'data-selected'?: never;
    'data-disabled'?: never;
    'data-selection-mode'?: never;
    'data-kui-pressed'?: never;
}>;
interface ContentItemBaseProps {
    /**
     * Coordinated background, border, and foreground colors. `transparent`
     * preserves the surrounding surface; `surface` paints the base surface;
     * semantic values match StateBanner. Defaults to `transparent`.
     */
    appearance?: ContentItemAppearance;
    /** Item content; a plain string is allowed for bare copy. */
    children?: KerfUiContent | string;
    /**
     * `framed` paints the standard neutral border in the 1px the item always
     * reserves, so framing never changes geometry. Frame only an item that
     * marks a real distinction. Defaults to `none` (transparent border).
     */
    frame?: ContentItemFrame;
    /** Remove block padding and block borders while retaining inline geometry. */
    flush?: boolean;
    /** Corner shape. Defaults to `rounded`. */
    shape?: ContentItemShape;
    /**
     * Lay the item out as a chat bubble: content width up to 80% of the row,
     * at the `start` or `end` of the line. Pair `end` with `brand-loud` for the
     * person's own messages. Omit for an ordinary full-width item.
     */
    bubble?: ContentItemBubble;
    /** Native hover tooltip. */
    title?: string;
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
    /** Keep the standard focus outline visible, such as for a drop target. */
    outlined?: boolean;
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
    /** Opt into keyboard (`0`) or programmatic (`-1`) focus. */
    tabIndex?: 0 | -1;
    /**
     * A non-selectable row of a multi-select `List` or `Grid`: renders
     * `role="row"` around a `gridcell`, with no `aria-selected` and no
     * Tab stop of its own, for content between selectable rows (an
     * activity group, a "messages skipped" divider). Its controls stay
     * reachable by Tab; arrow keys skip it.
     */
    gridRow?: boolean;
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
    tabIndex?: never;
    /** An interactive item is already a row in a multi-select grid. */
    gridRow?: never;
    /** Safe app metadata; interaction attributes are component-owned. */
    rootAttributes?: ContentItemInteractiveRootAttributes;
});
/**
 * One self-contained `.kui-content` child: an 8px inline margin, a real 1px
 * border (transparent unless `framed`), 8px padding, and a rounded or pill
 * radius. It owns that whole geometry, so wrappers must not add more.
 */
declare function ContentItem({ appearance, children, frame, flush, shape, bubble, title, ariaLabel, focusTarget, outlined, tabIndex, gridRow, interactive, action, itemId, selectionMode, selected, disabled, className, rootAttributes, slot, }: ContentItemProps): kerfjs.SafeHtml;

export { ContentItem, type ContentItemAppearance, type ContentItemBubble, type ContentItemFrame, type ContentItemProps, type ContentItemSelectionMode, type ContentItemShape, SemanticTone };
```

## `@kerfjs/ui/value-table`

```ts
import * as kerfjs from 'kerfjs';
import { SafeHtml } from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { CssLength } from './css-values.js';

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

/** `columns` keeps label and value side by side; `stacked` puts each value under its label. */
type ValueTablePresentation = 'columns' | 'stacked';
/** Table width below which columns stack: `compact` is 512px, `narrow` 576px. */
type ValueTableStackBelow = 'compact' | 'narrow';
interface ValueTableProps {
    label: string;
    /** Compact row spacing for metadata-dense surfaces. */
    density?: 'default' | 'compact';
    /**
     * Minimum width of the label column (for example `px(160)`); the value then
     * takes the rest of the row. Omitted, label and value share the row by
     * content.
     */
    labelWidth?: CssLength;
    /** Side-by-side columns (default) or values stacked under their labels. */
    presentation?: ValueTablePresentation;
    /**
     * Stack the rows only while the table itself is narrower than the preset,
     * so one table reads as columns in a wide dialog and stacks on a phone.
     */
    stackBelow?: ValueTableStackBelow;
    className?: string;
    children: KerfUiContent;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function ValueTable({ label, density, labelWidth, presentation, stackBelow, className, children, slot, }: ValueTableProps): kerfjs.SafeHtml;

export { ValueTable, type ValueTablePresentation, type ValueTableProps, ValueTableRow, type ValueTableRowProps, type ValueTableStackBelow };
```

## `@kerfjs/ui/tab-bar-item`

```ts
import { SafeHtml } from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type TabBarItemRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
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
type TabBarItemPresentation = 'pill' | 'segmented' | 'icon-only';
type TabBarItemSize = 'default' | 'compact';
type TabBarItemNameOverflow = 'ellipsis' | 'visible';
interface TabBarItemProps {
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
    presentation?: TabBarItemPresentation;
    /** Compact tabs use the 32px application-rail height. */
    size?: TabBarItemSize;
    /** Maximum visible label width in CSS pixels before ellipsis. */
    labelMaxWidth?: number;
    /** Keep the full name visible for an inline loading treatment. */
    nameOverflow?: TabBarItemNameOverflow;
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
    rootAttributes?: TabBarItemRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function TabBarItem({ id, name, selected, attention, dropTarget, pinned, closable, draggable, leading, trailing, presentation, size, labelMaxWidth, nameOverflow, closeIcon, selectAction, closeAction, className, placeholder, pending, rootAttributes, slot, }: TabBarItemProps): SafeHtml;

export { TabBarItem, type TabBarItemNameOverflow, type TabBarItemPresentation, type TabBarItemProps, type TabBarItemSize };
```

## `@kerfjs/ui/tab-bar`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type TabActivation = 'automatic' | 'manual';
type TabBarAllocation = 'intrinsic' | 'fill';
type TabBarPresentation = 'rail' | 'segmented' | 'inspector';
type TabBarTrailingPlacement = 'separate' | 'adjacent';
/** Tablist width where segmented TabBarItems switch to icon-only. */
type TabBarIconOnlyAt = 'wide' | 'narrow' | 'compact';
interface TabBarProps {
    id: string;
    label: string;
    children: KerfUiContent;
    leading?: KerfUiContent;
    /** Tab-local action: a ToolbarControlGroup or a standalone Web Awesome button. */
    trailing?: KerfUiContent;
    /**
     * Action pinned to the far edge of the bar. Combine with an adjacent `trailing`
     * action when the tab-local and workspace-level actions must remain distinct.
     * Accepts a ToolbarControlGroup or a standalone Web Awesome button.
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
    /** How available strip width is allocated across child TabBarItems. */
    allocation?: TabBarAllocation;
    /** Named strip chrome for application rails, segmented tabs, or inspectors. */
    presentation?: TabBarPresentation;
    /** Switch segmented TabBarItems to icon-only at tablist widths of 832, 704, or 448px. Each tab needs a leading icon. */
    iconOnlyAt?: TabBarIconOnlyAt;
    /** Keep a trailing action beside the final tab or at the far edge of the bar. */
    trailingPlacement?: TabBarTrailingPlacement;
    /** Settle scrolling peers at whole-tab starts; wireTabBars measures a pinned leading tab's inset. */
    snapTabs?: boolean;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** Render a controlled tab strip. The application owns selection, order, and persistence. */
declare function TabBar({ id, label, children, leading, trailing, end, className, activation, allocation, presentation, iconOnlyAt, trailingPlacement, snapTabs, slot, }: TabBarProps): kerfjs.SafeHtml;

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
     * and `TabNavigator`'s chrome around its active region, and every `TabBar`
     * strip).
     */
    targets?: readonly ScrollDividerTarget[];
}
type Root = HTMLElement | Document;
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
 *   and every `TabNavigator`'s bar under its active scene: the chrome shows a
 *   bottom (top chrome) or top (bottom toolbar, bar) divider. The scroller is
 *   whichever element actually scrolls there: the view or scene itself, or,
 *   through a sole child with no chrome of its own on that edge, a `Pane`'s
 *   content or a nested `NavStack` / `TabNavigator` region (a Pane's own header
 *   or footer draws that boundary instead);
 * - every `TabBar` strip: the bar draws a divider on each side of the strip
 *   whose tabs are scrolled out of view;
 * - each app-owned `targets` pairing: a `Toolbar` or `List` named as chrome
 *   draws the divider on its facing side.
 *
 * It also measures every `Pane` header laid over its content
 * (`headerPresentation="overlay"`, with fixed chrome placement): it publishes
 * the header's border-box block size on the Pane root as the inherited
 * `--kui-scroll-clearance-block-start` context, and marks the root
 * `data-header-overlay="measured"`, which moves the header over the content
 * and has the content clear it. The measurement follows the header as it
 * wraps, zooms, or changes content, and both are restored before paint if a
 * re-render drops them.
 *
 * Structure is re-read after every DOM change below root that can change a
 * pairing — a structural element or target id added, removed, or re-classed;
 * mutations inside scrolled content (a row's class, a list's rows) do not
 * re-read it. Either way the scrollers are re-measured once the next frame
 * has laid out, before it paints, so a large render never forces a layout
 * (where `ResizeObserver` is missing, structure is measured at once and
 * content in the next animation frame) — and a re-render that drops the
 * attributes gets them back before paint.
 * Scroll is tracked with one capturing listener per registered root, and size
 * changes of each scroller and its children with a `ResizeObserver`. Overlapping registrations
 * share one attribute writer; each disposer removes its registration, and the
 * final disposer removes the wiring-owned attributes. See
 * `docs/23-app-layouts.md` §3.7.
 */
declare function wireScrollDividers(root: Root, { targets }?: WireScrollDividersOptions): () => void;

export { type ScrollDividerTarget, type WireScrollDividersOptions, wireScrollDividers };
```

## `@kerfjs/ui/wire-overlay-sheets`

```ts
/**
 * Give every resizable core `kerfjs/overlay` bottom sheet opened in
 * `container` the resize grabber a `resizable` `DialogSurface` sheet has: a
 * `role="separator"` at the sheet's top edge that resizes its visible height
 * by drag or keyboard (arrows, Page Up/Down, Home, End), between
 * `--kui-overlay-sheet-min-height` (160px) and the sheet's cap below the top
 * safe area. A sheet opts in with the `kui-overlay-sheet-resizable` class
 * (`overlay()` and the promise dialogs alike) and opens at its content
 * height each time.
 *
 * kerf appends each overlay to its `container` (`document.body` by
 * default), so call this once per container you open sheets in. The grabber
 * is `data-morph-preserve` and returns to the top of the sheet after each
 * re-render of the overlay's content. Requires
 * `@kerfjs/ui/overlay-sheet.css`. Returns a disposer that removes every
 * grabber and stops watching.
 */
declare function wireOverlaySheets(container?: ParentNode): () => void;

export { wireOverlaySheets };
```

## `@kerfjs/ui/wire-list-reorder`

```ts
/** Which edge of the target row the moved rows land beside. */
type ListDropPosition = 'before' | 'after';
/** How the person asked for the move. */
type ListReorderSource = 'pointer' | 'keyboard';
/** The row the moved rows land beside, and on which side of it. */
interface ListReorderTarget {
    id: string;
    position: ListDropPosition;
}
/** One requested reorder. The application applies it to its own ordered state. */
interface ListReorder {
    /** The containing list's `data-list-id`, when it has one. */
    listId?: string;
    /** The moved rows' `itemId`s, in their current order. */
    sourceIds: string[];
    target: ListReorderTarget;
    source: ListReorderSource;
}
interface WireListReorderOptions {
    /** Apply the change synchronously (for example with `reorderListItems`) and re-render. */
    onReorder: (change: ListReorder) => void;
}
/**
 * Move `sourceIds` (kept in their current relative order) to `target`'s side
 * of the target row. Returns a new array; an unknown target, a target that is
 * itself being moved, or no known sources leave the order unchanged.
 */
declare function reorderListItems<T>(items: readonly T[], getId: (item: T) => string, sourceIds: readonly string[], target: ListReorderTarget): T[];
/**
 * Wire native drag-and-drop and Alt+Shift+ArrowUp/ArrowDown reordering for
 * draggable `ListItem`, `ListItemLink`, and `ListActionRow` rows below `root`.
 * Rows reorder within their `List` (or parent element) and are identified by
 * `itemId`. Dragging a selected or pressed row moves every selected row of
 * its list. While a pointer drag is in progress the wiring paints the same
 * `data-dragging` / `data-drop-position` attributes the rows' `dragging` and
 * `dropPosition` props render. Order stays application state: `onReorder`
 * reports the change and the application re-renders. Returns a disposer.
 */
declare function wireListReorder(root: HTMLElement | Document, { onReorder }: WireListReorderOptions): () => void;

export { type ListDropPosition, type ListReorder, type ListReorderSource, type ListReorderTarget, type WireListReorderOptions, reorderListItems, wireListReorder };
```

## `@kerfjs/ui/wire-list-focus-scroll`

```ts
type Root = HTMLElement | Document;
/**
 * Bring a keyboard-focused row of a `scrollable` List below `root` fully into
 * view, focus ring included. Engines differ on how `focus()` scrolls a partly
 * hidden row: Chromium scrolls it to the nearest edge plus scroll padding,
 * Firefox waits until about half of it is hidden and then centers it, and
 * WebKit leaves it where it is. On `focusin`, when the newly focused element
 * matches `:focus-visible` and its ring crosses the nearest scrollable List's
 * clip, this calls `scrollIntoView({ block: 'nearest', inline: 'nearest' })`,
 * which honors the List's ring-room scroll padding in every engine. Pointer
 * focus is left alone, so a click never scrolls the row out from under the
 * pointer. Returns a disposer.
 */
declare function wireListFocusScroll(root: Root): () => void;

export { wireListFocusScroll };
```

## `@kerfjs/ui/nav-stack`

```ts
export { c as NavStack, d as NavStackBottomToolbarPresentation, e as NavStackChromePresentation, N as NavStackProps, f as NavStackToolbarConfig, a as NavStackView, g as NavStackViewBottomToolbar, h as NavStackViewToolbar } from './nav-stack-CU_0dKtI.js';
import 'kerfjs';
import './semantic-content-BbzjvSu9.js';
import './pane.js';
import './scroll-clearance-BikHljTc.js';
import './css-values.js';
import './list.js';
import './extension-attributes-mu8MFUl0.js';
import './flex-alignment-4ms8ZbV8.js';
import './sides-BPSWde0A.js';
import './panel-toolbar-vg6Ir5Dy.js';
import './toolbar.js';
import './lucide-icon.js';
import 'lucide';
import './toolbar-text.js';
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
import { N as NavStackProps, a as NavStackView } from './nav-stack-CU_0dKtI.js';
import { ResizableRegionProps } from './resizable-region.js';
import './pane.js';
import './scroll-clearance-BikHljTc.js';
import './css-values.js';
import './list.js';
import './extension-attributes-mu8MFUl0.js';
import './flex-alignment-4ms8ZbV8.js';
import './sides-BPSWde0A.js';
import './panel-toolbar-vg6Ir5Dy.js';
import './toolbar.js';
import './lucide-icon.js';
import 'lucide';
import './toolbar-text.js';

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
/**
 * One compact view's top- and bottom-toolbar content and pinned footer (see
 * `NavStackView`).
 */
type SplitViewCompactViewToolbars = Pick<NavStackView, 'toolbar' | 'bottomToolbar' | 'footer'>;
/**
 * The compact `NavStack`'s configuration: its toolbar configuration, back
 * control, persistent bottom toolbar, chrome dividers, and chrome and
 * bottom-toolbar presentations forward to the stack, and `list` / `detail`
 * give each view its own toolbar groups.
 */
interface SplitViewCompactStack extends Pick<NavStackProps, 'toolbarConfig' | 'backIcon' | 'backText' | 'hideToolbar' | 'bottomToolbar' | 'chromeDividers' | 'chromePresentation' | 'bottomToolbarPresentation'> {
    /** Toolbar content for the list (root) view. */
    list?: SplitViewCompactViewToolbars;
    /** Toolbar content for the pushed detail view. */
    detail?: SplitViewCompactViewToolbars;
}
/**
 * The fixed list column's width: a size in CSS pixels, or that size capped
 * at a fraction of the SplitView's own width so a narrow container (a
 * dialog, a small window) always leaves the detail in view.
 */
type SplitViewListWidth = number | {
    /** Preferred width in CSS pixels. */
    size: number;
    /** Largest share of the SplitView's width, greater than 0 and at most 1. */
    maxFraction?: number;
};
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
    /**
     * The fixed split's list column width (default 320px). A number is CSS
     * pixels; `{ size, maxFraction }` caps it at that share of the SplitView's
     * width. A resizable split sizes its list with `resizable` instead.
     */
    listWidth?: SplitViewListWidth;
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
declare function SplitView({ id, label, list, detail, compact, detailActive, listTitle, detailTitle, backLabel, compactStack, resizable, listWidth, className, slot, }: SplitViewProps): kerfjs.SafeHtml;

export { SplitView, type SplitViewCompactStack, type SplitViewCompactViewToolbars, type SplitViewListWidth, type SplitViewProps, type SplitViewResizable };
```

## `@kerfjs/ui/pane`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { S as ScrollClearance } from './scroll-clearance-BikHljTc.js';
import { CssColor } from './css-values.js';

/**
 * What clear (fully transparent) chrome fades in as content scrolls beneath
 * it: `none` stays clear; `material` fades in the translucent chrome
 * material; `surface` fades in the opaque surface. The fade tracks the scroll
 * over `scrollEdgeDistance` (opacity only), from the scroll state
 * `wireScrollDividers` reports; unwired, the chrome stays clear.
 */
type ScrollEdge = 'none' | 'material' | 'surface';

/** The color scheme an app declares for a {@link SurfaceTint}'s color. */
type SurfaceTintScheme = 'light' | 'dark';
/**
 * A scoped tint for a layout surface: the app's color (usually sampled from
 * artwork it already knows) and the scheme that color belongs to. Kerf does no
 * color detection; `scheme` says whether the color reads as a light or a dark
 * surface. Inside the scope the surface, raised surface, text, quiet text, and
 * everything built on them (quiet fills, separators' backdrop, the chrome
 * material) re-derive from the color, with lightness clamped so text keeps
 * WCAG AA over any color.
 */
interface SurfaceTint {
    color: CssColor;
    scheme: SurfaceTintScheme;
    /**
     * An optional accent (usually the artwork's most vivid color). The scope's
     * brand ramp re-derives from it: loud fills and their text, brand text and
     * links, text on brand fills, and the focus ring, each clamped to keep AA.
     */
    accent?: CssColor;
}

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
    'data-background'?: never;
    'data-kui-tint'?: never;
    'data-kui-tint-accent'?: never;
    'data-deep-inset'?: never;
    'data-outlined'?: never;
    'data-scroll-clearance'?: never;
    'data-header-presentation'?: never;
    'data-header-material'?: never;
    'data-scroll-edge'?: never;
    'data-scroll-edge-distance'?: never;
    'data-header-overlay'?: never;
    'data-compact-header'?: never;
    'data-compact-footer'?: never;
    'data-compact-header-open'?: never;
    'data-compact-footer-open'?: never;
}>;
/** How a Pane's header and footer relate to its scrolling content. */
type PaneChromePlacement = 'fixed' | 'auto';
/**
 * How a header or footer behaves when the pane's container presents
 * compactly (a `NavStack` view, a `TabNavigator` scene, a full-screen dialog,
 * or a compact `Workbench`): `fixed` stays docked and shrinks the content
 * area; `scroll` sits inline with the content (a footer settles at the end
 * and scrolls past when the content is longer); `overlay` lies over the
 * content on the chrome material, shown only while the app opens it.
 */
type PaneCompactChrome = 'fixed' | 'scroll' | 'overlay';
/** The compact chrome policy for a Pane's header and footer. */
interface PaneCompactChromePolicy {
    header?: PaneCompactChrome;
    footer?: PaneCompactChrome;
}
/**
 * When a Pane draws the divider between its pinned header or footer and its
 * scrolling content: `scroll` while content is scrolled away beneath that
 * chrome, as `wireScrollDividers` reports; `always`; or `none`.
 */
type PaneChromeDividers = 'scroll' | 'always' | 'none';
/**
 * How a Pane's header relates to its scrolling content: `docked` in its own
 * row above the content, or `overlay` laid over the content's top edge on the
 * translucent chrome material, so content scrolls visibly beneath it.
 * `clear` lays it over
 * the same edge fully transparent, for chrome over imagery: legibility comes
 * from glass control groups or a scrim, and with `scrollEdge="material"` the
 * chrome material fades in once content scrolls beneath it.
 */
type PaneHeaderPresentation = 'docked' | 'overlay' | 'clear';
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
    /**
     * `docked` (default) gives the header its own row above the scrolling
     * content. `overlay` lays the header over the content's top edge on the
     * translucent chrome material (`--kui-chrome-material`, opaque under
     * `prefers-reduced-transparency`, forced colors, or without
     * `backdrop-filter`), so content scrolls visibly beneath it. Once
     * `wireScrollDividers` (`@kerfjs/ui/wire-scroll-dividers`) is wired above
     * the pane it measures the header and publishes its height as the
     * `--kui-scroll-clearance-block-start` context, which the content adds to
     * its block-start padding and `scroll-padding` without any
     * `scrollClearance` prop, so the first item, and anything focused or
     * scrolled into view, rests clear of the header. Until then, and with
     * `chromePlacement="auto"`, the header stays docked. Keep overlay header
     * text in the normal text color: quiet text can fall below AA over the
     * content passing beneath it.
     */
    /**
     * What the header and footer do when the pane's container presents
     * compactly (default `fixed`); roomy containers ignore it. The container
     * interprets it, so set it on panes inside a `NavStack`, `TabNavigator`,
     * full-screen dialog, or `Workbench`.
     */
    compactChrome?: PaneCompactChromePolicy;
    /**
     * Which `overlay` compact chrome is showing. The app owns it and flips it
     * from a control the person can reach while the chrome is hidden.
     */
    compactChromeOpen?: {
        header?: boolean;
        footer?: boolean;
    };
    headerPresentation?: PaneHeaderPresentation;
    /**
     * With `headerPresentation="clear"`, `material` fades the chrome material
     * in behind the header once content scrolls beneath it (default `none`).
     */
    scrollEdge?: ScrollEdge;
    /**
     * The scroll distance, in CSS pixels, over which the scroll edge fades in
     * (default 60).
     */
    scrollEdgeDistance?: number;
    /** Paint the scrolling work surface with the shared lowered-surface color. */
    appearance?: PaneAppearance;
    /**
     * Paint the whole pane, header and footer included, in an app-chosen color
     * (`uiColor('surface-raised')`, `fillColor('#1f2a44')`, or `colorVar(…)`
     * from `@kerfjs/ui/css-values`). It replaces the appearance's fill: a sunken
     * pane drops its lowered color and grain. Omitted, the pane keeps its
     * default (transparent, or the sunken surface). Forced colors paint
     * `Canvas`. Keep text at AA over the color; a dark color needs a matching
     * tint or dark tones for its content.
     */
    background?: CssColor;
    /**
     * A scoped tint: `{ color, scheme }`, the app's color and the scheme it
     * belongs to. The pane paints the tinted surface (unless `background` is
     * set) and its whole subtree, chrome material and quiet fills included,
     * re-derives its surface and text tokens from the color with lightness
     * clamped to keep text at WCAG AA. Without relative color syntax, or under
     * `prefers-contrast: more`, the scope keeps the plain palette in the
     * declared scheme.
     */
    tint?: SurfaceTint;
    /**
     * Clear chrome that lies over the scrolling content's block-start and/or
     * block-end edge, such as a `DialogSurface` floating footer over a filling
     * Pane. The content scroller adds the inherited
     * `--kui-scroll-clearance-block-*` context that chrome publishes to its block
     * padding and `scroll-padding`, so content scrolls visibly beneath the chrome
     * while its first and last items (and anything focused or scrolled into
     * view) can still rest clear of it. Defaults to none.
     */
    scrollClearance?: ScrollClearance;
    /** Add 8px to every side of scrolling content (default: false). */
    deepInset?: boolean;
    /** Opt into keyboard (`0`) or programmatic (`-1`) focus on the Pane root. */
    tabIndex?: 0 | -1;
    /** Keep the standard focus outline visible, such as for a drop target. */
    outlined?: boolean;
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
type PaneConfig = Pick<PaneProps, 'contentElement' | 'contentLabel' | 'separators' | 'safeAreaEdges' | 'chromeDividers' | 'compactChrome' | 'compactChromeOpen' | 'headerPresentation' | 'scrollEdge' | 'scrollEdgeDistance' | 'appearance' | 'background' | 'tint' | 'deepInset' | 'scrollClearance' | 'tabIndex' | 'outlined'>;
/**
 * An unpadded application column with optional fixed header/footer slots and one
 * scrolling vertical content owner. Separator lines are independently opt-in on
 * each logical edge, so the same component works as a sidebar, main area,
 * inspector, or dialog column.
 */
declare function Pane({ header, children, footer, chromePlacement, chromeDividers, compactChrome, compactChromeOpen, headerPresentation, scrollEdge, scrollEdgeDistance, appearance, background, tint, deepInset, scrollClearance, tabIndex, outlined, element, contentElement, separators, safeAreaEdges, id, label, contentLabel, className, headerClassName, contentClassName, footerClassName, rootAttributes, slot, }: PaneProps): kerfjs.SafeHtml;

export { Pane, type PaneAppearance, type PaneChromeDividers, type PaneChromePlacement, type PaneCompactChrome, type PaneCompactChromePolicy, type PaneConfig, type PaneContentElement, type PaneElement, type PaneHeaderPresentation, type PaneProps, type PaneSeparatorSide, ScrollClearance, type ScrollEdge, type SurfaceTint, type SurfaceTintScheme };
```

## `@kerfjs/ui/workbench`

```ts
import { SafeHtml } from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { b as NavPane, N as NavStackProps } from './nav-stack-CU_0dKtI.js';
import { ListConfig } from './list.js';
import { PaneConfig } from './pane.js';
import { ResizableRegionSeparator, ResizableRegionCollapseMotion, ResizableRegionContentOverflow, ResizableRegionPresentation, ResizableRegionRestorePosition } from './resizable-region.js';
import { a as PanelToolbar, c as PanelBottomToolbar, b as PanelChromePlacement, d as PanelToggle } from './panel-toolbar-vg6Ir5Dy.js';
import { ToolbarConfig } from './toolbar.js';
import './css-values.js';
import './toolbar-text.js';
import './extension-attributes-mu8MFUl0.js';
import './flex-alignment-4ms8ZbV8.js';
import './scroll-clearance-BikHljTc.js';
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
type WorkbenchPanelBottomToolbar = PanelBottomToolbar;
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
    /**
     * Groups after a collapsed right rail's groups, so they stay outermost,
     * such as a dialog's close control.
     */
    end?: KerfUiContent;
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
type WorkbenchChromePlacement = PanelChromePlacement;

/**
 * The Workbench container breakpoint below which a panel presents as an
 * overlay: `narrow` (704px or less) or `compact` (448px or less) — the same
 * breakpoints as `ResizableRegion`'s `responsiveFillAt` — or `never` to keep
 * it inline at every width.
 */
type WorkbenchResponsiveOverlayAt = 'compact' | 'narrow' | 'never' | number;
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
/** Region sizing, collapse, and presentation shared by either panel body. */
interface WorkbenchPanelBase {
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
    /**
     * Accessible name for the panel region, in title style. A resizable
     * panel's handle is named "Resize {label}", or "Resize Left Rail" /
     * "Resize Right Rail" / "Resize Bottom Drawer" without one.
     */
    label?: string;
    /** Opt into keyboard (`0`) or programmatic (`-1`) focus on the panel region. */
    tabIndex?: 0 | -1;
    /** Keep the standard focus outline visible while this panel is expanded. */
    outlined?: boolean;
    separator?: ResizableRegionSeparator;
    collapseMotion?: ResizableRegionCollapseMotion;
    contentOverflow?: ResizableRegionContentOverflow;
    presentation?: ResizableRegionPresentation;
    /**
     * Present the panel as an overlay, without a separator, below a Workbench
     * container breakpoint, and inline above it. `compact` and `narrow` use
     * CSS container queries; a positive number is a pixel threshold measured
     * by `wireWorkbench` and requires a `collapsed` signal. A rail overlays from its side at full
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
/** The original static panel body: one toolbar, optional fixed chrome, and one Pane. */
interface WorkbenchStaticPanel extends WorkbenchPanelBase, NavPane<WorkbenchPanelToolbar, WorkbenchPanelBottomToolbar> {
    /** The composed toolbar; marked groups and its toggle relocate on collapse. */
    toolbar?: WorkbenchPanelToolbar;
    headerPlacement?: WorkbenchChromePlacement;
    footerPlacement?: WorkbenchChromePlacement;
    navStack?: never;
}
/** A panel whose active NavStack view supplies the toolbar, fixed header, and scroll body. */
interface WorkbenchNavigationPanel extends WorkbenchPanelBase {
    navStack: Omit<NavStackProps, 'panelToggle' | 'hideToolbar' | 'className' | 'slot'>;
    /** Supplies the standard toggle; active view groups precede it and may relocate on collapse. */
    toolbar: Omit<WorkbenchPanelToolbar, 'title' | 'leading' | 'center' | 'trailing'> & {
        toggle: NonNullable<WorkbenchPanelToolbar['toggle']>;
    };
    content?: never;
    header?: never;
    headerList?: never;
    headerPlacement?: never;
    footer?: never;
    footerList?: never;
    bottomToolbar?: never;
    footerPlacement?: never;
    pane?: never;
}
/** A collapsible Workbench side rail or bottom drawer. */
type WorkbenchPanel = WorkbenchStaticPanel | WorkbenchNavigationPanel;
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
    /** Accessible name for the central region when it needs its own landmark. */
    mainLabel?: string;
    /** Opt into keyboard (`0`) or programmatic (`-1`) focus on the central region. */
    mainTabIndex?: 0 | -1;
    /** Keep the standard focus outline visible on the central region. */
    mainOutlined?: boolean;
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
    /** Dim the work area below any open overlay and absorb outside presses; off by default. */
    overlayBackdrop?: boolean;
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
declare function Workbench({ id, label, main, leftRail, rightRail, bottomDrawer, mainToolbar, mainHeader, mainFooter, mainBottomToolbar, mainHeaderPlacement, mainFooterPlacement, mainPane, mainLabel, mainTabIndex, mainOutlined, mainHeaderList, mainFooterList, mainMinSize, mainMinHeight, overlayBackdrop, className, slot, }: WorkbenchProps): SafeHtml;

export { Workbench, type WorkbenchChromePlacement, type WorkbenchCompactOverlay, type WorkbenchMainBottomToolbar, type WorkbenchMainToolbar, type WorkbenchNavigationPanel, type WorkbenchPanel, type WorkbenchPanelBottomToolbar, type WorkbenchPanelResizable, type WorkbenchPanelToggle, type WorkbenchPanelToolbar, type WorkbenchProps, type WorkbenchResponsiveOverlayAt, type WorkbenchStaticPanel };
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
    /**
     * Treat presses in a portal surface launched by this panel (for example a
     * body-level menu or dialog) as inside it. The predicate receives each Node
     * in the press's composed path; return true for the portal root. Ordinary
     * presses outside the panel and its allowed surfaces still dismiss it.
     */
    keepOpenOn?: (target: Node) => boolean;
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
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { P as PanelSide, a as PanelToolbar, b as PanelChromePlacement, c as PanelBottomToolbar, d as PanelToggle } from './panel-toolbar-vg6Ir5Dy.js';
export { e as collapsiblePanelToggleIcon } from './panel-toolbar-vg6Ir5Dy.js';
import { ToolbarConfig } from './toolbar.js';
import { ListConfig } from './list.js';
import { PaneConfig } from './pane.js';
import { ResizableRegionSeparator, ResizableRegionCollapseMotion, ResizableRegionContentOverflow, ResizableRegionPresentation, ResizableRegionRestorePosition } from './resizable-region.js';
import './lucide-icon.js';
import 'lucide';
import './css-values.js';
import './sides-BPSWde0A.js';
import './extension-attributes-mu8MFUl0.js';
import './flex-alignment-4ms8ZbV8.js';
import './scroll-clearance-BikHljTc.js';

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
type CollapsiblePanelBottomToolbar = PanelBottomToolbar;
type CollapsiblePanelChromePlacement = PanelChromePlacement;
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
    /** Opt into keyboard (`0`) or programmatic (`-1`) focus on the panel region. */
    tabIndex?: 0 | -1;
    /** Keep the standard focus outline visible while the panel is expanded. */
    outlined?: boolean;
    /** Panel content. */
    children?: KerfUiContent;
    /**
     * The panel's top toolbar, composed so its groups follow the panel's open
     * state. With it, `children` renders in a `Pane` below the toolbar; render
     * {@link CollapsiblePanelRelocated} in the app's work-area toolbar so the
     * marked groups and toggle stay reachable while the panel is collapsed.
     */
    toolbar?: CollapsiblePanelToolbar;
    /** Fixed content below a toolbar panel's top toolbar. */
    header?: KerfUiContent;
    headerList?: ListConfig;
    headerPlacement?: CollapsiblePanelChromePlacement;
    /** Fixed content above a toolbar panel's bottom toolbar. */
    footer?: KerfUiContent;
    footerList?: ListConfig;
    bottomToolbar?: CollapsiblePanelBottomToolbar;
    footerPlacement?: CollapsiblePanelChromePlacement;
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
declare function CollapsiblePanel({ id, side, collapsed, size, label, tabIndex, outlined, children, toolbar, header, headerList, headerPlacement, footer, footerList, bottomToolbar, footerPlacement, pane, separator, collapseMotion, contentOverflow, presentation, restoreControl, restorePosition, className, }: CollapsiblePanelProps): SafeHtml;
interface CollapsiblePanelRelocatedProps {
    /** The panel's `id`. */
    panelId: string;
    side: CollapsiblePanelSide;
    /** The panel's current collapsed state. */
    collapsed: boolean;
    /** The same `toolbar` the panel receives. */
    toolbar: CollapsiblePanelToolbar;
    /**
     * Density of the toolbar the groups are placed in, so the standard toggle
     * fits it (`compact` in a `density="compact"` toolbar). Defaults to
     * `default`.
     */
    density?: ToolbarConfig['density'];
}
/**
 * A collapsed {@link CollapsiblePanel}'s marked groups and standard
 * toggle, for the app's work-area toolbar — nothing while the panel is open.
 * Put it first in the leading zone for a left rail, last in the trailing zone
 * for a right rail, and last in a bottom toolbar (or a `FloatingToolbar`
 * `restoreControl`) for a bottom drawer. `wireSidebar` hands focus to it when
 * the panel closes from its own toggle.
 */
declare function CollapsiblePanelRelocated({ panelId, side, collapsed, toolbar, density, }: CollapsiblePanelRelocatedProps): SafeHtml;

export { CollapsiblePanel, type CollapsiblePanelBottomToolbar, type CollapsiblePanelChromePlacement, type CollapsiblePanelProps, CollapsiblePanelRelocated, type CollapsiblePanelRelocatedProps, type CollapsiblePanelSide, CollapsiblePanelToggle, type CollapsiblePanelToggleProps, type CollapsiblePanelToolbar, type CollapsiblePanelToolbarToggle };
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

## `@kerfjs/ui/tab-navigator`

```ts
import { SafeHtml } from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { PaneAppearance, SurfaceTint, ScrollEdge } from './pane.js';
import { CssColor } from './css-values.js';
import './scroll-clearance-BikHljTc.js';

interface TabNavigatorTabBase<Id extends string> {
    id: Id;
    label: string;
    /** Decorative icon shown above the label in the bottom bar. */
    icon?: SafeHtml;
    /** The tab's content — typically a `NavStack` so each tab keeps its own stack. */
    content: KerfUiContent;
    /** Background of this scene's scrolling work surface. */
    appearance?: PaneAppearance;
    /**
     * Paint this scene in an app-chosen color (a `@kerfjs/ui/css-values` color
     * builder). It replaces the appearance's fill. Forced colors paint `Canvas`.
     */
    background?: CssColor;
    /**
     * A scoped tint (`{ color, scheme }`) for this scene: its surfaces and every
     * descendant re-derive their surface and text tokens from the app's color
     * in the declared scheme, with lightness clamped to keep text at WCAG AA.
     */
    tint?: SurfaceTint;
    /** Add 8px to every side of a plain scene's scrolling content. */
    deepInset?: boolean;
    /** Opt into keyboard (`0`) or programmatic (`-1`) focus on this scene. */
    tabIndex?: 0 | -1;
    /** Keep the standard focus outline visible while this scene is active. */
    outlined?: boolean;
}
/** A tab with an optional count or short-status badge. */
interface TabNavigatorTabCountBadge {
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
interface TabNavigatorTabDotBadge {
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
type TabNavigatorTab<Id extends string = string> = TabNavigatorTabBase<Id> & (TabNavigatorTabCountBadge | TabNavigatorTabDotBadge);
/**
 * How a {@link TabNavigator}'s tab bar relates to the active scene: `docked`
 * below it, or `overlay` laid over its bottom edge on the translucent chrome
 * material, so the scene's content scrolls visibly beneath the bar.
 * `clear` lays it over
 * the same edge fully transparent, for chrome over imagery: legibility comes
 * from glass control groups or a scrim, and with `scrollEdge="material"` the
 * chrome material fades in once content scrolls beneath
 * it, until the scene scrolls to its end.
 */
type TabNavigatorBarPresentation = 'docked' | 'overlay' | 'clear';
interface TabNavigatorProps<Id extends string = string> {
    id: string;
    /** Accessible name for the tab bar. */
    label: string;
    tabs: readonly TabNavigatorTab<Id>[];
    /** The controlled active tab id (the app owns selection). */
    active: NoInfer<Id>;
    /**
     * The bar's top separator. `auto` (default) draws it against a sunken active
     * work surface and otherwise follows `chromeDividers`; `hidden` suppresses
     * the line, including a scroll divider.
     */
    separator?: 'auto' | 'hidden';
    /**
     * The line over the tab bar, where it meets the active scene. `scroll`
     * (default) shows it only while more of the scene's content lies below —
     * never at the scroll end or when the content fits — once
     * `wireScrollDividers` (`@kerfjs/ui/wire-scroll-dividers`) is wired above
     * the scaffold; unwired, it does not show. `always` shows it without the
     * wiring; `none` suppresses that scroll divider. A sunken active work
     * surface still draws the separator unless `separator="hidden"`. The line
     * is the bar's own 1px top border, so no state moves the bar or a tab.
     */
    chromeDividers?: 'scroll' | 'always' | 'none';
    /**
     * `docked` (default) gives the tab bar its own band below the scenes.
     * `overlay` lays it over the active scene's bottom edge on the translucent
     * chrome material (opaque under reduced transparency, increased contrast,
     * or without `backdrop-filter`; `Canvas` in forced colors), so content
     * scrolls visibly beneath it, as under an iOS tab bar. `wireTabNavigator`
     * measures the live bar (bottom safe area included) and the scenes hand
     * its height to their content as the block-end `--kui-edge-inset-*`
     * context, so a plain scene, a sole `Pane`, or a `NavStack` (and its own
     * bottom toolbar, which then sits above the bar) rests its last item clear
     * of it. Until then it stays docked. Unselected tab labels lift halfway
     * toward the normal text color to keep AA over the content beneath.
     */
    barPresentation?: TabNavigatorBarPresentation;
    /**
     * With `barPresentation="clear"`, `material` fades the chrome material in
     * behind the bar while the active scene continues beneath it (default
     * `none`).
     */
    scrollEdge?: ScrollEdge;
    /**
     * The scroll distance, in CSS pixels, over which the scroll edge fades in
     * (default 60).
     */
    scrollEdgeDistance?: number;
    /**
     * Paint the navigator, and its docked tab bar, in an app-chosen color (a
     * `@kerfjs/ui/css-values` color builder) instead of the surface. A tab's own
     * `background` paints its scene. Forced colors paint `Canvas`.
     */
    background?: CssColor;
    /**
     * A scoped tint (`{ color, scheme }`) for the navigator, its bar, and every scene: its surfaces and every
     * descendant re-derive their surface and text tokens from the app's color
     * in the declared scheme, with lightness clamped to keep text at WCAG AA.
     */
    tint?: SurfaceTint;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A mobile-first, iOS-like bottom tab navigator: a bottom tab bar that switches
 * between major sections, each tab keeping its own content (usually a `NavStack`)
 * mounted so its stack and scroll survive a switch. Controlled — the app owns
 * `active`; wire selection with `@kerfjs/ui/wire-tab-navigator`'s `wireTabNavigator`.
 * On larger classes, promote the tabs to a `Workbench` rail or sidebar instead of
 * a bottom bar. See `docs/23-app-layouts.md` §3.4.
 */
declare function TabNavigator<Id extends string>({ id, label, tabs, active, separator, chromeDividers, barPresentation, scrollEdge, scrollEdgeDistance, background, tint, className, slot, }: TabNavigatorProps<Id>): SafeHtml;

export { TabNavigator, type TabNavigatorBarPresentation, type TabNavigatorProps, type TabNavigatorTab };
```

## `@kerfjs/ui/wire-tab-navigator`

```ts
interface WireTabNavigatorOptions {
    /** Invoked with the selected tab id when a bottom-bar tab is activated. */
    onSelect: (tabId: string) => void;
}
/**
 * Wire a `TabNavigator`'s bottom tab bar: clicking a tab calls `onSelect` with its
 * id (the app then updates its controlled `active`). With
 * `barPresentation="overlay"` it also measures the live bar and lays it over
 * the scenes (see `TabNavigatorProps.barPresentation`). Returns a disposer.
 */
declare function wireTabNavigator(root: Element, options: WireTabNavigatorOptions): () => void;

export { type WireTabNavigatorOptions, wireTabNavigator };
```

## `@kerfjs/ui/resizable-region`

```ts
import { SafeHtml } from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { CssLength } from './css-values.js';

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
import { b as CatalogProps } from './types-DmHWkSd6.js';
export { a as CatalogBackgroundStyle, c as CatalogBrand, d as CatalogEntry, e as CatalogRelated, C as CatalogResource, f as CatalogSecondaryGroup, g as CatalogSection, h as CatalogSettingsConfig, i as CatalogStageRootAttributes, j as CatalogTagFilter, k as CatalogUxReview } from './types-DmHWkSd6.js';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import './toolbar.js';
import './sides-BPSWde0A.js';
import './pane.js';
import './scroll-clearance-BikHljTc.js';
import './css-values.js';
import './workbench.js';
import './nav-stack-CU_0dKtI.js';
import './list.js';
import './extension-attributes-mu8MFUl0.js';
import './flex-alignment-4ms8ZbV8.js';
import './panel-toolbar-vg6Ir5Dy.js';
import './lucide-icon.js';
import 'lucide';
import './toolbar-text.js';
import './resizable-region.js';

/**
 * Controlled, stateless component-catalog shell: a `Workbench` whose left rail
 * is the catalog navigation and whose work area is the active entry — its
 * toolbar, description, preview stage, and resource footer. The sidebar's
 * standard toggle moves into the entry toolbar while it is collapsed, and on
 * a small screen the sidebar overlays the stage like any Workbench rail.
 * An entry's `settings` render in a right-rail settings pane beside the stage,
 * with the same toggle relocation and small-screen overlay.
 */
declare function Catalog({ id, brand, sections, active, content, collapsed, theme, increasedContrast, reducedMotion, backgroundControl, headerActions, settings, settingsCollapsed, settingsPanel, uxReview, secondarySections, sidebarFooter, status, backgroundStyle, stageRootAttributes, selectAction, toggleSidebarAction, toggleThemeAction, toggleContrastAction, toggleMotionAction, selectBackgroundAction, toggleSecondaryAction, toggleSecondaryFilterAction, toggleSettingsAction, headerPlacement, footerPlacement, sidebar, mainToolbar, footerToolbar, className, slot, }: CatalogProps): kerfjs.SafeHtml;

/** How a specimen aligns its visible edge with its `ListHeader` label. */
type CatalogExampleAlign = 'glyph' | 'inline-control' | 'text-trigger' | 'none';
interface CatalogExampleViewport {
    layout?: 'grid' | 'flex' | 'flex-column';
    /** Specimen width. `sidebar` (272px, capped at the stage) shows a sidebar
     *  pane's content at a production rail's width. */
    width?: 'full' | 'sidebar' | 'compact' | 'medium' | 'wide' | 'text' | 'control';
    /** Fixed specimen height; `app` frames an application-sized recipe or layout.
     *  A fixed height is definite, so a child that fills with `height: 100%`
     *  (a horizontal `ResizableRegion`, say) spans the whole frame. */
    height?: 'short' | 'reduced' | 'medium' | 'tall' | 'app';
    /** A minimum the frame may grow past. It is not a definite height: a child
     *  sized with `height: 100%` falls back to its content height, so use
     *  `height` when the specimen must fill the frame. `app` (592px) is the
     *  application frame's height as a floor, for a stage that hosts a
     *  frame-anchored top-layer specimen above in-flow content. */
    minHeight?: 'short' | 'medium' | 'app';
    /** Names the frame as a CSS anchor (`anchor-name`), so a top-layer
     *  specimen whose own CSS sets `position-anchor` to this dashed-ident
     *  positions against the frame as it would against its production anchor.
     *  Anchor names are document-wide: give each frame on a page its own. */
    anchorName?: `--${string}`;
    /** Caps each in-flow child at a centered-or-start content column:
     *  `compact` (440px), `medium` (640px), or `wide` (864px), each capped at
     *  the frame. `[popover]` children keep their own geometry. Applies to
     *  block, `grid`, and `flex-column` flows. */
    contentWidth?: 'compact' | 'medium' | 'wide';
    /** Where a `contentWidth` column sits in the frame; default `start`. */
    contentAlign?: 'start' | 'center';
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
/**
 * A labeled catalog specimen with optional explanatory text and alignment. A
 * supplied `label` also names the rendered `section`, so each specimen is an
 * addressable region; an unlabeled example stays an ordinary grouping.
 */
declare function CatalogExample({ label, note, align, viewport, compactFallback, rootAttributes, className, children, slot, }: CatalogExampleProps): SafeHtml;

type CatalogExampleStackRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-catalog-example'?: never;
    'data-catalog-example-stack'?: never;
    'data-catalog-example-label'?: never;
    'data-catalog-example-note'?: never;
    'data-align'?: never;
    'data-width'?: never;
}>;
/**
 * How wide a stack may grow: `reading` (default) caps it at a 736px reading
 * measure for component specimens; `full` lets it span the stage for
 * application-width compositions such as boards, app shells, drawers, and
 * split views.
 */
type CatalogExampleStackWidth = 'reading' | 'full';
interface CatalogExampleStackProps {
    label?: string;
    /** Maximum width of the stack (default `reading`). */
    width?: CatalogExampleStackWidth;
    rootAttributes?: CatalogExampleStackRootAttributes;
    className?: string;
    children?: KerfUiContent;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** A vertically stacked group of catalog examples. */
declare function CatalogExampleStack({ label, width, rootAttributes, className, children, slot, }: CatalogExampleStackProps): kerfjs.SafeHtml;

/**
 * Browser helpers for UX Review region captures from a catalog. The local
 * project directory comes from `uxReviewPlugin` (`@kerfjs/ui/vite-ux-review`),
 * which serves it to the catalog page on a Vite dev or preview server; static
 * hosting has no such endpoint, so a catalog there shows no capture link.
 */
/** Where `uxReviewPlugin` serves `{ projectDirectory }`, relative to the catalog page. */
declare const UX_REVIEW_PROJECT_PATH = "__ux-review/project.json";
/** What a UX Review region capture is preset with. */
interface UxReviewCapture {
    /** The absolute project directory UX Review files the review under. */
    projectDirectory: string;
    /** The review title. */
    title: string;
    /** Review context: what was selected and where. */
    context: string;
}
/** A `uxreview://capture` link that starts a region screenshot for a project. */
declare function uxReviewCaptureUrl({ projectDirectory, title, context, }: UxReviewCapture): string;
/**
 * Ask the server that served `pageUrl` for its UX Review project directory.
 * Resolves `null` when there is none (static hosting, a server without the
 * plugin, a malformed answer, or a network failure); never rejects.
 */
declare function loadUxReviewProject(pageUrl: string | URL, fetchImpl?: typeof globalThis.fetch): Promise<string | null>;

export { Catalog, CatalogExample, type CatalogExampleAlign, type CatalogExampleProps, CatalogExampleStack, type CatalogExampleStackProps, type CatalogExampleStackWidth, type CatalogExampleViewport, CatalogProps, UX_REVIEW_PROJECT_PATH, type UxReviewCapture, loadUxReviewProject, uxReviewCaptureUrl };
```

## `@kerfjs/ui/catalog-resources`

```ts
import { C as CatalogResource } from './types-DmHWkSd6.js';
import './toolbar.js';
import 'kerfjs';
import './semantic-content-BbzjvSu9.js';
import './sides-BPSWde0A.js';
import './pane.js';
import './scroll-clearance-BikHljTc.js';
import './css-values.js';
import './workbench.js';
import './nav-stack-CU_0dKtI.js';
import './list.js';
import './extension-attributes-mu8MFUl0.js';
import './flex-alignment-4ms8ZbV8.js';
import './panel-toolbar-vg6Ir5Dy.js';
import './lucide-icon.js';
import 'lucide';
import './toolbar-text.js';
import './resizable-region.js';

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
import { a as CatalogBackgroundStyle } from './types-DmHWkSd6.js';
import './toolbar.js';
import './semantic-content-BbzjvSu9.js';
import './sides-BPSWde0A.js';
import './pane.js';
import './scroll-clearance-BikHljTc.js';
import './css-values.js';
import './workbench.js';
import './nav-stack-CU_0dKtI.js';
import './list.js';
import './extension-attributes-mu8MFUl0.js';
import './flex-alignment-4ms8ZbV8.js';
import './panel-toolbar-vg6Ir5Dy.js';
import './lucide-icon.js';
import 'lucide';
import './toolbar-text.js';
import './resizable-region.js';

interface WireCatalogOptions {
    /** Invoked with the entry id when a sidebar item or a related-entry option is chosen. */
    onSelect: (id: string) => void;
    /** Invoked when the sidebar collapse/expand control is activated. */
    onToggleSidebar?: () => void;
    /** Invoked when the theme toggle is activated. */
    onToggleTheme?: () => void;
    /** Report a contrast-toggle press; the app updates its signal and applies the preference. */
    onToggleContrast?: () => void;
    /** Report a reduced-motion-toggle press; the app updates its signal and applies the preference. */
    onToggleMotion?: () => void;
    /** Report a preview background choice; the app updates `backgroundStyle`. */
    onSelectBackground?: (style: CatalogBackgroundStyle) => void;
    /**
     * Invoked when the settings pane toggle is activated. With
     * `settingsCollapsed`, `wireCatalog` has already flipped the signal.
     */
    onToggleSettings?: () => void;
    /** Invoked when the secondary (ecosystem) group's disclosure toggle is activated. */
    onToggleSecondary?: () => void;
    /**
     * Invoked with the switch's new state when the secondary group's tag-filter
     * switch changes; the app updates `tagFilter.show`.
     */
    onToggleSecondaryFilter?: (show: boolean) => void;
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
    toggleContrastAction?: string;
    toggleMotionAction?: string;
    selectBackgroundAction?: string;
    toggleSecondaryAction?: string;
    toggleSecondaryFilterAction?: string;
    toggleSettingsAction?: string;
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
    /**
     * The settings pane's app-owned collapsed flag, rendered as the Catalog's
     * `settingsCollapsed`. With it, `wireCatalog` owns the pane's toggle (each
     * press flips the signal) and wires the pane like any Workbench rail: a
     * transient overlay on a small screen (collapsed as the breakpoint applies,
     * closed on Escape or a press outside, focus handed back).
     */
    settingsCollapsed?: Signal<boolean>;
    /**
     * The app-owned settings pane width signal for a Catalog rendered with
     * `settingsPanel={{ resizable: true, size: settingsSize.value }}`. Each
     * committed drag or keyboard resize is written to it.
     */
    settingsSize?: Signal<number>;
    /**
     * With `settingsSize`, load and save the width under this storage key so
     * the catalog remembers the user's settings pane width.
     */
    settingsStorageKey?: string;
    /** The Catalog's `id`, when it is not the default `kui-catalog`. */
    id?: string;
    /**
     * Ask the page's server once for its UX Review project directory (served by
     * `uxReviewPlugin` from `@kerfjs/ui/vite-ux-review`) and report it, so the
     * app can render the Catalog with `uxReview`. Never called on static
     * hosting or a server without the plugin.
     */
    onUxReviewProject?: (projectDirectory: string) => void;
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
 * Wire a {@link Catalog}'s interactions with one delegated listener set: sidebar
 * item selection (and the related-entry popup menu), the sidebar collapse toggle,
 * the settings pane toggle, and the theme toggle. The app owns the `active`/`collapsed`/`theme` signals and updates
 * them in the callbacks; optionally mirror the active id into the URL via `urlParam`.
 * It also wires the scroll dividers below root (`wireScrollDividers`), so the
 * catalog's panes and every example in it show their chrome dividers only
 * while scrolled. Returns a disposer.
 */
declare function wireCatalog(root: HTMLElement, { onSelect, onToggleSidebar, onToggleTheme, onToggleContrast, onToggleMotion, onSelectBackground, onToggleSecondary, onToggleSecondaryFilter, onToggleSettings, urlParam, revealSelection, selectAction, toggleSidebarAction, toggleThemeAction, toggleContrastAction, toggleMotionAction, selectBackgroundAction, toggleSecondaryAction, toggleSecondaryFilterAction, toggleSettingsAction, collapsed, sidebarSize, sidebarStorageKey, settingsCollapsed, settingsSize, settingsStorageKey, id: catalogId, onUxReviewProject, }: WireCatalogOptions): () => void;

export { type CatalogRevealOptions, type WireCatalogOptions, revealCatalogEntry, wireCatalog };
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

## `@kerfjs/ui/choice-chips`

```ts
import { SafeHtml } from 'kerfjs';
import { CssColor } from './css-values.js';

type ChoiceChipsSize = 'default' | 'compact';
/**
 * A leading color dot: a {@link CssColor} from `uiColor()`, `colorVar()`, or
 * `fillColor()`, or `'transparent'` for the no-color swatch (an outlined
 * dot struck through by a diagonal line).
 */
type ChoiceChipsSwatch = CssColor | 'transparent';
interface ChoiceChipsChoice<Value extends string = string> {
    value: Value;
    /** Visible label; it is also the radio's accessible name. */
    label: string;
    /** Leading color dot. Mutually exclusive with `icon`. */
    swatch?: ChoiceChipsSwatch;
    /** Decorative leading icon, normally an unsized LucideIcon. */
    icon?: SafeHtml;
    /** Supplementary tooltip; never the only place a choice is described. */
    title?: string;
    disabled?: boolean;
}
interface ChoiceChipsCommonProps<Value extends string> {
    /**
     * Form field name: the selected value (or, with `multiple`, every selected
     * value) submits under it.
     */
    name: string;
    choices: readonly ChoiceChipsChoice<Value>[];
    /**
     * Delegated `data-action`; listen for `change`. It sits on every native
     * input, or for `multiple: true` on the group, which `wireChoiceChips`
     * fires `change` on.
     */
    action?: string;
    size?: ChoiceChipsSize;
    /** Disable the whole group. */
    disabled?: boolean;
    /** Associate the inputs with a form outside their ancestor chain. */
    form?: string;
    id?: string;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** One exclusive value (the default), backed by native radios. */
interface ChoiceChipsSingleProps<Value extends string = string> {
    multiple?: false;
    /** The selected value. Omit (or pass `undefined`) for no selection. */
    value?: NoInfer<Value>;
    /** Require a selection for native form validation. */
    required?: boolean;
}
/**
 * Any number of values, backed by native checkboxes: each pill is its own Tab
 * stop, a click or Space toggles it alone, and every checked value submits
 * under `name`.
 */
interface ChoiceChipsToggleProps<Value extends string = string> {
    multiple: 'toggle';
    /** The checked values. Omit (or pass `[]`) for none. */
    value?: readonly NoInfer<Value>[];
    /**
     * Native `required` on a checkbox demands that one box, so a toggle group
     * has no "at least one" requirement; validate the checked set in the app.
     */
    required?: never;
}
/**
 * Any number of values with the conventional desktop selection model, as an
 * ARIA multi-select listbox: a click selects one chip, Cmd (Apple) or Ctrl
 * (elsewhere) toggles one, and Shift extends a range. The group is one Tab
 * stop; arrows move the selection, Shift+arrows extend it, Cmd/Ctrl+arrows
 * move focus alone, Space toggles, and Cmd/Ctrl+A selects all. Hidden inputs
 * submit every selected value under `name`. Requires `wireChoiceChips`.
 */
interface ChoiceChipsMultipleProps<Value extends string = string> {
    multiple: true;
    /** The selected values. Omit (or pass `[]`) for none. */
    value?: readonly NoInfer<Value>[];
    /** Validate the selected set in the app; a listbox has no native `required`. */
    required?: never;
}
/** A group is named either by a string or by a visible heading's id. */
type ChoiceChipsNaming = {
    label: string;
    labelledBy?: never;
} | {
    labelledBy: string;
    label?: never;
};
type ChoiceChipsProps<Value extends string = string> = ChoiceChipsCommonProps<Value> & (ChoiceChipsSingleProps<Value> | ChoiceChipsToggleProps<Value> | ChoiceChipsMultipleProps<Value>) & ChoiceChipsNaming;
/** Which selection model a ChoiceChips group renders. */
type ChoiceChipsSelectionMode = 'single' | 'toggle' | 'multiple';
/**
 * A wrapping set of pill chips. By default it is an exclusive radio group:
 * one Tab stop, arrow-key selection, and a real form value. With
 * `multiple: 'toggle'` it is a checkbox group: each pill toggles on its own.
 * With `multiple: true` it is a multi-select listbox with modifier-key
 * selection (wire it with `wireChoiceChips`). Each choice may lead with a
 * color swatch (including a struck-through transparent swatch) or an icon.
 */
declare function ChoiceChips<Value extends string>(props: ChoiceChipsProps<Value>): SafeHtml;

export { ChoiceChips, type ChoiceChipsChoice, type ChoiceChipsMultipleProps, type ChoiceChipsNaming, type ChoiceChipsProps, type ChoiceChipsSelectionMode, type ChoiceChipsSingleProps, type ChoiceChipsSize, type ChoiceChipsSwatch, type ChoiceChipsToggleProps };
```

## `@kerfjs/ui/message-composer`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

/**
 * Application `data-*` identity on the MessageComposer root, such as `data-key`;
 * the composer's own configuration attributes stay protected.
 */
type MessageComposerRootAttributes = Readonly<Record<`data-${string}`, string | undefined>>;
interface MessageComposerProps {
    /** The message field's accessible name, in title style ("Message"). */
    label: string;
    /** Native textarea `name`: the form field the message submits under. */
    name: string;
    /**
     * The textarea id. With a `hint`, the hint takes `<id>-hint` and becomes
     * the field's accessible description.
     */
    id?: string;
    /** The field's text: a draft to restore, or `''` after sending. */
    value?: string;
    /** Sentence-style example of what to write ("Ask about this build"). */
    placeholder?: string;
    /**
     * Visible lines while the field is empty or short (default 1). The field
     * grows with its content from here.
     */
    minRows?: number;
    /**
     * Lines the field grows to before it scrolls (default 8). At least
     * `minRows`.
     */
    maxRows?: number;
    /**
     * Quiet, sentence-style supporting copy in the action row's leading zone,
     * after any `leading` controls.
     */
    hint?: string;
    /**
     * Controls at the start of the action row, such as an attach button or a
     * model `Select`, normally in a `ToolbarControlGroup`.
     */
    leading?: KerfUiContent;
    /** Trailing controls in the action row, normally one brand Send button. */
    trailing: KerfUiContent;
    /** Disable the field; the app disables its own actions. */
    disabled?: boolean;
    /**
     * Opt in to Enter-to-send: with `wireMessageComposers` running over an ancestor,
     * Enter (or Cmd/Ctrl+Enter) in the field activates the first trailing
     * action, Shift+Enter inserts a newline, and an Enter that commits an IME
     * composition or meets an empty message does not send. The field announces
     * the shortcut with `aria-keyshortcuts`.
     */
    submitOnEnter?: boolean;
    /** Safe `data-*` identity on the root. */
    rootAttributes?: MessageComposerRootAttributes;
    className?: string;
    /** Native named-slot assignment, such as a `wa-dialog`'s `footer`. */
    slot?: string;
}
/**
 * A chat or prompt composer: a raised frame whose border turns brand while
 * focus is within, holding a borderless message field that grows with its
 * content between `minRows` and `maxRows` lines, above a compact `Toolbar`
 * action row: optional `leading` controls and `hint`, then `trailing` actions. The app owns the value and sending;
 * `submitOnEnter` with `wireMessageComposers` adds Enter-to-send.
 */
declare function MessageComposer({ label, name, id, value, placeholder, minRows, maxRows, hint, leading, trailing, disabled, submitOnEnter, rootAttributes, className, slot, }: MessageComposerProps): kerfjs.SafeHtml;

export { MessageComposer, type MessageComposerProps, type MessageComposerRootAttributes };
```

## `@kerfjs/ui/wire-message-composers`

```ts
type Root = HTMLElement | Document;
/**
 * Enter-to-send for every `MessageComposer` rendered with `submitOnEnter` below
 * root. In its field, Enter (alone or with Cmd or Ctrl) activates the
 * composer's first trailing action, so a keyboard send runs the same
 * delegated handler as a click. Shift+Enter and Alt+Enter insert a newline.
 * Nothing is sent, and no newline is inserted, when the message is empty or
 * whitespace-only, the key is auto-repeating, or the first action is
 * disabled, loading (a busy `Button` reports `aria-busy`), or
 * `aria-disabled`. An Enter that commits an IME
 * composition (`isComposing`, keyCode 229, or between `compositionstart` and
 * `compositionend`) is left to the input method. Dispose with the owning
 * application.
 */
declare function wireMessageComposers(root: Root): () => void;

export { wireMessageComposers };
```

## `@kerfjs/ui/select`

```ts
import { SafeHtml } from 'kerfjs';
import { KerfCustomElement } from 'kerfjs/jsx-runtime';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { CssForegroundColor, CssLength } from './css-values.js';
import { LucideNode } from './lucide-icon.js';
import 'lucide';

declare module 'kerfjs/jsx-runtime' {
    namespace JSX {
        interface IntrinsicElements {
            /** The Select root: a light-DOM form control defined by `select/register`. */
            'kui-select': KerfCustomElement & {
                class?: string;
                name?: string;
                value?: string;
                multiple?: boolean;
                disabled?: boolean;
                style?: string;
                slot?: string;
            };
        }
    }
}
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
type SelectPresentation = 'form' | 'toolbar-borderless' | 'navigation' | 'inline' | 'title';
type SelectSize = 'default' | 'compact';
type SelectSelectedPresentation = 'label' | 'icon-only';
type SelectFocusRingOwner = 'select' | 'group';
type SelectTriggerWidth = 'fit-content' | 'max-content' | 'fill';
interface SelectBaseProps<Value extends string = string> {
    name: string;
    choices: readonly SelectChoice<Value>[];
    className?: string;
    /** Empty-value hint text shown in the closed control. */
    placeholderText?: string;
    /** Supporting text shown below the control and announced as its description. */
    hint?: string;
    disabled?: boolean;
    /** Match menu width to the trigger; default menus grow to content within viewport gutters. */
    fitMenu?: boolean;
    /** Render as an unanimated loading skeleton: the label above a static, empty control box. */
    placeholder?: boolean;
    /** Form (default), borderless toolbar, intrinsic navigation, inline, or view-title chrome. */
    presentation?: SelectPresentation;
    size?: SelectSize;
    /** Closed trigger width; omit to keep the presentation's default. */
    triggerWidth?: SelectTriggerWidth;
    /**
     * The widest the closed trigger grows, under any presentation; its value
     * (or `renderSelected` content) ellipsizes inside it and the caret stays.
     */
    maxTriggerWidth?: CssLength;
    /** The narrowest the closed trigger gets. */
    minTriggerWidth?: CssLength;
    /** Show the disclosure caret (default); omit it for a compact icon-only trigger. */
    caret?: boolean;
    /** Let an enclosing ToolbarControlGroup paint the composed focus ring. */
    focusRingOwner?: SelectFocusRingOwner;
    /** Keep the trigger's focus ring inside its box when an ancestor clips overflow. */
    focusRingInset?: boolean;
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
 * choices and closes on an outside press, Escape, or Tab; the closed control
 * summarizes the chosen labels in choice order.
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
 * a count badge sits beside it, and the trigger's accessible name ends with
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
import { S as Sides } from './sides-BPSWde0A.js';
import { S as SemanticTone } from './semantic-tone-CdW013KF.js';

/** @deprecated Use SemanticTone. */
type StateBannerTone = SemanticTone;
type StateBannerUrgency = 'status' | 'alert';
type StateBannerCopyLayout = 'inline' | 'stacked';
type StateBannerActionPlacement = 'trailing' | 'below';
type StateBannerPresentation = 'card' | 'strip';
interface StateBannerProps {
    title: string;
    detail?: string;
    /** Optional compact status or count shown beside the title. */
    badge?: string;
    icon?: SafeHtml;
    action?: KerfUiContent;
    tone?: SemanticTone;
    urgency?: StateBannerUrgency;
    /** Keep the detail beside the title, or give it its own line. */
    copyLayout?: StateBannerCopyLayout;
    /**
     * `trailing` (the default) puts the action beside the copy while the copy
     * keeps its minimum readable width, and otherwise wraps it onto its own
     * end-aligned trailing row, at any viewport or container width. `below`
     * always gives the action that separate trailing row.
     */
    actionPlacement?: StateBannerActionPlacement;
    /**
     * `card` (the default) is an inset, rounded, fully bordered banner beside
     * the affected work. `strip` is a full-width band at a layout edge, such as
     * above a workspace: square corners, no inline margin, inline padding on the
     * shared content-text column, and only the tone-colored `dividerSides` edges.
     */
    presentation?: StateBannerPresentation;
    /**
     * Physical tone-colored divider edges of a `strip`, in canonical
     * top/right/bottom/left order. Defaults to the bottom edge; `''` draws none.
     * A `card` keeps its full border and ignores this.
     */
    dividerSides?: Sides;
    className?: string;
    /** Render the title, badge, and detail as unanimated loading skeletons, keeping the icon and tone. The detail line appears only when `detail` is set, as in the live banner. */
    placeholder?: boolean;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
declare function StateBanner({ title, detail, badge, icon, action, tone, urgency, copyLayout, actionPlacement, presentation, dividerSides, className, placeholder, slot, }: StateBannerProps): SafeHtml;

export { SemanticTone, StateBanner, type StateBannerActionPlacement, type StateBannerCopyLayout, type StateBannerPresentation, type StateBannerProps, type StateBannerTone, type StateBannerUrgency };
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
import { CssForegroundColor } from './css-values.js';
import { LucideIconSize } from './lucide-icon.js';
import 'lucide';

type LoadingSpinnerSize = LucideIconSize;
interface LoadingSpinnerProps {
    className?: string;
    /** Foreground color; omit to inherit the surrounding text color. */
    color?: CssForegroundColor;
    label?: string;
    /** Named icon scale or positive pixel size, converted to rem. Omit for 1em. */
    size?: LoadingSpinnerSize;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** Stable viewBox-centered progress ring based on svg-spinners' MIT-licensed 180-ring. */
declare function LoadingSpinner({ className, color, label, size, slot, }: LoadingSpinnerProps): kerfjs.SafeHtml;

export { LoadingSpinner, type LoadingSpinnerProps, type LoadingSpinnerSize };
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
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { CssFlexKeyword, CssFlex } from './css-values.js';

/**
 * Generate the sunken texture once for a document. Sunken surfaces call this
 * as they render; it is idempotent, and on a server (no document) or without
 * a 2D canvas it does nothing, leaving the flat lowered surface.
 */
declare function ensureSunkenTexture(doc?: Document | undefined): void;

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
    /** Opt into keyboard (`0`) or programmatic (`-1`) focus on the panel. */
    tabIndex?: 0 | -1;
    /** Keep the standard focus outline visible, such as for a drop target. */
    outlined?: boolean;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A lowered application surface with one compact inset and a vertical content
 * stack. The panel owns its background and padding; children own their own
 * borders and internal geometry.
 */
declare function SunkenPanel({ children, ariaLabel, shape, flex, fill, tabIndex, outlined, className, slot, }: SunkenPanelProps): kerfjs.SafeHtml;

export { SunkenPanel, type SunkenPanelProps, type SunkenPanelShape, ensureSunkenTexture };
```

## `@kerfjs/ui/search-field`

```ts
export { S as SearchField, a as SearchFieldEditorAttributes, d as SearchFieldProps, j as SearchFieldToken, k as SearchFieldTrailingAction, l as SearchFieldTrailingActionAttributes, m as SearchFieldValue, p as placeSearchFieldCaret, r as readSearchField } from './search-field-CrGTN5sa.js';
import 'kerfjs';
import './semantic-content-BbzjvSu9.js';
```

## `@kerfjs/ui/wire-search-fields`

```ts
import { Signal } from 'kerfjs';
import { b as SearchFieldModel } from './search-field-CrGTN5sa.js';
import './semantic-content-BbzjvSu9.js';

interface SearchFieldSubmit {
    id: string;
    editor: HTMLElement;
}
/** Reported to {@link WireSearchFieldsOptions.onEdit} on every editor input. */
interface SearchFieldEdit extends SearchFieldSubmit {
    /**
     * The `InputEvent` that mutated the editor — read `event.inputType` / `event.data`
     * to gate commit behavior (e.g. only parse a chip on whitespace-terminated input)
     * without keeping a separate `input` listener.
     */
    event: InputEvent;
}
/** Reported when adjacent-token keyboard deletion asks the app to drop a chip. */
interface SearchFieldTokenRemoval {
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
 * a removal is reported through {@link SearchFieldKeyboardOptions.onRemoveToken}
 * for the caller to apply, while caret movement past a chip is a pure ephemeral
 * mechanic the helper performs itself.
 */
interface SearchFieldKeyboardBaseOptions {
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
type SearchFieldKeyboardOptions = SearchFieldKeyboardBaseOptions & ({
    removeAdjacentToken?: true;
    /** Apply the reported removal to your controlled state, then re-render. */
    onRemoveToken: (removal: SearchFieldTokenRemoval) => void;
} | {
    removeAdjacentToken: false;
    onRemoveToken?: never;
});
/**
 * Managed collapsible behavior for the iconic SearchField. Every piece is on
 * by default; disable a specific one to own it in the app. Provide `signals` to
 * drive app-owned `expanded` signals per field id instead of helper-created ones.
 */
interface SearchFieldCollapsibleOptions {
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
     * trigger collapse-on-empty-blur. An element carrying `data-search-field-keep-open`
     * (or any node inside one) is always exempt, so this predicate is only needed
     * for surfaces you cannot mark declaratively.
     */
    keepOpenOn?: (target: Node | null) => boolean;
    /** App-owned `expanded` signals keyed by field id; adopted instead of helper-created. */
    signals?: Readonly<Record<string, Signal<boolean>>>;
}
interface WireSearchFieldsOptions {
    /** Optional automatic grammar/suggestion models, keyed by SearchField id. */
    models?: Readonly<Record<string, SearchFieldModel>>;
    onSubmit?: (submission: SearchFieldSubmit) => void;
    /** Fired on every editor `input`, after the browser mutates it, so a caller can drop its own `input` listener. */
    onEdit?: (edit: SearchFieldEdit) => void;
    /** Managed collapsible transient behavior. `true`/omitted = on with defaults; `false` = fully off. */
    collapsible?: boolean | SearchFieldCollapsibleOptions;
    /** Opt-in atomic-chip keyboard behavior (off by default). */
    keyboard?: false | SearchFieldKeyboardOptions;
}
/**
 * The value returned from {@link wireSearchFields}: call it (or `dispose()`) to
 * tear down. When collapsible behavior is managed, it also exposes the transient
 * `expanded` state per field id so the app can read it in render, hand in its own
 * signal, or drive it imperatively.
 */
interface SearchFieldsHandle {
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
 * Wire every SearchField under `root`: submit on Enter, preserve the caret across
 * controlled token deletion, and (by default) manage the collapsible field's transient
 * expand/collapse/focus. Returns a {@link SearchFieldsHandle} — a disposer that also
 * exposes the managed `expanded` state per field id.
 */
declare function wireSearchFields(root: HTMLElement, { models, onSubmit, onEdit, collapsible, keyboard, }?: WireSearchFieldsOptions): SearchFieldsHandle;

export { type SearchFieldCollapsibleOptions, type SearchFieldEdit, type SearchFieldKeyboardOptions, type SearchFieldSubmit, type SearchFieldTokenRemoval, type SearchFieldsHandle, type WireSearchFieldsOptions, wireSearchFields };
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
import { CssLength } from './css-values.js';
import { S as SemanticTone } from './semantic-tone-CdW013KF.js';

/** @deprecated Use SemanticTone. */
type BadgeTone = SemanticTone;
type BadgeAppearance = 'quiet' | 'solid' | 'outline';
type BadgeShape = 'pill' | 'rounded';
/** Size of a text badge. A text-free dot is the separate `size: 'dot'` form. */
type BadgeSize = 'compact' | 'default';
/** Application `data-*` identity on the badge root; Badge-owned markers stay protected. */
type BadgeRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-tone'?: never;
    'data-appearance'?: never;
    'data-shape'?: never;
    'data-size'?: never;
    'data-has-icon'?: never;
    'data-truncate'?: never;
    'data-placement'?: never;
}>;
/**
 * `inline` (default) flows with its content; `corner` pins the badge to the
 * top-trailing corner of the control it sits in (an icon-only `Button`, or a
 * button in a `ToolbarControlGroup`), out of the pointer's way.
 */
type BadgePlacement = 'inline' | 'corner';
interface BadgeCommonProps {
    tone?: SemanticTone;
    placement?: BadgePlacement;
    /** Native tooltip text that explains the badge on hover. */
    title?: string;
    /** Safe `data-*` identity, such as a status band, on the badge root. */
    rootAttributes?: BadgeRootAttributes;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** A badge that shows a short status, count, or category as visible text. */
interface BadgeTextProps extends BadgeCommonProps {
    children: SafeHtml | string | number;
    /** Decorative leading icon, normally an unsized LucideIcon, 4px before the text. */
    icon?: SafeHtml;
    appearance?: BadgeAppearance;
    shape?: BadgeShape;
    size?: BadgeSize;
    /**
     * Cap the badge's width and truncate longer text with an ellipsis, for
     * app-supplied text such as a tag or category name. String and number
     * content becomes the native `title` tooltip unless `title` is supplied, so
     * the full text stays available on hover; SafeHtml content needs `title`.
     */
    maxWidth?: CssLength;
    /**
     * Accessible name that replaces the visible content when it is abbreviated
     * or symbolic (`"82% confidence"` for `82`); the badge is then exposed as a
     * labeled image.
     */
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
    maxWidth?: never;
} & (BadgeDotLabeled | BadgeDotDecorative);
type BadgeProps = BadgeTextProps | BadgeDotProps;
/** Compact, non-interactive metadata whose tone, emphasis, and shape are configured by props. */
declare function Badge(props: BadgeProps): SafeHtml;

export { Badge, type BadgeAppearance, type BadgeDotProps, type BadgePlacement, type BadgeProps, type BadgeRootAttributes, type BadgeShape, type BadgeSize, type BadgeTextProps, type BadgeTone, SemanticTone };
```

## `@kerfjs/ui/chip`

```ts
import { SafeHtml } from 'kerfjs';
import { S as SemanticTone } from './semantic-tone-CdW013KF.js';
import { BadgeAppearance, BadgeShape, BadgeSize } from './badge.js';
import './css-values.js';

/**
 * A chip color role: a shared semantic tone, or `inherit`, which follows the
 * surrounding foreground (a chip inside a `brand-loud` ContentItem bubble)
 * and derives its fill, border, and focus ring from `currentColor`.
 */
type ChipTone = SemanticTone | 'inherit';
interface ChipCommonProps {
    /** Decorative leading icon, normally an unsized LucideIcon. */
    icon?: SafeHtml;
    tone?: ChipTone;
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
type ChipLabelProps = {
    children: SafeHtml | string | number;
    truncate?: false;
} | {
    children: string;
    truncate: true;
};
interface ChipNoLinkProps {
    href?: never;
    download?: never;
    external?: never;
}
interface ChipNoActionProps {
    action?: never;
    actionLabel?: never;
}
/**
 * An action chip renders its whole root as a native
 * `<button type="button">` carrying `data-action` (and `data-item-id`) for an
 * application delegated handler. It cannot also be a link or carry a remove
 * button, because nested interactive content is invalid.
 */
interface ChipActionProps {
    /** Delegated action name; the chip renders as a native `<button>`. */
    action: string;
    /**
     * Accessible name when the visible label alone is unclear, such as
     * "Insert filter is:mine". Start it with, or include, the visible label so
     * speech input still matches.
     */
    actionLabel?: string;
    href?: never;
    download?: never;
    external?: never;
    removeAction?: never;
    removeLabel?: never;
}
/**
 * A link chip renders a native `<a>` with Chip geometry. It cannot also carry
 * a remove button, because a button inside a link is invalid.
 */
interface ChipLinkProps {
    /** Native destination; the chip renders as an `<a>`. */
    href: string;
    /** Download the destination: `true`, or the suggested file name. */
    download?: string | boolean;
    /** Open in a new tab with a safe rel and announce that behavior. */
    external?: boolean;
    removeAction?: never;
    removeLabel?: never;
    action?: never;
    actionLabel?: never;
}
/**
 * A plain chip, a removable chip (a delegated action plus a specific
 * accessible name), a link chip (`href`, optional `download`/`external`), or
 * an action chip (`action`, optional `actionLabel`) whose whole body is a
 * native button.
 */
type ChipProps = ChipCommonProps & ChipLabelProps & (({
    removeAction: string;
    removeLabel: string;
} & ChipNoLinkProps & ChipNoActionProps) | ({
    removeAction?: never;
    removeLabel?: never;
} & ChipNoLinkProps & ChipNoActionProps) | ChipLinkProps | ChipActionProps);
/**
 * A short label with an optional native remove button, a native link when
 * `href` is set, or a native button when `action` is set. The application
 * owns removal, the link destination, and the action handler.
 */
declare function Chip({ children, icon, truncate, tone, appearance, shape, size, disabled, itemId, className, slot, href, download, external, removeAction, removeLabel, action, actionLabel, }: ChipProps): SafeHtml;

export { Chip, type ChipProps, type ChipTone };
```

## `@kerfjs/ui/lucide-icon`

```ts
import { SafeHtml } from 'kerfjs';
import { IconNode } from 'lucide';
import { CssForegroundColor } from './css-values.js';

type LucideNode = IconNode;
type LucideIconSize = 'xs' | 's' | 'm' | 'l' | 'xl' | number;
interface LucideIconProps {
    icon: LucideNode;
    name: string;
    /** Outline by default; solid fills compatible glyphs with the current text color. */
    appearance?: 'outline' | 'solid';
    className?: string;
    /** Foreground color; omit to inherit the surrounding text color. */
    color?: CssForegroundColor;
    /** Flow with surrounding text instead of occupying a block. */
    inline?: boolean;
    /** The icon's accessible name; without it the icon is decorative. */
    label?: string;
    /**
     * Hover text, as an SVG `<title>`: a status icon's explanation ("Session
     * halted"). With `label`, the label stays the accessible name; alone, the
     * title also names the icon. The whole icon box shows it, not just its
     * strokes.
     */
    title?: string;
    /** Named icon scale or positive pixel size, converted to rem. Omit for 1em. */
    size?: LucideIconSize;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** Render a Lucide-compatible icon node without copying icon SVG strings. */
declare function LucideIcon({ icon, name, appearance, className, color, inline, label, title, size, slot, }: LucideIconProps): SafeHtml;

export { LucideIcon, type LucideIconProps, type LucideIconSize, type LucideNode };
```

## `@kerfjs/ui/backdrop-image`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { S as StructuralRootAttributes } from './extension-attributes-mu8MFUl0.js';
import { CssLength, CssColor } from './css-values.js';

/** How a single image fills the backdrop (`object-fit`). */
type BackdropImageFit = 'cover' | 'contain' | 'fill';
/** Which part of the image stays in view when it is cropped. */
type BackdropImagePosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top left' | 'top right' | 'bottom left' | 'bottom right';
/** Tile the image as a background instead of fitting one copy. */
type BackdropImageRepeat = 'repeat' | 'repeat-x' | 'repeat-y';
/**
 * How far the image lags the scroll: `none` scrolls with the content,
 * `subtle` lags by 35%, and a number from 0 to 1 is the lag factor (0.5
 * moves the image at half the scroll speed).
 */
type BackdropImageParallax = 'none' | 'subtle' | number;
/**
 * A dimming layer under `overlay` content: `bottom` darkens toward the
 * block end where a title sits, `full` dims the whole image evenly.
 */
type BackdropImageScrim = 'none' | 'bottom' | 'full';
/**
 * A scroll-linked progressive blur: a statically blurred copy of the image
 * fades in as the image block scrolls away. Only the copy's opacity (and the
 * optional dim layer's) animates; the blur itself is set once.
 */
interface BackdropImageBlur {
    /**
     * CSS blur radius applied once to the copy. Default 24px; with
     * `blurredSrc` the default is no filter, since that asset is already soft.
     */
    radius?: CssLength;
    /**
     * An app-supplied pre-blurred or low-resolution copy of the image, used
     * instead of filtering `src`.
     */
    blurredSrc?: string;
    /**
     * Peak opacity, from 0 to 1, of a black dim layer that ramps in with the
     * blur. Default 0 (no dim layer).
     */
    dim?: number;
}
type BackdropImageRootAttributes = StructuralRootAttributes & Readonly<{
    'data-component'?: never;
    'data-blur'?: never;
    'data-parallax'?: never;
    'data-scrim'?: never;
    'data-fade'?: never;
    'data-repeat'?: never;
    'data-under-chrome'?: never;
}>;
interface BackdropImageCommonProps {
    /** Image URL. */
    src: string;
    /**
     * Accessible description of the image. Pass `''` for a decorative image
     * that only sets a mood; assistive technology then skips it.
     */
    alt: string;
    /** Which part of a cropped image stays in view. Default `center`. */
    position?: BackdropImagePosition;
    /** Height of the image block. Default 320px (`remify(320)`). */
    height?: CssLength;
    /** How far the image lags the scroll. Default `none`. */
    parallax?: BackdropImageParallax;
    /**
     * The color the image fades into at its block end. It also paints the
     * whole surface, so `children` below the image sit on the same color and
     * the page reads as one surface. Omit for a hard edge with no surface.
     */
    fadeTo?: CssColor;
    /**
     * Blur the image progressively as it scrolls away, by cross-fading a
     * statically blurred copy. Static (unblurred) wherever parallax is.
     */
    blur?: BackdropImageBlur;
    /**
     * Run the image up beneath the scroller's block-start inset: an overlay or
     * clear Pane header, NavStack chrome handed to a view's Pane, and the top
     * safe area, the way a media page's artwork fills the screen behind
     * transparent chrome. The visible image keeps `height` below that inset,
     * and `overlay` content stays clear of the chrome. Place the image first in
     * the Pane's content; it reads the Pane's
     * `--kui-pane-content-inset-block-start`. Default `false`.
     */
    underChrome?: boolean;
    /** Dim the image under `overlay` content. Default `none`. */
    scrim?: BackdropImageScrim;
    /** Content laid over the image's block end, such as a title and actions. */
    overlay?: KerfUiContent;
    /** Content that continues below the image on the `fadeTo` surface. */
    children?: KerfUiContent;
    id?: string;
    className?: string;
    /** Safe `data-*`, `aria-*`, and structural `role` metadata on the root. */
    rootAttributes?: BackdropImageRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** One fitted image, with optional responsive candidates. */
interface BackdropImageSingleProps extends BackdropImageCommonProps {
    repeat?: undefined;
    /** Responsive image candidates (`srcset`). */
    srcset?: string;
    /** Rendered-size hints for `srcset` (`sizes`). */
    sizes?: string;
    /** How the image fills the block. Default `cover`. */
    fit?: BackdropImageFit;
}
/** A tiled background image at its natural size. */
interface BackdropImageTiledProps extends BackdropImageCommonProps {
    repeat: BackdropImageRepeat;
    srcset?: never;
    sizes?: never;
    fit?: never;
}
type BackdropImageProps = BackdropImageSingleProps | BackdropImageTiledProps;
/**
 * An image backdrop at the top of a scrolling Pane or NavStack view: the
 * image can lag the scroll (parallax on a scroll-driven, compositor-only
 * transform), fade through a mask into `fadeTo`, and that color keeps
 * painting under `children` so the page reads as one surface. Kerf owns the
 * static fallbacks: no parallax without scroll-driven animation support,
 * under reduced motion, under `data-kui-effects="static"`, or on a
 * slow-update display, and a hard edge onto solid `fadeTo` under reduced
 * transparency.
 */
declare function BackdropImage(props: BackdropImageProps): kerfjs.SafeHtml;

export { BackdropImage, type BackdropImageBlur, type BackdropImageFit, type BackdropImageParallax, type BackdropImagePosition, type BackdropImageProps, type BackdropImageRepeat, type BackdropImageScrim, type BackdropImageSingleProps, type BackdropImageTiledProps };
```

## `@kerfjs/ui/wire-toolbar-visibility`

```ts
type Root = HTMLElement | Document;
/**
 * Wire ToolbarText and ToolbarControlGroup width thresholds below root.
 * Below is strict: hideBelow hides at width < threshold; showBelow hides at
 * width >= threshold. Percentages use the closest Toolbar's content box;
 * em and custom properties use the item's own inherited context. Invalid,
 * negative, unresolved, or contradictory thresholds leave the item visible.
 * This helper changes only a component-owned visibility marker. Existing
 * CSS visibility policies still apply. Dispose with the owning application.
 */
declare function wireToolbarVisibility(root: Root): () => void;

export { wireToolbarVisibility };
```

## `@kerfjs/ui/surface-scaffold`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { CssLength } from './css-values.js';

/** What asked an open DialogSurface to close. */
type DialogCloseSource = 'close-button' | 'escape' | 'backdrop';
/** The detail of a DialogSurface's cancelable `kui-request-close` event. */
interface DialogRequestCloseDetail {
    readonly source: DialogCloseSource;
}
/**
 * Open a DialogSurface as a modal dialog: in the top layer, the rest of the
 * page inert, focus on its `autofocus` element or else the panel. It plays
 * its enter motion and, with the controller installed here, keeps its
 * measured chrome, sheet height, and keyboard clearance across application
 * re-renders. Opening an open dialog does nothing.
 */
declare function openDialog(dialog: HTMLDialogElement): void;
/**
 * Close an open DialogSurface after its exit motion. The application's own
 * close is never refused: no `kui-request-close` is dispatched. The native
 * `close` event fires once it has closed.
 */
declare function closeDialog(dialog: HTMLDialogElement): void;

type DialogSurfaceSize = 'small' | 'medium' | 'large';
/**
 * How the dialog is presented: `modal` (default) centered on the screen,
 * `side-sheet` against the inline end, `fullscreen`, or `bottom-sheet`
 * attached to the bottom edge (square bottom corners, safe-area and
 * virtual-keyboard clearance, optionally user-resizable).
 */
type DialogSurfacePresentation = 'modal' | 'side-sheet' | 'fullscreen' | 'bottom-sheet';
/**
 * How a bottom sheet appears or leaves: `slide` (default) moves the panel in
 * from, or out to, the bottom edge; `standard` keeps the dialog's
 * scale-and-fade. Both honor `prefers-reduced-motion`.
 */
type DialogSurfaceSheetMotion = 'slide' | 'standard';
type SurfaceInset = 'none' | 'compact' | 'comfortable';
type DialogSurfaceMaxHeight = CssLength | 'viewport';
/** A definite modal height: a length or the full viewport, minus both gutters. */
type DialogSurfaceHeight = CssLength | 'viewport';
/**
 * How the dialog body lays out its children: `flow` (default) scrolls ordinary
 * content in the body; `fill` gives one child the body's whole height and
 * lets it own scrolling (a SplitView, a Pane, an editor); `fill-last` stacks
 * the leading children at their natural height and gives the last child the
 * remaining height to own its scrolling (a heading and notices above a
 * scrolling transcript).
 */
type DialogSurfaceBodyLayout = 'flow' | 'fill' | 'fill-last';
/**
 * Where the dialog footer sits: `docked` (default) below the body, or
 * `floating` over the body's block end, inset from the panel's inline and
 * block-end edges on a transparent background (a chat composer).
 */
type DialogSurfaceFooterPresentation = 'docked' | 'floating';
/**
 * Where the dialog header sits: `docked` (default) above the body, or
 * `floating` over the body's block-start edge on the translucent chrome
 * material, so content scrolls visibly beneath the title bar.
 */
type DialogSurfaceHeaderPresentation = 'docked' | 'floating';
/**
 * Application `data-*` identity on the DialogSurface root, such as
 * `data-key`; the surface's own configuration attributes stay protected.
 */
type DialogSurfaceRootAttributes = Readonly<Record<`data-${string}`, string | undefined>>;
/**
 * The dialog's accessible name: its `label` text (also the default title), or
 * the id of an element that names it, such as a `heading` ToolbarText.
 */
type DialogSurfaceName = {
    label: string;
    labelledBy?: never;
} | {
    label?: never;
    labelledBy: string;
};
type DialogSurfaceProps = DialogSurfaceName & DialogSurfaceOptions;
interface DialogSurfaceOptions {
    /** The dialog's id, for `openDialog(document.getElementById(id))`. */
    id?: string;
    /** The body content. */
    children: KerfUiContent;
    /**
     * Header title content in place of the `label` text, such as an xl
     * `ToolbarText` with a description. The dialog keeps its `label` (or
     * `labelledBy`) name.
     */
    heading?: KerfUiContent;
    /** Controls before the close button in the header. */
    headerActions?: KerfUiContent;
    /** The footer, below the body (or floating over it); usually its buttons. */
    footer?: KerfUiContent;
    /**
     * Render no header: no title and no close button. The content then owns its
     * heading and a way to close (an element with `data-dialog-close`).
     */
    withoutHeader?: boolean;
    /** Close on a press on the backdrop; otherwise the panel pulses. */
    lightDismiss?: boolean;
    /** The close button's accessible name (default `Close`). */
    closeLabel?: string;
    size?: DialogSurfaceSize;
    presentation?: DialogSurfacePresentation;
    /** Modal preferred width. Takes precedence over size, within the viewport cap. */
    preferredWidth?: CssLength;
    bodyInset?: SurfaceInset;
    footerInset?: SurfaceInset;
    /** Modal edge clearance. Omit to retain Web Awesome's default viewport cap. */
    viewportGutter?: CssLength;
    /**
     * Modal height cap, bounded by the dynamic viewport minus both gutters. On a
     * bottom sheet, the cap (and the resize ceiling), bounded by the dynamic
     * viewport minus the top safe area and one gutter.
     */
    maxHeight?: DialogSurfaceMaxHeight;
    /**
     * Modal definite height, bounded the same way, so a filling child has a
     * height to fill. Takes precedence over `maxHeight`. On a bottom sheet, the
     * height it opens at (the visible height above the safe area or keyboard).
     */
    height?: DialogSurfaceHeight;
    /**
     * A resizable bottom sheet's resize floor (default 160px), the visible
     * height above the safe area or keyboard.
     */
    minHeight?: CssLength;
    /**
     * Let the person resize a bottom sheet by its top grabber (drag, or the
     * arrow, Page Up/Down, Home and End keys) between `minHeight` and the
     * sheet's cap. Needs the `/register` entry; each opening starts at `height`
     * (or the content height). Ignored by other presentations.
     */
    resizable?: boolean;
    /** How a bottom sheet appears (default `slide` up from the bottom edge). */
    enterMotion?: DialogSurfaceSheetMotion;
    /** How a bottom sheet is dismissed (default `slide` down off the bottom edge). */
    exitMotion?: DialogSurfaceSheetMotion;
    /**
     * Body layout (default `flow`); `fill` lets one child own the body and
     * `fill-last` stacks fixed rows above one filling last child.
     */
    bodyLayout?: DialogSurfaceBodyLayout;
    /**
     * Header placement (default `docked`); `floating` lays the dialog's header
     * (its title and close control) over the body's block-start edge on the
     * translucent chrome material (`--kui-chrome-material-raised`, opaque under
     * `prefers-reduced-transparency`, increased contrast, forced colors, or
     * without `backdrop-filter`). The `/register` entry measures the header;
     * the body reserves that height before its own inset, so its first content
     * rests below the title bar. A `fill`/`fill-last` child that is the body's
     * only child and opts into block-start `scrollClearance` (a `List` or
     * `Pane`) takes the clearance inside its own scroll area instead, published
     * as `--kui-scroll-clearance-block-start`, so its content scrolls visibly
     * beneath the header. Unmeasured (without the register), the header stays
     * docked. Keep header text in the normal text color: quiet text can fall
     * below AA over the content passing beneath it.
     */
    headerPresentation?: DialogSurfaceHeaderPresentation;
    /**
     * Footer placement (default `docked`); `floating` lays the footer over the
     * body's block end. The body reserves the footer's measured height so its
     * last content is never hidden beneath it. A `fill`/`fill-last` child that
     * opts into block-end `scrollClearance` (a `List` or `Pane`) takes that
     * clearance inside its own scroll area instead, published as
     * `--kui-scroll-clearance-block-end`, so its content scrolls visibly beneath
     * the transparent footer.
     */
    footerPresentation?: DialogSurfaceFooterPresentation;
    /**
     * A floating footer's clearance from the panel's inline and block-end edges
     * (default the 16px container inset). Choose a phone value such as
     * `remify(8)` from `deviceClass()`; the scaffold adds no breakpoint.
     */
    footerOffset?: CssLength;
    /**
     * Safe `data-*` identity on the root. Give sibling dialogs distinct
     * `data-key`s so a re-render morphs each surface into itself instead of
     * reusing one dialog's element for another (structurally identical roots
     * are otherwise matched by position).
     */
    rootAttributes?: DialogSurfaceRootAttributes;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A modal dialog: a native `<dialog>` with Kerf's header, body, and footer
 * chrome, sized and presented by its props. Render it closed, then open it
 * with `openDialog()` and close it with `closeDialog()`, the close button, an
 * element with `data-dialog-close`, Escape, or (with `lightDismiss`) a press
 * on the backdrop. Import `@kerfjs/ui/surface-scaffold/register` for the
 * floating header and footer measurement, the bottom sheet's keyboard
 * clearance and grabber, and re-render resilience while open.
 */
declare function DialogSurface({ id, label, labelledBy, heading, headerActions, footer, withoutHeader, lightDismiss, closeLabel, children, size, presentation, preferredWidth, bodyInset, footerInset, viewportGutter, maxHeight, height, minHeight, resizable, enterMotion, exitMotion, bodyLayout, headerPresentation, footerPresentation, footerOffset, rootAttributes, className, slot, }: DialogSurfaceProps): kerfjs.SafeHtml;
/** Where a PopoverDialogSurface appears: the top layer, or in flow. */
type PopoverDialogSurfacePresentation = 'overlay' | 'embedded';
/** Application `data-*` metadata on the surface root. */
type PopoverDialogSurfaceDataAttributes = Readonly<Record<`data-${string}`, string>>;
type PopoverDialogSurfaceName = {
    label: string;
    labelledBy?: never;
} | {
    label?: never;
    labelledBy: string;
};
type PopoverDialogSurfaceProps = PopoverDialogSurfaceName & {
    /** The root id: what an opening control's `popovertarget` names. */
    id?: string;
    /**
     * Id of the element whose text is the dialog's accessible description,
     * such as a title `ToolbarText`'s `descriptionId`; rendered as
     * `aria-describedby` on the `role="dialog"` root.
     */
    describedBy?: string;
    children: KerfUiContent;
    /**
     * `overlay` (default) is a native `popover="auto"` in the top layer:
     * non-modal, light dismiss (Escape or a press outside), nothing inert.
     * `embedded` renders the same surface in flow for a catalog or inline use.
     */
    presentation?: PopoverDialogSurfacePresentation;
    /** Preferred width preset: 400px, 560px (default), or 800px. */
    size?: DialogSurfaceSize;
    /** Preferred width; takes precedence over `size`, within the viewport cap. */
    preferredWidth?: CssLength;
    /** Definite height, bounded by the dynamic viewport minus both gutters. */
    height?: DialogSurfaceHeight;
    /** Height cap, bounded the same way, for a surface that sizes to content. */
    maxHeight?: DialogSurfaceMaxHeight;
    /** Edge clearance on each side of the viewport (default 16px). */
    viewportGutter?: CssLength;
    /**
     * Body layout (default `flow`); `fill` lets one child own the surface and
     * `fill-last` stacks fixed rows above one filling last child.
     */
    bodyLayout?: DialogSurfaceBodyLayout;
    rootAttributes?: PopoverDialogSurfaceDataAttributes;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
};
/**
 * A non-modal dialog surface on the native Popover API: Kerf's dialog chrome,
 * viewport-bounded size, and single-child fill without application CSS.
 * Open it with a `popovertarget` control or `showPopover()`; it light
 * dismisses and leaves the page interactive. Use `DialogSurface` when the
 * task must block the page.
 */
declare function PopoverDialogSurface({ id, children, label, labelledBy, describedBy, presentation, size, preferredWidth, height, maxHeight, viewportGutter, bodyLayout, rootAttributes, className, slot, }: PopoverDialogSurfaceProps): kerfjs.SafeHtml;
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

export { type DialogCloseSource, type DialogRequestCloseDetail, DialogSurface, type DialogSurfaceBodyLayout, type DialogSurfaceFooterPresentation, type DialogSurfaceHeaderPresentation, type DialogSurfaceHeight, type DialogSurfaceMaxHeight, type DialogSurfaceName, type DialogSurfaceOptions, type DialogSurfacePresentation, type DialogSurfaceProps, type DialogSurfaceRootAttributes, type DialogSurfaceSheetMotion, type DialogSurfaceSize, PopoverDialogSurface, type PopoverDialogSurfaceDataAttributes, type PopoverDialogSurfacePresentation, type PopoverDialogSurfaceProps, PopupSurface, type PopupSurfaceInset, type PopupSurfaceProps, type SurfaceInset, closeDialog, openDialog };
```

## `@kerfjs/ui/list-detail-dialog`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { CssLength } from './css-values.js';
import { SplitViewListWidth } from './split-view.js';
import { DialogSurfaceSize, DialogSurfaceHeight, DialogSurfaceMaxHeight, DialogSurfaceRootAttributes } from './surface-scaffold.js';
export { DialogCloseSource, DialogRequestCloseDetail, closeDialog, openDialog } from './surface-scaffold.js';
import './nav-stack-CU_0dKtI.js';
import './pane.js';
import './scroll-clearance-BikHljTc.js';
import './list.js';
import './extension-attributes-mu8MFUl0.js';
import './flex-alignment-4ms8ZbV8.js';
import './sides-BPSWde0A.js';
import './panel-toolbar-vg6Ir5Dy.js';
import './toolbar.js';
import './lucide-icon.js';
import 'lucide';
import './toolbar-text.js';
import './resizable-region.js';

/** The list column: a secondary title, its own controls, and the list. */
interface ListDetailDialogList {
    /**
     * The column's title, at the default toolbar size so it reads as pane
     * identity beside the detail's primary title. On compact devices it titles
     * the root view.
     */
    title: string;
    /** Controls after the title in the column's header, such as a `ToolbarControlGroup`. */
    toolbar?: KerfUiContent;
    /** The list, usually a `List` of selectable `ListItem`s. */
    content: KerfUiContent;
    /** Content pinned below the list, such as an add control. */
    footer?: KerfUiContent;
    /**
     * The column's width on roomy devices (default 280px, at most 40% of the
     * dialog's width).
     */
    width?: SplitViewListWidth;
}
/** The detail column: the dialog's primary title, actions, and close control. */
interface ListDetailDialogDetail {
    /**
     * The dialog's primary title: an xl heading at the top of the detail
     * column on roomy devices, and the pushed view's title on compact devices.
     */
    title: string;
    /** A short supporting line under the roomy title. */
    description?: string;
    /**
     * Header controls before the close control, such as a
     * `ToolbarControlGroup`. Primary record actions usually go in `footer`.
     */
    actions?: KerfUiContent;
    /** The selected item's detail. */
    content: KerfUiContent;
    /** Content pinned below the detail, usually its buttons. */
    footer?: KerfUiContent;
}
/**
 * Application `data-*` identity on the dialog root, such as `data-key`; the
 * dialog's own configuration attributes stay protected.
 */
type ListDetailDialogRootAttributes = DialogSurfaceRootAttributes;
interface ListDetailDialogProps {
    /**
     * The dialog's id, for `openDialog(document.getElementById(id))`. Also
     * prefixes the ids of the split and the detail title.
     */
    id: string;
    /** The dialog's accessible name. */
    label: string;
    list: ListDetailDialogList;
    detail: ListDetailDialogDetail;
    /**
     * One pane at a time: derive from `deviceClass().value.compact`. The dialog
     * fills the screen and drills from the list into the detail as a
     * `NavStack`; every view keeps the close control.
     */
    compact?: boolean;
    /** On compact devices, whether the detail is pushed over the list. */
    detailActive?: boolean;
    /** The compact back control's accessible name (default `Back`). */
    backLabel?: string;
    /** The close control's accessible name (default `Close`). */
    closeLabel?: string;
    /** Close on a press on the backdrop; otherwise the panel pulses. */
    lightDismiss?: boolean;
    /** Roomy preferred width preset (default `large`). */
    size?: DialogSurfaceSize;
    /** Roomy preferred width; takes precedence over `size`. */
    preferredWidth?: CssLength;
    /** Roomy definite height (default 560px), bounded by the viewport. */
    height?: DialogSurfaceHeight;
    /** Roomy height cap in place of a definite height. */
    maxHeight?: DialogSurfaceMaxHeight;
    /** Roomy edge clearance from the viewport. */
    viewportGutter?: CssLength;
    rootAttributes?: ListDetailDialogRootAttributes;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A list-detail dialog: a modal whose list column and detail column each run
 * its full height. The list column carries a secondary title and its own
 * controls; the detail column carries the dialog's primary title, its
 * actions, and the close control, so the divider between them runs from top
 * to bottom. On compact devices it fills the screen and becomes a `NavStack`
 * that drills from the list into the detail. Open it with `openDialog()`;
 * the app owns the selection and, on compact devices, `detailActive` (the
 * stack's back control dispatches `nav-back`). Built from `DialogSurface`,
 * `SplitView`, and `Pane`.
 */
declare function ListDetailDialog({ id, label, list, detail, compact, detailActive, backLabel, closeLabel, lightDismiss, size, preferredWidth, height, maxHeight, viewportGutter, rootAttributes, className, slot, }: ListDetailDialogProps): kerfjs.SafeHtml;

export { ListDetailDialog, type ListDetailDialogDetail, type ListDetailDialogList, type ListDetailDialogProps, type ListDetailDialogRootAttributes };
```

## `@kerfjs/ui/workbench-dialog`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { CssLength } from './css-values.js';
import { WorkbenchMainBottomToolbar, WorkbenchPanel } from './workbench.js';
import { DialogSurfaceSize, DialogSurfaceHeight, DialogSurfaceMaxHeight, DialogSurfaceRootAttributes } from './surface-scaffold.js';
export { DialogCloseSource, DialogRequestCloseDetail, closeDialog, openDialog } from './surface-scaffold.js';
import './nav-stack-CU_0dKtI.js';
import './pane.js';
import './scroll-clearance-BikHljTc.js';
import './list.js';
import './extension-attributes-mu8MFUl0.js';
import './flex-alignment-4ms8ZbV8.js';
import './sides-BPSWde0A.js';
import './panel-toolbar-vg6Ir5Dy.js';
import './toolbar.js';
import './lucide-icon.js';
import 'lucide';
import './toolbar-text.js';
import './resizable-region.js';

/**
 * Application `data-*` identity on the dialog root, such as `data-key`; the
 * dialog's own configuration attributes stay protected.
 */
type WorkbenchDialogRootAttributes = DialogSurfaceRootAttributes;
interface WorkbenchDialogProps {
    /**
     * The dialog's id, for `openDialog(document.getElementById(id))`. The
     * Workbench inside is `<id>-workbench`, so its rails are
     * `<id>-workbench-left-rail` and `<id>-workbench-right-rail`.
     */
    id: string;
    /** The dialog's accessible name. */
    label: string;
    /** The dialog's primary title: an xl heading in the work area's toolbar. */
    title: string;
    /** A short supporting line under the title. */
    description?: string;
    /** Groups after the title in the work area's toolbar. */
    leading?: KerfUiContent;
    /** Header controls before the close control, such as a `ToolbarControlGroup`. */
    actions?: KerfUiContent;
    /** The work area. */
    main: KerfUiContent;
    /** Fixed content over the work area's bottom toolbar, such as a status line. */
    mainFooter?: KerfUiContent;
    /** The work area's bottom toolbar, usually the dialog's buttons. */
    mainBottomToolbar?: WorkbenchMainBottomToolbar;
    /**
     * Side rails with their own toolbars. On compact devices each presents as
     * an overlay over the work area; the app starts it collapsed and its
     * `toolbar.toggle` shows it.
     */
    leftRail?: WorkbenchPanel;
    rightRail?: WorkbenchPanel;
    /** A bottom drawer under the work area. */
    bottomDrawer?: WorkbenchPanel;
    /**
     * Fill the screen with the rails as overlays: derive from
     * `deviceClass().value.compact`.
     */
    compact?: boolean;
    /** The close control's accessible name (default `Close`). */
    closeLabel?: string;
    /** Close on a press on the backdrop; otherwise the panel pulses. */
    lightDismiss?: boolean;
    /** Roomy preferred width preset (default `large`). */
    size?: DialogSurfaceSize;
    /** Roomy preferred width; takes precedence over `size`. */
    preferredWidth?: CssLength;
    /** Roomy definite height (default 560px), bounded by the viewport. */
    height?: DialogSurfaceHeight;
    /** Roomy height cap in place of a definite height. */
    maxHeight?: DialogSurfaceMaxHeight;
    /** Roomy edge clearance from the viewport. */
    viewportGutter?: CssLength;
    /** Minimum work-area width beside inline rails, in px (Workbench default 320). */
    mainMinSize?: number;
    rootAttributes?: WorkbenchDialogRootAttributes;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A workbench dialog: a modal whose body is a `Workbench`. The work area's
 * toolbar carries the dialog's primary title, its actions, and the close
 * control; side rails keep their own toolbars and run the dialog's full
 * height. On compact devices it fills the screen and its rails become
 * overlays over the work area, shown by their toolbar toggles, so the work
 * area keeps its width. Open it with `openDialog()`; the app owns each
 * rail's `collapsed` state, and `wireWorkbench` closes an overlay rail on
 * Escape or a press outside it before the dialog sees the Escape. Built from
 * `DialogSurface` and `Workbench`.
 */
declare function WorkbenchDialog({ id, label, title, description, leading, actions, main, mainFooter, mainBottomToolbar, leftRail, rightRail, bottomDrawer, compact, closeLabel, lightDismiss, size, preferredWidth, height, maxHeight, viewportGutter, mainMinSize, rootAttributes, className, slot, }: WorkbenchDialogProps): kerfjs.SafeHtml;

export { WorkbenchDialog, type WorkbenchDialogProps, type WorkbenchDialogRootAttributes };
```

## `@kerfjs/ui/text`

```ts
import * as kerfjs from 'kerfjs';
import { KerfBaseAttrs } from 'kerfjs/jsx-runtime';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { S as Sides } from './sides-BPSWde0A.js';
import { CssForegroundColor } from './css-values.js';

type FieldLabelProps = Omit<KerfBaseAttrs, 'children' | 'class' | 'className'> & {
    children: string;
    class?: string;
    className?: string;
};
/** Visible field heading for a read-only preview; use its id with aria-labelledby on the preview group. */
declare function FieldLabel({ children, class: classValue, className, ...attributes }: FieldLabelProps): kerfjs.SafeHtml;

type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
type TextTone = 'default' | 'quiet' | 'danger';
/**
 * `compact` (xs), `default` (the element's own size), `medium` (the 16px
 * body size, for a heading such as an in-list group title), `large`, or
 * `xlarge`.
 */
type TextSize = 'compact' | 'default' | 'medium' | 'large' | 'xlarge';
type TextFont = 'default' | 'monospace';
type TextBorder = 'transparent' | 'none';
type TextLineHeight = 'default' | 'tight';
type TextWrap = 'normal' | 'anywhere' | 'nowrap' | 'truncate';
/** Inline alignment of the text's lines, in logical (writing-direction) terms. */
type TextAlign = 'start' | 'center' | 'end';
/**
 * Where `wrap="truncate"` places its ellipsis: `end` (default) keeps the
 * start, `start` keeps the tail (branch names, the end of an identifier), and
 * `middle` keeps both the start and a suffix (file paths).
 */
type TextTruncate = 'end' | 'middle' | 'start';
/**
 * The suffix `truncate="middle"` always keeps: a number of trailing
 * characters, or `segment` for the last path segment with its separator.
 */
type TextTruncateKeep = number | 'segment';
type TextContent = KerfUiContent | string | number | readonly TextContent[];
type TextCommonProps = Omit<KerfBaseAttrs, 'children' | 'class' | 'className'> & {
    /** Native heading, paragraph, or inline span element to render. Defaults to `p`. */
    variant?: TextVariant;
    /** Semantic foreground treatment. Defaults to the inherited foreground. */
    tone?: TextTone;
    /** Foreground color; overrides tone when supplied, or inherits when omitted. */
    color?: CssForegroundColor;
    /** Text sizing independent of the native semantic element. */
    size?: TextSize;
    /** Font family independent of the native semantic element. */
    font?: TextFont;
    /** Transparent alignment border or no border when embedded in owner chrome. */
    border?: TextBorder;
    /** Add the shared control gutter outside selected physical edges. */
    controlMargins?: Sides;
    /** Remove the block variant's item padding and border in compact content. */
    flush?: boolean;
    /** Use compact leading for short dialog or metadata copy. */
    lineHeight?: TextLineHeight;
    /** Inline alignment of the lines (default `start`), for centered status copy. */
    align?: TextAlign;
    children: TextContent;
    class?: string;
    className?: string;
};
type TextProps = TextCommonProps & ({
    /** Wrap normally or break long unbroken strings. Defaults to normal. */
    wrap?: 'normal' | 'anywhere';
    /** Cap wrapped text to this positive number of lines. */
    maxLines?: number;
    truncate?: never;
    truncateKeep?: never;
} | {
    /** Keep one line without an ellipsis. */
    wrap: 'nowrap';
    maxLines?: never;
    truncate?: never;
    truncateKeep?: never;
} | {
    /** Keep one line with an ellipsis. */
    wrap: 'truncate';
    maxLines?: never;
    /**
     * Where the ellipsis goes (default `end`). `start` and `middle` are
     * for left-to-right identifiers and paths, and `middle` requires
     * string or number children so it can split them.
     */
    truncate?: TextTruncate;
    /**
     * The suffix `truncate="middle"` keeps (default `segment`: the last
     * path segment, or the last 10 characters when there is no `/` or
     * `\\` separator).
     */
    truncateKeep?: TextTruncateKeep;
});
/**
 * Semantic heading, paragraph, or inline text. Block variants use the standard
 * content-item padding; `span` adds no box geometry.
 * All ordinary native heading/paragraph attributes pass through to the element.
 */
declare function Text({ variant: Variant, tone, color, size, font, border, flush, controlMargins, lineHeight, align, wrap, maxLines, truncate, truncateKeep, children, class: classValue, className, style, ...attributes }: TextProps): kerfjs.SafeHtml;

export { FieldLabel, type FieldLabelProps, Sides, Text, type TextAlign, type TextBorder, type TextContent, type TextFont, type TextLineHeight, type TextProps, type TextSize, type TextTone, type TextTruncate, type TextTruncateKeep, type TextVariant, type TextWrap };
```

## `@kerfjs/ui/framed-list`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

/** The frame's fill: the lowered surface (as `ValueTable`), or the page surface. */
type FramedListSurface = 'lowered' | 'base';
type FramedListRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-surface'?: never;
}>;
type FramedListRowRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-highlighted'?: never;
}>;
interface FramedListProps {
    /** `FramedListRow` children. */
    children: KerfUiContent;
    /** Accessible name for the list, when no heading names it. */
    label?: string;
    /** Frame fill; defaults to `lowered`, matching `ValueTable`. */
    surface?: FramedListSurface;
    id?: string;
    className?: string;
    /** Safe `data-*` metadata; FramedList-owned markers stay protected. */
    rootAttributes?: FramedListRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
interface FramedListRowProps {
    /** Arbitrary row content: a `Row` of copy and controls, a keycap, … */
    children: KerfUiContent;
    /** Tint the row (the row being edited or the current item). */
    highlighted?: boolean;
    id?: string;
    className?: string;
    /** Safe `data-*` metadata; FramedListRow-owned markers stay protected. */
    rootAttributes?: FramedListRowRootAttributes;
}
/**
 * An inset-grouped list (the settings-list pattern): one rounded, bordered
 * frame with 1px dividers between rows of arbitrary content. `ValueTable` is
 * the same frame for label/value facts; this one takes any row content.
 */
declare function FramedList({ children, label, surface, id, className, rootAttributes, slot, }: FramedListProps): kerfjs.SafeHtml;
/** One row of a `FramedList`; it owns the row inset and the divider above it. */
declare function FramedListRow({ children, highlighted, id, className, rootAttributes, }: FramedListRowProps): kerfjs.SafeHtml;

export { FramedList, type FramedListProps, FramedListRow, type FramedListRowProps, type FramedListSurface };
```

## `@kerfjs/ui/summary-row`

```ts
import { SafeHtml } from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { S as SemanticTone } from './semantic-tone-CdW013KF.js';

/** `row` for a list section; `card` for a board column. */
type SummaryRowPresentation = 'row' | 'card';
/** A row's place in a rounded list section, so its corners match. */
type SummaryRowListEdge = 'start' | 'end' | 'only';
type SummaryRowRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-presentation'?: never;
    'data-list-edge'?: never;
    'data-rail'?: never;
    'data-selected'?: never;
    'data-dimmed'?: never;
}>;
interface SummaryRowProps {
    /** The identity line: an identifier, inline status glyphs, and the title. */
    title: KerfUiContent;
    /** Optional leading glyph, such as a category icon. */
    leading?: SafeHtml;
    /** Quiet text at the end of the title line, such as a relative time. */
    trailingMeta?: string | SafeHtml;
    /** A wrapping line of badges, chips, and quiet text below the title. */
    metadata?: KerfUiContent;
    /** `row` (default) or `card`. */
    presentation?: SummaryRowPresentation;
    /** Title lines before clipping; default 2 for a row and 4 for a card. */
    titleLines?: number;
    /** A leading state rail in a semantic tone (Up Next, blocked, …). */
    rail?: SemanticTone;
    /** Selected state, exposed as `aria-selected`. */
    selected?: boolean;
    /** Dim a finished or cut item; hover and selection restore it. */
    dimmed?: boolean;
    /** Round the corners that meet a rounded list section's edge. */
    listEdge?: SummaryRowListEdge;
    /** Skip rendering while off screen in long lists (`content-visibility`). */
    deferRendering?: boolean;
    /** Accessible name when the visible content is not a good one. */
    ariaLabel?: string;
    id?: string;
    className?: string;
    /** Safe `data-*` identity (an item id or delegated action) on the option. */
    rootAttributes?: SummaryRowRootAttributes;
}
/**
 * A selectable, keyboard-focusable summary of one item, as a list row or a
 * board card: an optional leading glyph and state rail, a clamped identity line
 * with trailing quiet metadata, and a wrapping metadata line. It is a
 * `role="option"`; place rows in a labeled `role="listbox"` and own selection
 * and keyboard movement in the application.
 */
declare function SummaryRow({ title, leading, trailingMeta, metadata, presentation, titleLines, rail, selected, dimmed, listEdge, deferRendering, ariaLabel, id, className, rootAttributes, }: SummaryRowProps): SafeHtml;

export { SummaryRow, type SummaryRowListEdge, type SummaryRowPresentation, type SummaryRowProps };
```

## `@kerfjs/ui/row`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { S as StructuralRootAttributes } from './extension-attributes-mu8MFUl0.js';
import { H as HorizontalAlignment, V as VerticalAlignment } from './flex-alignment-4ms8ZbV8.js';
import { S as Sides } from './sides-BPSWde0A.js';
import { UiGap, CssFlexKeyword, CssFlex } from './css-values.js';
export { CssLength, UiGapValue, UiSpaceName } from './css-values.js';

type RowRootAttributes = StructuralRootAttributes & Readonly<{
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
    /** One spacing value or separate column and row values. Defaults to xs. */
    gap?: UiGap;
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
    /**
     * Safe `data-*`, `aria-*`, and structural `role` metadata (a named
     * `region`, a `group`); Row-owned structural attributes remain protected.
     */
    rootAttributes?: RowRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** A horizontal flex row with explicit physical-axis alignment and spacing. */
declare function Row({ children, hAlign, vAlign, gap, flex, fill, wrap, textInsets, controlInsets, className, rootAttributes, slot, }: RowProps): kerfjs.SafeHtml;

export { CssFlex, CssFlexKeyword, HorizontalAlignment, Row, type RowProps, Sides, UiGap, VerticalAlignment };
```

## `@kerfjs/ui/grid`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { S as Sides } from './sides-BPSWde0A.js';
import { UiGap, CssFlexKeyword, CssFlex, CssLength } from './css-values.js';
export { UiGapValue, UiSpaceName } from './css-values.js';

type GridRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-columns'?: never;
    'data-min-column-width'?: never;
    'data-auto-fill'?: never;
    'data-flex'?: never;
    'data-fill'?: never;
    'data-text-insets'?: never;
    'data-control-insets'?: never;
}>;
interface GridCommonProps {
    children?: KerfUiContent;
    /** Make this a labeled multi-select grid for `ContentItem selectionMode="multiple"` tiles. */
    selectionMode?: 'multiple';
    /** Accessible name for the multi-select grid. */
    ariaLabel?: string;
    /** One spacing value or separate column and row values. Defaults to xs. */
    gap?: UiGap;
    /** Allow this grid to grow/shrink, use a keyword, or supply a typed CSS flex shorthand. */
    flex?: boolean | CssFlexKeyword | CssFlex;
    /**
     * Fill the height of a parent with a definite height, such as an app root or
     * a fixed-height frame, when this grid is that parent's layout root. Inside a
     * flex layout use `flex` instead. Defaults to false.
     */
    fill?: boolean;
    /** Physical sides that receive the standard 17px text inset. */
    textInsets?: Sides;
    /** Physical sides that receive the standard 8px control inset. Text insets win on overlap. */
    controlInsets?: Sides;
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
    autoFill?: never;
} | {
    columns?: never;
    /** Fit equal columns of at least this width; collapse as the container narrows. */
    minColumnWidth: CssLength;
    /** Keep empty tracks instead of stretching a sparse row. Defaults to false. */
    autoFill?: boolean;
});
/** Render equal tracks with a fixed count or a responsive minimum width. */
declare function Grid({ children, selectionMode, ariaLabel, columns, minColumnWidth, autoFill, gap, flex, fill, textInsets, controlInsets, className, rootAttributes, slot, }: GridProps): kerfjs.SafeHtml;

export { CssFlex, CssFlexKeyword, CssLength, Grid, type GridProps, Sides, UiGap };
```

## `@kerfjs/ui/column-track`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { S as StructuralRootAttributes } from './extension-attributes-mu8MFUl0.js';
import { CssLength } from './css-values.js';

/** `scroll` keeps equal min-width columns; `paged` shows one near-full-width column per page. */
type ColumnTrackLayout = 'scroll' | 'paged';
type ColumnTrackRootAttributes = StructuralRootAttributes & Readonly<{
    'data-component'?: never;
    'data-layout'?: never;
}>;
interface ColumnTrackProps {
    /** The columns, in order; each owns its own inset and scrolling. */
    children: KerfUiContent;
    /**
     * `scroll` (default): equal columns that never shrink below
     * `minColumnWidth`, so a narrow track scrolls sideways instead of crushing
     * them. `paged`: each column is nearly the visible width, the next one peeks
     * in, and scrolling snaps to column starts.
     */
    layout?: ColumnTrackLayout;
    /** Narrowest a `scroll` column gets before the track scrolls; default 250px. */
    minColumnWidth?: CssLength;
    /** How much of the next column a `paged` track shows; default 24px. */
    peek?: CssLength;
    id?: string;
    className?: string;
    /** Safe `data-*`, `aria-*`, and structural `role` metadata on the scroller. */
    rootAttributes?: ColumnTrackRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A horizontal track of columns (a kanban board): the track is the sideways
 * scroll owner and fills its parent's height; columns sit flush and own their
 * insets and vertical scrolling. Kerf owns the overflow, the paged snapping,
 * and reduced motion.
 */
declare function ColumnTrack({ children, layout, minColumnWidth, peek, id, className, rootAttributes, slot, }: ColumnTrackProps): kerfjs.SafeHtml;

export { ColumnTrack, type ColumnTrackLayout, type ColumnTrackProps };
```

## `@kerfjs/ui/content-swap`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

type ContentSwapSide = 'a' | 'b';
type ContentSwapTransition = 'none' | 'crossfade' | 'push';
/** `forward` pushes the incoming side in from the inline end; `backward` from the start. */
type ContentSwapDirection = 'forward' | 'backward';
interface ContentSwapProps {
    /** Which side is shown. Changing it runs the transition. */
    active: ContentSwapSide;
    a: KerfUiContent;
    b: KerfUiContent;
    /** `push` (default) slides the sides, `crossfade` fades them, `none` swaps instantly. */
    transition?: ContentSwapTransition;
    /** Push direction; mirrors in right-to-left documents. Default `forward`. */
    direction?: ContentSwapDirection;
    /** Accessible name; when set, the swap is a named region. */
    label?: string;
    /** Span the full width of its slot (a dialog label or footer) instead of its content. */
    fill?: boolean;
    className?: string;
    /** Native named-slot assignment, such as a dialog's `label` or `footer`. */
    slot?: string;
}
/**
 * Two content sides sharing one cell (a dialog body that steps to a second
 * page, a footer whose actions change), with the swap animated in place.
 * Kerf owns the motion, the reduced-motion fallback, and the inactive side's
 * `inert`/`aria-hidden`. Use `NavStack` for full views with their own
 * toolbars.
 */
declare function ContentSwap({ active, a, b, transition, direction, label, fill, className, slot, }: ContentSwapProps): kerfjs.SafeHtml;

export { ContentSwap, type ContentSwapDirection, type ContentSwapProps, type ContentSwapSide, type ContentSwapTransition };
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

## `@kerfjs/ui/selection`

```ts
/**
 * What a pointer or key activation does to a multi-selection:
 * - `replace`: select only the target (a plain click or Enter);
 * - `toggle`: add or remove the target, keeping the rest (Cmd on Apple
 *   platforms, Ctrl elsewhere);
 * - `extend`: select the range from the anchor to the target (Shift).
 */
type SelectionGesture = 'replace' | 'toggle' | 'extend';
/** The modifier state of a `MouseEvent` or `KeyboardEvent`. */
interface SelectionModifiers {
    readonly shiftKey: boolean;
    readonly metaKey: boolean;
    readonly ctrlKey: boolean;
}
/** True on macOS, iOS, and iPadOS, where Cmd (not Ctrl) toggles one item. */
declare function isApplePlatform(navigatorLike?: Pick<Navigator, 'platform' | 'userAgent'> | undefined): boolean;
/**
 * Map an activation's modifiers to a {@link SelectionGesture}, normalized for
 * the host platform: Shift extends; Cmd on Apple platforms, Ctrl elsewhere,
 * toggles; anything else replaces.
 */
declare function selectionGesture(modifiers: SelectionModifiers, apple?: boolean): SelectionGesture;
interface ApplySelectionOptions<Id> {
    /** Every selectable id, in display order (leave out disabled items). */
    readonly items: readonly Id[];
    /** The current selection. */
    readonly selected: readonly Id[];
    /**
     * The last replaced or toggled item; a Shift range starts here. Without
     * one, the range starts at the first selected item, then at the target.
     */
    readonly anchor?: Id;
    /** The activated item. */
    readonly target: Id;
    readonly gesture: SelectionGesture;
}
interface SelectionResult<Id> {
    /** The new selection, in display order. */
    readonly selected: Id[];
    /** The anchor for the next Shift range. */
    readonly anchor: Id;
}
/**
 * Apply one selection gesture to a multi-selection, the conventional desktop
 * list model: `replace` selects only the target, `toggle` flips it and keeps
 * the rest, and `extend` selects the range from the anchor (the first
 * selected item when there is none, else the target) to the target. The anchor moves to the target on
 * `replace` and `toggle` and stays put on `extend`, so successive Shift
 * activations pivot around one item. A target missing from `items` (such as a
 * disabled item) leaves the selection unchanged.
 */
declare function applySelection<Id>({ items, selected, anchor, target, gesture, }: ApplySelectionOptions<Id>): SelectionResult<Id>;

export { type ApplySelectionOptions, type SelectionGesture, type SelectionModifiers, type SelectionResult, applySelection, isApplePlatform, selectionGesture };
```

## `@kerfjs/ui/disclosure`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

/**
 * The Disclosure's surface: `plain` (default) on the surrounding surface,
 * `framed` with the standard neutral border, or `sunken` on the lowered,
 * textured work surface with a border.
 */
type DisclosureAppearance = 'plain' | 'framed' | 'sunken';
/**
 * Application `data-*` identity on the `<details>` root, such as `data-key`;
 * the Disclosure's own configuration attributes stay protected.
 */
type DisclosureRootAttributes = Readonly<Record<`data-${string}`, string | undefined>>;
interface DisclosureProps {
    /** The always-visible summary: a short title for the hidden content. */
    title: KerfUiContent | string;
    /** A quiet line after the title in the summary, such as a count. */
    detail?: KerfUiContent | string;
    /** The content shown while open. */
    children: KerfUiContent | string;
    /**
     * Render it open. The open state belongs to the native `<details>` once it
     * is on the page: a person toggles it, a re-render that passes `open` opens
     * it, and a re-render never closes it (kerf's morph leaves a `<details>`
     * element's live `open` alone). Close it from code with `element.open = false`.
     */
    open?: boolean;
    /**
     * An exclusive group: Disclosures sharing a `name` behave as an accordion,
     * where opening one closes the others (the native `<details name>`).
     */
    name?: string;
    appearance?: DisclosureAppearance;
    /**
     * A `data-action` value on the `<details>` root, for a delegated listener of
     * the native `toggle` event (it does not bubble: listen in the capture phase,
     * for example with `delegateCapture`). `event.newState` is `open` or `closed`.
     */
    toggleAction?: string;
    id?: string;
    rootAttributes?: DisclosureRootAttributes;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * Content a person shows and hides under a summary row: a native `<details>`
 * with a `<summary>` that carries a `DisclosureArrow` and the title, on the
 * shared content-item geometry (8px inline margin, a 1px border, 8px
 * padding, the rounded radius). Keyboard and screen-reader behavior is the
 * platform's: the summary is a button that Enter and Space toggle, and it
 * reports its expanded state. Disclosures sharing a `name` form an accordion.
 */
declare function Disclosure({ title, detail, children, open, name, appearance, toggleAction, id, rootAttributes, className, slot, }: DisclosureProps): kerfjs.SafeHtml;

export { Disclosure, type DisclosureAppearance, type DisclosureProps, type DisclosureRootAttributes };
```

## `@kerfjs/ui/wire-choice-chips`

```ts
/** The selected values of a `multiple: true` ChoiceChips group, in choice order. */
declare function readChoiceChips(group: Element): string[];
/**
 * Give every `multiple: true` ChoiceChips group under `root` its listbox
 * behavior: a click selects one chip, Cmd (Apple platforms) or Ctrl
 * (elsewhere) toggles one, and Shift extends a range from the last plain or
 * toggled chip. On the keyboard the group is one Tab stop: arrows, Home, and
 * End move the selection, Shift with them extends it, Cmd/Ctrl with them
 * moves focus alone, Space toggles the focused chip (Shift+Space extends to
 * it), and Cmd/Ctrl+A selects every chip. Disabled chips keep their state.
 * Each change updates `aria-selected` and the hidden form inputs, then fires
 * a bubbling `change` on the group, whose `data-action` is the group's
 * `action`; read the new set with `readChoiceChips`. Returns a disposer.
 */
declare function wireChoiceChips(root: HTMLElement | Document): () => void;

export { readChoiceChips, wireChoiceChips };
```

## `@kerfjs/ui/color-swatches`

```ts
import * as kerfjs from 'kerfjs';
import { CssColor } from './css-values.js';

/** `default` is a 24px swatch; `compact` is 20px. */
type ColorSwatchesSize = 'default' | 'compact';
/** One color in the palette. */
interface ColorSwatch {
    /** The submitted value, such as `#0a84ff` or `blue`. */
    value: string;
    /** The color's name: the swatch's accessible name and its hover hint. */
    label: string;
    /**
     * The swatch's paint: a `CssColor` from `uiColor()`, `colorVar()`, or
     * `fillColor()` (`@kerfjs/ui/css-values`), or `'transparent'` for the
     * no-color swatch, drawn outlined and struck through.
     */
    color: CssColor | 'transparent';
}
/** Application `data-*` metadata; the group's own markers stay protected. */
type ColorSwatchesRootAttributes = Readonly<Record<`data-${string}`, string | undefined>>;
type ColorSwatchesProps = {
    /** The radio group name the chosen value submits under. */
    name: string;
    swatches: readonly ColorSwatch[];
    /** The chosen swatch's value. */
    value?: string;
    size?: ColorSwatchesSize;
    disabled?: boolean;
    /** Delegated `data-action` on each radio; listen for `change`. */
    action?: string;
    /** Associate the radios with a form outside their ancestor chain. */
    form?: string;
    /** The group's id. */
    id?: string;
    className?: string;
    rootAttributes?: ColorSwatchesRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
} & ({
    label: string;
    ariaLabel?: never;
} | {
    label?: never;
    ariaLabel: string;
});
/**
 * A fixed palette: a group of round color swatches with no visible text, one
 * of which is chosen. It is a native radio group, so arrow keys move the
 * choice, Tab reaches it once, and the chosen value submits under `name`.
 * Each swatch is named by its color's label (also its hover hint), and the
 * chosen one wears a ring that does not rely on its hue. A `'transparent'`
 * swatch offers "no color".
 */
declare function ColorSwatches({ name, swatches, value, label, ariaLabel, size, disabled, action, form, id, className, rootAttributes, slot, }: ColorSwatchesProps): kerfjs.SafeHtml;

export { type ColorSwatch, ColorSwatches, type ColorSwatchesProps, type ColorSwatchesRootAttributes, type ColorSwatchesSize };
```

## `@kerfjs/ui/color-picker`

```ts
import * as kerfjs from 'kerfjs';
import { ColorSwatch } from './color-swatches.js';
import './css-values.js';

/** Hue 0–360, saturation and value (brightness) 0–1, and alpha 0–1. */
interface Hsva {
    h: number;
    s: number;
    v: number;
    a: number;
}

/** The channel fields the picker shows: RGB, HSL, HSB (HSV), or one gray level. */
type ColorPickerMode = 'rgb' | 'hsl' | 'hsb' | 'gray';
/** A titled group of app-owned colors, such as "Document Colors". */
interface ColorPickerSamples {
    title: string;
    swatches: readonly ColorSwatch[];
}
/** Application `data-*` metadata; the picker's own markers stay protected. */
type ColorPickerRootAttributes = Readonly<Record<`data-${string}`, string | undefined>>;
/** The delegated action every preset and sample swatch carries. */
declare const COLOR_PICKER_SWATCH_ACTION = "kui-color-picker-swatch";
interface ColorPickerProps {
    /** The picker's id; it also prefixes its inner ids. */
    id: string;
    /** The picker's accessible name. */
    label: string;
    /**
     * The color, as CSS color text (`#rrggbb[aa]`, `rgb()`, `hsl()`); invalid
     * text shows black. The picker reports `#rrggbb`, or `#rrggbbaa` below
     * full opacity.
     */
    value: string;
    /** The channel fields shown (default `rgb`). */
    mode?: ColorPickerMode;
    /** Offer opacity: an alpha slider and field (default true). */
    alpha?: boolean;
    /** A form field name the hex value submits under. */
    name?: string;
    /** Associate the hidden input with a form outside its ancestor chain. */
    form?: string;
    /**
     * Offer a button that samples a color from the screen, where the browser
     * provides the EyeDropper API (default true; hidden elsewhere).
     */
    eyedropper?: boolean;
    /** A preset row of swatches under the controls. */
    presets?: readonly ColorSwatch[];
    /** Titled groups of app-owned colors under the presets. */
    samples?: readonly ColorPickerSamples[];
    /**
     * A `data-action` for an "Add to Samples" button in the controls row; the
     * app reads the picker's current value and adds it to its samples.
     */
    addSampleAction?: string;
    disabled?: boolean;
    className?: string;
    rootAttributes?: ColorPickerRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/** The labels, accessible names, and maximum of each channel field per mode. */
declare const COLOR_PICKER_CHANNELS: Record<ColorPickerMode, readonly {
    short: string;
    name: string;
    max: number;
}[]>;
/** The rounded channel values a mode shows for an HSV color. */
declare function colorPickerChannels(mode: ColorPickerMode, hsv: Hsva): number[];
/** The area's spoken value. */
declare function colorPickerAreaText(hsv: Hsva): string;
/** The CSS custom properties that place the thumbs and paint the tracks. */
declare function colorPickerStyle(hsv: Hsva): string;
/**
 * A full color picker panel: a saturation and brightness area, a hue slider,
 * an optional opacity slider on a checkerboard, a color-model menu (RGB, HSL,
 * HSB, Grayscale) with its channel fields, a hex field (8 digits below full
 * opacity) and an opacity field, an optional screen sampler (EyeDropper), and
 * optional preset and sample swatches. The controlled `value` renders it;
 * wire `wireColorPickers` from `@kerfjs/ui/wire-color-pickers` to make it
 * interactive. The interactive surface belongs to that wiring after the first
 * render, so a drag never fights a re-render; a new `value` from the app
 * resynchronizes it.
 */
declare function ColorPicker({ id, label, value, mode, alpha, name, form, eyedropper, presets, samples, addSampleAction, disabled, className, rootAttributes, slot, }: ColorPickerProps): kerfjs.SafeHtml;

export { COLOR_PICKER_CHANNELS, COLOR_PICKER_SWATCH_ACTION, ColorPicker, type ColorPickerMode, type ColorPickerProps, type ColorPickerRootAttributes, type ColorPickerSamples, colorPickerAreaText, colorPickerChannels, colorPickerStyle };
```

## `@kerfjs/ui/color-field`

```ts
import * as kerfjs from 'kerfjs';
import { ColorPickerMode } from './color-picker.js';
import './color-swatches.js';
import './css-values.js';

/** `default` matches TextField's box; `compact` its compact size. */
type ColorFieldSize = 'default' | 'compact';
/** Application `data-*` metadata; the field's own markers stay protected. */
type ColorFieldRootAttributes = Readonly<Record<`data-${string}`, string | undefined>>;
type ColorFieldProps = {
    /** The trigger's id; it also prefixes the hint and error ids. */
    id: string;
    /** CSS color text; invalid text shows black. */
    value: string;
    /** The picker's model when it opens (default `rgb`). */
    mode?: ColorPickerMode;
    /** Offer opacity in the picker (default true). */
    alpha?: boolean;
    /** A form field name the hex value submits under. */
    name?: string;
    /** Associate the hidden input with a form outside its ancestor chain. */
    form?: string;
    /** Supporting text below the field, also its description. */
    hint?: string;
    /** An error below the field that marks it invalid. */
    error?: string;
    size?: ColorFieldSize;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    rootAttributes?: ColorFieldRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
} & ({
    label: string;
    ariaLabel?: never;
} | {
    label?: never;
    ariaLabel: string;
});
/**
 * A form field for a color: a label above a trigger that shows the current
 * color as a swatch and its hex value. Pressing it opens a ColorPicker in an
 * AnchoredSurface anchored to the field; Escape or a press outside closes it
 * and focus returns to the trigger. Wire `wireColorFields` from
 * `@kerfjs/ui/wire-color-fields`; it previews edits on the trigger, reports
 * them, and the app re-renders with the new value.
 */
declare function ColorField({ id, value, mode, alpha, name, form, label, ariaLabel, hint, error, size, disabled, required, className, rootAttributes, slot, }: ColorFieldProps): kerfjs.SafeHtml;

export { ColorField, type ColorFieldProps, type ColorFieldRootAttributes, type ColorFieldSize };
```

## `@kerfjs/ui/search-field-model`

```ts
export { b as SearchFieldModel, c as SearchFieldModelOptions, e as SearchFieldResolvedToken, f as SearchFieldRule, g as SearchFieldState, h as SearchFieldStructure, i as SearchFieldSuggestion, n as createSearchFieldModel } from './search-field-CrGTN5sa.js';
import 'kerfjs';
import './semantic-content-BbzjvSu9.js';
```

## `@kerfjs/ui/tag-field`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

/** The delegated actions a TagField's controls carry; `wireTagFields` handles them. */
declare const tagFieldActions: {
    readonly edit: "edit-tag-field-tag";
    readonly remove: "remove-tag-field-tag";
    readonly clear: "clear-tag-field";
};
interface TagFieldProps {
    /** The field's id: the editor's identity and the prefix of its label and hint ids. */
    id: string;
    /** The visible label, which also names the field. */
    label: string;
    /** The tags, in order. Each is submitted as its own `name` value. */
    tags: readonly string[];
    /** The form field name each tag submits under. */
    name?: string;
    /** Associate the hidden inputs with a form outside their ancestor chain. */
    form?: string;
    /** Placeholder while the field is empty (default `Add tag…`). */
    placeholder?: string;
    /** Placeholder after the last tag (default `Add another…`). */
    morePlaceholder?: string;
    /** Supporting text below the field, also its description. */
    hint?: string;
    /** An error that replaces the hint and marks the field invalid. */
    error?: string;
    /** The most tags it accepts; `wireTagFields` refuses more. */
    max?: number;
    required?: boolean;
    disabled?: boolean;
    /** The leading glyph (default a Lucide `tag`). */
    icon?: KerfUiContent;
    /** The clear button's accessible name (default `Clear Tags`). */
    clearLabel?: string;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A form field that collects short values as removable tags: SearchField's
 * token editor in its `form-field` presentation, with each tag a chip and a
 * hidden input that submits it under `name`. Typing then Enter (or a
 * delimiter such as a comma) adds a tag; Backspace at the start removes the
 * last one; each chip's label edits it and its × removes it. The app owns
 * the tag list: wire `wireTagFields` from `@kerfjs/ui/wire-tag-fields` and
 * re-render with the list its `onChange` reports.
 */
declare function TagField({ id, label, tags, name, form, placeholder, morePlaceholder, hint, error, max, required, disabled, icon, clearLabel, className, slot, }: TagFieldProps): kerfjs.SafeHtml;

export { TagField, type TagFieldProps, tagFieldActions };
```

## `@kerfjs/ui/combobox`

```ts
import * as kerfjs from 'kerfjs';

/** A suggestion: a plain string, or a value with a distinct visible label. */
type ComboboxSuggestion = string | {
    value: string;
    label: string;
};
interface ComboboxProps {
    /** Unique id; it also identifies the field in `wireComboboxes` reports. */
    id: string;
    /** Visible field label. */
    label: string;
    /** Suggestions to filter as the person types. */
    suggestions: readonly ComboboxSuggestion[];
    /** Initial text; the field owns its text while the person types. */
    value?: string;
    placeholder?: string;
    /** Optional hint below the field, such as "Press Enter to add". */
    hint?: string;
    /** Form field name. */
    name?: string;
    /**
     * Offer to create the typed text when it matches no suggestion; the option
     * reads `createLabel` with `{value}` replaced. Omit to only allow
     * suggestions. Default `Create “{value}”`.
     */
    createLabel?: string | false;
    disabled?: boolean;
    className?: string;
}
/**
 * A free-text field with a filtered suggestion list that can also create a new
 * value: the ARIA combobox pattern on a native input with the themed Web
 * Awesome field chrome. `wireComboboxes` filters, moves the active option,
 * and reports commits (Enter, comma, or a click). Use `Select` when only
 * existing values are allowed and nothing is typed.
 */
declare function Combobox({ id, label, suggestions, value, placeholder, hint, name, createLabel, disabled, className, }: ComboboxProps): kerfjs.SafeHtml;

export { Combobox, type ComboboxProps, type ComboboxSuggestion };
```

## `@kerfjs/ui/text-field`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

/** `default` is the 44px control height; `compact` is 33px with smaller text. */
type TextFieldSize = 'default' | 'compact';
/** The kinds of single-line value a TextField takes. */
type TextFieldType = 'text' | 'email' | 'password' | 'search' | 'url' | 'tel' | 'number';
/** Application `data-*` metadata; the TextField's own markers stay protected. */
type TextFieldRootAttributes = Readonly<Record<`data-${string}`, string | undefined>>;
/**
 * The field's accessible name: a visible `label`, or `ariaLabel` when the
 * surrounding content already names it.
 */
type TextFieldName = {
    label: string;
    ariaLabel?: never;
} | {
    label?: never;
    ariaLabel: string;
};
type TextFieldProps = TextFieldName & TextFieldOptions;
interface TextFieldOptions {
    /** The controlled value. */
    value?: string;
    name?: string;
    placeholder?: string;
    /** Supporting text below the field, also its accessible description. */
    hint?: string;
    /**
     * A validation message: shown below the field in the danger color, added
     * to its description, and marking it `aria-invalid`.
     */
    error?: string;
    size?: TextFieldSize;
    /** A leading decorative icon, such as a `LucideIcon` (single-line only). */
    icon?: KerfUiContent;
    /**
     * A clear button while the field has a value (single-line only). Needs
     * `wireTextFields(root)`, which clears the field and announces `input`.
     */
    clearable?: boolean;
    /** The clear button's accessible name (default `Clear`). */
    clearLabel?: string;
    /** The most characters the field accepts (native `maxlength`). */
    maxLength?: number;
    /**
     * Show a live `count / maxLength` below the field. Needs `maxLength` and
     * `wireTextFields(root)`, which updates it as people type.
     */
    showCount?: boolean;
    /** Single-line value kind (default `text`). */
    type?: TextFieldType;
    /** A multi-line field: a `<textarea>`. */
    multiline?: boolean;
    /** A multi-line field's height in lines (default 3). */
    rows?: number;
    /**
     * Grow a multi-line field with its content from `rows` up to this many
     * lines, then scroll.
     */
    maxRows?: number;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    autocomplete?: string;
    /** The input's id, for an external label or form. */
    id?: string;
    className?: string;
    /** Safe `data-*` metadata (a `data-key`). */
    rootAttributes?: TextFieldRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A text input with its label above, an optional leading icon and clear
 * button, and supporting or error text below, at the 44px control height or
 * compact. `multiline` makes it a textarea that can grow with its content.
 * The whole field is one `<label>`, so clicking anywhere on it focuses the
 * input; the input is named by `label` (or `ariaLabel`) directly.
 */
declare function TextField({ label, ariaLabel, value, name, placeholder, hint, error, size, icon, clearable, clearLabel, maxLength, showCount, type, multiline, rows, maxRows, disabled, readOnly, required, autocomplete, id, className, rootAttributes, slot, }: TextFieldProps): kerfjs.SafeHtml;

export { TextField, type TextFieldName, type TextFieldOptions, type TextFieldProps, type TextFieldRootAttributes, type TextFieldSize, type TextFieldType };
```

## `@kerfjs/ui/checkbox`

```ts
import * as kerfjs from 'kerfjs';

/** `default` is a 20px box beside 16px text; `compact` an 18px box and 14px text. */
type CheckboxSize = 'default' | 'compact';
/** Application `data-*` metadata; the Checkbox's own markers stay protected. */
type CheckboxRootAttributes = Readonly<Record<`data-${string}`, string | undefined>>;
interface CheckboxProps {
    /** The visible label, which is also the checkbox's accessible name. */
    label: string;
    checked?: boolean;
    /**
     * A mixed state, such as a parent of partly checked children. Needs
     * `wireCheckboxes(root)`, which sets the native `indeterminate` property.
     */
    indeterminate?: boolean;
    name?: string;
    /** The value submitted while checked (native default `on`). */
    value?: string;
    /** Supporting text below the label, also the checkbox's description. */
    hint?: string;
    /** A validation message: shown in the danger color and marking it invalid. */
    error?: string;
    size?: CheckboxSize;
    disabled?: boolean;
    required?: boolean;
    /** Delegated `data-action` on the input; listen for `change`. */
    action?: string;
    /** Associate the input with a form outside its ancestor chain. */
    form?: string;
    /** The input's id. */
    id?: string;
    className?: string;
    /** Safe `data-*` metadata (a `data-key`). */
    rootAttributes?: CheckboxRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A native checkbox drawn as a Kerf box beside its label, with optional hint
 * and error text aligned under the label, a mixed (indeterminate) state, and
 * native form participation.
 */
declare function Checkbox({ label, checked, indeterminate, name, value, hint, error, size, disabled, required, action, form, id, className, rootAttributes, slot, }: CheckboxProps): kerfjs.SafeHtml;

export { Checkbox, type CheckboxProps, type CheckboxRootAttributes, type CheckboxSize };
```

## `@kerfjs/ui/radio-group`

```ts
import * as kerfjs from 'kerfjs';

/** `default` is a 20px circle beside 16px text; `compact` 18px and 14px. */
type RadioGroupSize = 'default' | 'compact';
/** `vertical` stacks the choices; `horizontal` lines them up and wraps. */
type RadioGroupOrientation = 'vertical' | 'horizontal';
/** Application `data-*` metadata; the RadioGroup's own markers stay protected. */
type RadioGroupRootAttributes = Readonly<Record<`data-${string}`, string | undefined>>;
interface RadioGroupChoice<Value extends string = string> {
    value: Value;
    /** Visible label; it is also the radio's accessible name. */
    label: string;
    /** Supporting text under this choice's label, also its description. */
    hint?: string;
    disabled?: boolean;
}
/** A group is named by a visible `label` (its legend) or by `ariaLabel`. */
type RadioGroupName = {
    label: string;
    ariaLabel?: never;
} | {
    label?: never;
    ariaLabel: string;
};
interface RadioGroupOptions<Value extends string = string> {
    /** Native input `name`: the form field the selected value submits under. */
    name: string;
    choices: readonly RadioGroupChoice<Value>[];
    /** The selected value. Omit for no selection. */
    value?: NoInfer<Value>;
    /** Supporting text below the choices, also the group's description. */
    hint?: string;
    /** A validation message: shown in the danger color and marking it invalid. */
    error?: string;
    size?: RadioGroupSize;
    orientation?: RadioGroupOrientation;
    /** Require a selection for native form validation. */
    required?: boolean;
    /** Disable the whole group. */
    disabled?: boolean;
    /** Delegated `data-action` on every radio; listen for `change`. */
    action?: string;
    /** Associate the radios with a form outside their ancestor chain. */
    form?: string;
    /** The fieldset's id. */
    id?: string;
    className?: string;
    /** Safe `data-*` metadata (a `data-key`). */
    rootAttributes?: RadioGroupRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
type RadioGroupProps<Value extends string = string> = RadioGroupName & RadioGroupOptions<Value>;
/**
 * One exclusive choice among a few visible options: a native fieldset of
 * radios, each drawn as a Kerf circle beside its label, with the group label
 * above and hint and error text below. The browser owns the interaction: one
 * Tab stop, arrow keys move and select, and the checked value submits.
 */
declare function RadioGroup<Value extends string>({ label, ariaLabel, name, choices, value, hint, error, size, orientation, required, disabled, action, form, id, className, rootAttributes, slot, }: RadioGroupProps<Value>): kerfjs.SafeHtml;

export { RadioGroup, type RadioGroupChoice, type RadioGroupName, type RadioGroupOptions, type RadioGroupOrientation, type RadioGroupProps, type RadioGroupRootAttributes, type RadioGroupSize };
```

## `@kerfjs/ui/switch`

```ts
import * as kerfjs from 'kerfjs';

/** `default` is a 35×20 track beside 16px text; `compact` 31.5×18 and 14px. */
type SwitchSize = 'default' | 'compact';
/** Application `data-*` metadata; the Switch's own markers stay protected. */
type SwitchRootAttributes = Readonly<Record<`data-${string}`, string | undefined>>;
interface SwitchProps {
    /** The visible label, which is also the switch's accessible name. */
    label: string;
    /** Whether the setting is on. */
    checked?: boolean;
    name?: string;
    /** The value submitted while on (native default `on`). */
    value?: string;
    /** Supporting text below the label, also the switch's description. */
    hint?: string;
    size?: SwitchSize;
    disabled?: boolean;
    /** Delegated `data-action` on the input; listen for `change`. */
    action?: string;
    /** Associate the input with a form outside its ancestor chain. */
    form?: string;
    /** The input's id. */
    id?: string;
    className?: string;
    /** Safe `data-*` metadata (a `data-key`). */
    rootAttributes?: SwitchRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * An on/off setting that applies immediately: a native checkbox with
 * `role="switch"`, drawn as a track and thumb beside its label, with an
 * optional hint aligned under the label.
 */
declare function Switch({ label, checked, name, value, hint, size, disabled, action, form, id, className, rootAttributes, slot, }: SwitchProps): kerfjs.SafeHtml;

export { Switch, type SwitchProps, type SwitchRootAttributes, type SwitchSize };
```

## `@kerfjs/ui/slider`

```ts
import * as kerfjs from 'kerfjs';
import { CssLength } from './css-values.js';

/** `default` is a 4px track with a 20px thumb at 16px text; `compact` 3px, 16px, and 14px. */
type SliderSize = 'default' | 'compact';
/** `horizontal` (default), or `vertical` with its minimum at the bottom. */
type SliderOrientation = 'horizontal' | 'vertical';
/**
 * A labeled stop under the track: a value and the text shown for it. The
 * labels are visual; the input still reports its value to assistive
 * technology. (No `<datalist>`: Chromium shrinks a styled range's track when
 * the input has a `list`.)
 */
interface SliderTick {
    value: number;
    label?: string;
}
/** Application `data-*` metadata; the Slider's own markers stay protected. */
type SliderRootAttributes = Readonly<Record<`data-${string}`, string | undefined>>;
type SliderProps = {
    /** The input's id; it also derives the readout, hint, and tick ids. */
    id: string;
    /** The current value (default the midpoint of `min` and `max`, snapped to `step`). */
    value?: number;
    /** The lowest value (default 0). */
    min?: number;
    /** The highest value (default 100). */
    max?: number;
    /** The step between values (default 1). */
    step?: number;
    name?: string;
    /** Show the current value at the end of the label row, live while dragging. */
    showValue?: boolean;
    /** Text after the readout's number, such as `%` or ` px`. */
    unit?: string;
    /** Supporting text below the slider, also its description. */
    hint?: string;
    /** Labeled stops under the track. */
    ticks?: readonly SliderTick[];
    /**
     * `vertical` stands the slider up (a volume control in a popup), minimum at
     * the bottom, `length` tall; it takes no `ticks`.
     */
    orientation?: SliderOrientation;
    /** A vertical slider's length (default 160px). */
    length?: CssLength;
    size?: SliderSize;
    disabled?: boolean;
    /** Delegated `data-action` on the input; listen for `input` or `change`. */
    action?: string;
    /** Associate the input with a form outside its ancestor chain. */
    form?: string;
    className?: string;
    rootAttributes?: SliderRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
} & ({
    label: string;
    ariaLabel?: never;
} | {
    label?: never;
    ariaLabel: string;
});
/**
 * A value on a continuous or stepped range: a native `<input type="range">`
 * drawn as a track, a brand fill up to the value, and a thumb, with a label
 * row, an optional live readout (`<output>`), labeled tick stops, and a hint.
 * Keyboard, pointer, and screen-reader behavior are the platform's. Wire
 * `wireSliders` from `@kerfjs/ui/wire-sliders` above it so the fill and the
 * readout follow a drag before the app re-renders.
 */
declare function Slider({ id, value, min, max, step, name, label, ariaLabel, showValue, unit, hint, ticks, size, orientation, length, disabled, action, form, className, rootAttributes, slot, }: SliderProps): kerfjs.SafeHtml;

export { Slider, type SliderOrientation, type SliderProps, type SliderRootAttributes, type SliderSize, type SliderTick };
```

## `@kerfjs/ui/anchored-surface`

```ts
import { PopoverOptions, OverlayContent, OverlayHandle } from 'kerfjs/overlay';

/** App-facing options for a non-modal, arbitrary-content help surface. */
interface AnchoredSurfaceOptions extends Pick<PopoverOptions, 'placement' | 'align' | 'gap' | 'dismiss' | 'initialFocus' | 'onDismiss' | 'outsideIgnore' | 'container'> {
    /** Accessible name for the non-modal dialog. */
    label: string;
    /**
     * Gutter in px kept between the surface and the viewport edges when it is
     * clamped horizontally and fitted vertically. Default `8`, the same gutter as
     * the surface's maximum size.
     */
    viewportMargin?: number;
    /**
     * Where to append the surface. Default: inside the anchor's open modal
     * dialog — a native `<dialog>`'s host slot, or a slot kerf creates in a
     * `wa-dialog` / `wa-drawer` — so the surface stays interactive there;
     * otherwise `document.body`. Pass an element only for a modal context kerf
     * cannot resolve; an element inside an open modal closes the surface with it.
     */
    container?: Element;
    /**
     * Surface tone. `'default'` follows the anchor's color scheme. `'dark'` is
     * the loud, inverse tone of a `ToolbarControlGroup` / `ToolbarText`
     * `tone="dark"`, for a popup anchored to dark media chrome (a volume popup
     * over a video preview): dark beside a light page and light beside a dark
     * one, so the popup matches the control group that opened it. The surface
     * takes the opposite of the anchor's color scheme, so it and every Kerf UI
     * or Web Awesome component inside it resolve the same semantic
     * `light-dark()` tokens to the other side: no new colors, no child
     * overrides. While open it follows a live switch of that scheme (the OS
     * preference, or an app theme class or attribute on an ancestor). Default
     * `'default'`.
     */
    tone?: AnchoredSurfaceTone;
}
/** {@link AnchoredSurfaceOptions.tone}: follow the anchor's scheme, or invert it. */
type AnchoredSurfaceTone = 'default' | 'dark';
/** A viewport pointer location; `context` is the element under the pointer. */
interface AnchoredSurfacePoint {
    x: number;
    y: number;
    /**
     * Pass the event target when opening from inside a modal dialog, native or
     * Web Awesome (`wa-dialog`, `wa-drawer`). The dark tone also reads its
     * color scheme from `context`, so a region with its own `color-scheme` is
     * honored; without it the scheme is the modal scope's (or the page's).
     */
    context?: Element;
}
/**
 * Open app-owned content beside an element. The surface owns its Kerf UI chrome;
 * kerfjs/overlay owns positioning, top-layer/modal hosting, focus, and dismissal.
 * The surface stays `viewportMargin` inside the viewport edges and fits its
 * height to the room beside the anchor (the roomier side when neither holds it),
 * scrolling its content; `--kui-anchored-surface-available-height` exposes that
 * room to the content, updated as the page scrolls or resizes.
 * The caller owns content, action policy, and calling `close()` when an action
 * completes. `initialFocus` defaults to the first focusable descendant; set it
 * to `false` for read-only help that should leave focus on its trigger.
 */
declare function openAnchoredSurface(anchor: Element, content: OverlayContent, options: AnchoredSurfaceOptions): OverlayHandle;
/**
 * Open the same surface at pointer coordinates. The temporary anchor has no
 * layout or hit target. `context` keeps a surface opened inside a modal dialog
 * in that dialog's interactive host slot; it is removed on close or failure.
 */
declare function openAnchoredSurfaceAt(point: AnchoredSurfacePoint, content: OverlayContent, options: AnchoredSurfaceOptions): OverlayHandle;

export { type AnchoredSurfaceOptions, type AnchoredSurfacePoint, type AnchoredSurfaceTone, openAnchoredSurface, openAnchoredSurfaceAt };
```

## `@kerfjs/ui/button`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';
import { BadgeTone } from './badge.js';
import './css-values.js';
import './semantic-tone-CdW013KF.js';

/** The color family: `neutral` (default), `brand` for the main action, `danger` for a destructive one. */
type ButtonTone = 'neutral' | 'brand' | 'danger';
/**
 * How loudly it asks: `primary` (default) fills the button, `secondary`
 * outlines it, and `plain` shows only its text until hovered.
 */
type ButtonEmphasis = 'primary' | 'secondary' | 'plain';
/** `default` is the 44px control height; `compact` is 33px with smaller text. */
type ButtonSize = 'default' | 'compact';
/** Corner shape: the shared `rounded` control radius (default) or a full `pill`. */
type ButtonShape = 'rounded' | 'pill';
/** What a form button does: `button` (default), `submit`, or `reset`. */
type ButtonType = 'button' | 'submit' | 'reset';
/** Application `data-*` metadata; the Button's own markers stay protected. */
type ButtonRootAttributes = Readonly<Record<`data-${string}`, string | undefined>>;
/** A Button's visible label: text or rendered content, never empty. */
type ButtonLabel = string | Exclude<KerfUiContent, null | undefined | boolean>;
/**
 * A labeled button (its label names it; `ariaLabel` only when the label is
 * not enough), or an icon-only square named by `ariaLabel`.
 */
type ButtonContent = {
    /** The label. */
    children: ButtonLabel;
    /** A leading icon, such as a `LucideIcon`; it is decorative. */
    icon?: KerfUiContent;
    ariaLabel?: string;
} | {
    children?: undefined;
    /** The icon of an icon-only square button. */
    icon: KerfUiContent;
    /** The accessible name an icon-only button needs. */
    ariaLabel: string;
};
type ButtonProps = ButtonContent & ButtonOptions;
interface ButtonOptions {
    tone?: ButtonTone;
    emphasis?: ButtonEmphasis;
    size?: ButtonSize;
    /** Corner shape (default `rounded`). */
    shape?: ButtonShape;
    /**
     * Make it a toggle: `aria-pressed` reports the state, and a pressed look is
     * drawn on top of the tone and emphasis. The application owns the state and
     * flips it in its `action` handler. A link (`href`) cannot be a toggle.
     */
    pressed?: boolean;
    /**
     * Busy: a spinner replaces the label (which still names it) and the button
     * reports `aria-busy`. Presses still reach it; the application decides
     * what a press does while it is busy.
     */
    loading?: boolean;
    disabled?: boolean;
    /** A form button's behavior (default `button`, which never submits). */
    type?: ButtonType;
    name?: string;
    value?: string;
    /** The id of the form it belongs to, when it sits outside that form. */
    form?: string;
    /** Render a link with button styling instead of a `<button>`. */
    href?: string;
    /** Where a link opens. */
    target?: '_self' | '_blank' | '_parent' | '_top';
    /** Delegated `data-action` the application handles. */
    action?: string;
    /**
     * A count, short text, or `true` for a text-free dot over the button's
     * top-trailing corner, such as how many items a filter hides. It stays out
     * of the accessible name unless `badgeLabel` names it.
     */
    badge?: number | string | true;
    /** Words for the badge ("3 hidden"), added to the button's name. */
    badgeLabel?: string;
    /** The badge's tone (default `danger`). */
    badgeTone?: BadgeTone;
    /**
     * Native hover text that says more than the name, such as "More Actions
     * for report.pdf". An icon-only Button already gets a help tag with its
     * `ariaLabel` (with `@kerfjs/ui/help-tags-register`); a `title` replaces
     * that tag.
     */
    title?: string;
    id?: string;
    className?: string;
    /** Safe `data-*` metadata (a `data-key`, `data-dialog-close`). */
    rootAttributes?: ButtonRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A standalone action button: a native `<button>` (or a link with `href`)
 * in one of three tones and three emphases, at the 44px control height or
 * compact, with a label or as an icon-only square, rounded or pill-shaped,
 * and optionally a `pressed` toggle. Inside a
 * `ToolbarControlGroup`, use a plain `<button>`, which the group styles; use
 * Button for a dialog footer, a form, or a standalone action beside other
 * content.
 */
declare function Button({ children, tone, emphasis, size, shape, pressed, icon, loading, disabled, type, name, value, form, href, target, action, badge, badgeLabel, badgeTone, ariaLabel, title, id, className, rootAttributes, slot, }: ButtonProps): kerfjs.SafeHtml;

export { Button, type ButtonContent, type ButtonEmphasis, type ButtonLabel, type ButtonOptions, type ButtonProps, type ButtonRootAttributes, type ButtonShape, type ButtonSize, type ButtonTone, type ButtonType };
```

## `@kerfjs/ui/split-button`

```ts
import { SafeHtml } from 'kerfjs';

/** The loud fill the whole split button paints. */
type SplitButtonTone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger';
type SplitButtonRootAttributes = Readonly<Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-tone'?: never;
    'data-fill'?: never;
    'data-busy'?: never;
}>;
interface SplitButtonProps {
    /** Visible primary label. */
    label: string;
    /** Delegated `data-action` of the primary half. */
    action: string;
    /** Optional decorative leading icon of the primary half. */
    icon?: SafeHtml;
    /** Primary accessible name when it should say more than `label`. */
    accessibleLabel?: string;
    /** Accessible name (and tooltip) of the options trigger. */
    optionsLabel: string;
    /** Delegated `data-action` of the options trigger, which opens the app's menu. */
    optionsAction: string;
    /** Whether the options menu is open, exposed as `aria-expanded`. */
    optionsExpanded?: boolean;
    /** What the options trigger opens, exposed as `aria-haspopup`; defaults to `menu`. */
    optionsPopup?: 'menu' | 'dialog' | 'listbox';
    /** Element id the options trigger controls, exposed as `aria-controls`. */
    optionsControls?: string;
    /** The loud fill; defaults to `brand`. Switch it (for example to `neutral`) while running. */
    tone?: SplitButtonTone;
    /** Span the full width of the parent instead of sizing to the label. */
    fill?: boolean;
    /** Show work in progress: a spinner replaces the icon and the primary is `aria-busy`. */
    busy?: boolean;
    /** Disable the primary half. */
    disabled?: boolean;
    /** Disable the options trigger. */
    optionsDisabled?: boolean;
    /** Native tooltip of the primary half, for example why it is disabled. */
    title?: string;
    className?: string;
    /** Safe `data-*` metadata; SplitButton-owned markers stay protected. */
    rootAttributes?: SplitButtonRootAttributes;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A primary action with an attached options trigger on one loud, semantic
 * fill (a "Drive" button with a provider menu). Both halves are native
 * buttons, so `aria-expanded` and the accessible names reach assistive
 * technology directly; the application opens its own menu from the options
 * action and owns the running state.
 */
declare function SplitButton({ label, action, icon, accessibleLabel, optionsLabel, optionsAction, optionsExpanded, optionsPopup, optionsControls, tone, fill, busy, disabled, optionsDisabled, title, className, rootAttributes, slot, }: SplitButtonProps): SafeHtml;

export { SplitButton, type SplitButtonProps, type SplitButtonTone };
```

## `@kerfjs/ui/file-picker`

```ts
import { SafeHtml } from 'kerfjs';

interface FileInputProps {
    /** Accepted types, as the native `accept` attribute (`.png,image/*`). */
    accept?: string;
    /** Allow several files at once. */
    multiple?: boolean;
    /** Form field name of the native file input. */
    name?: string;
    /** Identifies this picker in `wireFilePickers` reports. */
    pickerId?: string;
    disabled?: boolean;
    className?: string;
}
interface FilePickerTriggerProps extends FileInputProps {
    /** Visible trigger text, such as "Add". */
    label: string;
    /** Accessible name of the file input when it should say more than `label`. */
    accessibleLabel?: string;
    /** Optional decorative leading icon, normally an unsized LucideIcon. */
    icon?: SafeHtml;
}
interface FileDropZoneProps extends FileInputProps {
    /** Primary copy, such as "Drop attachments here or browse". */
    title: string;
    /** Optional secondary copy, such as accepted types or a size limit. */
    detail?: string;
    /** Optional decorative icon above the copy, normally an unsized LucideIcon. */
    icon?: SafeHtml;
    /** Accessible name of the file input when it should say more than `title`. */
    accessibleLabel?: string;
    /**
     * A selector for an enclosing element (the zone's ancestor) that also
     * takes drops, such as an attachments panel: while files are dragged over
     * any part of it the zone is highlighted, and files dropped there are
     * reported for this zone (`via: 'drop'`).
     */
    dropScope?: string;
}
/**
 * A compact, link-toned trigger that opens the native file chooser: a label
 * around a visually hidden `<input type="file">`, so a click or keyboard
 * activation reaches the input without script. Report choices with
 * `wireFilePickers`.
 */
declare function FilePickerTrigger(props: FilePickerTriggerProps): SafeHtml;
/**
 * A dashed drop target that also opens the file chooser when clicked. While
 * files are dragged over it, `wireFilePickers` sets `data-dragging` and Kerf
 * highlights it; dropped and chosen files are reported the same way.
 */
declare function FileDropZone(props: FileDropZoneProps): SafeHtml;

export { FileDropZone, type FileDropZoneProps, FilePickerTrigger, type FilePickerTriggerProps };
```

## `@kerfjs/ui/corner-status`

```ts
import * as kerfjs from 'kerfjs';
import { K as KerfUiContent } from './semantic-content-BbzjvSu9.js';

/** The viewport corner a CornerStatus occupies, in logical (RTL-aware) terms. */
type CornerStatusPlacement = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
/** Where a CornerStatus appears: the top layer, or in flow. */
type CornerStatusPresentation = 'overlay' | 'embedded';
interface CornerStatusProps {
    /** The root id: what a `popovertarget` control or `getElementById` names. */
    id?: string;
    /** One or more `StateBanner`s, typically `urgency="status"`; they stack. */
    children: KerfUiContent;
    /** Viewport corner; defaults to `bottom-end`. */
    placement?: CornerStatusPlacement;
    /**
     * `overlay` (default) is a native `popover="manual"` host in the top layer,
     * opened by `wireCornerStatus`: above fixed and z-indexed page chrome,
     * never focused, and with no close button, light dismiss, or Escape.
     * `embedded` renders the same stack in flow for a catalog or inline use.
     */
    presentation?: CornerStatusPresentation;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A non-dismissible status surface pinned to a viewport corner — "Loading…",
 * "Updating Tickets… 3 of 12" — for app-level progress that has no better
 * home beside the affected work. The application owns its lifetime: render it
 * while the work runs and remove it when the work ends. It carries no role of
 * its own; the composed `StateBanner` is the polite live region. Use a toast
 * for transient, dismissible confirmation instead.
 */
declare function CornerStatus({ id, children, placement, presentation, className, slot, }: CornerStatusProps): kerfjs.SafeHtml;

export { CornerStatus, type CornerStatusPlacement, type CornerStatusPresentation, type CornerStatusProps };
```

## `@kerfjs/ui/edge-activity-indicator`

```ts
import * as kerfjs from 'kerfjs';
import { S as SemanticTone } from './semantic-tone-CdW013KF.js';

interface EdgeActivityIndicatorProps {
    /** Whether work is in progress; shows the strip and runs its wave. */
    busy: boolean;
    /**
     * Optional status shown in a small pill hanging from the edge while busy.
     * The pill is a polite live region; omit it for a purely decorative strip.
     */
    message?: string;
    /** Strip and pill color; defaults to `info`. */
    tone?: SemanticTone;
    /** Clear the device's top safe area (default) or sit at the very edge. */
    inset?: 'safe-area' | 'none';
    className?: string;
}
/**
 * A layout-free activity strip pinned to the top edge of the viewport: a row
 * of thin bars that ripple in a traveling wave while `busy`, plus an optional
 * hanging status pill. It allocates no layout, ignores the pointer, and its
 * bars are hidden from assistive technology; only the pill announces.
 * Kerf owns the motion: it scales in from the edge and, under reduced motion,
 * only fades.
 */
declare function EdgeActivityIndicator({ busy, message, tone, inset, className, }: EdgeActivityIndicatorProps): kerfjs.SafeHtml;

export { EdgeActivityIndicator, type EdgeActivityIndicatorProps };
```

## `@kerfjs/ui/progress-bar`

```ts
import * as kerfjs from 'kerfjs';

/** The fill color: `brand` (default), or a status tone. */
type ProgressTone = 'brand' | 'success' | 'warning' | 'danger';
/** `default` is a 6px track; `compact` is 4px, for a row or table cell. */
type ProgressBarSize = 'default' | 'compact';
/**
 * Application `data-*` identity on the ProgressBar root, such as `data-key`;
 * its own configuration attributes stay protected.
 */
type ProgressBarRootAttributes = Readonly<Record<`data-${string}`, string | undefined>>;
type ProgressBarProps = {
    /**
     * Work done so far, from 0 to `max`. Omit it for indeterminate progress
     * (work whose size is unknown), which animates instead.
     */
    value?: number;
    /** The amount that means done (default 1). */
    max?: number;
    /**
     * Spoken progress in place of the percentage, such as "3 of 12 files". With
     * `showValue` it is also the visible text.
     */
    valueText?: string;
    /** Show the value (or `valueText`) at the end of the label row. */
    showValue?: boolean;
    tone?: ProgressTone;
    size?: ProgressBarSize;
    id?: string;
    rootAttributes?: ProgressBarRootAttributes;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
} & ({
    /** A visible label above the bar that also names it. */
    label: string;
    ariaLabel?: never;
} | {
    label?: never;
    /** The bar's accessible name when it shows no visible label. */
    ariaLabel: string;
});
/**
 * A linear progress indicator on the native `<progress>` element: determinate
 * (`value` of `max`) or indeterminate (no `value`, an animated sweep), named
 * by a visible `label` or an `ariaLabel`, toned, and in two track sizes. The
 * native element carries the progressbar role and its value to assistive
 * technology; `valueText` replaces the spoken percentage.
 */
declare function ProgressBar({ value, max, valueText, showValue, label, ariaLabel, tone, size, id, rootAttributes, className, slot, }: ProgressBarProps): kerfjs.SafeHtml;

export { ProgressBar, type ProgressBarProps, type ProgressBarRootAttributes, type ProgressBarSize, type ProgressTone };
```

## `@kerfjs/ui/progress-ring`

```ts
import * as kerfjs from 'kerfjs';
import { ProgressTone } from './progress-bar.js';

/**
 * The ring's diameter: `small` (16px) sits in a line of text, `medium` (24px,
 * the default) beside an icon in a row or toolbar, and `large` (40px) on its
 * own.
 */
type ProgressRingSize = 'small' | 'medium' | 'large';
/**
 * Application `data-*` identity on the ProgressRing root, such as `data-key`;
 * its own configuration attributes stay protected.
 */
type ProgressRingRootAttributes = Readonly<Record<`data-${string}`, string | undefined>>;
interface ProgressRingProps {
    /**
     * Work done so far, from 0 to `max`. Omit it for indeterminate progress,
     * which spins a short arc instead.
     */
    value?: number;
    /** The amount that means done (default 1). */
    max?: number;
    /** The ring's accessible name, such as "Claim time remaining". */
    label: string;
    /** Spoken progress in place of the percentage, such as "12 minutes left". */
    valueText?: string;
    tone?: ProgressTone;
    size?: ProgressRingSize;
    id?: string;
    rootAttributes?: ProgressRingRootAttributes;
    className?: string;
    /** Native named-slot assignment when composed inside a web component. */
    slot?: string;
}
/**
 * A circular progress indicator: an SVG track and arc, determinate (`value`
 * of `max`, filling clockwise from the top) or indeterminate (no `value`, a
 * spinning arc), sized to sit inline in text, a row, or a toolbar. It is a
 * `role="progressbar"` named by `label`, with `aria-valuenow` (as a
 * percentage) or `valueText`.
 */
declare function ProgressRing({ value, max, label, valueText, tone, size, id, rootAttributes, className, slot, }: ProgressRingProps): kerfjs.SafeHtml;

export { ProgressRing, type ProgressRingProps, type ProgressRingRootAttributes, type ProgressRingSize, ProgressTone };
```
