// Which editor control a prop gets, and how a control's raw value becomes a
// document value (KF-KX77TV: editor editing).
import { parseCssCall, type ViewValue } from '@kerfjs/ui/view';

import type { InspectorProp } from './inspector.js';

export type ControlKind =
  'select' | 'switch' | 'text' | 'number' | 'css' | 'readonly';

export interface Control {
  readonly kind: ControlKind;
  /** select: the choices, with '' meaning "use the default". */
  readonly choices?: readonly string[];
  /** The control's current raw value: text, a choice, or a checked state. */
  readonly raw: string | boolean;
}

const isDynamic = (value: ViewValue | undefined) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * The control for a prop. Literal string, number, boolean, and string-enum
 * props are editable, as are `$css` builder calls on css-value props. Values
 * a document binds (`$param`, `$bind`, `$action`, `$icon`) and other kinds
 * (content, objects, functions) stay read-only here.
 */
export function controlFor(
  prop: InspectorProp,
  value: ViewValue | undefined,
): Control {
  const kind = prop.type.kind;
  if (kind === 'css-value') {
    if (value === undefined) return { kind: 'css', raw: '' };
    if (isDynamic(value) && '$css' in (value as object)) {
      return { kind: 'css', raw: String((value as { $css: string }).$css) };
    }
    return { kind: 'readonly', raw: '' };
  }
  if (isDynamic(value) || Array.isArray(value))
    return { kind: 'readonly', raw: '' };
  switch (kind) {
    case 'enum': {
      const values =
        (prop.type as { values?: readonly unknown[] }).values ?? [];
      if (!values.every((item) => typeof item === 'string'))
        return { kind: 'readonly', raw: '' };
      return {
        kind: 'select',
        choices: ['', ...(values as string[])],
        raw: typeof value === 'string' ? value : '',
      };
    }
    case 'boolean':
      return {
        kind: 'switch',
        raw: typeof value === 'boolean' ? value : prop.default === true,
      };
    case 'number':
      return {
        kind: 'number',
        raw: typeof value === 'number' ? String(value) : '',
      };
    case 'string':
      return { kind: 'text', raw: typeof value === 'string' ? value : '' };
    case 'content':
      // Text-accepting content (a Button label) edits as a string.
      return (prop.type as { acceptsText?: true }).acceptsText &&
        (value === undefined || typeof value === 'string')
        ? { kind: 'text', raw: typeof value === 'string' ? value : '' }
        : { kind: 'readonly', raw: '' };
    default:
      return { kind: 'readonly', raw: '' };
  }
}

/**
 * The document value for a control's raw input: `undefined` clears the prop
 * (an empty field, the default choice), and an `error` rejects the input.
 */
export function valueFromControl(
  kind: ControlKind,
  raw: string | boolean,
): { readonly value: ViewValue | undefined } | { readonly error: string } {
  switch (kind) {
    case 'switch':
      return { value: raw === true };
    case 'number': {
      const text = String(raw).trim();
      if (text === '') return { value: undefined };
      const number = Number(text);
      return Number.isFinite(number)
        ? { value: number }
        : { error: 'Enter a number.' };
    }
    case 'css': {
      const text = String(raw).trim();
      if (text === '') return { value: undefined };
      return parseCssCall(text)
        ? { value: { $css: text } }
        : {
            error:
              'Use a css-values builder call, such as px(8) or space("m").',
          };
    }
    default: {
      const text = String(raw);
      return { value: text === '' ? undefined : text };
    }
  }
}

interface Variant {
  readonly required: readonly string[];
  readonly when?: Readonly<Record<string, ViewValue>>;
}

/** A starting literal for a prop, or undefined when none can be made up. */
function seedFor(prop: InspectorProp, name: string): ViewValue | undefined {
  const type = prop.type as {
    kind: string;
    values?: readonly unknown[];
    acceptsText?: true;
  };
  if (type.kind === 'string' || (type.kind === 'content' && type.acceptsText))
    return prop.name === 'action' ? 'action' : name;
  if (type.kind === 'number') return 0;
  if (type.kind === 'boolean') return false;
  if (type.kind === 'enum' && typeof type.values?.[0] === 'string')
    return type.values[0];
  return undefined;
}

/**
 * Seed props for a newly added component: its required literals, filled in,
 * plus those of the smallest props variant whose requirements can all be
 * filled (a Button's label, rather than its icon-only shape).
 */
export function seedProps(
  props: readonly InspectorProp[],
  name: string,
  variants: readonly Variant[] = [],
): Record<string, ViewValue> {
  const byName = new Map(props.map((prop) => [prop.name, prop]));
  const seeded: Record<string, ViewValue> = {};
  const fill = (names: readonly string[]) => {
    const values: Record<string, ViewValue> = {};
    for (const propName of names) {
      const prop = byName.get(propName);
      const value = prop && !prop.zone ? seedFor(prop, name) : undefined;
      if (value === undefined) return undefined;
      values[propName] = value;
    }
    return values;
  };
  for (const prop of props) {
    if (!prop.required || prop.zone) continue;
    const value = seedFor(prop, name);
    if (value !== undefined) seeded[prop.name] = value;
  }
  const variant = [...variants]
    .sort((a, b) => a.required.length - b.required.length)
    .map((item) => ({ item, values: fill(item.required) }))
    .find(({ values }) => values !== undefined);
  return variant
    ? { ...seeded, ...variant.item.when, ...variant.values }
    : seeded;
}
