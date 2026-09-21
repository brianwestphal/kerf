import type { SafeHtml } from 'kerfjs';

import { Skeleton } from './skeleton.js';

export type SegmentedControlAppearance = 'filled' | 'outlined' | 'toolbar';
export type SegmentedControlShape = 'rounded' | 'pill';
export type SegmentedControlSize = 'small' | 'default';
export type SegmentedControlLayout = 'content' | 'equal';

export interface SegmentedControlChoice<Value extends string = string> {
  value: Value;
  label: string;
  content?: SafeHtml;
  title?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<Value extends string = string> {
  id: string;
  label: string;
  value: NoInfer<Value>;
  choices: readonly SegmentedControlChoice<Value>[];
  action?: string;
  appearance?: SegmentedControlAppearance;
  shape?: SegmentedControlShape;
  size?: SegmentedControlSize;
  layout?: SegmentedControlLayout;
  className?: string;
  /** Render as an unanimated loading skeleton, disabling every segment. */
  placeholder?: boolean;
}

export function SegmentedControl<Value extends string>({
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
  placeholder = false,
}: SegmentedControlProps<Value>) {
  return (
    <div
      class={`kui-segmented-control ${className}`.trim()}
      data-component="segmented-control"
      data-segmented-control-id={id}
      data-value={value}
      data-appearance={appearance}
      data-shape={shape}
      data-size={size}
      data-layout={layout}
      data-placeholder={placeholder ? 'true' : undefined}
      role="group"
      aria-label={label}
      aria-busy={placeholder ? 'true' : undefined}
    >
      {choices.map((choice) => {
        const selected = choice.value === value;
        return (
          <button
            type="button"
            class="kui-segmented-control__item"
            data-action={placeholder ? undefined : action}
            data-segment-value={choice.value}
            data-selected={String(selected)}
            aria-label={choice.label}
            aria-pressed={String(selected)}
            title={placeholder ? undefined : choice.title}
            disabled={choice.disabled || placeholder}
            tabindex={placeholder ? '-1' : '0'}
          >
            {placeholder ? (
              <Skeleton width="4em" />
            ) : (
              (choice.content ?? <span>{choice.label}</span>)
            )}
          </button>
        );
      })}
    </div>
  );
}
