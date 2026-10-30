// The icon picker's names and search (KF-VYRDDQ: icon picker). A document
// names a Lucide icon in `{ $icon: name }`, which `lucideExportName` turns
// into the PascalCase export: the picker offers every export by a name that
// round-trips to it.
import { lucideExportName } from '@kerfjs/ui/view';

/** The most icons the picker shows at once; a search narrows the rest. */
export const ICON_RESULTS = 96;

/**
 * The document name of a Lucide export: its kebab-case name
 * (`ChevronRight` → `chevron-right`, `ArrowDown01` → `arrow-down-0-1`),
 * else, for the few whose kebab name does not split back the same way
 * (`ArrowDownAZ`), the export with a lowercase first letter.
 */
export function lucideIconName(exportName: string): string {
  const kebab = exportName
    .replace(/([a-z])([A-Z0-9])/g, '$1-$2')
    .replace(/([0-9])([A-Za-z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([0-9])(?=[0-9])/g, '$1-')
    .toLowerCase();
  return lucideExportName(kebab) === exportName
    ? kebab
    : exportName.charAt(0).toLowerCase() + exportName.slice(1);
}

/** Every icon's document name, sorted. */
export function iconNames(icons: Readonly<Record<string, unknown>>): string[] {
  return Object.keys(icons).map(lucideIconName).sort();
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
): { readonly names: readonly string[]; readonly total: number } {
  const words = query
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean);
  const rank = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === words.join('-')) return 0;
    const parts = lower.split('-');
    if (words.every((word) => parts.includes(word))) return 1;
    if (words.every((word) => parts.some((part) => part.startsWith(word))))
      return 2;
    return 3;
  };
  const matches = names
    .filter((name) => words.every((word) => name.toLowerCase().includes(word)))
    .map((name) => ({ name, rank: rank(name) }))
    .sort((a, b) => a.rank - b.rank)
    .map((match) => match.name);
  return { names: matches.slice(0, limit), total: matches.length };
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
