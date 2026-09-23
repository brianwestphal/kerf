import type { DividerSides } from './divider-sides.js';
import type { KerfUiContent } from './semantic-content.js';

export interface ListProps {
  children?: KerfUiContent;
  /** Use the standard item gap, or supply browser CSS such as `var(--kui-space-2xs)` or `0.25rem`. Defaults to no gap. */
  gap?: boolean | string;
  /** Allow this list to grow/shrink, or supply a CSS flex shorthand. */
  flex?: boolean | string;
  /** Own vertical scrolling and overscroll containment. */
  scrollable?: boolean;
  /** Physical divider edges in canonical top/right/bottom/left order. */
  dividerSides?: DividerSides;
  className?: string;
}

/** A stretch-aligned vertical stack with optional gap, flex, scroll, and dividers. */
export function List({
  children,
  gap = false,
  flex = false,
  scrollable = false,
  dividerSides = '',
  className = '',
}: ListProps) {
  const gapValue = gap === true ? 'var(--kui-list-gap)' : gap || undefined;
  const flexValue = flex === true ? '1 1 auto' : flex || undefined;
  const style = [
    gapValue ? `--_kui-list-gap:${gapValue}` : '',
    flexValue ? `--_kui-list-flex:${flexValue}` : '',
  ]
    .filter(Boolean)
    .join(';');

  return (
    <div
      class={`kui-list ${className}`.trim()}
      data-component="list"
      data-gap={String(Boolean(gap))}
      data-flex={String(Boolean(flex))}
      data-scrollable={String(scrollable)}
      divider-sides={dividerSides || undefined}
      style={style || undefined}
    >
      {children}
    </div>
  );
}

export type { DividerSides } from './divider-sides.js';
