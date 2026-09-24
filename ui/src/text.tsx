import type { KerfBaseAttrs } from 'kerfjs/jsx-runtime';

import type { KerfUiContent } from './semantic-content.js';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';

export type TextContent =
  KerfUiContent | string | number | readonly TextContent[];

export type TextProps = Omit<
  KerfBaseAttrs,
  'children' | 'class' | 'className'
> & {
  /** Native heading or paragraph element to render. */
  variant: TextVariant;
  children: TextContent;
  class?: string;
  className?: string;
};

/**
 * Semantic heading or paragraph text with the standard content-item padding.
 * All ordinary native heading/paragraph attributes pass through to the element.
 */
export function Text({
  variant: Variant,
  children,
  class: classValue = '',
  className = '',
  ...attributes
}: TextProps) {
  const classes = `kui-text ${classValue} ${className}`.trim();
  return (
    <Variant {...attributes} class={classes} data-component="text">
      {children}
    </Variant>
  );
}
