/** A CSS anchor name: a `<dashed-ident>` such as `--app-main`. */
export type AnchorName = `--${string}`;

/** A CSS `<dashed-ident>`: two dashes, then at least one name character. */
const DASHED_IDENT = /^--[\w\-\u0080-\u{10FFFF}]+$/u;

/**
 * `name` checked as a CSS dashed ident, for an `anchor-name` or
 * `position-anchor` declaration; throws a TypeError naming `owner` (the
 * component and prop) when it is not one, so a typo or an injected
 * declaration never reaches a style attribute.
 */
export function checkedAnchorName(name: string, owner: string): AnchorName {
  if (!DASHED_IDENT.test(name))
    throw new TypeError(
      `${owner} must be a CSS dashed-ident such as "--app-main"; received ${JSON.stringify(name)}.`,
    );
  return name as AnchorName;
}
