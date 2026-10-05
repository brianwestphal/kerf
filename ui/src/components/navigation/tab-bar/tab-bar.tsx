import type { KerfUiContent } from '../../../shared/content/semantic-content.js';

export type TabActivation = 'automatic' | 'manual';
export type TabBarAllocation = 'intrinsic' | 'fill';
export type TabBarPresentation = 'rail' | 'segmented' | 'inspector';
export type TabBarTrailingPlacement = 'separate' | 'adjacent';
/** Tablist width where segmented AppTabs switch to icon-only. */
export type TabBarIconOnlyAt = 'wide' | 'narrow' | 'compact';

export interface TabBarProps {
  id: string;
  label: string;
  children: KerfUiContent;
  leading?: KerfUiContent;
  /** Tab-local action: a ToolbarControlGroup or a standalone Web Awesome button. */
  trailing?: KerfUiContent;
  /**
   * Action pinned to the far edge of the bar. Combine with an adjacent `trailing`
   * action when the tab-local and workspace-level actions must remain distinct.
   * Accepts a ToolbarControlGroup or a standalone Web Awesome button.
   */
  end?: KerfUiContent;
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
  /** Switch segmented AppTabs to icon-only at tablist widths of 832, 704, or 448px. Each tab needs a leading icon. */
  iconOnlyAt?: TabBarIconOnlyAt;
  /** Keep a trailing action beside the final tab or at the far edge of the bar. */
  trailingPlacement?: TabBarTrailingPlacement;
  /** Settle scrolling peers at whole-tab starts; wireTabBars measures a pinned leading tab's inset. */
  snapTabs?: boolean;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** Render a controlled tab strip. The application owns selection, order, and persistence. */
export function TabBar({
  id,
  label,
  children,
  leading,
  trailing,
  end,
  className = '',
  activation,
  allocation = 'intrinsic',
  presentation = 'rail',
  iconOnlyAt,
  trailingPlacement = 'separate',
  snapTabs = false,
  slot,
}: TabBarProps) {
  return (
    <nav
      class={`kui-tab-bar ${className}`.trim()}
      data-component="tab-bar"
      data-tab-bar-id={id}
      data-tab-activation={activation}
      data-allocation={allocation}
      data-presentation={presentation}
      data-icon-only-at={iconOnlyAt}
      data-trailing-placement={trailingPlacement}
      aria-label={label}
      slot={slot}
    >
      {leading && <div class="kui-tab-bar__leading">{leading}</div>}
      <div
        class="kui-tab-bar__tabs"
        role="tablist"
        aria-label={label}
        data-kui-tab-list
        data-snap-tabs={snapTabs ? 'true' : undefined}
      >
        {children}
      </div>
      {trailing && <div class="kui-tab-bar__trailing">{trailing}</div>}
      {end && <div class="kui-tab-bar__end">{end}</div>}
    </nav>
  );
}
