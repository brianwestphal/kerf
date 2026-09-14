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

export function DisclosureArrow({
  open,
  openDirection = 'down',
  closedDirection = 'right',
  icon,
  className = '',
}: DisclosureArrowProps) {
  const direction = open ? openDirection : closedDirection;
  return <span
    class={`kui-disclosure-arrow ${className}`.trim()}
    data-component="disclosure-arrow"
    data-open={String(open)}
    data-direction={direction}
    aria-hidden="true"
  >{icon ?? <LucideIcon icon={ChevronRight} name="chevron-right" />}</span>;
}
