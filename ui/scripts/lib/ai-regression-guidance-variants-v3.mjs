// Suite-v3 guidance-representation variants: a variant replaces exactly one
// source of the shared conditions-v3.json guidance and inherits one v3
// feedback policy. The first variant swaps the JSON selection catalog for the
// generated markdown component reference (index + referenced pages).
import { access, readFile } from 'node:fs/promises';
import { posix, resolve } from 'node:path';

export const AI_REGRESSION_GUIDANCE_VARIANTS_V3 =
  'ai-regressions/guidance-variants-v3.json';

export async function loadAiRegressionGuidanceVariantsV3(root) {
  const descriptor = JSON.parse(
    await readFile(resolve(root, AI_REGRESSION_GUIDANCE_VARIANTS_V3), 'utf8'),
  );
  return descriptor.variants;
}

// The v3 policy table extended with each variant as a condition that carries
// its inherited policy's feedback stages.
export function aiRegressionV3PolicyTable(conditions) {
  const table = new Map(
    conditions.conditions.map((condition) => [
      condition.id,
      { ...condition, feedbackPolicy: condition.id, variant: false },
    ]),
  );
  for (const variant of conditions.guidanceVariants ?? []) {
    const base = table.get(variant.feedbackPolicy);
    if (!base || base.variant)
      throw new Error(
        `${variant.id} inherits unknown feedback policy ${variant.feedbackPolicy}`,
      );
    table.set(variant.id, {
      id: variant.id,
      description: variant.description,
      feedbackStages: base.feedbackStages,
      feedbackPolicy: variant.feedbackPolicy,
      variant: true,
    });
  }
  return table;
}

const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g;
const NAMED_IMPORT =
  /\bimport\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
const WEB_AWESOME_TAG = /<(wa-[a-z0-9-]+)/g;
const WEB_AWESOME_COMPONENT =
  /^@awesome\.me\/webawesome\/dist\/components\/([a-z0-9-]+)\//;

// Everything the application source already references: import specifiers,
// names imported from @kerfjs/ui, and Web Awesome tags or registrations.
export function collectAiRegressionContextReferences(sources) {
  const specifiers = new Set();
  const names = new Set();
  const tags = new Set();
  for (const source of sources) {
    for (const [, specifier] of source.matchAll(IMPORT_SPECIFIER)) {
      specifiers.add(specifier);
      const component = WEB_AWESOME_COMPONENT.exec(specifier);
      if (component) tags.add(`wa-${component[1]}`);
    }
    for (const [, list, specifier] of source.matchAll(NAMED_IMPORT)) {
      if (!specifier.startsWith('@kerfjs/ui')) continue;
      for (const part of list.split(',')) {
        const name = part
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0]
          .trim();
        if (name) names.add(name);
      }
    }
    for (const [, tag] of source.matchAll(WEB_AWESOME_TAG)) tags.add(tag);
  }
  return { specifiers, names, tags };
}

// Catalog entries (in catalog order) whose page a case's application files
// reference. Recipes are excluded: docs/recipes.md is shared by every
// condition, and no import names a recipe. The shared Web Awesome theme CSS is
// not an entry-identifying import.
export function selectAiRegressionReferencePages(catalog, references) {
  return catalog.entries
    .filter((entry) => {
      if (entry.kind === 'recipe') return false;
      if (references.tags.has(entry.id)) return true;
      const delivery = entry.delivery ?? {};
      const modules = [
        delivery.browserImport,
        delivery.moduleImport,
        delivery.manualCssImport,
        delivery.registrationImport,
        ...(entry.wiring ?? []).map(({ import: path }) => path),
      ].filter(Boolean);
      if (modules.some((path) => references.specifiers.has(path))) return true;
      const exports = [
        ...(entry.publicExports ?? []),
        ...(entry.wiring ?? []).map(({ export: name }) => name),
      ];
      return exports.some((name) => references.names.has(name));
    })
    .map(({ id }) => id);
}

// The guidance definition (buildAiRegressionContext input) for one variant and
// one case: the shared v3 guidance with `replaces` swapped, in place, for the
// markdown index followed by the selected pages.
export async function resolveAiRegressionVariantGuidanceV3(
  root,
  conditions,
  variant,
  caseDefinition,
) {
  const basePaths = conditions.guidance.sourcePaths;
  const position = basePaths.indexOf(variant.replaces);
  if (position < 0)
    throw new Error(
      `${variant.id} replaces ${variant.replaces}, which is not a v3 guidance source`,
    );
  const [catalog, ...sources] = await Promise.all([
    readFile(resolve(root, variant.replaces), 'utf8').then(JSON.parse),
    ...caseDefinition.contextFiles.map((path) =>
      readFile(resolve(root, path), 'utf8'),
    ),
  ]);
  const pages = selectAiRegressionReferencePages(
    catalog,
    collectAiRegressionContextReferences(sources),
  ).map((id) => posix.join(variant.with.pageDirectory, `${id}.md`));
  await Promise.all(pages.map((path) => access(resolve(root, path))));
  return {
    id: variant.id,
    sourcePaths: [
      ...basePaths.slice(0, position),
      variant.with.index,
      ...pages,
      ...basePaths.slice(position + 1),
    ],
  };
}
