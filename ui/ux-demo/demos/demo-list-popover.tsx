import './demo-list-popover.css';

import type { SafeHtml } from 'kerfjs';

interface DemoListPopoverProps {
  id: string;
  label: string;
  children: SafeHtml | string;
}

export function DemoListPopover({ id, label, children }: DemoListPopoverProps) {
  return (
    <div
      id={id}
      class="demo-list-popover"
      popover="auto"
      role="dialog"
      aria-label={label}
    >
      {children}
    </div>
  );
}
