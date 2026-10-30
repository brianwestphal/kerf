// The field editor extension API (KF-EXA2WH): an application registers an
// editor for a named type with `createEditor({ fieldEditors })`, and it
// replaces the type-driven form wherever a prop or field has that type.
import type { ViewType, ViewValue } from '@kerfjs/ui/view';
import type { SafeHtml } from 'kerfjs';

import type { FieldContainer, FieldPath } from './model/fields.js';

export type { FieldContainer, FieldPath } from './model/fields.js';

/** `data-*` attributes to spread on an element (or a component's `rootAttributes`). */
export type FieldEditorAttributes = Readonly<Record<`data-${string}`, string>>;

/** The control kinds a field editor's own controls can commit through. */
export type FieldEditorControlKind =
  'text' | 'number' | 'switch' | 'select' | 'list';

/** What a field editor renders from, and how it changes the value. */
export interface FieldEditorContext {
  /** The value being edited, or undefined while it is unset. */
  readonly value: ViewValue | undefined;
  /** The value's type in the props catalog, and the table its `ref`s name. */
  readonly type: ViewType;
  readonly definitions: Readonly<Record<string, ViewType>>;
  /** Writes the next value as one undoable edit; `undefined` unsets it. */
  readonly commit: (next: ViewValue | undefined) => void;
  /**
   * The `data-action` a button takes (a `Button`'s `action`) to set the
   * value to what {@link set}'s attributes name when it is pressed.
   */
  readonly setAction: string;
  /** Attributes for a {@link setAction} button that sets the value to `next`. */
  readonly set: (next: ViewValue | undefined) => FieldEditorAttributes;
  /**
   * Attributes for a control (a `TextField`'s or `Select`'s
   * `rootAttributes`, or a native input) that edits the field at `path`
   * inside the value on `change`, as the Inspector's own controls do: `text`
   * and `number` read the control's input, `switch` its checked state,
   * `select` its value, and `list` its text as JSON.
   */
  readonly control: (
    path: FieldPath,
    kind: FieldEditorControlKind,
  ) => FieldEditorAttributes;
  /**
   * The editor's type-driven form for the value, or for the object at
   * `path` inside it, to compose with the editor's own controls.
   */
  readonly form: (path?: FieldPath) => SafeHtml;
}

/** An application's editor for every value of one named type. */
export interface FieldEditor {
  /**
   * Where the editor opens: pushed in the Inspector (`subview`) or in a
   * dialog. Omitted, the type-driven rule decides (at most 10 fields push).
   */
  readonly container?: FieldContainer;
  /** The editor's content for the value. */
  readonly render: (context: FieldEditorContext) => SafeHtml;
  /**
   * Wires the editor's own events once, when the editor is wired; `context`
   * reads the open value's context, or undefined while none of this type is
   * open. Returns a disposer.
   */
  readonly wire?: (
    root: HTMLElement,
    context: () => FieldEditorContext | undefined,
  ) => () => void;
}

/**
 * Field editors by type name: a props catalog definition (`'ListConfig'`)
 * or an application's own (`'InvoiceFilter'`).
 */
export type FieldEditors = Readonly<Record<string, FieldEditor>>;

/** The registered editor for `type`: its `ref` name's, if any. */
export function fieldEditorFor(
  type: ViewType | undefined,
  editors: FieldEditors | undefined,
): { readonly name: string; readonly editor: FieldEditor } | undefined {
  const name = (type as { kind?: string; ref?: string } | undefined)?.ref;
  const editor = name === undefined ? undefined : editors?.[name];
  return editor && { name: name!, editor };
}
