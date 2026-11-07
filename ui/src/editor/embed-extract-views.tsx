// The Embed in and Extract to views (KF-N0CSVT: split out of editor.tsx):
// the Flow area's two sections and their dialogs. Each takes the editor
// state it reads as a typed argument; the edits they start stay in the
// editor.
import type { ViewNode } from '@kerfjs/ui/view';
import type { ReadonlySignal, SafeHtml } from 'kerfjs';
import { ChevronRight } from 'lucide';

import { Button } from '../components/actions/button/button.js';
import { List } from '../components/collections/list/list.js';
import { ListHeader } from '../components/collections/list-header/list-header.js';
import { ListItem } from '../components/collections/list-item/list-item.js';
import { EmptyState } from '../components/feedback/empty-state/empty-state.js';
import { SearchField } from '../components/forms/search-field/search-field.js';
import { TextField } from '../components/forms/text-field/text-field.js';
import { LucideIcon } from '../components/media/lucide-icon/lucide-icon.js';
import { DialogSurface } from '../components/surfaces/surface-scaffold/surface-scaffold.js';
import type { EditorCatalog } from './catalog.js';
import {
  EMBED_ACTION,
  EMBED_CLEAR_ACTION,
  EMBED_DIALOG,
  EMBED_FIRST,
  EMBED_OTHER_ACTION,
  EXTRACT_ACTION,
  EXTRACT_DIALOG,
} from './shell-names.js';

/** What the Embed In dialog shows. */
export interface EmbedDialogState {
  readonly catalog: EditorCatalog;
  /** The node it embeds, or null while closed. */
  readonly target: ReadonlySignal<string | null>;
  readonly query: ReadonlySignal<string>;
  readonly queryRevision: ReadonlySignal<number>;
  /** Whether node `id` can be embedded in a new container of `key`. */
  readonly canEmbed: (id: string, key: string) => boolean;
}

/**
 * Embed in › Other… (KF-6MGYSG): every container that can hold the node,
 * narrowed by a filter over component names; choosing one embeds it.
 */
export function embedDialog({
  catalog,
  target,
  query: querySignal,
  queryRevision,
  canEmbed,
}: EmbedDialogState): SafeHtml {
  const id = target.value;
  const query = querySignal.value.trim().toLocaleLowerCase();
  const choices = id
    ? catalog
        .paletteGroups()
        .flatMap((group) => group.items)
        .filter((item) => item.name.toLocaleLowerCase().includes(query))
        .filter((item) => canEmbed(id, item.key))
    : [];
  return (
    <DialogSurface
      id={EMBED_DIALOG}
      label="Embed In"
      size="medium"
      rootAttributes={{ 'data-key': EMBED_DIALOG }}
      footer={
        <Button rootAttributes={{ 'data-dialog-close': '' }}>Cancel</Button>
      }
    >
      <List controlInsets="trbl" gap>
        <SearchField
          id="editor-embed-search"
          label="Filter Containers"
          placeholder="Filter containers"
          query={querySignal.value}
          revision={queryRevision.value}
          clearAction={EMBED_CLEAR_ACTION}
          clearLabel="Clear Filter"
          editorAttributes={{ 'data-editor-embed-search': '' }}
        />
      </List>
      {choices.length ? (
        <List>
          {choices.map((item) => (
            <ListItem
              label={item.name}
              action={EMBED_ACTION}
              itemId={item.key}
              rootAttributes={{ 'data-editor-embed': item.key }}
            />
          ))}
        </List>
      ) : (
        <EmptyState
          title="No matching container"
          detail="No container that can hold this node has that name."
        />
      )}
    </DialogSurface>
  );
}

/** What the Embed in section offers. */
export interface EmbedSectionState {
  readonly catalog: EditorCatalog;
  /** The first containers that can hold the selected node. */
  readonly legal: ReadonlySignal<ReadonlySet<string>>;
}

/**
 * Embed in (KF-6MGYSG), in the Flow area beside the other commands that
 * restructure the node: its first containers, each offered only where it
 * can hold the node, then Other… for any container. Every node has it,
 * the root included (KF-84CCD1).
 */
export function embedSection({
  catalog: { propsByKey, componentNames },
  legal: legalKeys,
}: EmbedSectionState): SafeHtml {
  return (
    <List rootAttributes={{ 'data-editor-embed-section': '' }}>
      <ListHeader label="Embed in" size="xs" />
      {EMBED_FIRST.filter((key) => propsByKey.has(key)).map((key) => {
        const legal = legalKeys.value.has(key);
        return (
          <ListItem
            label={componentNames.get(key)!}
            action={EMBED_ACTION}
            itemId={key}
            disabled={!legal}
            description={legal ? undefined : 'It cannot hold this node here.'}
            rootAttributes={{ 'data-editor-embed': key }}
          />
        );
      })}
      <ListItem
        label="Other…"
        action={EMBED_OTHER_ACTION}
        itemId="other"
        trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
      />
    </List>
  );
}

/**
 * Extract to › New document…, in the Flow area after Embed in. `blockedBy`
 * says why a node cannot be extracted, if it cannot.
 */
export function extractSection(
  node: ViewNode,
  blockedBy: (id: string) => string | undefined,
): SafeHtml {
  const blocked = blockedBy(node.id);
  return (
    <List rootAttributes={{ 'data-editor-extract-section': '' }}>
      <ListHeader label="Extract to" size="xs" />
      <ListItem
        label="New document…"
        action={EXTRACT_ACTION}
        itemId="extract"
        disabled={!!blocked}
        description={blocked}
        trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
        rootAttributes={{ 'data-editor-extract': 'open' }}
      />
    </List>
  );
}

/** What the Extract to Document dialog shows. */
export interface ExtractDialogState {
  readonly path: ReadonlySignal<string>;
  /** Why the last extract failed, or empty. */
  readonly error: ReadonlySignal<string>;
}

/**
 * KF-D9P3NP: Extract to document always asks where the new document goes,
 * as Save As does, starting from a name beside this one.
 */
export function extractDialog({ path, error }: ExtractDialogState): SafeHtml {
  return (
    <DialogSurface
      id={EXTRACT_DIALOG}
      label="Extract to Document"
      size="small"
      footer={
        <>
          <Button rootAttributes={{ 'data-dialog-close': '' }}>Cancel</Button>
          <Button
            tone="brand"
            action={EXTRACT_ACTION}
            rootAttributes={{ 'data-editor-extract': 'confirm' }}
          >
            Extract
          </Button>
        </>
      }
    >
      <TextField
        label="Path"
        name="path"
        value={path.value}
        hint="A new .kui.json file inside the project. The node moves there, and this document shows it through a #view."
        error={error.value || undefined}
        spellcheck={false}
        autocapitalize="off"
        autocorrect="off"
        rootAttributes={{ 'data-editor-extract': 'path' }}
      />
    </DialogSurface>
  );
}
