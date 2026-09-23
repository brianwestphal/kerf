import type { SafeHtml } from 'kerfjs';

export type ToolbarControlGroupAppearance = 'contained' | 'borderless';
export type ToolbarControlGroupTone = 'default' | 'dark';
export type ToolbarControlGroupButtonAppearance = 'plain' | 'push';
export type ToolbarControlGroupShape = 'pill' | 'rounded';
export type ToolbarControlGroupSize = 'default' | 'compact';
export type ToolbarControlGroupDensity = 'comfortable' | 'tight';
export type ToolbarControlGroupContent = 'icon' | 'text' | 'mixed' | 'avatar';
export type ToolbarControlGroupSelectedChrome = 'raised' | 'filled' | 'outline';
export type ToolbarControlGroupSelectedTone = 'brand' | 'neutral' | 'pop';

export interface ToolbarControlGroupProps {
  children: SafeHtml | SafeHtml[];
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
  selectedChrome?: ToolbarControlGroupSelectedChrome;
  selectedTone?: ToolbarControlGroupSelectedTone;
  /** Size a nested Web Awesome dropdown trigger as part of this group. */
  nestedDropdown?: boolean;
  /** Add contrast behind photo-backed avatar content. */
  scrim?: boolean;
  /**
   * Avatar image URL. A single-control group paints it on the group; a
   * multi-control group paints it only on the pressed selection highlight.
   */
  avatarImage?: string;
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
  selectedChrome = 'raised',
  selectedTone = 'brand',
  nestedDropdown = false,
  scrim = false,
  avatarImage,
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
      data-selected-chrome={selectedChrome}
      data-selected-tone={selectedTone}
      data-nested-dropdown={String(nestedDropdown)}
      data-scrim={String(scrim)}
      style={
        avatarImage
          ? `--kui-toolbar-avatar-image:url(${JSON.stringify(avatarImage)})`
          : undefined
      }
    >
      {children}
    </div>
  );
}
