# Web Awesome theme contract

`@kerfjs/ui/webawesome.css` is the optional bridge between Web Awesome 3.12's
free components and the Kerf/Hot Sheet 2 design system.

```ts
import type {} from "@kerfjs/ui/webawesome";
import "@kerfjs/ui/webawesome.css";
import "@awesome.me/webawesome/dist/components/button/button.js";
import "@awesome.me/webawesome/dist/components/input/input.js";
```

The type-only package import augments `kerfjs/jsx-runtime` with the 70
catalog-supported `wa-*` elements. It has no runtime side effects. The catalog
gate keeps the declaration tags aligned with Web Awesome's installed custom
elements manifest, while individual component imports remain the only
registration boundary.

The CSS entry includes Web Awesome's native, utility, palette, and default-theme
styles, then overrides the public semantic contract in
`@layer wa-theme-overrides`. It does not import or register component
JavaScript. Importing or removing an individual component module therefore
still controls whether that component and its JavaScript dependencies enter the
bundle.

## Coverage

The theme supplies shared surfaces, normal/quiet/link text, neutral/brand/
success/warning/danger fill-border-foreground ramps, focus, overlays, form
controls, panel and tooltip geometry, radii, and shadows. Those values reach all
free visual component families through Web Awesome's own styles:

- Actions: Button, Button Group, Copy Button, Dropdown, and Dropdown Item.
- Forms: Checkbox and Checkbox Group, Color Picker, Input, Known Date, Number
  Input, OTP Input, Radio and Radio Group, Rating, Select and Option, Slider,
  Switch, Textarea, and Time Input.
- Layout: Accordion and Accordion Item, Card, Details, Dialog, Divider, Drawer,
  Page, Scroller, Split Panel.
- Navigation: Breadcrumb and Breadcrumb Item, Pagination, Tab Group, Tab and Tab
  Panel, Tree and Tree Item.
- Feedback: Badge, Callout, Progress Bar, Progress Ring, Skeleton, Spinner, Tag,
  Toast and Toast Item, Tooltip.
- Media: Animated Image, Avatar, Carousel and Carousel Item, Comparison, Icon,
  Markdown, QR Code, and Zoomable Frame.
- Helpers: Animation, Format Bytes/Date/Number, Include, Intersection Observer,
  Mutation Observer, Popover, Popup, Random Content, Relative Time, and Resize
  Observer. Helpers without their own visual chrome naturally inherit only the
  applicable typography and color values.

Carousel navigation follows the same compact geometry as Kerf disclosure
controls: 16px arrows in 28px controls and 7px visible page dots in 20px
pointer targets. Override `--kui-wa-carousel-icon-size`,
`--kui-wa-carousel-control-size`, `--kui-wa-carousel-dot-size`, or
`--kui-wa-carousel-dot-hit-size` on a carousel or containing scope when a
product needs different geometry.

Form fields carry the same content-item inset as the Kerf primitives: a 1px
border with 8px inside it (`--wa-form-control-border-width`,
`--wa-form-control-padding-block`, and `--wa-form-control-padding-inline` are set
to the `--kui-layout-item-border-width` / `--kui-layout-item-padding` values), so
a single-line control lands at the standard ~40px height and the value sits 9px
in from the field edge. Each field's top label is inset by that same border +
padding (9px) so it lines up with the value inside the field, and is styled
exactly like a `ListHeader` label — uppercase, `--kui-font-xs`, weight 650, quiet
foreground. This applies to every free field that exposes a top label
(`::part(form-control-label)` plus the Slider's `::part(label)`). OTP Input
exposes `label` instead of `form-control-label`; the theme gives it the same
uppercase 12px/650 treatment. Inline control labels (Checkbox, Switch) keep
their natural sentence case.

Known Date's field captions and bordered text-like field hints use the same 9px
inline inset, keeping secondary text aligned with the value rather than the
field's outer border. This covers Input, Known Date, Number Input, OTP Input,
Select, Textarea, and Time Input hints; unbordered group hints retain their own
natural geometry. OTP Input's label and hint both use the 9px field-text inset.

Checkbox Group and Radio Group option regions receive the shared 8px inline
outer inset through `::part(form-control-input)`. Unlike bordered fields, these
groups have no shell of their own, so the explicit margin places their controls
on the same content-item geometry without adding padding to each option. The
Color Picker trigger receives the same 8px inline outer inset because it also
has no bordered field shell. Slider's complete interactive region receives the
shared 8px logical inline outer inset through `::part(slider)`, keeping its
track, markers, references, and hint together without moving the label.

Non-field chrome follows explicit, overridable control, surface, and container
tiers:

- `--kui-wa-control-inset` defaults to the 8px content-item padding. It applies
  to tabs, tree-item trailing content, tags, and dropdown items. Tree selection
  also uses Kerf's 8px inline outer margin, so its background reads as an inset
  list item instead of an edge-to-edge stripe. Buttons already consume the same
  `--wa-form-control-padding-inline` 8px value at every size, so no extra part
  override is needed.
- `--kui-wa-surface-margin` and `--kui-wa-surface-inset` default to 8px.
  Accordion, Card, Details, Callout, and Include use the margin around their
  complete surface and the inset within it. Accordion applies the outer margin
  once to the group rather than separating connected items; Card's header,
  body, and footer all receive the full inset.
- `--kui-wa-container-inset` defaults to the 16px homogeneous-group step. Tab
  Panel retains this roomier tier for unframed panel content. Dialog body uses
  the 8px surface inset, while its footer uses the 16px container inset so
  content stays compact and the action group has a clearer boundary. These two
  parts do not inherit the dialog's shared `--spacing` value.

Badge remains intentionally compact at Web Awesome's intrinsic `0.375em` block /
`0.625em` inline padding (4.5px / 7.5px at its default 12px text size): it is a
short status or count, not a content item. Breadcrumb has no bordered or filled
container, and Scroller delegates item chrome to its slotted children, so both
retain their upstream geometry. Web Awesome 3.12's free catalog has
`wa-dropdown-item`, but no `wa-menu-item`; the theme therefore styles the
supported dropdown item rather than carrying a dead selector.

Override a tier for a product scope after importing the theme:

```css
.roomy-editor {
  --kui-wa-control-inset: 0.75rem;
  --kui-wa-surface-margin: 0.75rem;
  --kui-wa-surface-inset: 0.75rem;
  --kui-wa-container-inset: 1.5rem;
}
```

Accordion, Details, Breadcrumb, and Kerf Select share
`--kui-disclosure-icon-scale` (default `.5`) so disclosure and traversal
chevrons keep the same visual weight. The Accordion and Details components
retain their own rotation behavior because scaling uses `transform` while
their open state uses the independent `rotate` property.

That scale applies to each Web Awesome component's intrinsic glyph and is
independent of Kerf `DisclosureArrow`, whose default box is 18px relative to
the root font size and whose consumer override is
`--kui-disclosure-arrow-size`.

Tooltip and Popover use arrowless floating surfaces by default, matching Hot
Sheet 2. The theme sets Web Awesome's public `--wa-tooltip-arrow-size` token to
`0px` and maps each popover's public `--arrow-size` property from
`--kui-wa-popover-arrow-size` (also `0px`). Restore arrows globally, for a
subtree, or for one instance after the theme import:

```css
:root {
  --wa-tooltip-arrow-size: 0.375rem;
  --kui-wa-popover-arrow-size: 0.375rem;
}

.pointed-popover {
  --arrow-size: 0.5rem;
}
```

The native `without-arrow` attribute remains useful when an individual
component should declare the no-arrow choice independent of theme context.

The UX catalog includes a focused, addressable specimen for every component in
this list. Because these are themed ecosystem components rather than
first-class `@kerfjs/ui` exports, the sidebar keeps them under a collapsible
`Web Awesome` heading with category subgroups. The aggregate theme route
remains a broad visual-regression surface, while modal, drawer, toast, media,
and helper routes make their own behavior inspectable without opening every
state at once.

## Badge and tag guidance

Use Web Awesome's stable `wa-badge` and `wa-tag` directly instead of adding
generic Kerf wrappers around them. Their variants and appearances already read
the semantic palette above, and importing their component modules remains
independent and tree-shakeable.

- Use `wa-badge pill` for compact status, count, or activity labels. Hot Sheet
  2's pill-shaped ticket status treatment is the reference shape.
- Use the default, non-pill `wa-tag` for categories, filters, and removable
  selections. Its medium-radius rounded rectangle keeps tags distinct from
  status badges. Handle the bubbling `wa-remove` event in the feature that owns
  the underlying selection.
- Keep domain components when they add domain behavior. Hot Sheet 2's
  `StatusBadge` owns the ticket-status-to-label/icon mapping, while its
  `TagChip` is already a small domain adapter around `wa-tag`. Those are useful
  application components, not missing general-purpose primitives in
  `@kerfjs/ui`.

The `pill`, `variant`, `appearance`, and size APIs remain available per
instance, and applications can override the same `--wa-*` semantic tokens when
their domain needs a different palette.

## Markdown trust boundary

> **Security:** `wa-markdown` is only appropriate for trusted static Markdown.
> Do not pass unsanitized user input or any other untrusted Markdown to it.

Web Awesome sends Marked's HTML output directly into the component's light DOM
without sanitization. Untrusted content can therefore create cross-site
scripting vulnerabilities. Sanitize content with an appropriate, separately
maintained HTML sanitization pipeline before it reaches the component, or use a
renderer whose trust boundary fits the application.

`wa-markdown` is also client-only: it requires the DOM at runtime, cannot render
during SSR, and should not carry SEO-critical content. All connected instances
share one mutable Marked instance. Calling `marked.use()` through any instance
changes shared parser configuration; use `WaMarkdown.updateAll()` deliberately
when every connected instance should be rerendered. Do not treat per-instance
configuration as isolated.

The UX catalog specimen intentionally contains only trusted, source-controlled
static content and labels that constraint next to the rendered output.

## Component selection guidance

The catalog lists every free Web Awesome component so support can be inspected;
listing does not make each component the preferred Kerf application pattern.
The [need-first decision matrix](./component-selection.md#web-awesome-overlap-policy)
is the exhaustive Kerf/Web Awesome overlap index; the rules below explain the
highest-risk choices.

- Consider `wa-popup` for low-level anchored positioning when its flip, shift,
  or placement behavior avoids custom positioning code. Prefer the higher-level
  Tooltip or Popover when their interaction semantics already fit.
- For ordinary app value selection, use Kerf `Select` instead of directly
  composing Web Awesome Dropdown, Dropdown Item, Select, or Option. Kerf Select
  owns the compact spacing and disclosure-arrow treatment while registering
  only its reachable Web Awesome dependencies. Use an action-menu pattern only
  when the choices truly perform commands rather than select a value.
- Avoid Web Awesome Button Group as a general visual pattern. Use controlled
  `SegmentedControl` for a small exclusive choice set, including lightweight
  view selection inside an inspector. Reserve Button Group for an exceptional
  grouped-action requirement that is not a selection.
- Prefer `TabBar` for reorderable or horizontally overflowing application tabs,
  and `SegmentedControl` for compact local views, instead of Web Awesome Tab,
  Tab Group, and Tab Panel.
- Use Web Awesome Tree, Tree Item, Animated Image, and Comparison only for a
  specific product requirement that needs their specialized behavior.
- Avoid Web Awesome Zoomable Frame and Icon. Use application-owned media
  presentation and Kerf `LucideIcon`, respectively.
- Prefer Kerf `ResizableRegion` over Web Awesome Split Panel for Hot Sheet-style
  application panes. It provides the persistent 1px separator, hover/focus
  grip, accessible keyboard and pointer resizing, controlled size, collapse
  support, and application-owned persistence. Use Split Panel only when its
  distinct Web Awesome API is itself required.

## Customization

Load application overrides after the package theme, or scope them to the
smallest subtree that needs a different identity:

```css
:root {
  --wa-color-brand-fill-loud: #7540a8;
  --wa-color-focus: #7540a8;
  --wa-form-control-border-radius: 0.5rem;
}

.billing-workspace {
  --wa-color-success-fill-loud: #10a86b;
}
```

Use `.wa-light`, `.wa-dark`, and `.wa-invert` for explicit appearance scopes.
Component-specific custom properties and documented `::part()` selectors from
Web Awesome remain available when a semantic theme token is not sufficiently
specific. Prefer those public hooks over shadow-tree implementation details.

Kerf's `foundation.css` reads the same `--wa-*` values into `--kui-*` aliases,
so a scoped Web Awesome override also keeps adjacent Kerf primitives coherent.
