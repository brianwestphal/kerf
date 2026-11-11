// The inspector rail's read-only sections for the selected node, from
// ui/ai/component-props.json (types, groups, defaults) and the node's props.
import type { ViewNode, ViewValue } from '@kerfjs/ui/view';

export interface InspectorProp {
  readonly name: string;
  readonly type: { readonly kind: string; readonly text?: string };
  readonly required: boolean;
  readonly default?: string | number | boolean;
  readonly group?: string;
  /** A component-specific task inside its group (KF-4BPSTB: Link, Popup). */
  readonly subgroup?: string;
  readonly order?: number;
  readonly control?: string;
  readonly zone?: string;
  readonly slot?: true;
  /** css-value props: the builders the prop accepts. */
  readonly cssValue?: { readonly helpers?: readonly string[] };
  /** Icon data (`'lucide'`): edits in the icon picker (KF-AJHJB8). */
  readonly iconSource?: string;
  /**
   * A value prop's options list, when it is not `choices` (KF-H1X3S7: a
   * ColorSwatches `value` picks from its `swatches`).
   */
  readonly choicesFrom?: string;
}

export interface InspectorComponent {
  readonly key: string;
  readonly groups?: readonly string[];
  readonly props: readonly InspectorProp[];
}

export interface InspectorRow {
  readonly name: string;
  readonly value: string;
  /** True when the document sets the prop rather than relying on a default. */
  readonly set: boolean;
}

export interface InspectorSection {
  readonly title: string;
  readonly rows: readonly InspectorRow[];
}

/** How a document value reads in the inspector. */
export function formatValue(value: ViewValue): string {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    if ('$param' in value) return `param ${value.$param}`;
    if ('$bind' in value) return `bound to ${value.$bind}`;
    if ('$action' in value) return `action ${value.$action}`;
    if ('$css' in value) return String(value.$css);
    if ('$icon' in value) return `icon ${value.$icon}`;
  }
  return JSON.stringify(value);
}

/**
 * KF-4BPSTB: every component's props sort into the same semantic families,
 * in this order, so a group means one thing on every component.
 */
export const PROP_FAMILIES = [
  'Content',
  'Appearance',
  'Behavior',
  'Layout',
  'Accessibility',
  'Integration',
] as const;

export type PropFamily = (typeof PROP_FAMILIES)[number];

/**
 * Group names catalogs used before the families, read as a family and a
 * subgroup, so a custom catalog's curation keeps its meaning.
 */
const LEGACY_GROUPS: Readonly<
  Record<string, { family: PropFamily; subgroup?: string }>
> = {
  State: { family: 'Behavior', subgroup: 'State' },
  Form: { family: 'Behavior', subgroup: 'Form' },
  Input: { family: 'Behavior', subgroup: 'Input' },
  Validation: { family: 'Behavior', subgroup: 'Validation' },
  Mode: { family: 'Behavior', subgroup: 'Mode' },
  Surface: { family: 'Appearance', subgroup: 'Surface' },
  Chrome: { family: 'Appearance', subgroup: 'Chrome' },
  Wrapping: { family: 'Layout', subgroup: 'Wrapping' },
  Responsive: { family: 'Layout', subgroup: 'Responsive' },
  Icon: { family: 'Content', subgroup: 'Icon' },
  Semantics: { family: 'Accessibility', subgroup: 'Semantics' },
};

const isFamily = (name: string): name is PropFamily =>
  (PROP_FAMILIES as readonly string[]).includes(name);

// The words of a camelCase prop name that place it when no catalog does.
const CONTENT_WORDS = new Set([
  'children',
  'label',
  'text',
  'title',
  'description',
  'detail',
  'placeholder',
  'hint',
  'icon',
  'badge',
  'items',
  'choices',
  'options',
  'content',
]);
const APPEARANCE_WORDS = new Set([
  'tone',
  'emphasis',
  'size',
  'shape',
  'variant',
  'appearance',
  'density',
  'color',
  'background',
  'presentation',
  'divider',
  'dividers',
  'outlined',
  'surface',
  'frame',
  'font',
  'elevation',
  'caret',
  'inline',
]);
const LAYOUT_WORDS = new Set([
  'placement',
  'position',
  'side',
  'orientation',
  'layout',
  'gap',
  'align',
  'width',
  'height',
  'wrap',
  'responsive',
  'collapsed',
  'resizable',
  'scrollable',
  'sticky',
  'insets',
  'columns',
  // A breakpoint (`iconOnlyAt`, `hideBelow`).
  'at',
  'below',
  'above',
]);
// A state word settles a name another word would misplace (`detailActive`).
const BEHAVIOR_WORDS = new Set([
  'active',
  'open',
  'expanded',
  'selected',
  'checked',
  'pressed',
  'disabled',
  'busy',
  'loading',
]);
const ACCESSIBILITY_WORDS = new Set([
  'role',
  'heading',
  'tab',
  'live',
  'element',
]);

/**
 * The family a prop no catalog places belongs to, from its name: an `aria`
 * prop or another name for the component (`clearLabel`) is Accessibility,
 * `id` and class lists are Integration, and the rest by their last word,
 * then their first. What says how it works (and anything else) is Behavior.
 */
export function inferredFamily(prop: InspectorProp): PropFamily {
  if (prop.control === 'classes' || prop.name === 'id') return 'Integration';
  if (prop.type.kind === 'content' || prop.slot) return 'Content';
  const words = prop.name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(' ');
  if (words[0] === 'aria') return 'Accessibility';
  if (words.length > 1 && words.at(-1) === 'label') return 'Accessibility';
  for (const word of [words.at(-1)!, words[0]!]) {
    if (BEHAVIOR_WORDS.has(word)) return 'Behavior';
    if (CONTENT_WORDS.has(word)) return 'Content';
    if (APPEARANCE_WORDS.has(word)) return 'Appearance';
    if (LAYOUT_WORDS.has(word)) return 'Layout';
    if (ACCESSIBILITY_WORDS.has(word)) return 'Accessibility';
  }
  return 'Behavior';
}

/** Where a prop belongs: its group (a family or the catalog's own) and task. */
export function propPlace(
  prop: InspectorProp,
  component: Pick<InspectorComponent, 'groups'>,
): { readonly group: string; readonly subgroup?: string } {
  // KF-X8X8VX: the class list, now with the other integration hooks.
  if (prop.control === 'classes') return { group: 'Integration' };
  const declared =
    prop.group && (component.groups ?? []).includes(prop.group)
      ? prop.group
      : undefined;
  if (declared && isFamily(declared))
    return prop.subgroup
      ? { group: declared, subgroup: prop.subgroup }
      : { group: declared };
  if (declared && LEGACY_GROUPS[declared]) {
    const { family, subgroup } = LEGACY_GROUPS[declared];
    return { group: family, subgroup: prop.subgroup ?? subgroup };
  }
  // A custom catalog's own group keeps its section.
  if (declared) return { group: declared };
  return { group: inferredFamily(prop) };
}

export interface PropSubgroup {
  /** Undefined for the group's own props, which come first. */
  readonly title?: string;
  readonly props: readonly InspectorProp[];
}

export interface PropGroup {
  readonly title: string;
  /** Every prop of the group, subgroup by subgroup. */
  readonly props: readonly InspectorProp[];
  readonly subgroups: readonly PropSubgroup[];
}

const byOrder = (a: InspectorProp, b: InspectorProp) =>
  (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name);

/**
 * A component's visible props by family (KF-4BPSTB), families in their fixed
 * order and then any custom group in the catalog's order; inside a family,
 * its own props, then each subgroup by its first prop's curated order.
 * Every prop has exactly one place. Hidden plumbing props and zones are left
 * out: zones appear in the outline instead.
 */
export function groupedProps(component: InspectorComponent): PropGroup[] {
  const visible = component.props.filter(
    (prop) =>
      prop.control !== 'hidden' && !prop.zone && prop.type.kind !== 'never',
  );
  const byGroup = new Map<string, Map<string | undefined, InspectorProp[]>>();
  for (const prop of visible) {
    const { group, subgroup } = propPlace(prop, component);
    const subgroups = byGroup.get(group) ?? new Map();
    subgroups.set(subgroup, [...(subgroups.get(subgroup) ?? []), prop]);
    byGroup.set(group, subgroups);
  }
  const titles = [
    ...PROP_FAMILIES.filter((title) => byGroup.has(title)),
    ...(component.groups ?? []).filter(
      (title) =>
        !isFamily(title) && !LEGACY_GROUPS[title] && byGroup.has(title),
    ),
  ];
  // A legacy group's subgroups keep the order the catalog listed them in.
  const declaredRank = (title: string) => {
    const index = (component.groups ?? []).indexOf(title);
    return index < 0 ? 999 : index;
  };
  return titles.map((title) => {
    const subgroups = [...byGroup.get(title)!]
      .map(([subtitle, props]) => ({
        title: subtitle,
        props: props.slice().sort(byOrder),
      }))
      .sort(
        (a, b) =>
          Number(a.title !== undefined) - Number(b.title !== undefined) ||
          (a.props[0]!.order ?? 999) - (b.props[0]!.order ?? 999) ||
          // Map keys are unique, so a tie here is two titled subgroups.
          declaredRank(a.title!) - declaredRank(b.title!) ||
          a.title!.localeCompare(b.title!),
      )
      .map((subgroup) =>
        subgroup.title === undefined ? { props: subgroup.props } : subgroup,
      );
    return {
      title,
      props: subgroups.flatMap((subgroup) => subgroup.props),
      subgroups,
    };
  });
}

export function inspectorSections(
  node: ViewNode | undefined,
  component: InspectorComponent,
): InspectorSection[] {
  // Without a node (a palette entry), each row documents the prop's type.
  const props = node?.props ?? {};
  return groupedProps(component).map(({ title, props: group }) => ({
    title,
    rows: group.map((prop) => {
      const set = prop.name in props;
      if (!node) {
        const type =
          prop.type.text?.replace(/ \| undefined$/, '') ?? prop.type.kind;
        const fallback =
          prop.default !== undefined
            ? ` = ${JSON.stringify(prop.default)}`
            : '';
        return {
          name: prop.name,
          value: `${type}${prop.required ? '' : '?'}${fallback}`,
          set: false,
        };
      }
      const value = set
        ? formatValue(props[prop.name] as ViewValue)
        : prop.default !== undefined
          ? `${JSON.stringify(prop.default)} (default)`
          : prop.required
            ? 'required'
            : '—';
      return { name: prop.name, value, set };
    }),
  }));
}

/**
 * KF-QWDPM3: the most fields a focused Properties page lists before its
 * subgroups become pages of their own, the same bound that sends a larger
 * object form to a dialog (KF-Z9S029).
 */
/**
 * The groups the Properties directory lists (KF-FN28S3): `groupedProps`,
 * with an Integration group for a component whose only integration is its
 * data attributes, which that group's page edits.
 */
export function propertiesGroups(component: InspectorComponent): PropGroup[] {
  const groups = groupedProps(component);
  return component.props.some((prop) => prop.name === 'rootAttributes') &&
    !groups.some((group) => group.title === 'Integration')
    ? [...groups, { title: 'Integration', props: [], subgroups: [] }]
    : groups;
}

export const FOCUSED_FIELD_LIMIT = 10;

/** Whether a group's page lists its subgroups as rows instead of fields. */
export const splitsIntoPages = (group: PropGroup) =>
  group.props.length > FOCUSED_FIELD_LIMIT &&
  group.subgroups.some((subgroup) => subgroup.title !== undefined);

/**
 * What a Properties row says about its fields (KF-QWDPM3): the ones the
 * node sets, marking those bound to a param or item field, or "Defaults";
 * and how many of its fields have a problem.
 */
export function groupSummary(
  props: readonly InspectorProp[],
  values: Readonly<Record<string, unknown>>,
  problems: ReadonlyMap<string, string>,
  label: (name: string) => string,
): { readonly description: string; readonly problems: number } {
  const set = props.filter((prop) => prop.name in values);
  const named = set.map((prop) => {
    const value = values[prop.name];
    const bound =
      value !== null &&
      typeof value === 'object' &&
      ('$param' in value || '$bind' in value);
    return bound ? `${label(prop.name)} (bound)` : label(prop.name);
  });
  const description = !named.length
    ? 'Defaults'
    : named.length > 3
      ? `${named.slice(0, 3).join(', ')} + ${named.length - 3} more`
      : named.join(', ');
  return {
    description,
    problems: props.filter((prop) => problems.has(prop.name)).length,
  };
}

/**
 * Whether a prop answers an All properties search (KF-QWDPM3): its label,
 * its API name, or the group or task it sits in contains every word.
 */
export function matchesQuery(
  prop: InspectorProp,
  label: string,
  place: readonly string[],
  query: string,
): boolean {
  const haystack = [label, prop.name, ...place].join(' ').toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}
