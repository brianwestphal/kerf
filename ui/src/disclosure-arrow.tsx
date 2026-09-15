import type { SafeHtml } from 'kerfjs';
import { ChevronRight } from 'lucide';

import { LucideIcon } from './lucide-icon.js';

export type DisclosureDirection = 'up' | 'down' | 'left' | 'right';

export interface DisclosureArrowProps {
  open: boolean;
  openDirection?: DisclosureDirection;
  closedDirection?: DisclosureDirection;
  /** Replacement icons should use right as their unrotated orientation. */
  icon?: SafeHtml;
  className?: string;
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
  const shortestDelta = (openRotation - closedRotation + 540) % 360 - 180;
  return closedRotation + shortestDelta;
}

export function DisclosureArrow({
  open,
  openDirection = 'down',
  closedDirection = 'right',
  icon,
  className = '',
}: DisclosureArrowProps) {
  const direction = open ? openDirection : closedDirection;
  const rotation = rotationForState(open, openDirection, closedDirection);
  return <span
    class={`kui-disclosure-arrow ${className}`.trim()}
    style={`--_kui-disclosure-arrow-rotation:${rotation}deg`}
    data-component="disclosure-arrow"
    data-open={String(open)}
    data-direction={direction}
    aria-hidden="true"
  >{icon ?? <LucideIcon icon={ChevronRight} name="chevron-right" />}</span>;
}
