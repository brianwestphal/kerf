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
