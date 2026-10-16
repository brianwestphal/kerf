import type { SafeHtml } from 'kerfjs';
import { ChevronDown } from 'lucide';

import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import { LoadingSpinner } from '../../feedback/loading-spinner/loading-spinner.js';
import { LucideIcon } from '../../media/lucide-icon/lucide-icon.js';

/** The loud fill the whole split button paints. */
export type SplitButtonTone =
  'brand' | 'neutral' | 'success' | 'warning' | 'danger';

/** Corner shape: the shared `rounded` control radius (default) or a full `pill`, as on `Button`. */
export type SplitButtonShape = 'rounded' | 'pill';

const splitButtonProtected = new Set([
  'data-component',
  'data-tone',
  'data-fill',
  'data-busy',
  'data-shape',
]);

type SplitButtonRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-tone'?: never;
    'data-fill'?: never;
    'data-busy'?: never;
    'data-shape'?: never;
  }
>;

export interface SplitButtonProps {
  /** Visible primary label. */
  label: string;
  /** Delegated `data-action` of the primary half. */
  action: string;
  /** Optional decorative leading icon of the primary half. */
  icon?: SafeHtml;
  /** Primary accessible name when it should say more than `label`. */
  accessibleLabel?: string;
  /** Accessible name (and tooltip) of the options trigger. */
  optionsLabel: string;
  /** Delegated `data-action` of the options trigger, which opens the app's menu. */
  optionsAction: string;
  /** Whether the options menu is open, exposed as `aria-expanded`. */
  optionsExpanded?: boolean;
  /** What the options trigger opens, exposed as `aria-haspopup`; defaults to `menu`. */
  optionsPopup?: 'menu' | 'dialog' | 'listbox';
  /** Element id the options trigger controls, exposed as `aria-controls`. */
  optionsControls?: string;
  /** The loud fill; defaults to `brand`. Switch it (for example to `neutral`) while running. */
  tone?: SplitButtonTone;
  /** Span the full width of the parent instead of sizing to the label. */
  fill?: boolean;
  /** Corner shape (default `rounded`); `pill` fully rounds both outer ends. */
  shape?: SplitButtonShape;
  /** Show work in progress: a spinner replaces the icon and the primary is `aria-busy`. */
  busy?: boolean;
  /** Disable the primary half. */
  disabled?: boolean;
  /** Disable the options trigger. */
  optionsDisabled?: boolean;
  /** Native tooltip of the primary half, for example why it is disabled. */
  title?: string;
  className?: string;
  /** Safe `data-*` metadata; SplitButton-owned markers stay protected. */
  rootAttributes?: SplitButtonRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A primary action with an attached options trigger on one loud, semantic
 * fill (a "Drive" button with a provider menu). Both halves are native
 * buttons, so `aria-expanded` and the accessible names reach assistive
 * technology directly; the application opens its own menu from the options
 * action and owns the running state.
 */
export function SplitButton({
  label,
  action,
  icon,
  accessibleLabel,
  optionsLabel,
  optionsAction,
  optionsExpanded = false,
  optionsPopup = 'menu',
  optionsControls,
  tone = 'brand',
  fill = false,
  shape = 'rounded',
  busy = false,
  disabled = false,
  optionsDisabled = false,
  title,
  className = '',
  rootAttributes = {},
  slot,
}: SplitButtonProps) {
  const leading = busy ? <LoadingSpinner /> : icon;
  return (
    <div
      {...filterDataAttributes(rootAttributes, splitButtonProtected)}
      class={`kui-split-button ${className}`.trim()}
      data-component="split-button"
      data-tone={tone}
      data-fill={fill ? 'true' : undefined}
      data-shape={shape === 'pill' ? 'pill' : undefined}
      data-busy={busy ? 'true' : undefined}
      role="group"
      slot={slot}
    >
      <button
        type="button"
        class="kui-split-button__primary"
        data-action={action}
        aria-label={accessibleLabel}
        aria-busy={busy ? 'true' : undefined}
        title={title}
        disabled={disabled}
      >
        {leading && (
          <span class="kui-split-button__icon" aria-hidden="true">
            {leading}
          </span>
        )}
        <span class="kui-split-button__label">{label}</span>
      </button>
      <button
        type="button"
        class="kui-split-button__options"
        data-action={optionsAction}
        aria-label={optionsLabel}
        aria-haspopup={optionsPopup}
        aria-expanded={optionsExpanded ? 'true' : 'false'}
        aria-controls={optionsControls}
        title={optionsLabel}
        disabled={optionsDisabled}
      >
        <LucideIcon icon={ChevronDown} name="chevron-down" />
      </button>
    </div>
  );
}
