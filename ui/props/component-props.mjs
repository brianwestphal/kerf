// Structured per-component prop schema (ui/ai/component-props.json): reads
// the published component types with the TypeScript JS API and projects each
// component's props into a small JSON type grammar that editors, validators,
// and generated view contracts can consume without parsing TypeScript.
import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import ts from 'typescript';

export const COMPONENT_PROPS_SCHEMA_ID = 'kerf-ui-component-props/v1';

// Type aliases that render application content rather than a configured value.
const CONTENT_ALIASES = new Set([
  'SafeHtml',
  'KerfUiContent',
  'JSXChildren',
  'JSXChild',
]);
// css-values brands and token unions; each is authored through a builder or
// a token name, never a raw string (docs/22-ui-css-authoring.md).
const CSS_VALUE_ALIAS =
  /^(Css[A-Z]\w*|Ui(Color|ForegroundColor|Gap|GapValue|SpaceName|ColorName|ForegroundColorName))$/;
// Anonymous object literals inline up to this depth; named ones become
// shared definitions, so recursion and repetition stay bounded.
const MAX_INLINE_DEPTH = 3;
const PRINT_FLAGS =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;

/** Creates a TypeScript program over declaration files. */
export function createDeclarationProgram(files, options = {}) {
  return ts.createProgram(files, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
    types: [],
    ...options,
    noEmit: true,
  });
}

/**
 * Compiler options from a package's own tsconfig.json (JSX settings, paths),
 * for reading component source files; empty when it has none.
 */
function packageCompilerOptions(root) {
  const configPath = ts.findConfigFile(
    root,
    ts.sys.fileExists,
    'tsconfig.json',
  );
  if (!configPath || !configPath.startsWith(root)) return {};
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: () => undefined,
    },
  );
  return parsed?.options ?? {};
}

/** A root-relative ESM import for a source file (`src/x.tsx` → `./src/x.js`). */
function sourceImport(root, file) {
  const path = relative(root, file).split(sep).join('/');
  return `./${path.replace(/\.(?:tsx?|jsx?|mts|cts)$/, '.js')}`;
}

/**
 * Extraction state for one program: the checker, the shared `definitions`
 * table, and the directory whose declarations count as the package's own
 * (props declared elsewhere are inherited native attributes).
 */
export function createPropsContext(checker, ownDirectory) {
  return {
    checker,
    ownDirectory: ownDirectory.endsWith(sep)
      ? ownDirectory
      : ownDirectory + sep,
    definitions: new Map(),
    definitionNames: new Map(),
  };
}

// The printer can overflow the stack on a recursive alias (JSX child trees)
// when truncation is off; fall back to the truncating printer for those.
function printType(checker, type) {
  try {
    return checker.typeToString(type, undefined, PRINT_FLAGS);
  } catch {
    return checker.typeToString(type);
  }
}

function documentation(checker, symbol) {
  if (!symbol) return '';
  return ts
    .displayPartsToString(symbol.getDocumentationComment(checker))
    .trim();
}

function jsDocTag(symbol, name) {
  const tag = symbol?.getJsDocTags().find((item) => item.name === name);
  if (!tag) return undefined;
  return ts.displayPartsToString(tag.text ?? []).trim();
}

/** Literal value a single-literal type carries, or undefined. */
function literalOf(type) {
  if (type.isStringLiteral() || type.isNumberLiteral()) return type.value;
  if (type.flags & ts.TypeFlags.BooleanLiteral) {
    return type.intrinsicName === 'true';
  }
  return undefined;
}

const isNullish = (type) =>
  (type.flags &
    (ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void)) !==
  0;

const membersOf = (type) => (type.isUnion() ? type.types : [type]);

const isObjectLike = (type) =>
  (type.flags & ts.TypeFlags.Object) !== 0 || type.isIntersection();

// TypeScript's own utility types say nothing about the shape they produce,
// so a type named by one stays anonymous (inlined, not a definition).
const UTILITY_NAMES = new Set([
  'Readonly',
  'ReadonlyArray',
  'Record',
  'Partial',
  'Required',
  'Pick',
  'Omit',
  'Exclude',
  'Extract',
  'NonNullable',
]);
const SIGNAL_NAMES = new Set(['Signal', 'ReadonlySignal']);

/** A user-facing name for an object or union type, or undefined. */
function nameOf(type) {
  const alias = type.aliasSymbol?.getName();
  if (alias && !UTILITY_NAMES.has(alias)) return alias;
  const symbol = type.getSymbol()?.getName();
  return symbol && !symbol.startsWith('__') && !UTILITY_NAMES.has(symbol)
    ? symbol
    : undefined;
}

const isSafeHtml = (type) => type.getSymbol()?.getName() === 'SafeHtml';
const isPrimitive = (type) =>
  (type.flags &
    (ts.TypeFlags.StringLike |
      ts.TypeFlags.NumberLike |
      ts.TypeFlags.BooleanLike)) !==
  0;

// Content that also takes a plain string or number (ButtonLabel, TextContent)
// says so; bare `KerfUiContent` rejects arbitrary text (docs/21's compile-time
// contracts), so a document must give it markup instead.
const TEXT_FLAGS = ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike;
function contentOf(members, text) {
  return members.some((member) => member.flags & TEXT_FLAGS)
    ? { kind: 'content', acceptsText: true, text }
    : { kind: 'content', text };
}

/**
 * Text, numbers, rendered markup, or lists of them: application content for
 * a slot.
 */
function isContentUnion(checker, members) {
  return (
    members.some(isSafeHtml) &&
    members.every(
      (member) =>
        isSafeHtml(member) ||
        isPrimitive(member) ||
        checker.isArrayType(member),
    )
  );
}

/**
 * Registers a named type in the shared table and returns a reference to it.
 * Two different types that share a name get distinct `Name`, `Name#2` keys.
 */
function reference(ctx, type, name, text, build) {
  let key = ctx.definitionNames.get(type);
  if (!key) {
    key = name;
    for (let index = 2; ctx.definitions.has(key); index += 1) {
      key = `${name}#${index}`;
    }
    ctx.definitionNames.set(type, key);
    ctx.definitions.set(key, { kind: 'pending', text });
    ctx.definitions.set(key, { ...build(), text });
  }
  return { kind: 'ref', ref: key, text };
}

/**
 * Describes a type in the component-props type grammar. Every descriptor
 * carries the printed TypeScript `text`; `kind` narrows it for tooling.
 */
export function describeType(ctx, type, depth = 0) {
  const text = printType(ctx.checker, type);
  const all = membersOf(type);
  const members = all.filter((member) => !isNullish(member));
  const nullable = members.length !== all.length;
  const described = describeNonNull(ctx, type, members, text, depth);
  return nullable ? { ...described, nullable: true } : described;
}

function describeNonNull(ctx, type, members, text, depth) {
  if (members.length === 0) return { kind: 'never', text };
  const named = type.aliasSymbol?.getName();
  if (named && CONTENT_ALIASES.has(named)) return contentOf(members, text);
  if (named && CSS_VALUE_ALIAS.test(named)) {
    return { kind: 'css-value', grammar: named, text };
  }
  if (isContentUnion(ctx.checker, members)) return contentOf(members, text);
  if (members.length === 1) return describeSingle(ctx, members[0], depth);

  const literals = members.map(literalOf);
  if (literals.every((value) => typeof value === 'boolean')) {
    return { kind: 'boolean', text };
  }
  if (literals.every((value) => value !== undefined)) {
    const declared = type.aliasSymbol?.declarations?.[0];
    return {
      kind: 'enum',
      values: inDeclaredOrder(
        ctx.checker,
        literals,
        declared && 'type' in declared ? declared.type : undefined,
      ),
      text,
    };
  }
  const build = () => {
    // `true` | `false` print as separate members; fold them back into boolean.
    const folded = [];
    let sawBoolean = false;
    for (const member of members) {
      if (member.flags & ts.TypeFlags.BooleanLiteral) {
        if (!sawBoolean) folded.push({ kind: 'boolean', text: 'boolean' });
        sawBoolean = true;
        continue;
      }
      folded.push(describeType(ctx, member, depth + 1));
    }
    const union = { kind: 'union', members: folded };
    const discriminant = discriminantOf(ctx.checker, members);
    if (discriminant) union.discriminant = discriminant;
    return union;
  };
  if (named && members.some(isObjectLike)) {
    return reference(ctx, type, named, text, build);
  }
  return { ...build(), text };
}

function describeSingle(ctx, type, depth) {
  const { checker } = ctx;
  const text = printType(checker, type);
  const name = nameOf(type);
  if (name && CONTENT_ALIASES.has(name)) return { kind: 'content', text };
  if (name && SIGNAL_NAMES.has(name)) return { kind: 'signal', text };
  if (name && CSS_VALUE_ALIAS.test(name)) {
    return { kind: 'css-value', grammar: name, text };
  }
  const literal = literalOf(type);
  if (literal !== undefined) return { kind: 'literal', value: literal, text };
  // `NoInfer<T>` is a substitution type; describe what it wraps.
  if (type.flags & ts.TypeFlags.Substitution && type.baseType) {
    return { ...describeType(ctx, type.baseType, depth), text };
  }
  if (type.flags & ts.TypeFlags.TypeParameter) {
    const constraint = type.getConstraint();
    const described = constraint
      ? describeType(ctx, constraint, depth)
      : { kind: 'unknown' };
    return { ...described, typeParameter: type.getSymbol()?.getName(), text };
  }
  if (type.flags & ts.TypeFlags.StringLike) return { kind: 'string', text };
  if (type.flags & ts.TypeFlags.NumberLike) return { kind: 'number', text };
  if (type.flags & ts.TypeFlags.BooleanLike) return { kind: 'boolean', text };
  if (type.flags & ts.TypeFlags.Never) return { kind: 'never', text };
  if (type.getCallSignatures().length > 0) return { kind: 'function', text };
  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    const [item] = checker.getTypeArguments(type);
    return {
      kind: 'array',
      items: item ? describeType(ctx, item, depth + 1) : { kind: 'unknown' },
      text,
    };
  }
  if (isObjectLike(type)) {
    if (/^(HTML\w*Element|Element|Node)$/.test(name ?? '')) {
      return { kind: 'element', text };
    }
    if (
      checker.getIndexInfosOfType(type).length > 0 &&
      checker.getPropertiesOfType(type).length === 0
    ) {
      return { kind: 'record', text };
    }
    const build = () => {
      const object = {
        kind: 'object',
        props: describeProps(ctx, type, depth + 1).props,
      };
      const index = indexOf(ctx, type, depth);
      if (index) object.index = index;
      return object;
    };
    if (name) return reference(ctx, type, name, text, build);
    if (depth >= MAX_INLINE_DEPTH) return { kind: 'object', text };
    return { ...build(), text };
  }
  return { kind: 'unknown', text };
}

/**
 * An object's string index signature (`Record<\`data-${string}\`, string>`
 * behind `rootAttributes`), as the key prefix it allows and its value type.
 * Returns undefined when the object has none.
 */
function indexOf(ctx, type, depth) {
  const info = ctx.checker
    .getIndexInfosOfType(type)
    .find(
      (item) =>
        item.keyType.flags &
        (ts.TypeFlags.String | ts.TypeFlags.TemplateLiteral),
    );
  if (!info) return undefined;
  const prefix =
    info.keyType.flags & ts.TypeFlags.TemplateLiteral
      ? info.keyType.texts[0]
      : '';
  return { keyPrefix: prefix, value: describeType(ctx, info.type, depth + 1) };
}

/**
 * The props that distinguish union members: present in every member, each a
 * single literal, and not all equal. Returns their names, or undefined.
 */
function discriminantOf(checker, members) {
  if (members.length < 2 || !members.every(isObjectLike)) return undefined;
  const names = checker
    .getPropertiesOfType(members[0])
    .map((symbol) => symbol.getName())
    .filter((name) => {
      const values = members.map((member) => {
        const property = member.getProperty(name);
        if (!property) return undefined;
        const typed = membersOf(checker.getTypeOfSymbol(property)).filter(
          (item) => !isNullish(item),
        );
        return typed.length === 1 ? literalOf(typed[0]) : undefined;
      });
      return (
        values.every((value) => value !== undefined) && new Set(values).size > 1
      );
    });
  return names.length > 0 ? names : undefined;
}

/** Literal values a type node spells out, in source order (aliases followed). */
function declaredLiterals(checker, node, seen = new Set()) {
  if (!node || seen.has(node)) return [];
  seen.add(node);
  if (ts.isParenthesizedTypeNode(node)) {
    return declaredLiterals(checker, node.type, seen);
  }
  if (ts.isUnionTypeNode(node)) {
    return node.types.flatMap((item) => declaredLiterals(checker, item, seen));
  }
  if (ts.isTypeReferenceNode(node) && !node.typeArguments) {
    let target = checker.getSymbolAtLocation(node.typeName);
    if (target && target.getFlags() & ts.SymbolFlags.Alias) {
      target = checker.getAliasedSymbol(target);
    }
    const declaration = target?.declarations?.[0];
    return declaration && ts.isTypeAliasDeclaration(declaration)
      ? declaredLiterals(checker, declaration.type, seen)
      : [];
  }
  if (ts.isLiteralTypeNode(node)) {
    const { literal } = node;
    if (ts.isStringLiteral(literal)) return [literal.text];
    if (ts.isNumericLiteral(literal)) return [Number(literal.text)];
    if (literal.kind === ts.SyntaxKind.TrueKeyword) return [true];
    if (literal.kind === ts.SyntaxKind.FalseKeyword) return [false];
  }
  return [];
}

/**
 * TypeScript orders union members by internal type id, which shifts when
 * unrelated declarations change; source order is stable and is what an
 * inspector should show. Values the node does not spell out keep their place
 * after the declared ones.
 */
function inDeclaredOrder(checker, values, node) {
  const order = declaredLiterals(checker, node);
  if (order.length === 0) return values;
  const rank = (value) => {
    const index = order.indexOf(value);
    return index === -1 ? order.length : index;
  };
  return [...values].sort((a, b) => rank(a) - rank(b));
}

const isOptional = (symbol) =>
  (symbol.getFlags() & ts.SymbolFlags.Optional) !== 0;

/** Parses a JSDoc default from `@default`, "(default `x`)", or "`x` (default)". */
export function parseDocumentedDefault(text, tagValue) {
  if (tagValue) return tagValue.replace(/^['"`]|['"`]$/g, '');
  if (!text) return undefined;
  const patterns = [
    /\(default:?\s+`([^`]+)`/i,
    /\bdefaults? (?:to|is) `([^`]+)`/i,
    /`([^`]+)`\s+\((?:the )?default\)/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return match[1].replace(/^['"]|['"]$/g, '');
  }
  return undefined;
}

/** Coerces a documented default to the prop's type, or drops it. */
export function coerceDefault(raw, descriptor) {
  if (raw === undefined) return undefined;
  switch (descriptor.kind) {
    case 'boolean':
      return raw === 'true' ? true : raw === 'false' ? false : undefined;
    case 'number': {
      const value = Number(raw);
      return raw.trim() !== '' && Number.isFinite(value) ? value : undefined;
    }
    case 'enum':
      return descriptor.values.find((value) => String(value) === raw);
    case 'string':
      return raw;
    default:
      return undefined;
  }
}

/** Documentation on the aliases a property's declared type names. */
function declaredTypeDocs(checker, symbol) {
  const node = symbol.valueDeclaration ?? symbol.declarations?.[0];
  const typeNode = node && 'type' in node ? node.type : undefined;
  if (!typeNode) return [];
  const references = ts.isUnionTypeNode(typeNode) ? typeNode.types : [typeNode];
  return references
    .filter((item) => ts.isTypeReferenceNode(item))
    .map((item) => {
      let target = checker.getSymbolAtLocation(item.typeName);
      if (target && target.getFlags() & ts.SymbolFlags.Alias) {
        target = checker.getAliasedSymbol(target);
      }
      return documentation(checker, target);
    })
    .filter(Boolean);
}

function isNative(ctx, symbol) {
  const declarations = symbol.declarations ?? [];
  // A package's own declarations live under its directory, never in a
  // dependency's node_modules beneath it.
  const own = (fileName) =>
    fileName.startsWith(ctx.ownDirectory) &&
    !fileName.slice(ctx.ownDirectory.length).includes('node_modules/');
  return (
    declarations.length > 0 &&
    declarations.every((item) => !own(item.getSourceFile().fileName))
  );
}

function describeProperty(ctx, symbol, depth) {
  const { checker } = ctx;
  const type = checker.getTypeOfSymbol(symbol);
  const descriptor = describeType(ctx, type, depth);
  const description = documentation(checker, symbol);
  if (descriptor.kind === 'enum') {
    const node = symbol.valueDeclaration ?? symbol.declarations?.[0];
    if (node && 'type' in node && node.type) {
      descriptor.values = inDeclaredOrder(
        checker,
        descriptor.values,
        node.type,
      );
    }
  }
  const prop = {
    name: symbol.getName(),
    type: descriptor,
    required: !isOptional(symbol) && descriptor.kind !== 'never',
  };
  const documented =
    parseDocumentedDefault(description, jsDocTag(symbol, 'default')) ??
    declaredTypeDocs(checker, symbol)
      .map((doc) => parseDocumentedDefault(doc))
      .find((value) => value !== undefined);
  const fallback = coerceDefault(documented, descriptor);
  if (fallback !== undefined) prop.default = fallback;
  if (description) prop.description = description;
  if (jsDocTag(symbol, 'deprecated') !== undefined) prop.deprecated = true;
  // Lucide icon data is a nested array no document can spell as a literal;
  // marking it lets documents name the icon instead (`$icon`).
  if (ICON_DATA.test(descriptor.text ?? '')) prop.iconSource = 'lucide';
  return prop;
}

const ICON_DATA = /^(IconNode|LucideNode)( \| undefined)?$/;

/** Splits an object type's properties into own props and native attributes. */
function describeProps(ctx, type, depth) {
  const props = [];
  const nativeAttributes = [];
  for (const symbol of ctx.checker.getPropertiesOfType(type)) {
    if (isNative(ctx, symbol)) nativeAttributes.push(symbol.getName());
    else props.push(describeProperty(ctx, symbol, depth));
  }
  return { props, nativeAttributes };
}

function mergeMemberProps(memberProps, memberCount) {
  const byName = new Map();
  for (const props of memberProps) {
    for (const prop of props) {
      const seen = byName.get(prop.name);
      if (!seen) {
        byName.set(prop.name, {
          prop: { ...prop },
          present: 1,
          required: prop.required ? 1 : 0,
          types: [prop.type],
        });
        continue;
      }
      seen.present += 1;
      if (prop.required) seen.required += 1;
      if (!seen.types.some((item) => item.text === prop.type.text)) {
        seen.types.push(prop.type);
      }
      if (!seen.prop.description && prop.description) {
        seen.prop.description = prop.description;
      }
      if (seen.prop.default === undefined && prop.default !== undefined) {
        seen.prop.default = prop.default;
      }
    }
  }
  return [...byName.values()].map(({ prop, present, required, types }) => {
    const usable = types.filter((item) => item.kind !== 'never');
    let type = usable[0] ?? prop.type;
    const literals = usable.map((item) =>
      item.kind === 'literal' ? item.value : undefined,
    );
    if (
      usable.length > 1 &&
      literals.every((value) => typeof value === 'boolean')
    ) {
      type = { kind: 'boolean', text: 'boolean' };
    } else if (
      usable.length > 1 &&
      literals.every((value) => value !== undefined)
    ) {
      type = {
        kind: 'enum',
        values: literals,
        text: usable.map((item) => item.text).join(' | '),
      };
    } else if (usable.length > 1) {
      type = {
        kind: 'union',
        members: usable,
        text: usable.map((item) => item.text).join(' | '),
      };
    }
    const merged = { ...prop, type, required: required === memberCount };
    if (present < memberCount || usable.length !== types.length) {
      merged.variantOnly = true;
    }
    return merged;
  });
}

/**
 * Projects a props type into `{ props, nativeAttributes, variants? }`. A
 * union props type (Button's labeled-or-icon-only content, ListHeader's
 * toggle mode) lists every prop once, marks the ones only some members allow
 * as `variantOnly`, and records each member's required and forbidden props
 * as a variant.
 */
export function describePropsType(ctx, type) {
  const members = membersOf(type).filter((member) => !isNullish(member));
  if (members.length <= 1) {
    return members.length
      ? describeProps(ctx, members[0], 0)
      : { props: [], nativeAttributes: [] };
  }
  const described = members.map((member) => describeProps(ctx, member, 0));
  const props = mergeMemberProps(
    described.map((item) => item.props),
    members.length,
  );
  const nativeAttributes = [
    ...new Set(described.flatMap((item) => item.nativeAttributes)),
  ];
  const discriminant = discriminantOf(ctx.checker, members);
  const seen = new Set();
  const variants = [];
  for (const { props: list } of described) {
    const variant = {};
    if (discriminant) {
      variant.when = Object.fromEntries(
        discriminant.map((name) => [
          name,
          list.find((prop) => prop.name === name)?.type.value,
        ]),
      );
    }
    variant.required = list
      .filter((prop) => prop.required)
      .map((prop) => prop.name);
    variant.forbidden = list
      .filter((prop) => prop.type.kind === 'never')
      .map((prop) => prop.name);
    const key = JSON.stringify(variant);
    if (!seen.has(key)) {
      seen.add(key);
      variants.push(variant);
    }
  }
  if (variants.length < 2) return { props, nativeAttributes };
  return {
    props,
    nativeAttributes,
    variants,
    ...(discriminant ? { discriminant } : {}),
  };
}

function exportSymbol(checker, sourceFile, name) {
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) return undefined;
  const found = checker
    .getExportsOfModule(moduleSymbol)
    .find((symbol) => symbol.getName() === name);
  if (!found) return undefined;
  return found.getFlags() & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(found)
    : found;
}

/**
 * How a component carries application `data-*` attributes to its root (the
 * Kerf UI editor's node marker and row keys): a `rootAttributes` prop, native
 * `data-*` passthrough (a `data-${string}` index signature on the props), or
 * none.
 */
function dataChannelOf(checker, type, props) {
  if (props.some((prop) => prop.name === 'rootAttributes'))
    return 'rootAttributes';
  const members = type
    ? membersOf(type).filter((member) => !isNullish(member))
    : [];
  const native =
    members.length > 0 &&
    members.every((member) =>
      checker
        .getIndexInfosOfType(member)
        .some(
          (info) =>
            info.keyType.flags & ts.TypeFlags.TemplateLiteral &&
            info.keyType.texts[0] === 'data-',
        ),
    );
  return native ? 'native' : 'none';
}

/**
 * Reads one exported component function: its props (from the first
 * parameter), type parameters, and documentation. Returns undefined for an
 * export that is not a component (a type, a wiring helper, a non-SafeHtml
 * function).
 */
export function readComponentExport(ctx, sourceFile, name) {
  const { checker } = ctx;
  if (!/^[A-Z]/.test(name)) return undefined;
  const symbol = exportSymbol(checker, sourceFile, name);
  if (!symbol || !(symbol.getFlags() & ts.SymbolFlags.Function))
    return undefined;
  const [signature] = checker.getTypeOfSymbol(symbol).getCallSignatures();
  if (!signature) return undefined;
  if (!/SafeHtml$/.test(checker.typeToString(signature.getReturnType()))) {
    return undefined;
  }
  const [parameter] = signature.getParameters();
  const result = parameter
    ? describePropsType(ctx, checker.getTypeOfSymbol(parameter))
    : { props: [], nativeAttributes: [] };
  result.dataChannel = dataChannelOf(
    checker,
    parameter && checker.getTypeOfSymbol(parameter),
    result.props,
  );
  const typeParameters = (signature.getTypeParameters() ?? []).map((item) => {
    const constraint = item.getConstraint();
    return {
      name: item.getSymbol()?.getName(),
      ...(constraint ? { constraint: printType(checker, constraint) } : {}),
    };
  });
  const description = documentation(checker, symbol);
  return {
    export: name,
    ...(description ? { description } : {}),
    ...(typeParameters.length ? { typeParameters } : {}),
    ...result,
  };
}

const QUOTED = /^(['"])(.*)\1$/;

function customElementDefault(raw, type) {
  if (raw === undefined) return undefined;
  const quoted = QUOTED.exec(raw);
  let value;
  if (quoted) value = quoted[2];
  else if (raw === 'true' || raw === 'false') value = raw === 'true';
  else if (/^-?\d+(\.\d+)?$/.test(raw)) value = Number(raw);
  if (value === undefined || value === '') return undefined;
  if (type.kind === 'enum' && !type.values.includes(value)) return undefined;
  return value;
}

/** Projects a Web Awesome `custom-elements.json` declaration into props. */
export function describeCustomElement(declaration) {
  const props = (declaration.attributes ?? []).map((attribute) => {
    const text = (attribute.type?.text ?? 'string')
      .replace(/\s+/g, ' ')
      .replace(/^\| /, '');
    const parts = text
      .split('|')
      .map((part) => part.trim())
      .filter((part) => part !== 'undefined' && part !== 'null');
    const quoted = parts.filter((part) => QUOTED.test(part));
    const values = quoted.map((part) => QUOTED.exec(part)[2]);
    let type;
    if (parts.length > 0 && quoted.length === parts.length) {
      type = { kind: 'enum', values, text };
    } else if (
      quoted.length > 0 &&
      quoted.length === parts.length - 1 &&
      parts.includes('string')
    ) {
      type = { kind: 'string', suggestions: values, text };
    } else if (
      parts.length === 1 &&
      ['string', 'number', 'boolean'].includes(parts[0])
    ) {
      type = { kind: parts[0], text };
    } else {
      type = { kind: 'unknown', text };
    }
    const prop = { name: attribute.name, type, required: false };
    if (attribute.fieldName && attribute.fieldName !== attribute.name) {
      prop.property = attribute.fieldName;
    }
    const fallback = customElementDefault(attribute.default, type);
    if (fallback !== undefined) prop.default = fallback;
    if (attribute.description) prop.description = attribute.description;
    if (attribute.deprecated) prop.deprecated = true;
    return prop;
  });
  const slots = (declaration.slots ?? []).map((slot) => ({
    name: slot.name === '' ? 'default' : slot.name,
    ...(slot.description ? { description: slot.description } : {}),
  }));
  return { props, slots };
}

const qualify = (pkg, id) => `${pkg}:${id}`;

function dtsFor(root, browserImport, pkg) {
  return resolve(root, 'dist', `${browserImport.slice(pkg.length + 1)}.d.ts`);
}

/** Marks zone props (composition catalog) and css-value grammars (catalog). */
export function applyCrossReferences(
  component,
  { zones = [], cssValueProps = [] },
) {
  const zoneByProp = new Map(
    zones.filter((zone) => zone.jsx?.prop).map((zone) => [zone.jsx.prop, zone]),
  );
  const cssByPath = new Map(cssValueProps.map((item) => [item.path, item]));
  for (const prop of component.props) {
    const zone = zoneByProp.get(prop.name);
    if (zone) prop.zone = zone.id;
    const css = cssByPath.get(prop.name);
    if (css) {
      prop.cssValue = {
        grammar: css.grammar,
        helpers: css.helpers,
        rawPolicy: css.rawPolicy,
      };
    }
    // Content with no curated zone is still a slot an editor can fill.
    if (!prop.zone && prop.type.kind === 'content') prop.slot = true;
  }
}

// Plumbing props an inspector never shows by default: styling hooks, slot
// placement, and attribute bags the editor owns (the node marker). The
// overlay can still give any of them a visible control.
const HIDDEN_PROP =
  /^(class|className|\w+ClassName|slot|rootAttributes|triggerAttributes)$/;

/** Generated inspector defaults, applied before the curated overlay. */
export function applyControlDefaults(component) {
  for (const prop of component.props) {
    if (HIDDEN_PROP.test(prop.name)) prop.control = 'hidden';
  }
}

/** Merges curated overlay fields; unknown component or prop keys are problems. */
export function applyOverlay(component, overlay, problems) {
  const curated = overlay?.components?.[component.key];
  if (!curated) return;
  for (const [name, fields] of Object.entries(curated.props ?? {})) {
    const prop = component.props.find((item) => item.name === name);
    if (prop) Object.assign(prop, fields);
    else
      problems.push(`${component.key}: overlay names unknown prop "${name}"`);
  }
  if (curated.groups) component.groups = curated.groups;
  for (const [name, fields] of Object.entries(curated.props ?? {})) {
    if (fields.group && !curated.groups?.includes(fields.group)) {
      problems.push(
        `${component.key}: prop "${name}" names undeclared group "${fields.group}"`,
      );
    }
  }
}

/**
 * Reads the components a set of catalog entries declare. Each spec names an
 * entry's id and display name, the declaration file and import specifier of
 * its public module, its export names, and its zones and css-value props.
 */
function readComponentEntries(ctx, program, pkg, specs, source, problems) {
  const components = [];
  for (const spec of specs) {
    const sourceFile = spec.file && program.getSourceFile(spec.file);
    if (!sourceFile) {
      problems.push(
        `${spec.id}: no declarations for ${spec.import ?? '(no import)'}`,
      );
      continue;
    }
    const found = spec.exports
      .map((name) => readComponentExport(ctx, sourceFile, name))
      .filter(Boolean);
    // An entry of imperative helpers only (openAnchoredSurface) has no
    // component; an entry whose uppercase exports all fail to resolve does.
    if (found.length === 0) {
      if (
        spec.exports.some(
          (name) =>
            /^[A-Z]/.test(name) &&
            exportSymbol(ctx.checker, sourceFile, name)?.getFlags() &
              ts.SymbolFlags.Function,
        )
      ) {
        problems.push(
          `${spec.id}: no SafeHtml component among ${spec.exports.join(', ')}`,
        );
      }
      continue;
    }
    const primary = found.find((item) => item.export === spec.name) ?? found[0];
    for (const item of found) {
      const isPrimary = item === primary;
      const component = {
        key: isPrimary
          ? qualify(pkg, spec.id)
          : `${qualify(pkg, spec.id)}#${item.export}`,
        id: spec.id,
        source,
        import: spec.import,
        ...item,
      };
      applyCrossReferences(component, {
        zones: isPrimary ? spec.zones : [],
        cssValueProps: isPrimary ? spec.cssValueProps : [],
      });
      components.push(component);
    }
  }
  return components;
}

function readKerfEntries(ctx, program, root, catalog, composition, problems) {
  const pkg = catalog.package;
  const zones = new Map(
    (composition.entries ?? []).map((entry) => [entry.id, entry.zones ?? []]),
  );
  const specs = catalog.entries
    .filter((entry) => entry.source === 'kerf' && entry.kind === 'component')
    .map((entry) => {
      const browserImport = entry.delivery?.browserImport;
      return {
        id: entry.id,
        name: entry.name,
        import: browserImport,
        file: browserImport && dtsFor(root, browserImport, pkg),
        exports: entry.publicExports ?? [],
        zones: zones.get(entry.id) ?? [],
        cssValueProps: entry.cssValueProps ?? [],
      };
    });
  return readComponentEntries(ctx, program, pkg, specs, 'kerf', problems);
}

function readWebAwesomeEntries(catalog, customElements, problems) {
  const declarations = new Map(
    (customElements?.modules ?? [])
      .flatMap((module) => module.declarations ?? [])
      .filter((declaration) => declaration.tagName)
      .map((declaration) => [declaration.tagName, declaration]),
  );
  const components = [];
  for (const entry of catalog.entries) {
    if (entry.source !== 'webawesome') continue;
    const declaration = declarations.get(entry.id);
    if (!declaration) {
      problems.push(`${entry.id}: not in Web Awesome custom-elements.json`);
      continue;
    }
    components.push({
      key: qualify(catalog.package, entry.id),
      id: entry.id,
      source: 'webawesome',
      tagName: entry.id,
      import: entry.delivery?.registrationImport,
      ...describeCustomElement(declaration),
    });
  }
  return components;
}

/**
 * Builds the component-props document from the catalog, composition catalog,
 * curated overlay, built declarations under `<root>/dist`, and Web Awesome's
 * manifest. Returns `{ document, problems }`; the sync script fails on any
 * problem (an unresolved component, an overlay key that names nothing).
 */
export function buildComponentProps({
  root,
  catalog,
  composition,
  overlay,
  customElements,
}) {
  const problems = [];
  const pkg = catalog.package;
  const files = catalog.entries
    .filter((entry) => entry.source === 'kerf' && entry.delivery?.browserImport)
    .map((entry) => dtsFor(root, entry.delivery.browserImport, pkg));
  const program = createDeclarationProgram([...new Set(files)]);
  const ctx = createPropsContext(
    program.getTypeChecker(),
    resolve(root, 'dist'),
  );
  const components = [
    ...readKerfEntries(ctx, program, root, catalog, composition, problems),
    ...readWebAwesomeEntries(catalog, customElements, problems),
  ];
  for (const component of components) {
    applyControlDefaults(component);
    applyOverlay(component, overlay, problems);
  }
  const known = new Set(components.map((component) => component.key));
  for (const key of Object.keys(overlay?.components ?? {})) {
    if (!known.has(key))
      problems.push(`overlay names unknown component "${key}"`);
  }
  const byKey = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  components.sort((a, b) => byKey(a.key, b.key));
  const definitions = Object.fromEntries(
    [...ctx.definitions.entries()].sort(([a], [b]) => byKey(a, b)),
  );
  return {
    document: {
      $schema: './component-props.schema.json',
      schema: COMPONENT_PROPS_SCHEMA_ID,
      package: pkg,
      description:
        'Generated per-component prop schema for Kerf UI: each public component function and Web Awesome element with its props (type grammar, required, default, enum values, zones and slots, discriminated variants, css-value grammars). Regenerate with `npm run props:sync`; do not edit.',
      components,
      definitions,
    },
    problems,
  };
}

/** The declaration file a package export condition points to. */
function declarationsFor(root, target) {
  const path =
    typeof target === 'string'
      ? target.replace(/\.(m?)js$/, '.d.$1ts')
      : (target?.types ??
        (target?.import ? declarationsFor(root, target.import) : undefined));
  return path ? resolve(root, path) : undefined;
}

/**
 * Builds a component package's `component-props.json` (KF-B8TGP4: component
 * packages ship the same prop schema as @kerfjs/ui). Components and zones come
 * from the package's composition catalog (`package.json#kerfComponentCatalog
 * .output`, written by create-kerf-component); each component's declarations
 * come from the `types` of the package export its `publicExports` name (a
 * named subpath before `.`). Run after the package's build. Returns
 * `{ document, problems }`.
 */
export function buildPackageComponentProps({
  root,
  packageJson,
  composition,
  overlay,
}) {
  const problems = [];
  const pkg = packageJson.name;
  const exportMap =
    typeof packageJson.exports === 'string' || packageJson.exports?.types
      ? { '.': packageJson.exports }
      : (packageJson.exports ?? {});
  const specs = [];
  let usesSource = false;
  for (const entry of composition.entries ?? []) {
    if (entry.kind !== 'component' || (entry.package && entry.package !== pkg))
      continue;
    const exported = (entry.publicExports ?? []).map((item) =>
      typeof item === 'string' ? { name: item, subpath: '.' } : item,
    );
    const subpaths = [...new Set(exported.map((item) => item.subpath ?? '.'))];
    const subpath = subpaths.find((item) => item !== '.') ?? subpaths[0] ?? '.';
    const declarations = declarationsFor(root, exportMap[subpath]);
    // A component that lives in app source has no package export: read its
    // source file and import it by a root-relative path, which view tools
    // rewrite relative to each document (KF-7JP509: app-source catalogs).
    const source =
      entry.source && existsSync(resolve(root, entry.source))
        ? resolve(root, entry.source)
        : undefined;
    const fromSource = !(declarations && existsSync(declarations)) && source;
    const file = fromSource ? source : declarations;
    if (fromSource) usesSource = true;
    specs.push({
      id: entry.id,
      name: entry.name,
      import: fromSource
        ? sourceImport(root, source)
        : subpath === '.'
          ? pkg
          : `${pkg}${subpath.slice(1)}`,
      file: file && existsSync(file) ? file : undefined,
      exports: [
        ...new Set(
          exported
            .filter((item) => (item.subpath ?? '.') === subpath)
            .map((item) => item.name),
        ),
      ],
      zones: entry.zones ?? [],
      cssValueProps: entry.cssValueProps ?? [],
    });
  }
  const program = createDeclarationProgram(
    [...new Set(specs.map((spec) => spec.file).filter(Boolean))],
    usesSource ? packageCompilerOptions(root) : {},
  );
  const ctx = createPropsContext(program.getTypeChecker(), root);
  const components = readComponentEntries(
    ctx,
    program,
    pkg,
    specs,
    'package',
    problems,
  );
  for (const component of components) {
    applyControlDefaults(component);
    applyOverlay(component, overlay, problems);
  }
  const known = new Set(components.map((component) => component.key));
  for (const key of Object.keys(overlay?.components ?? {})) {
    if (!known.has(key))
      problems.push(`overlay names unknown component "${key}"`);
  }
  const byKey = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  components.sort((a, b) => byKey(a.key, b.key));
  return {
    document: {
      $schema:
        'https://raw.githubusercontent.com/brianwestphal/kerf/main/ui/ai/component-props.schema.json',
      schema: COMPONENT_PROPS_SCHEMA_ID,
      package: pkg,
      description: `Generated prop schema for ${pkg}'s Kerf components. Regenerate with \`kerf-ui-props --write\` after a build; do not edit.`,
      components,
      definitions: Object.fromEntries(
        [...ctx.definitions.entries()].sort(([a], [b]) => byKey(a, b)),
      ),
    },
    problems,
  };
}

/** Reads the JSON inputs relative to the ui package root. */
export function readComponentPropsInputs(root) {
  const json = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  return {
    root,
    catalog: json('ai/component-catalog.json'),
    composition: json('ai/component-composition.json'),
    overlay: json('ai/component-props-overlay.json'),
    customElements: json(
      'node_modules/@awesome.me/webawesome/dist/custom-elements.json',
    ),
  };
}
