import {
  badgeText,
  type BadgeValue,
} from '../../../shared/content/badge-text.js';
import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import type { SemanticTone } from '../../../shared/styles/semantic-tone.js';
import { Badge } from '../../feedback/badge/badge.js';

export type SegmentedControlAppearance = 'filled' | 'outlined' | 'toolbar';
export type SegmentedControlShape = 'rounded' | 'pill';
export type SegmentedControlSize =
  'default' | 'compact' | /** @deprecated Use compact. */ 'small';
export type SegmentedControlLayout = 'content' | 'equal';

export interface SegmentedControlChoice<Value extends string = string> {
  value: Value;
  label: string;
  content?: KerfUiContent;
  title?: string;
  disabled?: boolean;
  /**
   * A count, short text, or `true` for a text-free dot over the choice's
   * top-trailing corner, such as how many workers are live. A count of 0 (or
   * less) and empty text show no badge, and a `placeholder` control shows
   * none. The badge is decorative (`aria-hidden`): put its meaning in `label`
   * and `title` yourself, for example "Workers View, 2 live". Since `label`
   * is also the visible text when `content` is omitted, give a badged choice
   * its own `content`, such as an icon.
   */
  badge?: BadgeValue;
  /** The badge's tone (default `danger`). */
  badgeTone?: SemanticTone;
  /**
   * The largest count shown in full; a larger count shows as `{badgeMax}+`
   * (default 99, so 100 shows "99+"). Text badges are shown as given.
   */
  badgeMax?: number;
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
  /** Render as a loading placeholder: every choice keeps its live label or icon, none is selected, and every segment is disabled. */
  placeholder?: boolean;
  /** Disable the whole control: every segment is disabled and dimmed, the selection stays visible, and the group reports `aria-disabled`. A choice's own `disabled` still disables just that segment. */
  disabled?: boolean;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const SEGMENTED_CONTROL_PROTECTED = new Set([
  'data-action',
  'data-appearance',
  'data-component',
  'data-disabled',
  'data-kui-disabled',
  'data-layout',
  'data-placeholder',
  'data-segment-value',
  'data-segmented-control-id',
  'data-selected',
  'data-shape',
  'data-size',
  'data-value',
]);

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
  disabled = false,
  slot,
  rootAttributes = {},
}: SegmentedControlProps<Value>) {
  return (
    <div
      {...filterDataAttributes(rootAttributes, SEGMENTED_CONTROL_PROTECTED)}
      class={`kui-segmented-control ${className}`.trim()}
      data-component="segmented-control"
      data-segmented-control-id={id}
      data-value={value}
      data-appearance={appearance}
      data-shape={shape}
      data-size={size === 'small' ? 'compact' : size}
      data-layout={layout}
      data-placeholder={placeholder ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      role="group"
      aria-label={label}
      aria-disabled={disabled ? 'true' : undefined}
      aria-busy={placeholder ? 'true' : undefined}
      slot={slot}
    >
      {choices.map((choice) => {
        // The choices are known chrome; only the selection is unknown while
        // loading, so a placeholder shows every choice and selects none.
        const selected = !placeholder && choice.value === value;
        const unavailable = disabled || choice.disabled;
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
            disabled={unavailable || placeholder}
            tabindex={placeholder ? '-1' : '0'}
            data-kui-disabled={unavailable ? 'true' : undefined}
          >
            {choice.content ?? <span>{choice.label}</span>}
            {placeholder ? null : (
              <ChoiceBadge
                badge={choice.badge}
                tone={choice.badgeTone ?? 'danger'}
                max={choice.badgeMax ?? 99}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// KF-170258: the same corner badge ToolbarButton draws, read from the same
// plain data, so a view switcher can carry a count without app CSS.
function ChoiceBadge({
  badge,
  tone,
  max,
}: {
  badge: BadgeValue | undefined;
  tone: SemanticTone;
  max: number;
}) {
  if (badge === true)
    return <Badge tone={tone} size="dot" placement="corner" ariaHidden />;
  const text = badgeText(badge, max);
  if (text === undefined) return null;
  return (
    <Badge
      tone={tone}
      appearance="solid"
      size="compact"
      placement="corner"
      ariaHidden
    >
      {text}
    </Badge>
  );
}
