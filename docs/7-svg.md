# 7. SVG

SVG inside JSX works without ceremony for the common case (a JSX subtree with `<svg>` as the root tag). The HTML5 parser recognises `<svg>` and switches to "foreign content" mode for its descendants, applying the SVG namespace correctly.

```tsx
mount(rootEl, () => (
  <svg viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="40" fill="blue" />
    <path d="M 0 50 L 100 50" stroke="red" />
  </svg>
));
```

The above renders correctly. morphdom diffs SVG attributes (`d`, `r`, `fill`, `transform`, …) just like any other attributes.

## 7.1 The orphan-fragment edge case

The naive parser path breaks for SVG fragments WITHOUT an `<svg>` wrapper:

```ts
const path = '<path d="M 0 0 L 10 10" />';
const t = document.createElement('template');
t.innerHTML = path;
const el = t.content.firstElementChild;
// el is HTMLUnknownElement, not SVGPathElement.
// el.namespaceURI is "http://www.w3.org/1999/xhtml", not the SVG namespace.
// Appending el to a parent <svg> doesn't paint.
```

You hit this when:
- Generating an SVG fragment server-side and inserting it into an existing `<svg>` parent.
- Building reusable SVG icon helpers that return just a `<g>` group.
- Composing SVG fragments dynamically.

## 7.2 The fix: `toElement()`

`toElement(jsx)` from kerf detects SVG content and routes through `DOMParser` with the `image/svg+xml` MIME, which guarantees correct namespacing for all descendants:

```ts
import { toElement } from 'kerf';

const path = toElement('<path d="M 0 0 L 10 10" />');
//   ↑ now an SVGPathElement, namespaced correctly.

const svgRoot = document.querySelector('svg')!;
svgRoot.appendChild(path);   // paints correctly
```

## 7.3 What `toElement` does in detail

1. Looks at the leading tag of the input.
2. **`<svg>` root** → parses via `new DOMParser().parseFromString(html, 'image/svg+xml')` and returns the document element. All descendants inherit the SVG namespace.
3. **SVG fragment without `<svg>` wrapper** (any of `g`, `path`, `circle`, `rect`, `line`, `polygon`, `polyline`, `ellipse`, `text`, `tspan`, `defs`, `use`, `symbol`, `clipPath`, `mask`, `pattern`, `filter`, `marker`, `linearGradient`, `radialGradient`, `stop`, `image`, `foreignObject`) → wraps in `<svg xmlns="...">`, parses, and returns the first child. Caller is responsible for parenting it inside an existing `<svg>` to render.
4. **HTML** → uses the standard `<template>.innerHTML` path.

## 7.4 When you need `toElement` vs. when `mount` is enough

- **`mount()` is enough** when your SVG has an `<svg>` root tag in the JSX. The HTML5 parser handles namespacing inside foreign content.
- **`toElement()` is the escape hatch** for direct DOM construction OR for SVG fragments inserted ad-hoc into an existing `<svg>`.

If you're not sure which you need, default to `mount()`. The vast majority of SVG icon and chart use cases work fine without `toElement`.

## 7.5 Other namespacing quirks (HTML5 parser oddities)

A handful of theoretical edge cases that the AST-based approach in some other reactive libs handles but kerf doesn't, in exchange for a simpler runtime:

- Custom-element `is="..."` attributes inside `<table>` / `<select>` parents have parser-quirk handling that depends on the surrounding context. Rarely a problem in practice.
- Whitespace-only text nodes between sibling elements are sometimes normalised by the parser. Same — rarely matters.
- `xlink:href` requires the alias config the JSX runtime already provides (`xlinkHref`).

If you hit one of these, file an issue — they're fixable as a more complete `toElement` if there's demand.
