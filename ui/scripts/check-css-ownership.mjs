import console from 'node:console';
import { access, readFile, readdir } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import process from 'node:process';

import postcss from 'postcss';

const root = resolve(import.meta.dirname, '..');

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function cssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await cssFiles(file)));
    else if (entry.name.endsWith('.css')) files.push(file);
  }
  return files;
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(file)));
    else if (/\.tsx?$/.test(entry.name)) files.push(file);
  }
  return files;
}

function relative(file) {
  return file.slice(root.length + 1);
}

function reportRule(errors, file, rule, reason) {
  errors.push(
    `${relative(file)}:${rule.source?.start?.line ?? 1}: ${reason}: ${rule.selector.replace(/\s+/g, ' ')}`,
  );
}

const errors = [];
const appStyles = await cssFiles(resolve(root, 'ux-demo'));
const styledAppClasses = new Set();
for (const file of appStyles) {
  const source = await readFile(file, 'utf8');
  const sheet = postcss.parse(source, { from: file });
  sheet.walkRules((rule) => {
    for (const match of rule.selector.matchAll(/\.([a-z][a-z0-9_-]*)/gi)) {
      styledAppClasses.add(match[1]);
    }
    if (/\.kui-[a-z0-9-]+/i.test(rule.selector)) {
      reportRule(
        errors,
        file,
        rule,
        'application CSS must not select package component classes',
      );
    }
    if (/(^|[\s>+~,])wa-[a-z0-9-]+/i.test(rule.selector)) {
      reportRule(
        errors,
        file,
        rule,
        'application CSS must configure Web Awesome through owned classes or package theme contracts',
      );
    }
  });
}

for (const file of await sourceFiles(resolve(root, 'ux-demo'))) {
  const source = await readFile(file, 'utf8');
  const packageComponents = new Set();
  for (const match of source.matchAll(
    /import\s*\{([\s\S]*?)\}\s*from\s*['"]@kerfjs\/ui\/[a-z0-9-]+['"]/gi,
  )) {
    for (const binding of match[1].split(',')) {
      const name = binding
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/i)
        .at(-1);
      if (name && /^[A-Z]/.test(name)) packageComponents.add(name);
    }
  }
  for (const component of packageComponents) {
    const openingTag = new RegExp(
      `<${component}\\b[^>]*?\\bclass(?:Name)?=["']([^"']+)["']`,
      'g',
    );
    for (const match of source.matchAll(openingTag)) {
      const styled = match[1]
        .split(/\s+/)
        .filter((name) => styledAppClasses.has(name));
      if (styled.length > 0) {
        errors.push(
          `${relative(file)}: application class(es) ${styled.join(', ')} style the ${component} component root; add owner configuration or style an application-owned wrapper`,
        );
      }
    }
  }
  for (const match of source.matchAll(
    /<wa-[a-z0-9-]+\b[^>]*?\bclass=["']([^"']+)["']/gi,
  )) {
    const styled = match[1]
      .split(/\s+/)
      .filter((name) => styledAppClasses.has(name));
    if (styled.length > 0) {
      errors.push(
        `${relative(file)}: application class(es) ${styled.join(', ')} style a Web Awesome component root; use its public configuration or the package theme`,
      );
    }
  }
}

const packageClassRoots = new Map([
  [
    'layout.css',
    [
      'kui-content',
      'kui-content-item',
      'kui-control-cluster',
      'kui-inline-metadata',
      'kui-scroll-owner',
    ],
  ],
  ['skeleton.css', ['kui-skeleton', 'kui-skeleton-lines']],
  ['surface-scaffold.css', ['kui-dialog-surface', 'kui-popup-surface']],
  [
    'toolbar-control-group.css',
    ['kui-toolbar-control-group', 'kui-toolbar-action-link'],
  ],
  ['token-search-field.css', ['kui-token-search']],
]);

function ownsClass(rootClass, candidate) {
  return (
    candidate === rootClass ||
    candidate.startsWith(`${rootClass}__`) ||
    candidate.startsWith(`${rootClass}--`)
  );
}

function ownedMarkupClasses(source) {
  const owned = new Set();
  for (const match of source.matchAll(
    /<([a-z][a-z0-9-]*)\b[^>]*?\bclass\s*=\s*(?:["']([^"']+)["']|\{`([^`]+)`[^}]*\})/gi,
  )) {
    if (match[1].startsWith('wa-')) continue;
    for (const classMatch of (match[2] ?? match[3] ?? '').matchAll(
      /\b(kui-catalog[a-z0-9_-]*)\b/gi,
    ))
      owned.add(classMatch[1]);
  }
  return owned;
}

function ownedAppMarkupClasses(source) {
  const owned = new Set();
  for (const match of source.matchAll(
    /<([a-z][a-z0-9-]*)\b[^>]*?\bclass\s*=\s*(?:["']([^"']+)["']|\{`([^`]+)`[^}]*\})/gi,
  )) {
    if (match[1].startsWith('wa-')) continue;
    for (const classMatch of (match[2] ?? match[3] ?? '').matchAll(
      /\b([a-z][a-z0-9_-]*)\b/gi,
    ))
      owned.add(classMatch[1]);
  }
  for (const match of source.matchAll(
    /\bclass\s*:\s*(?:["']([^"']+)["']|`([^`]+)`)/gi,
  )) {
    for (const classMatch of (match[1] ?? match[2] ?? '').matchAll(
      /\b([a-z][a-z0-9_-]*)\b/gi,
    ))
      owned.add(classMatch[1]);
  }
  return owned;
}

const packageStyles = await cssFiles(resolve(root, 'src'));
for (const file of packageStyles) {
  if (relative(file).startsWith('src/catalog/components/')) continue;
  const filename = file.slice(file.lastIndexOf('/') + 1);
  const defaultRoot = `kui-${filename.replace(/\.css$/, '')}`;
  const ownedRoots = packageClassRoots.get(filename) ?? [defaultRoot];
  const source = await readFile(file, 'utf8');
  const sheet = postcss.parse(source, { from: file });
  sheet.walkRules((rule) => {
    const foreign = [
      ...new Set(
        [...rule.selector.matchAll(/\.((?:kui)-[a-z0-9_-]+)/gi)]
          .map(([, name]) => name)
          .filter(
            (name) =>
              !ownedRoots.some((rootClass) => ownsClass(rootClass, name)),
          ),
      ),
    ];
    if (foreign.length > 0) {
      reportRule(
        errors,
        file,
        rule,
        `package CSS reaches into foreign component classes (${foreign.map((name) => `.${name}`).join(', ')})`,
      );
    }
  });
}

const catalogEntrypoint = resolve(root, 'src/catalog.tsx');
const publicCatalogSource = await readFile(catalogEntrypoint, 'utf8');
const catalogStatements = publicCatalogSource
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);
if (
  catalogStatements.length === 0 ||
  catalogStatements.some(
    (statement) =>
      !/^export\s+(?:type\s+)?(?:\*|\{[\s\S]*\})\s+from\s+['"]\.\/catalog\/[a-z0-9./-]+\.js['"]$/i.test(
        statement,
      ),
  )
) {
  errors.push(
    'src/catalog.tsx must remain a thin re-export entrypoint; move implementation into src/catalog/',
  );
}

const publicCatalogFile = resolve(root, 'src/catalog.css');
const publicCatalog = postcss.parse(await readFile(publicCatalogFile, 'utf8'), {
  from: publicCatalogFile,
});
const catalogImports = publicCatalog.nodes.filter(
  (node) => node.type === 'atrule' && node.name.toLowerCase() === 'import',
);
const catalogNonImports = publicCatalog.nodes.filter(
  (node) =>
    node.type !== 'comment' &&
    !(node.type === 'atrule' && node.name.toLowerCase() === 'import'),
);
if (catalogImports.length === 0 || catalogNonImports.length > 0) {
  errors.push(
    'src/catalog.css may contain only @import compatibility entries; put rules in same-basename src/catalog/components/*.css files',
  );
}

const legacyCatalogStylesheet = resolve(root, 'src/catalog-component.css');
if (await exists(legacyCatalogStylesheet)) {
  errors.push(
    'src/catalog-component.css must not exist; split catalog visuals into same-basename src/catalog/components/*.tsx and *.css pairs',
  );
}

const catalogComponents = resolve(root, 'src/catalog/components');
if (!(await exists(catalogComponents))) {
  errors.push(
    'src/catalog/components is missing; catalog visual components must live in independently styled modules',
  );
} else {
  const componentSources = (await sourceFiles(catalogComponents)).filter(
    (file) => extname(file) === '.tsx',
  );
  const componentStyles = await cssFiles(catalogComponents);
  const sourceStems = new Set(
    componentSources.map((file) => file.slice(0, -extname(file).length)),
  );
  const claimedRoots = new Map();

  for (const source of componentSources) {
    const stylesheet = source.slice(0, -extname(source).length) + '.css';
    if (!(await exists(stylesheet))) {
      errors.push(
        `${relative(source)} is a catalog visual component without same-basename stylesheet ${relative(stylesheet)}`,
      );
    }
    const expectedComponent = basename(source, '.tsx')
      .split('-')
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join('');
    const sourceText = await readFile(source, 'utf8');
    const extraComponents = [
      ...sourceText.matchAll(/\bfunction\s+([A-Z][A-Za-z0-9]*)\s*\(/g),
    ]
      .map(([, name]) => name)
      .filter((name) => name !== expectedComponent);
    if (extraComponents.length > 0) {
      errors.push(
        `${relative(source)} declares additional catalog component(s) ${extraComponents.join(', ')}; move each visual component to its own same-basename TSX/CSS pair`,
      );
    }
  }
  for (const stylesheet of componentStyles) {
    const stem = stylesheet.slice(0, -extname(stylesheet).length);
    if (!sourceStems.has(stem)) {
      errors.push(
        `${relative(stylesheet)} has no same-basename catalog visual component`,
      );
    }

    const componentName = basename(stylesheet, '.css');
    const componentSource = `${stem}.tsx`;
    const componentMarkup = (await exists(componentSource))
      ? await readFile(componentSource, 'utf8')
      : '';
    const markupRoots = ownedMarkupClasses(componentMarkup);
    const source = await readFile(stylesheet, 'utf8');
    const allowedRoots = new Set(markupRoots);
    for (const match of source.matchAll(
      /css-ownership:\s*allow-root\s+\.?((?:kui)-[a-z0-9_-]+)\s+--\s+([^*\n]{20,})/gi,
    )) {
      allowedRoots.add(match[1]);
    }
    for (const ownedRoot of allowedRoots) {
      const previous = claimedRoots.get(ownedRoot);
      if (previous && previous !== stylesheet) {
        errors.push(
          `${relative(stylesheet)} and ${relative(previous)} both claim .${ownedRoot}; one catalog component must own each visual class root`,
        );
      } else claimedRoots.set(ownedRoot, stylesheet);
    }

    const sheet = postcss.parse(source, { from: stylesheet });
    let selectsOwnedRoot = false;
    sheet.walkRules((rule) => {
      const selectedClasses = [
        ...new Set(
          [...rule.selector.matchAll(/\.([a-z][a-z0-9_-]*)/gi)].map(
            ([, name]) => name,
          ),
        ),
      ];
      if (
        selectedClasses.some((name) =>
          [...allowedRoots].some((rootClass) => ownsClass(rootClass, name)),
        )
      )
        selectsOwnedRoot = true;
      const foreign = selectedClasses.filter(
        (name) =>
          ![...allowedRoots].some((rootClass) => ownsClass(rootClass, name)),
      );
      if (foreign.length > 0) {
        reportRule(
          errors,
          stylesheet,
          rule,
          `catalog component CSS reaches outside classes rendered by ${componentName}.tsx (${foreign.map((name) => `.${name}`).join(', ')}); a same-file secondary root requires "css-ownership: allow-root <root> -- <reason>"`,
        );
      }
    });
    if (allowedRoots.size === 0 || !selectsOwnedRoot) {
      errors.push(
        `${relative(stylesheet)} does not select a kui-catalog class rendered by its same-basename ${componentName}.tsx`,
      );
    }
  }
}

const shellSource = await readFile(resolve(root, 'ux-demo/style.css'), 'utf8');
if (
  shellSource.split('\n').length > 64 ||
  /(?:^|\n)\s*\.(?:demo|recipe|kui)-/.test(shellSource)
) {
  errors.push(
    'ux-demo/style.css must remain limited to global document-shell mechanics (64 lines maximum; no component selectors)',
  );
}

for (const aggregate of [
  'ux-demo/demos/demo-components.css',
  'ux-demo/recipes/recipe-components.css',
  'ux-demo/recipes/recipes.css',
]) {
  if (await exists(resolve(root, aggregate))) {
    errors.push(
      `${aggregate} must not exist; colocate each app-owned visual component's styles in its same-basename stylesheet and use configuration for package children`,
    );
  }
}

for (const stylesheet of appStyles) {
  if (relative(stylesheet) === 'ux-demo/style.css') continue;
  const stem = stylesheet.slice(0, -extname(stylesheet).length);
  const componentSource = `${stem}.tsx`;
  if (!(await exists(componentSource))) {
    errors.push(
      `${relative(stylesheet)} has no same-basename app visual component; colocate styles with their owner`,
    );
    continue;
  }

  const source = await readFile(componentSource, 'utf8');
  const stylesheetName = basename(stylesheet);
  if (
    !new RegExp(
      `import\\s+["']\\./${stylesheetName.replace('.', '\\.')}["']`,
    ).test(source)
  ) {
    errors.push(
      `${relative(componentSource)} must import its same-basename stylesheet ${stylesheetName}`,
    );
  }

  const ownedClasses = ownedAppMarkupClasses(source);
  const sheet = postcss.parse(await readFile(stylesheet, 'utf8'), {
    from: stylesheet,
  });
  sheet.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name))
      return;
    const selectedClasses = [
      ...new Set(
        [...rule.selector.matchAll(/\.([a-z][a-z0-9_-]*)/gi)].map(
          ([, name]) => name,
        ),
      ),
    ];
    const foreign = selectedClasses.filter(
      (name) =>
        ![...ownedClasses].some((rootClass) => ownsClass(rootClass, name)),
    );
    if (selectedClasses.length === 0) {
      reportRule(
        errors,
        stylesheet,
        rule,
        'app component CSS must be scoped by a class rendered on raw markup in its same-basename TSX owner',
      );
    } else if (foreign.length > 0) {
      reportRule(
        errors,
        stylesheet,
        rule,
        `app component CSS reaches outside classes rendered on raw markup by ${basename(componentSource)} (${foreign.map((name) => `.${name}`).join(', ')})`,
      );
    }
  });
}

if (errors.length > 0) {
  console.error(`[check-css-ownership] ${errors.length} violation(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `[check-css-ownership] OK — ${packageStyles.length} package stylesheets stay within their owned class roots; ${appStyles.length} app stylesheets contain no package-component or Web Awesome descendant overrides; shell and catalog entrypoints stay minimal.`,
  );
}
