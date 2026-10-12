import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import {
  LucideIcon,
  type LucideNode,
} from '../../media/lucide-icon/lucide-icon.js';

export type IconButtonAppearance =
  'accent' | 'filled' | 'outlined' | 'filled-outlined' | 'plain';
export type IconButtonVariant =
  'neutral' | 'brand' | 'success' | 'warning' | 'danger';
export type IconButtonSize = 'xs' | 's' | 'm' | 'l' | 'xl';

const iconButtonProtectedAttributes = new Set([
  'data-component',
  'data-action',
]);

type IconButtonRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
  }
>;

export interface IconButtonProps {
  /** The Lucide-compatible icon node shown alone in the button. */
  icon: LucideNode;
  /** The icon's stable name, as `LucideIcon` takes it. */
  iconName: string;
  /** Accessible name; the button has no visible text, so it is required. */
  label: string;
  /** Delegated `data-action` the application handles. */
  action?: string;
  /** Web Awesome appearance; defaults to Web Awesome's own. */
  appearance?: IconButtonAppearance;
  /** Web Awesome semantic variant; defaults to Web Awesome's own. */
  variant?: IconButtonVariant;
  /** Web Awesome control size; the square follows its control height. */
  size?: IconButtonSize;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Safe `data-*` metadata; `data-component` and `data-action` stay owned. */
  rootAttributes?: IconButtonRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * An icon-only Web Awesome button with a `LucideIcon`: square, one form
 * control height on each side, so it matches an adjacent `wa-input` or
 * `Select`. Web Awesome squares a button only for a lone `wa-icon`; this is
 * the Kerf form for Lucide icons. Register `wa-button` once
 * (`@awesome.me/webawesome/dist/components/button/button.js`).
 */
export function IconButton({
  icon,
  iconName,
  label,
  action,
  appearance,
  variant,
  size,
  type = 'button',
  disabled = false,
  id,
  className = '',
  rootAttributes = {},
  slot,
}: IconButtonProps) {
  return (
    <wa-button
      {...filterDataAttributes(rootAttributes, iconButtonProtectedAttributes)}
      id={id}
      class={`kui-icon-button ${className}`.trim()}
      data-component="icon-button"
      data-action={action}
      appearance={appearance}
      variant={variant}
      size={size}
      type={type}
      disabled={disabled || undefined}
      slot={slot}
    >
      <LucideIcon icon={icon} name={iconName} label={label} />
    </wa-button>
  );
}
