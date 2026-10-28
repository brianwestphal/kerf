import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';

export type ContentSwapSide = 'a' | 'b';
export type ContentSwapTransition = 'none' | 'crossfade' | 'push';
/** `forward` pushes the incoming side in from the inline end; `backward` from the start. */
export type ContentSwapDirection = 'forward' | 'backward';

export interface ContentSwapProps {
  /** Which side is shown. Changing it runs the transition. */
  active: ContentSwapSide;
  a: KerfUiContent;
  b: KerfUiContent;
  /** `push` (default) slides the sides, `crossfade` fades them, `none` swaps instantly. */
  transition?: ContentSwapTransition;
  /** Push direction; mirrors in right-to-left documents. Default `forward`. */
  direction?: ContentSwapDirection;
  /** Accessible name; when set, the swap is a named region. */
  label?: string;
  /** Span the full width of its slot (a dialog label or footer) instead of its content. */
  fill?: boolean;
  className?: string;
  /** Native named-slot assignment, such as a dialog's `label` or `footer`. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const CONTENT_SWAP_PROTECTED = new Set([
  'data-active',
  'data-active-side',
  'data-component',
  'data-direction',
  'data-fill',
  'data-side',
  'data-transition',
]);

/**
 * Two content sides sharing one cell (a dialog body that steps to a second
 * page, a footer whose actions change), with the swap animated in place.
 * Kerf owns the motion, the reduced-motion fallback, and the inactive side's
 * `inert`/`aria-hidden`. Use `NavStack` for full views with their own
 * toolbars.
 */
export function ContentSwap({
  active,
  a,
  b,
  transition = 'push',
  direction = 'forward',
  label,
  fill = false,
  className = '',
  slot,
  rootAttributes = {},
}: ContentSwapProps) {
  const side = (name: ContentSwapSide, content: KerfUiContent) => {
    const shown = active === name;
    return (
      <div
        class="kui-content-swap__side"
        data-side={name}
        data-active={shown ? 'true' : 'false'}
        aria-hidden={shown ? undefined : 'true'}
        inert={shown ? undefined : true}
      >
        {content}
      </div>
    );
  };
  return (
    <div
      {...filterDataAttributes(rootAttributes, CONTENT_SWAP_PROTECTED)}
      class={`kui-content-swap ${className}`.trim()}
      data-component="content-swap"
      data-active-side={active}
      data-transition={transition}
      data-direction={direction}
      data-fill={fill ? 'true' : undefined}
      role={label ? 'region' : undefined}
      aria-label={label}
      slot={slot}
    >
      {side('a', a)}
      {side('b', b)}
    </div>
  );
}
