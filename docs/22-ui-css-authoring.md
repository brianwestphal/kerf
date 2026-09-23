# 22. Pixel-first CSS authoring for `@kerfjs/ui`

**Status: shipped.**

The `@kerfjs/ui` source styles use a small build-time `remify()` function so
component geometry can be designed and reviewed in pixels while the published
CSS retains root-relative sizing.

## 22.1 Syntax and baseline

`remify()` accepts one numeric pixel literal and divides it by the fixed 16px
root baseline:

```css
.example {
  gap: remify(17px);
}
```

The built CSS is standard CSS:

```css
.example {
  gap: 1.0625rem;
}
```

Integer, decimal, signed, and zero values are supported. The conversion uses
decimal arithmetic rather than floating-point formatting, so authored values
such as `remify(5.6px)` produce exact, stable output. Expressions and other
units are deliberately rejected: write `remify(17px)`, not
`remify(calc(...))`, `remify(var(...))`, or `remify(1em)`.

The 16px denominator is an authoring convention, not a claim that the browser's
root font size is always 16px. The emitted `rem` remains relative to the actual
root font size at runtime, preserving user and application scaling.

## 22.2 When to use it

Use `remify()` for dimensions that should participate in root-relative UI
scaling: spacing, control sizes, radii, typography, and layout thresholds. Keep
literal pixels where a physical CSS pixel is intentional, such as a 1px border
or hairline. Keep the occasional `em` explicit because it is intentionally
relative to the current element's font size and cannot be converted from a
global baseline.

## 22.3 Runtime component values are a separate API

`remify()` is source-CSS syntax only. Runtime component props use the CSS-free
`@kerfjs/ui/css-values` JavaScript subpath. It exports opaque primitive-string
brands plus deterministic builders:

```ts
import { calc, flex, pct, plus, rem, space, uiColor } from "@kerfjs/ui/css-values";

space("xs"); // var(--kui-space-xs)
rem(0.25); // 0.25rem
calc(plus(rem(0.25), pct(10))); // calc(0.25rem + 10%)
flex(2, 1, rem(20)); // 2 1 20rem
uiColor("success"); // var(--kui-color-success)
```

`CssLength` pragmatically includes percentages for dimension-valued UI props.
`CssLengthExpression` is deliberately not a complete value: `plus()` results
must pass through `calc()` before a component accepts them. The API also offers
`px()`, `em()`, and a restrictive `lengthVar('--app-token', fallback?)` helper.
All numeric builders reject non-finite input and normalize negative zero. These
brands are authoring correctness tools, not sanitizers; no broad raw-string
constructor is exposed.

The public props keep CSS property grammars separate. `List.gap` accepts boolean default spacing, direct
`UiSpaceName` shorthands (`none`, `2xs`, `xs`, `s`, `m`, `l`, `xl`), or a
complete `CssLength`; `List.flex` accepts its boolean default, finite keywords,
or `CssFlex` from `flex()`. `Skeleton.width`/`height` accept typed lengths and
finite intrinsic-size keywords, while `radius` accepts only `CssLength`.
`SelectChoice.color` accepts `CssColor` from `uiColor()` or restrictive
`colorVar()`. Media-query strings remain a separate grammar, and semantic pixel
props remain numbers. Raw CSS string compatibility and row-level `style`
declarations were intentionally removed before 5.0 stable so invalid or
cross-property values fail at typecheck time. Use row `className`, public
tokens, and cataloged props for styling.

## 22.4 Build and development contract

Component author styles live in `ui/src/*.css`; catalog-only styles may use the
same syntax under `ui/ux-demo/`. The PostCSS plugin in
`ui/scripts/remify-css.mjs` transforms declarations and at-rule parameters.
`ui/scripts/build-css.mjs` writes publishable component styles to
`ui/dist/styles/`; package CSS exports and generated browser entry wrappers
refer only to those compiled files. Component author CSS is not included in the
npm package. The copyable recipe source under `ui/ux-demo/recipes/` remains
ordinary CSS because it is deliberately included in the package for consumers.

The UX catalog's Vite configuration resolves package CSS imports back to the
author files and applies the same transform. Consequently `cd ui && npm run
dev` watches CSS edits and updates the catalog through Vite HMR, while
`npm run demo:serve` remains a preview server for an already-built catalog.

Prettier owns readable source layout. Run `npm run format` for the whole UI
package or `npm run format:css` for style-only work; `npm run lint` and
`npm run check` reject formatting drift, malformed `remify()` calls, or
build/demo CSS that still contains the authoring function.

## 22.5 Verification

- Unit tests cover exact conversion, declaration and at-rule use, ignored
  strings/comments, and actionable failures for unsupported arguments.
- Consumer-bundle tests prove public CSS resolves from `dist/styles`, contains
  ordinary `rem`, and never exposes `remify()`.
- The production catalog build rejects an untransformed function in emitted
  CSS; the browser suite continues to guard component geometry and behavior.
- Source and packed-consumer compilation distinguish complete lengths from
  expressions; unit tests cover deterministic serialization and invalid input;
  browser coverage resolves direct and helper-built List gaps through real CSS.
