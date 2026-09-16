import type { SafeHtml } from 'kerfjs';

/** A collapsible Workbench panel — a side rail or the bottom drawer. */
export interface WorkbenchPanel {
  content: SafeHtml;
  /** Whether the panel is currently collapsed (the app owns this). */
  collapsed?: boolean;
  /** Rail width, or drawer height, in px. Overrides the CSS default. */
  size?: number;
  /** Accessible name for the panel region. */
  label?: string;
}

export interface WorkbenchProps {
  id: string;
  label: string;
  /** The central work area. */
  main: SafeHtml;
  leftRail?: WorkbenchPanel;
  rightRail?: WorkbenchPanel;
  bottomDrawer?: WorkbenchPanel;
  className?: string;
}

/**
 * The Xcode-like multi-panel workspace: a collapsible left rail, right rail, and
 * bottom drawer around a central work area (any absent). Collapsing snaps the
 * panel's track to zero in one reflow while its fixed-size content slides out via
 * a composited transform — the instant-width / sliding-content technique, so the
 * work area relayouts once, not per frame. The app owns each `collapsed` flag;
 * the collapse is pure CSS (no wire). See `docs/23-app-layouts.md` §3.3.
 */
export function Workbench({ id, label, main, leftRail, rightRail, bottomDrawer, className = '' }: WorkbenchProps) {
  return <section class={`kui-workbench ${className}`.trim()} id={id} data-component="workbench" aria-label={label}>
    {leftRail && <aside class="kui-workbench__rail kui-workbench__rail--left" data-workbench-rail="left" data-collapsed={String(leftRail.collapsed ?? false)} aria-label={leftRail.label || undefined} style={leftRail.size ? `--kui-workbench-rail-width: ${leftRail.size}px` : undefined}>
      <div class="kui-workbench__panel-content">{leftRail.content}</div>
    </aside>}
    <div class="kui-workbench__center">
      <div class="kui-workbench__main" data-workbench-main>{main}</div>
      {bottomDrawer && <section class="kui-workbench__drawer" data-workbench-drawer data-collapsed={String(bottomDrawer.collapsed ?? false)} aria-label={bottomDrawer.label || undefined} style={bottomDrawer.size ? `--kui-workbench-drawer-height: ${bottomDrawer.size}px` : undefined}>
        <div class="kui-workbench__panel-content">{bottomDrawer.content}</div>
      </section>}
    </div>
    {rightRail && <aside class="kui-workbench__rail kui-workbench__rail--right" data-workbench-rail="right" data-collapsed={String(rightRail.collapsed ?? false)} aria-label={rightRail.label || undefined} style={rightRail.size ? `--kui-workbench-rail-width: ${rightRail.size}px` : undefined}>
      <div class="kui-workbench__panel-content">{rightRail.content}</div>
    </aside>}
  </section>;
}
