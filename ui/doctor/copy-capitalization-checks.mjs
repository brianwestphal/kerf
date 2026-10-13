import { readFile } from 'node:fs/promises';
import { extname, relative } from 'node:path';

import ts from 'typescript';

import { isUiTraversalExcluded } from '../traversal-exclusions.mjs';

// KUI-D040: visible labels that Kerf UI's capitalization rule (docs/writing.md)
// gives title style — button titles, menu items, segment and pop-up choices,
// tab labels, field labels, list/group headers, and view/pane/dialog titles —
// checked against Apple's title-style rule. Only string literals passed to
// known title-style props are read, so prose, descriptions, placeholders,
// tooltips, checkbox/switch option text, status lines, and dynamic data are
// never judged. The check reports lowercase words title style capitalizes; it
// does not report capitalized short words, because Apple capitalizes a
// preposition of any length inside a phrasal verb ("Log In to the Server").

const scriptExtensions = new Set(['.tsx', '.jsx']);

// Apple Style Guide, "capitalization": articles, coordinating conjunctions,
// `to` in infinitives, `as`, and prepositions of four letters or fewer stay
// lowercase unless they are the first or last word or follow a colon.
// `via`, `per`, and `vs` are added as other short prepositions.
export const TITLE_STYLE_MINOR_WORDS = Object.freeze(
  new Set([
    'a',
    'an',
    'the',
    'and',
    'but',
    'or',
    'nor',
    'for',
    'yet',
    'so',
    'as',
    'at',
    'by',
    'from',
    'in',
    'into',
    'of',
    'off',
    'on',
    'onto',
    'out',
    'over',
    'to',
    'up',
    'with',
    'per',
    'via',
    'vs',
  ]),
);

// Apple keeps the second part of these compounds lowercase.
const lowercaseCompoundTails = new Set(['built-in', 'plug-in']);
const longestTitle = 12;

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);
const startsLowercase = (word) => /^\p{Ll}/u.test(word);

/** A token title style leaves alone: a number, code, path, URL, or an intentionally lowercase-led brand such as iOS or macOS. */
function exempt(core) {
  if (!/\p{L}/u.test(core)) return true;
  if (/\d/.test(core)) return true;
  if (/[./\\@_#=<>{}[\]|`~^*+]/.test(core)) return true;
  // Lowercase-led mixed case is a deliberate brand or identifier spelling.
  if (/^\p{Ll}[\p{L}'’-]*\p{Lu}/u.test(core)) return true;
  return false;
}

/** Split a word into leading punctuation, its letters, and trailing punctuation. */
function parts(token) {
  const match = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u.exec(token);
  return { lead: match[1], core: match[2], trail: match[3] };
}

/**
 * Check one visible label against Apple's title-style capitalization.
 *
 * Returns `null` when the text is title style, is a complete sentence (it
 * ends with `.`, `!`, or `?`, so sentence style applies), or is too long to
 * be a label. Otherwise returns the lowercase words to capitalize and the
 * repaired text.
 */
export function titleStyleViolation(text) {
  const value = String(text).trim();
  if (!value || /\n/.test(value)) return null;
  // A complete sentence takes sentence style and ending punctuation; an
  // ellipsis only marks a command that asks for more input.
  if (/(?<![.…])[.!?]["'”’)\]]*$/u.test(value)) return null;
  const tokens = value.split(/(\s+)/);
  const words = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.trim());
  if (!words.some(({ token }) => /\p{L}/u.test(token))) return null;
  if (words.length > longestTitle) return null;
  const flagged = [];
  let afterColon = false;
  for (const [position, { token, index }] of words.entries()) {
    const { lead, core, trail } = parts(token);
    const first = position === 0 || afterColon;
    const last = position === words.length - 1;
    afterColon = /:$/.test(trail);
    if (!core || exempt(core)) continue;
    const segments = core.split('-');
    const fixed = segments.map((segment, segmentIndex) => {
      if (!segment || !startsLowercase(segment)) return segment;
      if (segmentIndex === 0) {
        const minor = TITLE_STYLE_MINOR_WORDS.has(segment.toLowerCase());
        if (minor && !first && !last && segments.length === 1) return segment;
        return capitalize(segment);
      }
      // Second word of a hyphenated compound, except Built-in and Plug-in,
      // and except a single-letter prefix such as e-mail.
      if (lowercaseCompoundTails.has(core.toLowerCase())) return segment;
      if (segments[0].length === 1) return segment;
      return capitalize(segment);
    });
    const repaired = fixed.join('-');
    if (repaired !== core) {
      flagged.push(core);
      tokens[index] = `${lead}${repaired}${trail}`;
    }
  }
  if (!flagged.length) return null;
  return { words: flagged, suggestion: tokens.join('') };
}

// Component props whose string is a visible title-style label. `props` names
// a direct string prop; `entries` names an array prop whose object entries
// carry the label under one of `keys` (walked through nested arrays such as a
// PopupMenu `submenu`).
const titleStyleProps = new Map([
  ['ListHeader', { props: ['label'] }],
  ['ListActionRow', { props: ['label'] }],
  ['EmptyState', { props: ['title'] }],
  ['StateBanner', { props: ['title'] }],
  ['SplitButton', { props: ['label'] }],
  ['Combobox', { props: ['label'] }],
  ['NavStack', { props: ['backText'], entries: { views: ['title'] } }],
  ['SplitView', { props: ['backLabel'] }],
  ['PopupMenu', { props: ['text'], entries: { items: ['label'] } }],
  ['SegmentedControl', { entries: { choices: ['label'] } }],
  ['Select', { entries: { choices: ['label'] } }],
  ['TabNavigator', { entries: { tabs: ['label'] } }],
]);
const titleToolbarTextSizes = new Set(['xlarge', 'xlarge-fixed', 'large']);
const buttonTags = new Set(['button', 'wa-button']);
const titleSlots = new Set(['title', 'leading', 'header']);
const statusToolbarTextSizes = new Set(['small', 'xsmall']);

function tagName(node) {
  const name = node.tagName;
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isPropertyAccessExpression(name)) return name.name.text;
  return name.getText();
}

function attribute(element, name) {
  return element.attributes.properties.find(
    (item) =>
      ts.isJsxAttribute(item) &&
      ts.isIdentifier(item.name) &&
      item.name.text === name,
  );
}

function literalOf(node) {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node;
  if (ts.isJsxExpression(node)) return literalOf(node.expression);
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node))
    return literalOf(node.expression);
  return undefined;
}

function attributeValueNode(item) {
  if (!item?.initializer) return undefined;
  return ts.isJsxExpression(item.initializer)
    ? item.initializer.expression
    : item.initializer;
}

function textAttribute(element, name) {
  const value = attributeValueNode(attribute(element, name));
  return value
    ? ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)
      ? value.text
      : undefined
    : undefined;
}

/** Whether a ToolbarText renders a title rather than a status or count. */
function toolbarTextIsTitle(element) {
  if (attribute(element, 'headingLevel')) return true;
  if (titleToolbarTextSizes.has(textAttribute(element, 'size') ?? ''))
    return true;
  // `title`, `leading`, or `header` slot of a toolbar, pane, or panel: the
  // identity position a toolbar title occupies.
  let parent = element.parent;
  while (
    parent &&
    (ts.isParenthesizedExpression(parent) || ts.isJsxExpression(parent))
  )
    parent = parent.parent;
  if (
    !parent ||
    !(ts.isJsxAttribute(parent) || ts.isPropertyAssignment(parent)) ||
    !ts.isIdentifier(parent.name) ||
    !titleSlots.has(parent.name.text)
  )
    return false;
  // A small `leading` text in a footer or bottom bar is a status line.
  return !(
    parent.name.text === 'leading' &&
    statusToolbarTextSizes.has(textAttribute(element, 'size') ?? '')
  );
}

function constBindings(sourceFile) {
  const bindings = new Map();
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isVariableDeclarationList(node.parent) &&
      node.parent.flags & ts.NodeFlags.Const
    )
      bindings.set(node.name.text, node.initializer);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return bindings;
}

function unwrap(node, bindings, seen) {
  let current = node;
  while (current) {
    if (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isJsxExpression(current)
    ) {
      current = current.expression;
      continue;
    }
    if (
      ts.isIdentifier(current) &&
      bindings.has(current.text) &&
      !seen.has(current.text)
    ) {
      seen.add(current.text);
      current = bindings.get(current.text);
      continue;
    }
    return current;
  }
  return current;
}

/** Collect string literals stored under `keys` in an array of object literals, recursively. */
function entryLiterals(node, keys, bindings, seen = new Set(), found = []) {
  const value = unwrap(node, bindings, seen);
  if (!value) return found;
  if (ts.isArrayLiteralExpression(value)) {
    for (const element of value.elements)
      entryLiterals(
        ts.isSpreadElement(element) ? element.expression : element,
        keys,
        bindings,
        seen,
        found,
      );
    return found;
  }
  if (ts.isObjectLiteralExpression(value))
    for (const property of value.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const key =
        ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
          ? property.name.text
          : undefined;
      if (key && keys.includes(key)) {
        const literal = literalOf(property.initializer);
        if (literal) found.push(literal);
      } else if (key && key !== 'attributes')
        entryLiterals(property.initializer, keys, bindings, seen, found);
    }
  return found;
}

/** Visible title-style label literals rendered by one JSX/TSX source file. */
export function titleStyleLabels(fileName, source) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.TSX,
  );
  const bindings = constBindings(sourceFile);
  const labels = [];
  const add = (literal, owner) => labels.push({ literal, owner });
  const visit = (node) => {
    if (ts.isJsxElement(node)) {
      const name = tagName(node.openingElement);
      if (buttonTags.has(name) || name === 'FieldLabel') {
        const text = node.children
          .filter((child) => ts.isJsxText(child))
          .map((child) => child.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        const onlyText = node.children.every(
          (child) =>
            ts.isJsxText(child) ||
            (ts.isJsxSelfClosingElement(child) &&
              /Icon$/.test(tagName(child))) ||
            (ts.isJsxElement(child) &&
              /Icon$/.test(tagName(child.openingElement))),
        );
        if (text && onlyText)
          labels.push({
            literal: { text, node: node.children.find(ts.isJsxText) },
            owner: name === 'FieldLabel' ? 'FieldLabel' : `<${name}> text`,
          });
      }
    }
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const name = tagName(node);
      if (name === 'ToolbarText' && toolbarTextIsTitle(node)) {
        const literal = literalOf(attributeValueNode(attribute(node, 'text')));
        if (literal) add(literal, 'ToolbarText text');
      }
      const config = titleStyleProps.get(name);
      if (config) {
        for (const prop of config.props ?? []) {
          const literal = literalOf(attributeValueNode(attribute(node, prop)));
          if (literal) add(literal, `${name} ${prop}`);
        }
        for (const [prop, keys] of Object.entries(config.entries ?? {})) {
          const value = attributeValueNode(attribute(node, prop));
          if (value)
            for (const literal of entryLiterals(value, keys, bindings))
              add(literal, `${name} ${prop}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return labels.map(({ literal, owner }) => {
    const node = literal.node ?? literal;
    const start = node.getStart(sourceFile);
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
    return {
      text: literal.text,
      owner,
      line: line + 1,
      column: character + 1,
    };
  });
}

const testModule =
  /(?:^|\/)(?:__tests__\/|[^/]*\.(?:test|spec)\.[cm]?[jt]sx?$)/;

export async function checkCopyCapitalization(
  packageRoot,
  inputs,
  selectedPaths,
) {
  const diagnostics = [];
  for (const file of inputs) {
    if (!scriptExtensions.has(extname(file))) continue;
    if (isUiTraversalExcluded(packageRoot, file)) continue;
    const path = relative(packageRoot, file).replaceAll('\\', '/');
    if (testModule.test(path)) continue;
    if (selectedPaths?.length && !selectedPaths.includes(path)) continue;
    const source = await readFile(file, 'utf8');
    for (const label of titleStyleLabels(file, source)) {
      const violation = titleStyleViolation(label.text);
      if (!violation) continue;
      diagnostics.push({
        id: 'KUI-D040',
        severity: 'warning',
        stage: 'analyzer',
        message: `${label.owner} "${label.text}" is not title-style capitalized (${violation.words.map((word) => `"${word}"`).join(', ')}).`,
        location: { file: path, line: label.line, column: label.column },
        action: `Use "${violation.suggestion}": capitalize every word except articles, coordinating conjunctions, and prepositions of four letters or fewer, and always capitalize the first and last word. A complete sentence ends with punctuation and stays sentence style. Suppress KUI-D040 for a lowercase brand or product name.`,
        documentation: '@kerfjs/ui/docs/writing.md#capitalization',
        meaning: 'Visible label is not title-style capitalized',
      });
    }
  }
  return diagnostics;
}
