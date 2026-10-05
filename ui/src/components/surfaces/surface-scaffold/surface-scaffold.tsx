import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import type { CssLength } from '../../../shared/styles/css-values.js';

export type DialogSurfaceSize = 'small' | 'medium' | 'large';
export type DialogSurfacePresentation = 'modal' | 'side-sheet' | 'fullscreen';
export type SurfaceInset = 'none' | 'compact' | 'comfortable';
export type DialogSurfaceMaxHeight = CssLength | 'viewport';

export interface DialogSurfaceProps {
  children: KerfUiContent;
  size?: DialogSurfaceSize;
  presentation?: DialogSurfacePresentation;
  bodyInset?: SurfaceInset;
  footerInset?: SurfaceInset;
  /** Modal edge clearance. Omit to retain Web Awesome's default viewport cap. */
  viewportGutter?: CssLength;
  /** Modal height cap, bounded by the dynamic viewport minus both gutters. */
  maxHeight?: DialogSurfaceMaxHeight;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** Configure recurring Web Awesome dialog geometry without consumer ::part() CSS. */
export function DialogSurface({
  children,
  size = 'medium',
  presentation = 'modal',
  bodyInset = 'compact',
  footerInset = 'comfortable',
  viewportGutter,
  maxHeight,
  className = '',
  slot,
}: DialogSurfaceProps) {
  const style = [
    viewportGutter === undefined
      ? ''
      : `--_kui-dialog-surface-gutter:${viewportGutter}`,
    maxHeight === undefined || maxHeight === 'viewport'
      ? ''
      : `--_kui-dialog-surface-max-height:${maxHeight}`,
  ]
    .filter(Boolean)
    .join(';');
  return (
    <div
      class={`kui-dialog-surface ${className}`.trim()}
      data-component="dialog-surface"
      data-size={size}
      data-presentation={presentation}
      data-body-inset={bodyInset}
      data-footer-inset={footerInset}
      data-viewport-gutter={viewportGutter === undefined ? undefined : ''}
      data-max-height={maxHeight === undefined ? undefined : ''}
      style={style || undefined}
      slot={slot}
    >
      {children}
    </div>
  );
}

export type PopupSurfaceInset = 'standard' | 'compact' | 'list-zero';

export interface PopupSurfaceProps {
  children: KerfUiContent;
  inset?: PopupSurfaceInset;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** Configure recurring Web Awesome dropdown-menu geometry without consumer ::part() CSS. */
export function PopupSurface({
  children,
  inset = 'standard',
  className = '',
  slot,
}: PopupSurfaceProps) {
  return (
    <span
      class={`kui-popup-surface ${className}`.trim()}
      data-component="popup-surface"
      data-inset={inset}
      slot={slot}
    >
      {children}
    </span>
  );
}
