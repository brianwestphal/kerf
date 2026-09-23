const UI_PREFIX = '@kerfjs/ui/';

export function deriveComponentIntegrations(catalog) {
  return catalog.entries
    .filter((entry) => entry.source === 'kerf' && entry.kind === 'component')
    .map((entry) => {
      const specifier =
        entry.delivery.browserImport ?? entry.delivery.moduleImport;
      if (!specifier?.startsWith(UI_PREFIX))
        throw new Error(
          `catalog component ${entry.id} needs a public @kerfjs/ui import`,
        );
      const module = specifier.slice(UI_PREFIX.length);
      return {
        id: entry.id,
        name: entry.name,
        module,
        specifier,
        browserCondition: Boolean(entry.delivery.browserImport),
        cssSpecifier: entry.delivery.manualCssImport,
        publicExports: entry.publicExports ?? [],
        catalogRoute: entry.links?.catalogRoute,
      };
    });
}

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

export function validateComponentIntegrations(integrations, surfaces) {
  const failures = [];
  const fail = (surface, expected, actual) =>
    failures.push({ surface, expected, actual });

  for (const integration of integrations) {
    const {
      id,
      module,
      specifier,
      browserCondition,
      cssSpecifier,
      publicExports,
      catalogRoute,
    } = integration;
    const exportKey = `./${module}`;
    const packageExport = surfaces.packageExports[exportKey];
    const expectedModuleExport = {
      types: `./dist/${module}.d.ts`,
      ...(browserCondition ? { browser: `./dist/browser/${module}.js` } : {}),
      import: `./dist/${module}.js`,
    };

    if (JSON.stringify(packageExport) !== JSON.stringify(expectedModuleExport))
      fail(
        `package.json#exports.${exportKey}`,
        expectedModuleExport,
        packageExport,
      );
    if (!surfaces.tsupEntries.has(module))
      fail('tsup entries', module, 'missing');
    if (!surfaces.sourceModules.has(module))
      fail('source module', `src/${module}.ts(x)`, 'missing');

    if (cssSpecifier) {
      const cssKey = `.${cssSpecifier.slice('@kerfjs/ui'.length)}`;
      const expectedCssExport = `./dist/styles/${module}.css`;
      if (surfaces.packageExports[cssKey] !== expectedCssExport)
        fail(
          `package.json#exports.${cssKey}`,
          expectedCssExport,
          surfaces.packageExports[cssKey],
        );
      if (!surfaces.styleModules.has(module))
        fail('source stylesheet', `src/${module}.css`, 'missing');
    }

    if (browserCondition)
      for (const name of publicExports) {
        if (!surfaces.barrelExports.has(name))
          fail('src/index.ts root export', name, 'missing');
      }
    if (!surfaces.demoIds.has(id)) fail('ux-demo registry', id, 'missing');
    if (!surfaces.demoModules.has(id))
      fail('demo source', `ux-demo/demos/${id}.tsx`, 'missing');
    if (catalogRoute !== `?component=${id}`)
      fail('catalog route', `?component=${id}`, catalogRoute);
    if (!surfaces.signatureSpecifiers.has(specifier))
      fail('AI public signatures', specifier, 'missing');
  }

  const ids = integrations.map(({ id }) => id);
  if (new Set(ids).size !== ids.length)
    fail('catalog component ids', 'unique ids', ids);
  return failures;
}

export function parseTsupEntries(source) {
  return new Set(
    [...source.matchAll(/^\s*'([^']+)',$/gm)].map((match) => match[1]),
  );
}

export function parseBarrelExports(source) {
  const exports = new Set();
  for (const match of source.matchAll(
    /export\s*\{([\s\S]*?)\}\s*from\s*['"]\.\/([^'"]+)\.js['"]/g,
  )) {
    for (const name of match[1]
      .split(',')
      .map(
        (value) =>
          value
            .trim()
            .replace(/^type\s+/, '')
            .split(/\s+as\s+/)[0],
      )
      .filter(Boolean))
      exports.add(name);
  }
  return exports;
}

export function parseStyleImports(source) {
  return new Set(
    [...source.matchAll(/@import\s+["']\.\/([^"']+)\.css["'];/g)].map(
      (match) => match[1],
    ),
  );
}

export function parseDemoIds(source) {
  const object =
    source.match(/export const demos = \{([\s\S]*?)\n\}/)?.[1] ?? '';
  return new Set(
    [...object.matchAll(/^\s*(?:'([^']+)'|([a-z][\w-]*))\s*:/gm)].map(
      (match) => match[1] ?? match[2],
    ),
  );
}

export function parseSignatureSpecifiers(source) {
  return new Set(
    [...source.matchAll(/^## `([^`]+)`$/gm)].map((match) => match[1]),
  );
}
