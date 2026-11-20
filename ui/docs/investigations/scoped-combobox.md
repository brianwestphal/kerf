# Scoped Combobox pilot

Retain the public `Combobox` and `wireComboboxes` entries. Use the typed
[scoped recipe](../examples/scoped-combobox.ts) as a reference for applications
that dynamically add fields with independent callbacks. It makes the seed and
callback lifetime explicit and costs 403 additional gzip bytes in the measured
one-field app. A single-field consumer already gets the same listener count with
less source. A browser reproduced duplicate commits when the two wiring styles
were mixed. Resolve that ownership ambiguity before adding an API to the package
(KF-Z9RA3T).

## One field, two authoring patterns

The current public recipe captures the initial string in its surrounding
function. Each additional field routes through the common commit callback.

```ts
const unmount = mount(root, () => Combobox({ id, value: initialValue, ...props() }));
const release = wireComboboxes(root, { onCommit: handleCommit });
// On teardown
release();
unmount();
```

The scoped example registers a field outside the repeating render. Dynamic
suggestions, accessible names and hints still belong in the render. The caller
can locally determine which callback receives each field's commits.

```ts
const owner = createComboboxOwner();
const tag = owner.field({ id, initialValue, onCommit: addTag });
const unmount = mount(root, () => tag.render(props()));
owner.connect(root);
// On teardown
owner.dispose();
unmount();
```

## Ownership and limits

- A registration captures its seed once and owns one callback. A surviving
  input retains its draft through focused and blurred renders. Form reset
  uses the captured seed. Re-register after removal to take a new seed.
  The server renders escaped text with no host, global registry or document.
- Use one owner per mounted application root and document-unique HTML ids.
  Multiple nested feature components use the same owner and can register
  independently. An ancestor/descendant or second same-host connection
  throws before installing. Sibling roots operate independently. The
  overlap check consults ancestors and the proposed host's own subtree
  on connection. Keep the host outside the repeating render and dispose
  before reparenting a connected root.
- The owner fixes commit keys on creation. Every field uses that policy.
  A sibling root may choose different keys. Registrations accept field
  options only. Duplicate live IDs and renders from disposed handles throw.
  A stale disposer checks the registration's token before removal.
- Register before rendering. On removal, dispose a field while its input is
  connected, then remove its markup. The last field releases the installation.
  Disposing the owner clears registrations and releases all wiring. Dispose
  before unmount so focusout can close an open list and stop anchor tracking.
  A raw removal bypasses that ordering. The token protects field handles;
  it cannot distinguish stray live markup reusing a registered HTML id.
- Manual wiring delegates to every Combobox underneath its root and publishes
  no ownership marker. It can consume keys on unregistered fields, and installing
  it alongside an owner can invoke both callbacks. Keep a whole delegated
  region under one wiring style. Independently movable child applications or
  per-field delimiter sets need a stronger routing contract.

## Measurements

Production package browser conditions, ES2022 ESM, esbuild 0.25.12, Node
22.23.5, minified, gzip defaults. These bytes include a mounted app and its
component stylesheet dependencies. Run `node ui/docs/investigations/measure-scoped-combobox.mjs`
after building root and UI packages. The script contains the executable
before/after apps.

| Mounted consumer                    | JS bytes | JS gzip | CSS bytes | CSS gzip |
| ----------------------------------- | -------: | ------: | --------: | -------: |
| Manual Combobox                     |   66,258 |  24,595 |    19,343 |    3,803 |
| Scoped Combobox                     |   67,280 |  24,998 |    19,343 |    3,803 |
| Button only                         |   49,363 |  18,030 |    31,043 |    5,559 |
| Button plus an unused scoped import |   49,362 |  17,995 |    33,160 |    5,933 |

The last row is a deliberate unused import. esbuild removes the owner logic,
but the browser component entry includes a CSS side effect. This adds 374
gzip CSS bytes. A Button-only application that omits the import contains
neither Combobox CSS nor the recipe.

| Fields on one root | Live root listeners | Subtree observers | Removed listeners / disconnected observers after final release |
| ------------------ | ------------------: | ----------------: | -------------------------------------------------------------: |
| 1                  |                   5 |                 1 |                                                          5 / 1 |
| 50                 |                   5 |                 1 |                                                          5 / 1 |

Counts exclude anchor positioning for an open popover. The browser fixture
exercises sibling roots, nested fields, a late registration, pointer and
keyboard routing, a composing Enter, active-option restoration after reorder,
field removal and id reuse, native reset, and repeated disposal. The legacy
Combobox suite supplies the filtering and create-policy coverage. The Node
test renders escaped seeds independently without a browser global.
