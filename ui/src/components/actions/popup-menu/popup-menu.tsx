import type { SafeHtml } from 'kerfjs';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';

export type PopupMenuPlacement =
  'bottom-start' | 'bottom' | 'bottom-end' | 'top-start' | 'top' | 'top-end';

type PopupMenuDataAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-action'?: never;
    'data-component'?: never;
    'data-key'?: never;
    'data-morph-skip-children'?: never;
  }
>;

/** One command in the menu. */
export interface PopupMenuItem {
  kind?: 'item';
  label: string;
  /** Delegated `data-action` the app handles when the item is chosen. */
  action?: string;
  /** Native `wa-dropdown-item` value, reported by its `wa-select` event. */
  value?: string;
  /** Leading icon, typically a `LucideIcon`; it is placed in the item's icon slot. */
  icon?: SafeHtml;
  /** A checkbox choice, including nested choices; omit for a plain command. */
  checked?: boolean;
  /** Trailing safe content, such as secondary status. */
  details?: SafeHtml;
  /** Destructive command styling. */
  tone?: 'default' | 'danger';
  disabled?: boolean;
  /** Native tooltip text for a disabled command. */
  disabledReason?: string;
  /** Application `data-*` metadata such as a record id. */
  attributes?: PopupMenuDataAttributes;
  /** Child commands, headings, and dividers opened by hover or keyboard navigation. */
  submenu?: readonly PopupMenuEntry[];
}

/** A labeled group heading; items that follow it belong to the group. */
export interface PopupMenuHeading {
  kind: 'heading';
  label: string;
}

/** A separator between groups of items. */
export interface PopupMenuDivider {
  kind: 'divider';
}

export type PopupMenuEntry =
  PopupMenuItem | PopupMenuHeading | PopupMenuDivider;

type PopupMenuTriggerName =
  | {
      /** Visible trigger text, which is also its accessible name. */
      text: string;
      label?: never;
    }
  | {
      text?: never;
      /**
       * Accessible name of an icon-only trigger, rendered as visually hidden
       * slotted text (a Web Awesome button takes its name from its content).
       */
      label: string;
    };

type PopupMenuTrigger =
  | (PopupMenuTriggerName & { context?: false })
  | {
      context: true;
      label: string;
      text?: never;
      icon?: never;
      caret?: never;
      disabled?: never;
    };

export type PopupMenuProps = PopupMenuTrigger & {
  /** Trigger icon, typically a `LucideIcon`, before any visible text. */
  icon?: KerfUiContent;
  items: readonly PopupMenuEntry[];
  /** Where the menu opens relative to its trigger. Defaults to `bottom-start`. */
  placement?: PopupMenuPlacement;
  /** Show the disclosure caret after the trigger content. Defaults to true. */
  caret?: boolean;
  disabled?: boolean;
  /** Application `data-*` metadata on the menu root. */
  rootAttributes?: PopupMenuDataAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
};

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

/** A rendered context PopupMenu with Web Awesome's controlled open state. */
export type PopupMenuElement = HTMLElement & { open: boolean };

/** Open a context PopupMenu at viewport pointer coordinates. */
export function openPopupMenuAt(
  menu: PopupMenuElement,
  x: number,
  y: number,
): void {
  menu.style.setProperty('--kui-popup-menu-context-x', `${x}px`);
  menu.style.setProperty('--kui-popup-menu-context-y', `${y}px`);
  menu.open = true;
}

/** Close a programmatically opened PopupMenu. */
export function closePopupMenu(menu: PopupMenuElement): void {
  menu.open = false;
}

/**
 * An action menu: a trigger button that opens a list of commands. Renders the
 * `wa-dropdown` root directly, so a `single` `ToolbarControlGroup` (with
 * `nestedDropdown`) or a `PopupSurface` sizes and insets it as usual. Items
 * dispatch through delegated `data-action`s; the app owns the commands and any
 * open-state reaction. Import `@kerfjs/ui/popup-menu/register` once to register
 * the Web Awesome elements. At viewport widths up to 480px, submenus appear
 * above or below their parent menu so their rows do not cover the parent list.
 */
export function PopupMenu({
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
