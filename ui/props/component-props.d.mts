import type ts from 'typescript';

export const COMPONENT_PROPS_SCHEMA_ID: 'kerf-ui-component-props/v1';

export type PropTypeKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'literal'
  | 'enum'
  | 'content'
  | 'css-value'
  | 'function'
  | 'signal'
  | 'element'
  | 'array'
  | 'record'
  | 'object'
  | 'union'
  | 'ref'
  | 'never'
  | 'unknown';

export interface PropType {
  kind: PropTypeKind;
  text?: string;
  nullable?: true;
  acceptsText?: true;
  typeParameter?: string;
  value?: string | number | boolean;
  values?: (string | number | boolean)[];
  suggestions?: string[];
  grammar?: string;
  items?: PropType;
  props?: PropDescriptor[];
  members?: PropType[];
  index?: { keyPrefix: string; value: PropType };
  discriminant?: string[];
  ref?: string;
}

export interface PropDescriptor {
  name: string;
  property?: string;
  type: PropType;
  required: boolean;
  default?: string | number | boolean;
  description?: string;
  deprecated?: true;
  variantOnly?: true;
  zone?: string;
  slot?: true;
  iconSource?: 'lucide';
  cssValue?: { grammar: string; helpers?: string[]; rawPolicy?: string };
  control?: string;
  group?: string;
  order?: number;
}

export interface PropsVariant {
  when?: Record<string, string | number | boolean | undefined>;
  required: string[];
  forbidden: string[];
}

export interface PropsShape {
  props: PropDescriptor[];
  nativeAttributes: string[];
  variants?: PropsVariant[];
  discriminant?: string[];
}

export interface ComponentProps extends Partial<PropsShape> {
  key: string;
  id: string;
  source: 'kerf' | 'webawesome' | 'package';
  import?: string;
  export?: string;
  tagName?: string;
  description?: string;
  typeParameters?: { name: string; constraint?: string }[];
  groups?: string[];
  props: PropDescriptor[];
  slots?: { name: string; description?: string }[];
  dataChannel?: 'rootAttributes' | 'native' | 'none';
}

export interface ComponentPropsDocument {
  $schema: string;
  schema: typeof COMPONENT_PROPS_SCHEMA_ID;
  package: string;
  description: string;
  components: ComponentProps[];
  definitions: Record<string, PropType>;
}

export interface PropsContext {
  checker: ts.TypeChecker;
  ownDirectory: string;
  definitions: Map<string, PropType>;
  definitionNames: Map<ts.Type, string>;
}

export function createDeclarationProgram(files: string[]): ts.Program;
export function createPropsContext(
  checker: ts.TypeChecker,
  ownDirectory: string,
): PropsContext;
export function describeType(
  ctx: PropsContext,
  type: ts.Type,
  depth?: number,
): PropType;
export function describePropsType(ctx: PropsContext, type: ts.Type): PropsShape;
export function readComponentExport(
  ctx: PropsContext,
  sourceFile: ts.SourceFile,
  name: string,
): (PropsShape & { export: string; description?: string }) | undefined;
export function parseDocumentedDefault(
  text: string | undefined,
  tagValue?: string,
): string | undefined;
export function coerceDefault(
  raw: string | undefined,
  descriptor: PropType,
): string | number | boolean | undefined;
export function describeCustomElement(declaration: unknown): {
  props: PropDescriptor[];
  slots: { name: string; description?: string }[];
};
export function applyCrossReferences(
  component: { props: PropDescriptor[] },
  references: {
    zones?: { id: string; jsx?: { prop?: string } }[];
    cssValueProps?: {
      path: string;
      grammar: string;
      helpers?: string[];
      rawPolicy?: string;
    }[];
  },
): void;
/** Generated inspector defaults: plumbing props get `control: 'hidden'`. */
export function applyControlDefaults(component: {
  props: PropDescriptor[];
}): void;
export function applyOverlay(
  component: ComponentProps,
  overlay: unknown,
  problems: string[],
): void;
export function buildComponentProps(inputs: {
  root: string;
  catalog: unknown;
  composition: unknown;
  overlay: unknown;
  customElements: unknown;
}): { document: ComponentPropsDocument; problems: string[] };
export function readComponentPropsInputs(root: string): {
  root: string;
  catalog: unknown;
  composition: unknown;
  overlay: unknown;
  customElements: unknown;
};

/** Builds a component package's component-props.json from its composition catalog and built declarations. */
export function buildPackageComponentProps(inputs: {
  root: string;
  packageJson: { name: string; exports?: unknown };
  composition: unknown;
  overlay?: unknown;
}): { document: ComponentPropsDocument; problems: string[] };
