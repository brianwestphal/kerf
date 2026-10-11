/**
 * The PopupMenu implementation before KF-GVCMC7, frozen as a reference: the
 * streaming hash and markup cache must render byte-identical HTML, including
 * the `data-key` digest, for the same props.
 */
import type {
  PopupMenuEntry,
  PopupMenuProps,
} from '../../src/components/actions/popup-menu/popup-menu.js';

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

function renderEntry(entry: PopupMenuEntry, nested = false) {
  if (entry.kind === 'divider')
    return <wa-divider slot={nested ? 'submenu' : undefined} />;
  // A group title styled like the Select's group title. It is not a slotted
  // h1-h6, whose Web Awesome group-label metrics are !important.
  if (entry.kind === 'heading')
    return (
      <div
        class="kui-popup-menu__heading"
        slot={nested ? 'submenu' : undefined}
      >
        {entry.label}
      </div>
    );
  return (
    <wa-dropdown-item
      {...(entry.attributes ?? {})}
      slot={nested ? 'submenu' : undefined}
      data-action={entry.action}
      value={entry.value}
      type={entry.checked === undefined ? undefined : 'checkbox'}
      checked={entry.checked}
      variant={entry.tone === 'danger' ? 'danger' : undefined}
      disabled={entry.disabled}
      title={entry.disabled ? entry.disabledReason : undefined}
    >
      {entry.icon ? (
        <span slot="icon" class="kui-popup-menu__icon">
          {entry.icon}
        </span>
      ) : null}
      {entry.label}
      {entry.details ? (
        <span slot="details" class="kui-popup-menu__details">
          {entry.details}
        </span>
      ) : entry.submenu ? (
        <span slot="details" />
      ) : null}
      {entry.submenu?.map((child) => renderEntry(child, true))}
    </wa-dropdown-item>
  );
}

export function LegacyPopupMenu({
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
}: PopupMenuProps) {
  // Web Awesome owns the trigger and item DOM once upgraded, so the morph
  // skips the children; the content key rebuilds the menu when they change.
  const key = `kui-popup-menu-${contentKey([
    text ?? '',
    label ?? '',
    String(icon ?? ''),
    String(caret),
    String(disabled),
    String(context),
    ...items.map(entryKey),
  ])}`;
  // size="m" is Web Awesome's reflected default; rendering it keeps a
  // re-render's morph from stripping it and forcing a Lit update.
  return (
    <wa-dropdown
      size="m"
      {...rootAttributes}
      class="kui-popup-menu"
      data-component="popup-menu"
      data-key={key}
      data-morph-skip-children
      data-trigger={context ? 'context' : 'button'}
      placement={placement}
      slot={slot}
    >
      {context ? (
        <button
          type="button"
          slot="trigger"
          class="kui-popup-menu__context-anchor"
          aria-label={label}
          aria-hidden="true"
          tabindex={-1}
        />
      ) : (
        <wa-button
          slot="trigger"
          appearance="plain"
          with-caret={caret}
          disabled={disabled}
        >
          {icon}
          {text ? (
            <span>{text}</span>
          ) : (
            <span class="kui-popup-menu__label">{label}</span>
          )}
        </wa-button>
      )}
      {items.map((entry) => renderEntry(entry))}
    </wa-dropdown>
  );
}
