// Which editor control a prop gets, and how a control's raw value becomes a
// document value (KF-KX77TV: editor editing).
import {
  isLiteralOf,
  parseCssCall,
  type ViewChild,
  type ViewNode,
  type ViewType,
  type ViewValue,
} from '@kerfjs/ui/view';

import {
  exampleValue,
  isStructured,
  resolveType,
  type SlotNamer,
} from './examples.js';
import { enumSetValues, fieldEditorKind } from './fields.js';
import type { InspectorProp } from './inspector.js';

export type ControlKind =
  | 'select'
  | 'size'
  | 'switch'
  | 'text'
  | 'number'
  | 'css'
  | 'list'
  | 'tags'
  | 'enum-set'
  | 'icon'
  | 'readonly';

type Definitions = Readonly<Record<string, ViewType>>;

export interface Control {
  readonly kind: ControlKind;
  /**
   * select, size: the choices, with '' meaning "use the default"; enum-set:
   * the values it offers.
   */
  readonly choices?: readonly string[];
  /**
   * The control's current raw value: text, a choice, or a checked state;
   * tags and enum-set: the JSON of the strings it holds; icon: the Lucide
   * name, or '' while none is chosen.
   */
  readonly raw: string | boolean;
  /** size: the builder call of a custom (`$css`) value. */
  readonly css?: string;
}

/** The size choice that edits a css-values builder call instead. */
export const CUSTOM_SIZE = 'custom';

/** The spacing scale, in order, so a size Select lists tokens smallest first. */
const SCALE = ['none', '2xs', 'xs', 's', 'm', 'l', 'xl'];

interface UnionMember {
  readonly kind: string;
  readonly value?: unknown;
  readonly values?: readonly unknown[];
  readonly members?: readonly UnionMember[];
}

/**
 * The keyword choices of a size prop (KF-Q5AXNP): a union of a css-value
 * with keywords, such as a gap (`true`, `"m"`, or `px(8)`), a flex
 * (`"auto"` or `flex(1)`), or a height (`"viewport"`). `true` stands for a
 * boolean member. Undefined for any other type. A `{ column, row }` object
 * member does not rule a union out; such a value edits as JSON.
 */
export function sizeKeywords(
  type: ViewType,
  definitions: Definitions = {},
): readonly string[] | undefined {
  const root = resolveType(type, definitions) as UnionMember | undefined;
  if (root?.kind !== 'union') return undefined;
  let css = false;
  const keywords: string[] = [];
  const visit = (member: UnionMember): boolean => {
    switch (member.kind) {
      case 'css-value':
        css = true;
        return true;
      case 'boolean':
        keywords.push('true');
        return true;
      case 'literal':
        if (member.value === true) keywords.push('true');
        else if (typeof member.value === 'string') keywords.push(member.value);
        return member.value === false || typeof member.value !== 'number';
      case 'enum':
        if (!member.values?.every((item) => typeof item === 'string'))
          return false;
        keywords.push(...(member.values as string[]));
        return true;
      case 'union':
        return member.members!.every(visit);
      case 'object':
        return true;
      default:
        return false;
    }
  };
  if (!root.members!.every(visit) || !css) return undefined;
  const unique = [...new Set(keywords)];
  // Only a spacing union sorts; a flex's `none` is a keyword, not a token.
  if (!unique.some((keyword) => SCALE.indexOf(keyword) > 0)) return unique;
  const rank = (keyword: string) => {
    const at = SCALE.indexOf(keyword);
    return at < 0 ? SCALE.length : at;
  };
  return unique.sort((a, b) => rank(a) - rank(b));
}

const isDynamic = (value: ViewValue | undefined) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** A document binding (`$param`, `$bind`, `$css`, …) rather than a literal. */
export const isBinding = (value: ViewValue | undefined) =>
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
  // Icon data picks a Lucide icon by name (KF-VYRDDQ: icon picker).
  if (prop.iconSource === 'lucide') {
    if (value === undefined) return { kind: 'icon', raw: '' };
    const name = isDynamic(value)
      ? (value as { $icon?: unknown }).$icon
      : undefined;
    return typeof name === 'string'
      ? { kind: 'icon', raw: name }
      : { kind: 'readonly', raw: '' };
  }
  if (isStructured(prop.type as ViewType, definitions)) {
    // A list of strings edits in a TagField, a set of enum values in a
    // CheckboxGroup (KF-A9ZHGW), while every value is one they can hold.
    const strings =
      value === undefined ||
      (Array.isArray(value) && value.every((item) => typeof item === 'string'));
    const editor = fieldEditorKind(
      prop.type as ViewType,
      definitions,
      prop.iconSource,
    );
    if (editor === 'tags' && strings)
      return { kind: 'tags', raw: JSON.stringify(value ?? []) };
    const choices = enumSetValues(prop.type as ViewType, definitions);
    if (
      editor === 'enum-set' &&
      strings &&
      (value ?? []).every((item) => choices.includes(item as string))
    )
      return { kind: 'enum-set', choices, raw: JSON.stringify(value ?? []) };
    return value === undefined || !isBinding(value)
      ? {
          kind: 'list',
          raw: value === undefined ? '' : JSON.stringify(value, null, 2),
        }
      : { kind: 'readonly', raw: '' };
  }
  const keywords = sizeKeywords(prop.type as ViewType, definitions);
  if (keywords) {
    const choices = ['', ...keywords, CUSTOM_SIZE];
    if (value === undefined) return { kind: 'size', choices, raw: '' };
    if (
      value === true ||
      (typeof value === 'string' && keywords.includes(value))
    )
      return { kind: 'size', choices, raw: String(value) };
    if (isDynamic(value) && '$css' in (value as object)) {
      const css = String((value as { $css: string }).$css);
      return { kind: 'size', choices, raw: CUSTOM_SIZE, css };
    }
    // A `{ column, row }` gap edits as JSON; a binding stays read-only.
    return isDynamic(value) && !isBinding(value)
      ? { kind: 'list', raw: JSON.stringify(value, null, 2) }
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
    case 'tags':
    case 'enum-set': {
      // An empty list unsets the prop.
      const items = JSON.parse(String(raw)) as string[];
      return { value: items.length ? items : undefined };
    }
    case 'switch':
      return { value: raw === true };
    case 'size':
      // Custom picks the builder field, which sets the value itself.
      return raw === 'true'
        ? { value: true }
        : { value: raw === '' || raw === CUSTOM_SIZE ? undefined : raw };
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

/** The Lucide icon a seeded icon-data prop names. */
export const PLACEHOLDER_ICON = 'circle';

/** A starting literal for a prop, or undefined when none can be made up. */
function seedFor(
  prop: InspectorProp,
  name: string,
  definitions: Definitions,
  slot?: SlotNamer,
): ViewValue | undefined {
  const type = prop.type as {
    kind: string;
    values?: readonly unknown[];
    acceptsText?: true;
  };
  if (type.kind === 'string' || (type.kind === 'content' && type.acceptsText))
    return prop.name === 'action' ? 'action' : name;
  // A count or size of 0 is often out of range (a Grid's columns), so a
  // number starts on its default or 1 (KF-FGD8B3).
  if (type.kind === 'number')
    return typeof prop.default === 'number' ? prop.default : 1;
  // Icon data names a Lucide icon rather than spelling out its nodes.
  if ((prop as { iconSource?: string }).iconSource === 'lucide')
    return { $icon: PLACEHOLDER_ICON };
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
      return exampleValue(prop.type as ViewType, definitions, prop.name, slot);
    default:
      return undefined;
  }
}

/**
 * The first `value` (or `id`) of a seeded list of choices or tabs, so a
 * Select's required `value` or a TabNavigator's `active` starts on an item it
 * offers rather than on a made-up string.
 */
function firstChoiceValue(
  seeded: Readonly<Record<string, ViewValue>>,
): ViewValue | undefined {
  for (const value of Object.values(seeded)) {
    const first = (Array.isArray(value) ? value[0] : undefined) as
      { value?: unknown; id?: unknown } | undefined;
    if (!isDynamic(first as ViewValue)) continue;
    const choice = first!.value ?? first!.id;
    if (typeof choice === 'string') return choice;
  }
  return undefined;
}

/** Required props that name the chosen item of a seeded list. */
const CHOICE_PROPS = ['value', 'active'];

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
  /** Names an item slot for rendered content inside a seeded value. */
  slot?: SlotNamer,
): Record<string, ViewValue> {
  const byName = new Map(props.map((prop) => [prop.name, prop]));
  const seeded: Record<string, ViewValue> = {};
  for (const prop of props) {
    if (!prop.required || prop.zone) continue;
    const value = seedFor(prop, name, definitions, slot);
    if (value !== undefined) seeded[prop.name] = value;
  }
  /**
   * Values for a variant's required props, or undefined when one cannot be
   * made up. A zone, or a slot no value seeds, is the outline's to fill
   * (KF-SXDM56), so it does not rule the variant out.
   */
  const fill = (names: readonly string[], namer?: SlotNamer) => {
    const values: Record<string, ViewValue> = {};
    for (const propName of names) {
      const prop = byName.get(propName);
      if (!prop) return undefined;
      if (prop.zone) continue;
      const value = seeded[propName] ?? seedFor(prop, name, definitions, namer);
      if (value === undefined) {
        if (prop.slot) continue;
        return undefined;
      }
      values[propName] = value;
    }
    return values;
  };
  // Variants are tried with a namer that hands out nothing, so only the one
  // chosen names its item slots.
  const trial: SlotNamer | undefined = slot && ((hint) => hint);
  const chosen = [...variants]
    .sort((a, b) => a.required.length - b.required.length)
    .find((item) => fill(item.required, trial) !== undefined);
  const result = chosen
    ? { ...seeded, ...chosen.when, ...fill(chosen.required, slot) }
    : seeded;
  const choice = firstChoiceValue(result);
  if (choice === undefined) return result;
  const picked = { ...result };
  for (const propName of CHOICE_PROPS)
    if (typeof picked[propName] === 'string' && byName.get(propName)?.required)
      picked[propName] = choice;
  return picked;
}

/** A composition zone, as the view catalog's entries list them. */
interface SeedZone {
  readonly id: string;
  readonly jsx?: { readonly prop?: string };
  readonly accepts: readonly string[];
  readonly cardinality: { readonly min: number };
}

/** What seeding a node reads from the editor's catalog. */
export interface SeedCatalog {
  readonly component: (key: string) =>
    | {
        readonly props: readonly InspectorProp[];
        readonly variants?: readonly Variant[];
      }
    | undefined;
  readonly name: (key: string) => string;
  readonly definitions: (key: string) => Definitions;
  readonly entry: (
    key: string,
  ) =>
    | { readonly package?: string; readonly zones?: readonly SeedZone[] }
    | undefined;
}

/** How deep seeded children of seeded children go. */
const SEED_DEPTH = 3;

/**
 * A new node of component `key` that renders as added (KF-FGD8B3): its
 * required props seeded, and each zone or content prop it requires filled
 * with placeholders the outline and inspector can then change or remove.
 * A zone that names cataloged components gets the first of them, seeded the
 * same way; any other gets a Text naming it.
 */
export function seedNode(
  key: string,
  catalog: SeedCatalog,
  makeId: () => string,
  slot?: SlotNamer,
  depth = 0,
): ViewNode {
  const component = catalog.component(key)!;
  const name = catalog.name(key);
  const props = seedProps(
    component.props,
    name,
    component.variants,
    catalog.definitions(key),
    slot,
  );
  const entry = catalog.entry(key);
  const zones: Record<string, ViewChild[]> = {};
  // Most zones take components rather than plain text, so a placeholder is
  // the catalog's Text component where it has one.
  const textKey = `${key.slice(0, key.indexOf(':'))}:text`;
  const text = (label: string): ViewChild =>
    catalog.component(textKey)
      ? { id: makeId(), type: textKey, props: { children: label } }
      : ({ id: makeId(), type: '#text', value: label } as ViewNode);
  const label = (zone: string) =>
    zone === 'children' ? name : zone.charAt(0).toUpperCase() + zone.slice(1);
  for (const zone of entry?.zones ?? []) {
    if (!zone.jsx?.prop || zone.cardinality.min < 1) continue;
    const accepted = zone.accepts
      .map((item) => (item.includes(':') ? item : `${entry?.package}:${item}`))
      .find((item) => catalog.component(item));
    zones[zone.id] = Array.from({ length: zone.cardinality.min }, () =>
      accepted && depth < SEED_DEPTH
        ? seedNode(accepted, catalog, makeId, slot, depth + 1)
        : text(label(zone.id)),
    );
  }
  // A required content prop that took no text holds a Text instead.
  for (const prop of component.props)
    if (prop.slot && !prop.zone && prop.required && !(prop.name in props))
      zones[prop.name] ??= [text(label(prop.name))];
  return {
    id: makeId(),
    type: key,
    ...(Object.keys(props).length ? { props } : {}),
    ...(Object.keys(zones).length ? { zones } : {}),
  };
}
