// KF-0MY6JQ: PopupSurface, one of the four surfaces the
// `@kerfjs/ui/surface-scaffold` facade re-exports.
import type { KerfUiContent } from '../../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../../shared/dom/extension-attributes.js';

export type PopupSurfaceInset = 'standard' | 'compact' | 'list-zero';

export interface PopupSurfaceProps {
  children: KerfUiContent;
  inset?: PopupSurfaceInset;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const POPUP_SURFACE_PROTECTED = new Set([
  'data-body-inset',
  'data-body-layout',
  'data-component',
  'data-dialog-close',
  'data-emphasis',
  'data-enter-motion',
  'data-exit-motion',
  'data-footer-inset',
  'data-footer-presentation',
  'data-header-presentation',
  'data-height',
  'data-inset',
  'data-light-dismiss',
  'data-max-height',
  'data-min-height',
  'data-preferred-width',
  'data-presentation',
  'data-resizable',
  'data-size',
  'data-stack-active',
  'data-stack-count',
  'data-stack-open',
  'data-stack-position',
  'data-viewport-gutter',
]);

/** Configure recurring Web Awesome dropdown-menu geometry without consumer ::part() CSS. */
export function PopupSurface({
  children,
  inset = 'standard',
  className = '',
  slot,
  rootAttributes = {},
}: PopupSurfaceProps) {
  return (
    <span
      {...filterDataAttributes(rootAttributes, POPUP_SURFACE_PROTECTED)}
      class={`kui-popup-surface ${className}`.trim()}
      data-component="popup-surface"
      data-inset={inset}
      slot={slot}
    >
      {children}
    </span>
  );
}
