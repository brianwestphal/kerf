import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';

export interface FormProps {
  /** The form's id: a `Button` outside it names it with `form`, and the
   * application reads its fields with `new FormData(form)`. */
  id?: string;
  /** Native form `name`, for `document.forms` lookups. */
  name?: string;
  /**
   * Delegated `data-action` the application handles on `submit`, with
   * `delegateActions(root, 'submit', table)`. It is not the native `action`
   * URL: a Kerf UI Form never navigates (see `wireForms`).
   */
  action?: string;
  /** Skip native constraint validation on submit, for a form whose
   * application validates its fields and shows their errors itself. */
  noValidate?: boolean;
  /** The fields, field groups, and actions the form holds. */
  children?: KerfUiContent;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const FORM_PROTECTED = new Set(['data-component', 'data-action']);

/**
 * A native form that groups fields so their values submit and read together.
 * It adds no inset, chrome, or layout of its own: its children lay out as
 * the parent's own. Submitting runs the application's `action` handler and,
 * with `wireForms`, never navigates the page.
 */
export function Form({
  id,
  name,
  action,
  noValidate = false,
  children,
  className = '',
  slot,
  rootAttributes = {},
}: FormProps) {
  return (
    <form
      {...filterDataAttributes(rootAttributes, FORM_PROTECTED)}
      id={id}
      name={name}
      class={`kui-form ${className}`.trim()}
      data-component="form"
      data-action={action}
      noValidate={noValidate || undefined}
      slot={slot}
    >
      {children}
    </form>
  );
}
