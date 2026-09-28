import type { SafeHtml } from 'kerfjs';

import { Badge } from './badge.js';
import type { KerfUiContent } from './semantic-content.js';

export interface TabScaffoldTab<Id extends string = string> {
  id: Id;
  label: string;
  /** Decorative icon shown above the label in the bottom bar. */
  icon?: SafeHtml;
  /**
   * Optional count or short status shown as a solid danger `Badge` at the
   * top-trailing corner of the tab icon (the iOS tab-bar badge). Omitted, `''`,
   * or non-finite numbers render no badge. The visual badge is `aria-hidden`;
   * its meaning reaches assistive technology through `badgeLabel`.
   */
  badge?: string | number;
  /**
   * Localized phrase folded into the tab's accessible name as
   * `"<label>, <badgeLabel>"` (for example `"3 unread"` → `"Inbox, 3 unread"`).
   * Defaults to the badge text itself. Ignored when no badge renders.
   */
  badgeLabel?: string;
  /** The tab's content — typically a `NavStack` so each tab keeps its own stack. */
  content: KerfUiContent;
}

export interface TabScaffoldProps<Id extends string = string> {
  id: string;
  /** Accessible name for the tab bar. */
  label: string;
  tabs: readonly TabScaffoldTab<Id>[];
  /** The controlled active tab id (the app owns selection). */
  active: NoInfer<Id>;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A mobile-first, iOS-like bottom tab scaffold: a bottom tab bar that switches
 * between major sections, each tab keeping its own content (usually a `NavStack`)
 * mounted so its stack and scroll survive a switch. Controlled — the app owns
 * `active`; wire selection with `@kerfjs/ui/wire-tab-scaffold`'s `wireTabScaffold`.
 * On larger classes, promote the tabs to a `Workbench` rail or sidebar instead of
 * a bottom bar. See `docs/23-app-layouts.md` §3.4.
 */
export function TabScaffold<Id extends string>({
  id,
  label,
  tabs,
  active,
  className = '',
  slot,
}: TabScaffoldProps<Id>) {
  return (
    <section
      class={`kui-tab-scaffold ${className}`.trim()}
      id={id}
      data-component="tab-scaffold"
      data-tab-scaffold-id={id}
      slot={slot}
    >
      <div class="kui-tab-scaffold__scenes">
        {tabs.map((tab) => (
          <div
            class="kui-tab-scaffold__scene"
            data-tab-scaffold-scene={tab.id}
            data-active={String(tab.id === active)}
            aria-hidden={String(tab.id !== active)}
          >
            {tab.content}
          </div>
        ))}
      </div>
      <nav class="kui-tab-scaffold__bar" role="tablist" aria-label={label}>
        {tabs.map((tab) => {
          const badgeText = normalizeBadge(tab.badge);
          const badge = badgeText !== undefined && (
            <span class="kui-tab-scaffold__tab-badge">
              <Badge tone="danger" appearance="solid" size="compact" ariaHidden>
                {badgeText}
              </Badge>
            </span>
          );
          const badgeLabel =
            badgeText === undefined
              ? undefined
              : tab.badgeLabel?.trim() || badgeText;
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
              data-has-badge={badgeText === undefined ? undefined : 'true'}
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
