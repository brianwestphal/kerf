import { ChevronLeft } from 'lucide';

import { LucideIcon } from './lucide-icon.js';
import type { KerfUiContent } from './semantic-content.js';
import { Toolbar, type ToolbarConfig } from './toolbar.js';
import { ToolbarControlGroup } from './toolbar-control-group.js';
import {
  type HeadingLevel,
  ToolbarText,
  type ToolbarTextSize,
} from './toolbar-text.js';

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
  /** Leading groups for this view's top toolbar, after the back control and before the title. */
  leading?: KerfUiContent;
  /** Center content for this view's top toolbar (placed per `toolbarConfig.centerAlign`). */
  center?: KerfUiContent;
  /** Trailing actions for this view's top toolbar. */
  toolbar?: KerfUiContent;
  /** Bottom toolbar for this view. Cross-fades with the top chrome on navigation. */
  bottomToolbar?: KerfUiContent;
}

/**
 * The top toolbar's configuration. Its `ToolbarConfig` forwards to the real
 * `Toolbar` the stack renders; by default that toolbar draws no divider and
 * claims the top and side safe-area edges the stack still touches.
 */
export interface NavStackToolbarConfig extends ToolbarConfig {
  /** Accessible name of the top toolbar (default: none). */
  label?: string;
  /** Size of the view title's `ToolbarText` (default `large`). */
  titleSize?: ToolbarTextSize;
  /** Expose the view title as a heading at this level (default: a plain span). */
  headingLevel?: HeadingLevel;
}

export interface NavStackProps {
  id: string;
  /** Accessible name for the stack region. */
  label: string;
  /** The stack, root first; the last entry is the active top view. */
  views: NavStackView[];
  /** Accessible label for the icon-only back control (default "Back"). */
  backLabel?: string;
  /** The back control's icon (default a chevron-left `LucideIcon`). */
  backIcon?: KerfUiContent;
  /**
   * Visible text beside the back icon, such as the previous view's title
   * (default: icon only). When set, the text names the control and
   * `backLabel` is not used.
   */
  backText?: string;
  /** The top toolbar's configuration, forwarded to its `Toolbar`. */
  toolbarConfig?: NavStackToolbarConfig;
  /** Hide the top toolbar entirely (rare — a fully custom-chrome view). */
  hideToolbar?: boolean;
  /** Optional persistent bottom toolbar used when the active view does not provide one. */
  bottomToolbar?: KerfUiContent;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

const DEFAULT_SAFE_AREA_EDGES = [
  'block-start',
  'inline-start',
  'inline-end',
] as const;

/**
 * A navigation stack (iOS-style push/pop). Renders every entry stacked, the last
 * one active; `@kerfjs/ui/wire-nav-stack`'s `wireNavStack` slides the content and
 * cross-fades the chrome across a change. Its top chrome is a real `Toolbar`: the
 * back control and title lead, the active view's `leading` / `center` / `toolbar`
 * content fills the zones, and `toolbarConfig` configures it. A single-pane
 * layout is a `NavStack` with one entry. See `docs/23-app-layouts.md` §3.1.
 */
export function NavStack({
  id,
  label,
  views,
  backLabel = 'Back',
  backIcon,
  backText,
  toolbarConfig = {},
  hideToolbar = false,
  bottomToolbar,
  className = '',
  slot,
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
      slot={slot}
    >
      {!hideToolbar && (
        <div class="kui-nav-stack__chrome" data-nav-stack-chrome>
          <Toolbar
            label={toolbarConfig.label}
            dividerSides={toolbarConfig.dividerSides}
            centerAlign={toolbarConfig.centerAlign}
            responsive={toolbarConfig.responsive}
            responsiveAt={toolbarConfig.responsiveAt}
            safeAreaEdges={
              toolbarConfig.safeAreaEdges ?? DEFAULT_SAFE_AREA_EDGES
            }
            leading={
              <>
                {canPop && (
                  <ToolbarControlGroup
                    appearance="borderless"
                    shape="rounded"
                    content={backText ? 'mixed' : 'icon'}
                    single
                  >
                    <button
                      type="button"
                      class="kui-nav-stack__back"
                      data-nav-back
                      aria-label={backText ? undefined : backLabel}
                    >
                      {backIcon ?? (
                        <LucideIcon
                          icon={ChevronLeft}
                          name="chevron-left"
                          className="kui-nav-stack__back-icon"
                        />
                      )}
                      {backText ? <span>{backText}</span> : null}
                    </button>
                  </ToolbarControlGroup>
                )}
                {top?.leading}
                <ToolbarText
                  text={top?.title ?? ''}
                  size={toolbarConfig.titleSize ?? 'large'}
                  headingLevel={toolbarConfig.headingLevel}
                  fill
                />
              </>
            }
            center={top?.center}
            trailing={top?.toolbar}
          />
        </div>
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
