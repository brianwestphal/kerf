import type { SafeHtml } from 'kerfjs';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { nativeDraggable } from '../../../shared/dom/draggable.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import type { SemanticTone } from '../../../shared/styles/semantic-tone.js';

/** `row` for a list section; `card` for a board column. */
export type SummaryRowPresentation = 'row' | 'card';
/** A row's place in a rounded list section, so its corners match. */
export type SummaryRowListEdge = 'start' | 'end' | 'only';

const summaryRowProtected = new Set([
  'data-component',
  'data-presentation',
  'data-list-edge',
  'data-rail',
  'data-selected',
  'data-dimmed',
]);

type SummaryRowRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-presentation'?: never;
    'data-list-edge'?: never;
    'data-rail'?: never;
    'data-selected'?: never;
    'data-dimmed'?: never;
  }
>;

interface SummaryRowBaseProps {
  /** The identity line: an identifier, inline status glyphs, and the title. */
  title: KerfUiContent;
  /** Optional leading glyph, such as a category icon. */
  leading?: SafeHtml;
  /** Quiet text at the end of the title line, such as a relative time. */
  trailingMeta?: string | SafeHtml;
  /** A wrapping line of badges, chips, and quiet text below the title. */
  metadata?: KerfUiContent;
  /** `row` (default) or `card`. */
  presentation?: SummaryRowPresentation;
  /** Title lines before clipping; default 2 for a row and 4 for a card. */
  titleLines?: number;
  /** A leading state rail in a semantic tone (Up Next, blocked, …). */
  rail?: SemanticTone;
  /** Selected visual state; also exposed as `aria-selected` for an option. */
  selected?: boolean;
  /** Dim a finished or cut item; hover and selection restore it. */
  dimmed?: boolean;
  /** Round the corners that meet a rounded list section's edge. */
  listEdge?: SummaryRowListEdge;
  /** Skip rendering while off screen in long lists (`content-visibility`). */
  deferRendering?: boolean;
  id?: string;
  className?: string;
  /** Safe `data-*` identity (an item id or delegated action) on the root. */
  rootAttributes?: SummaryRowRootAttributes;
}

export type SummaryRowProps = SummaryRowBaseProps &
  (
    | {
        /** Selectable option, the default; place it in a labeled listbox. */
        semanticRole?: 'option';
        /** Native HTML drag source on this option root, in row or card form. */
        draggable?: boolean;
        /** Accessible name when the visible content is not a good one. */
        ariaLabel?: string;
      }
    | {
        /** Static labeled group; nested actions own focus and activation. */
        semanticRole: 'group';
        draggable?: never;
        ariaLabel: string;
      }
  );

/**
 * A list row or board card with a clamped identity line, metadata, and state
 * rail. The default is a focusable `role="option"` for a labeled listbox;
 * `semanticRole="group"` gives a static labeled row for nested actions.
 */
export function SummaryRow({
  title,
  leading,
  trailingMeta,
  metadata,
  presentation = 'row',
  titleLines,
  rail,
  selected = false,
  dimmed = false,
  listEdge,
  deferRendering = false,
  semanticRole = 'option',
  draggable,
  ariaLabel,
  id,
  className = '',
  rootAttributes = {},
}: SummaryRowProps) {
  if (
    titleLines !== undefined &&
    (!Number.isInteger(titleLines) || titleLines < 1)
  )
    throw new RangeError('SummaryRow titleLines must be a positive integer');
  return (
    <div
      {...filterDataAttributes(rootAttributes, summaryRowProtected)}
      id={id}
      class={`kui-summary-row ${className}`.trim()}
      data-component="summary-row"
      data-presentation={presentation}
      data-list-edge={listEdge}
      data-rail={rail}
      data-selected={selected ? 'true' : undefined}
      data-dimmed={dimmed ? 'true' : undefined}
      data-defer={deferRendering ? 'true' : undefined}
      role={semanticRole}
      draggable={nativeDraggable(draggable, false)}
      tabindex={semanticRole === 'option' ? '0' : undefined}
      aria-selected={
        semanticRole === 'option' ? (selected ? 'true' : 'false') : undefined
      }
      aria-label={ariaLabel}
      style={
        titleLines === undefined
          ? undefined
          : `--_kui-summary-row-title-lines:${titleLines}`
      }
    >
      {rail && <span class="kui-summary-row__rail" aria-hidden="true" />}
      <div class="kui-summary-row__body">
        {leading && <span class="kui-summary-row__leading">{leading}</span>}
        <div class="kui-summary-row__content">
          <div class="kui-summary-row__title">
            {trailingMeta !== undefined && (
              <span class="kui-summary-row__trailing">{trailingMeta}</span>
            )}
            {title}
          </div>
          {metadata && <div class="kui-summary-row__metadata">{metadata}</div>}
        </div>
      </div>
    </div>
  );
}
