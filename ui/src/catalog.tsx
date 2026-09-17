import type { SafeHtml } from 'kerfjs';
import { ExternalLink, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide';

import { ListHeader } from './list-header.js';
import { ListItem } from './list-item.js';
import { LucideIcon } from './lucide-icon.js';
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

/**
 * A secondary group of sections shown below the primary sidebar sections with a
 * quieter "ecosystem" treatment (e.g. third-party components). Optionally
 * collapsible — the app owns `expanded` and toggles it from `wireCatalog`'s
 * `onToggleSecondary`.
 */
export interface CatalogSecondaryGroup {
  label: string;
  sections: readonly CatalogSection[];
  /** When true, the group's label is a disclosure toggle controlling `expanded`. */
  collapsible?: boolean;
  /** Whether the group is expanded (controlled). Ignored unless `collapsible`. */
  expanded?: boolean;
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
  /** A secondary "ecosystem" group of sections below the primary category groups. */
  secondarySections?: CatalogSecondaryGroup;
  /** Extra sidebar content below the category groups (and the secondary group). */
  sidebarFooter?: SafeHtml;
  /** Status line content shown at the start of the detail footer. */
  status?: SafeHtml;
  selectAction?: string;
  toggleSidebarAction?: string;
  toggleThemeAction?: string;
  /** Action fired by the secondary group's disclosure toggle (when collapsible). */
  toggleSecondaryAction?: string;
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
  secondarySections,
  sidebarFooter,
  status,
  selectAction = 'catalog-select',
  toggleSidebarAction = 'catalog-toggle-sidebar',
  toggleThemeAction = 'catalog-toggle-theme',
  toggleSecondaryAction = 'catalog-toggle-secondary',
  className = '',
}: CatalogProps) {
  const selected = findEntry(sections, active) ?? (secondarySections ? findEntry(secondarySections.sections, active) : undefined);
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
          <ListHeader label={section.category} />
          <div class="kui-catalog__items">
            {section.entries.map((entry) => <ListItem action={selectAction} itemId={entry.id} label={entry.name} selected={active === entry.id} title={entry.description} multiline />)}
          </div>
        </section>)}
        {secondarySections ? <section class="kui-catalog__group kui-catalog__group--secondary">
          <ListHeader label={secondarySections.label} toggle={secondarySections.collapsible} expanded={secondarySections.collapsible ? Boolean(secondarySections.expanded) : undefined} action={secondarySections.collapsible ? toggleSecondaryAction : undefined} />
          {!secondarySections.collapsible || secondarySections.expanded
            ? <div class="kui-catalog__secondary" data-catalog-secondary>
              {secondarySections.sections.map((section) => <section class="kui-catalog__secondary-group">
                <h3 class="kui-catalog__secondary-heading">{section.category}</h3>
                <div class="kui-catalog__items">
                  {section.entries.map((entry) => <ListItem action={selectAction} itemId={entry.id} label={entry.name} selected={active === entry.id} title={entry.description} multiline />)}
                </div>
              </section>)}
            </div>
            : <></>}
        </section> : <></>}
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

/**
 * How a {@link CatalogExample}'s content aligns its visible left edge with the
 * example's `ListHeader` label (which sits 16px in — 8px title + 8px label):
 * - `'glyph'` — a bare glyph/text specimen with no inline geometry insets the full 16px.
 * - `'inline-control'` — a control that already carries ~8px of its own inline padding insets 8px so its content lands on the same line.
 * - `'none'` — a content-item / composition that owns its geometry and already aligns; no inset (default).
 */
export type CatalogExampleAlign = 'glyph' | 'inline-control' | 'none';

export interface CatalogExampleProps {
  /** The example's label, shown as a `ListHeader` above the specimen. */
  label: string;
  /** Optional explanatory note between the label and the specimen. */
  note?: SafeHtml | string;
  /** Alignment inset for the specimen — see {@link CatalogExampleAlign}. Default `'none'`. */
  align?: CatalogExampleAlign;
  className?: string;
  children?: SafeHtml | readonly SafeHtml[];
}

/**
 * One labeled example in a catalog preview: a `ListHeader` label, an optional
 * note, and the specimen. `align` insets the specimen so its visible left edge
 * lines up with the label text, encoding the catalog's alignment rules as a
 * first-class prop instead of per-demo CSS. The inset is published as the
 * `--kui-catalog-example-align` custom property so a debug overlay can exclude it
 * from a specimen's measured margin.
 */
export function CatalogExample({ label, note, align = 'none', className = '', children }: CatalogExampleProps) {
  return <section class={`kui-catalog-example ${className}`.trim()} data-catalog-example data-align={align}>
    <ListHeader label={label} />
    {note !== undefined ? <p class="kui-catalog-example__note">{note}</p> : <></>}
    {children}
  </section>;
}

export interface CatalogExampleStackProps {
  /** Accessible label for the stack region. */
  label?: string;
  className?: string;
  children?: SafeHtml | readonly SafeHtml[];
}

/** A vertically-stacked group of {@link CatalogExample}s with the catalog's example rhythm. */
export function CatalogExampleStack({ label, className = '', children }: CatalogExampleStackProps) {
  return <div class={`kui-catalog-example-stack ${className}`.trim()} data-catalog-example-stack aria-label={label}>{children}</div>;
}
