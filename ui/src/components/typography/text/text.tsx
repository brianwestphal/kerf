import type { KerfBaseAttrs } from 'kerfjs/jsx-runtime';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import type { Sides } from '../../../shared/layout/sides.js';
import type { CssForegroundColor } from '../../../shared/styles/css-values.js';

export {
  FieldLabel,
  type FieldLabelProps,
} from '../../forms/field-label/field-label.js';

export type TextVariant =
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
export type TextTone = 'default' | 'quiet' | 'danger';
export type TextSize = 'compact' | 'default' | 'large' | 'xlarge';
export type TextFont = 'default' | 'monospace';
export type TextBorder = 'transparent' | 'none';
export type TextLineHeight = 'default' | 'tight';
export type TextWrap = 'normal' | 'anywhere' | 'nowrap' | 'truncate';
/**
 * Where `wrap="truncate"` places its ellipsis: `end` (default) keeps the
 * start, `start` keeps the tail (branch names, the end of an identifier), and
 * `middle` keeps both the start and a suffix (file paths).
 */
export type TextTruncate = 'end' | 'middle' | 'start';
/**
 * The suffix `truncate="middle"` always keeps: a number of trailing
 * characters, or `segment` for the last path segment with its separator.
 */
export type TextTruncateKeep = number | 'segment';

export type TextContent =
  KerfUiContent | string | number | readonly TextContent[];

type TextCommonProps = Omit<
  KerfBaseAttrs,
  'children' | 'class' | 'className'
> & {
  /** Native heading, paragraph, or inline span element to render. Defaults to `p`. */
  variant?: TextVariant;
  /** Semantic foreground treatment. Defaults to the inherited foreground. */
  tone?: TextTone;
  /** Foreground color; overrides tone when supplied, or inherits when omitted. */
  color?: CssForegroundColor;
  /** Text sizing independent of the native semantic element. */
  size?: TextSize;
  /** Font family independent of the native semantic element. */
  font?: TextFont;
  /** Transparent alignment border or no border when embedded in owner chrome. */
  border?: TextBorder;
  /** Add the shared control gutter outside selected physical edges. */
  controlMargins?: Sides;
  /** Remove the block variant's item padding and border in compact content. */
  flush?: boolean;
  /** Use compact leading for short dialog or metadata copy. */
  lineHeight?: TextLineHeight;
  children: TextContent;
  class?: string;
  className?: string;
};

export type TextProps = TextCommonProps &
  (
    | {
        /** Wrap normally or break long unbroken strings. Defaults to normal. */
        wrap?: 'normal' | 'anywhere';
        /** Cap wrapped text to this positive number of lines. */
        maxLines?: number;
        truncate?: never;
        truncateKeep?: never;
      }
    | {
        /** Keep one line without an ellipsis. */
        wrap: 'nowrap';
        maxLines?: never;
        truncate?: never;
        truncateKeep?: never;
      }
    | {
        /** Keep one line with an ellipsis. */
        wrap: 'truncate';
        maxLines?: never;
        /**
         * Where the ellipsis goes (default `end`). `start` and `middle` are
         * for left-to-right identifiers and paths, and `middle` requires
         * string or number children so it can split them.
         */
        truncate?: TextTruncate;
        /**
         * The suffix `truncate="middle"` keeps (default `segment`: the last
         * path segment, or the last 10 characters when there is no `/` or
         * `\\` separator).
         */
        truncateKeep?: TextTruncateKeep;
      }
  );

/** Characters a middle truncation keeps when the text has no path separator. */
const MIDDLE_FALLBACK_KEEP = 10;

/** Split text into the shrinkable head and the always-kept tail. */
function splitMiddle(text: string, keep: TextTruncateKeep): [string, string] {
  let tailLength: number;
  if (keep === 'segment') {
    // Ignore one trailing separator so `src/lib/` keeps `/lib/`.
    const searchEnd = /[/\\]$/.test(text) ? text.length - 1 : text.length;
    const separator = Math.max(
      text.lastIndexOf('/', searchEnd - 1),
      text.lastIndexOf('\\', searchEnd - 1),
    );
    tailLength = separator > 0 ? text.length - separator : MIDDLE_FALLBACK_KEEP;
  } else tailLength = keep;
  if (tailLength >= text.length) return [text, ''];
  return [text.slice(0, -tailLength), text.slice(-tailLength)];
}

/**
 * Semantic heading, paragraph, or inline text. Block variants use the standard
 * content-item padding; `span` adds no box geometry.
 * All ordinary native heading/paragraph attributes pass through to the element.
 */
export function Text({
  variant: Variant = 'p',
  tone = 'default',
  color,
  size = 'default',
  font = 'default',
  border = 'transparent',
  flush = false,
  controlMargins = '',
  lineHeight = 'default',
  wrap = 'normal',
  maxLines,
  truncate,
  truncateKeep,
  children,
  class: classValue = '',
  className = '',
  style,
  ...attributes
}: TextProps) {
  if (
    maxLines !== undefined &&
    (!Number.isSafeInteger(maxLines) ||
      maxLines < 1 ||
      wrap === 'nowrap' ||
      wrap === 'truncate')
  )
    throw new RangeError(
      'Text maxLines requires a positive integer and wrapping',
    );
  const position = truncate ?? 'end';
  if (
    (truncate !== undefined && wrap !== 'truncate') ||
    !['end', 'middle', 'start'].includes(position)
  )
    throw new RangeError(
      'Text truncate requires wrap="truncate" and one of end, middle, or start',
    );
  if (
    truncateKeep !== undefined &&
    (position !== 'middle' ||
      (truncateKeep !== 'segment' &&
        (!Number.isSafeInteger(truncateKeep) || truncateKeep < 1)))
  )
    throw new RangeError(
      'Text truncateKeep requires truncate="middle" and a positive integer or "segment"',
    );
  const textValue =
    typeof children === 'string' || typeof children === 'number'
      ? String(children)
      : undefined;
  if (position === 'middle' && textValue === undefined)
    throw new TypeError(
      'Text truncate="middle" requires string or number children',
    );
  // Visually clipped start/middle text keeps its full value in the DOM; the
  // title shows it to pointer users unless the app supplied its own.
  const title =
    attributes.title === undefined && position !== 'end'
      ? textValue
      : attributes.title;
  const classes = ['kui-text', classValue, className].filter(Boolean).join(' ');
  return (
    <Variant
      {...attributes}
      class={classes}
      data-component="text"
      data-tone={tone}
      data-size={size}
      data-font={font}
      data-border={border}
      data-control-margins={controlMargins || undefined}
      data-flush={flush ? 'true' : undefined}
      data-line-height={lineHeight === 'tight' ? 'tight' : undefined}
      data-wrap={wrap === 'normal' ? undefined : wrap}
      data-max-lines={maxLines === undefined ? undefined : String(maxLines)}
      data-truncate={position === 'end' ? undefined : position}
      title={title}
      style={
        color === undefined
          ? style
          : `${style === undefined || style === null ? '' : `${style};`}color:${color}`
      }
    >
      {textBody(position, children, textValue, truncateKeep, maxLines)}
    </Variant>
  );
}

/** The element's content for its truncation position or line cap. */
function textBody(
  position: TextTruncate,
  children: TextContent,
  textValue: string | undefined,
  truncateKeep: TextTruncateKeep | undefined,
  maxLines: number | undefined,
): TextContent {
  switch (position) {
    case 'start':
      return (
        <span class="kui-text__truncate-start">
          <span dir="ltr">{children}</span>
        </span>
      );
    case 'middle':
      return (
        <TruncateMiddle
          parts={splitMiddle(textValue!, truncateKeep ?? 'segment')}
        />
      );
    case 'end':
      return maxLines === undefined ? (
        children
      ) : (
        <span
          class="kui-text__clamp"
          style={`--_kui-text-max-lines:${maxLines}`}
        >
          {children}
        </span>
      );
  }
}

function TruncateMiddle({ parts: [head, tail] }: { parts: [string, string] }) {
  return (
    <span class="kui-text__truncate-middle">
      <span class="kui-text__truncate-head">{head}</span>
      {tail ? <span class="kui-text__truncate-tail">{tail}</span> : ''}
    </span>
  );
}

export type { Sides } from '../../../shared/layout/sides.js';
