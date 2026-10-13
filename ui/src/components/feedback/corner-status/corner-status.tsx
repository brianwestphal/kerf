import type { KerfUiContent } from '../../../shared/content/semantic-content.js';

/** The viewport corner a CornerStatus occupies, in logical (RTL-aware) terms. */
export type CornerStatusPlacement =
  'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';

/** Where a CornerStatus appears: the top layer, or in flow. */
export type CornerStatusPresentation = 'overlay' | 'embedded';

export interface CornerStatusProps {
  /** The root id: what a `popovertarget` control or `getElementById` names. */
  id?: string;
  /** One or more `StateBanner`s, typically `urgency="status"`; they stack. */
  children: KerfUiContent;
  /** Viewport corner; defaults to `bottom-end`. */
  placement?: CornerStatusPlacement;
  /**
   * `overlay` (default) is a native `popover="manual"` host in the top layer,
   * opened by `wireCornerStatus`: above fixed and z-indexed page chrome,
   * never focused, and with no close button, light dismiss, or Escape.
   * `embedded` renders the same stack in flow for a catalog or inline use.
   */
  presentation?: CornerStatusPresentation;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A non-dismissible status surface pinned to a viewport corner — "Loading…",
 * "Updating Tickets… 3 of 12" — for app-level progress that has no better
 * home beside the affected work. The application owns its lifetime: render it
 * while the work runs and remove it when the work ends. It carries no role of
 * its own; the composed `StateBanner` is the polite live region. Use a toast
 * for transient, dismissible confirmation instead.
 */
export function CornerStatus({
  id,
  children,
  placement = 'bottom-end',
  presentation = 'overlay',
  className = '',
  slot,
}: CornerStatusProps) {
  return (
    <div
      id={id}
      class={`kui-corner-status ${className}`.trim()}
      data-component="corner-status"
      data-placement={placement}
      data-presentation={presentation}
      popover={presentation === 'overlay' ? 'manual' : undefined}
      slot={slot}
    >
      {children}
    </div>
  );
}
