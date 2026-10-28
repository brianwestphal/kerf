# Kerf UI editor: view documents and generated view contracts

**Status: partly built.** Four pieces exist:

- the foundation, `ui/ai/component-props.json` (KF-8PXPKW: generated
  per-component prop schema; see `docs/21-ui-package.md`);
- the document schema and `validateView` (§3, §8) in `@kerfjs/ui/view`
  (KF-FB9340: view-document schema and validator);
- the generator, contract digest and diff, and the `kerf-ui-view` CLI (§4,
  §6; KF-WWJGSN: view generator and CLI);
- `interpretView` (§7; KF-5G4CNW: runtime interpreter).

The lint rule and the editor are still design only. The
implementation tickets are listed in [§10](#10-implementation-plan).

## 1. Purpose and decisions

The Kerf UI editor is a visual composer for `@kerfjs/ui` screens and for
application or third-party components that publish the same catalogs. It came
out of investigation KF-23AP23 (WYSIWYG editor brainstorm). The maintainer made
these decisions there:

| Decision        | Choice                                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source of truth | A JSON **view document** (`*.kui.json`). Code is generated from it, never the other way round.                                                                                              |
| Users           | Developers scaffolding screens they finish in code; designers producing screens that apps load at runtime (server-driven UI); AI agents, with the editor as the human review surface.       |
| First work      | The prop schema generator (done: `ui/ai/component-props.json`).                                                                                                                             |
| Home            | A new private `editor/` package in this repository, built on kerf and `@kerfjs/ui`.                                                                                                         |
| Generated code  | **Read-only.** Applications integrate through the generated module's typed interface, in their own files. Re-export regenerates wholesale; the compiler reports exactly what an edit broke. |

The rest of this document specifies the document format, the generated view
module and its contract, how applications integrate with it, re-export, the
runtime interpreter, and validation.

### 1.1 Design rule 2 (no compiler)

Kerf ships no compiler and requires no build step beyond the consumer's own.
The editor respects that:

- The generated module is **ordinary TypeScript** (or `.js` plus `.d.ts`). It
  calls component functions directly, uses no JSX, needs no `jsxImportSource`,
  and is checked in like any other source file. A consumer's build treats it
  as hand-written code.
- Generation is an **authoring step** (the editor's Export command, or the
  `kerf-ui-view` CLI), like running a formatter. It never runs as part of the
  consumer's build, and nothing at runtime depends on it.
- The runtime interpreter (§7) is an ordinary library function for apps that
  load documents at runtime. It is optional and tree-shakes away when unused.

### 1.2 Package layering

| Layer                                                           | Package                                     | Published                |
| --------------------------------------------------------------- | ------------------------------------------- | ------------------------ |
| Document schema, validator, generator, contract digest and diff | `@kerfjs/ui` (`kerf-ui-view` bin + library) | yes                      |
| Runtime interpreter (`interpretView`)                           | `@kerfjs/ui/view` subpath                   | yes                      |
| The visual editor application                                   | `editor/`                                   | no (private, dogfooding) |

Developers who never open the editor can still validate and regenerate
documents that AI agents or other tools write. The editor is one client of the
published layers, never the only one.

## 2. Files and naming

```
inbox.kui.json   ← the view document (editor-owned source of truth)
inbox.view.ts    ← generated, read-only, never hand-edited
inbox.ts         ← application-owned: state, handlers, slots, wiring
```

- **One component per document.** A document describes one composable view; a
  larger screen composes other documents as nodes (§3.7).
- **The generated module sits beside its document**, with `.kui.json`
  replaced by `.view.ts` (or `.view.js` + `.view.d.ts` in no-build mode). A
  `generated/` folder was considered and rejected: co-location keeps imports
  short and makes the pair obvious in review.
- The document's `name` (PascalCase, for example `Inbox`) derives every
  exported identifier (§4).

## 3. Document format (`kerf-ui-document/v1`)

A JSON Schema for the format, `ui/ai/view-document.schema.json`, ships beside
the other catalogs.

```json
{
  "$schema": "https://raw.githubusercontent.com/brianwestphal/kerf/main/ui/ai/view-document.schema.json",
  "schema": "kerf-ui-document/v1",
  "name": "Inbox",
  "catalogs": ["@kerfjs/ui", "./components/kerf.components.json"],
  "params": {
    "title": { "type": { "kind": "string" }, "default": "Inbox" },
    "items": {
      "type": {
        "kind": "array",
        "items": {
          "kind": "object",
          "props": [
            { "name": "id", "type": { "kind": "string" }, "required": true },
            { "name": "label", "type": { "kind": "string" }, "required": true },
            { "name": "unread", "type": { "kind": "number" }, "required": false }
          ]
        }
      }
    }
  },
  "root": {
    "id": "01JB8Z1M6Q8E1X9V4S7K2R3T5A",
    "type": "@kerfjs/ui:pane",
    "props": { "contentElement": "nav" },
    "zones": {
      "header": [
        {
          "id": "01JB8Z1M6Q8E1X9V4S7K2R3T5B",
          "type": "@kerfjs/ui:toolbar",
          "zones": {
            "leading": [
              {
                "id": "01JB8Z1M6Q8E1X9V4S7K2R3T5C",
                "type": "@kerfjs/ui:toolbar-text",
                "props": { "label": { "$param": "title" }, "size": "xl" }
              }
            ],
            "trailing": [
              {
                "id": "01JB8Z1M6Q8E1X9V4S7K2R3T5D",
                "name": "composeButton",
                "type": "@kerfjs/ui:button",
                "props": {
                  "children": "Compose",
                  "tone": "brand",
                  "action": { "$action": "compose" }
                }
              }
            ]
          }
        }
      ],
      "content": [
        {
          "id": "01JB8Z1M6Q8E1X9V4S7K2R3T5E",
          "name": "folderList",
          "type": "@kerfjs/ui:list",
          "zones": {
            "children": [
              {
                "$each": { "$param": "items" },
                "as": "item",
                "key": "item.id",
                "template": {
                  "id": "01JB8Z1M6Q8E1X9V4S7K2R3T5F",
                  "type": "@kerfjs/ui:list-item",
                  "props": {
                    "label": { "$bind": "item.label" },
                    "action": { "$action": "open-item" }
                  }
                }
              }
            ]
          }
        },
        { "$slot": "detail" }
      ]
    }
  }
}
```

### 3.1 Top level

| Field      | Meaning                                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`   | Always `kerf-ui-document/v1`. A future incompatible format gets a new id; readers reject ids they don't know.                                                             |
| `name`     | PascalCase component name; derives every generated identifier.                                                                                                            |
| `catalogs` | Packages or catalog files whose components the document may use. `@kerfjs/ui` resolves to its shipped catalogs; a path resolves to a consumer `kerf.components.json` set. |
| `params`   | The document's typed inputs (§3.4). Optional.                                                                                                                             |
| `slots`    | Optional declared slot input types (§3.6); a slot used without a declaration takes no input.                                                                              |
| `root`     | Exactly one node.                                                                                                                                                         |

### 3.2 Nodes

A node is `{ id, type, name?, props?, zones? }`.

- **`type`** is the component's catalog key from `component-props.json`:
  `package:id`, or `package:id#Export` for an entry's second component (for
  example `@kerfjs/ui:text#FieldLabel`). Two built-ins exist: `#text`
  (`{ "type": "#text", "value": "…" }`, a text run in a content zone) and
  `#view` (a composed document, §3.7).
- **`id`** is immutable: a 26-character Crockford ULID assigned when the node
  is created. Moving, re-parenting, or editing the node never changes it.
  Copy/paste and duplicate assign fresh ids. Ids are unique within a document.
  They drive editor selection, comments, diffs, and the `data-kerf-node` marker
  (§4.5).
- **`name`** is optional and author-assigned: a camelCase identifier, unique
  within the document. Only named nodes appear in the generated contract, as
  refs (§4.4). Naming is deliberate: renaming a named node is a visible,
  breaking contract change, while moving one is not.
- **`props`** maps prop names (from `component-props.json`) to values (§3.3).
  Unknown props are errors. Required props must be present, and a union props
  type must satisfy exactly one of its `variants`.
- **`zones`** maps zone keys to ordered child lists. A zone key is the
  composition catalog's zone id when the component-props entry marks the prop
  with `zone`; otherwise it is the content prop's name (a prop marked `slot`).
  Children are nodes, `#text` runs, `$each`, `$if`, or `$slot` (§3.5–3.6).
  Writing a zone through `props` instead is an error.

### 3.3 Prop values

| Form                       | Meaning                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| JSON literal               | String, number, boolean, null, or an array/object of literals, checked against the prop's type descriptor.                                     |
| `{ "$param": "title" }`    | The value of a document param. The param's type must be assignable to the prop's type.                                                         |
| `{ "$bind": "item.x" }`    | A dotted path into an in-scope `$each` item (or into a param). Scope is lexical: only the enclosing templates' `as` names and params resolve.  |
| `{ "$action": "name" }`    | Only on string props the catalog identifies as action names (`action`). Declares a member of the action union (§4.2).                          |
| `{ "$css": "space('m')" }` | Only on `css-value` props: a call to one of the prop's allowed `cssValue.helpers`, never a raw CSS string. Generated verbatim with its import. |

There are no expressions: no arithmetic, string templates, or function calls
beyond `$css`. A value that needs computation becomes a param that the
application computes.

- `$css` is parsed, not trusted. It must be exactly one call whose arguments
  are numbers, quoted strings (with no quotes or backslashes inside), or nested
  builder calls. The outer call must name one of the prop's `cssValue.helpers`
  (any `@kerfjs/ui/css-values` builder when the catalog sets none). Generated
  code emits the call verbatim, so an identifier, an operator, or a template is
  rejected (`KUI-V010`), never passed through.
- A `content` prop takes a string or number literal only when its descriptor
  says `acceptsText` (`ButtonLabel`, `TextContent`). Bare `KerfUiContent`
  rejects text, as its compile-time contract does, so the document supplies
  nodes in the zone instead.
- A content prop that is not a composition zone (`slot` in the props schema)
  may be set either in `props` (text, `$param`, `$bind`) or in `zones`
  (nodes), but not both.
- Object literals are checked against the prop's shape. An index signature
  (`rootAttributes`' `data-*`) allows only keys with its prefix, and protected
  markers stay rejected.

### 3.4 Params

`params` maps a camelCase name to `{ type, default?, description? }`. `type` is
a descriptor in the component-props type grammar (`string`, `number`,
`boolean`, `enum`, `content`, `array`, `object`). A param with no default
becomes a required input. `content` params are application-rendered `SafeHtml`.

Params are how an application overrides anything: to change a node's prop at
runtime, the author promotes it to a param. Generated code is never edited and
never styled from outside. This matches Kerf UI's "configure, never override".

### 3.5 Control flow

- **`$each`**: `{ "$each": <array value>, "as": "item", "key": "item.id",
"template": <node> }`. `key` is required and must resolve to a string or
  number on the item, because the row becomes a keyed `each()` row. The
  template is a single node, since kerf rows have one root element. An empty
  list renders nothing.
  - Items must be objects, because `each()` keys rows by item identity.
  - The template's component needs a `data-*` channel to carry the row's
    `data-key`.
  - `as` must not shadow a param, an outer item, or a name the generated
    module uses (`inputs`, `slots`, `each`, `handlers`).
- **`$if`**: `{ "$if": <boolean value>, "then": <child>, "else"?: <child> }`.
  The condition is a param, a binding, or a literal.

There are no other control-flow forms. Anything richer belongs in application
code behind a slot.

### 3.6 Slots

`{ "$slot": "detail" }` is a named hole in a zone. The application fills it
with `SafeHtml` at render time (§4.3). A slot may declare an input, in
`"slots": { "detail": { "input": { "kind": "object", "props": [...] } } }`,
whose values come from params or bindings at the use site:
`{ "$slot": "detail", "input": { "selectedId": { "$param": "selectedId" } } }`.
The zone's `accepts` rules cannot inspect what a slot renders, so validation
treats a slot as an opaque child that counts toward cardinality.

### 3.7 Composing documents

A `#view` node, `{ "type": "#view", "src": "./sidebar.kui.json", "props": {…} }`,
renders another document. Its props are that document's params. The two
documents share action names: a child's actions join the parent's action union
(§4.2), and it is an error for the same name to be row-scoped in one document
and not in the other. Named nodes and slots stay private to their own document.
A parent reaches a child's refs through the child's generated `refs` function,
called on the subtree it rendered. Cycles are errors, and so is composing a
document that declares slots: the parent has no way to fill them. That case
stays out of v1 until a design names the parent-side slot surface.

## 4. The generated view module

For a document named `Inbox`, the generator writes `inbox.view.ts`:

```ts
// GENERATED by kerf-ui-view from inbox.kui.json — do not edit.
// kui-view: 1 contract kui1:5f0c2a9e7d41b3c8 source kui1:91aa0c3e44d07f12
import { delegateActions } from 'kerfjs/actions';
import { each, type SafeHtml } from 'kerfjs';
import { Button } from '@kerfjs/ui/button';
import { List } from '@kerfjs/ui/list';
import { ListItem } from '@kerfjs/ui/list-item';
import { Pane } from '@kerfjs/ui/pane';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

export interface InboxInputs {
  readonly title?: string;
  readonly items: readonly { readonly id: string; readonly label: string; readonly unread?: number }[];
}
export type InboxAction = 'compose' | 'open-item';
export interface InboxActionContext {
  readonly event: Event;
  readonly target: HTMLElement;
}
export interface InboxRowActionContext extends InboxActionContext {
  readonly key: string;
}
export interface InboxHandlers {
  compose(context: InboxActionContext): void;
  'open-item'(context: InboxRowActionContext): void;
}
export interface InboxSlots {
  detail(): SafeHtml;
}
export interface InboxRefs {
  readonly composeButton: HTMLElement;
  readonly folderList: HTMLElement;
}
export const inboxContract = 'kui1:5f0c2a9e7d41b3c8';
export function renderInbox(inputs: InboxInputs, slots: InboxSlots): SafeHtml { … }
export function wireInbox(root: HTMLElement, handlers: InboxHandlers): () => void { … }
export function inboxRefs(root: ParentNode): InboxRefs { … }
```

### 4.1 Inputs

`<Name>Inputs` has one readonly property per param. Its types are printed from
the descriptors: enums as string-literal unions, `content` as `SafeHtml`, and
objects and arrays structurally. A param with a default is optional. A missing
required input is a compile error at the application's call site.

### 4.2 Actions

`<Name>Action` is the union of every `$action` name in the document and its
composed documents. `<Name>Handlers` is a mapped interface with exactly one
handler per action:

- Adding an action in the editor makes the application fail to compile until
  it is handled.
- Removing one turns the leftover handler into an excess-property error.

Actions declared inside an `$each` template are **row-scoped**: their context
carries the row's `key`, read from the `data-key` that the generator puts on
the row root. `wire<Name>` is a thin wrapper over `delegateActions`
(`kerfjs/actions`), with one delegated `click` listener on the given root. It
returns that disposer. An action name that is row-scoped in one place and not
in another is a validation error, so each name has exactly one context type.

### 4.3 Slots

`<Name>Slots` has one method per `$slot`. It takes the declared input (or
nothing) and returns `SafeHtml`, so escaping stays enforced: an application
cannot hand the view a raw string.

### 4.4 Refs

`<Name>Refs` has one property per named node. Each is typed by the node's
catalog `rootElement` (`ul` → `HTMLUListElement`), falling back to
`HTMLElement`. A named node inside an `$each` template becomes a lookup,
`(key: string) => <Element> | null`, instead of a single element.
`<name>Refs(root)` resolves each ref by its `data-kerf-node` marker, never by
class name or DOM position. It throws, naming the ref, when a non-row ref is
missing. That catches a stale generated module paired with a different render.

### 4.5 The node marker

Every node whose component accepts application `data-*` attributes (a
`rootAttributes` prop, or native `data-*` passthrough) renders
`data-kerf-node="<node id>"`. The editor uses it for canvas selection; generated
refs use it for lookup.

The generator passes the marker through the component's public prop. It never
patches markup, which keeps the styling and ownership contract intact. A
component with no `data-*` channel cannot be named: selection on the canvas
falls back to its nearest marked ancestor. Closing that gap is a component
change, tracked in §10.

The marker attribute is reserved. Application code must not write or remove
it, consistent with the catalog's `wiring.stateAttributes` rule.

### 4.6 The contract digest

`<name>Contract` is `kui1:` followed by 16 hex digits: a 64-bit FNV-1a hash of
the contract's canonical JSON. The canonical JSON is UTF-8, with keys sorted,
no whitespace, and these members:

- `inputs`: each name with its printed type and optionality;
- `actions`: each name with its scope (`row` or `view`);
- `slots`: each name with its printed input type;
- `refs`: each name with its element type and multiplicity.

Layout, literal prop values, text, ordering, and unnamed nodes are excluded.
So a purely visual edit (reorder, a prop literal, new static text, a moved
named node) leaves the digest unchanged, and the application needs no changes.
The hash is a compatibility fingerprint, not a security measure. A
synchronous, dependency-free algorithm lets Node and browsers compute it
identically.

The header is three comment lines:

1. The `GENERATED … do not edit` notice.
2. `kui-view: <version> contract <digest> source <digest> body <digest>`.
   - `source` hashes the whole document in the same canonical form.
   - `body` hashes everything after the header, so the no-hand-edits checks
     (§5.2) can tell an edited module from an untouched one without the
     document.
3. `kui-contract: <canonical JSON>`, the contract itself. `kerf-ui-view diff`
   compares against it, so a diff needs no copy of the previous document.

`readViewHeader(code)` parses all three and reports `intact`.

### 4.7 Determinism and output form

The same document and the same catalog versions produce byte-identical output,
so the git diff of a regeneration is meaningful:

- imports are sorted by specifier, one per component subpath (`import` in
  `component-props.json`) plus `$css` helpers;
- declarations follow document order;
- formatting is fixed by the generator's own layout printer (100 columns, one
  entry per line when an expression does not fit), with no dependence on the
  consumer's formatter. Projects add `**/*.view.ts` (and `.view.js` /
  `.view.d.ts`) to `.prettierignore`, because reformatting a module changes its
  body digest. This repository does the same for its golden fixture.

Output is plain `.ts` calling component functions: `Pane({ header: [...],
children: [...] })`. In no-build mode (`--target js`), it is `.view.js` with a
sibling `.view.d.ts` carrying the same contract, importing from the same bare
specifiers an importmap resolves.

## 5. Integration rules

### 5.1 Applications use the module, never edit it

```ts
// inbox.ts — application-owned
import { mount } from 'kerfjs';
import { MessageDetail } from './message-detail.js';
import { renderInbox, wireInbox, type InboxInputs } from './inbox.view.js';

mount(root, () =>
  renderInbox(
    { title: 'Inbox', items: items.value },
    { detail: () => MessageDetail({ id: selectedId.value }) },
  ),
);
const dispose = wireInbox(root, {
  compose: () => openComposer(),
  'open-item': ({ key }) => (selectedId.value = key),
});
```

State, signals, stores, effects, `wire…` helpers that a composition requires
(`wireWorkbench`, `wireSidebar`; the catalog lists these wiring obligations),
and every handler live in application files. The document may declare which
wiring a composition needs, through its components' catalog entries, but it
never implements behavior.

### 5.2 Enforcement

- `eslint-plugin-kerfjs` gains a rule, `kerfjs/no-generated-view-edits`, that
  reports a `*.view.ts` / `*.view.js` file whose body does not match its
  header's generator output.
  - The rule recomputes the hash of the file body. It needs no access to the
    document.
  - A mismatch means the module was edited by hand or is half-regenerated.
  - The fix is to regenerate, never to edit.
- `kerf-ui-view check` (§6) fails when a document's module is stale, which
  makes it a CI gate.

## 6. Re-export: "only fix what's broken"

`kerf-ui-view` (bin, published from `@kerfjs/ui`) and the editor's Export
command run the same pipeline:

1. **Validate** the document (§8). Errors stop the export.
2. **Diff the contract.** Compare the new contract with the one recorded in the
   existing module's header (or with its parsed exports). Each change is listed
   as breaking or non-breaking:

   | Change                                                   | Class        |
   | -------------------------------------------------------- | ------------ |
   | Required input added; input removed; input type narrowed | breaking     |
   | Optional input added; input type widened (enum superset) | non-breaking |
   | Action added or removed; action scope changed            | breaking     |
   | Slot added, removed, or its input changed                | breaking     |
   | Ref removed or retyped; ref changed from single to keyed | breaking     |
   | Ref added                                                | non-breaking |
   | Layout, literals, text, unnamed nodes                    | no change    |

   Type changes are classified by printed type: identical means no change, an
   enum superset means widened, and anything else counts as breaking.

3. **Write** the module, with `check` to verify without writing.
4. **Compile.** The application's `tsc` reports exactly the call sites the
   breaking changes affect. `kerf-ui-doctor` and ESLint then run over the
   generated file like any other source.

AI agents edit the document, never the module. The contract diff is the review
surface a human reads: "adds the action `archive`, removes the input
`density`".

## 7. Runtime interpreter (server-driven documents)

`@kerfjs/ui/view` exports
`interpretView(document, { catalog, components, inputs, slots, contract, onMismatch?, resolveView? })`.

- `components` maps catalog keys to component functions. The application
  imports them explicitly, so bundling stays static and tree-shakable. A node
  whose type is missing from the map is an error.
- The interpreter validates the document (§8). It then computes the document's
  contract digest and compares it with `contract`, the `<name>Contract` the
  application compiled against.
  - On a mismatch it throws a `KuiContractMismatch` carrying the `expected`
    and `actual` digests and the served document's full `contract`, so a host
    can log exactly what changed. If `onMismatch` is given, it returns
    fallback `SafeHtml` to render instead of throwing.
  - This means a server-side edit can never silently break a deployed client.
- An application that loads documents at runtime generates with
  `--declarations-only`, which emits the contract types, `wire<Name>`,
  `<name>Refs`, and `<name>Contract`, but no `render<Name>`. The application
  calls `interpretView` in its place, and the typing and handler exhaustiveness
  are identical.
- Rendering semantics match the generated module exactly. A differential test
  pins this: for the inbox fixture, interpreted output equals the generated
  `renderInbox` output byte for byte across several input sets.
- `$css` is evaluated by walking its parsed call tree (`parseCssTree`) over
  the `@kerfjs/ui/css-values` builders, never by `eval`. `$param` defaults
  apply to `null` as well as `undefined`, as `??` does in generated code.

## 8. Validation

`validateView(document, catalog, { resolveView? })` from `@kerfjs/ui/view`
(and later `kerf-ui-view check` and the editor) reports diagnostics with stable
ids. `catalog` comes from `createViewCatalog({ props, composition })` over
`component-props.json` / `component-composition.json` documents (Kerf UI's and
any consumer's). The result is `{ valid, diagnostics: [{ code, path, message }],
actions }`, where `actions` maps each action name to its `row` or `view` scope.
The module is pure, with no Node APIs, so the editor runs it in the browser.
Structure is checked by hand, so no schema engine ships at runtime.
`ui/ai/view-document.schema.json` serves editors and IDEs, and a test keeps the
schema and the validator in agreement.

| Id         | Condition                                                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `KUI-V001` | Schema violation (shape, unknown field, bad `schema` id)                                                                               |
| `KUI-V002` | Unknown component `type`, or one from a package missing from `catalogs`                                                                |
| `KUI-V003` | Unknown prop, or a zone written through `props`                                                                                        |
| `KUI-V004` | Prop value not assignable to its type descriptor, or a union props type matching no variant                                            |
| `KUI-V005` | Missing required prop                                                                                                                  |
| `KUI-V006` | Duplicate node `id` or duplicate `name`; malformed id                                                                                  |
| `KUI-V007` | `$param` naming no param, or `$bind` path out of scope or not on the item type                                                         |
| `KUI-V008` | `$each` over a non-array or non-object items, a bad or shadowing `as`, no resolvable `key`, or a template that is not one keyable node |
| `KUI-V009` | `$action` on a non-action prop, or one name used with both row and view scope                                                          |
| `KUI-V010` | `$css` calling a helper outside the prop's `cssValue.helpers`                                                                          |
| `KUI-V011` | A named node whose component has no `data-*` channel (§4.5)                                                                            |
| `KUI-V012` | `#view` source missing, cyclic, declaring slots, or given props that are not its params                                                |

The composition checks reuse the ESLint `ui-composition` rule's ids, which now
apply to a JSON tree instead of JSX: `KUI-L201` (disallowed direct parent),
`KUI-L202` (zone child not in `accepts`), `KUI-L203` (zone cardinality), and
`KUI-L204` (inset-bearing child under an inset-free parent). Cardinality
counts an `$each` as zero-or-more, an `$if` as zero-or-one, and a `$slot` as
exactly one.

The ESLint rule and the document validator read the same
`component-composition.json`, so the two cannot drift. Composition entries
still marked `generated-permissive-default` allow anything, as the catalog
documents.

## 9. Limitations

- **Behavior stays in code.** The document cannot express signals,
  computation, effects, or handlers. Interactive previews of wired layouts
  (collapsing rails, NavStack pushes) require the editor to run the real
  wiring against its canvas.
- **Validation is only as strict as the catalogs.** Most composition entries
  are still permissive defaults, and `accepts` concepts such as `fixed-chrome`
  are not yet defined as sets.
- **No arbitrary CSS.** The inspector edits props, params, and `$css` builder
  calls only. This is deliberate ("configure, never override"), but it is not
  a free-form design tool. The Sketch Library remains the place for pixel
  mockups.
- **No round trip from code.** A one-time, static-subset TSX importer may
  migrate existing screens later, but documents remain the only source of
  truth.
- **Unmarked components** (those with no `data-*` channel) cannot be named or
  selected individually until they gain one.

## 10. Implementation plan

1. **Done:** `ui/ai/component-props.json` (KF-8PXPKW: generated prop schema).
2. **Done:** document schema plus `validateView` in `@kerfjs/ui/view` (§3, §8;
   KF-FB9340: view-document schema and validator).
3. **Done:** generator, contract digest/diff, and the `kerf-ui-view` CLI (§4,
   §6; KF-WWJGSN: view generator and CLI). `kerf-ui-view generate | check |
diff <doc…>` takes `--target js`, `--declarations-only`, and extra
   `--props` / `--composition` catalogs.
4. **Done:** `interpretView` in `@kerfjs/ui/view`, with differential tests
   against the generator (§7; KF-5G4CNW: runtime interpreter).
5. `kerfjs/no-generated-view-edits` ESLint rule (§5.2; KF-BD3ZHQ: no-hand-edits
   lint rule).
6. A `data-*` channel (`rootAttributes`) for every component that lacks one,
   recorded in `component-props.json` (§4.5; KF-PYR8XZ: component data
   channels).
7. The private `editor/` package (KF-4NRZCV: editor scaffold), then editing,
   validation display, and export in the editor.
