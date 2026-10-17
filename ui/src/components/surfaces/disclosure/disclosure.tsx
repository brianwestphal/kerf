import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import { DisclosureArrow } from '../../navigation/disclosure-arrow/disclosure-arrow.js';

/**
 * The Disclosure's surface: `plain` (default) on the surrounding surface,
 * `framed` with the standard neutral border, `sunken` on the lowered,
 * textured work surface with a border, or `embedded` inside owner chrome such
 * as a `ContentItem`: no margin, border, or padding of its own and a compact
 * summary row, so the arrow sits on the owner's content inset.
 */
export type DisclosureAppearance = 'plain' | 'framed' | 'sunken' | 'embedded';

/**
 * Application `data-*` identity on the `<details>` root, such as `data-key`;
 * the Disclosure's own configuration attributes stay protected.
 */
export type DisclosureRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

const DISCLOSURE_PROTECTED = new Set([
  'data-component',
  'data-appearance',
  'data-action',
]);

export interface DisclosureProps {
  /** The always-visible summary: a short title for the hidden content. */
  title: KerfUiContent | string;
  /** A quiet line after the title in the summary, such as a count. */
  detail?: KerfUiContent | string;
  /** The content shown while open. */
  children: KerfUiContent | string;
  /**
   * Render it open. The open state belongs to the native `<details>` once it
   * is on the page: a person toggles it, a re-render that passes `open` opens
   * it, and a re-render never closes it (kerf's morph leaves a `<details>`
   * element's live `open` alone). Close it from code with `element.open = false`.
   */
  open?: boolean;
  /**
   * An exclusive group: Disclosures sharing a `name` behave as an accordion,
   * where opening one closes the others (the native `<details name>`).
   */
  name?: string;
  /**
   * Surface treatment; defaults to `plain`. Use `embedded` only inside chrome
   * that already owns the content-item inset, such as a `ContentItem`, and
   * give it content that draws no inset of its own (`Text flush`).
   */
  appearance?: DisclosureAppearance;
  /**
   * A `data-action` value on the `<details>` root, for a delegated listener of
   * the native `toggle` event (it does not bubble: listen in the capture phase,
   * for example with `delegateCapture`). `event.newState` is `open` or `closed`.
   */
  toggleAction?: string;
  id?: string;
  rootAttributes?: DisclosureRootAttributes;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * Content a person shows and hides under a summary row: a native `<details>`
 * with a `<summary>` that carries a `DisclosureArrow` and the title, on the
 * shared content-item geometry (8px inline margin, a 1px border, 8px
 * padding, the rounded radius). `appearance="embedded"` drops that geometry
 * for a Disclosure inside owner chrome (a `ContentItem`) that already insets
 * it. Keyboard and screen-reader behavior is the
 * platform's: the summary is a button that Enter and Space toggle, and it
 * reports its expanded state. Disclosures sharing a `name` form an accordion.
 */
export function Disclosure({
  title,
  detail,
  children,
  open = false,
  name,
  appearance = 'plain',
  toggleAction,
  id,
  rootAttributes = {},
  className = '',
  slot,
}: DisclosureProps) {
  return (
    <details
      {...filterDataAttributes(rootAttributes, DISCLOSURE_PROTECTED)}
      id={id}
      class={`kui-disclosure ${className}`.trim()}
      data-component="disclosure"
      data-appearance={appearance}
      data-action={toggleAction}
      name={name}
      open={open || undefined}
      slot={slot}
    >
      <summary class="kui-disclosure__summary">
        <DisclosureArrow open={open} />
        <span class="kui-disclosure__title">{title}</span>
        {detail === undefined ? null : (
          <span class="kui-disclosure__detail">{detail}</span>
        )}
      </summary>
      <div class="kui-disclosure__content">{children}</div>
    </details>
  );
}
