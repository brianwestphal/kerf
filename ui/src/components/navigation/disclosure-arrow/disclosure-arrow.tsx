import type { SafeHtml } from 'kerfjs';
import { ChevronRight } from 'lucide';

import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import type { CssLength } from '../../../shared/styles/css-values.js';
import { LucideIcon } from '../../media/lucide-icon/lucide-icon.js';

export type DisclosureDirection = 'up' | 'down' | 'left' | 'right';

export interface DisclosureArrowProps {
  open: boolean;
  openDirection?: DisclosureDirection;
  closedDirection?: DisclosureDirection;
  /** Replacement icons should use right as their unrotated orientation. */
  icon?: SafeHtml;
  /** Typed box size for the square visual. Default: `remify(18px)`. */
  size?: CssLength;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const directionRotations: Record<DisclosureDirection, number> = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};

function rotationForState(
  open: boolean,
  openDirection: DisclosureDirection,
  closedDirection: DisclosureDirection,
) {
  const closedRotation = directionRotations[closedDirection];
  if (!open) return closedRotation;

  const openRotation = directionRotations[openDirection];
  const shortestDelta = ((openRotation - closedRotation + 540) % 360) - 180;
  return closedRotation + shortestDelta;
}

const DISCLOSURE_ARROW_PROTECTED = new Set([
  'data-component',
  'data-direction',
  'data-open',
]);

export function DisclosureArrow({
  open,
  openDirection = 'down',
  closedDirection = 'right',
  icon,
  size,
  className = '',
  slot,
  rootAttributes = {},
}: DisclosureArrowProps) {
  const direction = open ? openDirection : closedDirection;
  const rotation = rotationForState(open, openDirection, closedDirection);
  return (
    <span
      {...filterDataAttributes(rootAttributes, DISCLOSURE_ARROW_PROTECTED)}
      class={`kui-disclosure-arrow ${className}`.trim()}
      style={`--_kui-disclosure-arrow-rotation:${rotation}deg${size ? `;--kui-disclosure-arrow-size:${size}` : ''}`}
      data-component="disclosure-arrow"
      data-open={String(open)}
      data-direction={direction}
      aria-hidden="true"
      slot={slot}
    >
      {icon ?? <LucideIcon icon={ChevronRight} name="chevron-right" />}
    </span>
  );
}
