import type { SafeHtml } from 'kerfjs';

import type { SemanticTone } from '../../../shared/styles/semantic-tone.js';
import type { BadgeAppearance, BadgeShape, BadgeSize } from '../badge/badge.js';

interface ChipCommonProps {
  /** Decorative leading icon, normally an unsized LucideIcon. */
  icon?: SafeHtml;
  tone?: SemanticTone;
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

/** A removable chip needs both a delegated action and a specific accessible name. */
export type ChipProps = ChipCommonProps &
  (
    | { children: SafeHtml | string | number; truncate?: false }
    | { children: string; truncate: true }
  ) &
  (
    | { removeAction: string; removeLabel: string }
    | { removeAction?: never; removeLabel?: never }
  );

/** A short label with an optional native remove button. The application owns removal. */
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
  ...remove
}: ChipProps) {
  if (truncate && typeof children !== 'string')
    throw new TypeError('Chip truncate requires a plain text label');
  return (
    <span
      class={`kui-chip ${className}`.trim()}
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
      {remove.removeAction !== undefined ? (
        <button
          class="kui-chip__remove"
          type="button"
          data-action={remove.removeAction}
          aria-label={remove.removeLabel}
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
      ) : null}
    </span>
  );
}
