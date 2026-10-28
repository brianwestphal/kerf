// KF-ECR4XG: ListItem's treeitem form, the row TreeList renders. It is a
// ListItem (same geometry, hover, selected tint) that also carries its tree
// position, an indent for its level, and a disclosure arrow. Internal: the
// `@kerfjs/ui/list-item` facade does not re-export it.
import type { SafeHtml } from 'kerfjs';

import type { KerfUiContent } from '../../../../shared/content/semantic-content.js';
import { remify } from '../../../../shared/styles/css-values.js';
import { DisclosureArrow } from '../../../navigation/disclosure-arrow/disclosure-arrow.js';
import { listItemContent } from './list-item-content.js';

export interface ListTreeItemProps {
  readonly itemId: string;
  readonly label: string | SafeHtml;
  readonly description?: string | SafeHtml;
  readonly icon?: SafeHtml;
  readonly trailing?: KerfUiContent;
  readonly level: number;
  readonly position: number;
  readonly setSize: number;
  readonly expandable: boolean;
  readonly expanded: boolean;
  readonly selected: boolean;
  /** The one row in the tree's Tab order (roving tabindex). */
  readonly focusable: boolean;
  readonly disabled?: boolean;
  readonly density: 'standard' | 'compact';
  /** Delegated action for choosing the row. */
  readonly action: string;
  /** Delegated action for its disclosure arrow. */
  readonly toggleAction: string;
}

/**
 * A `role="treeitem"` ListItem. A disabled row stays focusable for keyboard
 * navigation (`aria-disabled`) but carries no actions.
 */
export function ListTreeItem({
  itemId,
  label,
  description,
  icon,
  trailing,
  level,
  position,
  setSize,
  expandable,
  expanded,
  selected,
  focusable,
  disabled = false,
  density,
  action,
  toggleAction,
}: ListTreeItemProps) {
  return (
    <button
      type="button"
      role="treeitem"
      class="kui-list-item"
      style={`--_kui-list-item-tree-level:${level}`}
      tabindex={focusable ? 0 : -1}
      data-component="list-item"
      data-key={itemId}
      data-action={disabled ? undefined : action}
      data-item-id={itemId}
      data-has-icon={String(Boolean(icon))}
      data-has-description={String(Boolean(description))}
      data-density={density}
      data-divider="none"
      data-kui-disabled={disabled ? 'true' : undefined}
      aria-level={String(level)}
      aria-posinset={String(position)}
      aria-setsize={String(setSize)}
      aria-expanded={expandable ? String(expanded) : undefined}
      aria-selected={String(selected)}
      aria-disabled={disabled ? 'true' : undefined}
    >
      <span
        class="kui-list-item__disclosure"
        aria-hidden="true"
        data-action={expandable && !disabled ? toggleAction : undefined}
        data-item-id={expandable ? itemId : undefined}
      >
        {expandable ? (
          <DisclosureArrow open={expanded} size={remify(16)} />
        ) : null}
      </span>
      {listItemContent({ label, description, icon, trailing, tile: null })}
    </button>
  );
}
