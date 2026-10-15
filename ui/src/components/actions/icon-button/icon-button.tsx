import {
  LucideIcon,
  type LucideNode,
} from '../../media/lucide-icon/lucide-icon.js';
import {
  Button,
  type ButtonEmphasis,
  type ButtonRootAttributes,
  type ButtonSize,
  type ButtonTone,
  type ButtonType,
} from '../button/button.js';

export interface IconButtonProps {
  /** The Lucide-compatible icon node shown alone in the button. */
  icon: LucideNode;
  /** The icon's stable name, as `LucideIcon` takes it. */
  iconName: string;
  /** Accessible name; the button has no visible text, so it is required. */
  label: string;
  /** Delegated `data-action` the application handles. */
  action?: string;
  tone?: ButtonTone;
  emphasis?: ButtonEmphasis;
  size?: ButtonSize;
  type?: ButtonType;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Safe `data-*` metadata; the Button's own markers stay protected. */
  rootAttributes?: ButtonRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * An icon-only `Button` with a `LucideIcon`: a square one control height on
 * each side, so it matches an adjacent field or `Select`, named by `label`.
 * Outside a toolbar; inside one, compose a `ToolbarControlGroup`.
 */
export function IconButton({
  icon,
  iconName,
  label,
  ...options
}: IconButtonProps) {
  return Button({
    ...options,
    icon: <LucideIcon icon={icon} name={iconName} />,
    ariaLabel: label,
  });
}
