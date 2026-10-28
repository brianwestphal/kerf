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
  /** `KUI-V001`–`KUI-V012`, or `KUI-L201`–`KUI-L204` for composition. */
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
