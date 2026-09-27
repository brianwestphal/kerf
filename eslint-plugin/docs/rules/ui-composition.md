# `ui-composition`

Enforces composition facts published by the versioned UI catalog. `KUI-L201` reports a catalog component under a known, disallowed direct parent. `KUI-L202` reports a statically visible zone child—including an intrinsic or unknown JSX element—that is not one of the zone's cataloged `accepts` entries. `KUI-L203` reports a statically provable zone cardinality violation. A zone participates only when it declares an explicit `jsx.prop` binding, including `children`; the rule never guesses that a zone id is a JSX prop. Toolbar, Pane, TabBar, AppTab, feedback, search, and layout validation is therefore catalog-driven rather than duplicated in rule-local component cases.

The parent check is intentionally conservative about the child: it runs only for a child that resolves to a cataloged entry (or a declared wrapper's roots) whose parents are `listed`. Its direct JSX parent may be any element the rule can see: a cataloged component, a declared wrapper (which counts as each of its roots), an intrinsic element such as `<div>`, or an unresolved component, and any parent that is not a listed parent reports `KUI-L201`. Bound zone checks understand aliases, namespace imports, fragments, arrays, and conditional/logical branches, but expressions whose content cannot be resolved statically remain runtime and accessibility work. Accepted concepts that do not identify a catalog entry remain machine-readable guidance while the rule enforces their statically provable cardinality only. No autofix is offered because wrapping or moving UI changes structure and behavior.

## Application and third-party wrappers

Beyond `@kerfjs/ui`'s own catalog, the rule loads every composition catalog the
resolved `.kerf-ui-profile.json` declares under `catalogs`. Their components
resolve by package subpath (`import { GroupWrap } from '@acme/bits/group-wrap'`,
matched to the entry's `publicExports`) or, for an application's own relative
imports, by source file (matched to the entry's `source`, trying the TypeScript
ESM extensions a `.js` specifier stands for).

An entry that declares `rendersAs` (a wrapper that renders one of the listed
cataloged roots, or nothing) is checked as those roots:

- **Zones (`KUI-L202`):** the zone must accept every declared root.
- **Parents (`KUI-L201`):** each root's listed parents apply where the wrapper
  is placed, and a wrapper used as a parent counts as each of its roots.
- **Cardinality (`KUI-L203`):** the wrapper counts as zero or one child, since
  it may render nothing.

```tsx
import { Toolbar } from '@kerfjs/ui';
import { DemandSegmentsControl } from './demand-segments-control.js';

// Valid when the app's catalog declares
// rendersAs: ["@kerfjs/ui:toolbar-control-group"].
<Toolbar trailing={<DemandSegmentsControl />} />;
```

A wrapper without `rendersAs`, or one the profile's catalogs do not declare,
is still an unknown element and reports `KUI-L202` in a cataloged zone.
