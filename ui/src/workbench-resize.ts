// The resizable-panel contract shared by `Workbench` (which renders it) and
// `wireWorkbench` (which drives it). Internal.

/** A Workbench panel slot, named after its `WorkbenchProps` prop. */
export type WorkbenchPanelKey = 'leftRail' | 'rightRail' | 'bottomDrawer';

const SLUGS: Record<WorkbenchPanelKey, string> = {
  leftRail: 'left-rail',
  rightRail: 'right-rail',
  bottomDrawer: 'bottom-drawer',
};

/** The `data-region-id` a resizable panel carries, e.g. `studio-left-rail`. */
export const workbenchRegionId = (id: string, panel: WorkbenchPanelKey) =>
  `${id}-${SLUGS[panel]}`;

/** Default size and limits (px) for a panel whose `resizable` omits them. */
export const WORKBENCH_RESIZE_DEFAULTS: Record<
  WorkbenchPanelKey,
  { size: number; min: number; max: number }
> = {
  leftRail: { size: 280, min: 180, max: 480 },
  rightRail: { size: 280, min: 180, max: 480 },
  bottomDrawer: { size: 220, min: 120, max: 480 },
};

/**
 * Default minimum width (px) a Workbench keeps for its work area while a rail
 * is resizable: rails stop growing there and shrink proportionally when the
 * container narrows.
 */
export const WORKBENCH_MAIN_MIN_SIZE = 320;
