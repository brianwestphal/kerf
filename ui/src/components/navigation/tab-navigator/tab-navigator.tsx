import type { SafeHtml } from 'kerfjs';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import type { ScrollEdge } from '../../../shared/layout/scroll-edge.js';
import type { CssColor } from '../../../shared/styles/css-values.js';
import { ensureSunkenTexture } from '../../../shared/styles/sunken-texture.js';
import {
  joinStyles,
  type SurfaceTint,
  surfaceTintAttributes,
} from '../../../shared/styles/surface-tint.js';
import { Badge } from '../../feedback/badge/badge.js';
import type { PaneAppearance } from '../../layout/pane/pane.js';

interface TabNavigatorTabBase<Id extends string> {
  id: Id;
  label: string;
  /** Decorative icon shown above the label in the bottom bar. */
  icon?: SafeHtml;
  /** The tab's content — typically a `NavStack` so each tab keeps its own stack. */
  content: KerfUiContent;
  /** Background of this scene's scrolling work surface. */
  appearance?: PaneAppearance;
  /**
   * Paint this scene in an app-chosen color (a `@kerfjs/ui/css-values` color
   * builder). It replaces the appearance's fill. Forced colors paint `Canvas`.
   */
  background?: CssColor;
  /**
   * A scoped tint (`{ color, scheme }`) for this scene: its surfaces and every
   * descendant re-derive their surface and text tokens from the app's color
   * in the declared scheme, with lightness clamped to keep text at WCAG AA.
   */
  tint?: SurfaceTint;
  /** Add 8px to every side of a plain scene's scrolling content. */
  deepInset?: boolean;
  /** Opt into keyboard (`0`) or programmatic (`-1`) focus on this scene. */
  tabIndex?: 0 | -1;
  /** Keep the standard focus outline visible while this scene is active. */
  outlined?: boolean;
}

/** A tab with an optional count or short-status badge. */
interface TabNavigatorTabCountBadge {
  /**
   * Optional count or short status shown as a solid danger `Badge` at the
   * top-trailing corner of the tab icon (the iOS tab-bar badge). Omitted, `''`,
   * or non-finite numbers render no badge. The visual badge is `aria-hidden`;
   * its meaning reaches assistive technology through `badgeLabel`.
   *
   * Pass `true` instead for the text-free dot (new content without a count).
   */
  badge?: string | number;
  /**
   * Localized phrase folded into the tab's accessible name as
   * `"<label>, <badgeLabel>"` (for example `"3 unread"` → `"Inbox, 3 unread"`).
   * Defaults to the badge text itself. Ignored when no badge renders.
   */
  badgeLabel?: string;
}

/** A tab with the text-free dot badge (new content without a count). */
interface TabNavigatorTabDotBadge {
  /**
   * `true` shows a solid danger dot `Badge` at the top-trailing corner of the
   * tab icon — the iOS tab-bar dot for new content without a count.
   */
  badge: true;
  /**
   * Required localized phrase folded into the tab's accessible name as
   * `"<label>, <badgeLabel>"` (for example `"New activity"` →
   * `"Feed, New activity"`). A dot has no text, so this is its only meaning.
   */
  badgeLabel: string;
}

/** One bottom-bar destination: its label, optional icon and badge, and content. */
export type TabNavigatorTab<Id extends string = string> =
  TabNavigatorTabBase<Id> &
    (TabNavigatorTabCountBadge | TabNavigatorTabDotBadge);

/**
 * How a {@link TabNavigator}'s tab bar relates to the active scene: `docked`
 * below it, or `overlay` laid over its bottom edge on the translucent chrome
 * material, so the scene's content scrolls visibly beneath the bar.
 * `clear` lays it over
 * the same edge fully transparent, for chrome over imagery: legibility comes
 * from glass control groups or a scrim, and with `scrollEdge="material"` the
 * chrome material fades in once content scrolls beneath
 * it, until the scene scrolls to its end.
 */
export type TabNavigatorBarPresentation = 'docked' | 'overlay' | 'clear';

export interface TabNavigatorProps<Id extends string = string> {
  id: string;
  /** Accessible name for the tab bar. */
  label: string;
  tabs: readonly TabNavigatorTab<Id>[];
  /** The controlled active tab id (the app owns selection). */
  active: NoInfer<Id>;
  /**
   * The bar's top separator. `auto` (default) draws it against a sunken active
   * work surface and otherwise follows `chromeDividers`; `hidden` suppresses
   * the line, including a scroll divider.
   */
  separator?: 'auto' | 'hidden';
  /**
   * The line over the tab bar, where it meets the active scene. `scroll`
   * (default) shows it only while more of the scene's content lies below —
   * never at the scroll end or when the content fits — once
   * `wireScrollDividers` (`@kerfjs/ui/wire-scroll-dividers`) is wired above
   * the scaffold; unwired, it does not show. `always` shows it without the
   * wiring; `none` suppresses that scroll divider. A sunken active work
   * surface still draws the separator unless `separator="hidden"`. The line
   * is the bar's own 1px top border, so no state moves the bar or a tab.
   */
  chromeDividers?: 'scroll' | 'always' | 'none';
  /**
   * `docked` (default) gives the tab bar its own band below the scenes.
   * `overlay` lays it over the active scene's bottom edge on the translucent
   * chrome material (opaque under reduced transparency, increased contrast,
   * or without `backdrop-filter`; `Canvas` in forced colors), so content
   * scrolls visibly beneath it, as under an iOS tab bar. `wireTabNavigator`
   * measures the live bar (bottom safe area included) and the scenes hand
   * its height to their content as the block-end `--kui-edge-inset-*`
   * context, so a plain scene, a sole `Pane`, or a `NavStack` (and its own
   * bottom toolbar, which then sits above the bar) rests its last item clear
   * of it. Until then it stays docked. Unselected tab labels lift halfway
   * toward the normal text color to keep AA over the content beneath.
   */
  barPresentation?: TabNavigatorBarPresentation;
  /**
   * With `barPresentation="clear"`, `material` fades the chrome material in
   * behind the bar while the active scene continues beneath it (default
   * `none`).
   */
  scrollEdge?: ScrollEdge;
  /**
   * Paint the navigator, and its docked tab bar, in an app-chosen color (a
   * `@kerfjs/ui/css-values` color builder) instead of the surface. A tab's own
   * `background` paints its scene. Forced colors paint `Canvas`.
   */
  background?: CssColor;
  /**
   * A scoped tint (`{ color, scheme }`) for the navigator, its bar, and every scene: its surfaces and every
   * descendant re-derive their surface and text tokens from the app's color
   * in the declared scheme, with lightness clamped to keep text at WCAG AA.
   */
  tint?: SurfaceTint;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A mobile-first, iOS-like bottom tab navigator: a bottom tab bar that switches
 * between major sections, each tab keeping its own content (usually a `NavStack`)
 * mounted so its stack and scroll survive a switch. Controlled — the app owns
 * `active`; wire selection with `@kerfjs/ui/wire-tab-navigator`'s `wireTabNavigator`.
 * On larger classes, promote the tabs to a `Workbench` rail or sidebar instead of
 * a bottom bar. See `docs/23-app-layouts.md` §3.4.
 */
export function TabNavigator<Id extends string>({
  id,
  label,
  tabs,
  active,
  separator = 'auto',
  chromeDividers = 'scroll',
  barPresentation = 'docked',
  scrollEdge = 'none',
  background,
  tint,
  className = '',
  slot,
}: TabNavigatorProps<Id>) {
  const tinted = surfaceTintAttributes(tint);
  if (
    tabs.some(
      (tab) => tab.appearance === 'sunken' && tab.background === undefined,
    )
  )
    ensureSunkenTexture();
  return (
    <section
      class={`kui-tab-scaffold ${tinted.className} ${className}`
        .replace(/\s+/g, ' ')
        .trim()}
      id={id}
      data-component="tab-scaffold"
      data-tab-scaffold-id={id}
      data-separator={separator}
      data-chrome-dividers={
        chromeDividers === 'always' || chromeDividers === 'none'
          ? chromeDividers
          : undefined
      }
      data-bar-presentation={
        barPresentation !== 'docked' ? 'overlay' : undefined
      }
      data-bar-material={barPresentation === 'clear' ? 'clear' : undefined}
      data-scroll-edge={
        barPresentation === 'clear' && scrollEdge === 'material'
          ? 'material'
          : undefined
      }
      data-background={background === undefined ? undefined : ''}
      data-kui-tint={tinted['data-kui-tint']}
      data-kui-tint-accent={tinted['data-kui-tint-accent']}
      style={joinStyles(
        background === undefined
          ? undefined
          : `--_kui-tab-scaffold-background:${background}`,
        tinted.style,
      )}
      slot={slot}
    >
      <div class="kui-tab-scaffold__scenes">
        {tabs.map((tab) => (
          <div
            class={`kui-tab-scaffold__scene ${surfaceTintAttributes(tab.tint).className}`.trim()}
            data-tab-scaffold-scene={tab.id}
            data-active={String(tab.id === active)}
            data-appearance={
              tab.appearance === 'sunken' && tab.background === undefined
                ? 'sunken'
                : undefined
            }
            data-background={tab.background === undefined ? undefined : ''}
            data-kui-tint={surfaceTintAttributes(tab.tint)['data-kui-tint']}
            data-kui-tint-accent={
              surfaceTintAttributes(tab.tint)['data-kui-tint-accent']
            }
            style={joinStyles(
              tab.background === undefined
                ? undefined
                : `--_kui-tab-scaffold-scene-background:${tab.background}`,
              surfaceTintAttributes(tab.tint).style,
            )}
            data-deep-inset={tab.deepInset ? 'true' : undefined}
            data-outlined={
              tab.id === active && tab.outlined ? 'true' : undefined
            }
            role={tab.tabIndex === undefined ? undefined : 'tabpanel'}
            aria-label={tab.tabIndex === undefined ? undefined : tab.label}
            aria-hidden={String(tab.id !== active)}
            tabindex={
              tab.id === active
                ? tab.tabIndex
                : tab.tabIndex === undefined
                  ? undefined
                  : -1
            }
          >
            {tab.content}
          </div>
        ))}
      </div>
      <nav class="kui-tab-scaffold__bar" role="tablist" aria-label={label}>
        {tabs.map((tab) => {
          const dot = tab.badge === true;
          const badgeText = dot ? undefined : normalizeBadge(tab.badge);
          const hasBadge = dot || badgeText !== undefined;
          const badge = hasBadge && (
            <span
              class="kui-tab-scaffold__tab-badge"
              data-badge-kind={dot ? 'dot' : 'text'}
            >
              {badgeText === undefined ? (
                <Badge tone="danger" size="dot" ariaHidden />
              ) : (
                <Badge
                  tone="danger"
                  appearance="solid"
                  size="compact"
                  ariaHidden
                >
                  {badgeText}
                </Badge>
              )}
            </span>
          );
          // A dot has no text fallback: without a usable badgeLabel (reachable
          // only from untyped callers) the tab keeps its plain accessible name.
          const badgeLabel = hasBadge
            ? tab.badgeLabel?.trim() || badgeText
            : undefined;
          return (
            <button
              type="button"
              class="kui-tab-scaffold__tab"
              role="tab"
              data-tab-scaffold-tab={tab.id}
              aria-selected={String(tab.id === active)}
              tabindex={tab.id === active ? '0' : '-1'}
              aria-label={
                badgeLabel === undefined
                  ? undefined
                  : `${tab.label}, ${badgeLabel}`
              }
              data-has-badge={hasBadge ? 'true' : undefined}
            >
              {tab.icon ? (
                <span class="kui-tab-scaffold__tab-icon" aria-hidden="true">
                  {tab.icon}
                  {badge}
                </span>
              ) : (
                badge
              )}
              <span class="kui-tab-scaffold__tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </section>
  );
}

function normalizeBadge(
  badge: string | number | undefined,
): string | undefined {
  if (typeof badge === 'number')
    return Number.isFinite(badge) ? String(badge) : undefined;
  if (typeof badge === 'string' && badge.trim()) return badge.trim();
  return undefined;
}
