import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import { type CssLength, em } from '../../../shared/styles/css-values.js';
import { Skeleton } from '../../feedback/skeleton/skeleton.js';

export type ToolbarTextSize =
  'xlarge' | 'xlarge-fixed' | 'large' | 'default' | 'small' | 'xsmall';

export type ToolbarTextTone = 'default' | 'dark';

/** ARIA heading level for a title exposed as a heading landmark. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface ToolbarTextBaseProps {
  text: string;
  size?: ToolbarTextSize;
  /**
   * Use loud-toolbar foregrounds on a toolbar painted with the inverse loud
   * fill, matching dark control groups; like them it inverts with the color
   * scheme. Over a dark photo or scrim keep the default tone inside a
   * `BackdropImage` overlay, which takes the dark scheme under its scrim.
   */
  tone?: ToolbarTextTone;
  /** Hide below this Toolbar content width; requires wireToolbarVisibility. */
  hideBelow?: CssLength;
  /** Show only below this Toolbar content width; requires wireToolbarVisibility. */
  showBelow?: CssLength;
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
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
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
        /**
         * Quiet, single-line supporting copy under the title ("Changes save
         * automatically."), truncating with an ellipsis. Title and description
         * share the toolbar's control band and the same text start, with or
         * without a leading icon group. With a description, `id` and
         * `headingLevel` apply to the title alone, so a dialog's
         * `aria-labelledby` names only the title.
         */
        description?: string;
        /** Id for the description, for a dialog's `aria-describedby`. */
        descriptionId?: string;
      } & ToolbarTextWrappingProps)
    | {
        /** Render a native button with this delegated action; the app owns editing. */
        action: string;
        headingLevel?: never;
        placeholder?: never;
        wrap?: never;
        maxLines?: never;
        description?: never;
        descriptionId?: never;
      }
  );

const TOOLBAR_TEXT_PROTECTED = new Set([
  'data-action',
  'data-component',
  'data-ellipsis',
  'data-fill',
  'data-has-description',
  'data-hide-below',
  'data-max-lines',
  'data-placeholder',
  'data-show-below',
  'data-size',
  'data-tone',
  'data-wrap',
]);

export function ToolbarText({
  text,
  size = 'default',
  tone = 'default',
  hideBelow,
  showBelow,
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
  description,
  descriptionId,
  rootAttributes = {},
}: ToolbarTextProps) {
  const capped = wrap && maxLines != null && maxLines > 0;
  if (action !== undefined)
    return (
      <button
        {...filterDataAttributes(rootAttributes, TOOLBAR_TEXT_PROTECTED)}
        type="button"
        class={`kui-toolbar-text ${className}`.trim()}
        data-component="toolbar-text"
        data-size={size}
        data-hide-below={hideBelow}
        data-show-below={showBelow}
        data-tone={tone === 'default' ? undefined : tone}
        data-fill={fill ? 'true' : undefined}
        data-ellipsis={ellipsis ? undefined : 'false'}
        data-action={action}
        id={id}
        slot={slot}
      >
        <span class="kui-toolbar-text__text">{text}</span>
      </button>
    );
  const described = description !== undefined && !placeholder;
  const title = placeholder ? (
    <Skeleton width={em(8)} />
  ) : (
    <span
      class="kui-toolbar-text__text"
      id={described ? id : undefined}
      role={described && headingLevel ? 'heading' : undefined}
      aria-level={described && headingLevel ? String(headingLevel) : undefined}
    >
      {text}
    </span>
  );
  return (
    <span
      {...filterDataAttributes(rootAttributes, TOOLBAR_TEXT_PROTECTED)}
      class={`kui-toolbar-text ${className}`.trim()}
      data-component="toolbar-text"
      data-size={size}
      data-hide-below={hideBelow}
      data-show-below={showBelow}
      data-tone={tone === 'default' ? undefined : tone}
      data-fill={fill ? 'true' : undefined}
      data-wrap={wrap ? 'true' : undefined}
      data-ellipsis={ellipsis ? undefined : 'false'}
      data-max-lines={capped ? String(maxLines) : undefined}
      style={capped ? `--kui-toolbar-text-max-lines:${maxLines}` : undefined}
      data-placeholder={placeholder ? 'true' : undefined}
      data-has-description={described ? 'true' : undefined}
      id={described ? undefined : id}
      role={headingLevel && !described ? 'heading' : undefined}
      aria-level={headingLevel && !described ? String(headingLevel) : undefined}
      aria-busy={placeholder ? 'true' : undefined}
      slot={slot}
    >
      {title}
      {described ? (
        <span class="kui-toolbar-text__description" id={descriptionId}>
          {description}
        </span>
      ) : null}
    </span>
  );
}
