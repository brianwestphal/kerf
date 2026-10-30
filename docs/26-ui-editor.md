# Kerf UI editor: view documents and generated view contracts

**Status: partly built.** Six pieces exist:

- the foundation, `ui/ai/component-props.json` (KF-8PXPKW: generated
  per-component prop schema; see `docs/21-ui-package.md`);
- the document schema and `validateView` (§3, §8) in `@kerfjs/ui/view`
  (KF-FB9340: view-document schema and validator);
- the generator, contract digest and diff, and the `kerf-ui-view` CLI (§4,
  §6; KF-WWJGSN: view generator and CLI);
- `interpretView` (§7; KF-5G4CNW: runtime interpreter);
- the `kerfjs/no-generated-view-edits` lint rule (§5.2; KF-BD3ZHQ: no-hand-edits
  lint rule);
- the private `editor/` scaffold (KF-4NRZCV: editor scaffold): open and save,
  canvas preview, selection, outline, an inspector, and a problems list
  linked to nodes (KF-WC0ZG3: editor problems list), and export of the generated
  module with a contract-change report against the last export or a chosen
  existing module (KF-Y38YRT, KF-9J810J: editor export and compare);
- editing in the editor (KF-KX77TV: editor editing): the inspector edits
  literal props (a Select per string enum, a Switch per boolean, a text field
  for strings, text-accepting content, numbers, and `$css` builder calls, and
  a JSON field for list and object literals such as a Combobox's
  `suggestions`), renames nodes, promotes a literal prop to a document param, adds a child of
  a chosen component to one of the node's legal zones, moves a node within its
  zone, deletes it, and undoes or redoes any of these.

The editor shell is published as `@kerfjs/ui/editor` (KF-6GT5QY: editor
host): a host passes it an `EditorCatalog` that combines Kerf UI's catalogs
with an application's, so application components preview with their real
functions. `@kerfjs/ui/vite-editor` (`kerfUiEditor()`) runs it inside an
application's own Vite dev server at `/__kerf-ui-editor/`, reading the
catalogs its `.kerf-ui-profile.json` declares and importing each component's
module from the catalog's `import` field (plus an optional registry). The
private `editor/` app is another host; its `fixtures/app/` is the plugin's
end-to-end fixture.

Documents save themselves (KF-0SY9M6: autosave). A host passes
`createEditor({ storage })`; both hosts pass `devServerStorage()`, which reads
and writes through their dev server's file endpoint
(`/__kerf-ui-editor/api/file`, `editorFileMiddleware` in
`@kerfjs/ui/vite-editor`). The endpoint reads (GET) and writes (PUT) only
`.kui.json` files inside the project, outside `node_modules` and `.git`, and
refuses a write without the `X-Kerf-UI-Editor` header, which a cross-site page
cannot send. Every committed change saves about 400 ms after it, unless the
file already holds that text. A document without a chosen path is an
autosaved draft in `.kerf-ui-editor/drafts/`, a folder that ignores itself in
git, written once it first changes. An opened file becomes a new draft, saved
at once, because a browser file picker reveals no project path. Save As (the
toolbar's Save button with storage) names a project path; the editor switches
to it only after that write succeeds, and later changes save there. The
Preview header shows the file (`Unsaved draft` or its path) and its state:
autosaved or saved, saving…, or not saved with the reason. The editor
remembers the current path in browser storage and reopens it on the next
visit; a missing or unreadable file starts a draft, and an edit made while it
loads saves to a new draft instead. A pending change saves as the page hides.
With storage, a copy downloads from Export's Document (.kui.json); without
it, Save downloads as before. New (KF-QSSTMX) starts an empty document (an
empty Pane) with no history or selection; with storage it is a new draft,
saved at once, and the previous document stays in its own file.

**Replace the root** (KF-KWQVDJ: choose the root) starts a document from any
component. Selecting the root shows it in the Children area: a component
picker and Replace swap the whole tree for a new, seeded node of that
component and select it; params, slots, and the document's name stay, and
Undo restores the previous tree. Full-height layouts (NavStack,
TabNavigator, SplitView, Workbench) fill the view only as the root: nested
in a Pane's content they have no definite height and preview, as they would
render, as their chrome alone.

The inspector also binds a prop to a document param or an in-scope `$each`
item field, offering only the sources `validateView` accepts there
(KF-K5TKCV: editor bindings).

List and object props have placeholders (KF-HNNWN9: list placeholders). A
component added from Add a child or the palette has its required lists,
objects, and unions seeded from the props catalog's type graph, not a
per-component table: three items numbered after the prop ("Suggestion 1",
`{ value: "choice-1", label: "Choice 1" }`, `{ label: "Item 1" }`), and a
required `value` starts on the first seeded choice. So a Combobox, a Select,
or a PopupMenu renders as soon as it is added. The inspector edits such a
prop as JSON, checked against the prop's type with `isLiteralOf`. While the
prop is unset, **Fill with example** writes the placeholder back. Binding the
prop to a param stays available for data the application provides. A
required field that needs rendered content (a NavStack view's body, a row
menu's icon) is seeded as an item slot (KF-SXDM56: item slots, §3.3) that
the application fills; the outline lists each one under its node.

Every component renders as added (KF-FGD8B3: render by default). Besides its
required props, a new node gets placeholders for every zone and content prop
it requires. A zone that names a cataloged component gets that component,
seeded the same way (a TabBar gets a TabBarItem). Any other zone or required
content prop gets a `Text` naming it, such as a Workbench's `main` holding a
Text reading "Main". Numbers start on their default or 1, never 0, because 0
is out of range for props such as a Grid's `columns`. Icon data names the
`circle` Lucide icon. A union seeds a member that renders, so it seeds a list
rather than an empty object. Placeholders are ordinary nodes and values that
the outline and inspector change or remove like any other. A unit test seeds
every cataloged component as a lone document and requires it to validate and
render.

**Field editors (design, signed off 2026-10-30; KF-AJHJB8: first-class
complex-prop editors).** Today 55 Kerf UI props are edited as typed JSON: 32
objects (a Workbench's `mainToolbar`, a `ListConfig`), 13 lists of objects (a
Select's `choices`, a NavStack's `views`), 6 lists of strings or enum values
(TagField `tags`, Pane `separators`), 3 lists of union items (PopupMenu
`items`), and LucideIcon's icon data. Each of these gets a first-class editor
instead. The editors are derived from the props catalog's type graph (the same
`resolveType` walk seeding uses), not written per component, so an
application component's catalog gets them with no extra code.

- **Two containers, one form.** A structural editor's form is built from the
  object's fields with the same `controlFor` controls as top-level props, and
  nested objects open the same way again. The form opens in one of two
  containers:
  - **A pushed subview** in the Inspector rail (a `NavStack`) for a single
    step of at most 10 fields. The canvas stays visible and updates live, and
    Back pops.
  - **A modal dialog** for anything with several steps, sub-selections (pick
    one, then configure it), or more than 10 fields, and for pickers.
    The rule picks a container by default, and a field editor may name its
    container explicitly.
- **Lists of objects** open a list editor: one `ListItem` per item, labeled
  from its `label`, `name`, or `value`, with add, remove, and drag-reorder.
  Choosing an item opens its form. A list of **union items** (PopupMenu items)
  adds through an **Add ▾** `PopupMenu` offering each member type ("Item",
  "Separator", "Group").
- **Lists of strings** edit inline in a `TagField`. **Sets of enum values**
  (sides) edit inline in a `CheckboxGroup`.
- **Icon data** opens an icon picker dialog: a search over the Lucide names
  that writes `{ $icon: name }`.
- **JSON remains** as an escape hatch: "Edit as JSON" in each editor shows the
  typed JSON field the Inspector uses today.
- **Extension API.** `createEditor({ fieldEditors })` registers an editor for
  a named type (`'ListConfig'`, an application's `'InvoiceFilter'`), which
  overrides the type-driven default. An editor receives the value, its type
  and definitions, and a commit callback, and chooses its container.

Object forms are built (KF-Z9S029: object forms). An object prop shows as a
row with its name, what it holds ("Not set", "2 fields set"), and a chevron,
in place of the JSON field; choosing it opens the form. The Inspector rail
is a Workbench navigation panel whose root view is the Inspector, so a form
of at most 10 fields pushes a view titled after the prop, and Back pops it.
A larger object opens in a dialog with Back and Done; a nested object steps
forward in the container its outermost form opened in. Every field edit
commits and is undoable, so the canvas updates while the form is open.
Selecting another node closes the editor. Each step has **Edit as JSON**
(and **Edit as form** to return), **Reset**, which unsets that step, and
**Fill with example** when its type has required fields. Clearing an
object's last field unsets it. Lists of strings edit inline in a
`TagField` and sets of enum values in a `CheckboxGroup`, at the top level
and inside forms (KF-A9ZHGW: inline list editors); unchecking or removing
the last one unsets the prop, and a value they cannot hold (a number, a
string outside the set) keeps the JSON field. Icon data (a prop or field
marked `iconSource: "lucide"`, such as a LucideIcon's `icon` or a Select
choice's `icon`) shows as a row with the chosen icon and its name and opens
the icon picker (KF-VYRDDQ: icon picker), a dialog with a search over the
Lucide names and the matching icons themselves. An exact name ranks first,
then names with a matching word; at most 96 show at once. Choosing one
writes `{ $icon: name }` (the kebab-case name, or the export's camel case
for the few Lucide names that do not split back), and **Remove icon**
unsets it. A list of objects or of union items (a Select's `choices`, a
PopupMenu's `items`, a Combobox's `suggestions`) opens the list editor
(KF-CY1D5W: list editor): one `ListActionRow` per item, labeled from its
`label`, `name`, `title`, `value`, `key`, or `id` (a divider by its kind),
that opens the item's form, with a Remove action and drag or
Alt+Shift+Arrow reordering. **Add** appends an item numbered after the list
("Choice 4"); a union list's **Add ▾** menu offers each member, named by its
literal kind or its type name ("Item", "Heading", "Divider"; "Text" for a
string), and its rows name the member. A text item edits in a text field,
and clearing it keeps the item. A list and its item form are a
sub-selection, so the list opens in a dialog unless its items have at most
3 fields and nothing nested (a Slider's `ticks`), which push in the
Inspector. A list whose items no form edits (an application's `number[]`)
keeps the JSON field.

Add a child's Component choice (KF-N8TW04: zone suggestions) lists the
components the zone's name suggests first, under Suggested (an `icon` or
`…Icon` zone suggests LucideIcon, a `badge` zone Badge), and starts on the
first of them; the rest follow grouped by palette category. Changing the
zone starts the choice over.

A content prop that takes only nodes and is not the main `children` zone
(a Button's `icon`, a ListItem's `trailing`; KF-5T3TE4: content rows) is a
Properties row: empty, it adds the component the zone calls for (its
first suggestion, or the only component it accepts) and selects it, or
opens Children on that zone; filled, it names what fills it and selects
it.

Inspector rows follow the section's prop order, whatever control each
takes (KF-DQFXWG: LucideIcon inspector): an icon or Configure row sits
where its prop does rather than after every text field. Choosing an icon
also sets a string `name` prop beside it (a LucideIcon's) while that name
still follows the icon: unset, the old icon's name, or the seeded default.
The node's own name field reads "Ref name".

An application registers its own editor for a named type (KF-EXA2WH: field
editor API) with `createEditor({ fieldEditors })`, or with the Vite plugin's
`fieldEditors` module (default `src/kerf-ui-field-editors.ts`). An editor
matches a prop or field whose type is that `ref` (a catalog definition such
as `ListConfig`, or the app's own `ShippingWindow`), at the top level and
inside forms, and replaces the type-driven form there; Edit as JSON, Reset,
and Fill with example stay around it. Its `render(context)` receives the
value, its type and definitions, and `commit`; `set(next)` with `setAction`
makes a preset button, `control(path, kind)` makes its own control commit a
field on `change` as the Inspector's do, and `form(path?)` composes the
type-driven form. An optional `wire(root, context)` wires its own events,
reading the open value's context. Its `container` names where it opens, and
the type-driven rule decides otherwise.

In the editor, every content field inside a prop value a node sets is a
zone of its own (KF-PD6QC5: field zones): a Workbench's `leftRail › content`
once the rail has a kind, `mainToolbar › title` once the toolbar is
configured, each NavStack view's `views › 0 › content`. Add a child, drag
and drop, and the outline treat it like any zone, and the outline names it
by its path. Nodes placed there own the field: a seeded item slot or text
at that path gives way, and an object left with no other field stays set
as `{}`, so the rail still reads as a static panel.

The props catalog generator (KF-24G2KV: remaining props) treats a union whose
members are all content, text, or numbers as one content slot, including
one a component's variants assemble (a Chip's `children`, a ListHeader's
`actionIcon`), so those edit as text or nodes. Inline object types keep
their fields five levels deep (a pane config's `compactChromeOpen`), and a
record (a `data-*` map inside a value) edits as typed JSON. Props whose
values are functions or signals (`SearchField.model`) stay read-only until
the param grammar can carry app-supplied values (KF-H3CB2P), and Web
Awesome props the catalog types as `unknown` are out of the editor's reach,
which places Web Awesome only through Kerf wrappers.

A function, signal, or model prop (a Select's `renderSelected`, a
SearchField's `model`) is read-only in the Inspector until **Promote to a
param** makes it a prop-typed param (KF-H3CB2P). The canvas previews it with
a placeholder that does something typically useful, or nothing: Kerf UI's
render a choice's label and give a SearchField a working model with no
rules. A host adds or replaces them with
`createEditorCatalog({ placeholders })`, keyed `<component key>.<prop>`; an
optional prop with no placeholder is left out of the preview. Promoting a
list, object, or record prop (a Select's `choices`) makes a prop-typed param too, keeping its current literal as the default (KF-V9V2B6: list and object params).

The inspector's Control flow section (KF-90GTJN: editor control flow) shows a
node only while a true/false param or item field holds (Show, which wraps the
node in `$if`), repeats it for each item of a list param or in-scope list
field (Repeat for each, which wraps it in a keyed `$each` with a suggested
item name and key; renaming the item rewrites the row's bindings), and adds a
`$slot` to the chosen zone under Add a child. The slot is declared in `slots`
when new, and inside a repeated row it can take the row's item as its input.
A selected slot sets its declared inputs from the params and items in scope,
and deleting the last use of a slot drops its declaration. A slot is selected
from its outline row or its canvas placeholder (ringed like a node; KF-5RKX3W:
slot selection and moves), and moves like a node: the Inspector toolbar's
Move up, Move down, and Delete, or dragging its outline row. Choices are the
sources `validateView` accepts, conditions and repeats show in the outline
(`if showEmpty`, `for each item in items`), slots are outline rows of their
own, and every change is undoable. To repeat a component, add it, then choose
its list. A conditional node also chooses what shows **otherwise** (KF-5S56VQ:
else branches): a component the zone accepts goes in the `else` branch (the
outline reads `unless showEmpty`), and Nothing removes it. A node in either
branch edits the shared condition and its own repeat; choosing Always on a
two-branch condition keeps both nodes as plain siblings. A node under a
nested `$if` keeps its control flow in the file.

A css-value prop's field takes any `$css` builder call, compositions
included (`calc(plus(px(8), space("m")))`, `lengthVar("--app-gap", px(8))`);
its hint lists the builders the prop accepts (the catalog's `cssValue.helpers`)
and an outer builder outside that list is refused at the field, naming the
allowed ones (KF-YR91FA: richer value editing). A prop whose catalog entry
names no builders gets a placeholder and hint for its grammar (KF-PE0PTT:
grammar examples): a color suggests `uiColor("surface-raised")`,
`fillColor`, or `colorVar`, a text color `uiColor("success-on-quiet")`,
`foregroundColor`, or `foregroundColorVar`, a flex `flex(1)`, and anything
else a length.

A typed choice (KF-3CKTKN: choice controls) edits a union of scalars (a
Badge's `size`, a LucideIcon's `size`, a Button's `badge`, a Select's
`value`), an enum of numbers or booleans (a `headingLevel`, a `tabIndex`),
or an optional lone literal (a List's `selectionMode`) with one Select. Its
fixed values (literals, enum values, `true` and `false`) keep their type, so
a heading level is `2`, not `"2"`. A text, number, list, or object member is
an option of its own ("Text…", "Number…", "List…", "Custom…") that starts
from a placeholder and shows that member's control or form beneath the
Select. A required lone literal is a fixed discriminant and stays
read-only, as does a union with a member no control edits (rendered
content).

A union of object types (KF-907BXY: object members), such as a Workbench's
`leftRail`, `rightRail`, or `bottomDrawer` (a static or a navigation panel),
names each member by its type less the words the members share ("Static
panel…", "Navigation panel…"). Choosing one starts it from its placeholder
(a static panel's `content` as an item slot named after the prop,
`leftRailContent`) and keeps the fields the old member shared with it (a
panel's `label` and `size`), and its Configure row edits that member's
form. A member is told from a value by the fields it forbids: a panel with
`navStack` is a navigation panel. A form leaves those forbidden (`never`)
fields out. A size prop, a union of a
css-value with keywords (a List, Row, or Grid `gap`, a layout `flex`, a
Spacer or Skeleton `width`/`height`, a dialog `height` of `"viewport"`),
gets a Select of its keywords, with spacing tokens in scale order (`none`,
`2xs` … `xl`), `true` when the union takes a boolean, and **Custom…**, which
shows that builder field beneath it (KF-Q5AXNP: first-class size editing). A
`{ column, row }` gap edits as JSON. A text-accepting content prop
(a Button's label) holds either text or nodes in its zone, never both: **Use
as nodes** moves the text into a `#text` node so components can sit beside
it, adding a child to that zone does the same first, and **Use as text**
moves a zone that is one text run back. While the zone holds nodes, the field
says how many and points to the outline.

Nodes move by dragging outline rows (KF-WXP6AB: drag placement): a node that
sits directly in a zone drags before or after another node, slot, repeated
row, or conditional node (landing beside the whole repeat or condition), or
inside a node (appending to its first zone that takes it). A line at the
target's label edge or a ring around the target shows where it will land,
and only drops `validateView` accepts show one. The inspector's **Move to**
picker is the keyboard alternative: it lists every zone the node can move to
the end of, beside the existing Move up and Move down. Nodes and slot
placeholders also drag on the canvas (KF-CWDE93: canvas drag): past a few
pixels, a press becomes a drag; the innermost node or slot under the pointer
is the target, before, after, or inside is read along its parent's flow (left
to right in a row), and a line or ring drawn over the canvas shows a legal
drop. Pressing a repeated row drags the list it repeats in, Escape cancels,
and the click that ends a drag does not change the selection. Near a
target's edge, before or after comes first and inside is the fallback, so a
container that nothing can sit beside (the root) still takes a drop. Inside
fills the node's main zone first, the one its `children` render into (a
Pane's content, not its header; KF-W10DXQ: primary zone), then its other
zones in order; Add a child starts on the main zone too. A container
whose main zone holds nothing and whose `children` prop is unset previews
with a placeholder in that zone (KF-ZWJHJR: empty containers), "Row is
empty — drag a component here", so it has a size to see, select, and drop
into; it is canvas-only and never enters the document.

Each rail switches between focus areas with a segmented `TabBar` under its
toolbar (KF-MHY1GB: rail areas). The Document rail shows Outline, Components,
or Problems (with a count badge while there are any, and "No problems"
otherwise); its tabs take their own widths so the names fit. The Inspector,
for a selected node, shows Properties (name, props, promote, bind; each
field labeled in sentence case from its prop name, KF-7M4XQR: readable
labels, so `controlInsets` reads "Control insets"), Flow
(Show, Otherwise, Repeat, Move to), or Children (Add a child, slots); a
component, a slot, or an empty selection shows its single view without tabs.
Each panel is a `tabpanel`; hidden panels stay rendered, so a field keeps its
state while another area shows. The Inspector's area persists across
selections, except that a node just added (from Add a child or the palette)
opens on its Properties. Arrow keys move between tabs (`wireTabBars`).
Components opens with a **Filter Components** `SearchField` (KF-Y26SKM:
palette filter): typing keeps the components whose name or category holds
the text, case-insensitively (a category match keeps its whole group), drops
groups left empty, and shows "No matching components" when none match; its
clear button lists them all again and keeps focus in the field.

Components drag from the palette onto the canvas the same way (KF-78MHM8:
palette drag). The dragged component is a new node with its required props
seeded, as Add a child makes it; `insertPlacement` asks the validator where
it may land. Only placement problems block it (a parent the component may
not sit in, a full zone, a binding out of scope): the new node's own unfilled
required props, unmatched variants, and empty required zones are accepted,
as Add a child accepts them, and Problems then lists them (KF-DC23E9). It joins the document's catalogs when it comes from another
package, and the drop selects it. A drop on the canvas's blank space lands
inside the document's root, which is how an empty document gets its first
node (an empty Pane has no height to hit). A click without a drag still shows
the component's documentation.

While a drag is under way (KF-Y4GHQV: drag feedback), a solid `Badge` chip
naming what is dragged (the component, or the node's outline label) follows
the pointer, and the line or ring carries a caption saying where the drop
lands: "Before folderList", "After folderList", or "Inside Pane", plus
"› zone" when the target has more than one zone. The caption rides the line,
or the ring's top edge, at its far end, where row content rarely sits; for a
line in a row it sits under the line's foot. A node moved on the canvas dims
in place. A line before the first node, and a caption near the top, stay
inside the canvas rather than on its clipped edge. Dropping, Escape, or a
cancelled pointer clears all of them. A drag also drops on the outline's rows (KF-67K2VP: outline drops), with
TreeList's own before, after, and inside indicator through
`treeListExternalDrop`, and resting on a Document tab for half a second opens
it (spring-loading), so a drag from Components reaches Outline. The Document
rail's tab strip is pinned under its toolbar (the rail Pane's `header`), with
the scroll divider once its area scrolls, so the tabs stay in reach anywhere
in a long palette. The Inspector pins a node's title and its Properties, Flow,
and Children strip the same way (KF-5QXNWS). Add a child stays the keyboard path.

The canvas preview is rendered and test-mounted outside the editor's own
render (KF-P6FPG2: preview containment), so a document whose preview fails
when mounted, such as one that nests a Button in a repeated row's
description and makes the HTML parser split the row, shows "This document
cannot be previewed" with the reason while the rest of the editor keeps
working. The validator does not yet reject that nesting (KF-0P9WWB). The implementation
tickets are listed in [§10](#10-implementation-plan).

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
- A **field zone** (KF-PD6QC5: field zones) is a key that names a content
  field inside a prop value: the prop, then field names and list indexes,
  dot-separated (`leftRail.content`, `mainToolbar.title`,
  `views.0.content`). The path follows the prop's type through refs, union
  members, objects (never a field the type forbids), and lists, and must end
  at rendered content. Its nodes render into that field: `interpretView`
  and the generated module put them in the prop value
  (`leftRail: { label: "Folders", content: List(…) }`), and validation
  checks the prop as if the field held them, so a required content field a
  zone fills is present, and a zone alone makes a static rail. A field zone
  and a value at the same path (`{ "$slot": … }`, text) clash (`KUI-V003`),
  as does a field zone under a bound prop.

### 3.3 Prop values

| Form                       | Meaning                                                                                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSON literal               | String, number, boolean, null, or an array/object of literals, checked against the prop's type descriptor.                                                                                                                            |
| `{ "$param": "title" }`    | The value of a document param. The param's type must be assignable to the prop's type.                                                                                                                                                |
| `{ "$bind": "item.x" }`    | A dotted path into an in-scope `$each` item (or into a param). Scope is lexical: only the enclosing templates' `as` names and params resolve.                                                                                         |
| `{ "$action": "name" }`    | Only on string props the catalog identifies as action names (`action`). Declares a member of the action union (§4.2).                                                                                                                 |
| `{ "$css": "space('m')" }` | Only on `css-value` props: a call to one of the prop's allowed `cssValue.helpers`, never a raw CSS string. Generated verbatim with its import.                                                                                        |
| `{ "$icon": "inbox" }`     | Only on props whose descriptor has `iconSource: "lucide"` (`LucideIcon.icon`): a kebab-case Lucide icon name. Generated code imports it from `lucide`, aliased as `lucideInbox`; `interpretView` takes the data from `options.icons`. |
| `{ "$slot": "homeView" }`  | An item slot: only at a content-typed position inside a prop value (a list item's or object's content field, such as a NavStack view's `content`). The application fills it like a zone's `$slot` (§3.6), but it passes no input.     |

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
- An item slot (KF-SXDM56: item slots) is the way to put
  application-filled content inside a list or object value; a field zone
  puts document nodes there, such as a NavStack view whose
  `content` is `{ "$slot": "homeView" }`. It needs no `slots` declaration, a
  slot declared with an `input` cannot be used there, and anywhere but a
  content-typed position it is a type mismatch (`KUI-V004`). The contract,
  the generated `<Name>Slots`, and `interpretView` treat it as any other slot:
  generated code calls `slots.homeView()` in place. The editor seeds one for
  each such field of a new node (`view1Content`, unique within the document)
  and lists it in the outline under its node.
- A prop typed as Lucide icon data (`LucideIcon.icon`) is named with `$icon`,
  never spelled as a nested array literal. The CLI does not check names; an
  unknown one fails the consumer's `tsc` on the generated import.
- Object literals are checked against the prop's shape. An index signature
  (`rootAttributes`' `data-*`) allows only keys with its prefix, and protected
  markers stay rejected.

### 3.4 Params

`params` maps a camelCase name to `{ type, default?, description? }`. `type` is
a descriptor in the component-props type grammar (`string`, `number`,
`boolean`, `enum`, `content`, `array`, `object`). A param with no default
becomes a required input. `content` params are application-rendered `SafeHtml`.

A **prop-typed param** (KF-H3CB2P: app-supplied values),
`{ "kind": "prop", "component": "@kerfjs/ui:select", "prop": "renderSelected" }`,
has exactly the type of one catalog component's prop. It carries a value a
document cannot spell, such as a function, a signal, or a SearchField
model:

- **Typed from the component.** The generated module types the input as
  `Parameters<typeof Select>[0]["renderSelected"]`, read from the component
  function it imports, so the application's value is checked against the
  real interface.
- **Required when the prop is.** The input is optional exactly when that
  prop is optional in the catalog.
- **Bound to that prop only.** It binds only to that same prop of that
  component (`KUI-V004` otherwise), and it takes a default only when it is a literal of that prop (a list of choices, never a function; KF-V9V2B6).
- **Passed through.** `interpretView` passes the value through untouched.

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
patches markup, which keeps the styling and ownership contract intact.
`component-props.json` records each component's `dataChannel`:

- `rootAttributes` for 76 Kerf UI components, which filter their own markers
  out of it;
- `native` for `Text` and `FieldLabel`, which pass `data-*` through;
- `none` for `CollapsiblePanelRelocated` alone, which renders a fragment and
  has no single root (KF-PYR8XZ: component data channels).

A component with no channel cannot be named, and selection on the canvas falls
back to its nearest marked ancestor.

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

`readViewHeader(code)` parses all three and reports `intact`: the body must
match its digest, and the contract line must match the contract digest, so
editing either one is detected.

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

### 5.3 Catalog discovery

`kerf-ui-view` loads `@kerfjs/ui`'s catalogs plus every package catalog that
the `.kerf-ui-profile.json` layers above a document declare: the
`composition` catalog, and the `props` (`component-props.json`) location
(KF-S61KAT: profile discovery). Paths resolve relative to the profile file
that declares them. A component package writes its prop catalog with
`kerf-ui-props`. `--props` and `--composition` add catalogs explicitly, and
`--no-profile` turns discovery off. A component that lives in app source rather than a package (no export
declarations) is read from its composition entry's `source` file, using the
app's `tsconfig.json`. Its catalog `import` is root-relative
(`./src/order-card.js`); the CLI makes it absolute when loading the catalog,
and `generateView`'s `importFrom` writes it relative to each document
(KF-7JP509: app-source prop catalogs).

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
- Size is gated by `npm --prefix ui run check:view-bundle`, which is part of
  the ui `check` (KF-CTCNWJ: view bundle budget). Budgets live in
  `ui/view-bundle-budget.json` and ratchet: an entry more than 350 B under
  budget fails until the budget is lowered. As of 2026-10-28, measured
  minified + gzip with `kerfjs` external: `interpretView` 9,687 B and
  `validateView` 6,657 B. The gate also fails if the interpreter entry ever
  includes the generator.
- `previewView(document, { …, broken, placeholder })` is the editor's lenient
  counterpart (KF-F355BF: best-effort preview). It skips validation and the
  contract check. Each node in `broken` (the node ids the editor's problems
  list maps to), and each node whose rendering throws, renders the caller's
  placeholder instead, so one bad node never blanks the canvas. Applications
  never use it: interpretView's strictness is what protects a deployed client.
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
| `KUI-V013` | `$icon` on a non-icon prop, a malformed icon name, or (given `icons`) an unknown one                                                   |
| `KUI-V014` | A control, link, or component that renders one, at any depth in the zones of a component whose root is a control or link               |

`KUI-V014` reads each composition entry's `content.interactive` rules, which
the selection catalog declares and `catalog:sync` projects. A `root` rule
means the component renders a native control or link (`button`, `a`, `input`,
`label`, and so on) as its root; a `contains` rule means it renders one inside.
HTML forbids interactive content inside interactive content, so the parser
splits such a host (a Button in an actionable ListItem's `trailing`) and the
row contract throws. The check follows `$if` and `$each` and passes through
non-interactive wrappers. `whenProps` turns a rule on only when one of its
props is set (a Chip is a `<button>` only with `action`), and a bound value
counts as set. `content.exports` gives an additional JSX export its own rules
(`ListItemLink`, `FieldLabel`). A `#view` inside a host is validated with that
host in force, so a composed document whose content is a control is reported
at its own path. A `$slot` and a component whose catalog declares no rules are
not checked. The `ui-composition` lint reports the same placement in JSX as
`KUI-L205`, from the same rules. Because the editor's drops and
Move to accept only placements the validator accepts, they stop offering
these places as well.

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
5. **Done:** `kerfjs/no-generated-view-edits` ESLint rule, in `recommended` at
   `error` (§5.2; KF-BD3ZHQ: no-hand-edits lint rule).
6. **Done:** a `data-*` channel (`rootAttributes`) for every component with a
   single root, recorded as `dataChannel` in `component-props.json` (§4.5;
   KF-PYR8XZ: component data channels).
7. **Done:** the private `editor/` package (KF-4NRZCV: editor scaffold), with
   a problems list (KF-WC0ZG3), export and compare (KF-Y38YRT, KF-9J810J), and
   inspector editing with undo (KF-KX77TV: editor editing), and bindings
   (KF-K5TKCV), control flow (KF-90GTJN), richer value editing (KF-YR91FA),
   and outline drag-and-drop with a Move to picker (KF-WXP6AB).
