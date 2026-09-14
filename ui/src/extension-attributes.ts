type AttributeBag = Readonly<Record<string, unknown>>;

const DATA_ATTRIBUTE_NAME = /^data-[a-z0-9_.:-]+$/;

export function filterDataAttributes(
  attributes: object,
  protectedNames: ReadonlySet<string>,
): Record<string, string> {
  const filtered: Record<string, string> = {};

  for (const [name, value] of Object.entries(attributes as AttributeBag)) {
    const normalizedName = name.toLowerCase();
    if (
      typeof value === 'string'
      && DATA_ATTRIBUTE_NAME.test(normalizedName)
      && !protectedNames.has(normalizedName)
    ) {
      filtered[normalizedName] = value;
    }
  }

  return filtered;
}
