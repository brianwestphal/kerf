/**
 * Downstream component-ownership facts for `kerf-ui-analyze` (`KUI-L019` –
 * `KUI-L023`): the consumer-side form of the package's own
 * `check:css-ownership` rules.
 *
 * Components own their styles and are configured, never overridden. An
 * application or component package may style its own elements, including in a
 * cataloged component's context (`.kui-toolbar > .my-widget` lives in the
 * application's stylesheet), but it never makes another package's component
 * the subject of a rule, writes that component's private variables, overrides
 * a token its typed prop configures, or restyles it through a hook class on
 * its root. Facts come from composition and selection catalogs, plus optional
 * source inference, so third-party packages get the same protection as
 * `@kerfjs/ui`.
 */
import {
  classNames,
  complexSelectorParts,
  dataComponents,
  pseudoArguments,
  subjectTypes,
  withoutRelationalArguments,
} from './selectors.mjs';
import { resolve } from 'node:path';

const kebab = (value) =>
  value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

function isWebAwesomeTagEntry(entry) {
  return entry.source === 'webawesome' && /^wa-[a-z0-9-]+$/.test(entry.id);
}

/**
 * Index the loaded catalog entries by every handle a stylesheet can use to
 * reach them: public classes, `data-component` values, Web Awesome tags the
 * package themes, private-variable prefixes, and component tokens a typed
 * prop configures.
 */
export function componentOwnershipFacts(entries) {
  const classOwners = new Map();
  const dataComponentOwners = new Map();
  const tagOwners = new Map();
  const privatePrefixes = [];
  const typedTokens = new Map();
  const setOnce = (map, key, entry) => {
    if (!map.has(key)) map.set(key, entry);
  };
  const sharesStylesheet = (left, right) => {
    if (
      left.package !== right.package ||
      !left.catalogDirectory ||
      !right.catalogDirectory
    )
      return false;
    const styles = new Set(
      (left.styleSources ?? []).map((path) =>
        resolve(left.catalogDirectory, path),
      ),
    );
    return (right.styleSources ?? []).some((path) =>
      styles.has(resolve(right.catalogDirectory, path)),
    );
  };
  for (const entry of entries) {
    const boundaries = entry.boundaries ?? {};
    for (const className of boundaries.publicClasses ?? []) {
      const previous = classOwners.get(className);
      if (!classOwners.has(className)) classOwners.set(className, entry);
      else if (previous && sharesStylesheet(previous, entry))
        // The class is co-owned. A selector cannot attribute it to one
        // component without depending on catalog order.
        classOwners.set(className, null);
      if (
        className.startsWith('kui-') &&
        !className.includes('__') &&
        !className.includes('--')
      )
        setOnce(dataComponentOwners, className.slice('kui-'.length), entry);
    }
    if (entry.id && !isWebAwesomeTagEntry(entry))
      setOnce(dataComponentOwners, entry.id, entry);
    if (isWebAwesomeTagEntry(entry)) setOnce(tagOwners, entry.id, entry);
    // Every root-like public class names the component (Toolbar Control
    // Group's first class is its action link, not the group).
    const roots = [
      ...new Set(
        [boundaries.rootClass, ...(boundaries.publicClasses ?? [])].filter(
          (name) => name && !name.includes('__') && !name.includes('--'),
        ),
      ),
    ];
    const tokens = new Set(boundaries.publicTokens ?? []);
    for (const root of roots) {
      privatePrefixes.push({ prefix: `--_${root}`, entry });
      for (const contract of entry.cssValueProps ?? []) {
        const [head] = contract.path.split('[].');
        const token = `--${root}-${kebab(head)}`;
        if (tokens.has(token))
          setOnce(typedTokens, token, { entry, path: contract.path });
      }
    }
  }
  privatePrefixes.sort((a, b) => b.prefix.length - a.prefix.length);
  return {
    classOwners,
    dataComponentOwners,
    tagOwners,
    privatePrefixes,
    typedTokens,
  };
}

/**
 * The cataloged components a selector list restyles: the rightmost compound
 * of each complex selector, or an unclassed descendant reached through a
 * cataloged anatomy class. `:has()` / `:not()` arguments are removed because
 * keying on or excluding a component does not style it. A subject that is a
 * `::part()` is left to the shadow-part rule (`KUI-L011`).
 * Returns `{ entry, via, name }` records; `isForeign(entry)` decides which
 * entries the stylesheet does not own.
 */
export function restyledComponents(
  selectorList,
  facts,
  isForeign,
  {
    componentMode = false,
    ownPackage,
    hooks = new Map(),
    composedChildren = new Map(),
  } = {},
) {
  const found = [];
  const seen = new Set();
  const add = (entry, via, name) => {
    if (!entry || !isForeign(entry)) return;
    const key = `${entry.key}|${via}|${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ entry, via, name });
  };
  for (const parts of complexSelectorParts(selectorList)) {
    const subject = parts.at(-1)?.compound;
    if (!subject || /::part\(/i.test(subject)) continue;
    const bare = withoutRelationalArguments(subject);
    const subjectClasses = classNames(bare);
    for (const className of classNames(bare))
      add(facts.classOwners.get(className), 'class', `.${className}`);
    for (const value of dataComponents(bare))
      add(
        facts.dataComponentOwners.get(value),
        'data-component',
        `[data-component="${value}"]`,
      );
    // An application class on the subject scopes a Web Awesome tag to the
    // application's own element; a component package never places one there.
    if (subjectClasses.some((name) => !facts.classOwners.has(name))) continue;
    for (const type of subjectTypes(subject) ?? [])
      add(facts.tagOwners.get(type), 'tag', type);
    // A raw descendant of a component's cataloged anatomy is still inside
    // that component. Do not infer ownership through its root, where an app
    // may place its own children, or through an app-named intermediate node.
    if (subjectClasses.length || parts.length < 2) continue;
    if (componentMode && parts.at(-1).combinator === '>') {
      const types = subjectTypes(subject) ?? [];
      for (const name of classNames(
        withoutRelationalArguments(parts.at(-2).compound),
      ))
        for (const type of types)
          add(
            composedChildren.get(`${name}|${type}`),
            'descendant',
            `.${name}`,
          );
    }
    for (let index = parts.length - 2; index >= 0; index -= 1) {
      const classes = classNames(
        withoutRelationalArguments(parts[index].compound),
      );
      const hook = componentMode
        ? classes.find((name) => hooks.has(name))
        : undefined;
      if (hook) {
        add(hooks.get(hook), 'descendant', `.${hook}`);
        break;
      }
      if (classes.some((name) => !facts.classOwners.has(name))) break;
      const anatomy = classes.find(
        (name) => name.includes('__') && facts.classOwners.has(name),
      );
      if (anatomy) {
        add(facts.classOwners.get(anatomy), 'descendant', `.${anatomy}`);
        break;
      }
      if (componentMode) {
        const root = classes.find((name) => facts.classOwners.has(name));
        if (root) {
          const entry = facts.classOwners.get(root);
          if (entry.package === ownPackage)
            add(entry, 'descendant', `.${root}`);
          break;
        }
      }
    }
  }
  return found;
}

/** Same-package classes used to key another component's selector. */
export function contextualComponents(
  selectorList,
  facts,
  isForeign,
  ownPackage,
) {
  const found = [];
  const seen = new Set();
  const selectorClasses = (text) => classNames(text.replace(/\[[^\]]*\]/g, ''));
  for (const parts of complexSelectorParts(selectorList)) {
    for (const [index, part] of parts.entries()) {
      const compound = part.compound;
      for (const name of selectorClasses(compound)) {
        const entry = facts.classOwners.get(name);
        if (!entry || entry.package !== ownPackage || !isForeign(entry))
          continue;
        const pseudo = ['has', 'is', 'where', 'not'].find((candidate) =>
          pseudoArguments(compound, candidate).some((argument) =>
            selectorClasses(argument).includes(name),
          ),
        );
        const position = pseudo
          ? pseudo
          : index === parts.length - 1
            ? 'subject'
            : ['+', '~'].includes(parts[index + 1].combinator)
              ? 'sibling'
              : 'ancestor';
        const key = `${entry.key}|${name}|${position}`;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push({
          entry,
          name: `.${name}`,
          position,
        });
      }
    }
  }
  return found;
}

/** The catalog entry whose private `--_<root>-*` variable `property` is. */
export function privateVariableOwner(property, facts) {
  if (!property.startsWith('--_')) return undefined;
  const owner = facts.privatePrefixes.find(
    ({ prefix }) => property === prefix || property.startsWith(`${prefix}-`),
  );
  if (owner) return owner.entry;
  return property.startsWith('--_kui-') ? null : undefined;
}

/** The typed prop that configures a component token, if one does. */
export function typedPropForToken(token, facts) {
  return facts.typedTokens.get(token);
}

/** Every configuration seam an entry publishes, as prose. */
export function configurationFor(entry) {
  if (!entry) return 'its documented props and variants';
  if (isWebAwesomeTagEntry(entry))
    return `<${entry.id}>'s documented attributes and ${entry.package}'s Web Awesome theme tokens`;
  const props = (entry.cssValueProps ?? []).map(({ path }) => `\`${path}\``);
  const rootClass = entry.boundaries?.rootClass;
  const tokens = (entry.boundaries?.publicTokens ?? []).filter(
    (token) => rootClass && token.startsWith(`--${rootClass}-`),
  );
  const seams = [
    ...(props.length ? [`its props (${props.join(', ')})`] : []),
    ...(tokens.length
      ? [
          `its public tokens (${tokens.map((item) => `\`${item}\``).join(', ')})`,
        ]
      : []),
  ];
  return seams.length
    ? `${seams.join(' or ')}, or its documented variants`
    : 'its documented props and variants';
}

/** The shared closing guidance: a missing seam is a component gap. */
export function reportGap(entry) {
  const owner = entry?.package ?? '@kerfjs/ui';
  return `If no configuration covers this need, report the component gap to ${owner} (open a feature request) instead of overriding it.`;
}

/** A component's short name: its export, or its Web Awesome tag. */
export function componentName(entry) {
  if (!entry) return 'a Kerf component';
  return isWebAwesomeTagEntry(entry) ? `<${entry.id}>` : entry.name;
}

/** A component's name with its catalog key. */
export function componentLabel(entry) {
  if (!entry) return 'a Kerf component';
  return isWebAwesomeTagEntry(entry)
    ? `<${entry.id}>`
    : `${entry.name} (${entry.key})`;
}
