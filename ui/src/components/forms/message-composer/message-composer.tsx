import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import { Toolbar } from '../../actions/toolbar/toolbar.js';
import { Text } from '../../typography/text/text.js';

/**
 * Application `data-*` identity on the MessageComposer root, such as `data-key`;
 * the composer's own configuration attributes stay protected.
 */
export type MessageComposerRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

export interface MessageComposerProps {
  /** The message field's accessible name, in title style ("Message"). */
  label: string;
  /** Native textarea `name`: the form field the message submits under. */
  name: string;
  /**
   * The textarea id. With a `hint`, the hint takes `<id>-hint` and becomes
   * the field's accessible description.
   */
  id?: string;
  /** The field's text: a draft to restore, or `''` after sending. */
  value?: string;
  /** Sentence-style example of what to write ("Ask about this build"). */
  placeholder?: string;
  /**
   * Visible lines while the field is empty or short (default 1). The field
   * grows with its content from here.
   */
  minRows?: number;
  /**
   * Lines the field grows to before it scrolls (default 8). At least
   * `minRows`.
   */
  maxRows?: number;
  /**
   * Quiet, sentence-style supporting copy in the action row's leading zone,
   * after any `leading` controls.
   */
  hint?: string;
  /**
   * Controls at the start of the action row, such as an attach button or a
   * model `Select`, normally in a `ToolbarControlGroup`.
   */
  leading?: KerfUiContent;
  /** Trailing controls in the action row, normally one brand Send button. */
  trailing: KerfUiContent;
  /** Disable the field; the app disables its own actions. */
  disabled?: boolean;
  /**
   * Opt in to Enter-to-send: with `wireMessageComposers` running over an ancestor,
   * Enter (or Cmd/Ctrl+Enter) in the field activates the first trailing
   * action, Shift+Enter inserts a newline, and an Enter that commits an IME
   * composition or meets an empty message does not send. The field announces
   * the shortcut with `aria-keyshortcuts`.
   */
  submitOnEnter?: boolean;
  /** Safe `data-*` identity on the root. */
  rootAttributes?: MessageComposerRootAttributes;
  className?: string;
  /** Native named-slot assignment, such as a `wa-dialog`'s `footer`. */
  slot?: string;
}

const COMPOSER_PROTECTED = new Set([
  'data-component',
  'data-disabled',
  'data-submit-on-enter',
]);

function rowCount(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1)
    throw new RangeError(`MessageComposer ${name} must be a positive integer.`);
  return value;
}

/**
 * A chat or prompt composer: a raised frame whose border turns brand while
 * focus is within, holding a borderless message field that grows with its
 * content between `minRows` and `maxRows` lines, above a compact `Toolbar`
 * action row: optional `leading` controls and `hint`, then `trailing` actions. The app owns the value and sending;
 * `submitOnEnter` with `wireMessageComposers` adds Enter-to-send.
 */
export function MessageComposer({
  label,
  name,
  id,
  value = '',
  placeholder,
  minRows = 1,
  maxRows = 8,
  hint,
  leading,
  trailing,
  disabled = false,
  submitOnEnter = false,
  rootAttributes = {},
  className = '',
  slot,
}: MessageComposerProps) {
  const min = rowCount(minRows, 'minRows');
  const max = rowCount(maxRows, 'maxRows');
  if (max < min)
    throw new RangeError('MessageComposer maxRows must be at least minRows.');
  const hintId = hint !== undefined && id !== undefined ? `${id}-hint` : '';
  return (
    <div
      {...filterDataAttributes(rootAttributes, COMPOSER_PROTECTED)}
      class={`kui-message-composer ${className}`.trim()}
      data-component="message-composer"
      data-disabled={disabled ? 'true' : undefined}
      data-submit-on-enter={submitOnEnter ? 'true' : undefined}
      style={`--_kui-message-composer-min-rows:${min};--_kui-message-composer-max-rows:${max}`}
      slot={slot}
    >
      <textarea
        class="kui-message-composer__field"
        id={id}
        name={name}
        rows={min}
        aria-label={label}
        aria-describedby={hintId || undefined}
        aria-keyshortcuts={submitOnEnter ? 'Enter' : undefined}
        placeholder={placeholder}
        disabled={disabled}
      >
        {value}
      </textarea>
      <Toolbar
        position="footer"
        density="compact"
        label={`${label} Actions`}
        leading={
          leading === undefined && hint === undefined ? undefined : (
            <>
              {leading}
              {hint === undefined ? null : (
                <Text
                  variant="span"
                  tone="quiet"
                  size="compact"
                  id={hintId || undefined}
                >
                  {hint}
                </Text>
              )}
            </>
          )
        }
        trailing={trailing}
      />
    </div>
  );
}
