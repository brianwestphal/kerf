// The Insert Document dialog (KF-YF1PDR: split out of editor.tsx; KF-PX5EVZ:
// Insert Document). With a storage that lists the project's documents it
// filters them into a pick list; without one it takes a path.
import type { ReadonlySignal, SafeHtml } from 'kerfjs';

import { Button } from '../components/actions/button/button.js';
import { List } from '../components/collections/list/list.js';
import { ListInsetText } from '../components/collections/list-inset-text/list-inset-text.js';
import { ListItem } from '../components/collections/list-item/list-item.js';
import { EmptyState } from '../components/feedback/empty-state/empty-state.js';
import { StateBanner } from '../components/feedback/state-banner/state-banner.js';
import { SearchField } from '../components/forms/search-field/search-field.js';
import { TextField } from '../components/forms/text-field/text-field.js';
import { DialogSurface } from '../components/surfaces/surface-scaffold/surface-scaffold.js';
import { Text } from '../components/typography/text/text.js';
import { filterDocuments } from './model/insert-view.js';
import {
  INSERT_DOCUMENT_ACTION,
  INSERT_DOCUMENT_CLEAR_ACTION,
  INSERT_DOCUMENT_DIALOG,
} from './shell-names.js';

/** The project's documents as Insert Document lists them. */
export type InsertDocumentFiles =
  | { readonly state: 'loading' }
  | { readonly state: 'loaded'; readonly paths: readonly string[] }
  | { readonly state: 'failed'; readonly error: string };

/** What the dialog shows: the editor's Insert Document state. */
export interface InsertDocumentDialogState {
  /** Whether the storage lists documents (a pick list) or not (a path). */
  readonly listed: boolean;
  readonly files: ReadonlySignal<InsertDocumentFiles>;
  readonly query: ReadonlySignal<string>;
  readonly queryRevision: ReadonlySignal<number>;
  /** Why the last insert failed, or empty. */
  readonly error: ReadonlySignal<string>;
}

/**
 * KF-PX5EVZ: Insert Document. With a storage that lists the project's
 * documents, a filter over them and a pick list; without one, a path.
 */
export function insertDocumentDialog({
  listed,
  files: filesSignal,
  query,
  queryRevision,
  error,
}: InsertDocumentDialogState): SafeHtml {
  const files = filesSignal.value;
  const paths =
    files.state === 'loaded' ? filterDocuments(files.paths, query.value) : [];
  const picker =
    files.state === 'loading' ? (
      <ListInsetText>
        <Text tone="quiet">Listing the project’s documents…</Text>
      </ListInsetText>
    ) : files.state === 'failed' ? (
      <EmptyState
        title="The documents could not be listed"
        detail={files.error}
      />
    ) : !files.paths.length ? (
      <EmptyState
        title="No other documents"
        detail="The project has no other .kui.json document to insert."
      />
    ) : paths.length ? (
      <List>
        {paths.map((path) => (
          // The file name leads, so a long folder cannot truncate it away;
          // the whole path names the row and shows on hover.
          <ListItem
            label={path.slice(path.lastIndexOf('/') + 1)}
            description={path.slice(0, path.lastIndexOf('/') + 1) || './'}
            accessibleLabel={path}
            title={path}
            action={INSERT_DOCUMENT_ACTION}
            rootAttributes={{ 'data-editor-insert-document': path }}
          />
        ))}
      </List>
    ) : (
      <EmptyState
        title="No matching document"
        detail="No document’s path holds that text."
      />
    );
  return (
    <DialogSurface
      id={INSERT_DOCUMENT_DIALOG}
      label="Insert Document"
      size={listed ? 'medium' : 'small'}
      rootAttributes={{ 'data-key': INSERT_DOCUMENT_DIALOG }}
      footer={
        <>
          <Button rootAttributes={{ 'data-dialog-close': '' }}>Cancel</Button>
          {listed ? undefined : (
            <Button
              tone="brand"
              action={INSERT_DOCUMENT_ACTION}
              rootAttributes={{ 'data-editor-insert-document': 'confirm' }}
            >
              Insert
            </Button>
          )}
        </>
      }
    >
      {listed ? (
        <>
          <List controlInsets="trbl" gap>
            <SearchField
              id="editor-insert-document-search"
              label="Filter Documents"
              placeholder="Filter documents"
              query={query.value}
              revision={queryRevision.value}
              clearAction={INSERT_DOCUMENT_CLEAR_ACTION}
              clearLabel="Clear Filter"
              editorAttributes={{ 'data-editor-insert-document-search': '' }}
            />
            {error.value ? (
              <StateBanner
                tone="danger"
                title="That document cannot be inserted"
                detail={error.value}
                rootAttributes={{ 'data-editor-insert-document-error': '' }}
              />
            ) : undefined}
          </List>
          {picker}
        </>
      ) : (
        <TextField
          label="Path"
          name="path"
          value=""
          hint="A .kui.json document inside the project. This document shows it through a #view."
          error={error.value || undefined}
          spellcheck={false}
          autocapitalize="off"
          autocorrect="off"
          rootAttributes={{ 'data-editor-insert-document': 'path' }}
        />
      )}
    </DialogSurface>
  );
}
