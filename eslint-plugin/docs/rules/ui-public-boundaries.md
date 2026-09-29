# `ui-public-boundaries`

Rejects `kui-*` classes and `--kui-*` custom properties that are not listed in the versioned composition catalog, and cataloged component classes written onto elements the application owns. This keeps application code out of private component anatomy while allowing cataloged styling seams.

Diagnostics are stable: `KUI-L101` identifies a private/unknown class, `KUI-L102` an unknown token, and `KUI-L103` a component's anatomy class placed on an application-owned element. Exact profile exceptions can name any of these ids. The rule deliberately does not rewrite selectors, tokens, or markup because there is no generally safe replacement.

## Component anatomy on your own element (`KUI-L103`)

A public class such as `kui-toolbar` or `kui-pane__content` is the rendered anatomy of a component. Writing it onto your own element recreates the component by class: the element inherits (and invites you to restyle) the component's CSS without its props, behavior, accessibility, or future fixes. Components own their styles; render and configure them instead.

```tsx
<div class="kui-toolbar">…</div>                        // KUI-L103: render `Toolbar`
<aside class="kui-pane"><nav class="kui-pane__content"> // KUI-L103: render `Pane`
<wa-dropdown class="kui-popup-menu">…</wa-dropdown>     // KUI-L103: render `PopupMenu`
<Text class="kui-toolbar-text" />                       // KUI-L103: render `ToolbarText`
<div class="kui-content-item">…</div>                   // KUI-L103: render `ContentItem`
```

The catalog marks the classes an application may place with `boundaries.placeableClasses`; these stay allowed:

```tsx
<div id="app" class="kui-app-root" />                   // document root
<main class="kui-content kui-scroll-owner" />           // layout utilities
<footer class="kui-control-cluster kui-content-item" /> // item geometry on a non-div carrier
<Toolbar className="kui-toolbar" />                     // a component's own element
```

A placeable class can still be a component's own root. When a catalog entry names the `boundaries.rootElement` its component renders around its placeable classes, a plain element of that tag carrying them is the component recreated and is reported: `<div class="kui-content-item">` is exactly what `ContentItem` renders. The class stays placeable on any other carrier — a `<ul>`, a `Text`, or a control-cluster `<footer>` that must carry the geometry itself. `@kerfjs/ui`'s own `check:guidance` derives its repository check from the same catalog fields, so the two cannot disagree.

The component a diagnostic names is the export named after the class's block, tried from the whole block down to its last word (`kui-toolbar-action-link` → `ToolbarActionLink`, `kui-pane__content` → `Pane`, `acme-meter__bar` → `Meter`), else the entry's own component, else every component the entry exports. That rule ships once, as `@kerfjs/ui/ai/component-class-owners.cjs`; the rule loads it beside `application-ui-profile-sync.cjs`, and `@kerfjs/ui`'s generated `ai/components/*.md` pages render their "render X instead" lines from the same file, so the lint message and the component reference always name the same component. An `@kerfjs/ui` too old to ship it fails the contract load (`KUI-L090`) rather than guessing.

## Component packages

`KUI-L103` is not limited to `kui-*` classes. Every application or third-party composition catalog your `.kerf-ui-profile.json` declares under `catalogs` contributes its entries' public classes the same way: an `acme-meter` class on your own `<div>` is reported with the package's component to render (`Meter`), its `boundaries.placeableClasses` stay allowed, and its `boundaries.rootElement` reports a placeable class on a plain element of the tag the component renders. Component packages declare these fields in `kerf.components.json`; see the component-packages guide (`docs/13-component-packages.md` §13.7). The first catalog to list a class owns it, so `@kerfjs/ui`'s catalog wins over a declared one. `KUI-L101` (private/unknown class) still applies only to `kui-*` names.

String class values are inspected in `class` / `className` literals and in a template literal's static, whitespace-delimited names (``class={`kui-content-item ${extra}`}``); a name an interpolation completes (`` `kui-toolbar-${size}` ``) is not known and is skipped.

The no-build `kerfjs/html` tagged template writes the same markup without JSX, so its `class` attributes carry the same `KUI-L101` / `KUI-L103` contract. The rule reads the template's static parts by the runtime's own rules: a complete static value (`class="kui-pane"`, `class='…'`, or unquoted) counts, tag and attribute names are case-insensitive, and the element is the tag the markup names, so a plain `<div class="kui-content-item">` is `ContentItem` recreated there too. A hole is a whole attribute value (`class=${cls}`), so the class it supplies is unknown and skipped; comments, text, and tags or attributes whose name is a hole are not inspected. Only the `html` tag imported from `kerfjs/html` (by name, alias, or namespace) is read.

```ts
import { html } from 'kerfjs/html';
html`<aside class="kui-pane">…</aside>`;          // KUI-L103: render `Pane`
html`<div class="kui-content-item">…</div>`;      // KUI-L103: render `ContentItem`
html`<ul class="kui-content-item">…</ul>`;        // allowed: placeable on a <ul>
html`<aside class=${paneClass}>…</aside>`;        // not inspected: the value is a hole
```

The rule reads `@kerfjs/ui/ai/component-composition.json` by default. See the plugin README for alternate catalog settings used by monorepos and package authors.
