# Web Awesome theme contract

`@kerfjs/ui/webawesome.css` is the optional bridge between Web Awesome 3.12's
free components and the Kerf/Hot Sheet 2 design system.

```ts
import '@kerfjs/ui/webawesome.css';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
```

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

Accordion, Details, Breadcrumb, and Kerf Select share
`--kui-disclosure-icon-scale` (default `.5`) so disclosure and traversal
chevrons keep the same visual weight. The Accordion and Details components
retain their own rotation behavior because scaling uses `transform` while
their open state uses the independent `rotate` property.

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

## Customization

Load application overrides after the package theme, or scope them to the
smallest subtree that needs a different identity:

```css
:root {
  --wa-color-brand-fill-loud: #7540a8;
  --wa-color-focus: #7540a8;
  --wa-form-control-border-radius: .5rem;
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
