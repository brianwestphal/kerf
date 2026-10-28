# `ui-composition`

Enforces composition facts published by the versioned UI catalog. `KUI-L201` reports a catalog component under a known, disallowed direct parent. `KUI-L202` reports a statically visible zone child—including an intrinsic or unknown JSX element—that is not one of the zone's cataloged `accepts` entries. `KUI-L203` reports a statically provable zone cardinality violation. `KUI-L204` reports a direct child that brings its own content-item inset into a parent configured to expect inset-free content. `KUI-L205` reports a control or link written inside a component whose root is one. A zone participates only when it declares an explicit `jsx.prop` binding, including `children`; the rule never guesses that a zone id is a JSX prop. Toolbar, Pane, TabBar, TabBarItem, feedback, search, and layout validation is therefore catalog-driven rather than duplicated in rule-local component cases.

The parent check is intentionally conservative about the child: it runs only for a child that resolves to a cataloged entry (or a declared wrapper's roots) whose parents are `listed`. Its direct JSX parent may be any element the rule can see: a cataloged component, a declared wrapper (which counts as each of its roots), an intrinsic element such as `<div>`, or an unresolved component, and any parent that is not a listed parent reports `KUI-L201`. Bound zone checks understand aliases, namespace imports, fragments, arrays, and conditional/logical branches, but expressions whose content cannot be resolved statically remain runtime and accessibility work. Accepted concepts that do not identify a catalog entry remain machine-readable guidance while the rule enforces their statically provable cardinality only. No autofix is offered because wrapping or moving UI changes structure and behavior.
Toolbar zones accept `KerfUiContent`, so the zone rule allows direct JSX
controls and custom components there. Their own parent contracts still apply,
including when a direct child is supplied through a zone prop.

An additional JSX export from an entry can declare its own `jsxExports.<name>.parents` contract. It uses that placement instead of the entry's root placement and is opaque to zone matching, so an action link does not impersonate its enclosing control group.

`KUI-L202` inspects JSX written directly in a bound zone prop, including its
fragments, arrays, and conditional branches. It does not follow a local binding
such as `const actions = <div />; <TabBar trailing={actions} />`. Review those
bindings against the zone's catalog contract; an unknown expression produces
no zone-child diagnostic.

## Inset-free children (`KUI-L204`)

An entry may declare `insetFreeChildren`: prop conditions under which its
direct children must bring no content-item inset, because owner chrome already
provides that geometry. `@kerfjs/ui` declares it for `Disclosure` with
`appearance="embedded"`. A direct child (including through fragments, arrays,
and conditional branches) reports `KUI-L204` when its catalog geometry owns
its margin, border, and padding (`self` on all three) and none of its own
`insetFreeWhen` conditions holds. `Text` declares `flush` and
`variant="span"` as its inset-free forms, so the message tells you to set one
of them; a child with no inset-free form should be replaced with inline
content or a `Text flush`.

```tsx
import { ContentItem, Disclosure, Text } from '@kerfjs/ui';

<ContentItem>
  <Disclosure title="AI Feedback" appearance="embedded">
    <Text>Group Export and Share.</Text> {/* KUI-L204: set `flush` */}
    <Text flush>Keep Delete in the overflow menu.</Text> {/* valid */}
  </Disclosure>
</ContentItem>;
```

The check reads only statically written props: a parent `appearance` or a
child prop supplied by an expression or a spread is not reported. Uncataloged
children (intrinsic elements, text) and entries whose geometry is not owned on
all three sides, such as `List`, are not checked.

## Controls inside controls (`KUI-L205`)

HTML forbids interactive content inside interactive content, and the browser
splits such markup, which breaks the component at render time. An entry may
declare `content.interactive` rules: `root` when the component's own root is a
native control or link (`Button`, `ListItem`, `ListItemLink`), `contains` when
it renders one inside (`Select`, `ListActionRow`), optionally only when one of
its `whenProps` is written (a `Chip` is a `<button>` only with `action`).
`content.exports` gives another JSX export of the entry its own rules. A
`root` or `contains` element anywhere inside a `root` element, through its
children, any of its props, fragments, conditional branches, and callbacks
such as `.map()`, reports `KUI-L205`. Raw Web Awesome tags with catalog rules,
such as `<wa-button>`, count too.

```tsx
import { Badge, Button, ListItem } from '@kerfjs/ui';

<ListItem action="open" label="Inbox" trailing={<Button>Go</Button>} />; // KUI-L205
<ListItem action="open" label="Inbox" trailing={<Badge>3</Badge>} />; // valid
```

A `whenProps` rule counts a prop as written when the attribute is present,
whatever expression supplies it, unless its value is a literal `false` or
`null`. A component defined elsewhere, or a prop supplied through a spread, is
not visible to the rule. `validateView` reports the same placement in a view
document as `KUI-V014`, from the same rules.

## Application and third-party wrappers

Beyond `@kerfjs/ui`'s own catalog, the rule loads every composition catalog the
resolved `.kerf-ui-profile.json` declares under `catalogs`. Their components
resolve by package subpath (`import { GroupWrap } from '@acme/bits/group-wrap'`,
matched to the entry's `publicExports`) or, for an application's own relative
imports, by source file (matched to the entry's `source`, trying the TypeScript
ESM extensions a `.js` specifier stands for). An export without a `subpath` (a
private application's, which is never imported by package name) resolves only
by source file.

A relative import may also reach the source file through relative re-exports,
the way apps import wrappers through a components barrel:
`import { DemandSegmentsControl } from './components/index.js'` resolves when
`index.ts` has `export { DemandSegmentsControl } from '../demand-segments-control.js'`,
a renamed `export { X as Y } from …` (import `Y`), or `export * from …`, and
through chains of them (a directory import tries its `index` file). Type-only
and namespace (`export * as ns`) re-exports, a component defined in the barrel
itself, and re-exports of anything the catalogs do not declare stay unresolved,
and cycles stop without resolving.

An entry that declares `rendersAs` (a wrapper that renders one of the listed
cataloged roots, or nothing) is checked as those roots:

- **Zones (`KUI-L202`):** the zone must accept every declared root.
- **Parents (`KUI-L201`):** each root's listed parents apply where the wrapper
  is placed, and a wrapper used as a parent counts as each of its roots. A
  placement reports once, using the first violated root requirement before a
  separate wrapper requirement if both apply.
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
