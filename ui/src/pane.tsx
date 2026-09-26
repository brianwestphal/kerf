import { filterDataAttributes } from './extension-attributes.js';
import type { KerfUiContent } from './semantic-content.js';

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
  }
>;

export interface PaneProps {
  /** Optional fixed chrome above the scrolling content, arranged vertically. */
  header?: KerfUiContent;
  /** The pane's primary vertical, scrolling content stack. */
  children?: KerfUiContent;
  /** Optional fixed chrome below the scrolling content. */
  footer?: KerfUiContent;
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
    class: `kui-pane ${className}`.trim(),
    id,
    'data-component': 'pane',
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
    slot,
  };

  if (element === 'article') return <article {...attributes}>{body}</article>;
  if (element === 'aside') return <aside {...attributes}>{body}</aside>;
  if (element === 'main') return <main {...attributes}>{body}</main>;
  if (element === 'section') return <section {...attributes}>{body}</section>;
  return <div {...attributes}>{body}</div>;
}
