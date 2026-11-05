# PagedView

`@kerfjs/ui/paged-view` pages a sidebar or panel region horizontally between a
few full-size panes, with compact page dots floating at the bottom: today's charts
on one page, a page of gauges, a triage list. Touch swipes and trackpad
scrolls snap to a page, and the dots work by click and by arrow keys. The
application owns the current page, so it can persist the choice per viewer.

```tsx
import { PagedView } from "@kerfjs/ui/paged-view";
import { wirePagedViews } from "@kerfjs/ui/wire-paged-views";

const page = signal<"charts" | "rates" | "triage">("charts");

<PagedView
  id="sidebar-pages"
  label="Sidebar pages"
  page={page.value}
  pages={[
    { id: "charts", label: "Today", content: <ChartsPage /> },
    { id: "rates", label: "Token rate", content: <RatesPage /> },
    { id: "triage", label: "Triage", content: <TriagePage /> },
  ]}
/>;

const stop = wirePagedViews(root, {
  onPageChange: (next) => {
    page.value = next as typeof page.value;
    savePreference("sidebar-page", next);
  },
});
```

## Props

- `id` and `label` (required): the view's DOM id (page and dot ids derive
  from it) and the accessible name of its dot tablist.
- `pages` (required): the pages in order, each `{ id, label, content }`. The
  `label` names the page for assistive technology ("Page 2 of 3: Token
  rate") and is the dot's tooltip. With one page no dots render.
- `page` (required): the controlled current page id. An id that matches no
  page shows the first.
- `pageLabel`: the accessible name of each dot, for localization. `{index}`
  is the 1-based page number, `{count}` the page count, and `{label}` the
  page's label; the default is `Page {index} of {count}: {label}`. For
  example, `pageLabel="Seite {index} von {count}: {label}"`.
- `className`, `slot`, and `rootAttributes` (`data-*` metadata).

## Wiring

`wirePagedViews(root, { onPageChange })` wires every PagedView under `root`
and returns a disposer. It calls `onPageChange(page, viewId)` when a person
changes the page:

- a swipe, trackpad scroll, or momentum scroll settles on another page (on
  `scrollend`, or after a short quiet period in engines without it);
- a dot is clicked;
- on a focused dot, Left and Right move to the previous and next page
  (mirrored in right-to-left text), and Home and End to the first and last;
  focus moves with them.

Re-render the PagedView with the reported id as `page`. When a render changes
`page`, the wiring scrolls the viewport to it, smoothly unless
`prefers-reduced-motion` is set; a newly rendered view starts on its page
without animating. Keeping the old `page` does not snap a swipe back.

## Accessibility

The dot pill is a `tablist`; each dot is a `tab` with `aria-selected` and
`aria-controls`, and only the current dot is in the Tab order. Each page is a
`tabpanel` named by its dot. Pages other than the current one are `inert`, so
Tab and assistive technology stay on the visible page. The current dot is a
wider pill, so the state does not rest on color alone, and forced colors paint
it `Highlight`. Each dot is a 24px target.

## Geometry

The view fills its region: put it directly in a `Pane`, a sidebar, or a
`SizedRegion` with a height, with no wrapper padding. Each page is the full
width and height of the region and scrolls vertically on its own, so its
content owns its inset (a `ContentItem`, a `List`, a `ListInsetText`). The
dots float in a pill on the translucent chrome material, fixed 8px above the
region's bottom edge: page content scrolls beneath them, and each page ends
with room for the pill so its last item scrolls clear. The pill turns opaque
under reduced transparency or increased contrast. The browser keeps the
current page snapped when the region resizes.
