import type { SafeHtml } from 'kerfjs';

export type ToolbarControlGroupAppearance = 'contained' | 'borderless';
export type ToolbarControlGroupTone = 'default' | 'dark';
export type ToolbarControlGroupButtonAppearance = 'plain' | 'push';
export type ToolbarControlGroupShape = 'pill' | 'rounded';

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
    >
      {children}
    </div>
  );
}
