import './demo-frame-shell.css';

import type { SafeHtml } from 'kerfjs';

interface DemoFrameShellProps {
  children: SafeHtml;
  measure?: 'default' | 'standard' | 'wrapped';
}

export function DemoFrameShell({
  children,
  measure = 'default',
}: DemoFrameShellProps) {
  return (
    <div
      class={`demo-frame-shell${measure === 'default' ? '' : ` demo-frame-shell--${measure}`}`}
    >
      {children}
    </div>
  );
}
