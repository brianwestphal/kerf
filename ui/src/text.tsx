import type { KerfBaseAttrs } from 'kerfjs/jsx-runtime';

import type { KerfUiContent } from './semantic-content.js';

export type TextVariant =
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
export type TextTone = 'default' | 'quiet' | 'danger';
export type TextSize = 'compact' | 'default' | 'large' | 'xlarge';
export type TextFont = 'default' | 'monospace';
export type TextBorder = 'transparent' | 'none';
export type TextLineHeight = 'default' | 'tight';

export type TextContent =
  KerfUiContent | string | number | readonly TextContent[];

export type TextProps = Omit<
  KerfBaseAttrs,
  'children' | 'class' | 'className'
> & {
  /** Native heading, paragraph, or inline span element to render. Defaults to `p`. */
  variant?: TextVariant;
  /** Semantic foreground treatment. Defaults to the inherited foreground. */
  tone?: TextTone;
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

/**
 * Semantic heading, paragraph, or inline text. Block variants use the standard
 * content-item padding; `span` adds no box geometry.
 * All ordinary native heading/paragraph attributes pass through to the element.
 */
export function Text({
  variant: Variant = 'p',
  tone = 'default',
  size = 'default',
  font = 'default',
  border = 'transparent',
  flush = false,
  lineHeight = 'default',
  children,
  class: classValue = '',
  className = '',
  ...attributes
}: TextProps) {
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
    >
      {children}
    </Variant>
  );
}
