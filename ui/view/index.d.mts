/** The format id every view document carries in `schema`. */
export const VIEW_DOCUMENT_SCHEMA_ID: 'kerf-ui-document/v1';

/** A type descriptor in the component-props grammar (`ai/component-props.json`). */
export interface ViewType {
  kind: string;
  text?: string;
  nullable?: true;
  acceptsText?: true;
  value?: string | number | boolean;
  values?: (string | number | boolean)[];
  items?: ViewType;
  props?: { name: string; type: ViewType; required: boolean }[];
  members?: ViewType[];
  index?: { keyPrefix: string; value: ViewType };
  ref?: string;
}

/** A value in a node's `props`, a `$each` source, or a `$slot` input. */
export type ViewValue =
  | string
  | number
  | boolean
  | null
  | readonly ViewValue[]
  | { readonly $param: string }
  | { readonly $bind: string }
  | { readonly $action: string }
  | { readonly $css: string }
  | { readonly $icon: string }
  | { readonly [name: string]: ViewValue };

export interface ViewNode {
  readonly id: string;
  readonly type: string;
  readonly name?: string;
  readonly props?: Readonly<Record<string, ViewValue>>;
  readonly zones?: Readonly<Record<string, readonly ViewChild[]>>;
  /** `#text` nodes only. */
  readonly value?: ViewValue;
  /** `#view` nodes only. */
  readonly src?: string;
}

export type ViewChild =
  | ViewNode
  | {
      readonly $each: ViewValue;
      readonly as: string;
      readonly key: string;
      readonly template: ViewNode;
    }
  | {
      readonly $if: ViewValue;
      readonly then: ViewChild;
      readonly else?: ViewChild;
    }
  | {
      readonly $slot: string;
      readonly input?: Readonly<Record<string, ViewValue>>;
    };

export interface ViewDocument {
  readonly $schema?: string;
  readonly schema: typeof VIEW_DOCUMENT_SCHEMA_ID;
  readonly name: string;
  readonly catalogs: readonly string[];
  readonly params?: Readonly<
    Record<
      string,
      {
        readonly type: ViewType;
        readonly default?: unknown;
        readonly description?: string;
      }
    >
  >;
  readonly slots?: Readonly<
    Record<string, { readonly input?: ViewType; readonly description?: string }>
  >;
  readonly root: ViewNode;
}

export interface ViewCatalog {
  readonly components: ReadonlyMap<
    string,
    { component: unknown; definitions: Record<string, ViewType> }
  >;
  readonly entries: ReadonlyMap<string, unknown>;
}

/** Indexes component-props and composition catalogs (Kerf UI's and any consumer's). */
export function createViewCatalog(input: {
  props?: readonly unknown[];
  composition?: readonly unknown[];
}): ViewCatalog;

export interface ViewDiagnostic {
  /** `KUI-V001`–`KUI-V014`, or `KUI-L201`–`KUI-L204` for composition. */
  readonly code: string;
  /** JSON path into the document, such as `$.root.zones.header[0]`. */
  readonly path: string;
  readonly message: string;
}

export interface ViewValidation {
  readonly valid: boolean;
  readonly diagnostics: readonly ViewDiagnostic[];
  /** Every action name with its `row` (inside `$each`) or `view` scope. */
  readonly actions: ReadonlyMap<string, 'row' | 'view'>;
}

export function validateView(
  document: unknown,
  catalog: ViewCatalog,
  options?: {
    /** Loads a `#view` node's document; without it, `#view` is shape-checked only. */
    resolveView?: (src: string) => unknown;
    /** Known Lucide icon names; with it, an unknown `$icon` is `KUI-V013`. */
    icons?: Iterable<string>;
  },
): ViewValidation;

/** Whether a param or binding of type `from` fits type `to`. */
export function isAssignable(
  from: ViewType,
  to: ViewType,
  definitions?: Record<string, ViewType>,
): boolean;

/** Whether a JSON literal is a valid value of a type. */
export function isLiteralOf(
  value: unknown,
  type: ViewType,
  definitions?: Record<string, ViewType>,
): boolean;

/**
 * Parses a `$css` value: one builder call whose arguments are only numbers,
 * quoted strings, or nested builder calls. Returns the helper names called
 * (outermost first), or undefined for anything else.
 */
export function parseCssCall(source: unknown): string[] | undefined;

/** How a catalog component carries `data-*` attributes for markers and row keys. */
export function channelOf(component: {
  dataChannel?: string;
  source?: string;
  props: readonly { name: string }[];
}): string;

/** One contract input: its TypeScript spelling, optionality, and declared shape. */
export interface ViewContractInput {
  readonly type: string;
  readonly optional: boolean;
  readonly shape?: ViewType;
}

/** A view module's contract (docs/26-ui-editor.md §4). */
export interface ViewContract {
  readonly inputs: Readonly<Record<string, ViewContractInput>>;
  readonly actions: Readonly<Record<string, 'row' | 'view'>>;
  /** Each slot's input type, or null for a slot without input. */
  readonly slots: Readonly<Record<string, string | null>>;
  readonly refs: Readonly<
    Record<
      string,
      {
        readonly element: string;
        readonly keyed: boolean;
        readonly id?: string;
      }
    >
  >;
}

export interface ViewContractChange {
  readonly member: 'input' | 'action' | 'slot' | 'ref';
  readonly name: string;
  readonly change: string;
  readonly breaking: boolean;
  readonly detail: string;
}

/** JSON with sorted keys and no whitespace. */
export function canonicalJson(value: unknown): string;
/** `kui1:` + 16 hex digits of the 64-bit FNV-1a hash of `text`. */
export function viewDigest(text: string): string;
/** TypeScript spelling of a document param or slot-input type. */
export function typeText(type: ViewType): string;
/** The contract of a valid document; throws when it does not validate. */
export function contractOf(
  document: unknown,
  catalog: ViewCatalog,
  options?: { resolveView?: (src: string) => unknown },
): ViewContract;
/** The layout-independent contract digest. */
export function contractDigest(contract: ViewContract): string;
/** The contract as a generated header records it. */
export function serializeContract(contract: ViewContract): string;
/** Every breaking and non-breaking change between two contracts. */
export function diffContracts(
  before: ViewContract,
  after: ViewContract,
): ViewContractChange[];
/** Visits every node; returns the slot names the document uses. */
export function walkView(
  document: ViewDocument,
  visit: (node: ViewNode, rowScoped: boolean) => void,
): Set<string>;

export const GENERATOR_VERSION: number;

export interface GeneratedView {
  /** The `.view.ts` (or `.view.js`) module source. */
  readonly code: string;
  /** The `.view.d.ts` source, for the `js` target only. */
  readonly declarations?: string;
  readonly contract: ViewContract;
  readonly digest: string;
}

/** Generates a read-only view module; throws on an invalid document. */
export function generateView(
  document: unknown,
  catalog: ViewCatalog,
  options?: {
    /** The document file name recorded in the header. */
    source?: string;
    resolveView?: (src: string) => unknown;
    target?: 'ts' | 'js';
    declarationsOnly?: boolean;
    /** The generated module's folder; absolute component imports become relative to it. */
    importFrom?: string;
  },
): GeneratedView;

/** The header a generated module records, and whether its body is untouched. */
export function readViewHeader(code: string):
  | {
      readonly version: number;
      readonly contractDigest: string;
      readonly sourceDigest: string;
      readonly bodyDigest: string;
      readonly contract: ViewContract;
      readonly intact: boolean;
    }
  | undefined;

/** `x.kui.json` → `x.view.ts` (or `.view.js`). */
export function viewModulePath(
  documentPath: string,
  target?: 'ts' | 'js',
): string;

/** Layout printer for generated expressions. */
export function printDoc(doc: unknown, indent?: number): string;

/** A parsed `$css` call: `{ name, args }`, each argument a literal or nested call. */
export interface CssCallTree {
  readonly name: string;
  readonly args: readonly (number | string | CssCallTree)[];
}
/** Parses a `$css` value into its call tree, or undefined for anything else. */
export function parseCssTree(source: unknown): CssCallTree | undefined;

/** A served document's contract differs from the one the app compiled against. */
export class KuiContractMismatch extends Error {
  readonly expected: string;
  readonly actual: string;
  /** The served document's full contract. */
  readonly contract: ViewContract;
}

/**
 * Renders a view document at runtime with the generated module's semantics,
 * after checking its contract digest against `contract`.
 */
export function interpretView(
  document: unknown,
  options: {
    readonly catalog: ViewCatalog;
    /** Catalog key → component function for every Kerf or app component used. */
    readonly components: Readonly<
      Record<string, (props: never) => SafeHtmlLike>
    >;
    readonly inputs?: object;
    readonly slots?: object;
    /** The generated `<name>Contract` the application compiled against. */
    readonly contract: string;
    readonly onMismatch?: (error: KuiContractMismatch) => SafeHtmlLike;
    readonly resolveView?: (src: string) => unknown;
    /** Lucide icon name → icon data, for every `$icon` the document uses. */
    readonly icons?: Readonly<Record<string, unknown>>;
  },
): SafeHtmlLike;

/** kerf's SafeHtml (kept structural so this module needs no type import). */
export type SafeHtmlLike = import('kerfjs').SafeHtml;

/** Lucide's export name for a kebab-case icon name (`a-arrow-down` → `AArrowDown`). */
export function lucideExportName(name: string): string;

/**
 * Renders a document for an editor preview, with no validation or contract
 * check. Nodes in `broken`, or whose rendering throws, render `placeholder`
 * instead. Applications use interpretView.
 */
export function previewView(
  document: unknown,
  options: {
    readonly catalog: ViewCatalog;
    readonly components: Readonly<
      Record<string, (props: never) => SafeHtmlLike>
    >;
    readonly inputs?: object;
    readonly slots?: object;
    readonly icons?: Readonly<Record<string, unknown>>;
    readonly resolveView?: (src: string) => unknown;
    /** Ids of nodes the caller's validation flagged. */
    readonly broken?: ReadonlySet<string>;
    /** Renders in place of a broken node; `reason` is `problem` or the thrown message. */
    readonly placeholder: (node: ViewNode, reason: string) => SafeHtmlLike;
  },
): SafeHtmlLike;

/** A component import as the generated module writes it, relative to `importFrom` when absolute. */
export function moduleSpecifier(specifier: string, importFrom?: string): string;
