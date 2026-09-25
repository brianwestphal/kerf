import { SunkenPanel } from '@kerfjs/ui/sunken-panel';
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
    <SunkenPanel ariaLabel={`${measure} layout example`}>
      {children}
    </SunkenPanel>
  );
}
