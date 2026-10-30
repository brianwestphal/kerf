// The inspector rail's read-only sections for the selected node, from
// ui/ai/component-props.json (types, groups, defaults) and the node's props.
import type { ViewNode, ViewValue } from '@kerfjs/ui/view';

export interface InspectorProp {
  readonly name: string;
  readonly type: { readonly kind: string; readonly text?: string };
  readonly required: boolean;
  readonly default?: string | number | boolean;
  readonly group?: string;
  readonly order?: number;
  readonly control?: string;
  readonly zone?: string;
  readonly slot?: true;
  /** css-value props: the builders the prop accepts. */
  readonly cssValue?: { readonly helpers?: readonly string[] };
  /** Icon data (`'lucide'`): edits in the icon picker (KF-AJHJB8). */
  readonly iconSource?: string;
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

const OTHER = 'Other';

/**
 * Sections in the component's curated group order (then "Other"), props in
 * curated order then by name. Hidden plumbing props and zones are left out:
 * zones appear in the outline instead.
 */
/** A component's visible props grouped by curated group (then "Other"), in curated order. */
export function groupedProps(
  component: InspectorComponent,
): { readonly title: string; readonly props: readonly InspectorProp[] }[] {
  const visible = component.props.filter(
    (prop) =>
      prop.control !== 'hidden' && !prop.zone && prop.type.kind !== 'never',
  );
  const order = [...(component.groups ?? [])];
  const byGroup = new Map<string, InspectorProp[]>();
  for (const prop of visible) {
    const group = prop.group && order.includes(prop.group) ? prop.group : OTHER;
    byGroup.set(group, [...(byGroup.get(group) ?? []), prop]);
  }
  const titles = [
    ...order.filter((title) => byGroup.has(title)),
    ...(byGroup.has(OTHER) ? [OTHER] : []),
  ];
  return titles.map((title) => ({
    title,
    props: byGroup
      .get(title)!
      .slice()
      .sort(
        (a, b) =>
          (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name),
      ),
  }));
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
