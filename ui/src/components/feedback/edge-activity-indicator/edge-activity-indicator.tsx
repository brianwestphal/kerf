import type { SemanticTone } from '../../../shared/styles/semantic-tone.js';

export interface EdgeActivityIndicatorProps {
  /** Whether work is in progress; shows the strip and runs its wave. */
  busy: boolean;
  /**
   * Optional status shown in a small pill hanging from the edge while busy.
   * The pill is a polite live region; omit it for a purely decorative strip.
   */
  message?: string;
  /** Strip and pill color; defaults to `info`. */
  tone?: SemanticTone;
  /** Clear the device's top safe area (default) or sit at the very edge. */
  inset?: 'safe-area' | 'none';
  className?: string;
}

/**
 * A layout-free activity strip pinned to the top edge of the viewport: a row
 * of thin bars that ripple in a traveling wave while `busy`, plus an optional
 * hanging status pill. It allocates no layout, ignores the pointer, and its
 * bars are hidden from assistive technology; only the pill announces.
 * Kerf owns the motion: it scales in from the edge and, under reduced motion,
 * only fades.
 */
export function EdgeActivityIndicator({
  busy,
  message,
  tone = 'info',
  inset = 'safe-area',
  className = '',
}: EdgeActivityIndicatorProps) {
  const showMessage = busy && Boolean(message?.trim());
  return (
    <div
      class={`kui-edge-activity-indicator ${className}`.trim()}
      data-component="edge-activity-indicator"
      data-tone={tone}
      data-busy={busy ? 'true' : 'false'}
      data-inset={inset}
    >
      <div class="kui-edge-activity-indicator__strip" aria-hidden="true" />
      {message !== undefined && (
        <div
          class="kui-edge-activity-indicator__message"
          role="status"
          aria-live="polite"
          data-visible={showMessage ? 'true' : 'false'}
        >
          {showMessage ? message : ''}
        </div>
      )}
    </div>
  );
}
