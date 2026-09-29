import {
  importRegistry,
  isExcepted,
  jsxKey,
  loadUiContract,
  UI_CONTRACT_LOAD_CODE,
  UI_RULE_SCHEMA,
} from '../ui-contract.js';
import {
  htmlTemplateClassAttributes,
  staticClassNames,
} from '../html-template-classes.js';

const CLASS_CODE = 'KUI-L101';
const TOKEN_CODE = 'KUI-L102';
const PLACEMENT_CODE = 'KUI-L103';

const HTML_SOURCE = 'kerfjs/html';

// The `html` tag imported from `kerfjs/html`, by name or through a namespace.
function isHtmlTag(tag, registry) {
  if (tag.type === 'Identifier') {
    const helper = registry.helpers.get(tag.name);
    return helper?.imported === 'html' && helper.source === HTML_SOURCE;
  }
  return (
    tag.type === 'MemberExpression' &&
    !tag.computed &&
    tag.object.type === 'Identifier' &&
    tag.property.type === 'Identifier' &&
    tag.property.name === 'html' &&
    registry.namespaces.get(tag.object.name) === HTML_SOURCE
  );
}

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
    // `element` is the JSX opening element (or `{ tag }` for markup a
    // `kerfjs/html` template writes) that carries the class.
    const inspectPlacement = (node, names, element) => {
      if (isExcepted(contract, PLACEMENT_CODE, filename)) return;
      const opening = element?.type === 'JSXOpeningElement';
      const renderedKey =
        registry && opening
          ? jsxKey(element.name, registry, contract)
          : undefined;
      const intrinsicTag = opening
        ? element.name.type === 'JSXIdentifier'
          ? element.name.name
          : undefined
        : element?.tag;
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
    const inspect = (
      node,
      value,
      classContext = false,
      tokens = true,
      element = node.parent,
    ) => {
      if (typeof value !== 'string') return;
      const names = classContext ? value.split(/\s+/).filter(Boolean) : [];
      if (classContext && !isExcepted(contract, CLASS_CODE, filename))
        for (const name of names)
          if (name.startsWith('kui-') && !contract.publicClasses.has(name))
            context.report({ node, messageId: 'class', data: { name } });
      // Placement covers every cataloged class, not only `kui-*`: a declared
      // component package's anatomy (`acme-meter`) is checked the same way.
      if (classContext) inspectPlacement(node, names, element);
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
            staticClassNames(
              node.value.expression.quasis
                .map((quasi) => quasi.value.cooked ?? quasi.value.raw)
                .join('\0'),
            ).join(' '),
            true,
            // Its tokens are inspected once, by TemplateElement below.
            false,
          );
      },
      // `kerfjs/html` tagged templates write the same markup without JSX:
      // their static `class` attributes are inspected like JSX `class`
      // values, on the plain element that carries them. Tokens are left to
      // TemplateElement below.
      TaggedTemplateExpression(node) {
        if (contract.error || !registry || !isHtmlTag(node.tag, registry))
          return;
        const { quasis } = node.quasi;
        for (const { quasi, tag, value } of htmlTemplateClassAttributes(
          quasis.map((item) => item.value.cooked ?? item.value.raw),
        ))
          inspect(
            quasis[quasi],
            staticClassNames(value).join(' '),
            true,
            false,
            { tag },
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
