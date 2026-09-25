import type { SafeHtml } from 'kerfjs';
import {
  ExternalLink,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Waypoints,
} from 'lucide';

import { filterDataAttributes } from './extension-attributes.js';
import { List } from './list.js';
import { ListHeader } from './list-header.js';
import { ListItem } from './list-item.js';
import { LucideIcon } from './lucide-icon.js';
import { Pane } from './pane.js';
import type { KerfUiContent } from './semantic-content.js';
import { Text } from './text.js';
import { Toolbar } from './toolbar.js';
import { ToolbarControlGroup } from './toolbar-control-group.js';
import { ToolbarText } from './toolbar-text.js';

/** A reference link shown in the detail footer for the active entry. */
export interface CatalogResource {
  label: string;
  href: string;
  /** Optional monospace detail (e.g. a file path) shown after the label. */
  detail?: string;
}

/** A related entry offered in the detail footer's "Related entries" popup menu. */
export interface CatalogRelated {
  id: string;
  name: string;
  /** Group heading in the menu, e.g. "Uses" / "Used by". */
  group: string;
}

export interface CatalogEntry {
  id: string;
  name: string;
  description?: string;
  /** Short metadata tags shown at the trailing edge of the sidebar row. */
  tags?: readonly string[];
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
  content: KerfUiContent;
  /** Whether the sidebar is collapsed (controlled). */
  collapsed?: boolean;
  /** Current theme; when set, a theme toggle is shown that switches to the opposite. Omit to hide it. */
  theme?: 'light' | 'dark';
  /** Extra header controls placed before the theme toggle (each a `ToolbarControlGroup`). */
  headerActions?: KerfUiContent;
  /** A secondary "ecosystem" group of sections below the primary category groups. */
  secondarySections?: CatalogSecondaryGroup;
  /** Extra sidebar content below the category groups (and the secondary group). */
  sidebarFooter?: KerfUiContent;
  /** Status line content shown at the start of the detail footer. */
  status?: KerfUiContent;
  /**
   * Whether to highlight specimens' computed borders (or transparent outer
   * bounds) and non-zero margins. Pass a boolean (rather than omitting the
   * prop) when the active entry can switch between component and composition
   * previews; `wireCatalogGeometryOverlay` keeps the overlay synchronized.
   */
  geometryOverlay?: boolean;
  selectAction?: string;
  toggleSidebarAction?: string;
  toggleThemeAction?: string;
  /** Action fired by the secondary group's disclosure toggle (when collapsible). */
  toggleSecondaryAction?: string;
  className?: string;
}

function findEntry(
  sections: readonly CatalogSection[],
  id: string,
): CatalogEntry | undefined {
  for (const section of sections) {
    for (const entry of section.entries) if (entry.id === id) return entry;
  }
  return undefined;
}

/**
 * Render the related entries as a `wa-dropdown` popup-menu body: a heading per
 * `group` (first-seen order) followed by that group's entries, each a navigable
 * item carrying the same `selectAction` the sidebar items use, so a chosen entry
 * routes through the one `wireCatalog` select handler.
 */
function relatedMenuItems(
  related: readonly CatalogRelated[],
  selectAction: string,
): SafeHtml[] {
  const groups: string[] = [];
  for (const entry of related)
    if (!groups.includes(entry.group)) groups.push(entry.group);
  const nodes: SafeHtml[] = [];
  groups.forEach((group, index) => {
    if (index > 0) nodes.push(<wa-divider></wa-divider>);
    nodes.push(<small class="kui-catalog__related-heading">{group}</small>);
    for (const entry of related) {
      if (entry.group === group)
        nodes.push(
          <wa-dropdown-item data-action={selectAction} data-item-id={entry.id}>
            {entry.name}
          </wa-dropdown-item>,
        );
    }
  });
  return nodes;
}

/**
 * A reusable component-catalog shell: a collapsible category sidebar, a titled
 * detail stage that renders the active entry's preview, and a footer with
 * reference links and a related-entry popup menu. Built entirely from public
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
  geometryOverlay,
  selectAction = 'catalog-select',
  toggleSidebarAction = 'catalog-toggle-sidebar',
  toggleThemeAction = 'catalog-toggle-theme',
  toggleSecondaryAction = 'catalog-toggle-secondary',
  className = '',
}: CatalogProps) {
  const selected =
    findEntry(sections, active) ??
    (secondarySections
      ? findEntry(secondarySections.sections, active)
      : undefined);
  const name = selected?.name ?? '';
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const resources = selected?.resources ?? [];
  const related = selected?.related ?? [];

  return (
    <main
      class={`kui-catalog ${className}`.trim()}
      data-component="catalog"
      data-sidebar-collapsed={String(collapsed)}
      data-geometry-overlay={
        geometryOverlay === undefined ? undefined : String(geometryOverlay)
      }
    >
      <Pane
        element="aside"
        className="kui-catalog__sidebar"
        label={`${brand.title} catalog`}
        contentElement="nav"
        contentLabel={`${brand.title} components`}
        separators={['inline-end']}
        headerClassName="kui-catalog__brand"
        header={
          <>
            <Toolbar
              label={`${brand.title} catalog header`}
              dividerSides=""
              leading={
                <>
                  {brand.logoUrl ? (
                    <ToolbarControlGroup appearance="borderless" single>
                      <img
                        class="kui-catalog__mark"
                        src={brand.logoUrl}
                        alt=""
                      />
                    </ToolbarControlGroup>
                  ) : null}
                  <ToolbarText
                    text={brand.title}
                    size="large"
                    headingLevel={1}
                  />
                </>
              }
              trailing={
                <ToolbarControlGroup appearance="borderless" single>
                  <button
                    type="button"
                    data-action={toggleSidebarAction}
                    aria-label={`Collapse ${brand.title} catalog`}
                  >
                    <LucideIcon icon={PanelLeftClose} name="panel-left-close" />
                  </button>
                </ToolbarControlGroup>
              }
            />
            {brand.subtitle ? (
              <Text class="kui-catalog__subtitle" tone="quiet" size="compact">
                {brand.subtitle}
              </Text>
            ) : null}
          </>
        }
      >
        <>
          {sections.map((section) => (
            <section class="kui-catalog__group">
              <ListHeader label={section.category} />
              <List className="kui-catalog__items">
                {section.entries.map((entry) => (
                  <ListItem
                    action={selectAction}
                    itemId={entry.id}
                    label={entry.name}
                    status={entry.tags?.join(' · ')}
                    selected={active === entry.id}
                    title={entry.description}
                    multiline
                  />
                ))}
              </List>
            </section>
          ))}
          {secondarySections ? (
            <section class="kui-catalog__group kui-catalog__group--secondary">
              {secondarySections.collapsible ? (
                <ListHeader
                  label={secondarySections.label}
                  toggle
                  expanded={Boolean(secondarySections.expanded)}
                  action={toggleSecondaryAction}
                />
              ) : (
                <ListHeader label={secondarySections.label} />
              )}
              {!secondarySections.collapsible || secondarySections.expanded ? (
                <div class="kui-catalog__secondary" data-catalog-secondary>
                  {secondarySections.sections.map((section) => (
                    <section class="kui-catalog__secondary-group">
                      <Text variant="h3" class="kui-catalog__secondary-heading">
                        {section.category}
                      </Text>
                      <List className="kui-catalog__items">
                        {section.entries.map((entry) => (
                          <ListItem
                            action={selectAction}
                            itemId={entry.id}
                            label={entry.name}
                            status={entry.tags?.join(' · ')}
                            selected={active === entry.id}
                            title={entry.description}
                            multiline
                          />
                        ))}
                      </List>
                    </section>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
          {sidebarFooter}
        </>
      </Pane>
      <Pane
        element="article"
        className="kui-catalog__detail"
        contentElement="section"
        contentLabel={`${name} preview`}
        contentClassName="kui-catalog__stage"
        headerClassName="kui-catalog__header"
        header={
          <>
            <Toolbar
              label={`${name} header`}
              dividerSides=""
              leading={
                <>
                  {collapsed ? (
                    <ToolbarControlGroup appearance="borderless" single>
                      <button
                        type="button"
                        data-action={toggleSidebarAction}
                        aria-label={`Expand ${brand.title} catalog`}
                      >
                        <LucideIcon
                          icon={PanelLeftOpen}
                          name="panel-left-open"
                        />
                      </button>
                    </ToolbarControlGroup>
                  ) : null}
                  <ToolbarText text={name} size="xlarge" headingLevel={2} />
                </>
              }
              trailing={
                <>
                  {headerActions}
                  {theme ? (
                    <ToolbarControlGroup
                      appearance="borderless"
                      content="mixed"
                      size="compact"
                      label="Catalog display"
                    >
                      <button
                        type="button"
                        data-action={toggleThemeAction}
                        aria-label={`Use ${nextTheme} theme`}
                        data-theme-preview={theme}
                      >
                        {nextTheme === 'dark' ? (
                          <LucideIcon icon={Moon} name="moon" />
                        ) : (
                          <LucideIcon icon={Sun} name="sun" />
                        )}
                        <span>{nextTheme === 'dark' ? 'Dark' : 'Light'}</span>
                      </button>
                    </ToolbarControlGroup>
                  ) : null}
                </>
              }
            />
            {selected?.description ? (
              <Text class="kui-catalog__description kui-content-item">
                {selected.description}
              </Text>
            ) : null}
          </>
        }
        footerClassName="kui-catalog__footer"
        footer={
          <>
            {status ? <div class="kui-catalog__status">{status}</div> : null}
            <Toolbar
              label={`${name} resources`}
              dividerSides=""
              leading={
                resources.length > 0 ? (
                  <ToolbarControlGroup
                    className="kui-catalog__resource-group"
                    label={`${name} resources`}
                    content="mixed"
                    size="compact"
                  >
                    {resources.map((resource) => (
                      <a
                        class="kui-catalog__resource"
                        href={resource.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${name}: ${resource.label} (opens in new tab)`}
                      >
                        <LucideIcon icon={ExternalLink} name="external-link" />
                        <span>{resource.label}</span>
                        {resource.detail ? (
                          <code>{resource.detail}</code>
                        ) : null}
                      </a>
                    ))}
                  </ToolbarControlGroup>
                ) : null
              }
              trailing={
                related.length > 0 ? (
                  <ToolbarControlGroup
                    single
                    content="mixed"
                    nestedDropdown
                    size="compact"
                    label="Related entries"
                  >
                    <wa-dropdown
                      class="kui-catalog__related-menu"
                      placement="top-end"
                      data-key={`kui-catalog-related-${active}`}
                      data-catalog-related
                      data-morph-skip-children
                    >
                      <wa-button slot="trigger" appearance="plain" with-caret>
                        <LucideIcon icon={Waypoints} name="waypoints" />
                        <span>Components</span>
                      </wa-button>
                      {relatedMenuItems(related, selectAction)}
                    </wa-dropdown>
                  </ToolbarControlGroup>
                ) : null
              }
            />
          </>
        }
      >
        <div class="kui-catalog__canvas">
          {content}
          {geometryOverlay !== undefined ? (
            <div
              class="kui-catalog__geometry-overlay"
              data-catalog-geometry-overlay
              data-morph-skip-children
              aria-hidden="true"
            />
          ) : null}
        </div>
      </Pane>
    </main>
  );
}

/**
 * How a {@link CatalogExample}'s content aligns its visible left edge with the
 * example's `ListHeader` label (which sits 16px in — 8px title + 8px label):
 * - `'glyph'` — a bare glyph/text specimen with no inline geometry insets the full 16px.
 * - `'inline-control'` — a control that already carries ~8px of its own inline padding insets 8px so its content lands on the same line.
 * - `'none'` — a content-item / composition that owns its geometry and already aligns; no inset (default).
 */
export type CatalogExampleAlign = 'glyph' | 'inline-control' | 'none';

const catalogExampleProtectedAttributes = new Set([
  'data-catalog-example',
  'data-catalog-example-stack',
  'data-catalog-example-label',
  'data-catalog-example-note',
  'data-align',
]);

type CatalogExampleRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-catalog-example'?: never;
    'data-catalog-example-stack'?: never;
    'data-catalog-example-label'?: never;
    'data-catalog-example-note'?: never;
    'data-align'?: never;
  }
>;

type CatalogExampleStackRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-catalog-example'?: never;
    'data-catalog-example-stack'?: never;
    'data-catalog-example-label'?: never;
    'data-catalog-example-note'?: never;
    'data-align'?: never;
  }
>;

export interface CatalogExampleProps {
  /** The example's label, shown as a `ListHeader` above the specimen. Omit for a bare specimen. */
  label?: string;
  /** Optional explanatory note between the label and the specimen. */
  note?: SafeHtml | string;
  /** Alignment inset for the specimen — see {@link CatalogExampleAlign}. Default `'none'`. */
  align?: CatalogExampleAlign;
  /** Safe authoring `data-*` metadata for the rendered section. Helper-owned structural attributes remain protected. */
  rootAttributes?: CatalogExampleRootAttributes;
  className?: string;
  children?: KerfUiContent;
}

/**
 * One labeled example in a catalog preview: a `ListHeader` label, an optional
 * note, and the specimen. `align` insets the specimen so its visible left edge
 * lines up with the label text, encoding the catalog's alignment rules as a
 * first-class prop instead of per-demo CSS. The inset is published as the
 * `--kui-catalog-example-align` custom property so a debug overlay can exclude it
 * from a specimen's measured margin.
 */
export function CatalogExample({
  label,
  note,
  align = 'none',
  rootAttributes = {},
  className = '',
  children,
}: CatalogExampleProps) {
  const safeRootAttributes = filterDataAttributes(
    rootAttributes,
    catalogExampleProtectedAttributes,
  );
  return (
    <section
      {...safeRootAttributes}
      class={`kui-catalog-example ${className}`.trim()}
      data-catalog-example
      data-align={align}
    >
      {label !== undefined ? (
        <ListHeader
          label={label}
          rootAttributes={{ 'data-catalog-example-label': '' }}
        />
      ) : null}
      {note !== undefined ? (
        <Text class="kui-catalog-example__note" data-catalog-example-note>
          {note}
        </Text>
      ) : null}
      {children}
    </section>
  );
}

export interface CatalogExampleStackProps {
  /** Accessible label for the stack region. */
  label?: string;
  /** Safe authoring `data-*` metadata for the rendered stack. Helper-owned structural attributes remain protected. */
  rootAttributes?: CatalogExampleStackRootAttributes;
  className?: string;
  children?: KerfUiContent;
}

/**
 * A vertically-stacked group of {@link CatalogExample}s with the catalog's
 * example rhythm. The semantic `section` becomes a named `region` when `label`
 * is supplied; an unlabeled stack remains an ordinary grouping.
 */
export function CatalogExampleStack({
  label,
  rootAttributes = {},
  className = '',
  children,
}: CatalogExampleStackProps) {
  const safeRootAttributes = filterDataAttributes(
    rootAttributes,
    catalogExampleProtectedAttributes,
  );
  return (
    <section
      {...safeRootAttributes}
      class={`kui-catalog-example-stack ${className}`.trim()}
      data-catalog-example-stack
      aria-label={label}
    >
      {children}
    </section>
  );
}
