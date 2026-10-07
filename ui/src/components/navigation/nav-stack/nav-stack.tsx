import { ChevronLeft } from 'lucide';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import type { NavPane } from '../../../shared/panels/nav-pane.js';
import type { PanelBottomToolbar } from '../../../shared/panels/panel-toolbar.js';
import { Toolbar, type ToolbarConfig } from '../../actions/toolbar/toolbar.js';
import { ToolbarControlGroup } from '../../actions/toolbar-control-group/toolbar-control-group.js';
import {
  type HeadingLevel,
  ToolbarText,
  type ToolbarTextSize,
} from '../../actions/toolbar-text/toolbar-text.js';
import { List, type ListConfig } from '../../collections/list/list.js';
import { Pane } from '../../layout/pane/pane.js';
import { LucideIcon } from '../../media/lucide-icon/lucide-icon.js';

/**
 * One entry in a {@link NavStack}. The app owns the stack as an array (usually a
 * signal); `NavStack` renders it and `wireNavStack` animates the transitions.
 */
export interface NavStackView extends NavPane<
  NavStackViewToolbar,
  PanelBottomToolbar
> {
  /** Stable identity for keyed reconcile and transition direction. */
  key: string;
}

/** Per-view top toolbar. The stack supplies its back control before `leading`. */
export interface NavStackViewToolbar extends NavStackToolbarConfig {
  title?: string;
  leading?: KerfUiContent;
  center?: KerfUiContent;
  trailing?: KerfUiContent;
}

/** A view's structured bottom toolbar; it cross-fades on navigation. */
export type NavStackViewBottomToolbar = PanelBottomToolbar;

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
  /** Persistent last group in every view's top toolbar, supplied by a hosting panel. */
  panelToggle?: KerfUiContent;
  /** Hide the top toolbar entirely (rare — a fully custom-chrome view). */
  hideToolbar?: boolean;
  /** Optional persistent bottom toolbar used when the active view does not provide one. */
  bottomToolbar?: NavStackViewBottomToolbar;
  /**
   * Stack chrome separator. `auto` (default) draws both available edges
   * against a sunken active Pane and otherwise follows `chromeDividers`;
   * `hidden` suppresses the stack-owned edges.
   */
  separator?: 'auto' | 'hidden';
  /**
   * The line under the top chrome and over the bottom toolbar, where they
   * meet the active view. `scroll` (default) shows the chrome's line only
   * while the view's content is scrolled beneath it, and the bottom
   * toolbar's only while more content lies below — never when the content
   * fits — once `wireScrollDividers` (`@kerfjs/ui/wire-scroll-dividers`) is
   * wired above the stack; unwired, neither shows. `always` shows both
   * without the wiring; `none` neither, even when wired. The line is drawn
   * inside the chrome, so no state moves the chrome or the content. A
   * A sunken active Pane still draws the separator unless
   * `separator="hidden"`. A `toolbarConfig.dividerSides` edge is the Toolbar's
   * own and is unaffected.
   */
  chromeDividers?: 'scroll' | 'always' | 'none';
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

const DEFAULT_SAFE_AREA_EDGES = [
  'block-start',
  'inline-start',
  'inline-end',
] as const;

const DEFAULT_BOTTOM_SAFE_AREA_EDGES = [
  'block-end',
  'inline-start',
  'inline-end',
] as const;

function chromeList(content: KerfUiContent, config?: ListConfig) {
  return (
    <List
      dividerSides={config?.dividerSides}
      gap={config?.gap}
      hAlign={config?.hAlign}
      vAlign={config?.vAlign}
      textInsets={config?.textInsets}
      controlInsets={config?.controlInsets}
    >
      {content}
    </List>
  );
}

/**
 * A navigation stack (iOS-style push/pop). Renders every entry stacked, the last
 * one active; `@kerfjs/ui/wire-nav-stack`'s `wireNavStack` slides the content and
 * cross-fades the chrome across a change. Its top chrome is a real `Toolbar`: the
 * back control and title lead, the active view's `toolbar` fills the zones,
 * and `toolbarConfig` supplies defaults. A single-pane
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
  panelToggle,
  hideToolbar = false,
  bottomToolbar,
  separator = 'auto',
  chromeDividers = 'scroll',
  className = '',
  slot,
}: NavStackProps) {
  const topIndex = views.length - 1;
  const top = views[topIndex];
  const topToolbar = top?.toolbar;
  const bottom = top?.bottomToolbar ?? bottomToolbar;
  const canPop = views.length > 1;
  return (
    <section
      class={`kui-nav-stack ${className}`.trim()}
      id={id}
      data-component="nav-stack"
      data-nav-stack-id={id}
      data-depth={String(views.length)}
      data-separator={separator}
      data-chrome-dividers={
        chromeDividers === 'always' || chromeDividers === 'none'
          ? chromeDividers
          : undefined
      }
      aria-label={label}
      slot={slot}
    >
      {!hideToolbar && (
        <div class="kui-nav-stack__chrome" data-nav-stack-chrome>
          <Toolbar
            label={topToolbar?.label ?? toolbarConfig.label}
            dividerSides={
              topToolbar?.dividerSides ?? toolbarConfig.dividerSides
            }
            centerAlign={topToolbar?.centerAlign ?? toolbarConfig.centerAlign}
            responsive={topToolbar?.responsive ?? toolbarConfig.responsive}
            responsiveAt={
              topToolbar?.responsiveAt ?? toolbarConfig.responsiveAt
            }
            safeAreaEdges={
              topToolbar?.safeAreaEdges ??
              toolbarConfig.safeAreaEdges ??
              DEFAULT_SAFE_AREA_EDGES
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
                {topToolbar?.leading}
                <ToolbarText
                  text={topToolbar?.title ?? ''}
                  size={
                    topToolbar?.titleSize ?? toolbarConfig.titleSize ?? 'large'
                  }
                  headingLevel={
                    topToolbar?.headingLevel ?? toolbarConfig.headingLevel
                  }
                  fill
                />
              </>
            }
            center={topToolbar?.center}
            trailing={
              <>
                {topToolbar?.trailing}
                {panelToggle}
              </>
            }
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
            {view.pane ||
            view.header !== undefined ||
            view.footer !== undefined ? (
              <Pane
                appearance={view.pane?.appearance}
                deepInset={view.pane?.deepInset}
                tabIndex={view.pane?.tabIndex}
                outlined={view.pane?.outlined}
                contentElement={view.pane?.contentElement}
                contentLabel={view.pane?.contentLabel}
                separators={view.pane?.separators}
                safeAreaEdges={view.pane?.safeAreaEdges}
                chromeDividers={view.pane?.chromeDividers}
                header={
                  view.header === undefined ? undefined : (
                    <div data-nav-stack-header>
                      {chromeList(view.header, view.headerList)}
                    </div>
                  )
                }
                footer={
                  view.footer === undefined ? undefined : (
                    <div data-nav-stack-footer>
                      {chromeList(view.footer, view.footerList)}
                    </div>
                  )
                }
              >
                {view.content}
              </Pane>
            ) : (
              view.content
            )}
          </article>
        ))}
      </div>
      {bottom && (
        <footer class="kui-nav-stack__bottom" data-nav-stack-bottom>
          <Toolbar
            position="footer"
            label={bottom.label}
            dividerSides={bottom.dividerSides}
            centerAlign={bottom.centerAlign}
            responsive={bottom.responsive}
            responsiveAt={bottom.responsiveAt}
            safeAreaEdges={
              bottom.safeAreaEdges ?? DEFAULT_BOTTOM_SAFE_AREA_EDGES
            }
            leading={bottom.leading}
            center={bottom.center}
            trailing={bottom.trailing}
          />
        </footer>
      )}
    </section>
  );
}
