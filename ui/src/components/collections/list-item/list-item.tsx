import type { SafeHtml } from 'kerfjs';

import {
  type ListIconTile,
  listIconTilePresentation,
} from '../../../shared/content/list-icon-tile.js';
import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { nativeDraggable } from '../../../shared/dom/draggable.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import { listItemContent } from './internal/list-item-content.js';

export type {
  ListIconTile,
  ListIconTileColor,
  ListIconTileTone,
} from '../../../shared/content/list-icon-tile.js';

const PROTECTED_ROOT_DATA_ATTRIBUTES = new Set([
  'data-component',
  'data-action',
  'data-item-id',
  'data-has-icon',
  'data-has-description',
  'data-multiline',
  'data-density',
  'data-divider',
  'data-busy',
  'data-state',
  'data-kui-disabled',
  'data-icon-align',
  'data-icon-tile',
  'data-icon-tile-tone',
  'data-dragging',
  'data-drop-position',
]);

type ListItemRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-has-icon'?: never;
    'data-has-description'?: never;
    'data-multiline'?: never;
    'data-density'?: never;
    'data-divider'?: never;
    'data-busy'?: never;
    'data-state'?: never;
    'data-kui-disabled'?: never;
    'data-icon-align'?: never;
    'data-icon-tile'?: never;
    'data-icon-tile-tone'?: never;
    'data-dragging'?: never;
    'data-drop-position'?: never;
  }
>;

export interface ListItemProps {
  label: string | SafeHtml;
  /** App-owned supporting text rendered in the component's stable label stack. */
  description?: string | SafeHtml;
  icon?: SafeHtml;
  /** Present `icon` in a filled 32px rounded tile with an 18px glyph: a quiet tone preset, or `{ color, foreground? }` for an application color. */
  iconTile?: ListIconTile;
  /** Dormant author content at the row's end; a placeholder renders it as a skeleton. */
  trailing?: KerfUiContent;
  /** Dormant status metadata rendered before trailing content; a placeholder renders it as a skeleton. */
  status?: string | SafeHtml;
  /** Show a progress indicator and expose the row as busy without replacing its content; a placeholder keeps the indicator. */
  busy?: boolean;
  density?: 'standard' | 'compact' | 'spacious';
  divider?: 'none' | 'before' | 'after' | 'both';
  selected?: boolean;
  action: string;
  itemId?: string;
  className?: string;
  pressed?: boolean;
  accessibleLabel?: string;
  title?: string;
  multiline?: boolean;
  /** Alignment of an icon beside a wrapped label. Defaults to its first line. */
  multilineIconAlign?: 'first-line' | 'center';
  state?: string;
  disabled?: boolean;
  tabIndex?: number;
  /** Render the row as an unanimated loading skeleton, disabling its action: label, description, icon, status, and trailing content become skeletons; the `busy` indicator stays live. */
  placeholder?: boolean;
  /** Native HTML drag source (`draggable="true"`); a placeholder is never draggable. Pair with `wireListReorder` for pointer and keyboard reordering. */
  draggable?: boolean;
  /** Dim this row as one of the rows being dragged. */
  dragging?: boolean;
  /** Draw the insertion line at this row's leading (`before`) or trailing (`after`) block edge. */
  dropPosition?: 'before' | 'after';
  rootAttributes?: ListItemRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export interface ListItemLinkProps extends Omit<
  ListItemProps,
  'action' | 'pressed'
> {
  /** Native destination for this navigation row. */
  href: string;
  /** Open in a new tab with a safe rel and announce that behavior. */
  external?: boolean;
  action?: never;
  pressed?: never;
}

export function ListItem({
  label,
  description,
  icon,
  iconTile,
  trailing,
  status,
  busy = false,
  density = 'standard',
  divider = 'none',
  selected = false,
  action,
  itemId,
  className = '',
  pressed,
  accessibleLabel,
  title,
  multiline = false,
  multilineIconAlign = 'first-line',
  state,
  disabled = false,
  tabIndex,
  placeholder = false,
  draggable,
  dragging = false,
  dropPosition,
  rootAttributes = {},
  slot,
}: ListItemProps) {
  const extensionAttributes = filterDataAttributes(
    rootAttributes,
    PROTECTED_ROOT_DATA_ATTRIBUTES,
  );
  const tile = icon ? listIconTilePresentation(iconTile, 'list-item') : null;
  return (
    <button
      {...extensionAttributes}
      type="button"
      class={`kui-list-item ${className}`.trim()}
      title={placeholder ? undefined : title}
      disabled={disabled || placeholder}
      tabindex={placeholder ? -1 : tabIndex}
      data-component="list-item"
      data-action={placeholder ? undefined : action}
      data-item-id={itemId}
      data-has-icon={String(Boolean(icon))}
      data-has-description={String(Boolean(description))}
      data-multiline={multiline ? 'true' : undefined}
      data-icon-align={multiline ? multilineIconAlign : undefined}
      data-icon-tile={tile?.tile}
      data-icon-tile-tone={tile?.tone}
      data-density={density}
      data-divider={divider}
      data-busy={busy ? 'true' : undefined}
      data-state={state}
      data-kui-disabled={disabled ? 'true' : undefined}
      data-placeholder={placeholder ? 'true' : undefined}
      draggable={nativeDraggable(draggable, placeholder)}
      data-dragging={dragging ? 'true' : undefined}
      data-drop-position={dropPosition}
      aria-label={accessibleLabel}
      aria-current={selected ? 'page' : undefined}
      aria-pressed={pressed === undefined ? undefined : String(pressed)}
      aria-busy={placeholder || busy ? 'true' : undefined}
      slot={slot}
    >
      {listItemContent({
        label,
        description,
        icon,
        tile,
        trailing,
        status,
        busy,
        multiline,
        placeholder,
      })}
    </button>
  );
}

/** A navigation row with native link activation and ListItem geometry. */
export function ListItemLink({
  href,
  external = false,
  label,
  description,
  icon,
  iconTile,
  trailing,
  status,
  busy = false,
  density = 'standard',
  divider = 'none',
  selected = false,
  itemId,
  className = '',
  accessibleLabel,
  title,
  multiline = false,
  multilineIconAlign = 'first-line',
  state,
  disabled = false,
  tabIndex,
  placeholder = false,
  draggable,
  dragging = false,
  dropPosition,
  rootAttributes = {},
  slot,
}: ListItemLinkProps) {
  const extensionAttributes = filterDataAttributes(
    rootAttributes,
    PROTECTED_ROOT_DATA_ATTRIBUTES,
  );
  const tile = icon ? listIconTilePresentation(iconTile, 'list-item') : null;
  const inactive = disabled || placeholder;
  const linkLabel =
    accessibleLabel ??
    (external && typeof label === 'string'
      ? `${label} (opens in new tab)`
      : undefined);
  return (
    <a
      {...extensionAttributes}
      class={`kui-list-item ${className}`.trim()}
      href={inactive ? undefined : href}
      target={inactive || !external ? undefined : '_blank'}
      rel={inactive || !external ? undefined : 'noopener noreferrer'}
      title={placeholder ? undefined : title}
      tabindex={inactive ? -1 : tabIndex}
      data-component="list-item-link"
      data-item-id={itemId}
      data-has-icon={String(Boolean(icon))}
      data-has-description={String(Boolean(description))}
      data-multiline={multiline ? 'true' : undefined}
      data-icon-align={multiline ? multilineIconAlign : undefined}
      data-icon-tile={tile?.tile}
      data-icon-tile-tone={tile?.tone}
      data-density={density}
      data-divider={divider}
      data-busy={busy ? 'true' : undefined}
      data-state={state}
      data-kui-disabled={disabled ? 'true' : undefined}
      data-placeholder={placeholder ? 'true' : undefined}
      draggable={nativeDraggable(draggable, placeholder)}
      data-dragging={dragging ? 'true' : undefined}
      data-drop-position={dropPosition}
      aria-label={linkLabel}
      aria-current={selected ? 'page' : undefined}
      aria-disabled={inactive ? 'true' : undefined}
      aria-busy={placeholder || busy ? 'true' : undefined}
      slot={slot}
    >
      {listItemContent({
        label,
        description,
        icon,
        tile,
        trailing,
        status,
        busy,
        multiline,
        placeholder,
      })}
    </a>
  );
}
