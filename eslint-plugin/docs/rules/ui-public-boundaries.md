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

String class values are inspected in `class` / `className` literals and in a template literal's static, whitespace-delimited names (``class={`kui-content-item ${extra}`}``); a name an interpolation completes (`` `kui-toolbar-${size}` ``) is not known and is skipped.

The rule reads `@kerfjs/ui/ai/component-composition.json` by default. See the plugin README for alternate catalog settings used by monorepos and package authors.
