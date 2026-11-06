// Sketches for the palette grid (KF-JC7WTW). Most tiles show their component
// rendered live; a layout, a dialog, or an arrangement primitive renders
// nothing useful when it is added empty (a closed dialog shows nothing, an
// empty Workbench is mostly blank), so its tile shows a simplified drawing
// of the arrangement instead. Drawn in `currentColor`, so they follow the
// theme and forced colors.

/** A sketch's canvas: 4:3, as the tiles are. */
const WIDTH = 96;
const HEIGHT = 72;

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Fill strength, 0–1; none draws the outline only. */
  readonly fill?: number;
  /** Whether the box has an outline. */
  readonly line?: boolean;
  readonly r?: number;
}

const box = ({ x, y, w, h, fill, line = false, r = 2 }: Box) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="currentColor" fill-opacity="${
    fill ?? 0
  }"${line ? ' stroke="currentColor" stroke-opacity="0.55"' : ''}/>`;

const stroke = (d: string, opacity = 0.55) =>
  `<path d="${d}" fill="none" stroke="currentColor" stroke-opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** The outer window every arrangement sits in. */
const FRAME = box({ x: 4, y: 4, w: 88, h: 64, line: true, r: 4 });

/** Short text lines, as rows of content. */
const lines = (x: number, y: number, w: number, count: number, gap = 8) =>
  Array.from({ length: count }, (_, index) =>
    box({
      x,
      y: y + index * gap,
      w: w * (index % 2 ? 0.7 : 1),
      h: 3,
      fill: 0.3,
      r: 1.5,
    }),
  ).join('');

const SKETCHES: Readonly<Record<string, string>> = {
  workbench: [
    FRAME,
    box({ x: 4, y: 4, w: 22, h: 64, fill: 0.12, r: 4 }),
    box({ x: 70, y: 4, w: 22, h: 64, fill: 0.12, r: 4 }),
    box({ x: 26, y: 4, w: 44, h: 10, fill: 0.06, r: 0 }),
    box({ x: 26, y: 52, w: 44, h: 16, fill: 0.09, r: 0 }),
    lines(8, 12, 14, 4),
    lines(74, 12, 14, 4),
  ].join(''),
  'split-view': [
    FRAME,
    box({ x: 4, y: 4, w: 32, h: 64, fill: 0.12, r: 4 }),
    lines(8, 12, 24, 6),
    lines(42, 12, 44, 3, 10),
  ].join(''),
  'nav-stack': [
    FRAME,
    box({ x: 4, y: 4, w: 88, h: 14, fill: 0.08, r: 4 }),
    stroke('M13 8 L9 11 L13 14'),
    box({ x: 36, y: 9.5, w: 24, h: 3, fill: 0.4, r: 1.5 }),
    lines(10, 26, 76, 5),
  ].join(''),
  'tab-navigator': [
    FRAME,
    box({ x: 4, y: 54, w: 88, h: 14, fill: 0.08, r: 4 }),
    ...[22, 48, 74].map((x, index) =>
      box({ x: x - 4, y: 58, w: 8, h: 6, fill: index ? 0.3 : 0.7, r: 2 }),
    ),
    lines(10, 12, 76, 4),
  ].join(''),
  pane: [
    FRAME,
    box({ x: 4, y: 4, w: 88, h: 14, fill: 0.08, r: 4 }),
    box({ x: 10, y: 9.5, w: 26, h: 3, fill: 0.4, r: 1.5 }),
    lines(10, 26, 76, 5),
  ].join(''),
  'collapsible-panel': [
    FRAME,
    box({ x: 4, y: 4, w: 30, h: 64, fill: 0.12, r: 4 }),
    stroke('M27 34 L24 37 L27 40'),
    lines(8, 12, 14, 3),
    lines(40, 12, 46, 4),
  ].join(''),
  'surface-scaffold': [
    box({ x: 0, y: 0, w: WIDTH, h: HEIGHT, fill: 0.08, r: 4 }),
    box({ x: 18, y: 12, w: 60, h: 48, fill: 0.02, line: true, r: 4 }),
    box({ x: 24, y: 18, w: 22, h: 3, fill: 0.45, r: 1.5 }),
    lines(24, 28, 48, 2),
    box({ x: 58, y: 48, w: 14, h: 6, fill: 0.5, r: 3 }),
    box({ x: 42, y: 48, w: 14, h: 6, line: true, r: 3 }),
  ].join(''),
  'surface-scaffold#PopoverDialogSurface': [
    box({ x: 10, y: 8, w: 20, h: 8, line: true, r: 3 }),
    stroke('M20 20 L24 24 L16 24 Z', 0.55),
    box({ x: 10, y: 24, w: 62, h: 40, line: true, r: 4 }),
    lines(16, 32, 50, 3),
  ].join(''),
  // KF-ZWG0B2: a floating panel whose header holds the title (its move
  // handle), Pin, and Close.
  'surface-scaffold#PinnablePopoverSurface': [
    box({ x: 14, y: 10, w: 68, h: 52, line: true, r: 4 }),
    box({ x: 14, y: 10, w: 68, h: 12, fill: 0.12, r: 4 }),
    box({ x: 20, y: 14.5, w: 24, h: 3, fill: 0.45, r: 1.5 }),
    stroke('M62 13 L66 17 M64 15 L60 19 M66 13 L68 15', 0.55),
    stroke('M72 13.5 L76 17.5 M76 13.5 L72 17.5', 0.55),
    lines(20, 30, 54, 3),
    stroke('M76 58 L78 56 M73 58 L78 53', 0.4),
  ].join(''),
  'surface-scaffold#PopupSurface': [
    box({ x: 22, y: 10, w: 52, h: 52, line: true, r: 4 }),
    box({ x: 26, y: 24, w: 44, h: 10, fill: 0.14, r: 2 }),
    lines(30, 17, 30, 1),
    lines(30, 28, 30, 1),
    lines(30, 40, 30, 3, 8),
  ].join(''),
  'list-detail-dialog': [
    box({ x: 0, y: 0, w: WIDTH, h: HEIGHT, fill: 0.08, r: 4 }),
    box({ x: 12, y: 10, w: 72, h: 52, fill: 0.02, line: true, r: 4 }),
    box({ x: 12, y: 10, w: 24, h: 52, fill: 0.12, r: 4 }),
    lines(16, 18, 16, 4),
    lines(42, 18, 36, 3),
  ].join(''),
  'workbench-dialog': [
    box({ x: 0, y: 0, w: WIDTH, h: HEIGHT, fill: 0.08, r: 4 }),
    box({ x: 12, y: 10, w: 72, h: 52, fill: 0.02, line: true, r: 4 }),
    box({ x: 12, y: 10, w: 18, h: 52, fill: 0.12, r: 4 }),
    box({ x: 66, y: 10, w: 18, h: 52, fill: 0.12, r: 4 }),
    lines(36, 18, 24, 3),
  ].join(''),
  row: [0, 1, 2]
    .map((index) =>
      box({
        x: 8 + index * 28,
        y: 26,
        w: 24,
        h: 20,
        line: true,
        fill: 0.08,
        r: 3,
      }),
    )
    .join(''),
  grid: [0, 1, 2, 3, 4, 5]
    .map((index) =>
      box({
        x: 8 + (index % 3) * 28,
        y: 12 + Math.floor(index / 3) * 26,
        w: 24,
        h: 22,
        line: true,
        fill: 0.08,
        r: 3,
      }),
    )
    .join(''),
  'column-track': [0, 1, 2]
    .map((index) =>
      box({
        x: 8 + index * 28,
        y: 8,
        w: 24,
        h: 56,
        line: true,
        fill: 0.06,
        r: 3,
      }),
    )
    .join(''),
  list: [0, 1, 2, 3]
    .map(
      (index) =>
        box({ x: 10, y: 12 + index * 13, w: 6, h: 6, fill: 0.4, r: 3 }) +
        box({
          x: 22,
          y: 13.5 + index * 13,
          w: index % 2 ? 40 : 56,
          h: 3,
          fill: 0.3,
          r: 1.5,
        }),
    )
    .join(''),
  form: [
    box({ x: 12, y: 10, w: 20, h: 3, fill: 0.4, r: 1.5 }),
    box({ x: 12, y: 16, w: 72, h: 10, line: true, r: 3 }),
    box({ x: 12, y: 32, w: 20, h: 3, fill: 0.4, r: 1.5 }),
    box({ x: 12, y: 38, w: 72, h: 10, line: true, r: 3 }),
    box({ x: 62, y: 54, w: 22, h: 8, fill: 0.5, r: 4 }),
  ].join(''),
  spacer: [
    box({ x: 8, y: 24, w: 20, h: 24, line: true, fill: 0.08, r: 3 }),
    box({ x: 68, y: 24, w: 20, h: 24, line: true, fill: 0.08, r: 3 }),
    stroke('M34 36 H62 M38 32 L34 36 L38 40 M58 32 L62 36 L58 40'),
  ].join(''),
  'sized-region': [
    box({ x: 22, y: 8, w: 52, h: 56, line: true, fill: 0.06, r: 3 }),
    stroke('M82 10 V62 M78 14 L82 10 L86 14 M78 58 L82 62 L86 58'),
  ].join(''),
  'column-explorer': [
    FRAME,
    ...[4, 33, 62].map((x, column) =>
      [
        box({ x: x + 3, y: 10 + column * 8, w: 23, h: 7, fill: 0.14, r: 2 }),
        lines(x + 6, 12, 16, 6),
      ].join(''),
    ),
    stroke('M33 4 V68 M62 4 V68', 0.35),
  ].join(''),
  toolbar: [
    box({ x: 4, y: 24, w: 88, h: 24, line: true, fill: 0.04, r: 4 }),
    box({ x: 10, y: 34.5, w: 26, h: 3, fill: 0.45, r: 1.5 }),
    box({ x: 58, y: 30, w: 12, h: 12, line: true, r: 3 }),
    box({ x: 74, y: 30, w: 12, h: 12, line: true, r: 3 }),
  ].join(''),
  'sunken-panel': [
    FRAME,
    box({ x: 12, y: 14, w: 72, h: 44, fill: 0.12, r: 3 }),
    lines(18, 22, 56, 4),
  ].join(''),
  'paged-view': [
    box({ x: 10, y: 8, w: 76, h: 46, line: true, fill: 0.06, r: 4 }),
    ...[40, 48, 56].map((x, index) =>
      box({ x: x - 2, y: 60, w: 4, h: 4, fill: index ? 0.3 : 0.7, r: 2 }),
    ),
  ].join(''),
  'tab-panel': [
    box({ x: 8, y: 8, w: 24, h: 10, fill: 0.14, r: 3 }),
    box({ x: 36, y: 11, w: 18, h: 3, fill: 0.3, r: 1.5 }),
    box({ x: 60, y: 11, w: 18, h: 3, fill: 0.3, r: 1.5 }),
    box({ x: 8, y: 22, w: 80, h: 42, line: true, r: 4 }),
    lines(14, 30, 60, 3),
  ].join(''),
  'scroll-effect': [
    FRAME,
    lines(10, 12, 66, 6),
    box({ x: 84, y: 10, w: 3, h: 20, fill: 0.45, r: 1.5 }),
  ].join(''),
  'backdrop-image': [
    box({ x: 6, y: 8, w: 84, h: 56, line: true, fill: 0.06, r: 4 }),
    `<circle cx="70" cy="22" r="6" fill="currentColor" fill-opacity="0.3"/>`,
    stroke('M10 58 L34 30 L52 50 L62 40 L86 60', 0.55),
  ].join(''),
  'editor-frame': [
    FRAME,
    box({ x: 4, y: 4, w: 14, h: 64, fill: 0.1, r: 4 }),
    lines(24, 12, 52, 6),
  ].join(''),
  resize: [
    FRAME,
    stroke('M48 4 V68', 0.35),
    box({ x: 46, y: 28, w: 4, h: 16, fill: 0.5, r: 2 }),
    lines(10, 12, 30, 4),
  ].join(''),
};

/** Components drawn as another's sketch. */
const SAME_AS: Readonly<Record<string, string>> = {
  'collapsible-panel#CollapsiblePanelRelocated': 'collapsible-panel',
};

/**
 * The sketch for catalog component `key` (`@kerfjs/ui:workbench`), as SVG
 * markup, or undefined when its live thumbnail shows it.
 */
export function paletteSketch(key: string): string | undefined {
  const prefix = '@kerfjs/ui:';
  if (!key.startsWith(prefix)) return undefined;
  const id = key.slice(prefix.length);
  const drawing = SKETCHES[SAME_AS[id] ?? id];
  return drawing === undefined
    ? undefined
    : `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" width="100%" height="100%" aria-hidden="true">${drawing}</svg>`;
}
