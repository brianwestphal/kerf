// The editor's component and document Library popover and its palette views.
import { raw, type Signal } from 'kerfjs';
import { Component, FileText, LayoutGrid, List as ListIcon } from 'lucide';

import { List } from '../components/collections/list/list.js';
import { ListHeader } from '../components/collections/list-header/list-header.js';
import { ListItem } from '../components/collections/list-item/list-item.js';
import { EmptyState } from '../components/feedback/empty-state/empty-state.js';
import { StateBanner } from '../components/feedback/state-banner/state-banner.js';
import { SearchField } from '../components/forms/search-field/search-field.js';
import { SegmentedControl } from '../components/forms/segmented-control/segmented-control.js';
import { Grid } from '../components/layout/grid/grid.js';
import { LucideIcon } from '../components/media/lucide-icon/lucide-icon.js';
import { ContentItem } from '../components/surfaces/content-item/content-item.js';
import { PinnablePopoverSurface } from '../components/surfaces/surface-scaffold/surface-scaffold.js';
import { Text } from '../components/typography/text/text.js';
import { px } from '../shared/styles/css-values.js';
import { HOOK } from './dom-hooks.js';
import type { EditorContext } from './editor-context.js';
import {
  LIBRARY_ID,
  PALETTE_ICONS,
  PALETTE_VIEW_ACTION,
  type PaletteView,
} from './library-memory.js';
import {
  documentFolder,
  documentName,
  LIBRARY_DOCUMENTS,
  libraryDocuments,
} from './model/insert-view.js';
import { paletteSketch } from './palette-schematics.js';
import {
  PALETTE_ACTION,
  PALETTE_CLEAR_ACTION,
  PALETTE_DOCUMENT_ACTION,
} from './shell-names.js';

export interface LibraryPopoverState {
  readonly paletteFilter: Signal<string>;
  readonly paletteFilterRevision: Signal<number>;
  readonly paletteView: Signal<PaletteView>;
  readonly libraryFiles: Signal<readonly string[]>;
  readonly libraryError: Signal<string>;
}

export function createLibraryPopover(
  ctx: EditorContext,
  state: LibraryPopoverState,
) {
  const { catalog, selection } = ctx;
  const {
    paletteFilter,
    paletteFilterRevision,
    paletteView,
    libraryFiles,
    libraryError,
  } = state;
  /**
   * The palette's groups, narrowed to components whose name or category
   * holds the filter text (KF-Y26SKM); a group with no match is left out.
   */
  const paletteMatches = () => {
    const query = paletteFilter.value.trim().toLocaleLowerCase();
    const holds = (text: string) => text.toLocaleLowerCase().includes(query);
    return catalog
      .paletteGroups()
      .map((group) => ({
        ...group,
        items: holds(group.category)
          ? group.items
          : group.items.filter((item) => holds(item.name)),
      }))
      .filter((group) => group.items.length);
  };

  const paletteSelected = (key: string) =>
    selection.value?.kind === 'component' && selection.value.key === key;

  // KF-K2VP9A / KF-YR81M0: each category is its own List under a default
  // ListHeader, spaced apart as the catalog's sidebar sections are.
  // KF-JC7WTW: in the grid view each category's components are tiles, each
  // showing its component as added (`wirePaletteThumbnails` draws them),
  // or its icon when it shows nothing until opened.
  const palette = (
    groups: ReturnType<typeof paletteMatches>,
    documents: readonly string[],
  ) => (
    <List gap="m">
      {groups.map((group) => (
        <List>
          <ListHeader label={group.category} />
          {paletteView.value === 'grid' ? (
            <Grid minColumnWidth={px(96)} autoFill gap="xs">
              {group.items.map((item) => (
                <ContentItem
                  interactive
                  action={PALETTE_ACTION}
                  itemId={item.key}
                  selectionMode="single"
                  selected={paletteSelected(item.key)}
                  ariaLabel={item.name}
                  title={item.name}
                  frame="framed"
                  // KF-78MHM8: a tile drags onto the canvas to add one.
                  rootAttributes={{
                    [HOOK.palette]: item.key,
                    'data-key': item.key,
                  }}
                >
                  {paletteSketch(item.key) || PALETTE_ICONS[item.key] ? (
                    <div class="kui-editor__palette-thumb" aria-hidden="true">
                      {PALETTE_ICONS[item.key] ? (
                        <LucideIcon
                          icon={PALETTE_ICONS[item.key]!}
                          name="component"
                        />
                      ) : (
                        raw(paletteSketch(item.key)!)
                      )}
                    </div>
                  ) : (
                    <div
                      class="kui-editor__palette-thumb"
                      {...{ [HOOK.paletteThumb]: item.key }}
                      data-morph-skip
                      aria-hidden="true"
                      inert
                    >
                      <LucideIcon icon={Component} name="component" />
                    </div>
                  )}
                  <Text variant="span" size="compact" maxLines={1}>
                    {item.name}
                  </Text>
                </ContentItem>
              ))}
            </Grid>
          ) : (
            group.items.map((item) => (
              <ListItem
                action={PALETTE_ACTION}
                itemId={item.key}
                label={item.name}
                // KF-78MHM8: a palette row drags onto the canvas to add one.
                rootAttributes={{ [HOOK.palette]: item.key }}
                selected={paletteSelected(item.key)}
              />
            ))
          )}
        </List>
      ))}
      {documents.length ? libraryDocumentGroup(documents) : undefined}
    </List>
  );

  /**
   * KF-FXACB5: the Library's Documents group, after the components: each
   * project document as a row led by its file name over its folder (as
   * Insert Document lists them), or as a tile with a file icon (no live
   * thumbnail). A click inserts it as a `#view`; it drags like a component.
   */
  const libraryDocumentGroup = (documents: readonly string[]) => (
    <List>
      <ListHeader label={LIBRARY_DOCUMENTS} />
      {paletteView.value === 'grid' ? (
        <Grid minColumnWidth={px(96)} autoFill gap="xs">
          {documents.map((path) => (
            <ContentItem
              interactive
              action={PALETTE_DOCUMENT_ACTION}
              itemId={path}
              ariaLabel={path}
              title={path}
              frame="framed"
              rootAttributes={{
                [HOOK.paletteDocument]: path,
                'data-key': `document:${path}`,
              }}
            >
              <div class="kui-editor__palette-thumb" aria-hidden="true">
                <LucideIcon icon={FileText} name="file-text" />
              </div>
              <Text variant="span" size="compact" maxLines={1}>
                {documentName(path)}
              </Text>
            </ContentItem>
          ))}
        </Grid>
      ) : (
        documents.map((path) => (
          <ListItem
            action={PALETTE_DOCUMENT_ACTION}
            label={documentName(path)}
            description={documentFolder(path)}
            accessibleLabel={path}
            title={path}
            rootAttributes={{ [HOOK.paletteDocument]: path }}
          />
        ))
      )}
    </List>
  );

  /**
   * KF-Z54E4H: the component Library, Xcode style: a popover below the
   * Preview toolbar's Library button that closes after a drop unless pinned
   * or Option is held. Its filter stays above the scrolling palette.
   */
  const libraryPopover = () => {
    const groups = paletteMatches();
    const documents = libraryDocuments(libraryFiles.value, paletteFilter.value);
    return (
      <PinnablePopoverSurface
        id={LIBRARY_ID}
        label="Library"
        size="small"
        height={px(560)}
        bodyLayout="fill-last"
        headerActions={
          // KF-JC7WTW: a list of names, or a grid of thumbnails.
          <SegmentedControl
            id="editor-palette-view"
            label="Component View"
            value={paletteView.value}
            action={PALETTE_VIEW_ACTION}
            choices={[
              {
                value: 'list',
                label: 'List',
                title: 'List',
                content: <LucideIcon icon={ListIcon} name="list" />,
              },
              {
                value: 'grid',
                label: 'Grid',
                title: 'Grid',
                content: <LucideIcon icon={LayoutGrid} name="layout-grid" />,
              },
            ]}
          />
        }
        rootAttributes={{ [HOOK.library]: '' }}
      >
        <List controlInsets="trbl" gap>
          <SearchField
            id="editor-palette-filter"
            label="Filter Components"
            placeholder="Filter"
            query={paletteFilter.value}
            revision={paletteFilterRevision.value}
            clearAction={PALETTE_CLEAR_ACTION}
            clearLabel="Clear Filter"
            editorAttributes={{ [HOOK.paletteFilter]: '' }}
          />
          {libraryError.value ? (
            <StateBanner
              tone="danger"
              title="That document cannot be inserted"
              detail={libraryError.value}
              rootAttributes={{ 'data-editor-library-error': '' }}
            />
          ) : undefined}
        </List>
        <List scrollable flex>
          {groups.length || documents.length ? (
            palette(groups, documents)
          ) : (
            <EmptyState
              title="No matching components"
              detail="No component name or category holds that text."
            />
          )}
        </List>
      </PinnablePopoverSurface>
    );
  };

  return libraryPopover;
}
