// The Problems rail's rows (KF-YF1PDR: split out of editor.tsx): one per
// diagnostic or hint, selecting the node it is about.
import { Group } from 'lucide';

import { ListActionRow } from '../components/collections/list-action-row/list-action-row.js';
import { ListItem } from '../components/collections/list-item/list-item.js';
import { LucideIcon } from '../components/media/lucide-icon/lucide-icon.js';
import { HOOK } from './dom-hooks.js';
import type { Problem } from './model/problems.js';
import { EMBED_ACTION, EMBED_FIRST, PROBLEM_ACTION } from './shell-names.js';

/** One row per diagnostic; a row about a node selects it. */
export const problemRows = (problems: readonly Problem[]) =>
  problems.map(({ diagnostic, nodeId }, index) => (
    <ListItem
      action={PROBLEM_ACTION}
      itemId={nodeId ?? `document-${index}`}
      label={diagnostic.message}
      description={`${diagnostic.code} · ${diagnostic.path}`}
      multiline
      disabled={!nodeId}
    />
  ));

/**
 * One row per hint; a nested layout's hint (`KUI-H001`) carries its fix,
 * Embed in SizedRegion (KF-6MGYSG).
 */
export const hintRows = (hints: readonly Problem[]) => {
  const plain = problemRows(hints);
  return hints.map(({ diagnostic, nodeId }, index) =>
    // KUI-H001 is about a Kerf UI layout node, so it has a node id and
    // SizedRegion is cataloged.
    diagnostic.code === 'KUI-H001' ? (
      <ListActionRow
        action={PROBLEM_ACTION}
        itemId={nodeId!}
        label={diagnostic.message}
        description={`${diagnostic.code} · ${diagnostic.path}`}
        multiline
        trailingAction={EMBED_ACTION}
        trailingActionLabel="Embed in SizedRegion"
        trailingActionIcon={<LucideIcon icon={Group} name="group" />}
        trailingActionAttributes={{
          [HOOK.embed]: EMBED_FIRST[0]!,
          'data-editor-embed-node': nodeId!,
        }}
      />
    ) : (
      plain[index]!
    ),
  );
};
