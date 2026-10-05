import type { KerfBaseAttrs } from 'kerfjs/jsx-runtime';

import type { CssForegroundColor } from './css-values.js';
import type { KerfUiContent } from './semantic-content.js';

export { FieldLabel, type FieldLabelProps } from './field-label.js';

export type TextVariant =
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
export type TextTone = 'default' | 'quiet' | 'danger';
export type TextSize = 'compact' | 'default' | 'large' | 'xlarge';
export type TextFont = 'default' | 'monospace';
export type TextBorder = 'transparent' | 'none';
export type TextLineHeight = 'default' | 'tight';
export type TextWrap = 'normal' | 'anywhere' | 'nowrap' | 'truncate';

export type TextContent =
  KerfUiContent | string | number | readonly TextContent[];

type TextCommonProps = Omit<
  KerfBaseAttrs,
  'children' | 'class' | 'className'
> & {
  /** Native heading, paragraph, or inline span element to render. Defaults to `p`. */
  variant?: TextVariant;
  /** Semantic foreground treatment. Defaults to the inherited foreground. */
  tone?: TextTone;
  /** Foreground color; overrides tone when supplied, or inherits when omitted. */
  color?: CssForegroundColor;
  /** Text sizing independent of the native semantic element. */
  size?: TextSize;
  /** Font family independent of the native semantic element. */
  font?: TextFont;
  /** Transparent alignment border or no border when embedded in owner chrome. */
  border?: TextBorder;
  /** Remove the block variant's item padding and border in compact content. */
  flush?: boolean;
  /** Use compact leading for short dialog or metadata copy. */
  lineHeight?: TextLineHeight;
  children: TextContent;
  class?: string;
  className?: string;
};

export type TextProps = TextCommonProps &
  (
    | {
        /** Wrap normally or break long unbroken strings. Defaults to normal. */
        wrap?: 'normal' | 'anywhere';
        /** Cap wrapped text to this positive number of lines. */
        maxLines?: number;
      }
    | {
        /** Keep one line, with or without an ellipsis. */
        wrap: 'nowrap' | 'truncate';
        maxLines?: never;
      }
  );

/**
 * Semantic heading, paragraph, or inline text. Block variants use the standard
 * content-item padding; `span` adds no box geometry.
 * All ordinary native heading/paragraph attributes pass through to the element.
 */
export function Text({
  variant: Variant = 'p',
  tone = 'default',
  color,
  size = 'default',
  font = 'default',
  border = 'transparent',
  flush = false,
  lineHeight = 'default',
  wrap = 'normal',
  maxLines,
  children,
  class: classValue = '',
  className = '',
  style,
  ...attributes
}: TextProps) {
  if (
    maxLines !== undefined &&
    (!Number.isSafeInteger(maxLines) ||
      maxLines < 1 ||
      wrap === 'nowrap' ||
      wrap === 'truncate')
  )
    throw new RangeError(
      'Text maxLines requires a positive integer and wrapping',
    );
  const classes = ['kui-text', classValue, className].filter(Boolean).join(' ');
  return (
    <Variant
      {...attributes}
      class={classes}
      data-component="text"
      data-tone={tone}
      data-size={size}
      data-font={font}
      data-border={border}
      data-flush={flush ? 'true' : undefined}
      data-line-height={lineHeight === 'tight' ? 'tight' : undefined}
      data-wrap={wrap === 'normal' ? undefined : wrap}
      data-max-lines={maxLines === undefined ? undefined : String(maxLines)}
      style={
        color === undefined
          ? style
          : `${style === undefined || style === null ? '' : `${style};`}color:${color}`
      }
    >
      {maxLines === undefined ? (
        children
      ) : (
        <span
          class="kui-text__clamp"
          style={`--_kui-text-max-lines:${maxLines}`}
        >
          {children}
        </span>
      )}
    </Variant>
  );
}
