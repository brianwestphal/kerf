import type { SafeHtml } from 'kerfjs';

import type {
  ResizableRegionCollapseMotion,
  ResizableRegionContentOverflow,
  ResizableRegionPresentation,
  ResizableRegionRestorePosition,
  ResizableRegionSeparator,
} from './resizable-region.js';
import type { KerfUiContent } from './semantic-content.js';

/** A collapsible Workbench panel — a side rail or the bottom drawer. */
export interface WorkbenchPanel {
  content: KerfUiContent;
  /** Whether the panel is currently collapsed (the app owns this). */
  collapsed?: boolean;
  /** Rail width, or drawer height, in px. Overrides the CSS default. */
  size?: number;
  /** Accessible name for the panel region. */
  label?: string;
  separator?: ResizableRegionSeparator;
  collapseMotion?: ResizableRegionCollapseMotion;
  contentOverflow?: ResizableRegionContentOverflow;
  presentation?: ResizableRegionPresentation;
  /** Control shown in a safe-area-aware viewport corner while collapsed. */
  restoreControl?: SafeHtml;
  restorePosition?: ResizableRegionRestorePosition;
}

export interface WorkbenchProps {
  id: string;
  label: string;
  /** The central work area. */
  main: KerfUiContent;
  leftRail?: WorkbenchPanel;
  rightRail?: WorkbenchPanel;
  bottomDrawer?: WorkbenchPanel;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * The Xcode-like multi-panel workspace: a collapsible left rail, right rail, and
 * bottom drawer around a central work area (any absent). Collapsing snaps the
 * panel's track to zero in one reflow while its fixed-size content slides out via
 * a composited transform — the instant-width / sliding-content technique, so the
 * work area relayouts once, not per frame. Bottom-drawer content stays anchored
 * to the shell's stable bottom edge throughout that transition. The app owns
 * each `collapsed` flag; the collapse is pure CSS (no wire). See
 * `docs/23-app-layouts.md` §3.3.
 */
export function Workbench({
  id,
  label,
  main,
  leftRail,
  rightRail,
  bottomDrawer,
  className = '',
  slot,
}: WorkbenchProps) {
  return (
    <section
      class={`kui-workbench ${className}`.trim()}
      id={id}
      data-component="workbench"
      aria-label={label}
      slot={slot}
    >
      {leftRail && (
        <aside
          class="kui-workbench__rail kui-workbench__rail--left"
          data-workbench-rail="left"
          data-collapsed={String(leftRail.collapsed ?? false)}
          data-separator={leftRail.separator ?? 'auto'}
          data-collapse-motion={leftRail.collapseMotion ?? 'slide'}
          data-content-overflow={leftRail.contentOverflow ?? 'clip'}
          data-presentation={leftRail.presentation ?? 'inline'}
          aria-label={leftRail.label || undefined}
          aria-hidden={leftRail.presentation === 'hidden' ? 'true' : undefined}
          style={
            leftRail.size
              ? `--kui-workbench-rail-width: ${leftRail.size}px`
              : undefined
          }
        >
          <div class="kui-workbench__panel-content">{leftRail.content}</div>
        </aside>
      )}
      {leftRail?.collapsed &&
        leftRail.restoreControl &&
        leftRail.presentation !== 'hidden' && (
          <div
            class="kui-workbench__restore"
            data-panel="left"
            data-position={leftRail.restorePosition ?? 'bottom-start'}
          >
            {leftRail.restoreControl}
          </div>
        )}
      <div class="kui-workbench__center">
        <div class="kui-workbench__main" data-workbench-main>
          {main}
        </div>
        {bottomDrawer && (
          <section
            class="kui-workbench__drawer"
            data-workbench-drawer
            data-collapsed={String(bottomDrawer.collapsed ?? false)}
            data-separator={bottomDrawer.separator ?? 'auto'}
            data-collapse-motion={bottomDrawer.collapseMotion ?? 'slide'}
            data-content-overflow={bottomDrawer.contentOverflow ?? 'clip'}
            data-presentation={bottomDrawer.presentation ?? 'inline'}
            aria-label={bottomDrawer.label || undefined}
            aria-hidden={
              bottomDrawer.presentation === 'hidden' ? 'true' : undefined
            }
            style={
              bottomDrawer.size
                ? `--kui-workbench-drawer-height: ${bottomDrawer.size}px`
                : undefined
            }
          >
            <div class="kui-workbench__panel-content">
              {bottomDrawer.content}
            </div>
          </section>
        )}
        {bottomDrawer?.collapsed &&
          bottomDrawer.restoreControl &&
          bottomDrawer.presentation !== 'hidden' && (
            <div
              class="kui-workbench__restore"
              data-panel="bottom"
              data-position={bottomDrawer.restorePosition ?? 'bottom-end'}
            >
              {bottomDrawer.restoreControl}
            </div>
          )}
      </div>
      {rightRail && (
        <aside
          class="kui-workbench__rail kui-workbench__rail--right"
          data-workbench-rail="right"
          data-collapsed={String(rightRail.collapsed ?? false)}
          data-separator={rightRail.separator ?? 'auto'}
          data-collapse-motion={rightRail.collapseMotion ?? 'slide'}
          data-content-overflow={rightRail.contentOverflow ?? 'clip'}
          data-presentation={rightRail.presentation ?? 'inline'}
          aria-label={rightRail.label || undefined}
          aria-hidden={rightRail.presentation === 'hidden' ? 'true' : undefined}
          style={
            rightRail.size
              ? `--kui-workbench-rail-width: ${rightRail.size}px`
              : undefined
          }
        >
          <div class="kui-workbench__panel-content">{rightRail.content}</div>
        </aside>
      )}
      {rightRail?.collapsed &&
        rightRail.restoreControl &&
        rightRail.presentation !== 'hidden' && (
          <div
            class="kui-workbench__restore"
            data-panel="right"
            data-position={rightRail.restorePosition ?? 'bottom-end'}
          >
            {rightRail.restoreControl}
          </div>
        )}
    </section>
  );
}
