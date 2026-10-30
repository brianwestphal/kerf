// Preview inputs for a document's params, so the canvas renders a document
// whose params have no defaults. Values are placeholders, never saved.
import type { ViewDocument, ViewType } from '@kerfjs/ui/view';

const words = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (first) => first.toUpperCase());

/** A placeholder value of a declared type; `content` takes `content(name)`. */
export function sampleValue(
  type: ViewType,
  name: string,
  content: (label: string) => unknown,
  index = 0,
  /** A prop-typed param's stand-in, by `<component key>.<prop>` (KF-H3CB2P). */
  placeholder: (key: string) => unknown = () => undefined,
): unknown {
  switch (type.kind) {
    case 'prop': {
      return placeholder(`${type.component}.${type.prop}`);
    }
    case 'string':
      return index ? `${words(name)} ${index + 1}` : words(name);
    case 'number':
      return index + 1;
    case 'boolean':
      return false;
    case 'enum':
      return type.values?.[0];
    case 'literal':
      return type.value;
    case 'content':
      return content(words(name));
    case 'array':
      return [0, 1, 2].map((item) =>
        sampleValue(type.items!, name, content, item),
      );
    case 'object':
      return Object.fromEntries(
        (type.props ?? []).map((prop) => [
          prop.name,
          sampleValue(prop.type, prop.name, content, index),
        ]),
      );
    default:
      return undefined;
  }
}

/** Inputs for every param without a default. */
export function sampleInputs(
  document: ViewDocument,
  content: (label: string) => unknown,
  /** A prop-typed param's stand-in, by `<component key>.<prop>` (KF-H3CB2P). */
  placeholder?: (key: string) => unknown,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(document.params ?? {})
      .filter(([, param]) => !('default' in param))
      .map(([name, param]) => [
        name,
        sampleValue(param.type, name, content, 0, placeholder),
      ])
      // An app-supplied value with no stand-in is left out, as the
      // application may leave an optional one out.
      .filter(([, value]) => value !== undefined),
  );
}
