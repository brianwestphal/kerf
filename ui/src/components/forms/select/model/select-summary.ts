/**
 * The closed text of a multiple Select: the chosen labels in choice order as
 * a short list ("Bug, Docs" / "Bug, Docs, and Ops" by locale), or empty.
 */
export function summarizeSelection(
  labels: readonly string[],
  locale?: string,
): string {
  if (labels.length === 0) return '';
  try {
    return new Intl.ListFormat(locale, { type: 'unit', style: 'short' }).format(
      labels,
    );
  } catch {
    return labels.join(', ');
  }
}
