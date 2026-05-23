/**
 * `delegate()` and `delegateCapture()` return a `() => void` disposer that
 * removes the underlying root listener. Discarding the return value is only
 * safe when the registration is genuinely page-lifetime (root never torn down,
 * handler closure references no reclaimable state). In every other case —
 * modal mounts, route views, mount swaps, dynamic widgets — discarding the
 * disposer leaks the listener AND every store / signal / app object the
 * handler closes over, and re-mount cycles stack listeners linearly.
 *
 * This rule flags the bare-statement form (`delegate(...);`) where the
 * disposer is silently discarded. Accept any non-statement parent: assignment,
 * return, array push, argument to another call, member expression, etc. — all
 * of those carry the disposer somewhere a future scope can call it.
 *
 * Explicit-discard escape hatch: `void delegate(...)`. That signals "I know
 * this is page-lifetime and I'm intentionally not capturing." Standard
 * `eslint-disable-next-line` works too.
 *
 * Matched by callee name (`delegate` / `delegateCapture`) — consistent with
 * the other kerfjs rules. False positives on an unrelated local `delegate()`
 * function exist in principle; suppress with the standard mechanism.
 */

const meta = {
  type: 'problem',
  docs: {
    description:
      'Require capturing the disposer returned by `delegate()` / `delegateCapture()`. Discarding the return value leaks the listener and everything the handler closes over.',
    url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/require-delegate-disposer.md',
  },
  schema: [],
  messages: {
    requireDisposer:
      "`{{fn}}()` returns a `() => void` disposer that must be captured and called when the delegate's scope ends. Discarding it leaks the listener (and every store/signal the handler closes over) and stacks listeners on re-mount. Assign it (`const off = {{fn}}(...)`), return it, or push it into a disposer array. If the registration is genuinely page-lifetime (root is `document.body` or equivalent, never torn down), opt out with `void {{fn}}(...)` or `eslint-disable-next-line kerfjs/require-delegate-disposer`. See kerf docs §5.3.",
  },
};

const DELEGATE_FNS = new Set(['delegate', 'delegateCapture']);

function create(context) {
  return {
    CallExpression(node) {
      const callee = node.callee;
      if (!callee || callee.type !== 'Identifier') return;
      if (!DELEGATE_FNS.has(callee.name)) return;

      // Walk up through any wrappers that don't actually consume the value.
      // The only case we need to handle specially is `void delegate(...)` —
      // an explicit discard sigil that opts out of the rule. Every other
      // parent shape (VariableDeclarator, ReturnStatement, ArrayExpression,
      // Property, CallExpression argument, MemberExpression, etc.) means
      // the disposer is being routed somewhere reachable — accept.
      const parent = node.parent;
      if (!parent) return;
      if (parent.type === 'UnaryExpression' && parent.operator === 'void') return;
      if (parent.type !== 'ExpressionStatement') return;

      context.report({
        node,
        messageId: 'requireDisposer',
        data: { fn: callee.name },
      });
    },
  };
}

export default { meta, create };
