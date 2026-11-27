// Ordered JSX attributes. A spread can override either option until a later
// literal settles it. null means the value cannot be recovered statically.
function choiceMode(attributes) {
  let multiple = false;
  let overflow = 'wrap';
  for (const [name, value] of attributes) {
    if (name === '...') {
      multiple = null;
      overflow = null;
    }
    if (name === 'multiple') multiple = value;
    if (name === 'overflow') overflow = value;
  }
  const mode =
    multiple === null
      ? 'unknown'
      : multiple === true
        ? 'listbox'
        : multiple === 'toggle'
          ? 'checkboxes'
          : 'radios';
  const required =
    mode === 'listbox' || overflow === 'scroll'
      ? true
      : mode === 'unknown' || overflow === null
        ? null
        : false;
  return { mode, required };
}

function tsAttributes(ts, opening) {
  return opening.attributes.properties.map((prop) => {
    if (ts.isJsxSpreadAttribute(prop)) return ['...', null];
    const name = prop.name.getText();
    if (!prop.initializer) return [name, true];
    let value = prop.initializer;
    if (ts.isJsxExpression(value)) value = value.expression;
    if (value && ts.isStringLiteral(value)) return [name, value.text];
    if (value?.kind === ts.SyntaxKind.TrueKeyword) return [name, true];
    if (value?.kind === ts.SyntaxKind.FalseKeyword) return [name, false];
    return [name, null];
  });
}

// ESLint's cross-file pass has source text only. Parse JSX syntax rather
// than guessing where a JSX opening ends around nested expressions.
function jsxUses(source, name, matchesAttributes) {
  const ts = require('typescript');
  const file = ts.createSourceFile(
    'use.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const visit = (node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(file) === name &&
      matchesAttributes(tsAttributes(ts, node))
    )
      return true;
    return ts.forEachChild(node, visit);
  };
  return Boolean(visit(file));
}

function choiceUses(source, name) {
  return jsxUses(
    source,
    name,
    (attributes) => choiceMode(attributes).required !== false,
  );
}

module.exports = { choiceMode, tsAttributes, choiceUses, jsxUses };
