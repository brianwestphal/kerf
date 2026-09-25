import type { KerfUiContent } from './semantic-content.js';

export type ToolbarControlGroupAppearance = 'contained' | 'borderless';
export type ToolbarControlGroupTone = 'default' | 'dark';
export type ToolbarControlGroupButtonAppearance = 'plain' | 'push';
export type ToolbarControlGroupShape = 'pill' | 'rounded';
export type ToolbarControlGroupSize = 'default' | 'compact';
export type ToolbarControlGroupDensity = 'comfortable' | 'tight';
export type ToolbarControlGroupContent =
  'icon' | 'text' | 'mixed' | 'avatar' | 'search';
export type ToolbarControlGroupFocusRing = 'control' | 'outline' | 'halo';
export type ToolbarControlGroupSelectedChrome = 'raised' | 'filled' | 'outline';
export type ToolbarControlGroupSelectedTone = 'brand' | 'neutral' | 'pop';
export type ToolbarControlGroupOverflow = 'visible' | 'scroll';
export type ToolbarControlGroupMenuInset = 'standard' | 'compact' | 'list-zero';
export type ToolbarControlGroupVisibility = 'always' | 'compact-only';

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

export function ToolbarControlGroup({
  children,
  label,
  className = '',
  expanded = false,
  single = false,
  appearance = 'contained',
  tone = 'default',
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
  scrim = false,
  avatarImage,
  slot,
}: ToolbarControlGroupProps) {
  return (
    <div
      class={`kui-toolbar-control-group ${className}`.trim()}
      data-component="toolbar-control-group"
      role={label ? 'group' : undefined}
      aria-label={label}
      data-appearance={appearance}
      data-tone={tone}
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
      data-scrim={String(scrim)}
      style={
        avatarImage
          ? `--kui-toolbar-avatar-image:url(${JSON.stringify(avatarImage)})`
          : undefined
      }
      slot={slot}
    >
      {children}
    </div>
  );
}
