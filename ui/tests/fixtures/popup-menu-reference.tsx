/**
 * A plain, uncached PopupMenu render kept as a reference: the streaming hash
 * and markup cache must render byte-identical HTML for the same props, and
 * the `data-key` digest must equal this character-by-character FNV-1a digest
 * whenever no part is long enough to be hashed as its own memoized digest.
 */
import type { SafeHtml } from 'kerfjs';
import { Check } from 'lucide';

import type {
  PopupMenuEntry,
  PopupMenuItem,
  PopupMenuProps,
} from '../../src/components/actions/popup-menu/popup-menu.js';
import { LucideIcon } from '../../src/components/media/lucide-icon/lucide-icon.js';
import {
  PopupCaretGlyph,
  PopupSubmenuGlyph,
} from '../../src/shared/popup/popup-glyphs.js';

/** A short, stable FNV-1a digest of the trigger and item structure. */
function contentKey(parts: readonly string[]): string {
  let hash = 0x811c9dc5;
  for (const character of parts.join('\u0000')) {
    hash ^= character.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function entryKey(entry: PopupMenuEntry): string {
  if (entry.kind === 'divider') return '-';
  if (entry.kind === 'heading') return `#${entry.label}`;
  return [
    entry.label,
    entry.action ?? '',
    entry.value ?? '',
    entry.disabled ? '1' : '0',
    entry.checked === undefined ? '-' : entry.checked ? '1' : '0',
    entry.tone ?? '',
    entry.disabledReason ?? '',
    String(entry.icon ?? ''),
    String(entry.details ?? ''),
    JSON.stringify(entry.attributes ?? {}),
    ...(entry.submenu ?? []).map(entryKey),
  ].join('\u0001');
}

type Command = PopupMenuItem & { kind?: 'item' };

const isCommand = (entry: PopupMenuEntry): entry is Command =>
  entry.kind !== 'heading' && entry.kind !== 'divider';

function item(entry: Command, choiceLevel: boolean) {
  const choice = entry.checked !== undefined;
  const button = (
    <button
      {...(entry.attributes ?? {})}
      type="button"
      class="kui-popup-menu__item"
      role={choice ? 'menuitemcheckbox' : 'menuitem'}
      tabindex={-1}
      data-action={entry.action}
      value={entry.value}
      data-tone={entry.tone === 'danger' ? 'danger' : undefined}
      aria-checked={choice ? String(entry.checked) : undefined}
      aria-disabled={entry.disabled ? 'true' : undefined}
      aria-haspopup={entry.submenu ? 'menu' : undefined}
      aria-expanded={entry.submenu ? 'false' : undefined}
      title={entry.disabled ? entry.disabledReason : undefined}
    >
      {choiceLevel ? (
        <span class="kui-popup-menu__check" aria-hidden="true">
          {choice ? <LucideIcon icon={Check} name="check" /> : null}
        </span>
      ) : null}
      {entry.icon ? (
        <span class="kui-popup-menu__icon" aria-hidden="true">
          {entry.icon}
        </span>
      ) : null}
      <span class="kui-popup-menu__item-label">{entry.label}</span>
      {entry.details ? (
        <span class="kui-popup-menu__details">{entry.details}</span>
      ) : null}
      {entry.submenu ? (
        <span class="kui-popup-menu__submenu-icon" aria-hidden="true">
          <PopupSubmenuGlyph />
        </span>
      ) : null}
    </button>
  );
  if (!entry.submenu) return button;
  return (
    <div class="kui-popup-menu__submenu-host" role="none">
      {button}
      {menu(entry.submenu, entry.label, true)}
    </div>
  );
}

function menu(
  entries: readonly PopupMenuEntry[],
  name: string | undefined,
  submenu: boolean,
) {
  const choiceLevel = entries.some(
    (entry) => isCommand(entry) && entry.checked !== undefined,
  );
  const rows: SafeHtml[] = [];
  let group: { label: string; members: SafeHtml[] } | null = null;
  const flush = () => {
    if (!group) return;
    rows.push(
      <div class="kui-popup-menu__group" role="group" aria-label={group.label}>
        <div class="kui-popup-menu__heading" aria-hidden="true">
          {group.label}
        </div>
        {group.members}
      </div>,
    );
    group = null;
  };
  for (const entry of entries) {
    if (entry.kind === 'divider') {
      flush();
      rows.push(<div class="kui-popup-menu__divider" role="separator" />);
    } else if (entry.kind === 'heading') {
      flush();
      group = { label: entry.label, members: [] };
    } else if (group) group.members.push(item(entry, choiceLevel));
    else rows.push(item(entry, choiceLevel));
  }
  flush();
  return (
    <div
      class="kui-popup-menu__menu"
      role="menu"
      popover="manual"
      tabindex={-1}
      aria-label={name}
      data-submenu={submenu ? '' : undefined}
    >
      {rows}
    </div>
  );
}

export function ReferencePopupMenu({
  text,
  label,
  icon,
  items,
  placement = 'bottom-start',
  caret = true,
  disabled = false,
  rootAttributes = {},
  slot,
  context = false,
  anchor,
}: PopupMenuProps) {
  const key = `kui-popup-menu-${contentKey([
    text ?? '',
    label ?? '',
    String(icon ?? ''),
    String(caret),
    String(disabled),
    String(context),
    ...items.map(entryKey),
  ])}`;
  return (
    <span
      {...rootAttributes}
      class="kui-popup-menu"
      data-component="popup-menu"
      data-key={key}
      data-morph-skip-children
      data-trigger={context ? 'context' : 'button'}
      data-placement={placement}
      style={
        anchor
          ? `--kui-popup-menu-context-x:${anchor.x}px;--kui-popup-menu-context-y:${anchor.y}px`
          : undefined
      }
      slot={slot}
    >
      {context ? (
        <button
          type="button"
          class="kui-popup-menu__context-anchor"
          aria-hidden="true"
          tabindex={-1}
        />
      ) : (
        <button
          type="button"
          class="kui-popup-menu__trigger"
          aria-haspopup="menu"
          aria-expanded="false"
          disabled={disabled}
        >
          {icon}
          {text ? (
            <span class="kui-popup-menu__text">{text}</span>
          ) : (
            <span class="kui-popup-menu__label">{label}</span>
          )}
          {caret ? (
            <span class="kui-popup-menu__caret" aria-hidden="true">
              <PopupCaretGlyph />
            </span>
          ) : null}
        </button>
      )}
      {menu(items, text ?? label, false)}
    </span>
  );
}
