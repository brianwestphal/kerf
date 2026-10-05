import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { markRelocatableGroup } from '../../../shared/panels/panel-toolbar-group.js';
import { LoadingSpinner } from '../../feedback/loading-spinner/loading-spinner.js';

export type ToolbarControlGroupAppearance = 'contained' | 'borderless';
export type ToolbarControlGroupTone = 'default' | 'dark';
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
export type ToolbarControlGroupSelectedChrome = 'raised' | 'filled' | 'outline';
export type ToolbarControlGroupSelectedTone = 'brand' | 'neutral' | 'pop';
export type ToolbarControlGroupOverflow = 'visible' | 'scroll' | 'wrap';
export type ToolbarControlGroupMenuInset = 'standard' | 'compact' | 'list-zero';
export type ToolbarControlGroupVisibility =
  | 'always'
  | 'compact-only'
  | 'hide-collapsed-tiny'
  | 'yield-to-expanded-sibling';
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
}

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
}: ToolbarActionLinkProps) {
  const accessibleLabel =
    ariaLabel ??
    `${label}${detail ? `, ${detail}` : ''}${external ? ' (opens in new tab)' : ''}`;
  return (
    <a
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

export interface ToolbarControlGroupProps {
  children: KerfUiContent;
  label?: string;
  className?: string;
  expanded?: boolean;
  single?: boolean;
  appearance?: ToolbarControlGroupAppearance;
  tone?: ToolbarControlGroupTone;
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
  selectedChrome?: ToolbarControlGroupSelectedChrome;
  selectedTone?: ToolbarControlGroupSelectedTone;
  /** Size a nested Web Awesome dropdown trigger as part of this group. */
  nestedDropdown?: boolean;
  /** Configure the nested dropdown menu inset without consumer ::part() CSS. */
  menuInset?: ToolbarControlGroupMenuInset;
  /** Keep an overlong row inside the available width by scrolling or wrapping. */
  overflow?: ToolbarControlGroupOverflow;
  /** Responsive visibility owned by the enclosing Toolbar container. */
  visibility?: ToolbarControlGroupVisibility;
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

export function ToolbarControlGroup({
  children,
  label,
  className = '',
  expanded = false,
  single = false,
  appearance = 'contained',
  tone = 'default',
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
  visibility = 'always',
  sizing = 'content',
  placement = 'start',
  growBasis,
  relocateOnCollapse = false,
  scrim = false,
  busy = false,
  busyLabel = 'Working',
  avatarImage,
  slot,
}: ToolbarControlGroupProps) {
  const inlineStyles = [
    avatarImage
      ? `--kui-toolbar-avatar-image:url(${JSON.stringify(avatarImage)})`
      : '',
    growBasis ? `--kui-toolbar-group-grow-basis:${growBasis}` : '',
  ].filter(Boolean);
  const group = (
    <div
      class={`kui-toolbar-control-group ${className}`.trim()}
      data-component="toolbar-control-group"
      role={label ? 'group' : undefined}
      aria-label={label}
      data-appearance={appearance}
      data-tone={tone}
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
      data-visibility={visibility}
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
  const renderedGroup = relocateOnCollapse
    ? markRelocatableGroup(group)
    : group;
  return busy ? (
    <>
      {renderedGroup}
      <span class="kui-toolbar-control-group__busy-status" role="status">
        {busyLabel}
      </span>
    </>
  ) : (
    renderedGroup
  );
}
