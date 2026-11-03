/**
 * A demo build's sample document name and file (KF-JN4PF5): the test title
 * "builds NavStack › Compact Chrome" names the PascalCase document
 * `NavStackCompactChrome`, saved as `nav-stack-compact-chrome.kui.json`.
 * A parenthetical describing the composition (one naming parts with ›, as
 * in "(ContentItem › List › Text)") is left out; any other one, such as
 * "(Icon Only)", tells two examples apart and stays (KF-7WSP61).
 */
export function sampleName(title: string): {
  readonly name: string;
  readonly file: string;
} {
  const words = title
    .replace(/^builds (an? )?/, '')
    .replace(/\([^)]*›[^)]*\)/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const name = words
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join('');
  const file = `${words
    .map((word) => word.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase())
    .join('-')}.kui.json`;
  return { name, file };
}
