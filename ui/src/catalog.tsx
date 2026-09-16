import type { SafeHtml } from 'kerfjs';
import { ExternalLink, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide';

import { LucideIcon } from './lucide-icon.js';
import { MenuHeader } from './menu-header.js';
import { MenuItem } from './menu-item.js';
import { Select } from './select.js';
import { Toolbar } from './toolbar.js';
import { ToolbarControlGroup } from './toolbar-control-group.js';

/** A reference link shown in the detail footer for the active entry. */
export interface CatalogResource {
  label: string;
  href: string;
  /** Optional monospace detail (e.g. a file path) shown after the label. */
  detail?: string;
}

/** A related entry offered in the detail footer's "Related" selector. */
export interface CatalogRelated {
  id: string;
  name: string;
  /** Group heading in the selector, e.g. "Uses" / "Used by". */
  group: string;
}

export interface CatalogEntry {
  id: string;
  name: string;
  description?: string;
  resources?: readonly CatalogResource[];
  related?: readonly CatalogRelated[];
}

export interface CatalogSection {
  category: string;
  entries: readonly CatalogEntry[];
}

export interface CatalogBrand {
  title: string;
  subtitle?: string;
  /** Logo image URL (rendered decorative). Omit for a text-only brand. */
  logoUrl?: string;
}

export interface CatalogProps {
  brand: CatalogBrand;
  sections: readonly CatalogSection[];
  /** The controlled active entry id — the app owns this signal. */
  active: string;
  /** The rendered preview for the active entry; the app computes it from `active`. */
  content: SafeHtml;
  /** Whether the sidebar is collapsed (controlled). */
  collapsed?: boolean;
  /** Current theme; when set, a theme toggle is shown that switches to the opposite. Omit to hide it. */
  theme?: 'light' | 'dark';
  /** Extra header controls placed before the theme toggle (each a `ToolbarControlGroup`). */
  headerActions?: SafeHtml;
  /** Extra sidebar content below the category groups (e.g. an ecosystem section). */
  sidebarFooter?: SafeHtml;
  /** Status line content shown at the start of the detail footer. */
  status?: SafeHtml;
  selectAction?: string;
  toggleSidebarAction?: string;
  toggleThemeAction?: string;
  className?: string;
}

function findEntry(sections: readonly CatalogSection[], id: string): CatalogEntry | undefined {
  for (const section of sections) {
    for (const entry of section.entries) if (entry.id === id) return entry;
  }
  return undefined;
}

/**
 * A reusable component-catalog shell: a collapsible category sidebar, a titled
 * detail stage that renders the active entry's preview, and a footer with
 * reference links and a related-entry selector. Built entirely from public
 * `@kerfjs/ui` primitives. Controlled and stateless — the app owns the `active`,
 * `collapsed`, and `theme` signals and computes `content` from `active` in its own
 * render; wire the sidebar/collapse/theme actions with `wireCatalog`.
 */
export function Catalog({
  brand,
  sections,
  active,
  content,
  collapsed = false,
  theme,
  headerActions,
  sidebarFooter,
  status,
  selectAction = 'catalog-select',
  toggleSidebarAction = 'catalog-toggle-sidebar',
  toggleThemeAction = 'catalog-toggle-theme',
  className = '',
}: CatalogProps) {
  const selected = findEntry(sections, active);
  const name = selected?.name ?? '';
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const resources = selected?.resources ?? [];
  const related = selected?.related ?? [];

  return <main class={`kui-catalog ${className}`.trim()} data-component="catalog" data-sidebar-collapsed={String(collapsed)}>
    <aside class="kui-catalog__sidebar kui-pane" aria-label={`${brand.title} catalog`}>
      <header class="kui-catalog__brand kui-pane__toolbar">
        <Toolbar
          label={`${brand.title} catalog header`}
          divider={false}
          leading={<ToolbarControlGroup appearance="borderless" className="kui-catalog__identity">{brand.logoUrl ? <img class="kui-catalog__mark" src={brand.logoUrl} alt="" /> : <></>}<h1>{brand.title}</h1></ToolbarControlGroup>}
          trailing={<ToolbarControlGroup appearance="borderless" single><button type="button" data-action={toggleSidebarAction} aria-label={`Collapse ${brand.title} catalog`}><LucideIcon icon={PanelLeftClose} name="panel-left-close" /></button></ToolbarControlGroup>}
        />
        {brand.subtitle ? <p class="kui-catalog__subtitle">{brand.subtitle}</p> : <></>}
      </header>
      <nav class="kui-pane__content kui-content" aria-label={`${brand.title} components`}>
        {sections.map((section) => <section class="kui-catalog__group">
          <MenuHeader label={section.category} />
          <div class="kui-catalog__items">
            {section.entries.map((entry) => <MenuItem action={selectAction} itemId={entry.id} label={entry.name} selected={active === entry.id} title={entry.description} multiline />)}
          </div>
        </section>)}
        {sidebarFooter}
      </nav>
    </aside>
    <article class="kui-catalog__detail kui-pane">
      <header class="kui-catalog__header kui-pane__toolbar">
        <Toolbar
          label={`${name} header`}
          divider={false}
          leading={<>{collapsed ? <ToolbarControlGroup appearance="borderless" single><button type="button" data-action={toggleSidebarAction} aria-label={`Expand ${brand.title} catalog`}><LucideIcon icon={PanelLeftOpen} name="panel-left-open" /></button></ToolbarControlGroup> : <></>}<ToolbarControlGroup appearance="borderless" className="kui-catalog__title"><h2>{name}</h2></ToolbarControlGroup></>}
          trailing={<div class="kui-catalog__header-actions">{headerActions}{theme ? <ToolbarControlGroup className="kui-catalog__settings" label="Catalog display"><button type="button" data-action={toggleThemeAction} aria-label={`Use ${nextTheme} theme`} data-theme-preview={theme}>{nextTheme === 'dark' ? <LucideIcon icon={Moon} name="moon" /> : <LucideIcon icon={Sun} name="sun" />}<span>{nextTheme === 'dark' ? 'Dark' : 'Light'}</span></button></ToolbarControlGroup> : <></>}</div>}
        />
        {selected?.description ? <p class="kui-catalog__description kui-content-item">{selected.description}</p> : <></>}
      </header>
      <section class="kui-catalog__stage kui-pane__content" aria-label={`${name} preview`}>
        <div class="kui-catalog__canvas">{content}</div>
      </section>
      <footer class="kui-catalog__footer kui-pane__footer">
        {status ? <div class="kui-catalog__status">{status}</div> : <></>}
        <Toolbar
          label={`${name} resources`}
          divider={false}
          leading={resources.length > 0
            ? <nav class="kui-catalog__resources" aria-label={`${name} resources`}><ToolbarControlGroup className="kui-catalog__resource-group" label={`${name} resources`}>{resources.map((resource) => <a class="kui-catalog__resource" href={resource.href} target="_blank" rel="noopener noreferrer" aria-label={`${name}: ${resource.label} (opens in new tab)`}><LucideIcon icon={ExternalLink} name="external-link" /><span>{resource.label}</span>{resource.detail ? <code>{resource.detail}</code> : <></>}</a>)}</ToolbarControlGroup></nav>
            : <></>}
          trailing={related.length > 0
            ? <div class="kui-catalog__related" data-catalog-related><ToolbarControlGroup className="kui-catalog__related-group" label="Related entries"><Select className="kui-catalog__related-select" name="catalog-related" value="" label="Related entries" placeholderText="Related entries" choices={related.map((entry) => ({ value: entry.id, label: entry.name, group: entry.group }))} /></ToolbarControlGroup></div>
            : <></>}
        />
      </footer>
    </article>
  </main>;
}
