// The editor context (KF-N0CSVT): the shared state and the few operations
// most of createEditor's regions read, gathered into one typed object so a
// region can move to its own module and take the context instead of a
// dozen loose arguments. createEditor builds it once; a region receives it
// plus whatever only that region reads.
import type { ViewDocument, ViewNode, ViewType } from '@kerfjs/ui/view';
import type { ReadonlySignal, Signal } from 'kerfjs';

import type { Autosave } from './autosave.js';
import type { EditorCatalog, PropsComponent } from './catalog.js';
import type { SlotAddress } from './model/control-flow.js';
import type { Problem } from './model/problems.js';
import type { InspectorArea } from './shell-names.js';

/** What the inspector shows: a document node or a palette component. */
export type Selection =
  | { readonly kind: 'node'; readonly id: string }
  | { readonly kind: 'component'; readonly key: string }
  | { readonly kind: 'slot'; readonly address: SlotAddress }
  | null;

export interface EditorContext {
  /** The components the editor places and previews. */
  readonly catalog: EditorCatalog;
  /** The document being edited; every change goes through `commit`. */
  readonly doc: Signal<ViewDocument>;
  /** Records an edit: a changed document, one undo step. */
  readonly commit: (next: ViewDocument) => void;
  readonly selection: ReadonlySignal<Selection>;
  /** Selects a node, component, or slot (closing a field editor it leaves). */
  readonly select: (next: Selection) => void;
  /** The selected node's id, while it is a node of the document. */
  readonly selectedNodeId: () => string | undefined;
  /** Inspector field errors by field key, cleared by the next edit. */
  readonly fieldErrors: Signal<Readonly<Record<string, string>>>;
  /** The document's problems. */
  readonly currentProblems: ReadonlySignal<readonly Problem[]>;
  /** The Inspector's area (Properties, Flow, Children). */
  readonly inspectorArea: Signal<InspectorArea>;
  /**
   * KF-QWDPM3: the Properties page open over the Inspector, as a path: a
   * group (`['Behavior']`), a task in it (`['Behavior', 'Link']`), or
   * `[ALL_PROPERTIES]`; empty on the Properties overview.
   */
  readonly inspectorGroup: Signal<readonly string[]>;
  /** The All properties page's search, and its clear revision. */
  readonly propertiesQuery: Signal<string>;
  readonly propertiesQueryRevision: Signal<number>;
  /** The type table component `key`'s props catalog declares. */
  readonly definitionsOf: (key: string) => Record<string, ViewType>;
  /** The Inspector entry for a node (a `#view` one's from its params). */
  readonly propsEntryOf: (node: ViewNode) => PropsComponent | undefined;
  /** A composed document, once it has loaded. */
  readonly resolveView: (src: string, at?: string) => ViewDocument | undefined;
  /** Where documents save, when the editor has storage. */
  readonly autosave: Autosave | undefined;
}
