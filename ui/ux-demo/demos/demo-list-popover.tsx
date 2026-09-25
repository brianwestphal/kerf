import { SunkenPanel } from '@kerfjs/ui/sunken-panel';
import { Text } from '@kerfjs/ui/text';
import type { SafeHtml } from 'kerfjs';

interface DemoListPopoverProps {
  id: string;
  label: string;
  children: SafeHtml | string;
}

export function DemoListPopover({ id, label, children }: DemoListPopoverProps) {
  return (
    <div id={id} popover="auto" role="dialog" aria-label={label}>
      <SunkenPanel>
        {typeof children === 'string' ? <Text>{children}</Text> : children}
      </SunkenPanel>
    </div>
  );
}
