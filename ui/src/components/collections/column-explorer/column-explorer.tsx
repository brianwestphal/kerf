import type { SafeHtml } from 'kerfjs';
import { ChevronRight } from 'lucide';

import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import type { CssLength } from '../../../shared/styles/css-values.js';
import { ColumnTrack } from '../../layout/column-track/column-track.js';
import { LucideIcon } from '../../media/lucide-icon/lucide-icon.js';
import { List } from '../list/list.js';
import { ListItem } from '../list-item/list-item.js';
import {
  isExpandable,
  type TreeListNode,
} from '../tree-list/model/tree-rows.js';
import { explorerChosen, explorerColumns } from './model/columns.js';

export {
  explorerChosen,
  type ExplorerColumn,
  explorerColumns,
} from './model/columns.js';

const COLUMN_EXPLORER_PROTECTED = new Set([
  'data-component',
  'data-column-explorer-id',
]);

export interface ColumnExplorerProps {
  /** Identifies the explorer for `wireColumnExplorer` and in tests. */
  id: string;
  /** The explorer's accessible name, such as "Files". */
  label: string;
  /** The hierarchy, as TreeList's nodes. The application owns it. */
  nodes: readonly TreeListNode[];
  /**
   * The chosen ids from the top level down, one per column. The application
   * owns it: set it to `treeListPath(nodes, id)` when `action` reports a row.
   */
  path: readonly string[];
  /** Delegated action for choosing a row; the row's `data-item-id` names it. */
  action: string;
  /**
   * Content for a last column when the chosen node is a leaf, such as a
   * file's details.
   */
  preview?: SafeHtml;
  /** ColumnTrack's layout: `scroll` (default) or `paged` for a phone. */
  layout?: 'scroll' | 'paged';
  /** Each column's minimum width (ColumnTrack's default 250px). */
  minColumnWidth?: CssLength;
  /** How much of the next column a paged layout shows. */
  peek?: CssLength;
  /** Row density: `standard` (default) or `compact`. */
  density?: 'standard' | 'compact';
  className?: string;
  /** Safe `data-*` metadata for the explorer element. */
  rootAttributes?: RootDataAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

const chevron = LucideIcon({ icon: ChevronRight, name: 'chevron-right' });

/**
 * A macOS-style column explorer for a hierarchy: one column per level in a
 * ColumnTrack, where choosing a row with children opens the next column of
 * its children. The application owns the nodes and the chosen path and
 * handles `action`; wire the keyboard with `wireColumnExplorer`.
 */
export function ColumnExplorer({
  id,
  label,
  nodes,
  path,
  action,
  preview,
  layout,
  minColumnWidth,
  peek,
  density = 'standard',
  className = '',
  rootAttributes = {},
  slot,
}: ColumnExplorerProps) {
  const columns = explorerColumns(nodes, path);
  const chosen = explorerChosen(nodes, path);
  const showPreview =
    preview !== undefined && chosen !== undefined && !isExpandable(chosen);
  return (
    <div
      {...filterDataAttributes(rootAttributes, COLUMN_EXPLORER_PROTECTED)}
      id={id}
      role="region"
      class={`kui-column-explorer ${className}`.trim()}
      aria-label={label}
      data-component="column-explorer"
      data-column-explorer-id={id}
      slot={slot}
    >
      <ColumnTrack layout={layout} minColumnWidth={minColumnWidth} peek={peek}>
        {columns.map((column) => {
          // One Tab stop per column: its chosen row, else its first.
          const stop = column.chosen ?? column.nodes[0]?.id;
          return (
            <List
              scrollable
              fill
              rootAttributes={{
                role: 'group',
                'aria-label': column.parent
                  ? String(column.parent.label)
                  : label,
                'data-column-explorer-level': String(column.level),
              }}
            >
              {column.nodes.map((node) => (
                <ListItem
                  action={action}
                  itemId={node.id}
                  label={node.label}
                  description={node.description}
                  icon={node.icon}
                  trailing={
                    isExpandable(node) ? (
                      <>
                        {node.trailing}
                        {chevron}
                      </>
                    ) : (
                      node.trailing
                    )
                  }
                  selected={node.id === column.chosen}
                  disabled={node.disabled}
                  density={density}
                  tabIndex={node.id === stop ? 0 : -1}
                  rootAttributes={{
                    'data-key': node.id,
                    'data-column-explorer-level': String(column.level),
                    'data-expandable': isExpandable(node) ? 'true' : undefined,
                  }}
                />
              ))}
            </List>
          );
        })}
        {showPreview ? (
          <List
            scrollable
            fill
            rootAttributes={{
              role: 'group',
              'aria-label': `${String(chosen.label)} preview`,
              'data-column-explorer-preview': 'true',
            }}
          >
            {preview}
          </List>
        ) : null}
      </ColumnTrack>
    </div>
  );
}
