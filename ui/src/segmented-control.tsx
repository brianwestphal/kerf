import type { SafeHtml } from 'kerfjs';

export type SegmentedControlAppearance = 'filled' | 'outlined' | 'toolbar';
export type SegmentedControlShape = 'rounded' | 'pill';
export type SegmentedControlSize = 'small' | 'default';
export type SegmentedControlLayout = 'content' | 'equal';

export interface SegmentedControlChoice {
  value: string;
  label: string;
  content?: SafeHtml;
  title?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  id: string;
  label: string;
  value: string;
  choices: readonly SegmentedControlChoice[];
  action?: string;
  appearance?: SegmentedControlAppearance;
  shape?: SegmentedControlShape;
  size?: SegmentedControlSize;
  layout?: SegmentedControlLayout;
  className?: string;
}

export function SegmentedControl({
  id,
  label,
  value,
  choices,
  action = 'select-segment',
  appearance = 'filled',
  shape = 'rounded',
  size = 'default',
  layout = 'content',
  className = '',
}: SegmentedControlProps) {
  return <div
    class={`kui-segmented-control ${className}`.trim()}
    data-component="segmented-control"
    data-segmented-control-id={id}
    data-value={value}
    data-appearance={appearance}
    data-shape={shape}
    data-size={size}
    data-layout={layout}
    role="group"
    aria-label={label}
  >
    {choices.map((choice) => {
      const selected = choice.value === value;
      return <button
        type="button"
        class="kui-segmented-control__item"
        data-action={action}
        data-segment-value={choice.value}
        data-selected={String(selected)}
        aria-label={choice.label}
        aria-pressed={String(selected)}
        title={choice.title}
        disabled={choice.disabled}
        tabindex="0"
      >{choice.content ?? <span>{choice.label}</span>}</button>;
    })}
  </div>;
}
