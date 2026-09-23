import type { KerfUiContent } from './semantic-content.js';

export type TabActivation = 'automatic' | 'manual';
export type TabBarAllocation = 'intrinsic' | 'fill';
export type TabBarPresentation = 'rail' | 'segmented' | 'inspector';
export type TabBarTrailingPlacement = 'separate' | 'adjacent';

export interface TabBarProps {
  id: string;
  label: string;
  children: KerfUiContent;
  leading?: KerfUiContent;
  trailing?: KerfUiContent;
  className?: string;
  /**
   * Keyboard activation mode for this strip, emitted as `data-tab-activation` for
   * `wireTabBars` to read (overrides its `activation` option). `'automatic'` (default)
   * selects on arrow / Home / End; `'manual'` moves roving focus only and the user
   * selects with Enter / Space / click — use it when selecting a tab is a heavy action.
   */
  activation?: TabActivation;
  /** How available strip width is allocated across child AppTabs. */
  allocation?: TabBarAllocation;
  /** Named strip chrome for application rails, segmented tabs, or inspectors. */
  presentation?: TabBarPresentation;
  /** Keep a trailing action beside the final tab or at the far edge of the bar. */
  trailingPlacement?: TabBarTrailingPlacement;
}

/** Render a controlled tab strip. The application owns selection, order, and persistence. */
export function TabBar({
  id,
  label,
  children,
  leading,
  trailing,
  className = '',
  activation,
  allocation = 'intrinsic',
  presentation = 'rail',
  trailingPlacement = 'separate',
}: TabBarProps) {
  return (
    <nav
      class={`kui-tab-bar ${className}`.trim()}
      data-component="tab-bar"
      data-tab-bar-id={id}
      data-tab-activation={activation}
      data-allocation={allocation}
      data-presentation={presentation}
      data-trailing-placement={trailingPlacement}
      aria-label={label}
    >
      {leading && <div class="kui-tab-bar__leading">{leading}</div>}
      <div
        class="kui-tab-bar__tabs"
        role="tablist"
        aria-label={label}
        data-kui-tab-list
      >
        {children}
      </div>
      {trailing && <div class="kui-tab-bar__trailing">{trailing}</div>}
    </nav>
  );
}
