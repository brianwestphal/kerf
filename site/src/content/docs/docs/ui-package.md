---
title: '@kerfjs/ui'
description: 'Accessible, composable first-party UI primitives for kerf apps.'
---

`@kerfjs/ui` is kerf's optional first-party component layer. It provides
production-backed structure, navigation, form, and feedback primitives without
adding a component runtime: every component is still a plain function returning
Kerf `SafeHtml`.

```bash
npm install kerfjs @kerfjs/ui
```

```tsx
import { Toolbar, ToolbarText } from '@kerfjs/ui';
import '@kerfjs/ui/styles.css';

const header = <Toolbar leading={<ToolbarText text="Library" />} />;
```

Use the root barrel for convenience or explicit subpaths such as
`@kerfjs/ui/toolbar`. Import `@kerfjs/ui/foundation.css` for semantic token
defaults plus only the component CSS you use, or `@kerfjs/ui/styles.css` for the
complete layer.

## Included primitives

- `LucideIcon`; `Toolbar`, `ToolbarControlGroup`, `ToolbarText`
- `MenuItem`, `MenuHeader`; `AppTab`
- `PageHeader`, `DialogHeader`, `ValueTable`
- `ResizableRegion` with `wireResizableRegions`
- `Select`; `StateBanner`, `EmptyState`, `LoadingSpinner`

The components expose slots and stable `kui-` classes rather than domain data or
commands. Applications retain state, routing, menu policy, and tab-list policy.

## Web Awesome Select

`Select` renders Web Awesome markup without registering custom elements. Opt in
once in an application entry that uses it:

```ts
import '@kerfjs/ui/select/register';
```

Web Awesome is an optional peer, so it stays out of applications and bundles
that do not select that integration.

## Accessibility

The styles preserve visible focus, forced colors, reduced motion, and practical
target sizes. Icons are decorative unless labeled. Banners distinguish polite
status from assertive alerts. The resizable separator supports pointer input,
arrow keys, Shift acceleration, Home, and End. `AppTab` supplies tab semantics
and roving-tabindex-ready markup; the containing app owns the full tab-list
keyboard and close behavior.

The package's design philosophy, component contract, accessibility checklist,
Apple HIG interpretation, and runnable UX catalog live under [`ui/docs/`](https://github.com/brianwestphal/kerf/tree/main/ui/docs).
