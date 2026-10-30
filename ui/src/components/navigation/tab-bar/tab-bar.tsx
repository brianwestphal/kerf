import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';

export type TabActivation = 'automatic' | 'manual';
export type TabBarAllocation = 'intrinsic' | 'fill';
export type TabBarPresentation = 'rail' | 'segmented' | 'inspector';

/** A segmented strip's outline: a pill track, or the shared control radius. */
export type TabBarShape = 'pill' | 'rounded';
export type TabBarTrailingPlacement = 'separate' | 'adjacent';
/** Tablist width where segmented TabBarItems switch to icon-only. */
export type TabBarIconOnlyAt = 'wide' | 'narrow' | 'compact';

export interface TabBarProps {
  id: string;
  label: string;
  children: KerfUiContent;
  leading?: KerfUiContent;
  /** Tab-local action: one ToolbarControlGroup, Kerf Button, or Web Awesome button. */
  trailing?: KerfUiContent;
  /**
   * Action pinned to the far edge of the bar. Combine with an adjacent `trailing`
   * action when the tab-local and workspace-level actions must remain distinct.
   * Accepts one ToolbarControlGroup, Kerf Button, or Web Awesome button.
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
  /** How available strip width is allocated across child TabBarItems. */
  allocation?: TabBarAllocation;
  /** Named strip chrome for application rails, segmented tabs, or inspectors. */
  presentation?: TabBarPresentation;
  /**
   * A segmented strip's shape: `pill` (default), a pill track whose outer
   * tabs follow its ends, or `rounded`, a track at the shared control radius
   * (a field's or Button's) whose every tab is concentric with it, as in a
   * narrow sidebar. Other presentations ignore it.
   */
  shape?: TabBarShape;
  /** Switch segmented TabBarItems to icon-only at tablist widths of 832, 704, or 448px. Each tab needs a leading icon. */
  iconOnlyAt?: TabBarIconOnlyAt;
  /** Keep a trailing action beside the final tab or at the far edge of the bar. */
  trailingPlacement?: TabBarTrailingPlacement;
  /** Settle scrolling peers at whole-tab starts; the first visible tab aligns with the strip edge. */
  snapTabs?: boolean;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const TAB_BAR_PROTECTED = new Set([
  'data-allocation',
  'data-component',
  'data-icon-only-at',
  'data-presentation',
  'data-shape',
  'data-snap-tabs',
  'data-tab-activation',
  'data-tab-bar-id',
  'data-trailing-placement',
]);

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
  shape = 'pill',
  iconOnlyAt,
  trailingPlacement = 'separate',
  snapTabs = false,
  slot,
  rootAttributes = {},
}: TabBarProps) {
  return (
    <nav
      {...filterDataAttributes(rootAttributes, TAB_BAR_PROTECTED)}
      class={`kui-tab-bar ${className}`.trim()}
      data-component="tab-bar"
      data-tab-bar-id={id}
      data-tab-activation={activation}
      data-allocation={allocation}
      data-presentation={presentation}
      data-shape={
        presentation === 'segmented' && shape === 'rounded' ? shape : undefined
      }
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
