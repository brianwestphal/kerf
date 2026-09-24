import { type CssLength, space, type UiSpaceName } from './css-values.js';

const spaceNames: readonly UiSpaceName[] = [
  'none',
  '2xs',
  'xs',
  's',
  'm',
  'l',
  'xl',
];

export interface SpacerProps {
  /** Grow and shrink to fill the available space along a parent's flex axis. */
  flex?: boolean;
  /** A named UI spacing token or typed physical width. */
  width?: UiSpaceName | CssLength;
  /** A named UI spacing token or typed physical height. */
  height?: UiSpaceName | CssLength;
  className?: string;
}

function dimension(value?: UiSpaceName | CssLength): CssLength | undefined {
  return spaceNames.includes(value as UiSpaceName)
    ? space(value as UiSpaceName)
    : (value as CssLength | undefined);
}

/** A decorative fixed-size or flexible gap for Row, List, and other flex layouts. */
export function Spacer({
  flex = false,
  width,
  height,
  className = '',
}: SpacerProps) {
  const widthValue = dimension(width);
  const heightValue = dimension(height);
  const style = [
    widthValue ? `width:${widthValue}` : '',
    heightValue ? `height:${heightValue}` : '',
  ]
    .filter(Boolean)
    .join(';');

  return (
    <div
      class={`kui-spacer ${className}`.trim()}
      data-component="spacer"
      data-flex={String(flex)}
      aria-hidden="true"
      style={style || undefined}
    ></div>
  );
}

export type { CssLength, UiSpaceName } from './css-values.js';
