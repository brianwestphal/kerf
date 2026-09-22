import type { SafeHtml } from 'kerfjs';

export type SunkenPanelShape = 'rounded' | 'square';

export interface SunkenPanelProps {
  children?: SafeHtml | readonly SafeHtml[];
  /** Optional accessible landmark name for a distinct application region. */
  ariaLabel?: string;
  /** Corner shape: a rounded rectangle (default) or square corners. */
  shape?: SunkenPanelShape;
  className?: string;
}

/**
 * A lowered application surface with one compact inset and a vertical content
 * stack. The panel owns its background and padding; children own their own
 * borders and internal geometry.
 */
export function SunkenPanel({
  children,
  ariaLabel,
  shape = 'rounded',
  className = '',
}: SunkenPanelProps) {
  return (
    <div
      class={`kui-sunken-panel ${className}`.trim()}
      data-component="sunken-panel"
      data-shape={shape}
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
