type AttributeBag = Readonly<Record<string, unknown>>;

const DATA_ATTRIBUTE_NAME = /^data-[a-z0-9_.:-]+$/;
const POPOVER_TARGET_ACTIONS = new Set(['toggle', 'show', 'hide']);
const ARIA_HASPOPUP_VALUES = new Set([
  'dialog',
  'menu',
  'listbox',
  'tree',
  'grid',
  'true',
]);

export function filterDataAttributes(
  attributes: object,
  protectedNames: ReadonlySet<string>,
): Record<string, string> {
  const filtered: Record<string, string> = {};

  for (const [name, value] of Object.entries(attributes as AttributeBag)) {
    const normalizedName = name.toLowerCase();
    if (
      typeof value === 'string' &&
      DATA_ATTRIBUTE_NAME.test(normalizedName) &&
      !protectedNames.has(normalizedName)
    ) {
      filtered[normalizedName] = value;
    }
  }

  return filtered;
}

export function filterControlAttributes(
  attributes: object,
  protectedDataNames: ReadonlySet<string>,
): Record<string, string> {
  const source = attributes as AttributeBag;
  const filtered = filterDataAttributes(attributes, protectedDataNames);

  if (typeof source.popoverTarget === 'string')
    filtered.popoverTarget = source.popoverTarget;
  if (POPOVER_TARGET_ACTIONS.has(source.popoverTargetAction as string)) {
    filtered.popoverTargetAction = source.popoverTargetAction as string;
  }
  if (typeof source['aria-controls'] === 'string')
    filtered['aria-controls'] = source['aria-controls'];
  if (ARIA_HASPOPUP_VALUES.has(source['aria-haspopup'] as string)) {
    filtered['aria-haspopup'] = source['aria-haspopup'] as string;
  }

  return filtered;
}
