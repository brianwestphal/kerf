import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import {
  LucideIcon,
  type LucideNode,
} from '../../media/lucide-icon/lucide-icon.js';

/** Corner shape: fully round `pill` (default) or a softer `rounded` square. */
export type IconToggleButtonShape = 'pill' | 'rounded';

const iconToggleProtected = new Set([
  'data-component',
  'data-action',
  'data-shape',
]);

type IconToggleButtonRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-shape'?: never;
  }
>;

export interface IconToggleButtonProps {
  /** The Lucide-compatible icon node. */
  icon: LucideNode;
  /** The icon's stable name, as `LucideIcon` takes it. */
  iconName: string;
  /** Accessible name and hover help tag; required because no text is shown. */
  label: string;
  /** Pressed state, exposed as `aria-pressed`; the application owns it. */
  pressed: boolean;
  /** Delegated `data-action` the application handles to flip `pressed`. */
  action?: string;
  shape?: IconToggleButtonShape;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Safe `data-*` metadata; IconToggleButton-owned markers stay protected. */
  rootAttributes?: IconToggleButtonRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A standalone, icon-only toggle: a native `<button aria-pressed>` with the
 * geometry and pressed chrome of a single contained `ToolbarControlGroup`
 * (44px, a 2px-inset face that rises when pressed), for content and pane
 * footers where no `Toolbar` belongs. Inside a toolbar, use a
 * `ToolbarControlGroup` instead.
 */
export function IconToggleButton({
  icon,
  iconName,
  label,
  pressed,
  action,
  shape = 'pill',
  disabled = false,
  id,
  className = '',
  rootAttributes = {},
  slot,
}: IconToggleButtonProps) {
  return (
    <button
      {...filterDataAttributes(rootAttributes, iconToggleProtected)}
      type="button"
      id={id}
      class={`kui-icon-toggle-button ${className}`.trim()}
      data-component="icon-toggle-button"
      data-action={action}
      data-shape={shape}
      aria-label={label}
      aria-pressed={pressed ? 'true' : 'false'}
      disabled={disabled}
      slot={slot}
    >
      <span class="kui-icon-toggle-button__face" aria-hidden="true">
        <LucideIcon icon={icon} name={iconName} />
      </span>
    </button>
  );
}
