import assert from 'node:assert/strict';

// Every maintained family master has one Light/Dark theme and a component
// prefix. The remaining name segments become the State choice in its set.
export function planVariantSets(symbols, families, previous = []) {
  const pageByFamily = new Map(families.map(({ key, title }) => [key, title]));
  const oldIds = new Map(previous.map(({ name, id }) => [name, id]));
  const groups = new Map();
  for (const symbol of symbols) {
    const parts = symbol.name.split(' / ');
    const name = parts.shift();
    const theme = parts.pop();
    assert.ok(name && (theme === 'Light' || theme === 'Dark'));
    const state = parts.join(' · ');
    assert.ok(state, `${symbol.name} has no State value`);
    const page = pageByFamily.get(symbol.family);
    assert.ok(page, `Unknown Sketch family: ${symbol.family}`);
    const group = groups.get(name) ?? {
      name,
      page,
      id: oldIds.get(name),
      states: [],
      variants: [],
    };
    assert.equal(group.page, page, `${name} spans multiple Library families`);
    if (!group.states.includes(state)) group.states.push(state);
    assert.ok(
      !group.variants.some(
        (item) => item.state === state && item.theme === theme,
      ),
      `Duplicate ${name} State/Theme: ${state}/${theme}`,
    );
    group.variants.push({
      name: symbol.name,
      state,
      theme,
      symbolId: symbol.symbolId,
    });
    groups.set(name, group);
  }
  for (const group of groups.values())
    for (const state of group.states)
      assert.deepEqual(
        group.variants
          .filter((item) => item.state === state)
          .map((item) => item.theme)
          .sort(),
        ['Dark', 'Light'],
        `${group.name} ${state} must cover both themes`,
      );
  return [...groups.values()];
}

export function representativeVariantSets(manifest) {
  return [
    ['Button', 'Button', 'Badge Brand'],
    ['Form Controls', 'Text Field', 'Labeled · Project Name'],
    ['Advanced Inputs', 'Select', 'Compact · Control'],
    ['Lists and Data', 'List Item', 'Default · Control'],
    ['Toolbars and Navigation', 'Chip', 'Tags · Urgent'],
    ['Content and Feedback', 'Disclosure', 'Plain · Advanced Settings'],
  ].map(([page, setName, state]) => {
    const set = manifest.variantSets.find((item) => item.name === setName);
    assert.equal(set?.page, page);
    const variants = ['Light', 'Dark'].map((theme) => {
      const variant = set.variants.find(
        (item) => item.state === state && item.theme === theme,
      );
      assert.ok(variant, `${setName} ${state}/${theme} missing`);
      return variant;
    });
    return { page, setName, state, variants };
  });
}
