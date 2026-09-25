import { Badge } from '@kerfjs/ui/badge';

interface DemoChipProps {
  label: string;
  size?: 'default' | 'tall' | 'wide';
}

export function DemoChip({ label, size = 'default' }: DemoChipProps) {
  return (
    <Badge
      appearance="outline"
      shape="rounded"
      size={size === 'default' ? 'compact' : 'default'}
    >
      {label}
    </Badge>
  );
}
