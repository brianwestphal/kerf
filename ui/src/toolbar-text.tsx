import { Skeleton } from './skeleton.js';

export type ToolbarTextSize = 'xlarge' | 'large' | 'default' | 'small';

/** ARIA heading level for a title exposed as a heading landmark. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface ToolbarTextBaseProps {
  text: string;
  size?: ToolbarTextSize;
  className?: string;
  /** Optional id, e.g. so a dialog can reference the title via aria-labelledby. */
  id?: string;
  /**
   * Expose heading semantics (`role="heading"` + `aria-level`) so the text acts as
   * a heading landmark — e.g. a page's primary title. Omit to keep the plain span
   * (the default), which suits a dialog title referenced via `aria-labelledby`.
   */
  headingLevel?: HeadingLevel;
  /** Render the text as an unanimated loading skeleton instead of its value. */
  placeholder?: boolean;
  /**
   * Show a trailing ellipsis (…) where the text is truncated — on the single line
   * (default), or at the `maxLines` boundary when wrapping. Set false to hard-clip
   * instead. Default true.
   */
  ellipsis?: boolean;
  /**
   * Cap wrapped text to this many lines, truncating past it. Only takes effect with
   * `wrap`; ignored on a single line. `null`/omitted wraps without a line cap. Default null.
   */
}

type ToolbarTextWrappingProps =
  | {
      /** Wrap onto multiple lines; combine with `maxLines` to cap them. */
      wrap: true;
      maxLines?: number | null;
    }
  | { wrap?: false; maxLines?: never };

export type ToolbarTextProps = ToolbarTextBaseProps & ToolbarTextWrappingProps;

export function ToolbarText({
  text,
  size = 'default',
  className = '',
  id,
  headingLevel,
  placeholder = false,
  wrap = false,
  ellipsis = true,
  maxLines = null,
}: ToolbarTextProps) {
  const capped = wrap && maxLines != null && maxLines > 0;
  return (
    <span
      class={`kui-toolbar-text ${className}`.trim()}
      data-component="toolbar-text"
      data-size={size}
      data-wrap={wrap ? 'true' : undefined}
      data-ellipsis={ellipsis ? undefined : 'false'}
      data-max-lines={capped ? String(maxLines) : undefined}
      style={capped ? `--kui-toolbar-text-max-lines:${maxLines}` : undefined}
      data-placeholder={placeholder ? 'true' : undefined}
      id={id}
      role={headingLevel ? 'heading' : undefined}
      aria-level={headingLevel ? String(headingLevel) : undefined}
      aria-busy={placeholder ? 'true' : undefined}
    >
      {placeholder ? (
        <Skeleton width="8em" />
      ) : (
        <span class="kui-toolbar-text__text">{text}</span>
      )}
    </span>
  );
}
