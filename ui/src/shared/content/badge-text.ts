/** A badge's value: a count, short text, or `true` for a text-free dot. */
export type BadgeValue = number | string | true;

/**
 * KF-78EZ8Q: the text a count badge shows, shared by `Button` and
 * `ToolbarButton` so the two controls read the same data the same way. A
 * count of 0 or less, or empty text, shows no badge; a count past `max`
 * shows `max+`; text shows as written. `undefined` means "no text": either
 * no badge at all or, for `true`, a dot.
 */
export function badgeText(
  badge: BadgeValue | undefined,
  max: number,
): string | undefined {
  if (badge === undefined || badge === true) return undefined;
  if (typeof badge === 'string') return badge === '' ? undefined : badge;
  if (!(badge > 0)) return undefined;
  return badge > max ? `${max}+` : String(badge);
}

/** Whether a badge value renders anything: a dot, a positive count, or text. */
export function badgeShows(badge: BadgeValue | undefined, max: number) {
  return badge === true || badgeText(badge, max) !== undefined;
}
