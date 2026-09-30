import type { SafeHtml } from 'kerfjs';

import { em } from './css-values.js';
import { filterDataAttributes } from './extension-attributes.js';
import type { KerfUiContent } from './semantic-content.js';
import { Skeleton } from './skeleton.js';

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
]);

type AppTabRootAttributes = Readonly<
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
  }
>;

export type AppTabPresentation = 'pill' | 'segmented' | 'icon-only';
export type AppTabSize = 'default' | 'compact';
export type AppTabNameOverflow = 'ellipsis' | 'visible';

export interface AppTabProps {
  id: string;
  name: string;
  selected?: boolean;
  /** Emphasize the visible tab name with the attention color token. */
  attention?: boolean;
  /** Highlight this tab as the target of a drag over its content. */
  dropTarget?: boolean;
  closable?: boolean;
  draggable?: boolean;
  leading?: KerfUiContent;
  trailing?: KerfUiContent;
  /** Visual treatment within a TabBar. Icon-only tabs retain `name` as their accessible name. */
  presentation?: AppTabPresentation;
  /** Compact tabs use the 32px application-rail height. */
  size?: AppTabSize;
  /** Maximum visible label width in CSS pixels before ellipsis. */
  labelMaxWidth?: number;
  /** Keep the full name visible for an inline loading treatment. */
  nameOverflow?: AppTabNameOverflow;
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
  rootAttributes?: AppTabRootAttributes;
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
      <path d="m7 7 10 10"></path>
      <path d="M17 7 7 17"></path>
    </svg>
  );
}

export function AppTab({
  id,
  name,
  selected = false,
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
  closeIcon,
  selectAction = 'select-tab',
  closeAction = 'close-tab',
  className = '',
  placeholder = false,
  pending = false,
  rootAttributes = {},
  slot,
}: AppTabProps) {
  // Both loading states disable close and dragging; a `placeholder` (unknown
  // tab) is also unselectable and hides its name, while a `pending` (known,
  // still opening) tab stays selectable so its panel can show placeholders.
  const dormant = placeholder || pending;
  const named = pending && !placeholder;
  const keyshortcuts = [
    closable && !dormant ? 'Delete Backspace' : '',
    draggable && !dormant ? 'Alt+Shift+ArrowLeft Alt+Shift+ArrowRight' : '',
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
      class={`kui-app-tab ${className}`.trim()}
      data-component="app-tab"
      data-tab-id={id}
      data-selected={String(selected)}
      data-attention={attention ? 'true' : undefined}
      data-drop-target={dropTarget ? 'true' : undefined}
      data-name-overflow={nameOverflow}
      data-presentation={presentation}
      data-size={size}
      data-placeholder={placeholder ? 'true' : undefined}
      data-pending={named ? 'true' : undefined}
      draggable={dormant ? 'false' : draggable ? 'true' : 'false'}
      aria-busy={dormant ? 'true' : undefined}
      style={
        labelMaxWidth === undefined
          ? undefined
          : `--kui-app-tab-label-max-width:${labelMaxWidth}px`
      }
      slot={slot}
    >
      {closable && (
        <button
          type="button"
          tabindex="-1"
          class="kui-app-tab__close"
          data-action={dormant ? undefined : closeAction}
          data-tab-id={id}
          disabled={dormant || undefined}
          aria-label={`Close ${name}`}
          title={`Close ${name}`}
        >
          <span class="kui-app-tab__close-icon" aria-hidden="true">
            {closeIcon ?? <CloseIcon />}
          </span>
        </button>
      )}
      <button
        type="button"
        class="kui-app-tab__select"
        role="tab"
        aria-selected={String(selected)}
        aria-label={presentation === 'icon-only' || named ? name : undefined}
        aria-keyshortcuts={keyshortcuts || undefined}
        data-action={placeholder ? undefined : selectAction}
        data-tab-id={id}
        disabled={placeholder || undefined}
        tabindex={!placeholder && selected ? '0' : '-1'}
      >
        {leading}
        <span
          class="kui-app-tab__name"
          aria-hidden={presentation === 'icon-only' ? 'true' : undefined}
        >
          {placeholder ? <Skeleton width={em(7)} /> : name}
        </span>
        {closable || trailing ? (
          <span class="kui-app-tab__trailing">{trailing}</span>
        ) : undefined}
      </button>
    </div>
  );
}
