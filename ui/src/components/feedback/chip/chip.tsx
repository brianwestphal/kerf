import type { SafeHtml } from 'kerfjs';

import type { SemanticTone } from '../../../shared/styles/semantic-tone.js';
import type { BadgeAppearance, BadgeShape, BadgeSize } from '../badge/badge.js';

/**
 * A chip color role: a shared semantic tone, or `inherit`, which follows the
 * surrounding foreground (a chip inside a `brand-loud` ContentItem bubble)
 * and derives its fill, border, and focus ring from `currentColor`.
 */
export type ChipTone = SemanticTone | 'inherit';

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

type ChipLabelProps =
  | { children: SafeHtml | string | number; truncate?: false }
  | { children: string; truncate: true };

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
export type ChipProps = ChipCommonProps &
  ChipLabelProps &
  (
    | ({ removeAction: string; removeLabel: string } & ChipNoLinkProps &
        ChipNoActionProps)
    | ({ removeAction?: never; removeLabel?: never } & ChipNoLinkProps &
        ChipNoActionProps)
    | ChipLinkProps
    | ChipActionProps
  );

function removeButton(action: string, label: string, disabled: boolean) {
  return (
    <button
      class="kui-chip__remove"
      type="button"
      data-action={action}
      aria-label={label}
      disabled={disabled}
    >
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path
          d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
        />
      </svg>
    </button>
  );
}

function downloadValue(download: string | boolean | undefined) {
  switch (download) {
    case undefined:
    case false:
      return undefined;
    case true:
      return '';
    default:
      return download;
  }
}

/**
 * A short label with an optional native remove button, a native link when
 * `href` is set, or a native button when `action` is set. The application
 * owns removal, the link destination, and the action handler.
 */
export function Chip({
  children,
  icon,
  truncate = false,
  tone = 'neutral',
  appearance = 'quiet',
  shape = 'pill',
  size = 'default',
  disabled = false,
  itemId,
  className = '',
  slot,
  href,
  download,
  external = false,
  removeAction,
  removeLabel,
  action,
  actionLabel,
}: ChipProps) {
  if (truncate && typeof children !== 'string')
    throw new TypeError('Chip truncate requires a plain text label');
  if (
    action !== undefined &&
    (href !== undefined ||
      removeAction !== undefined ||
      removeLabel !== undefined)
  )
    throw new TypeError(
      'Chip action cannot be combined with href or removeAction, because nested interactive content is invalid',
    );
  const content = (
    <>
      {icon === undefined ? null : (
        <span class="kui-chip__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span
        class="kui-chip__label"
        title={truncate ? String(children) : undefined}
      >
        {children}
      </span>
    </>
  );
  const rootClass = `kui-chip ${className}`.trim();
  if (href !== undefined) {
    const textLabel =
      typeof children === 'string' || typeof children === 'number'
        ? String(children)
        : undefined;
    return (
      <a
        class={rootClass}
        href={disabled ? undefined : href}
        download={disabled ? undefined : downloadValue(download)}
        target={disabled || !external ? undefined : '_blank'}
        rel={disabled || !external ? undefined : 'noopener noreferrer'}
        tabindex={disabled ? -1 : undefined}
        aria-label={
          external && textLabel !== undefined
            ? `${textLabel} (opens in new tab)`
            : undefined
        }
        aria-disabled={disabled ? 'true' : undefined}
        data-component="chip"
        data-link=""
        data-tone={tone}
        data-appearance={appearance}
        data-shape={shape}
        data-size={size}
        data-disabled={disabled ? '' : undefined}
        data-truncate={truncate ? '' : undefined}
        data-item-id={itemId}
        slot={slot}
      >
        {content}
      </a>
    );
  }
  if (action !== undefined) {
    return (
      <button
        class={rootClass}
        type="button"
        disabled={disabled}
        aria-label={actionLabel?.trim() || undefined}
        data-action={action}
        data-component="chip"
        data-tone={tone}
        data-appearance={appearance}
        data-shape={shape}
        data-size={size}
        data-disabled={disabled ? '' : undefined}
        data-truncate={truncate ? '' : undefined}
        data-item-id={itemId}
        slot={slot}
      >
        {content}
      </button>
    );
  }
  return (
    <span
      class={rootClass}
      data-component="chip"
      data-tone={tone}
      data-appearance={appearance}
      data-shape={shape}
      data-size={size}
      data-disabled={disabled ? '' : undefined}
      data-truncate={truncate ? '' : undefined}
      data-item-id={itemId}
      slot={slot}
    >
      {content}
      {removeAction !== undefined && removeLabel !== undefined
        ? removeButton(removeAction, removeLabel, disabled)
        : null}
    </span>
  );
}
