import './demo-chip.css';

interface DemoChipProps {
  label: string;
  size?: 'default' | 'tall' | 'wide';
}

export function DemoChip({ label, size = 'default' }: DemoChipProps) {
  return (
    <span class={`demo-chip${size === 'default' ? '' : ` demo-chip--${size}`}`}>
      {label}
    </span>
  );
}
