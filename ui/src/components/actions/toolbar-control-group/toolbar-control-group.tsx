import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import { markRelocatableGroup } from '../../../shared/panels/panel-toolbar-group.js';
import type { CssLength } from '../../../shared/styles/css-values.js';
import { LoadingSpinner } from '../../feedback/loading-spinner/loading-spinner.js';
import type { ButtonLabel } from '../button/button.js';

export type ToolbarControlGroupAppearance = 'contained' | 'borderless';
export type ToolbarControlGroupTone = 'default' | 'dark';
/** Surface material: the opaque `solid` fill (default) or translucent `glass`. */
export type ToolbarControlGroupMaterial = 'solid' | 'glass';
/** Quiet palette for a contained, single decorative icon tile. */
export type ToolbarControlGroupTileTone =
  'neutral' | 'brand' | 'success' | 'warning' | 'danger';
export type ToolbarControlGroupButtonAppearance = 'plain' | 'push';
export type ToolbarControlGroupShape = 'pill' | 'rounded';
export type ToolbarControlGroupSize = 'default' | 'compact';
export type ToolbarControlGroupDensity = 'comfortable' | 'tight';
export type ToolbarControlGroupContent =
  'icon' | 'text' | 'mixed' | 'avatar' | 'search';
export type ToolbarControlGroupFocusRing = 'control' | 'outline' | 'halo';
export type ToolbarControlGroupSelectedChrome =
  'raised' | 'filled' | 'outline' | 'none';
export type ToolbarControlGroupSelectedTone = 'brand' | 'neutral' | 'pop';
export type ToolbarControlGroupOverflow = 'visible' | 'scroll' | 'wrap';
export type ToolbarControlGroupExpandedOverflow = 'clip' | 'visible';
export type ToolbarControlGroupMenuInset = 'standard' | 'compact' | 'list-zero';
export type ToolbarControlGroupVisibility =
  | 'always'
  | 'compact-only'
  | 'hide-collapsed-tiny'
  | 'yield-to-expanded-sibling'
  | 'yield-to-priority-row';
export type ToolbarControlGroupSizing = 'content' | 'grow' | 'fill';
export type ToolbarControlGroupPlacement = 'start' | 'end';

export interface ToolbarActionLinkProps {
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
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const TOOLBAR_ACTION_LINK_PROTECTED = new Set([
  'data-appearance',
  'data-busy',
  'data-button-appearance',
  'data-component',
  'data-content',
  'data-density',
  'data-expanded',
  'data-expanded-overflow',
  'data-focus-ring',
  'data-hide-below',
  'data-material',
  'data-menu-inset',
  'data-nested-dropdown',
  'data-overflow',
  'data-placement',
  'data-scrim',
  'data-selected-chrome',
  'data-selected-tone',
  'data-shape',
  'data-show-below',
  'data-single',
  'data-size',
  'data-sizing',
  'data-tile-tone',
  'data-tone',
  'data-visibility',
]);

/** A semantic anchor with ToolbarControlGroup-owned action geometry. */
export function ToolbarActionLink({
  href,
  label,
  icon,
  detail,
  ariaLabel,
  external = false,
  className = '',
  slot,
  rootAttributes = {},
}: ToolbarActionLinkProps) {
  const accessibleLabel =
    ariaLabel ??
    `${label}${detail ? `, ${detail}` : ''}${external ? ' (opens in new tab)' : ''}`;
  return (
    <a
      {...filterDataAttributes(rootAttributes, TOOLBAR_ACTION_LINK_PROTECTED)}
      class={`kui-toolbar-action-link ${className}`.trim()}
      data-component="toolbar-action-link"
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      aria-label={accessibleLabel}
      slot={slot}
    >
      {icon}
      <span>{label}</span>
      {detail ? <code aria-hidden="true">{detail}</code> : null}
    </a>
  );
}

/**
 * A ToolbarButton's content: a labeled button (its text names it), or an
 * icon-only control named by `ariaLabel`.
 */
export type ToolbarButtonContent =
  | {
      /** The visible label, after the icon. */
      children: ButtonLabel;
      /** A leading icon, such as a `LucideIcon`; it is decorative. */
      icon?: KerfUiContent;
      /** Override the accessible name when the label is not enough. */
      ariaLabel?: string;
    }
  | {
      children?: undefined;
      /** The icon of an icon-only control. */
      icon: KerfUiContent;
      /** The accessible name of an icon-only control. */
      ariaLabel: string;
    };

export type ToolbarButtonProps = ToolbarButtonContent & {
  /** The `data-action` name a delegated handler dispatches on. */
  action?: string;
  /** A toggle's state, reported as `aria-pressed`; unset for a plain action. */
  pressed?: boolean;
  disabled?: boolean;
  /** Native hover text that says more than the accessible name. */
  title?: string;
  /** `none` keeps this pressed control looking like its neighbors. */
  selectedChrome?: 'none';
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
};

const TOOLBAR_BUTTON_PROTECTED = new Set([
  ...TOOLBAR_ACTION_LINK_PROTECTED,
  'data-action',
]);

// KF-5ZEYKP: the group's native button as a component, so view documents,
// the editor, and generated code can place it.
/**
 * A native button in a ToolbarControlGroup: the group owns its geometry,
 * focus ring, pressed chrome, and busy state, exactly as for a hand-written
 * `<button type="button">`.
 */
export function ToolbarButton({
  children,
  icon,
  ariaLabel,
  action,
  pressed,
  disabled = false,
  title,
  selectedChrome,
  className = '',
  slot,
  rootAttributes = {},
}: ToolbarButtonProps) {
  return (
    <button
      {...filterDataAttributes(rootAttributes, TOOLBAR_BUTTON_PROTECTED)}
      type="button"
      class={`kui-toolbar-button ${className}`.trim()}
      data-component="toolbar-button"
      data-action={action}
      data-selected-chrome={selectedChrome}
      aria-label={ariaLabel}
      aria-pressed={pressed === undefined ? undefined : String(pressed)}
      title={title}
      disabled={disabled}
      slot={slot}
    >
      {icon}
      {children}
    </button>
  );
}

export interface ToolbarControlGroupProps {
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
  /**
   * Responsive visibility owned by the enclosing Toolbar container.
   * `yield-to-priority-row` hides this trailing group exactly while its
   * Toolbar's `responsive="trailing-priority"` row is active (an expanded
   * trailing sibling at the Toolbar's `responsiveAt` width), so the app never
   * restates that breakpoint with `hideBelow`.
   */
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
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const TOOLBAR_CONTROL_GROUP_PROTECTED = new Set([
  'data-appearance',
  'data-busy',
  'data-button-appearance',
  'data-component',
  'data-content',
  'data-density',
  'data-expanded',
  'data-expanded-overflow',
  'data-focus-ring',
  'data-hide-below',
  'data-material',
  'data-menu-inset',
  'data-nested-dropdown',
  'data-overflow',
  'data-placement',
  'data-scrim',
  'data-selected-chrome',
  'data-selected-tone',
  'data-shape',
  'data-show-below',
  'data-single',
  'data-size',
  'data-sizing',
  'data-tile-tone',
  'data-tone',
  'data-visibility',
]);

export function ToolbarControlGroup({
  children,
  label,
  className = '',
  expanded = false,
  single = false,
  appearance = 'contained',
  tone = 'default',
  material = 'solid',
  tileTone,
  buttonAppearance = 'plain',
  shape = 'pill',
  size = 'default',
  density = 'comfortable',
  content = 'icon',
  focusRing = 'control',
  selectedChrome = 'raised',
  selectedTone = 'brand',
  nestedDropdown = false,
  menuInset = 'standard',
  overflow = 'visible',
  expandedOverflow = 'clip',
  visibility = 'always',
  hideBelow,
  showBelow,
  sizing = 'content',
  placement = 'start',
  growBasis,
  relocateOnCollapse = false,
  scrim = false,
  busy = false,
  busyLabel = 'Working',
  avatarImage,
  slot,
  rootAttributes = {},
}: ToolbarControlGroupProps) {
  const inlineStyles = [
    avatarImage
      ? `--kui-toolbar-avatar-image:url(${JSON.stringify(avatarImage)})`
      : '',
    growBasis ? `--kui-toolbar-group-grow-basis:${growBasis}` : '',
  ].filter(Boolean);
  const group = (
    <div
      {...filterDataAttributes(rootAttributes, TOOLBAR_CONTROL_GROUP_PROTECTED)}
      class={`kui-toolbar-control-group ${className}`.trim()}
      data-component="toolbar-control-group"
      role={label ? 'group' : undefined}
      aria-label={label}
      data-appearance={appearance}
      data-tone={tone}
      data-material={material === 'glass' ? 'glass' : undefined}
      data-tile-tone={tileTone}
      data-button-appearance={buttonAppearance}
      data-expanded={String(expanded)}
      data-single={String(single)}
      data-shape={shape}
      data-size={size}
      data-density={density}
      data-content={content}
      data-focus-ring={focusRing}
      data-selected-chrome={selectedChrome}
      data-selected-tone={selectedTone}
      data-nested-dropdown={String(nestedDropdown)}
      data-menu-inset={menuInset}
      data-overflow={overflow}
      data-expanded-overflow={
        expandedOverflow === 'visible' ? 'visible' : undefined
      }
      data-visibility={visibility}
      data-hide-below={hideBelow}
      data-show-below={showBelow}
      data-sizing={sizing}
      data-placement={placement}
      data-scrim={String(scrim)}
      data-busy={String(busy)}
      aria-busy={busy ? 'true' : undefined}
      inert={busy}
      style={inlineStyles.length ? inlineStyles.join(';') : undefined}
      slot={slot}
    >
      {children}
      {busy ? (
        <span
          class="kui-toolbar-control-group__busy-spinner"
          aria-hidden="true"
        >
          <LoadingSpinner />
        </span>
      ) : null}
    </div>
  );
  const renderedGroup = busy ? (
    <>
      {group}
      <span class="kui-toolbar-control-group__busy-status" role="status">
        {busyLabel}
      </span>
    </>
  ) : (
    group
  );
  return relocateOnCollapse
    ? markRelocatableGroup(renderedGroup)
    : renderedGroup;
}
