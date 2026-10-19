import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import { Badge, type BadgeTone } from '../../feedback/badge/badge.js';
import { LoadingSpinner } from '../../feedback/loading-spinner/loading-spinner.js';

/** The color family: `neutral` (default), `brand` for the main action, `success` for a positive one, `danger` for a destructive one. */
export type ButtonTone = 'neutral' | 'brand' | 'success' | 'danger';

/**
 * How loudly it asks: `primary` (default) fills the button, `secondary`
 * outlines it, and `plain` shows only its text until hovered.
 */
export type ButtonEmphasis = 'primary' | 'secondary' | 'plain';

/** `default` is the 44px control height; `compact` is 33px with smaller text. */
export type ButtonSize = 'default' | 'compact';

/** Corner shape: the shared `rounded` control radius (default) or a full `pill`. */
export type ButtonShape = 'rounded' | 'pill';
/** What a form button does: `button` (default), `submit`, or `reset`. */
export type ButtonType = 'button' | 'submit' | 'reset';

const BUTTON_PROTECTED = new Set([
  'data-component',
  'data-action',
  'data-tone',
  'data-emphasis',
  'data-size',
  'data-loading',
  'data-icon-only',
  'data-shape',
  'data-fill',
  'data-focus-ring-inset',
]);

/** Application `data-*` metadata; the Button's own markers stay protected. */
export type ButtonRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

/** A Button's visible label: text or rendered content, never empty. */
export type ButtonLabel =
  string | Exclude<KerfUiContent, null | undefined | boolean>;

/**
 * A labeled button (its label names it; `ariaLabel` only when the label is
 * not enough), or an icon-only square named by `ariaLabel`.
 */
export type ButtonContent =
  | {
      /** The label. */
      children: ButtonLabel;
      /** A leading icon, such as a `LucideIcon`; it is decorative. */
      icon?: KerfUiContent;
      ariaLabel?: string;
    }
  | {
      children?: undefined;
      /** The icon of an icon-only square button. */
      icon: KerfUiContent;
      /** The accessible name an icon-only button needs. */
      ariaLabel: string;
    };

export type ButtonProps = ButtonContent & ButtonOptions;

export interface ButtonOptions {
  tone?: ButtonTone;
  emphasis?: ButtonEmphasis;
  size?: ButtonSize;
  /** Corner shape (default `rounded`). */
  shape?: ButtonShape;
  /**
   * Span the full width of the parent instead of sizing to the label, as on
   * `SplitButton`. The label stays centered and ellipsizes when it no longer
   * fits.
   */
  fill?: boolean;
  /**
   * Make it a toggle: `aria-pressed` reports the state, and a pressed look is
   * drawn on top of the tone and emphasis. The application owns the state and
   * flips it in its `action` handler. A link (`href`) cannot be a toggle.
   */
  pressed?: boolean;
  /** Mark the current step in a sequence with `aria-current="step"`. */
  currentStep?: boolean;
  /**
   * Busy: a spinner replaces the label (which still names it) and the button
   * reports `aria-busy`. Presses still reach it; the application decides
   * what a press does while it is busy.
   */
  loading?: boolean;
  disabled?: boolean;
  /** A form button's behavior (default `button`, which never submits). */
  type?: ButtonType;
  name?: string;
  value?: string;
  /** The id of the form it belongs to, when it sits outside that form. */
  form?: string;
  /** Render a link with button styling instead of a `<button>`. */
  href?: string;
  /** Where a link opens. */
  target?: '_self' | '_blank' | '_parent' | '_top';
  /** Delegated `data-action` the application handles. */
  action?: string;
  /**
   * Keep the button's focus ring inside its box when an ancestor clips
   * overflow. The inset ring is two-tone, a surface-colored line inside the
   * ring color, so it stays visible on a loud fill of the ring's own hue.
   */
  focusRingInset?: boolean;
  /**
   * A count, short text, or `true` for a text-free dot over the button's
   * top-trailing corner, such as how many items a filter hides. It stays out
   * of the accessible name unless `badgeLabel` names it.
   */
  badge?: number | string | true;
  /** Words for the badge ("3 hidden"), added to the button's name. */
  badgeLabel?: string;
  /** The badge's tone (default `danger`). */
  badgeTone?: BadgeTone;
  /**
   * Native hover text that says more than the name, such as "More Actions
   * for report.pdf". An icon-only Button already gets a help tag with its
   * `ariaLabel` (with `@kerfjs/ui/help-tags-register`); a `title` replaces
   * that tag.
   */
  title?: string;
  id?: string;
  className?: string;
  /** Safe `data-*` metadata (a `data-key`, `data-dialog-close`). */
  rootAttributes?: ButtonRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A standalone action button: a native `<button>` (or a link with `href`)
 * in one of four tones and three emphases, at the 44px control height or
 * compact, with a label or as an icon-only square, rounded or pill-shaped,
 * sized to its label or filling its parent's width, and optionally a
 * `pressed` toggle or `currentStep` marker. Inside a
 * `ToolbarControlGroup`, use a plain `<button>`, which the group styles; use
 * Button for a dialog footer, a form, or a standalone action beside other
 * content.
 */
export function Button({
  children,
  tone = 'neutral',
  emphasis = 'primary',
  size = 'default',
  shape = 'rounded',
  fill = false,
  pressed,
  currentStep = false,
  icon,
  loading = false,
  disabled = false,
  type = 'button',
  name,
  value,
  form,
  href,
  target,
  action,
  focusRingInset = false,
  badge,
  badgeLabel,
  badgeTone = 'danger',
  ariaLabel,
  title,
  id,
  className = '',
  rootAttributes = {},
  slot,
}: ButtonProps) {
  const shared = {
    ...filterDataAttributes(rootAttributes, BUTTON_PROTECTED),
    id,
    class: `kui-button ${className}`.trim(),
    'data-component': 'button',
    'data-tone': tone,
    'data-emphasis': emphasis,
    'data-size': size,
    'data-loading': loading ? '' : undefined,
    'data-icon-only': children === undefined ? '' : undefined,
    'data-shape': shape === 'pill' ? 'pill' : undefined,
    'data-fill': fill ? 'true' : undefined,
    'data-focus-ring-inset': focusRingInset ? 'true' : undefined,
    'data-action': action,
    'aria-label':
      ariaLabel && badge !== undefined && badgeLabel
        ? `${ariaLabel}, ${badgeLabel}`
        : ariaLabel,
    title,
    'aria-busy': loading ? 'true' : undefined,
    'aria-current': currentStep ? 'step' : undefined,
    slot,
  };
  const content = (
    <>
      {icon === undefined ? null : (
        <span class="kui-button__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children === undefined ? null : (
        <span class="kui-button__label">{children}</span>
      )}
      {badge === undefined || badge === '' ? null : badge === true ? (
        <Badge
          tone={badgeTone}
          size="dot"
          placement="corner"
          {...(ariaLabel || !badgeLabel
            ? { ariaHidden: true as const }
            : { label: badgeLabel })}
        />
      ) : (
        <Badge
          tone={badgeTone}
          appearance="solid"
          size="compact"
          placement="corner"
          {...(ariaLabel || !badgeLabel
            ? { ariaHidden: true as const }
            : { label: badgeLabel })}
        >
          {String(badge)}
        </Badge>
      )}
      {loading ? (
        <span class="kui-button__spinner" aria-hidden="true">
          <LoadingSpinner />
        </span>
      ) : null}
    </>
  );
  // A disabled link has no destination and is announced as disabled.
  if (href !== undefined) {
    if (pressed !== undefined)
      throw new TypeError('A link Button cannot be a toggle (pressed).');
    return (
      <a
        {...shared}
        href={disabled ? undefined : href}
        target={disabled ? undefined : target}
        role={disabled ? 'link' : undefined}
        aria-disabled={disabled ? 'true' : undefined}
      >
        {content}
      </a>
    );
  }
  return (
    <button
      {...shared}
      type={type}
      name={name}
      value={value}
      form={form}
      disabled={disabled}
      aria-pressed={pressed === undefined ? undefined : String(pressed)}
    >
      {content}
    </button>
  );
}
