// KF-0QJ2K3: a horizontally paged region (swipeable panes with page dots) for
// a sidebar or panel. The application owns the current page; wirePagedViews
// reports swipes, dot clicks, and arrow keys and follows the controlled page.
import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';

/** One page of a {@link PagedView}: its id, its name, and its content. */
export interface PagedViewPage<Id extends string = string> {
  /** Stable page id: the controlled `page` value and the persisted choice. */
  id: Id;
  /** Short page name, spoken as "Page 2 of 3: <label>" and shown as the dot's tooltip. */
  label: string;
  /** The page's content; it owns its own inset (a `ContentItem`, `List`, `ListInsetText`). */
  content: KerfUiContent;
}

export interface PagedViewProps<Id extends string = string> {
  /** DOM id of the root; page and dot ids derive from it. */
  id: string;
  /** Accessible name of the page-dot tablist (for example "Sidebar pages"). */
  label: string;
  /** The pages, in order. With one page no dots render. */
  pages: readonly PagedViewPage<Id>[];
  /** The controlled current page id (the app owns it and may persist it). */
  page: NoInfer<Id>;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a test hook or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const PAGED_VIEW_PROTECTED = new Set([
  'data-component',
  'data-page',
  'data-paged-view-id',
]);

/** The DOM id of one page's panel. */
const pagedViewPageId = (view: string, page: string) => `${view}-page-${page}`;
/** The DOM id of one page's dot (its tab). */
const pagedViewDotId = (view: string, page: string) => `${view}-dot-${page}`;

/**
 * A region that pages horizontally between full-size panes, with compact
 * page dots floating in a pill at the bottom. Each pane fills the region and
 * scrolls vertically on its own, beneath the dots; swiping, trackpad
 * scrolling, the dots, and Left and Right on the dots change the page once
 * `wirePagedViews` is wired. The component owns the
 * geometry: put it directly in a Pane, sidebar, or SizedRegion, with no
 * wrapper padding.
 */
export function PagedView<Id extends string>({
  id,
  label,
  pages,
  page,
  className = '',
  slot,
  rootAttributes = {},
}: PagedViewProps<Id>) {
  const current = Math.max(
    0,
    pages.findIndex((entry) => entry.id === page),
  );
  return (
    <div
      {...filterDataAttributes(rootAttributes, PAGED_VIEW_PROTECTED)}
      id={id}
      class={`kui-paged-view ${className}`.trim()}
      data-component="paged-view"
      data-paged-view-id={id}
      data-page={pages[current]?.id}
      slot={slot}
    >
      <div class="kui-paged-view__viewport">
        {pages.map((entry, index) => (
          <div
            class="kui-paged-view__page"
            id={pagedViewPageId(id, entry.id)}
            data-paged-view-page={entry.id}
            role={pages.length > 1 ? 'tabpanel' : undefined}
            aria-labelledby={
              pages.length > 1 ? pagedViewDotId(id, entry.id) : undefined
            }
            inert={index !== current || undefined}
          >
            {entry.content}
          </div>
        ))}
      </div>
      {pages.length > 1 ? (
        <div class="kui-paged-view__dots" role="tablist" aria-label={label}>
          {pages.map((entry, index) => (
            <button
              type="button"
              class="kui-paged-view__dot"
              id={pagedViewDotId(id, entry.id)}
              data-paged-view-dot={entry.id}
              role="tab"
              aria-selected={String(index === current)}
              aria-controls={pagedViewPageId(id, entry.id)}
              aria-label={`Page ${index + 1} of ${pages.length}: ${entry.label}`}
              title={entry.label}
              tabindex={index === current ? '0' : '-1'}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
