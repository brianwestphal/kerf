import { readFile, writeFile } from 'node:fs/promises';

import prettier from 'prettier';

const check = process.argv.includes('--check');
const v1Url = new URL('../ai/component-catalog.json', import.meta.url);
const overrideUrl = new URL(
  '../ai/component-catalog-v2-overrides.json',
  import.meta.url,
);
const outputUrl = new URL('../ai/component-catalog-v2.json', import.meta.url);

const [v1, overrides] = await Promise.all(
  [v1Url, overrideUrl].map(async (url) =>
    JSON.parse(await readFile(url, 'utf8')),
  ),
);

const qualify = (id) => `${v1.package}:${id}`;
const defaultGeometry = {
  margin: 'composed',
  border: 'composed',
  padding: 'composed',
};

// Wiring-owned state attributes are declared per helper in v1, where the
// helper is named; v2 flattens them with the helper that writes each one.
const stateAttributesOf = (entry) =>
  (entry.wiring ?? []).flatMap((item) =>
    (item.stateAttributes ?? []).map(({ name, on, meaning }) => ({
      name,
      on,
      helper: item.export,
      meaning,
    })),
  );

function defaultEntry(entry) {
  const helpers = (entry.wiring ?? []).map((item) => item.export);
  const requiredWiring = (entry.wiring ?? []).filter((item) => item.required);
  const isRecipe = entry.kind === 'recipe';
  return {
    key: qualify(entry.id),
    package: v1.package,
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    source: entry.source,
    parents: { mode: isRecipe ? 'root' : 'any', entries: [] },
    contexts: isRecipe ? ['application-reference'] : ['application-ui'],
    zones: [],
    children: {
      mode: 'any',
      concepts: [],
      requiredConcepts: [],
    },
    state: (entry.appOwns ?? []).map((id) => ({
      id,
      owner: 'application',
      required: false,
    })),
    wiring: {
      required: requiredWiring.length > 0,
      helpers,
      obligations: requiredWiring.map(
        (item) => item.reason ?? `Use ${item.export} as documented.`,
      ),
      stateAttributes: stateAttributesOf(entry),
    },
    responsive: {
      owner: isRecipe ? 'application' : 'not-applicable',
      behaviors: [],
    },
    layout: {
      roles: [
        isRecipe ? 'reference-composition' : entry.category.toLowerCase(),
      ],
      geometry: entry.geometry ?? defaultGeometry,
    },
    accessibility: { obligations: entry.accessibility ?? [] },
    cssValueProps: entry.cssValueProps ?? [],
    boundaries: {
      rootClass: entry.publicClasses?.[0] ?? null,
      publicClasses: entry.publicClasses ?? [],
      publicTokens: entry.publicTokens ?? [],
    },
    diagnostics: [],
    provenance: {
      selection: 'ai/component-catalog.json',
      composition: 'generated-permissive-default',
    },
  };
}

function mergeEntry(base, override) {
  if (!override) return base;
  const { _source, ...contract } = override;
  if (contract.wiring?.stateAttributes)
    throw new Error(
      `${base.key} override declares wiring.stateAttributes; declare them on the helper in ai/component-catalog.json.`,
    );
  return {
    ...base,
    ...contract,
    // An override restates wiring's helpers and obligations; the state
    // attributes stay single-sourced from v1.
    wiring: contract.wiring
      ? { ...contract.wiring, stateAttributes: base.wiring.stateAttributes }
      : base.wiring,
    provenance: {
      ...base.provenance,
      composition: _source,
    },
  };
}

const entries = v1.entries.map((entry) =>
  mergeEntry(defaultEntry(entry), overrides[qualify(entry.id)]),
);
const unusedOverrides = Object.keys(overrides).filter(
  (key) => !entries.some((entry) => entry.key === key),
);
if (unusedOverrides.length) {
  throw new Error(`Unknown v2 override keys: ${unusedOverrides.join(', ')}`);
}

const artifact = {
  $schema: './component-catalog-v2.schema.json',
  schemaVersion: 2,
  package: v1.package,
  compatibility: {
    v1Catalog: './component-catalog.json',
    identity: 'package:id',
  },
  entries,
};
const generated = await prettier.format(JSON.stringify(artifact), {
  parser: 'json',
});

if (check) {
  let current = '';
  try {
    current = await readFile(outputUrl, 'utf8');
  } catch {
    // The deterministic stale-artifact error below covers a missing output.
  }
  if (current !== generated) {
    console.error(
      '[sync-component-catalog-v2] ai/component-catalog-v2.json is stale; run npm run catalog:v2:sync.',
    );
    process.exitCode = 1;
  } else {
    console.log(
      `[sync-component-catalog-v2] OK — ${entries.length} package-qualified entries are synchronized with v1.`,
    );
  }
} else {
  await writeFile(outputUrl, generated);
  console.log(
    `[sync-component-catalog-v2] wrote ${entries.length} entries to ai/component-catalog-v2.json.`,
  );
}
