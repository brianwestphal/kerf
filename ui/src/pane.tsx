import { filterDataAttributes } from './extension-attributes.js';
import type { KerfUiContent } from './semantic-content.js';

/** Logical sides that can show a {@link Pane} separator. */
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
]);

type PaneRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-separator-block-start'?: never;
    'data-separator-block-end'?: never;
    'data-separator-inline-start'?: never;
    'data-separator-inline-end'?: never;
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
  id,
  label,
  contentLabel,
  className = '',
  headerClassName = '',
  contentClassName = '',
  footerClassName = '',
  rootAttributes = {},
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
      {header === undefined ? (
        <></>
      ) : (
        <header
          class={`kui-pane__header kui-pane__toolbar ${headerClassName}`.trim()}
        >
          {header}
        </header>
      )}
      {content}
      {footer === undefined ? (
        <></>
      ) : (
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
    'aria-label': label,
  };

  if (element === 'article') return <article {...attributes}>{body}</article>;
  if (element === 'aside') return <aside {...attributes}>{body}</aside>;
  if (element === 'main') return <main {...attributes}>{body}</main>;
  if (element === 'section') return <section {...attributes}>{body}</section>;
  return <div {...attributes}>{body}</div>;
}
