import type { SafeHtml } from 'kerfjs';

import { filterDataAttributes } from './extension-attributes.js';
import { Skeleton } from './skeleton.js';

const PROTECTED_ROOT_DATA_ATTRIBUTES = new Set([
  'data-component',
  'data-action',
  'data-tab-id',
  'data-selected',
  'data-tab-dragging',
  'data-tab-drop-position',
]);

type AppTabRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-tab-id'?: never;
    'data-selected'?: never;
    'data-tab-dragging'?: never;
    'data-tab-drop-position'?: never;
  }
>;

export type AppTabPresentation = 'pill' | 'segmented' | 'icon-only';
export type AppTabSize = 'default' | 'compact';

export interface AppTabProps {
  id: string;
  name: string;
  selected?: boolean;
  closable?: boolean;
  draggable?: boolean;
  leading?: SafeHtml;
  trailing?: SafeHtml;
  /** Visual treatment within a TabBar. Icon-only tabs retain `name` as their accessible name. */
  presentation?: AppTabPresentation;
  /** Compact tabs use the 32px application-rail height. */
  size?: AppTabSize;
  /** Maximum visible label width in CSS pixels before ellipsis. */
  labelMaxWidth?: number;
  /** Decorative dormant content for the close button. Must not contain interactive descendants. */
  closeIcon?: SafeHtml;
  selectAction?: string;
  closeAction?: string;
  className?: string;
  /** Render as an unanimated loading skeleton, disabling select/close and dragging. */
  placeholder?: boolean;
  rootAttributes?: AppTabRootAttributes;
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
  closable = true,
  draggable = false,
  leading,
  trailing,
  presentation = 'pill',
  size = 'default',
  labelMaxWidth,
  closeIcon,
  selectAction = 'select-tab',
  closeAction = 'close-tab',
  className = '',
  placeholder = false,
  rootAttributes = {},
}: AppTabProps) {
  const keyshortcuts = [
    closable ? 'Delete Backspace' : '',
    draggable ? 'Alt+Shift+ArrowLeft Alt+Shift+ArrowRight' : '',
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
      data-presentation={presentation}
      data-size={size}
      data-placeholder={placeholder ? 'true' : undefined}
      draggable={placeholder ? 'false' : draggable ? 'true' : 'false'}
      aria-busy={placeholder ? 'true' : undefined}
      style={
        labelMaxWidth === undefined
          ? undefined
          : `--kui-app-tab-label-max-width:${labelMaxWidth}px`
      }
    >
      {closable && (
        <button
          type="button"
          tabindex="-1"
          class="kui-app-tab__close"
          data-action={placeholder ? undefined : closeAction}
          data-tab-id={id}
          disabled={placeholder || undefined}
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
        aria-label={presentation === 'icon-only' ? name : undefined}
        aria-keyshortcuts={placeholder ? undefined : keyshortcuts || undefined}
        data-action={placeholder ? undefined : selectAction}
        data-tab-id={id}
        disabled={placeholder || undefined}
        tabindex={placeholder ? '-1' : selected ? '0' : '-1'}
      >
        {leading}
        <span
          class="kui-app-tab__name"
          aria-hidden={presentation === 'icon-only' ? 'true' : undefined}
        >
          {placeholder ? <Skeleton width="7em" /> : name}
        </span>
        {closable || trailing ? (
          <span class="kui-app-tab__trailing">{trailing}</span>
        ) : undefined}
      </button>
    </div>
  );
}
