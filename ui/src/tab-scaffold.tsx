import type { SafeHtml } from 'kerfjs';

export interface TabScaffoldTab {
  id: string;
  label: string;
  /** Decorative icon shown above the label in the bottom bar. */
  icon?: SafeHtml;
  /** The tab's content — typically a `NavStack` so each tab keeps its own stack. */
  content: SafeHtml;
}

export interface TabScaffoldProps {
  id: string;
  /** Accessible name for the tab bar. */
  label: string;
  tabs: TabScaffoldTab[];
  /** The controlled active tab id (the app owns selection). */
  active: string;
  className?: string;
}

/**
 * A mobile-first, iOS-like bottom tab scaffold: a bottom tab bar that switches
 * between major sections, each tab keeping its own content (usually a `NavStack`)
 * mounted so its stack and scroll survive a switch. Controlled — the app owns
 * `active`; wire selection with `@kerfjs/ui/wire-tab-scaffold`'s `wireTabScaffold`.
 * On larger classes, promote the tabs to a `Workbench` rail or sidebar instead of
 * a bottom bar. See `docs/23-app-layouts.md` §3.4.
 */
export function TabScaffold({ id, label, tabs, active, className = '' }: TabScaffoldProps) {
  return <section class={`kui-tab-scaffold ${className}`.trim()} id={id} data-component="tab-scaffold" data-tab-scaffold-id={id}>
    <div class="kui-tab-scaffold__scenes">
      {tabs.map((tab) => <div class="kui-tab-scaffold__scene" data-tab-scaffold-scene={tab.id} data-active={String(tab.id === active)} aria-hidden={String(tab.id !== active)}>{tab.content}</div>)}
    </div>
    <nav class="kui-tab-scaffold__bar" role="tablist" aria-label={label}>
      {tabs.map((tab) => <button type="button" class="kui-tab-scaffold__tab" role="tab" data-tab-scaffold-tab={tab.id} aria-selected={String(tab.id === active)} tabindex={tab.id === active ? '0' : '-1'}>
        {tab.icon && <span class="kui-tab-scaffold__tab-icon" aria-hidden="true">{tab.icon}</span>}
        <span class="kui-tab-scaffold__tab-label">{tab.label}</span>
      </button>)}
    </nav>
  </section>;
}
