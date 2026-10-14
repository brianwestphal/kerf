import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import type { ScrollClearance } from '../../../shared/layout/scroll-clearance.js';
import type { ScrollEdge } from '../../../shared/layout/scroll-edge.js';
import type { CssColor } from '../../../shared/styles/css-values.js';
import { ensureSunkenTexture } from '../../../shared/styles/sunken-texture.js';
import {
  joinStyles,
  type SurfaceTint,
  surfaceTintAttributes,
} from '../../../shared/styles/surface-tint.js';

/**
 * Logical pane sides: where a {@link Pane} can show a separator and where it can
 * compensate for a device safe-area inset.
 */
export type PaneSeparatorSide =
  'block-start' | 'block-end' | 'inline-start' | 'inline-end';

/** Semantic root elements supported by {@link Pane}. */
export type PaneElement = 'article' | 'aside' | 'div' | 'main' | 'section';

/** Semantic elements supported by the scrolling content slot. */
export type PaneContentElement = 'div' | 'main' | 'nav' | 'section';

const paneProtectedAttributes = new Set([
  'data-component',
  'data-chrome-placement',
  'data-chrome-dividers',
  'data-appearance',
  'data-background',
  'data-kui-tint',
  'data-deep-inset',
  'data-outlined',
  'data-scroll-clearance',
  'data-header-presentation',
  'data-header-material',
  'data-scroll-edge',
  'data-header-overlay',
  'data-separator-block-start',
  'data-separator-block-end',
  'data-separator-inline-start',
  'data-separator-inline-end',
  'data-safe-area-block-start',
  'data-safe-area-block-end',
  'data-safe-area-inline-start',
  'data-safe-area-inline-end',
]);

const allPaneSides: readonly PaneSeparatorSide[] = [
  'block-start',
  'block-end',
  'inline-start',
  'inline-end',
];

type PaneRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-separator-block-start'?: never;
    'data-separator-block-end'?: never;
    'data-separator-inline-start'?: never;
    'data-separator-inline-end'?: never;
    'data-safe-area-block-start'?: never;
    'data-safe-area-block-end'?: never;
    'data-safe-area-inline-start'?: never;
    'data-safe-area-inline-end'?: never;
    'data-chrome-placement'?: never;
    'data-chrome-dividers'?: never;
    'data-appearance'?: never;
    'data-background'?: never;
    'data-kui-tint'?: never;
    'data-deep-inset'?: never;
    'data-outlined'?: never;
    'data-scroll-clearance'?: never;
    'data-header-presentation'?: never;
    'data-header-material'?: never;
    'data-scroll-edge'?: never;
    'data-header-overlay'?: never;
  }
>;

/** How a Pane's header and footer relate to its scrolling content. */
export type PaneChromePlacement = 'fixed' | 'auto';

/**
 * When a Pane draws the divider between its pinned header or footer and its
 * scrolling content: `scroll` while content is scrolled away beneath that
 * chrome, as `wireScrollDividers` reports; `always`; or `none`.
 */
export type PaneChromeDividers = 'scroll' | 'always' | 'none';

/**
 * How a Pane's header relates to its scrolling content: `docked` in its own
 * row above the content, or `overlay` laid over the content's top edge on the
 * translucent chrome material, so content scrolls visibly beneath it.
 * `clear` lays it over
 * the same edge fully transparent, for chrome over imagery: legibility comes
 * from glass control groups or a scrim, and with `scrollEdge="material"` the
 * chrome material fades in once content scrolls beneath it.
 */
export type PaneHeaderPresentation = 'docked' | 'overlay' | 'clear';

/** Background treatment of the Pane's scrolling work surface. */
export type PaneAppearance = 'default' | 'sunken';

export interface PaneProps {
  /** Optional fixed chrome above the scrolling content, arranged vertically. */
  header?: KerfUiContent;
  /** The pane's primary vertical, scrolling content stack. */
  children?: KerfUiContent;
  /** Optional fixed chrome below the scrolling content. */
  footer?: KerfUiContent;
  /**
   * Whether the header and footer stay pinned around the scrolling content.
   * `fixed` (default) always pins them. `auto` pins them while the pane is
   * tall enough, and below 480px of height (30rem, so it scales with the text
   * size) lets the whole pane scroll as one column, so tall chrome can never
   * squeeze the content to nothing.
   */
  chromePlacement?: PaneChromePlacement;
  /**
   * The divider under the header and over the footer, where they meet the
   * scrolling content. Omitted defaults to `scroll` for a plain pane and
   * `always` for `appearance="sunken"`. `scroll` shows the header's divider only
   * while the content is scrolled down, and the footer's only while more
   * content lies below — never when the content fits — once
   * `wireScrollDividers` (`@kerfjs/ui/wire-scroll-dividers`) is wired above
   * the pane; unwired, neither shows. `always` shows both; `none` neither.
   * The line is drawn inside the chrome, so no state moves the content.
   */
  chromeDividers?: PaneChromeDividers;
  /**
   * `docked` (default) gives the header its own row above the scrolling
   * content. `overlay` lays the header over the content's top edge on the
   * translucent chrome material (`--kui-chrome-material`, opaque under
   * `prefers-reduced-transparency`, forced colors, or without
   * `backdrop-filter`), so content scrolls visibly beneath it. Once
   * `wireScrollDividers` (`@kerfjs/ui/wire-scroll-dividers`) is wired above
   * the pane it measures the header and publishes its height as the
   * `--kui-scroll-clearance-block-start` context, which the content adds to
   * its block-start padding and `scroll-padding` without any
   * `scrollClearance` prop, so the first item, and anything focused or
   * scrolled into view, rests clear of the header. Until then, and with
   * `chromePlacement="auto"`, the header stays docked. Keep overlay header
   * text in the normal text color: quiet text can fall below AA over the
   * content passing beneath it.
   */
  headerPresentation?: PaneHeaderPresentation;
  /**
   * With `headerPresentation="clear"`, `material` fades the chrome material
   * in behind the header once content scrolls beneath it (default `none`).
   */
  scrollEdge?: ScrollEdge;
  /** Paint the scrolling work surface with the shared lowered-surface color. */
  appearance?: PaneAppearance;
  /**
   * Paint the whole pane, header and footer included, in an app-chosen color
   * (`uiColor('surface-raised')`, `fillColor('#1f2a44')`, or `colorVar(…)`
   * from `@kerfjs/ui/css-values`). It replaces the appearance's fill: a sunken
   * pane drops its lowered color and grain. Omitted, the pane keeps its
   * default (transparent, or the sunken surface). Forced colors paint
   * `Canvas`. Keep text at AA over the color; a dark color needs a matching
   * tint or dark tones for its content.
   */
  background?: CssColor;
  /**
   * A scoped tint: `{ color, scheme }`, the app's color and the scheme it
   * belongs to. The pane paints the tinted surface (unless `background` is
   * set) and its whole subtree, chrome material and quiet fills included,
   * re-derives its surface and text tokens from the color with lightness
   * clamped to keep text at WCAG AA. Without relative color syntax, or under
   * `prefers-contrast: more`, the scope keeps the plain palette in the
   * declared scheme.
   */
  tint?: SurfaceTint;
  /**
   * Clear chrome that lies over the scrolling content's block-start and/or
   * block-end edge, such as a `DialogSurface` floating footer over a filling
   * Pane. The content scroller adds the inherited
   * `--kui-scroll-clearance-block-*` context that chrome publishes to its block
   * padding and `scroll-padding`, so content scrolls visibly beneath the chrome
   * while its first and last items (and anything focused or scrolled into
   * view) can still rest clear of it. Defaults to none.
   */
  scrollClearance?: ScrollClearance;
  /** Add 8px to every side of scrolling content (default: false). */
  deepInset?: boolean;
  /** Opt into keyboard (`0`) or programmatic (`-1`) focus on the Pane root. */
  tabIndex?: 0 | -1;
  /** Keep the standard focus outline visible, such as for a drop target. */
  outlined?: boolean;
  /** Root semantics. Defaults to `div`. */
  element?: PaneElement;
  /** Scrolling content semantics. Defaults to `div`. */
  contentElement?: PaneContentElement;
  /** Independent logical-edge separator lines. Defaults to none. */
  separators?: readonly PaneSeparatorSide[];
  /**
   * Sides on which the pane may compensate for a device safe-area inset.
   * Defaults to every side: the pane pads its slots for each side that still
   * reaches an unsafe screen edge, as its surrounding layout reports, while its
   * background and separators paint through. List only the sides an app-owned
   * layout places at a screen edge, or pass `[]` to opt out.
   */
  safeAreaEdges?: readonly PaneSeparatorSide[];
  id?: string;
  /** Accessible name for a landmark root such as `aside` or `main`. */
  label?: string;
  /** Accessible name for a landmark scrolling slot such as `nav`. */
  contentLabel?: string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  /** Safe `data-*` metadata; Pane-owned structural attributes remain protected. */
  rootAttributes?: PaneRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A pane's configuration, apart from its content and styling hooks: the props a
 * composite that renders a `Pane` for the app (a Workbench panel or work area,
 * or a CollapsiblePanel) forwards, so the app configures that pane instead of
 * styling it. An omitted or `undefined` field keeps the composite's default.
 */
export type PaneConfig = Pick<
  PaneProps,
  | 'contentElement'
  | 'contentLabel'
  | 'separators'
  | 'safeAreaEdges'
  | 'chromeDividers'
  | 'headerPresentation'
  | 'scrollEdge'
  | 'appearance'
  | 'background'
  | 'tint'
  | 'deepInset'
  | 'scrollClearance'
  | 'tabIndex'
  | 'outlined'
>;

function paneContent(
  element: PaneContentElement,
  children: KerfUiContent,
  className: string,
  label: string | undefined,
) {
  const attributes = {
    class: `kui-pane__content kui-content ${className}`.trim(),
    'aria-label': label,
  };
  if (element === 'main') return <main {...attributes}>{children}</main>;
  if (element === 'nav') return <nav {...attributes}>{children}</nav>;
  if (element === 'section')
    return <section {...attributes}>{children}</section>;
  return <div {...attributes}>{children}</div>;
}

/**
 * An unpadded application column with optional fixed header/footer slots and one
 * scrolling vertical content owner. Separator lines are independently opt-in on
 * each logical edge, so the same component works as a sidebar, main area,
 * inspector, or dialog column.
 */
export function Pane({
  header,
  children,
  footer,
  chromePlacement = 'fixed',
  chromeDividers,
  headerPresentation = 'docked',
  scrollEdge = 'none',
  appearance = 'default',
  background,
  tint,
  deepInset = false,
  scrollClearance,
  tabIndex,
  outlined = false,
  element = 'div',
  contentElement = 'div',
  separators = [],
  safeAreaEdges = allPaneSides,
  id,
  label,
  contentLabel,
  className = '',
  headerClassName = '',
  contentClassName = '',
  footerClassName = '',
  rootAttributes = {},
  slot,
}: PaneProps) {
  const safeRootAttributes = filterDataAttributes(
    rootAttributes,
    paneProtectedAttributes,
  );
  const content = paneContent(
    contentElement,
    children,
    contentClassName,
    contentLabel,
  );
  const resolvedChromeDividers =
    chromeDividers ?? (appearance === 'sunken' ? 'always' : 'scroll');
  if (appearance === 'sunken' && background === undefined)
    ensureSunkenTexture();
  const tinted = surfaceTintAttributes(tint);
  const clearHeader = headerPresentation === 'clear' && header !== undefined;
  const body = (
    <>
      {header === undefined ? null : (
        <header
          class={`kui-pane__header kui-pane__toolbar ${headerClassName}`.trim()}
        >
          {header}
        </header>
      )}
      {content}
      {footer === undefined ? null : (
        <footer class={`kui-pane__footer ${footerClassName}`.trim()}>
          {footer}
        </footer>
      )}
    </>
  );
  const attributes = {
    ...safeRootAttributes,
    class: `kui-pane ${tinted.className} ${className}`
      .replace(/\s+/g, ' ')
      .trim(),
    id,
    'data-component': 'pane',
    'data-appearance': appearance === 'sunken' ? 'sunken' : undefined,
    'data-background': background === undefined ? undefined : '',
    'data-kui-tint': tinted['data-kui-tint'],
    style: joinStyles(
      background === undefined
        ? undefined
        : `--_kui-pane-background:${background}`,
      tinted.style,
    ),
    'data-deep-inset': deepInset ? 'true' : undefined,
    'data-outlined': outlined ? 'true' : undefined,
    'data-scroll-clearance': scrollClearance,
    'data-header-presentation':
      headerPresentation !== 'docked' && header !== undefined
        ? 'overlay'
        : undefined,
    'data-header-material': clearHeader ? 'clear' : undefined,
    'data-scroll-edge':
      clearHeader && scrollEdge === 'material' ? 'material' : undefined,
    'data-chrome-placement': chromePlacement === 'auto' ? 'auto' : undefined,
    'data-chrome-dividers':
      resolvedChromeDividers === 'always' || resolvedChromeDividers === 'none'
        ? resolvedChromeDividers
        : undefined,
    'data-separator-block-start': String(separators.includes('block-start')),
    'data-separator-block-end': String(separators.includes('block-end')),
    'data-separator-inline-start': String(separators.includes('inline-start')),
    'data-separator-inline-end': String(separators.includes('inline-end')),
    'data-safe-area-block-start': String(safeAreaEdges.includes('block-start')),
    'data-safe-area-block-end': String(safeAreaEdges.includes('block-end')),
    'data-safe-area-inline-start': String(
      safeAreaEdges.includes('inline-start'),
    ),
    'data-safe-area-inline-end': String(safeAreaEdges.includes('inline-end')),
    'aria-label': label,
    tabindex: tabIndex,
    slot,
  };

  if (element === 'article') return <article {...attributes}>{body}</article>;
  if (element === 'aside') return <aside {...attributes}>{body}</aside>;
  if (element === 'main') return <main {...attributes}>{body}</main>;
  if (element === 'section') return <section {...attributes}>{body}</section>;
  return <div {...attributes}>{body}</div>;
}

export type { ScrollClearance } from '../../../shared/layout/scroll-clearance.js';
export type { ScrollEdge } from '../../../shared/layout/scroll-edge.js';
export type {
  SurfaceTint,
  SurfaceTintScheme,
} from '../../../shared/styles/surface-tint.js';
