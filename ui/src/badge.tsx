import type { SafeHtml } from 'kerfjs';

export type BadgeTone =
  'neutral' | 'brand' | 'pop' | 'success' | 'warning' | 'danger';
export type BadgeAppearance = 'quiet' | 'solid' | 'outline';
export type BadgeShape = 'pill' | 'rounded';
export type BadgeSize = 'compact' | 'default';

export interface BadgeProps {
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
export function Badge({
  children,
  tone = 'neutral',
  appearance = 'quiet',
  shape = 'pill',
  size = 'default',
  label,
  ariaHidden = false,
  className = '',
  slot,
}: BadgeProps) {
  return (
    <span
      class={`kui-badge ${className}`.trim()}
      data-component="badge"
      data-tone={tone}
      data-appearance={appearance}
      data-shape={shape}
      data-size={size}
      aria-label={ariaHidden ? undefined : label}
      aria-hidden={ariaHidden ? 'true' : undefined}
      slot={slot}
    >
      {children}
    </span>
  );
}
