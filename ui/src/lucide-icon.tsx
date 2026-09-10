import { jsx } from 'kerfjs/jsx-runtime';
import type { IconNode } from 'lucide';

export type LucideNode = IconNode;

export interface LucideIconProps {
  icon: LucideNode;
  name: string;
  className?: string;
  label?: string;
}

/** Render a Lucide-compatible icon node without copying icon SVG strings. */
export function LucideIcon({ icon, name, className, label }: LucideIconProps) {
  return (
    <svg
      class={className}
      data-lucide={name}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      {icon.map(([tag, attrs]) => jsx(tag, attrs))}
    </svg>
  );
}
