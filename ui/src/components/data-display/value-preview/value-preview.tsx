import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import type { CssLength } from '../../../shared/styles/css-values.js';

const unsafeStyleValue = /[;{}<>"'\\]|\p{Cc}/u;

function styleValue(value: CssLength, prop: string): string {
  const trimmed = value.trim();
  if (!trimmed || unsafeStyleValue.test(trimmed))
    throw new TypeError(`ValuePreview ${prop} requires one CSS length.`);
  return trimmed;
}

export interface ValuePreviewProps {
  /** Accessible name for the keyboard-scrollable value. */
  label: string;
  /** Literal plain-text value, including newlines and long unbroken text. */
  value: string;
  /** Minimum height; defaults to 48px. */
  minHeight?: CssLength;
  /** Maximum height before the value scrolls; defaults to 96px. */
  maxHeight?: CssLength;
  id?: string;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const VALUE_PREVIEW_PROTECTED = new Set(['data-component']);

/** Read-only, bounded multiline text for a containing surface such as SunkenPanel. */
export function ValuePreview({
  label,
  value,
  minHeight,
  maxHeight,
  id,
  className = '',
  slot,
  rootAttributes = {},
}: ValuePreviewProps) {
  const bounds = [
    minHeight === undefined
      ? ''
      : `--_kui-value-preview-min-height:${styleValue(minHeight, 'minHeight')}`,
    maxHeight === undefined
      ? ''
      : `--_kui-value-preview-max-height:${styleValue(maxHeight, 'maxHeight')}`,
  ]
    .filter(Boolean)
    .join(';');
  return (
    <output
      {...filterDataAttributes(rootAttributes, VALUE_PREVIEW_PROTECTED)}
      class={`kui-value-preview ${className}`.trim()}
      data-component="value-preview"
      aria-label={label}
      tabindex={0}
      id={id}
      style={bounds || undefined}
      slot={slot}
    >
      {value}
    </output>
  );
}
