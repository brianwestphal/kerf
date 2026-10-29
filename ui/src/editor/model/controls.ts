// Which editor control a prop gets, and how a control's raw value becomes a
// document value (KF-KX77TV: editor editing).
import {
  isLiteralOf,
  parseCssCall,
  type ViewType,
  type ViewValue,
} from '@kerfjs/ui/view';

import { exampleValue, isStructured } from './examples.js';
import type { InspectorProp } from './inspector.js';

export type ControlKind =
  'select' | 'switch' | 'text' | 'number' | 'css' | 'list' | 'readonly';

type Definitions = Readonly<Record<string, ViewType>>;

export interface Control {
  readonly kind: ControlKind;
  /** select: the choices, with '' meaning "use the default". */
  readonly choices?: readonly string[];
  /** The control's current raw value: text, a choice, or a checked state. */
  readonly raw: string | boolean;
}

const isDynamic = (value: ViewValue | undefined) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** A document binding (`$param`, `$bind`, `$css`, …) rather than a literal. */
const isBinding = (value: ViewValue | undefined) =>
  isDynamic(value) &&
  Object.keys(value as object).some((key) => key.startsWith('$'));

/**
 * The control for a prop. Literal string, number, boolean, and string-enum
 * props are editable, as are `$css` builder calls on css-value props and list
 * or object literals (KF-HNNWN9: a Combobox's suggestions, as JSON). Values a
 * document binds (`$param`, `$bind`, `$action`, `$icon`) and other kinds
 * (content, functions) stay read-only here.
 */
export function controlFor(
  prop: InspectorProp,
  value: ViewValue | undefined,
  /** The props catalog's type table, to follow a prop type's `ref`. */
  definitions: Definitions = {},
): Control {
  const kind = prop.type.kind;
  if (isStructured(prop.type as ViewType, definitions)) {
    return value === undefined || !isBinding(value)
      ? {
          kind: 'list',
          raw: value === undefined ? '' : JSON.stringify(value, null, 2),
        }
      : { kind: 'readonly', raw: '' };
  }
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
      // A Select needs string choices to offer.
      if (!values.length || !values.every((item) => typeof item === 'string'))
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
  /** css: the builders the prop accepts as its outermost call. */
  helpers?: readonly string[],
  /** list: the prop's type, and the table its `ref`s name. */
  type?: { readonly type: ViewType; readonly definitions: Definitions },
): { readonly value: ViewValue | undefined } | { readonly error: string } {
  switch (kind) {
    case 'list': {
      const text = String(raw).trim();
      if (text === '') return { value: undefined };
      let value: ViewValue;
      try {
        value = JSON.parse(text) as ViewValue;
      } catch {
        return { error: 'Enter JSON, such as ["One", "Two"].' };
      }
      if (isBinding(value))
        return { error: 'Bind a param with Bind a prop instead.' };
      return !type || isLiteralOf(value, type.type, type.definitions)
        ? { value }
        : {
            error: `Not a ${type.type.text ? typeLabel(type.type.text) : 'value of this type'}.`,
          };
    }
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
      const names = parseCssCall(text);
      if (!names)
        return {
          error: 'Use a css-values builder call, such as px(8) or space("m").',
        };
      return !helpers || helpers.includes(names[0]!)
        ? { value: { $css: text } }
        : { error: `This prop takes ${listOf(helpers)}, not ${names[0]}().` };
    }
    default: {
      const text = String(raw);
      return { value: text === '' ? undefined : text };
    }
  }
}

/** A prop type's text as a person reads it: `readonly X[]` is `X[]`. */
export const typeLabel = (text: string) => text.replace(/^readonly /, '');

/** `a(), b(), or c()`. */
function listOf(helpers: readonly string[]): string {
  const calls = helpers.map((name) => `${name}()`);
  return calls.length > 1
    ? `${calls.slice(0, -1).join(', ')}, or ${calls.at(-1)}`
    : calls.join('');
}

/**
 * The hint under a css-value prop's field (KF-YR91FA): the builders it takes
 * and, when it takes `calc`, how to compose lengths with it.
 */
export function cssHint(helpers: readonly string[] | undefined): string {
  if (!helpers?.length)
    return 'A css-values builder call, such as px(8) or space("m").';
  const compose = helpers.includes('calc')
    ? ` Combine lengths with calc(plus(px(8), space("m")))${
        helpers.includes('lengthVar')
          ? ', or read an app variable with lengthVar("--app-gap", px(8))'
          : ''
      }.`
    : '';
  return `Takes ${listOf(helpers)}.${compose}`;
}

interface Variant {
  readonly required: readonly string[];
  readonly when?: Readonly<Record<string, ViewValue>>;
}

/** A starting literal for a prop, or undefined when none can be made up. */
function seedFor(
  prop: InspectorProp,
  name: string,
  definitions: Definitions,
): ViewValue | undefined {
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
  // Lists, objects, and unions get placeholders (KF-HNNWN9): three numbered
  // suggestions, choices, or menu items.
  switch (type.kind) {
    case 'ref':
    case 'union':
    case 'array':
    case 'object':
      return exampleValue(prop.type as ViewType, definitions, prop.name);
    default:
      return undefined;
  }
}

/**
 * The first `value` of a seeded list of choices, so a Select's required
 * `value` starts on a choice it offers rather than on a made-up string.
 */
function firstChoiceValue(
  seeded: Readonly<Record<string, ViewValue>>,
): ViewValue | undefined {
  for (const value of Object.values(seeded)) {
    const first = Array.isArray(value) ? value[0] : undefined;
    if (
      isDynamic(first) &&
      typeof (first as { value?: unknown }).value === 'string'
    )
      return (first as { value: string }).value;
  }
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
  /** The props catalog's type table, for list and object placeholders. */
  definitions: Definitions = {},
): Record<string, ViewValue> {
  const byName = new Map(props.map((prop) => [prop.name, prop]));
  const seeded: Record<string, ViewValue> = {};
  const fill = (names: readonly string[]) => {
    const values: Record<string, ViewValue> = {};
    for (const propName of names) {
      const prop = byName.get(propName);
      const value =
        prop && !prop.zone ? seedFor(prop, name, definitions) : undefined;
      if (value === undefined) return undefined;
      values[propName] = value;
    }
    return values;
  };
  for (const prop of props) {
    if (!prop.required || prop.zone) continue;
    const value = seedFor(prop, name, definitions);
    if (value !== undefined) seeded[prop.name] = value;
  }
  const variant = [...variants]
    .sort((a, b) => a.required.length - b.required.length)
    .map((item) => ({ item, values: fill(item.required) }))
    .find(({ values }) => values !== undefined);
  const result = variant
    ? { ...seeded, ...variant.item.when, ...variant.values }
    : seeded;
  const choice = firstChoiceValue(result);
  return choice !== undefined &&
    typeof result.value === 'string' &&
    byName.get('value')?.required
    ? { ...result, value: choice }
    : result;
}
