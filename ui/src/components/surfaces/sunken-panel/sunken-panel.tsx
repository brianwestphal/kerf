import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import type {
  CssFlex,
  CssFlexKeyword,
} from '../../../shared/styles/css-values.js';
import { ensureSunkenTexture } from '../../../shared/styles/sunken-texture.js';

export type SunkenPanelShape = 'rounded' | 'square';

export interface SunkenPanelProps {
  children?: KerfUiContent;
  /** Optional accessible landmark name for a distinct application region. */
  ariaLabel?: string;
  /** Corner shape: a rounded rectangle (default) or square corners. */
  shape?: SunkenPanelShape;
  /** Grow or shrink within a flex parent, using Grid's typed flex contract. */
  flex?: boolean | CssFlexKeyword | CssFlex;
  /** Fill a parent with a definite height; use flex inside a flex layout. */
  fill?: boolean;
  /** Opt into keyboard (`0`) or programmatic (`-1`) focus on the panel. */
  tabIndex?: 0 | -1;
  /** Keep the standard focus outline visible, such as for a drop target. */
  outlined?: boolean;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const SUNKEN_PANEL_PROTECTED = new Set([
  'data-component',
  'data-fill',
  'data-flex',
  'data-outlined',
  'data-shape',
]);

/**
 * A lowered application surface with one compact inset and a vertical content
 * stack. The panel owns its background and padding; children own their own
 * borders and internal geometry.
 */
export function SunkenPanel({
  children,
  ariaLabel,
  shape = 'rounded',
  flex = false,
  fill = false,
  tabIndex,
  outlined = false,
  className = '',
  slot,
  rootAttributes = {},
}: SunkenPanelProps) {
  const flexValue = flex === true ? '1 1 auto' : flex || undefined;
  ensureSunkenTexture();
  return (
    <div
      {...filterDataAttributes(rootAttributes, SUNKEN_PANEL_PROTECTED)}
      class={`kui-sunken-panel ${className}`.trim()}
      data-component="sunken-panel"
      data-shape={shape}
      data-flex={String(Boolean(flex))}
      data-fill={fill ? 'true' : undefined}
      data-outlined={outlined ? 'true' : undefined}
      style={flexValue ? `--_kui-sunken-panel-flex:${flexValue}` : undefined}
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
      tabindex={tabIndex}
      slot={slot}
    >
      {children}
    </div>
  );
}

export { ensureSunkenTexture } from '../../../shared/styles/sunken-texture.js';
