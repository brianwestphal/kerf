/**
 * When you call `delegate()` or `delegateCapture()` with a string-literal
 * selector that matches an `[name="value"]` shape, recommend `attr()`'s
 * `.selector`. Pairs JSX (`{...ACTIONS.x.attrs}`) and the delegate target
 * (`ACTIONS.x.selector`) under one typed source of truth so a rename of the
 * action key can't desync the two.
 *
 * Conservative on purpose: only flags the *exact* attribute-equals shape
 * (`[data-action="save"]`, `[role="dialog"]`). Compound selectors,
 * tag-qualified selectors, and class/id selectors are left alone — those
 * are the cases `attr()` doesn't directly replace.
 */

const meta = {
  type: 'suggestion',
  docs: {
    description:
      "Prefer `attr('name', 'value').selector` over a literal `[name=\"value\"]` selector when calling `delegate()` / `delegateCapture()`.",
    url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/prefer-attr-selector.md',
  },
  schema: [],
  messages: {
    preferAttr:
      "Selector `[{{name}}=\"{{value}}\"]` is a literal string. Define `attr('{{name}}', '{{value}}')` once and pass its `.selector` here — JSX can then spread `.attrs` to stay in sync on rename. See kerf docs §5.4 (attr() helper).",
  },
};

const DELEGATE_FNS = new Set(['delegate', 'delegateCapture']);

// Matches a simple attribute-equals selector: leading `[`, name, `=`, quoted
// value, trailing `]`. Anchored to the full string so compound selectors
// (`[data-action="x"][data-id="y"]`) and qualified selectors
// (`button[data-action="x"]`) do NOT match — those aren't a 1:1 attr() swap.
const ATTR_EQUALS_RE = /^\[([a-zA-Z][\w-]*)=(['"])([^'"]*)\2\]$/;

function create(context) {
  return {
    CallExpression(node) {
      const callee = node.callee;
      if (!callee || callee.type !== 'Identifier') return;
      if (!DELEGATE_FNS.has(callee.name)) return;

      // `delegate(root, type, selector, fn)` — selector is the 3rd arg.
      const selectorArg = node.arguments[2];
      if (!selectorArg || selectorArg.type !== 'Literal') return;
      if (typeof selectorArg.value !== 'string') return;

      const m = ATTR_EQUALS_RE.exec(selectorArg.value);
      if (!m) return;

      context.report({
        node: selectorArg,
        messageId: 'preferAttr',
        data: { name: m[1], value: m[3] },
      });
    },
  };
}

export default { meta, create };
