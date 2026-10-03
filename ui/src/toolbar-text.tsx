import { em } from './css-values.js';
import { Skeleton } from './skeleton.js';

export type ToolbarTextSize =
  'xlarge' | 'xlarge-fixed' | 'large' | 'default' | 'small' | 'xsmall';

/** ARIA heading level for a title exposed as a heading landmark. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface ToolbarTextBaseProps {
  text: string;
  size?: ToolbarTextSize;
  className?: string;
  /** Optional id, e.g. so a dialog can reference the title via aria-labelledby. */
  id?: string;
  /**
   * Show a trailing ellipsis (…) where the text is truncated — on the single line
   * (default), or at the `maxLines` boundary when wrapping. Set false to hard-clip
   * instead. Default true.
   */
  ellipsis?: boolean;
  /**
   * Grow to fill the free space of the flex row it sits in (a Toolbar zone),
   * truncating at the space left by its siblings instead of taking only its
   * text's width. Default false.
   */
  fill?: boolean;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
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

export type ToolbarTextProps = ToolbarTextBaseProps &
  (
    | ({
        action?: never;
        /** Expose `role="heading"` and `aria-level` on read-only text. */
        headingLevel?: HeadingLevel;
        /** Render an unanimated loading skeleton instead of the text. */
        placeholder?: boolean;
      } & ToolbarTextWrappingProps)
    | {
        /** Render a native button with this delegated action; the app owns editing. */
        action: string;
        headingLevel?: never;
        placeholder?: never;
        wrap?: never;
        maxLines?: never;
      }
  );

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
  fill = false,
  slot,
  action,
}: ToolbarTextProps) {
  const capped = wrap && maxLines != null && maxLines > 0;
  if (action !== undefined)
    return (
      <button
        type="button"
        class={`kui-toolbar-text ${className}`.trim()}
        data-component="toolbar-text"
        data-size={size}
        data-fill={fill ? 'true' : undefined}
        data-ellipsis={ellipsis ? undefined : 'false'}
        data-action={action}
        id={id}
        slot={slot}
      >
        <span class="kui-toolbar-text__text">{text}</span>
      </button>
    );
  return (
    <span
      class={`kui-toolbar-text ${className}`.trim()}
      data-component="toolbar-text"
      data-size={size}
      data-fill={fill ? 'true' : undefined}
      data-wrap={wrap ? 'true' : undefined}
      data-ellipsis={ellipsis ? undefined : 'false'}
      data-max-lines={capped ? String(maxLines) : undefined}
      style={capped ? `--kui-toolbar-text-max-lines:${maxLines}` : undefined}
      data-placeholder={placeholder ? 'true' : undefined}
      id={id}
      role={headingLevel ? 'heading' : undefined}
      aria-level={headingLevel ? String(headingLevel) : undefined}
      aria-busy={placeholder ? 'true' : undefined}
      slot={slot}
    >
      {placeholder ? (
        <Skeleton width={em(8)} />
      ) : (
        <span class="kui-toolbar-text__text">{text}</span>
      )}
    </span>
  );
}
