import type { KerfBaseAttrs } from 'kerfjs/jsx-runtime';

import type { KerfUiContent } from './semantic-content.js';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';
export type TextTone = 'default' | 'quiet' | 'danger';
export type TextSize = 'default' | 'compact';
export type TextFont = 'default' | 'monospace';

export type TextContent =
  KerfUiContent | string | number | readonly TextContent[];

export type TextProps = Omit<
  KerfBaseAttrs,
  'children' | 'class' | 'className'
> & {
  /** Native heading or paragraph element to render. Defaults to `p`. */
  variant?: TextVariant;
  /** Semantic foreground treatment. Defaults to the inherited foreground. */
  tone?: TextTone;
  /** Text sizing independent of the native semantic element. */
  size?: TextSize;
  /** Font family independent of the native semantic element. */
  font?: TextFont;
  children: TextContent;
  class?: string;
  className?: string;
};

/**
 * Semantic heading or paragraph text with the standard content-item padding.
 * All ordinary native heading/paragraph attributes pass through to the element.
 */
export function Text({
  variant: Variant = 'p',
  tone = 'default',
  size = 'default',
  font = 'default',
  children,
  class: classValue = '',
  className = '',
  ...attributes
}: TextProps) {
  const classes = `kui-text ${classValue} ${className}`.trim();
  return (
    <Variant
      {...attributes}
      class={classes}
      data-component="text"
      data-tone={tone}
      data-size={size}
      data-font={font}
    >
      {children}
    </Variant>
  );
}
