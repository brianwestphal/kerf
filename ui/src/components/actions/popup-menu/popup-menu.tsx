import type { SafeHtml } from 'kerfjs';
import { Check } from 'lucide';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  PopupCaretGlyph,
  PopupSubmenuGlyph,
} from '../../../shared/popup/popup-glyphs.js';
import { LucideIcon } from '../../media/lucide-icon/lucide-icon.js';
import {
  cachedPopupMenuContent,
  cachePopupMenuContent,
  popupMenuContentKey,
} from './internal/popup-menu-content-cache.js';
import {
  POPUP_MENU_CLOSE_EVENT,
  POPUP_MENU_OPEN_EVENT,
  type PopupMenuOpenDetail,
} from './internal/popup-menu-events.js';

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
  /** The item's value, reported in the menu's `kui-menu-select` event. */
  value?: string;
  /** Leading icon, typically a `LucideIcon`, before the label. */
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
      triggerContent?: never;
    }
  | {
      text?: never;
      /**
       * Accessible name of an icon-only trigger, rendered as visually hidden
       * text inside the trigger button.
       */
      label: string;
      triggerContent?: never;
    }
  | {
      text?: never;
      /**
       * The trigger's accessible name ("Status: Started"); the visible
       * content is hidden from assistive technology.
       */
      label: string;
      /**
       * Visible content that is the whole trigger, such as a `Badge` showing
       * the current status. Kerf owns the bare button around it (no chrome,
       * a pill focus ring, the pointer cursor, `aria-haspopup`), and the
       * caret is off unless `caret` is set.
       */
      triggerContent: KerfUiContent;
      icon?: never;
    };

/** A context PopupMenu's viewport anchor point. */
export interface PopupMenuAnchor {
  x: number;
  y: number;
}

type PopupMenuTrigger =
  | (PopupMenuTriggerName & { context?: false; anchor?: never })
  | {
      context: true;
      label: string;
      triggerContent?: never;
      /**
       * The viewport point (CSS pixels, as in `MouseEvent.clientX/Y`) the
       * menu opens from. Rendered into the menu itself, so it survives
       * re-renders and replacement; open it with `openPopupMenu`.
       */
      anchor?: PopupMenuAnchor;
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

type PopupMenuCommand = PopupMenuItem & { kind?: 'item' };

const isCommand = (entry: PopupMenuEntry): entry is PopupMenuCommand =>
  entry.kind !== 'heading' && entry.kind !== 'divider';

/** Whether a menu level holds a checkbox choice, so its plain items reserve the check column. */
function hasChoice(entries: readonly PopupMenuEntry[]): boolean {
  return entries.some(
    (entry) => isCommand(entry) && entry.checked !== undefined,
  );
}

function renderItem(entry: PopupMenuCommand, levelHasChoice: boolean) {
  // A plain command beside checkbox choices keeps their check column, so its
  // icon and label line up with theirs.
  const choice = entry.checked !== undefined;
  const item = (
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
      {levelHasChoice ? (
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
  if (!entry.submenu) return item;
  return (
    <div class="kui-popup-menu__submenu-host" role="none">
      {item}
      {renderMenu(entry.submenu, entry.label, true)}
    </div>
  );
}

/**
 * One menu level: its entries in order, with each heading opening a labeled
 * group that holds the items up to the next heading or divider.
 */
function renderEntries(entries: readonly PopupMenuEntry[]): SafeHtml[] {
  const levelHasChoice = hasChoice(entries);
  const out: SafeHtml[] = [];
  let index = 0;
  while (index < entries.length) {
    const entry = entries[index]!;
    if (entry.kind === 'divider') {
      out.push(<div class="kui-popup-menu__divider" role="separator" />);
      index += 1;
      continue;
    }
    if (entry.kind === 'heading') {
      const members: SafeHtml[] = [];
      index += 1;
      while (index < entries.length) {
        const member = entries[index]!;
        if (!isCommand(member)) break;
        members.push(renderItem(member, levelHasChoice));
        index += 1;
      }
      out.push(
        <div
          class="kui-popup-menu__group"
          role="group"
          aria-label={entry.label}
        >
          <div class="kui-popup-menu__heading" aria-hidden="true">
            {entry.label}
          </div>
          {members}
        </div>,
      );
      continue;
    }
    out.push(renderItem(entry, levelHasChoice));
    index += 1;
  }
  return out;
}

function renderMenu(
  entries: readonly PopupMenuEntry[],
  name: string | undefined,
  submenu: boolean,
) {
  return (
    <div
      class="kui-popup-menu__menu"
      role="menu"
      popover="manual"
      tabindex={-1}
      aria-label={name}
      data-submenu={submenu ? '' : undefined}
    >
      {renderEntries(entries)}
    </div>
  );
}

/** A rendered PopupMenu root, the element the open and close helpers take. */
export type PopupMenuElement = HTMLElement;

function requestOpen(menu: PopupMenuElement, detail: PopupMenuOpenDetail) {
  menu.dispatchEvent(
    new CustomEvent<PopupMenuOpenDetail>(POPUP_MENU_OPEN_EVENT, { detail }),
  );
}

/**
 * Open a PopupMenu at viewport pointer coordinates. A `context` menu rendered
 * without `anchor` moves its invisible anchor there (a menu rendered with
 * `anchor` opens with `openPopupMenu` instead). A button-triggered menu (such
 * as a `ListActionRow` trailing menu) opens `bottom-start` from the point,
 * like a context menu, for this opening only; its next opening returns to its
 * trigger and placement. Needs the `/register` entry.
 */
export function openPopupMenuAt(
  menu: PopupMenuElement,
  x: number,
  y: number,
): void {
  menu.style.setProperty('--kui-popup-menu-context-x', `${x}px`);
  menu.style.setProperty('--kui-popup-menu-context-y', `${y}px`);
  requestOpen(menu, { point: { x, y } });
}

/**
 * Open a PopupMenu from its trigger, or a context PopupMenu at the `anchor`
 * it was rendered with (or the point a previous `openPopupMenuAt` set).
 * Needs the `/register` entry.
 */
export function openPopupMenu(menu: PopupMenuElement): void {
  requestOpen(menu, {});
}

/** Close an open PopupMenu, and any submenu it shows. */
export function closePopupMenu(menu: PopupMenuElement): void {
  menu.dispatchEvent(new CustomEvent(POPUP_MENU_CLOSE_EVENT));
}

interface PopupMenuContentProps {
  context: boolean;
  label: string | undefined;
  icon: KerfUiContent;
  triggerContent: KerfUiContent;
  text: string | undefined;
  caret: boolean;
  disabled: boolean;
  items: readonly PopupMenuEntry[];
}

/** The trigger and the menu: everything inside the root. */
function renderContent({
  context,
  label,
  icon,
  triggerContent,
  text,
  caret,
  disabled,
  items,
}: PopupMenuContentProps): SafeHtml {
  return (
    <>
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
          {triggerContent === undefined ? null : (
            <span class="kui-popup-menu__trigger-content" aria-hidden="true">
              {triggerContent}
            </span>
          )}
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
      {renderMenu(items, text ?? label, false)}
    </>
  );
}

/**
 * An action menu: a trigger button that opens a list of commands in the top
 * layer. A `single` `ToolbarControlGroup` (with `nestedDropdown`) or a
 * `PopupSurface` sizes and insets it as usual. Items dispatch through
 * delegated `data-action`s, and the root reports each choice as a bubbling
 * `kui-menu-select` event; the app owns the commands and any open-state reaction.
 * Import `@kerfjs/ui/popup-menu/register` once to wire opening, keyboard
 * navigation, submenus, and dismissal. At viewport widths up to 480px,
 * submenus appear above or below their parent menu so their rows do not cover
 * the parent list.
 */
export function PopupMenu({
  text,
  label,
  icon,
  triggerContent,
  items,
  placement = 'bottom-start',
  caret = triggerContent === undefined,
  disabled = false,
  rootAttributes = {},
  slot,
  context = false,
  anchor,
}: PopupMenuProps) {
  if (
    anchor !== undefined &&
    (!context || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y))
  )
    throw new RangeError(
      'PopupMenu anchor requires context mode and finite x and y coordinates',
    );
  // The register owns the open menu's state (shown popovers, `aria-expanded`,
  // checked toggles, focus), so the morph skips the children; the content key
  // rebuilds the menu when they change. An unchanged menu reuses its cached
  // markup and costs one hash pass.
  const { key, cacheKey } = popupMenuContentKey(
    [
      text ?? '',
      label ?? '',
      String(icon ?? ''),
      String(caret),
      String(disabled),
      String(context),
      // Only a content trigger adds a part, so other menus keep their keys.
      ...(triggerContent === undefined ? [] : [String(triggerContent)]),
    ],
    items,
  );
  let content = cachedPopupMenuContent(cacheKey);
  if (!content) {
    content = renderContent({
      context,
      label,
      icon,
      triggerContent,
      text,
      caret,
      disabled,
      items,
    });
    cachePopupMenuContent(cacheKey, content);
  }
  return (
    <span
      {...rootAttributes}
      class="kui-popup-menu"
      data-component="popup-menu"
      data-key={key}
      data-morph-skip-children
      data-trigger={
        context
          ? 'context'
          : triggerContent === undefined
            ? 'button'
            : 'content'
      }
      data-placement={placement}
      style={
        anchor
          ? `--kui-popup-menu-context-x:${anchor.x}px;--kui-popup-menu-context-y:${anchor.y}px`
          : undefined
      }
      slot={slot}
    >
      {content}
    </span>
  );
}
