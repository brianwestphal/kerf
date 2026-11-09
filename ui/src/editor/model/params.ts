// Document-level param edits. The validator is the authority for declared
// types, defaults, and whether a changed type still fits every binding.
import {
  validateView,
  type ViewCatalog,
  type ViewDocument,
  type ViewType,
} from '@kerfjs/ui/view';

type Param = NonNullable<ViewDocument['params']>[string];
type Result = { document: ViewDocument } | { error: string };

const CAMEL = /^[a-z][A-Za-z0-9]*$/;

/** Refuse a change only for diagnostics it introduces. */
export function checkedParamEdit(
  document: ViewDocument,
  next: ViewDocument,
  catalog: ViewCatalog,
): Result {
  const before = new Set(
    validateView(document, catalog).diagnostics.map(
      ({ code, path, message }) => `${code}:${path}:${message}`,
    ),
  );
  const added = validateView(next, catalog).diagnostics.find(
    ({ code, path, message }) => !before.has(`${code}:${path}:${message}`),
  );
  return added ? { error: added.message } : { document: next };
}

/** Creates a required input with a declared type and no default. */
export function createParam(
  document: ViewDocument,
  catalog: ViewCatalog,
  name: string,
  type: ViewType,
): Result {
  if (!CAMEL.test(name))
    return { error: 'A param name is a camelCase identifier.' };
  if (Object.hasOwn(document.params ?? {}, name))
    return { error: `There is already a param named ${name}.` };
  return checkedParamEdit(
    document,
    { ...document, params: { ...document.params, [name]: { type } } },
    catalog,
  );
}

/** Replaces one param definition, preserving its position in the document. */
export function changeParam(
  document: ViewDocument,
  catalog: ViewCatalog,
  name: string,
  param: Param,
): Result {
  if (!Object.hasOwn(document.params ?? {}, name))
    return { error: `No param ${name}.` };
  return checkedParamEdit(
    document,
    { ...document, params: { ...document.params, [name]: param } },
    catalog,
  );
}

/** Whether a tree expression reads the param, directly or through a path. */
export function paramIsReferenced(
  document: ViewDocument,
  name: string,
): boolean {
  const reads = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(reads);
    if (value === null || typeof value !== 'object') return false;
    const record = value as Record<string, unknown>;
    if (record.$param === name) return true;
    if (typeof record.$bind === 'string' && record.$bind.split('.')[0] === name)
      return true;
    return Object.values(record).some(reads);
  };
  return reads(document.root);
}

/** Removes an unused param; a reference must be changed first. */
export function removeParam(
  document: ViewDocument,
  catalog: ViewCatalog,
  name: string,
): Result {
  if (!Object.hasOwn(document.params ?? {}, name))
    return { error: `No param ${name}.` };
  if (paramIsReferenced(document, name))
    return {
      error: `Param ${name} is used in this view. Remove its bindings first.`,
    };
  const params = Object.fromEntries(
    Object.entries(document.params ?? {}).filter(([key]) => key !== name),
  );
  return checkedParamEdit(
    document,
    {
      ...document,
      ...(Object.keys(params).length ? { params } : { params: undefined }),
    },
    catalog,
  );
}
