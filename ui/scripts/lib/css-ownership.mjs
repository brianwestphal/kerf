/**
 * The package stylesheet ownership rules behind `check:css-ownership`.
 *
 * Components never style other components. A child styles itself in a
 * parent's context from its own stylesheet; a parent may key its own styles on
 * a child's state (inside `:has()`) and style raw native or raw Web Awesome
 * children no kerf component owns, excluding kerf children by class (inside
 * `:not()`). The rules are pure over stylesheet and component source strings so
 * the unit suite can feed them known-bad and sanctioned selectors.
 */
import postcss from 'postcss';

import {
  complexSelectorParts,
  complexSelectors,
  dataComponents,
  kuiClasses,
  ownsClass,
  pseudoArguments,
  subjectTypes,
  withoutRelationalArguments,
} from '../../analyzer/selectors.mjs';

export {
  complexSelectorParts,
  complexSelectors,
  kuiClasses,
  ownsClass,
  subjectTypes,
  withoutRelationalArguments,
};

/** Stylesheets whose class roots do not follow `kui-<basename>`. */
export const packageClassRoots = new Map([
  ['document.css', ['kui-app-root']],
  [
    'layout.css',
    [
      'kui-content',
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

/**
 * Custom-property namespaces a stylesheet owns beyond its class roots: public
 * tokens whose names predate the component's class name. A namespace resolves
 * by longest prefix, so `--kui-toolbar-control-color` belongs to the group
 * even though `toolbar` is also a component.
 */
export const tokenNamespaceAliases = new Map([
  [
    'toolbar-control-group.css',
    ['toolbar-control', 'toolbar-group', 'toolbar-item', 'toolbar-avatar'],
  ],
  ['segmented-control.css', ['segmented']],
]);

const EDGE_INSET_CONTEXT =
  "Layout regions' inherited edge-inset context: a region hands --kui-edge-inset-* to the one Pane or layout that fills it and clears it for any other content, which cannot know it sits at a region edge. The edge context is the package's shared foundation contract (docs/app-layouts.md), not a restyle of the child.";

/**
 * Documented exceptions. Each names the stylesheet, the rule it is excused
 * from, a substring of the offending selector (whitespace-collapsed) or, for a
 * variable finding, the property, and the reason. An exception that no longer
 * matches a finding fails the check, so the list can only shrink.
 */
export const ownershipExceptions = [
  {
    file: 'collapsible-panel.css',
    rule: 'context-on-child',
    selector: '.kui-collapsible-panel__content > :not(',
    property: '--kui-edge-inset-',
    reason: EDGE_INSET_CONTEXT,
  },
  {
    file: 'nav-stack.css',
    rule: 'context-on-child',
    selector: '.kui-nav-stack__view > :not(',
    property: '--kui-edge-inset-',
    reason: EDGE_INSET_CONTEXT,
  },
  {
    file: 'split-view.css',
    rule: 'context-on-child',
    selector: '.kui-split-view__list > :not(',
    property: '--kui-edge-inset-',
    reason: EDGE_INSET_CONTEXT,
  },
  {
    file: 'tab-scaffold.css',
    rule: 'context-on-child',
    selector: '.kui-tab-scaffold__scene > :not(',
    property: '--kui-edge-inset-',
    reason: EDGE_INSET_CONTEXT,
  },
  {
    file: 'workbench.css',
    rule: 'context-on-child',
    selector: '.kui-workbench__main > :not(',
    property: '--kui-edge-inset-',
    reason: EDGE_INSET_CONTEXT,
  },
  {
    file: 'toolbar.css',
    rule: 'context-on-child',
    selector: '.kui-toolbar > *',
    property: '--kui-edge-inset-',
    reason:
      'The same edge-inset contract: a Toolbar consumes the edge context for its own padding and clears it for its zones, so a nested group or toolbar does not inset a second time.',
  },
  {
    file: 'collapsible-panel.css',
    rule: 'foreign-variable',
    property: '--_kui-floating-covered',
    reason:
      'KF-02AZVQ: fix pending (name the covered context after each provider; FloatingToolbar reads the restore-corner context from its own stylesheet).',
  },
  {
    file: 'collapsible-panel.css',
    rule: 'foreign-variable',
    property: '--kui-floating-toolbar-inset',
    reason:
      'KF-02AZVQ: fix pending (name the covered context after each provider; FloatingToolbar reads the restore-corner context from its own stylesheet).',
  },
  {
    file: 'resizable-region.css',
    rule: 'foreign-variable',
    property: '--_kui-floating-covered',
    reason:
      'KF-02AZVQ: fix pending (name the covered context after each provider; FloatingToolbar reads the restore-corner context from its own stylesheet).',
  },
  {
    file: 'resizable-region.css',
    rule: 'foreign-variable',
    property: '--kui-floating-toolbar-inset',
    reason:
      'KF-02AZVQ: fix pending (name the covered context after each provider; FloatingToolbar reads the restore-corner context from its own stylesheet).',
  },
  {
    file: 'workbench.css',
    rule: 'foreign-variable',
    property: '--_kui-floating-covered',
    reason:
      'KF-02AZVQ: fix pending (name the covered context after each provider; FloatingToolbar reads the restore-corner context from its own stylesheet).',
  },
  {
    file: 'workbench.css',
    rule: 'foreign-variable',
    property: '--kui-floating-toolbar-inset',
    reason:
      'KF-02AZVQ: fix pending (name the covered context after each provider; FloatingToolbar reads the restore-corner context from its own stylesheet).',
  },
  {
    file: 'workbench.css',
    rule: 'foreign-class',
    selector: '> :is( [data-component="pane"],',
    reason:
      'KF-KSJ7PY: fix pending (each layout should size itself in the Workbench region context from its own stylesheet).',
  },
];

function componentName(filename) {
  return filename
    .replace(/\.css$/, '')
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

/** The end index of a JSX opening tag that starts at `start` (`<`). */
function openingTagEnd(source, start) {
  let depth = 0;
  let quote = null;
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'" || char === '`') quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    else if (char === '>' && depth === 0) return index;
  }
  return source.length;
}

function classAttributeValues(openingTag) {
  const values = [];
  for (const match of openingTag.matchAll(/\bclass(?:Name)?\s*=\s*/g)) {
    let index = match.index + match[0].length;
    const first = openingTag[index];
    if (first === '"' || first === "'") {
      const end = openingTag.indexOf(first, index + 1);
      values.push(openingTag.slice(index + 1, end));
    } else if (first === '{') {
      let depth = 0;
      const start = index;
      for (; index < openingTag.length; index += 1) {
        if (openingTag[index] === '{') depth += 1;
        else if (openingTag[index] === '}') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      values.push(openingTag.slice(start, index + 1));
    }
  }
  return values;
}

/**
 * Derive the ownership model from the package stylesheets and component
 * sources (`{ filename, source }` records named relative to `src/`).
 */
export function buildOwnershipModel({ stylesheets, sources }) {
  const sourceByStem = new Map(
    sources.map(({ filename, source }) => [
      filename.replace(/\.tsx?$/, ''),
      { filename, source },
    ]),
  );
  const sheets = new Map();
  for (const { filename, source: css } of stylesheets) {
    const stem = filename.replace(/\.css$/, '');
    const roots = packageClassRoots.get(filename) ?? [`kui-${stem}`];
    const tsx = sourceByStem.get(stem);
    sheets.set(filename, {
      filename,
      css,
      name: componentName(filename),
      roots,
      namespaces: [
        ...roots.map((root) => root.replace(/^kui-/, '')),
        ...(tokenNamespaceAliases.get(filename) ?? []),
      ],
      // A component stylesheet pairs with a same-basename TSX component.
      component: Boolean(tsx?.filename.endsWith('.tsx')),
      source: tsx?.filename.endsWith('.tsx') ? tsx.source : '',
      dataComponents: new Set([stem]),
      hostTags: new Set(),
      internalTags: new Set(),
      hookClasses: new Map(),
    });
  }

  const namespaceOwners = new Map();
  for (const sheet of sheets.values())
    for (const namespace of sheet.namespaces)
      namespaceOwners.set(namespace, sheet.filename);

  const dataComponentOwners = new Map();
  const tagOwners = new Map();
  const componentByExport = new Map();
  for (const sheet of sheets.values()) {
    if (!sheet.component) continue;
    for (const match of sheet.source.matchAll(
      /['"]?data-component['"]?\s*[=:]\s*["']([a-z0-9-]+)["']/g,
    ))
      sheet.dataComponents.add(match[1]);
    for (const match of sheet.source.matchAll(
      /export\s+function\s+([A-Z][A-Za-z0-9]*)/g,
    ))
      componentByExport.set(match[1], sheet.filename);
  }
  for (const sheet of sheets.values())
    for (const value of sheet.dataComponents)
      if (
        !dataComponentOwners.has(value) ||
        value === sheet.filename.replace(/\.css$/, '')
      )
        dataComponentOwners.set(value, sheet.filename);

  for (const sheet of sheets.values()) {
    if (!sheet.component) continue;
    const { source } = sheet;
    for (const match of source.matchAll(/<(wa-[a-z0-9-]+)\b/g)) {
      const opening = source.slice(
        match.index,
        openingTagEnd(source, match.index),
      );
      const classes = classAttributeValues(opening).flatMap((value) =>
        [...value.matchAll(/\bkui-[a-z0-9_-]+/g)].map(([name]) => name),
      );
      const host = classes.some((name) => sheet.roots.includes(name));
      (host ? sheet.hostTags : sheet.internalTags).add(match[1]);
    }
    for (const tag of sheet.hostTags) sheet.internalTags.delete(tag);
    for (const [tag, host] of [
      ...[...sheet.hostTags].map((tag) => [tag, true]),
      ...[...sheet.internalTags].map((tag) => [tag, false]),
    ]) {
      const owners = tagOwners.get(tag) ?? [];
      owners.push({ filename: sheet.filename, host });
      tagOwners.set(tag, owners);
    }
  }

  // A class the component places on a composed kerf child's root.
  for (const sheet of sheets.values()) {
    if (!sheet.component) continue;
    const { source } = sheet;
    const composed = new Set();
    for (const match of source.matchAll(
      /import\s*\{([\s\S]*?)\}\s*from\s*['"]\.\/([a-z0-9-]+)\.js['"]/g,
    )) {
      for (const binding of match[1].split(',')) {
        const name = binding
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/i)
          .at(-1);
        if (name && componentByExport.get(name.trim()))
          composed.add(name.trim());
      }
    }
    for (const match of source.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)) {
      if (!composed.has(match[1])) continue;
      const opening = source.slice(
        match.index,
        openingTagEnd(source, match.index),
      );
      for (const value of classAttributeValues(opening)) {
        for (const [name] of value.matchAll(/\bkui-[a-z0-9_-]+/g)) {
          if (sheet.roots.some((root) => ownsClass(root, name)))
            sheet.hookClasses.set(name, match[1]);
        }
      }
    }
  }

  return { sheets, namespaceOwners, dataComponentOwners, tagOwners };
}

function variableOwner(model, property) {
  const name = property.replace(/^--_?kui-/, '');
  let owner = null;
  let longest = 0;
  for (const [namespace, filename] of model.namespaceOwners) {
    if (
      namespace.length > longest &&
      (name === namespace || name.startsWith(`${namespace}-`))
    ) {
      owner = filename;
      longest = namespace.length;
    }
  }
  return owner;
}

function mentions(model, selector, filename) {
  const sheet = model.sheets.get(filename);
  const classes = kuiClasses(selector);
  return (
    classes.some((name) => sheet.roots.some((root) => ownsClass(root, name))) ||
    dataComponents(selector).some(
      (value) => model.dataComponentOwners.get(value) === filename,
    )
  );
}

function notArguments(parts) {
  return parts
    .flatMap(({ compound }) => pseudoArguments(compound, 'not'))
    .join(',');
}

/**
 * Check one package stylesheet. Returns findings `{ rule, line, selector,
 * reason, property? }`; `rule` is one of `foreign-class`, `owned-wa-tag`,
 * `foreign-variable`, `context-on-child`, `hook-class`.
 */
export function checkPackageStylesheet(model, filename, source) {
  const sheet = model.sheets.get(filename);
  const owns = (name) => sheet.roots.some((root) => ownsClass(root, name));
  const ownsData = (value) =>
    model.dataComponentOwners.get(value) === filename ||
    sheet.dataComponents.has(value);
  const findings = [];
  const report = (node, rule, reason, extra = {}) =>
    findings.push({
      rule,
      line: node.source?.start?.line ?? 1,
      selector: (node.selector ?? node.parent?.selector ?? '').replace(
        /\s+/g,
        ' ',
      ),
      reason,
      ...extra,
    });
  const root = postcss.parse(source, { from: filename });

  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name))
      return;
    const parsed = complexSelectorParts(rule.selector);

    // A foreign kui class or data-component may appear only in an ancestor
    // compound (or inside :has()/:not()), and only when the styled compound —
    // the rightmost one naming a kui class — is this stylesheet's own.
    const foreign = [
      ...new Set(
        parsed.flatMap((parts) => {
          const compounds = parts.map(({ compound }) =>
            withoutRelationalArguments(compound),
          );
          const ownerIndex = compounds.findLastIndex(
            (compound) =>
              kuiClasses(compound).length > 0 ||
              dataComponents(compound).length > 0,
          );
          const ownerCompound = ownerIndex === -1 ? '' : compounds[ownerIndex];
          const ownerRefs = [
            ...kuiClasses(ownerCompound).map((name) => owns(name)),
            ...dataComponents(ownerCompound).map((value) => ownsData(value)),
          ];
          const contextual = ownerRefs.length > 0 && ownerRefs.every(Boolean);
          const checked = contextual ? [ownerCompound] : compounds;
          return [
            ...checked
              .flatMap(kuiClasses)
              .filter((name) => !owns(name))
              .map((name) => `.${name}`),
            ...checked
              .flatMap(dataComponents)
              .filter((value) => !ownsData(value))
              .map((value) => `[data-component="${value}"]`),
          ];
        }),
      ),
    ];
    if (foreign.length > 0)
      report(
        rule,
        'foreign-class',
        `package CSS reaches into foreign component classes (${foreign.join(', ')})`,
      );

    if (!sheet.component) return;

    for (const parts of parsed) {
      const subject = parts.at(-1);
      if (!subject) continue;
      const types = subjectTypes(subject.compound);
      const positive = parts
        .map(({ compound }) => withoutRelationalArguments(compound))
        .join(' ');
      const excluded = notArguments(parts);

      // Kerf components are named by class, never by the Web Awesome tag they
      // render: a tag another component renders — as the subject, or as an
      // ancestor whose internals the rule reaches — must be scoped to or
      // excluded from that component by its class.
      parts.forEach((part, index) => {
        for (const type of subjectTypes(part.compound) ?? []) {
          const owners = model.tagOwners.get(type) ?? [];
          const selfOwns = owners.some((owner) => owner.filename === filename);
          if (selfOwns && mentions(model, positive, filename)) continue;
          for (const owner of owners) {
            if (owner.filename === filename) continue;
            if (
              mentions(model, positive, owner.filename) ||
              mentions(model, excluded, owner.filename)
            )
              continue;
            const ownerSheet = model.sheets.get(owner.filename);
            if (!owner.host && index > 0 && part.combinator === '>') {
              const previous = withoutRelationalArguments(
                parts[index - 1].compound,
              );
              const previousTypes = subjectTypes(previous);
              const couldBeHost =
                (previousTypes === null ||
                  previousTypes.some((tag) => ownerSheet.hostTags.has(tag))) &&
                kuiClasses(previous).every((name) =>
                  ownerSheet.roots.some((root) => ownsClass(root, name)),
                ) &&
                dataComponents(previous).every(
                  (value) =>
                    model.dataComponentOwners.get(value) === owner.filename,
                );
              if (!couldBeHost) continue;
            }
            report(
              rule,
              'owned-wa-tag',
              `package CSS styles <${type}>, which ${ownerSheet.name} renders; name the component by its class (.${ownerSheet.roots[0]}) or exclude it with :not(.${ownerSheet.roots[0]})`,
            );
          }
        }
      });

      // Custom properties set on a subject that may be any element also land
      // on a composed kerf child's root.
      const subjectBare = withoutRelationalArguments(subject.compound);
      const universal =
        parts.length > 1 &&
        types === null &&
        kuiClasses(subjectBare).length === 0 &&
        dataComponents(subjectBare).length === 0;
      if (universal) {
        for (const node of rule.nodes ?? []) {
          if (node.type === 'decl' && node.prop.startsWith('--')) {
            report(
              node,
              'context-on-child',
              `package CSS sets ${node.prop} on a subject that may be another component's root; provide context on an owned element, named after this component`,
              {
                property: node.prop,
                selector: rule.selector.replace(/\s+/g, ' '),
              },
            );
          }
        }
      }
    }

    // A class this component places on a composed kerf child's root is a
    // hook for restyling that child.
    for (const [name, child] of sheet.hookClasses) {
      const pattern = new RegExp(`\\.${name}(?![a-z0-9_-])`);
      const reachable = complexSelectors(rule.selector)
        .flat()
        .map(withoutRelationalArguments)
        .some((compound) => pattern.test(compound));
      if (reachable)
        report(
          rule,
          'hook-class',
          `package CSS styles .${name}, which ${sheet.name} places on its composed ${child}; the child styles itself in this context from its own stylesheet`,
        );
    }
  });

  // X writes only --_kui-X-* private variables and never overrides another
  // component's public --kui-<other>-* token.
  root.walkDecls((decl) => {
    if (!sheet.component) return;
    const prop = decl.prop;
    if (!/^--_?kui-/.test(prop)) return;
    const owner = variableOwner(model, prop);
    const isPrivate = prop.startsWith('--_kui-');
    if (owner === filename) return;
    // A public token is another component's only when that component reads
    // or declares it: a shared namespace several siblings default on their
    // own roots (`--kui-list-group-divider-color`) names no single owner.
    const ownerUses =
      owner !== null &&
      new RegExp(`${prop.replace(/[-]/g, '\\-')}(?![a-z0-9_-])`).test(
        model.sheets.get(owner).css,
      );
    if (isPrivate || ownerUses) {
      report(
        decl,
        'foreign-variable',
        owner
          ? `package CSS writes ${prop}, which belongs to ${model.sheets.get(owner).name}`
          : `package CSS writes ${prop}; a component writes only its own --_kui-${sheet.namespaces[0]}-* private variables`,
        {
          property: prop,
          selector: (decl.parent?.selector ?? '').replace(/\s+/g, ' '),
        },
      );
    }
  });

  const seen = new Set();
  return findings.filter((finding) => {
    const key = `${finding.rule}|${finding.line}|${finding.property ?? ''}|${finding.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Split findings into violations and excused ones; also report exceptions
 * that no longer match any finding.
 */
export function applyExceptions(
  filename,
  findings,
  exceptions = ownershipExceptions,
) {
  const scoped = exceptions.filter((exception) => exception.file === filename);
  const used = new Set();
  const violations = [];
  for (const finding of findings) {
    const exception = scoped.find(
      (candidate) =>
        candidate.rule === finding.rule &&
        (candidate.property === undefined ||
          (finding.property ?? '').startsWith(candidate.property)) &&
        (candidate.selector === undefined ||
          finding.selector.includes(candidate.selector)),
    );
    if (exception) used.add(exception);
    else violations.push(finding);
  }
  const stale = scoped.filter((exception) => !used.has(exception));
  return { violations, stale };
}
