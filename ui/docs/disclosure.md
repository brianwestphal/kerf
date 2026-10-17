# Disclosure

`@kerfjs/ui/disclosure` shows and hides content under a summary row. It is a
native `<details>` with a `<summary>` that carries a `DisclosureArrow`, the
title, and an optional quiet detail, on the shared content-item geometry.

```tsx
import { Disclosure } from "@kerfjs/ui/disclosure";

<Disclosure title="Advanced Settings" detail="3 options">
  <Text>Proxy, request timeout, and retry limits.</Text>
</Disclosure>;
```

## Geometry

The root takes the content-item geometry: an 8px inline margin, a 1px border
(transparent unless framed), and the rounded radius. The summary row has the
8px inset and a 42px minimum height. The content area is offset by the arrow
column only, so Kerf block content, which brings the shared 1px + 8px inset
(`Text`, a `List`, a `ValueTable`), lands on the title's text column. Wrap
prose in `Text` rather than passing a bare string.

- `appearance="plain"` (default) sits on the surrounding surface.
- `appearance="framed"` draws the standard neutral border. Frame one only when
  it marks a real distinction.
- `appearance="sunken"` draws the border on the lowered, textured work surface,
  for something like a log.
- `appearance="embedded"` is for a Disclosure inside chrome that already owns
  the content-item geometry, such as a `ContentItem`. See below.

## Embedded in a content item

A compact details panel inside a `ContentItem` (a note card's AI feedback)
would be framed twice by the default geometry: the item's 8px margin, border,
and padding, then the Disclosure's own. `appearance="embedded"` drops the
Disclosure's margin, border, and padding, so the summary row starts on the
item's content inset and the arrow lines up with the item's other icons. The
summary is a compact row with a 24px minimum height, and it has no hover
fill, because a fill would touch the arrow and text at the item's content
edge. Its focus ring sits just outside the row.

The content starts on the title's text column, 8px below the summary. Inside
an item, content brings no inset of its own: use a `flush` `Text` or other
inline content rather than a block `Text`. `kerf-ui-doctor` (through
`eslint-plugin-kerfjs`'s `ui-composition` rule) reports a block `Text`, or any
other child that brings its own content-item inset, directly inside an
embedded Disclosure as `KUI-L204`.

```tsx
<ContentItem frame="framed">
  <List gap="xs">
    <Text flush>Move the export button into the toolbar.</Text>
    <Disclosure title="AI Feedback" detail="2 suggestions" appearance="embedded">
      <Text flush tone="quiet">Group Export and Share in one control group.</Text>
    </Disclosure>
  </List>
</ContentItem>;
```

Use `embedded` only inside owner chrome. On a pane or a list, the default
geometry is what puts the Disclosure on the shared content column.

## Open state

The open state belongs to the native `<details>` once it is on the page. A
person toggles it with a press, Enter, or Space; `open` renders it open, and a
re-render that passes `open` opens it. A re-render never closes it, because
kerf's morph leaves a `<details>` element's live `open` alone. To close it
from code, set `element.open = false`. The arrow follows the live state.

To react to a toggle, give it a `toggleAction` (a `data-action` on the root)
and listen for the native `toggle` event. It does not bubble, so listen in
the capture phase, for example with `delegateCapture`, and read
`event.newState` (`open` or `closed`).

## Accordions

Disclosures that share a `name` form an exclusive group: opening one closes
the others. This is the native `<details name>` attribute.

```tsx
{faqs.map((faq) => (
  <Disclosure title={faq.title} name="faq" appearance="framed">
    <Text>{faq.answer}</Text>
  </Disclosure>
))}
```

## Accessibility

The summary is the platform's disclosure button: Enter and Space toggle it,
and it reports its expanded state. The arrow is decorative. Keep the title a
short, meaningful name for what it hides.

Use this instead of `wa-details`, `wa-accordion`, and `wa-accordion-item`,
which are Discouraged.
