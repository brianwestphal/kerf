import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import type { CssLength } from '../../../shared/styles/css-values.js';

export interface SizedRegionProps {
  /**
   * The region's height: a typed `CssLength`, or `'fill'` to take the height
   * its parent gives it (the rest of a flex column such as a Pane's content,
   * or all of a parent with a definite height). Defaults to `'fill'`. Inside
   * a parent that sizes to its content, `'fill'` has nothing to take, so
   * give the region a `minHeight` or a length.
   */
  height?: CssLength | 'fill';
  /**
   * The least height, a typed `CssLength`. Unlike `min-height` on an
   * ordinary box, it gives the content a usable height on its own, even in
   * a parent that sizes to its content.
   */
  minHeight?: CssLength;
  /** The greatest height, a typed `CssLength`. */
  maxHeight?: CssLength;
  /**
   * One piece of content that fills the region: a whole-screen layout
   * (TabNavigator, NavStack, SplitView, Workbench) or another component
   * that fills its parent's height.
   */
  children?: KerfUiContent;
  id?: string;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const SIZED_REGION_PROTECTED = new Set(['data-component', 'data-fill']);

/**
 * Gives content that cannot size itself a definite height: a whole-screen
 * layout placed below an app's root, which otherwise collapses to its bar.
 * Not for sizing ordinary components; those size to their content.
 */
export function SizedRegion({
  height = 'fill',
  minHeight,
  maxHeight,
  children,
  id,
  className = '',
  slot,
  rootAttributes = {},
}: SizedRegionProps) {
  const style = [
    height === 'fill' ? '' : `--_kui-sized-region-height:${height}`,
    minHeight === undefined
      ? ''
      : `--_kui-sized-region-min-height:${minHeight}`,
    maxHeight === undefined
      ? ''
      : `--_kui-sized-region-max-height:${maxHeight}`,
  ]
    .filter(Boolean)
    .join(';');
  return (
    <div
      {...filterDataAttributes(rootAttributes, SIZED_REGION_PROTECTED)}
      id={id}
      class={`kui-sized-region ${className}`.trim()}
      data-component="sized-region"
      data-fill={height === 'fill' ? 'true' : undefined}
      style={style || undefined}
      slot={slot}
    >
      {children}
    </div>
  );
}

export type { CssLength } from '../../../shared/styles/css-values.js';
