import { SunkenPanel } from '@kerfjs/ui/sunken-panel';
import type { SafeHtml } from 'kerfjs';

interface DemoFrameShellProps {
  children: SafeHtml;
}

/**
 * A lowered frame that makes a layout specimen's bounds visible. It sizes to
 * its content; an example that needs a measured width to show wrapping or
 * flexible space sets it on the catalog example (`viewport={{ width }}`).
 */
export function DemoFrameShell({ children }: DemoFrameShellProps) {
  return <SunkenPanel ariaLabel="Layout example">{children}</SunkenPanel>;
}
