// The icon picker's names and search (KF-VYRDDQ: icon picker). A document
// names a Lucide icon in `{ $icon: name }`, which `lucideExportName` turns
// into the PascalCase export: the picker offers every icon once (KF-NTK7YW),
// by Lucide's own name for it, which round-trips to its export.
import { lucideExportName } from '@kerfjs/ui/view';

import { LUCIDE_ALIASES, LUCIDE_NAMES } from './lucide-aliases.generated.js';

/** The most icons the picker shows at once; a search narrows the rest. */
export const ICON_RESULTS = 96;

/**
 * The document name of a Lucide export: its kebab-case name, one word per
 * capital or number (`ChevronRight` → `chevron-right`, `ArrowDown01` →
 * `arrow-down-0-1`, KF-NTK7YW: `ArrowDownAZ` → `arrow-down-a-z`), else,
 * for an export that does not split back the same way, the export with a
 * lowercase first letter.
 */
export function lucideIconName(exportName: string): string {
  const kebab = exportName
    .replace(/([a-z0-9])(?=[A-Z])|([A-Za-z])(?=[0-9])|([A-Z])(?=[A-Z])/g, '$&-')
    .replace(/([0-9])(?=[0-9])/g, '$1-')
    .toLowerCase();
  return lucideExportName(kebab) === exportName
    ? kebab
    : exportName.charAt(0).toLowerCase() + exportName.slice(1);
}

/**
 * The alias names each icon also answers to in a search (KF-NTK7YW: `filter`
 * finds `funnel`, `trash-2` finds `trash`), by the name the picker shows.
 */
export function iconAliases(
  icons: Readonly<Record<string, unknown>>,
): ReadonlyMap<string, readonly string[]> {
  const named = new Map<unknown, string>();
  for (const exportName of Object.keys(icons))
    if (!LUCIDE_ALIASES.has(exportName))
      named.set(
        icons[exportName],
        LUCIDE_NAMES[exportName] ?? lucideIconName(exportName),
      );
  const aliases = new Map<string, string[]>();
  for (const exportName of LUCIDE_ALIASES) {
    const name = named.get(icons[exportName]);
    if (name === undefined) continue;
    aliases.set(name, [
      ...(aliases.get(name) ?? []),
      lucideIconName(exportName),
    ]);
  }
  return aliases;
}

/**
 * Every icon's document name, once each, sorted (KF-NTK7YW): Lucide's
 * aliases (`ArrowDownAz` for `ArrowDownAZ`) are left out, and an export
 * whose icon an earlier one already named (an alias a newer lucide adds)
 * gives way to it.
 */
export function iconNames(icons: Readonly<Record<string, unknown>>): string[] {
  const named = new Set<unknown>();
  const names: string[] = [];
  const add = (exportName: string) => {
    const icon = icons[exportName];
    if (named.has(icon)) return;
    named.add(icon);
    names.push(LUCIDE_NAMES[exportName] ?? lucideIconName(exportName));
  };
  const exports = Object.keys(icons);
  for (const exportName of exports)
    if (!LUCIDE_ALIASES.has(exportName)) add(exportName);
  for (const exportName of exports) add(exportName);
  return names.sort();
}

/**
 * The names matching `query` (words in any order, spaces or hyphens between
 * them), best first, at most `limit` of them, and how many match in all.
 * An exact name ranks first, then names with a word equal to each query
 * word, then a word starting with it, then any other match (`star` before
 * `align-start`).
 */
export function matchIcons(
  names: readonly string[],
  query: string,
  limit = ICON_RESULTS,
  /** Other names an icon answers to (KF-NTK7YW: Lucide's aliases). */
  aliases: ReadonlyMap<string, readonly string[]> = new Map(),
): { readonly names: readonly string[]; readonly total: number } {
  const words = query
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean);
  const matches = (term: string) =>
    words.every((word) => term.toLowerCase().includes(word));
  const rank = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === words.join('-')) return 0;
    const parts = lower.split('-');
    if (words.every((word) => parts.includes(word))) return 1;
    if (words.every((word) => parts.some((part) => part.startsWith(word))))
      return 2;
    return 3;
  };
  const found = names
    .map((name) => ({
      name,
      terms: [name, ...(aliases.get(name) ?? [])].filter(matches),
    }))
    .filter((match) => match.terms.length)
    .map(({ name, terms }) => ({ name, rank: Math.min(...terms.map(rank)) }))
    .sort((a, b) => a.rank - b.rank)
    .map((match) => match.name);
  return { names: found.slice(0, limit), total: found.length };
}

/**
 * The `name` a node takes when its icon changes from `from` to `to`
 * (KF-DQFXWG: a LucideIcon's `name` follows its icon, as `icon={Plus}
 * name="plus"`): the new icon's name while `name` still follows the icon
 * (unset, the old icon's name, or `seeded`, what a new node was given), or
 * undefined to leave a name the author chose.
 */
export function followingIconName(
  name: unknown,
  from: string | undefined,
  to: string,
  seeded: string,
): string | undefined {
  if (name === to) return undefined;
  return name === undefined || name === from || name === seeded
    ? to
    : undefined;
}

/**
 * The name field that follows an icon and the value it takes (KF-3J47BY):
 * of `fields` (the string fields beside the icon), `iconName`, else `name`,
 * while it still follows the icon (see `followingIconName`); undefined when
 * there is none or the author named it.
 */
export function iconNameEdit(
  fields: readonly string[],
  holder: Readonly<Record<string, unknown>> | undefined,
  from: string | undefined,
  to: string,
  seeded: string,
): { readonly key: string; readonly value: string } | undefined {
  const key = ['iconName', 'name'].find((name) => fields.includes(name));
  const value =
    key === undefined
      ? undefined
      : followingIconName(holder?.[key], from, to, seeded);
  return value === undefined ? undefined : { key: key!, value };
}
