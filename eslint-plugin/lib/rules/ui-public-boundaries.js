import {
  importRegistry,
  isExcepted,
  jsxKey,
  loadUiContract,
  UI_CONTRACT_LOAD_CODE,
  UI_RULE_SCHEMA,
} from '../ui-contract.js';

const CLASS_CODE = 'KUI-L101';
const TOKEN_CODE = 'KUI-L102';
const PLACEMENT_CODE = 'KUI-L103';

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Restrict Kerf UI classes and tokens to cataloged public boundaries.',
      url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/ui-public-boundaries.md',
    },
    schema: UI_RULE_SCHEMA,
    messages: {
      config: `${UI_CONTRACT_LOAD_CODE}: Kerf UI catalog/profile could not be loaded: {{error}}`,
      class:
        'KUI-L101: `{{name}}` is private or uncataloged Kerf UI anatomy. Use a cataloged public class, prop, token, or component instead.',
      token:
        'KUI-L102: `{{name}}` is not a cataloged public Kerf UI token. Use a public semantic/component token.',
      component:
        "KUI-L103: `{{name}}` is {{component}}'s rendered anatomy, not a class to place on your own element. Render {{render}} and configure it through its props; components own their styles.",
      componentRoot:
        'KUI-L103: a plain `<{{element}}>` carrying `{{name}}` is exactly what {{component}} renders. Render {{render}} instead; the class stays placeable only on another carrier element (such as a `<ul>` or a `<footer>`).',
    },
  },
  create(context) {
    const contract = loadUiContract(context);
    const filename = context.filename ?? context.getFilename();
    let configured = false;
    let registry;
    // A cataloged component's anatomy class on an element the application
    // writes recreates the component by class instead of rendering it. The
    // component's own element (`<Toolbar className="kui-toolbar">`) is exempt.
    // A placeable class whose entry names a `rootElement` is reported only on
    // a plain element of that tag (`<div class="kui-content-item">` is
    // ContentItem); another carrier element keeps it.
    const inspectPlacement = (node, names) => {
      if (isExcepted(contract, PLACEMENT_CODE, filename)) return;
      const element = node.parent;
      const opening = element?.type === 'JSXOpeningElement';
      const renderedKey =
        registry && opening
          ? jsxKey(element.name, registry, contract)
          : undefined;
      const intrinsicTag =
        opening && element.name.type === 'JSXIdentifier'
          ? element.name.name
          : undefined;
      for (const name of names) {
        const owner = contract.componentClasses?.get(name);
        if (!owner || owner.key === renderedKey) continue;
        if (owner.element && owner.element !== intrinsicTag) continue;
        context.report({
          node,
          messageId: owner.element ? 'componentRoot' : 'component',
          data: {
            name,
            element: owner.element,
            component: owner.render.join(' / '),
            render: owner.render.map((item) => `\`${item}\``).join(' or '),
          },
        });
      }
    };
    const inspect = (node, value, classContext = false, tokens = true) => {
      if (typeof value !== 'string') return;
      const names = classContext ? value.split(/\s+/).filter(Boolean) : [];
      if (classContext && !isExcepted(contract, CLASS_CODE, filename))
        for (const name of names)
          if (name.startsWith('kui-') && !contract.publicClasses.has(name))
            context.report({ node, messageId: 'class', data: { name } });
      // Placement covers every cataloged class, not only `kui-*`: a declared
      // component package's anatomy (`acme-meter`) is checked the same way.
      if (classContext) inspectPlacement(node, names);
      if (tokens && !isExcepted(contract, TOKEN_CODE, filename))
        for (const match of value.matchAll(/--kui-[a-z0-9-]+/g))
          if (!contract.publicTokens.has(match[0]))
            context.report({
              node,
              messageId: 'token',
              data: { name: match[0] },
            });
    };
    return {
      Program(node) {
        if (contract.error && !configured) {
          configured = true;
          context.report({
            node,
            messageId: 'config',
            data: { error: contract.error },
          });
        }
        if (!contract.error)
          registry = importRegistry(node, contract, filename);
      },
      JSXAttribute(node) {
        if (contract.error || !['class', 'className'].includes(node.name?.name))
          return;
        if (node.value?.type === 'Literal')
          inspect(node, node.value.value, true);
        if (
          node.value?.type === 'JSXExpressionContainer' &&
          node.value.expression.type === 'Literal'
        )
          inspect(node, node.value.expression.value, true);
        // A template literal's static, whitespace-delimited class names
        // (`class={`kui-content-item ${extra}`}`); a name an interpolation
        // completes (`kui-toolbar-${size}`) is not known and is skipped.
        if (
          node.value?.type === 'JSXExpressionContainer' &&
          node.value.expression.type === 'TemplateLiteral'
        )
          inspect(
            node,
            node.value.expression.quasis
              .map((quasi) => quasi.value.cooked ?? quasi.value.raw)
              .join('\0')
              .split(/\s+/)
              .filter((name) => name && !name.includes('\0'))
              .join(' '),
            true,
            // Its tokens are inspected once, by TemplateElement below.
            false,
          );
      },
      Literal(node) {
        if (!contract.error) inspect(node, node.value, false);
      },
      TemplateElement(node) {
        if (!contract.error) inspect(node, node.value.raw, false);
      },
    };
  },
};
