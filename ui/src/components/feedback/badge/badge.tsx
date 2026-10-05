import type { SafeHtml } from 'kerfjs';

import type { SemanticTone } from '../../../shared/styles/semantic-tone.js';

export type { SemanticTone } from '../../../shared/styles/semantic-tone.js';
/** @deprecated Use SemanticTone. */
export type BadgeTone = SemanticTone;
export type BadgeAppearance = 'quiet' | 'solid' | 'outline';
export type BadgeShape = 'pill' | 'rounded';
/** Size of a text badge. A text-free dot is the separate `size: 'dot'` form. */
export type BadgeSize = 'compact' | 'default';

interface BadgeCommonProps {
  tone?: SemanticTone;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** A badge that shows a short status, count, or category as visible text. */
export interface BadgeTextProps extends BadgeCommonProps {
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
export type BadgeDotProps = BadgeCommonProps & {
  size: 'dot';
  children?: never;
  appearance?: never;
  shape?: never;
} & (BadgeDotLabeled | BadgeDotDecorative);

export type BadgeProps = BadgeTextProps | BadgeDotProps;

/** Compact, non-interactive metadata whose tone, emphasis, and shape are configured by props. */
export function Badge(props: BadgeProps) {
  const { tone = 'neutral', className = '', slot } = props;
  if (props.size === 'dot') {
    // A dot without a usable label has no text fallback, so it is decorative.
    const label = props.ariaHidden ? undefined : props.label?.trim();
    return (
      <span
        class={`kui-badge ${className}`.trim()}
        data-component="badge"
        data-tone={tone}
        data-appearance="solid"
        data-size="dot"
        role={label ? 'img' : undefined}
        aria-label={label || undefined}
        aria-hidden={label ? undefined : 'true'}
        slot={slot}
      />
    );
  }
  const {
    children,
    appearance = 'quiet',
    shape = 'pill',
    size = 'default',
    label,
    ariaHidden = false,
  } = props;
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
