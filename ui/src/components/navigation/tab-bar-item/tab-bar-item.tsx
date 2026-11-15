import type { SafeHtml } from 'kerfjs';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import { em } from '../../../shared/styles/css-values.js';
import {
  type MiddleTruncateKeep,
  splitMiddle,
} from '../../../shared/text/split-middle.js';
import { Skeleton } from '../../feedback/skeleton/skeleton.js';

const PROTECTED_ROOT_DATA_ATTRIBUTES = new Set([
  'data-component',
  'data-action',
  'data-tab-id',
  'data-selected',
  'data-tab-dragging',
  'data-tab-drop-position',
  'data-attention',
  'data-drop-target',
  'data-name-overflow',
  'data-name-truncate',
  'data-disabled',
]);

type TabBarItemRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-tab-id'?: never;
    'data-selected'?: never;
    'data-tab-dragging'?: never;
    'data-tab-drop-position'?: never;
    'data-attention'?: never;
    'data-drop-target'?: never;
    'data-name-overflow'?: never;
    'data-name-truncate'?: never;
    'data-disabled'?: never;
  }
>;

export type TabBarItemPresentation = 'pill' | 'segmented' | 'icon-only';
export type TabBarItemSize = 'default' | 'compact';
export type TabBarItemNameOverflow = 'ellipsis' | 'visible';
/**
 * Where an ellipsizing name places its ellipsis: `end` (default) keeps the
 * start, `start` keeps the tail (a run id at the end of a session name), and
 * `middle` keeps the start and a suffix (a file path's last segment).
 */
export type TabBarItemNameTruncate = 'end' | 'middle' | 'start';
/**
 * The suffix `nameTruncate="middle"` always keeps: a number of trailing
 * characters, or `segment` (default) for the last path segment, or the last
 * 10 characters when the name has no separator.
 */
export type TabBarItemNameTruncateKeep = MiddleTruncateKeep;

export interface TabBarItemProps {
  id: string;
  name: string;
  selected?: boolean;
  /** Keep the visible name while excluding the tab from selection, focus, closing, and reordering. */
  disabled?: boolean;
  /** DOM ID of the role=tab button, for an application-owned tabpanel's aria-labelledby. */
  tabId?: string;
  /** DOM ID of the application-owned tabpanel controlled by this tab. */
  panelId?: string;
  /** Emphasize the visible tab name with the attention color token. */
  attention?: boolean;
  /** Highlight this tab as the target of a drag over its content. */
  dropTarget?: boolean;
  /** Show the tab's close button (default `true`); `false` makes a fixed tab. */
  closable?: boolean;
  draggable?: boolean;
  leading?: KerfUiContent;
  trailing?: KerfUiContent;
  /** Visual treatment within a TabBar. Icon-only tabs retain `name` as their accessible name. */
  presentation?: TabBarItemPresentation;
  /** Compact tabs use the 32px application-rail height. */
  size?: TabBarItemSize;
  /** Maximum visible label width in CSS pixels before ellipsis. */
  labelMaxWidth?: number;
  /**
   * `'ellipsis'` (default): in a narrowing intrinsic TabBar the tab gives up
   * width by ellipsizing its name down to a few characters before the strip
   * scrolls, and `wireTabBars` gives a truncated tab its full name as a
   * `title`. `'visible'` keeps the full name visible (and the tab at its full
   * width) for an inline loading treatment.
   */
  nameOverflow?: TabBarItemNameOverflow;
  /**
   * Where an ellipsizing name (`nameOverflow="ellipsis"`) places its
   * ellipsis: `end` (default), `start` to keep its tail, or `middle` to keep
   * its start and a suffix (`nameTruncateKeep`). Two tabs whose names differ
   * only at the end stay distinguishable. For left-to-right names. The full
   * name stays the tab's accessible name and, when truncated, its `title`.
   */
  nameTruncate?: TabBarItemNameTruncate;
  /** The suffix `nameTruncate="middle"` keeps (default `segment`). */
  nameTruncateKeep?: TabBarItemNameTruncateKeep;
  /** Decorative dormant content for the close button. Must not contain interactive descendants. */
  closeIcon?: SafeHtml;
  selectAction?: string;
  closeAction?: string;
  className?: string;
  /** Render as an unanimated loading skeleton, disabling select/close and dragging. */
  placeholder?: boolean;
  /**
   * Named and still opening: the tab is known but its content is loading.
   * Keeps `name` visible in the quiet text color and as the tab's accessible
   * name, shows `trailing` (for example a `LoadingSpinner`), and marks the
   * tab `aria-busy`. Unlike `placeholder` it stays selectable — the
   * application shows placeholder content in its panel until loading
   * completes — while close and dragging stay disabled. Same pill geometry
   * as the live tab, so swapping it in place does not shift the bar.
   * `placeholder` wins when both are set.
   */
  pending?: boolean;
  rootAttributes?: TabBarItemRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.25"
      stroke-linecap="round"
    >
      <path d="m7 7 10 10" />
      <path d="M17 7 7 17" />
    </svg>
  );
}

export function TabBarItem({
  id,
  name,
  selected = false,
  disabled = false,
  tabId,
  panelId,
  attention = false,
  dropTarget = false,
  closable = true,
  draggable = false,
  leading,
  trailing,
  presentation = 'pill',
  size = 'default',
  labelMaxWidth,
  nameOverflow = 'ellipsis',
  nameTruncate = 'end',
  nameTruncateKeep,
  closeIcon,
  selectAction = 'select-tab',
  closeAction = 'close-tab',
  className = '',
  placeholder = false,
  pending = false,
  rootAttributes = {},
  slot,
}: TabBarItemProps) {
  // Both loading states disable close and dragging; a `placeholder` (unknown
  // tab) is also unselectable and hides its name, while a `pending` (known,
  // still opening) tab stays selectable so its panel can show placeholders.
  const dormant = placeholder || pending;
  const unavailable = disabled || placeholder;
  const closeUnavailable = disabled || dormant;
  const named = pending && !placeholder;
  // A named, ellipsizing tab gives up width before its strip scrolls: the
  // label sizes itself from this copy of the name (hidden CSS generated
  // content) so its minimum is a few characters, not the whole name.
  const shrinkable =
    !placeholder && nameOverflow === 'ellipsis' && presentation !== 'icon-only';
  if (
    !['end', 'middle', 'start'].includes(nameTruncate) ||
    (nameTruncateKeep !== undefined &&
      (nameTruncate !== 'middle' ||
        (nameTruncateKeep !== 'segment' &&
          (!Number.isSafeInteger(nameTruncateKeep) || nameTruncateKeep < 1))))
  )
    throw new RangeError(
      'TabBarItem nameTruncate must be end, middle, or start; nameTruncateKeep requires nameTruncate="middle" and a positive integer or "segment"',
    );
  // Start and middle truncation apply only to a visible, ellipsizing name;
  // the button's aria-label then carries the plain full name.
  const truncate = shrinkable ? nameTruncate : 'end';
  const keyshortcuts = [
    closable && !closeUnavailable ? 'Delete Backspace' : '',
    draggable && !closeUnavailable
      ? 'Alt+Shift+ArrowLeft Alt+Shift+ArrowRight'
      : '',
  ]
    .filter(Boolean)
    .join(' ');
  const extensionAttributes = filterDataAttributes(
    rootAttributes,
    PROTECTED_ROOT_DATA_ATTRIBUTES,
  );
  return (
    <div
      {...extensionAttributes}
      class={`kui-tab-bar-item ${className}`.trim()}
      data-component="tab-bar-item"
      data-tab-id={id}
      data-selected={String(selected)}
      data-attention={attention ? 'true' : undefined}
      data-drop-target={dropTarget ? 'true' : undefined}
      data-name-overflow={nameOverflow}
      data-name-truncate={truncate === 'end' ? undefined : truncate}
      data-presentation={presentation}
      data-size={size}
      data-placeholder={placeholder ? 'true' : undefined}
      data-pending={named ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      draggable={closeUnavailable ? 'false' : draggable ? 'true' : 'false'}
      aria-busy={dormant ? 'true' : undefined}
      style={
        labelMaxWidth === undefined
          ? undefined
          : `--kui-tab-bar-item-label-max-width:${labelMaxWidth}px`
      }
      slot={slot}
    >
      {closable && (
        <button
          type="button"
          tabindex="-1"
          class="kui-tab-bar-item__close"
          data-action={closeUnavailable ? undefined : closeAction}
          data-tab-id={id}
          disabled={closeUnavailable || undefined}
          aria-label={`Close ${name}`}
          title={`Close ${name}`}
        >
          <span class="kui-tab-bar-item__close-icon" aria-hidden="true">
            {closeIcon ?? <CloseIcon />}
          </span>
        </button>
      )}
      <button
        type="button"
        class="kui-tab-bar-item__select"
        role="tab"
        id={tabId}
        aria-controls={panelId}
        aria-selected={String(selected)}
        aria-label={
          presentation === 'icon-only' || named || truncate !== 'end'
            ? name
            : undefined
        }
        aria-keyshortcuts={keyshortcuts || undefined}
        data-action={unavailable ? undefined : selectAction}
        data-tab-id={id}
        disabled={unavailable || undefined}
        tabindex={!unavailable && selected ? '0' : '-1'}
      >
        {leading}
        <span
          class="kui-tab-bar-item__label"
          data-kui-tab-name={shrinkable ? name : undefined}
        >
          <span
            class="kui-tab-bar-item__name"
            aria-hidden={presentation === 'icon-only' ? 'true' : undefined}
          >
            {placeholder ? (
              <Skeleton width={em(7)} />
            ) : (
              truncatedName(name, truncate, nameTruncateKeep)
            )}
          </span>
        </span>
        {closable || trailing ? (
          <span class="kui-tab-bar-item__trailing">{trailing}</span>
        ) : undefined}
      </button>
    </div>
  );
}

/** U+200E LEFT-TO-RIGHT MARK. */
const LRM = '\u200E';

/** The visible name for its truncation position. */
function truncatedName(
  name: string,
  truncate: TabBarItemNameTruncate,
  keep: TabBarItemNameTruncateKeep | undefined,
): KerfUiContent | string {
  switch (truncate) {
    case 'start':
      // Left-to-right marks keep the name's own order and edge punctuation
      // in the right-to-left clip box. An isolating `dir="ltr"` span would
      // too, but WebKit then draws no leading ellipsis.
      return `${LRM}${name}${LRM}`;
    case 'middle': {
      const [head, tail] = splitMiddle(name, keep ?? 'segment');
      return (
        <>
          <span class="kui-tab-bar-item__name-head">{head}</span>
          {tail ? <span class="kui-tab-bar-item__name-tail">{tail}</span> : ''}
        </>
      );
    }
    case 'end':
      return name;
  }
}
