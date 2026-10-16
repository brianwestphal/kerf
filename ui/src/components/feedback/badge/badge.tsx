import type { SafeHtml } from 'kerfjs';

import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import type { CssLength } from '../../../shared/styles/css-values.js';
import type { SemanticTone } from '../../../shared/styles/semantic-tone.js';

export type { SemanticTone } from '../../../shared/styles/semantic-tone.js';
/** @deprecated Use SemanticTone. */
export type BadgeTone = SemanticTone;
export type BadgeAppearance = 'quiet' | 'solid' | 'outline';
export type BadgeShape = 'pill' | 'rounded';
/** Size of a text badge. A text-free dot is the separate `size: 'dot'` form. */
export type BadgeSize = 'compact' | 'default';

const badgeProtectedAttributes = new Set([
  'data-component',
  'data-tone',
  'data-appearance',
  'data-shape',
  'data-size',
  'data-has-icon',
  'data-truncate',
  'data-placement',
]);

/** Application `data-*` identity on the badge root; Badge-owned markers stay protected. */
export type BadgeRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-tone'?: never;
    'data-appearance'?: never;
    'data-shape'?: never;
    'data-size'?: never;
    'data-has-icon'?: never;
    'data-truncate'?: never;
    'data-placement'?: never;
  }
>;

/**
 * `inline` (default) flows with its content; `corner` pins the badge to the
 * top-trailing corner of the control it sits in (an icon-only `Button`, or a
 * button in a `ToolbarControlGroup`), out of the pointer's way.
 */
export type BadgePlacement = 'inline' | 'corner';

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
export interface BadgeTextProps extends BadgeCommonProps {
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
export type BadgeDotProps = BadgeCommonProps & {
  size: 'dot';
  children?: never;
  appearance?: never;
  shape?: never;
  maxWidth?: never;
} & (BadgeDotLabeled | BadgeDotDecorative);

export type BadgeProps = BadgeTextProps | BadgeDotProps;

/** Compact, non-interactive metadata whose tone, emphasis, and shape are configured by props. */
export function Badge(props: BadgeProps) {
  const {
    tone = 'neutral',
    placement = 'inline',
    title,
    rootAttributes = {},
    className = '',
    slot,
  } = props;
  const identity = filterDataAttributes(
    rootAttributes,
    badgeProtectedAttributes,
  );
  if (props.size === 'dot') {
    // A dot without a usable label has no text fallback, so it is decorative.
    const label = props.ariaHidden ? undefined : props.label?.trim();
    return (
      <span
        {...identity}
        class={`kui-badge ${className}`.trim()}
        data-component="badge"
        data-tone={tone}
        data-appearance="solid"
        data-size="dot"
        data-placement={placement === 'corner' ? 'corner' : undefined}
        role={label ? 'img' : undefined}
        aria-label={label || undefined}
        aria-hidden={label ? undefined : 'true'}
        title={title}
        slot={slot}
      />
    );
  }
  const {
    children,
    icon,
    appearance = 'quiet',
    shape = 'pill',
    size = 'default',
    maxWidth,
    label,
    ariaHidden = false,
  } = props;
  const named = !ariaHidden && Boolean(label?.trim());
  const truncates = maxWidth !== undefined;
  // A truncated label keeps its full text as the hover tooltip.
  const tooltip =
    title ??
    (truncates && (typeof children === 'string' || typeof children === 'number')
      ? String(children)
      : undefined);
  return (
    <span
      {...identity}
      class={`kui-badge ${className}`.trim()}
      data-component="badge"
      data-tone={tone}
      data-appearance={appearance}
      data-shape={shape}
      data-size={size}
      data-has-icon={icon === undefined ? undefined : 'true'}
      data-truncate={truncates ? 'true' : undefined}
      data-placement={placement === 'corner' ? 'corner' : undefined}
      style={truncates ? `--_kui-badge-max-width:${maxWidth}` : undefined}
      role={named ? 'img' : undefined}
      aria-label={named ? label : undefined}
      aria-hidden={ariaHidden ? 'true' : undefined}
      title={tooltip}
      slot={slot}
    >
      {icon === undefined ? null : (
        <span class="kui-badge__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {truncates ? <span class="kui-badge__label">{children}</span> : children}
    </span>
  );
}
