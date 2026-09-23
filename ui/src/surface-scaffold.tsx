import type { KerfUiContent } from './semantic-content.js';

export type DialogSurfaceSize = 'small' | 'medium' | 'large';
export type DialogSurfacePresentation = 'modal' | 'side-sheet' | 'fullscreen';
export type SurfaceInset = 'none' | 'compact' | 'comfortable';

export interface DialogSurfaceProps {
  children: KerfUiContent;
  size?: DialogSurfaceSize;
  presentation?: DialogSurfacePresentation;
  bodyInset?: SurfaceInset;
  footerInset?: SurfaceInset;
  className?: string;
}

/** Configure recurring Web Awesome dialog geometry without consumer ::part() CSS. */
export function DialogSurface({
  children,
  size = 'medium',
  presentation = 'modal',
  bodyInset = 'compact',
  footerInset = 'comfortable',
  className = '',
}: DialogSurfaceProps) {
  return (
    <div
      class={`kui-dialog-surface ${className}`.trim()}
      data-component="dialog-surface"
      data-size={size}
      data-presentation={presentation}
      data-body-inset={bodyInset}
      data-footer-inset={footerInset}
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
}

/** Configure recurring Web Awesome dropdown-menu geometry without consumer ::part() CSS. */
export function PopupSurface({
  children,
  inset = 'standard',
  className = '',
}: PopupSurfaceProps) {
  return (
    <span
      class={`kui-popup-surface ${className}`.trim()}
      data-component="popup-surface"
      data-inset={inset}
    >
      {children}
    </span>
  );
}
