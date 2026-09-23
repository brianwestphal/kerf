import type { KerfUiContent } from './semantic-content.js';
import { ToolbarText } from './toolbar-text.js';

/**
 * One entry in a {@link NavStack}. The app owns the stack as an array (usually a
 * signal); `NavStack` renders it and `wireNavStack` animates the transitions.
 */
export interface NavStackView {
  /** Stable identity for keyed reconcile and transition direction. */
  key: string;
  content: KerfUiContent;
  /** Title shown in the top toolbar for this view. */
  title?: string;
  /** Trailing actions for this view's top toolbar. */
  toolbar?: KerfUiContent;
  /** Bottom toolbar for this view. Cross-fades with the top chrome on navigation. */
  bottomToolbar?: KerfUiContent;
}

export interface NavStackProps {
  id: string;
  /** Accessible name for the stack region. */
  label: string;
  /** The stack, root first; the last entry is the active top view. */
  views: NavStackView[];
  /** Accessible label for the back control (default "Back"). */
  backLabel?: string;
  /** Hide the top toolbar entirely (rare — a fully custom-chrome view). */
  hideToolbar?: boolean;
  /** Optional persistent bottom toolbar used when the active view does not provide one. */
  bottomToolbar?: KerfUiContent;
  className?: string;
}

/**
 * A navigation stack (iOS-style push/pop). Renders every entry stacked, the last
 * one active; `@kerfjs/ui/wire-nav-stack`'s `wireNavStack` slides the content and
 * cross-fades the chrome across a change. A single-pane layout is a `NavStack`
 * with one entry. See `docs/23-app-layouts.md` §3.1.
 */
export function NavStack({
  id,
  label,
  views,
  backLabel = 'Back',
  hideToolbar = false,
  bottomToolbar,
  className = '',
}: NavStackProps) {
  const topIndex = views.length - 1;
  const top = views[topIndex];
  const canPop = views.length > 1;
  return (
    <section
      class={`kui-nav-stack ${className}`.trim()}
      id={id}
      data-component="nav-stack"
      data-nav-stack-id={id}
      data-depth={String(views.length)}
      aria-label={label}
    >
      {!hideToolbar && (
        <header class="kui-nav-stack__chrome" data-nav-stack-chrome>
          <div class="kui-nav-stack__lead">
            {canPop && (
              <button
                type="button"
                class="kui-nav-stack__back"
                data-nav-back
                aria-label={backLabel}
              >
                <svg
                  class="kui-nav-stack__back-icon"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            )}
            <ToolbarText
              text={top?.title ?? ''}
              size="large"
              className="kui-nav-stack__title"
            />
          </div>
          {top?.toolbar && (
            <div class="kui-nav-stack__actions">{top.toolbar}</div>
          )}
        </header>
      )}
      <div class="kui-nav-stack__viewport" data-nav-stack-viewport>
        {views.map((view, index) => (
          <article
            class="kui-nav-stack__view"
            data-key={view.key}
            data-nav-key={view.key}
            data-nav-active={String(index === topIndex)}
            aria-hidden={String(index !== topIndex)}
          >
            {view.content}
          </article>
        ))}
      </div>
      {(top?.bottomToolbar ?? bottomToolbar) && (
        <footer class="kui-nav-stack__bottom" data-nav-stack-bottom>
          {top?.bottomToolbar ?? bottomToolbar}
        </footer>
      )}
    </section>
  );
}
