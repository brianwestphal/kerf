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
  /** `kind: 'prop'`: the catalog component key whose prop's type this is. */
  component?: string;
  /** `kind: 'prop'`: that component's prop. */
  prop?: string;
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
  /** An item slot: application content at a content field inside a value. */
  | { readonly $slot: string }
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

/**
 * A row design chosen per item: every branch is one keyable node, and `else`
 * is required, so each item yields exactly one row.
 */
export interface ViewTemplateChain {
  readonly $if: ViewValue;
  readonly then: ViewNode;
  readonly else: ViewTemplate;
}

/** An `$each` template: one node, or an `$if` chain of them. */
export type ViewTemplate = ViewNode | ViewTemplateChain;

export type ViewChild =
  | ViewNode
  | {
      readonly $each: ViewValue;
      readonly as: string;
      readonly key: string;
      /** One node, or a `ViewTemplateChain` that picks one per item. */
      readonly template: ViewTemplate;
    }
  | {
      readonly $each: ViewValue;
      readonly as: string;
      readonly key: string;
      /**
       * One row node per item kind; `kind` picks one, and an item of any
       * other kind takes `default`, which is required.
       */
      readonly templates: Readonly<Record<string, ViewNode>> & {
        readonly default: ViewNode;
      };
      /** A string in the item's scope, such as `{ "$bind": "item.kind" }`. */
      readonly kind: ViewValue;
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

/** An `$each` list child: one template, or per-kind `templates`. */
export type ViewEachChild = Extract<ViewChild, { readonly $each: ViewValue }>;
/** An `$if` branch child. */
export type ViewIfChild = Extract<ViewChild, { readonly $if: ViewValue }>;
/** A `$slot` placement child. */
export type ViewSlotChild = Extract<ViewChild, { readonly $slot: string }>;

/** A view child's kind; `view` is a composed `#view` node. */
export type ViewChildKind = 'each' | 'if' | 'slot' | 'view' | 'node';

/** A view child paired with its kind, narrowed by a switch on `kind`. */
export type ClassifiedViewChild =
  | { readonly kind: 'each'; readonly child: ViewEachChild }
  | { readonly kind: 'if'; readonly child: ViewIfChild }
  | { readonly kind: 'slot'; readonly child: ViewSlotChild }
  | { readonly kind: 'view' | 'node'; readonly child: ViewNode };

/** The kind of a view child: the one shared child-kind dispatch. */
export function childKind(child: ViewChild): ViewChildKind;
/** The child with its kind; switching on `.kind` narrows `.child`. */
export function classifyChild(child: ViewChild): ClassifiedViewChild;

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
        /**
         * Used when the input is `null` or `undefined`, by a `$param` and by
         * a `$bind` path that starts at this param.
         */
        readonly default?: unknown;
        /**
         * `true` makes the input optional with no default, so an omitted
         * value reads as `undefined`. A param with a default does not take it.
         */
        readonly optional?: true;
        readonly description?: string;
      }
    >
  >;
  readonly slots?: Readonly<
    Record<string, { readonly input?: ViewType; readonly description?: string }>
  >;
  /**
   * The document's one top node. A document without one (an editor's empty
   * draft) is valid JSON but fails validation with `KUI-V017`, so nothing
   * generates or interprets it.
   */
  readonly root?: ViewNode;
}

export interface ViewCatalog {
  readonly components: ReadonlyMap<
    string,
    { component: unknown; definitions: Record<string, ViewType> }
  >;
  readonly entries: ReadonlyMap<string, unknown>;
  /**
   * Config types another component renders as a cataloged one, keyed
   * `package:TypeName` (a NavStack view's toolbar config renders as a
   * Toolbar) or, for one field alone, `package:TypeName.field`; a content
   * field inside one is placed in that component.
   */
  readonly configParents?: ReadonlyMap<string, string>;
}

/** Indexes component-props and composition catalogs (Kerf UI's and any consumer's). */
export function createViewCatalog(input: {
  props?: readonly unknown[];
  composition?: readonly unknown[];
}): ViewCatalog;

export interface ViewDiagnostic {
  /**
   * `KUI-V001`–`KUI-V017`, or `KUI-L201`–`KUI-L204` for composition; a hint
   * is `KUI-H001` (a whole-screen layout below the root whose place has no
   * height: not in a SizedRegion, another layout, or a filled Pane's content).
   */
  readonly code: string;
  /** JSON path into the document, such as `$.root.zones.header[0]`. */
  readonly path: string;
  readonly message: string;
}

export interface ViewValidation {
  readonly valid: boolean;
  readonly diagnostics: readonly ViewDiagnostic[];
  /**
   * Non-blocking advice about the document (`KUI-H###`); hints never make it
   * invalid, and export and generation ignore them.
   */
  readonly hints: readonly ViewDiagnostic[];
  /** Every action name with its `row` (inside `$each`) or `view` scope. */
  readonly actions: ReadonlyMap<string, 'row' | 'view'>;
}

/**
 * Where a `#view`'s `src` points relative to the top document's folder, from
 * the composing document at `from` (undefined for the top document): each
 * `src` resolves from the folder of the document that contains it. The
 * `path` every `resolveView(src, path)` receives.
 */
export function composedViewPath(from: string | undefined, src: string): string;

export function validateView(
  document: unknown,
  catalog: ViewCatalog,
  options?: {
    /**
     * Loads a `#view` node's document; without it, `#view` is shape-checked
     * only. `path` is where `src` points relative to the top document's
     * folder: each `src` resolves from the document that contains it.
     */
    resolveView?: (src: string, path: string) => unknown;
    /** Known Lucide icon names; with it, an unknown `$icon` is `KUI-V013`. */
    icons?: Iterable<string>;
  },
): ViewValidation;

/**
 * Prepares to ask whether moving node `id` (placed directly in a zone) to the
 * end of a zone adds a problem: one, by code and message, that
 * `validateView(moved, catalog)` reports and `validateView(document, catalog)`
 * does not, with `prepare` applied to every node of the moved document. The
 * source parent, the target parent, and the moved subtree are checked alone,
 * so asking costs about one node's checks, not one whole validation.
 *
 * The returned function answers `true` when the move changes the document
 * and adds no problem, `false` when it adds one or moves nothing (into the
 * node itself), and `undefined` when only a full validation can tell (the
 * order of action uses, duplicate ids or names, a malformed tree).
 */
export function createMoveCheck(
  document: ViewDocument,
  catalog: ViewCatalog,
  id: string,
  options?: {
    /**
     * A node as the moved document holds it, from its own fields and its
     * zones' lengths (the editor's field ownership). It never changes zones.
     */
    prepare?: (node: ViewNode) => ViewNode;
  },
): (parent: string, zone: string) => boolean | undefined;

/** Whether a param or binding of type `from` fits type `to`. */
export function isAssignable(
  from: ViewType,
  to: ViewType,
  definitions?: Record<string, ViewType>,
): boolean;

/**
 * A zone key that names a content field inside a prop value (`leftRail.content`,
 * `mainToolbar.title`, `views.0.content`): its prop, the path inside the
 * prop's value, and whether the field takes text. Undefined for any other key.
 * A filled field zone renders its nodes into that field.
 */
export function fieldZoneOf(
  /** A catalog component, as `ViewCatalog.components` holds it. */
  component: unknown,
  definitions: Record<string, ViewType>,
  key: string,
):
  | {
      readonly prop: string;
      readonly path: readonly (string | number)[];
      readonly text: boolean;
    }
  | undefined;

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

/**
 * Why a `rootAttributes` key cannot appear in a view document, or undefined:
 * it must be a lowercase `data-*` name that is not reserved (`data-kerf-*`,
 * `data-key`, `data-editor-*`). `validateView` reports it as `KUI-V015`.
 */
export function dataAttributeProblem(key: string): string | undefined;

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
  /**
   * The kinds each `templates` repeat names, by its item name, sorted.
   * Absent when the document has none.
   */
  readonly kinds?: Readonly<Record<string, readonly string[]>>;
}

export interface ViewContractChange {
  readonly member: 'input' | 'action' | 'slot' | 'ref' | 'kind';
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
  options?: { resolveView?: (src: string, path: string) => unknown },
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
    resolveView?: (src: string, path: string) => unknown;
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
    readonly resolveView?: (src: string, path: string) => unknown;
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
    readonly resolveView?: (src: string, path: string) => unknown;
    /** Ids of nodes the caller's validation flagged. */
    readonly broken?: ReadonlySet<string>;
    /** Renders in place of a broken node; `reason` is `problem` or the thrown message. */
    readonly placeholder: (node: ViewNode, reason: string) => SafeHtmlLike;
  },
): SafeHtmlLike;

/** A component import as the generated module writes it, relative to `importFrom` when absolute. */
export function moduleSpecifier(specifier: string, importFrom?: string): string;
