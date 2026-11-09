# View documents

A view document (`*.kui.json`, format `kerf-ui-document/v1`) describes one
screen or component built from Kerf UI and your own components: which
components, how they nest, their prop values, and the inputs, actions, slots,
and named nodes your application code works with. The Kerf UI editor writes
these documents; tools and AI agents may write them too.

You never ship the document's markup by hand. Either generate a read-only
TypeScript module from it with `kerf-ui-view`, or render it at runtime with
`interpretView`. Both come from `@kerfjs/ui`, and both behave the same.

The full design, with every rule and diagnostic, is
[`docs/26-ui-editor.md`](../../docs/26-ui-editor.md). This guide covers what an
application needs.

## Files

```
inbox.kui.json   the document (the editor's source of truth)
inbox.view.ts    generated, read-only; never edit it
inbox.ts         yours: state, handlers, slot content, wiring
```

The generated module sits beside its document. Add `**/*.view.ts` (and
`*.view.js` / `*.view.d.ts`) to `.prettierignore`: reformatting a generated
module changes its body digest, and the checks below then report it as edited.

## The document format

```json
{
  "$schema": "https://raw.githubusercontent.com/brianwestphal/kerf/main/ui/ai/view-document.schema.json",
  "schema": "kerf-ui-document/v1",
  "name": "Inbox",
  "catalogs": ["@kerfjs/ui"],
  "params": {
    "title": { "type": { "kind": "string" }, "default": "Inbox" }
  },
  "root": {
    "id": "01JB8Z1M6Q8E1X9V4S7K2R3T5A",
    "type": "@kerfjs/ui:pane",
    "zones": {
      "header": [
        {
          "id": "01JB8Z1M6Q8E1X9V4S7K2R3T5B",
          "type": "@kerfjs/ui:toolbar-text",
          "props": { "label": { "$param": "title" }, "size": "xl" }
        }
      ]
    }
  }
}
```

- **`name`** is the PascalCase component name. Every generated identifier
  derives from it (`renderInbox`, `InboxInputs`, `inboxContract`).
- **`catalogs`** lists the packages or catalog files whose components the
  document uses.
- **`params`** are the document's typed inputs. A param with a `default` is an
  optional input; one with `"optional": true` may be omitted.
- **`root`** is one node.

A **node** is `{ id, type, name?, props?, zones? }`. `type` is the component's
catalog key (`@kerfjs/ui:button`, or `package:id#Export` for an entry's second
export), or one of the built-ins `#text` and `#view` (another document). `id` is
an immutable ULID. A `name` (camelCase) makes the node a ref your code can
reach. `zones` maps each zone or content prop to its ordered children.

Prop values are JSON literals or one of these forms. There are no expressions:
a value that needs computing becomes a param.

| Form                       | Meaning                                                         |
| -------------------------- | --------------------------------------------------------------- |
| `{ "$param": "title" }`    | A document param                                                |
| `{ "$bind": "item.x" }`    | A path into an enclosing `$each` item, or into a param          |
| `{ "$action": "save" }`    | An action name, on action props only; becomes a typed handler   |
| `{ "$css": "space('m')" }` | One `@kerfjs/ui/css-values` builder call with literal arguments |
| `{ "$icon": "inbox" }`     | A Lucide icon by its kebab-case name                            |
| `{ "$slot": "detail" }`    | Content your application renders, inside a list or object value |

Zone children are nodes, `#text` runs, and three control-flow forms:

- **`$each`**: `{ "$each": <array>, "as": "item", "key": "item.id", "template": <node> }`
  renders one keyed row per item. `template` may also be an `$if` chain that
  picks a row design per item, or use `"templates"` plus `"kind"` to pick one
  per item kind (a `default` entry is required).
- **`$if`**: `{ "$if": <boolean>, "then": <child>, "else"?: <child> }`.
- **`$slot`**: `{ "$slot": "detail" }`, a hole your application fills with
  `SafeHtml`.

Editors and IDEs validate the shape with
[`view-document.schema.json`](../ai/view-document.schema.json); `validateView`
checks everything the schema cannot (below).

## The generated module

`kerf-ui-view generate inbox.kui.json` writes `inbox.view.ts`:

```ts
export interface InboxInputs { readonly title?: string; … }
export type InboxAction = 'compose' | 'open-item';
export interface InboxHandlers { compose(context): void; 'open-item'(context): void }
export interface InboxSlots { detail(): SafeHtml }
export interface InboxRefs { readonly composeButton: HTMLElement; … }
export const inboxContract = 'kui1:5f0c2a9e7d41b3c8';
export function renderInbox(inputs: InboxInputs, slots: InboxSlots, rowKey?: string): SafeHtml;
export function wireInbox(root: HTMLElement, handlers: InboxHandlers): () => void;
export function inboxRefs(root: ParentNode): InboxRefs;
```

Use it from your own file; never edit it:

```ts
import { mount } from 'kerfjs';
import { renderInbox, wireInbox } from './inbox.view.js';

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

- **Inputs** are the params. A missing required input is a compile error.
- **Handlers** need exactly one function per action, so adding an action in the
  document fails your build until you handle it, and removing one turns the
  leftover handler into an error. An action inside an `$each` row gets the
  row's `key` in its context.
- **Slots** return `SafeHtml`, so escaping stays enforced.
- **Refs** resolve named nodes by their `data-kerf-node` marker. A named node
  inside a row becomes a `(key) => Element | null` lookup.

### The contract

The **contract** is the module's public surface: its inputs, actions and their
scope, slots, refs, and row kinds. `<name>Contract` is its digest (`kui1:` plus
16 hex digits). Layout, literal prop values, text, and unnamed nodes are not
part of it, so a purely visual edit leaves the digest, and your code,
unchanged.

The module's three-line header records the generator version, the contract and
source digests, a digest of the module body, and the contract itself, so tools
can compare contracts without the old document.

## The `kerf-ui-view` CLI

```sh
npx kerf-ui-view generate src/**/*.kui.json   # write each module beside its document
npx kerf-ui-view check src/**/*.kui.json      # fail on a missing, stale, or hand-edited module
npx kerf-ui-view diff src/**/*.kui.json       # print the contract changes regenerating would make
```

| Option                 | Effect                                                             |
| ---------------------- | ------------------------------------------------------------------ |
| `--target ts\|js`      | `.view.ts` (default), or `.view.js` plus `.view.d.ts` for no-build |
| `--declarations-only`  | Omit `render<Name>`, for documents rendered with `interpretView`   |
| `--props <file>`       | Add a `component-props.json` catalog (repeatable)                  |
| `--composition <file>` | Add a `component-composition.json` catalog (repeatable)            |
| `--no-profile`         | Skip the catalogs `.kerf-ui-profile.json` files declare            |

The CLI loads Kerf UI's catalogs plus every package catalog the
`.kerf-ui-profile.json` files above a document declare. Run `check` in CI.

`diff` lists breaking changes first: a required input added, an input removed
or narrowed, an action added or removed, a slot changed, a ref removed or
retyped. Optional inputs, widened types, and new refs are non-breaking. Your
compiler then reports exactly the call sites a breaking change affects.

### Catalog-owned views

The UX catalog uses this same path for the `headers` composition and the
`recipe-workspace-header` recipe. Their editable sources live in
`ux-demo/views/`; the checked `*.view.ts` files beside them render the
component trees imported by the catalog hosts. The `headers.tsx` host keeps
`CatalogExample` framing, and the workspace recipe host keeps presentation and
command handling. The catalog's existing delegated actions handle the button
names and `data-recipe-command` values in the documents.

After editing either document in the editor, run this command from `ui/` and
commit the document and generated module together:

```sh
npm run catalog:views:generate
```

`npm run check:catalog-views` fails when either module is missing, stale, or
hand-edited. Both `npm run check:change` and `npm run check` include that check.

## Rendering documents at runtime

A server-driven application loads documents at runtime instead of generating
`render<Name>`. Generate with `--declarations-only` to keep the typed inputs,
handlers, refs, and contract, then render with `interpretView`:

```ts
import { mount } from 'kerfjs';
import { createViewCatalog, interpretView } from '@kerfjs/ui/view';
import { Pane } from '@kerfjs/ui/pane';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import props from '@kerfjs/ui/ai/component-props.json';
import composition from '@kerfjs/ui/ai/component-composition.json';
import { inboxContract } from './inbox.view.js';

const catalog = createViewCatalog({ props: [props], composition: [composition] });

mount(root, () =>
  interpretView(served, {
    catalog,
    components: {
      '@kerfjs/ui:pane': Pane,
      '@kerfjs/ui:toolbar-text': ToolbarText,
    },
    inputs: { title: 'Inbox' },
    contract: inboxContract,
    // Render an app-owned notice instead of throwing (log `error.contract`).
    onMismatch: (error) => updateRequiredNotice(error),
  }),
);
```

`interpretView` validates the document and compares its contract digest with
the one your code compiled against. On a mismatch it throws a
`KuiContractMismatch` (with `expected`, `actual`, and the served `contract`), or
renders `onMismatch`'s fallback, so a server-side edit never silently breaks a
deployed client. Pass every component the document uses explicitly, so the
bundle stays static; pass `icons` (Lucide name to icon data) for `$icon`
values and `resolveView` for `#view` nodes. Its output matches the generated
module byte for byte.

## Validating documents

```ts
import { createViewCatalog, validateView } from '@kerfjs/ui/view';

const catalog = createViewCatalog({ props: [props], composition: [composition] });
const { valid, diagnostics, hints, actions } = validateView(document, catalog, {
  resolveView: (src, path) => readDocument(path),
});
```

Each diagnostic is `{ code, path, message }` with a stable code (`KUI-V001` to
`KUI-V017` for the document, `KUI-L2##` for composition rules); `hints` are
non-blocking advice (`KUI-H###`). `validateView` is pure and has no Node APIs,
so it runs in the browser. Add your own component package's catalogs to
`props` and `composition` (write `component-props.json` with `kerf-ui-props`).

## Never edit a generated module

`eslint-plugin-kerfjs`'s `kerfjs/no-generated-view-edits` rule reports a
`*.view.ts` / `*.view.js` file whose body no longer matches the digest in its
header. It needs no access to the document. The fix is always to regenerate;
to change the view, edit the document (in the editor, or as JSON) and run
`kerf-ui-view generate`.

## The `@kerfjs/ui/view` API

**Documents and rendering**

| Export                                      | Use                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `createViewCatalog({ props, composition })` | Index component catalogs for the functions below                       |
| `validateView(document, catalog, options?)` | Diagnostics, hints, and the action scopes                              |
| `interpretView(document, options)`          | Render a served document after its contract check                      |
| `KuiContractMismatch`                       | The error `interpretView` throws on a contract mismatch                |
| `previewView(document, options)`            | An editor's lenient preview: no validation, placeholders for bad nodes |
| `generateView(document, catalog, options?)` | The module source, declarations, contract, and digest                  |
| `GENERATOR_VERSION`                         | The generator version a header records                                 |
| `readViewHeader(code)`                      | Parse a module header; `intact` is false after a hand edit             |
| `viewModulePath(path, target?)`             | `x.kui.json` to `x.view.ts` (or `.view.js`)                            |
| `composedViewPath(from, src)`               | Where a `#view` `src` points, as `resolveView` receives it             |
| `VIEW_DOCUMENT_SCHEMA_ID`                   | `'kerf-ui-document/v1'`                                                |

**Contracts**

| Export                          | Use                                                         |
| ------------------------------- | ----------------------------------------------------------- |
| `contractOf(document, catalog)` | The contract of a valid document                            |
| `contractDigest(contract)`      | Its `kui1:` digest                                          |
| `diffContracts(before, after)`  | Every change, each marked breaking or not                   |
| `serializeContract(contract)`   | The contract line a header records                          |
| `canonicalJson(value)`          | JSON with sorted keys and no whitespace, as digests hash it |
| `viewDigest(text)`              | The `kui1:` hash of any text                                |
| `typeText(type)`                | The TypeScript spelling of a param or slot-input type       |

**Building tools on the format.** These serve editors and other tools that
read or change documents; `@kerfjs/ui/editor` uses each of them.

| Export                                                | Use                                                                                                                                     |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `walkView(document, visit)`                           | Visit every node (with whether it is inside a row); returns slot names                                                                  |
| `childKind(child)` / `classifyChild(child)`           | A zone child's kind (`each`, `if`, `slot`, `view`, `node`); `classifyChild` pairs it with the child so a TypeScript `switch` narrows it |
| `createMoveCheck(document, catalog, id)`              | Whether moving a node adds a problem, without a full validation                                                                         |
| `isAssignable(from, to)` / `isLiteralOf(value, type)` | Type checks in the catalog's type grammar                                                                                               |
| `fieldZoneOf(component, definitions, key)`            | Which prop field a field-zone key (`leftRail.content`) fills                                                                            |
| `channelOf(component)`                                | How a component carries `data-*` attributes                                                                                             |
| `dataAttributeProblem(key)`                           | Why a `rootAttributes` key is not allowed, or undefined                                                                                 |
| `parseCssCall(source)` / `parseCssTree(source)`       | Parse a `$css` value: its helper names, or its call tree                                                                                |
| `lucideExportName(name)`                              | Lucide's export name for an icon (`a-arrow-down` to `AArrowDown`)                                                                       |

The types (`ViewDocument`, `ViewNode`, `ViewChild`, `ViewEachChild`,
`ViewIfChild`, `ViewSlotChild`, `ViewType`, `ViewValue`, `ViewCatalog`,
`ViewDiagnostic`, `ViewValidation`, `ViewContract`, `ViewContractChange`,
`GeneratedView`) are exported alongside.

## See also

- [Editor host](./editor-host.md): run the editor in your app's dev server.
- [`view-document.schema.json`](../ai/view-document.schema.json): the shape
  schema for editors and IDEs.
