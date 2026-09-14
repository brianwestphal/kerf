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

## 22.3 Build and development contract

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

Prettier owns readable CSS layout. Run `npm run format:css`; `npm run check`
rejects formatting drift, malformed `remify()` calls, or build/demo CSS that
still contains the authoring function.

## 22.4 Verification

- Unit tests cover exact conversion, declaration and at-rule use, ignored
  strings/comments, and actionable failures for unsupported arguments.
- Consumer-bundle tests prove public CSS resolves from `dist/styles`, contains
  ordinary `rem`, and never exposes `remify()`.
- The production catalog build rejects an untransformed function in emitted
  CSS; the browser suite continues to guard component geometry and behavior.
