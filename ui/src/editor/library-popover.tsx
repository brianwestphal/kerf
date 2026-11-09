// The editor's component and document Library popover and its palette views.
import { raw, type Signal } from 'kerfjs';
import {
  ArrowLeft,
  Columns3,
  Component,
  LayoutGrid,
  List as ListIcon,
  ListTree,
} from 'lucide';

import { Button } from '../components/actions/button/button.js';
import { ColumnExplorer } from '../components/collections/column-explorer/column-explorer.js';
import { List } from '../components/collections/list/list.js';
import { ListHeader } from '../components/collections/list-header/list-header.js';
import { ListItem } from '../components/collections/list-item/list-item.js';
import { TreeList } from '../components/collections/tree-list/tree-list.js';
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
  DOCUMENT_BACK_ACTION,
  DOCUMENT_ROW_ACTION,
  DOCUMENT_TOGGLE_ACTION,
  DOCUMENT_VIEW_ACTION,
  type DocumentView,
  LIBRARY_ID,
  LIBRARY_MODE_ACTION,
  type LibraryMode,
  PALETTE_ICONS,
  PALETTE_VIEW_ACTION,
  type PaletteView,
} from './library-memory.js';
import { LIBRARY_DOCUMENTS, libraryDocuments } from './model/insert-view.js';
import {
  documentFolderId,
  libraryDocumentTree,
} from './model/library-document-tree.js';
import { paletteSketch } from './palette-schematics.js';
import { PALETTE_ACTION, PALETTE_CLEAR_ACTION } from './shell-names.js';

export interface LibraryPopoverState {
  readonly paletteFilter: Signal<string>;
  readonly paletteFilterRevision: Signal<number>;
  readonly paletteView: Signal<PaletteView>;
  readonly libraryMode: Signal<LibraryMode>;
  readonly documentView: Signal<DocumentView>;
  readonly documentPath: Signal<readonly string[]>;
  readonly collapsedDocumentFolders: Signal<ReadonlySet<string>>;
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
    libraryMode,
    documentView,
    documentPath,
    collapsedDocumentFolders,
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
  const palette = (groups: ReturnType<typeof paletteMatches>) => (
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
                  <Text variant="span" size="compact" wrap="truncate">
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
    </List>
  );

  const libraryDocumentGroup = (documents: readonly string[]) => {
    const nodes = libraryDocumentTree(documents);
    return documentView.value === 'columns' ? (
      <div class="kui-editor__document-columns">
        <div class="kui-editor__document-location">
          {documentPath.value.length ? (
            <Button
              icon={<LucideIcon icon={ArrowLeft} name="back" />}
              ariaLabel="Parent folder"
              action={DOCUMENT_BACK_ACTION}
              size="compact"
            />
          ) : undefined}
          <Text variant="span" size="compact" wrap="truncate">
            {documentPath.value.length
              ? `Project / ${documentPath.value.at(-1)!.slice('folder:'.length)}`
              : 'Project'}
          </Text>
        </div>
        <ColumnExplorer
          id="editor-library-documents-columns"
          label={LIBRARY_DOCUMENTS}
          nodes={nodes}
          path={documentPath.value}
          action={DOCUMENT_ROW_ACTION}
          layout="paged"
          className="kui-editor__document-explorer"
        />
      </div>
    ) : (
      <TreeList
        id="editor-library-documents-tree"
        label={LIBRARY_DOCUMENTS}
        nodes={nodes}
        expanded={
          new Set(
            documents
              .flatMap((path) => {
                const parts = path.split('/').filter(Boolean);
                return parts
                  .slice(0, -1)
                  .map((_, index) =>
                    documentFolderId(`${parts.slice(0, index + 1).join('/')}/`),
                  );
              })
              .filter((id) => !collapsedDocumentFolders.value.has(id)),
          )
        }
        selected={documentPath.value.at(-1)}
        action={DOCUMENT_ROW_ACTION}
        toggleAction={DOCUMENT_TOGGLE_ACTION}
        density="compact"
      />
    );
  };

  /**
   * KF-Z54E4H: the component Library, Xcode style: a popover below the
   * Preview toolbar's Library button that closes after a drop unless pinned
   * or Option is held. Its filter stays above the scrolling palette.
   */
  const libraryPopover = () => {
    const componentsMode = libraryMode.value === 'components';
    const groups = componentsMode ? paletteMatches() : [];
    const documents = componentsMode
      ? []
      : libraryDocuments(libraryFiles.value, paletteFilter.value);
    return (
      <PinnablePopoverSurface
        id={LIBRARY_ID}
        label="Library"
        size="small"
        height={px(560)}
        bodyLayout="fill-last"
        resizeFromBottom
        headerActions={
          componentsMode ? (
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
          ) : (
            <SegmentedControl
              id="editor-document-view"
              label="Document View"
              value={documentView.value}
              action={DOCUMENT_VIEW_ACTION}
              choices={[
                {
                  value: 'columns',
                  label: 'Columns',
                  title: 'Columns',
                  content: <LucideIcon icon={Columns3} name="columns" />,
                },
                {
                  value: 'tree',
                  label: 'Tree',
                  title: 'Tree',
                  content: <LucideIcon icon={ListTree} name="list-tree" />,
                },
              ]}
            />
          )
        }
        rootAttributes={{ [HOOK.library]: '' }}
      >
        <List controlInsets="trbl" gap>
          <SegmentedControl
            id="editor-library-mode"
            label="Library Content"
            layout="equal"
            value={libraryMode.value}
            action={LIBRARY_MODE_ACTION}
            choices={[
              { value: 'components', label: 'Components' },
              { value: 'documents', label: 'Documents' },
            ]}
          />
          <SearchField
            id="editor-palette-filter"
            label={componentsMode ? 'Filter Components' : 'Filter Documents'}
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
        <List
          scrollable
          flex
          rootAttributes={{ 'data-editor-library-results': '' }}
        >
          {componentsMode ? (
            groups.length ? (
              palette(groups)
            ) : (
              <EmptyState
                title="No matching components"
                detail="No component name or category holds that text."
              />
            )
          ) : documents.length ? (
            libraryDocumentGroup(documents)
          ) : (
            <EmptyState
              title="No matching documents"
              detail="No project document name or folder holds that text."
            />
          )}
        </List>
      </PinnablePopoverSurface>
    );
  };

  return libraryPopover;
}
