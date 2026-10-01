# Dialog and popup surface scaffolds

`DialogSurface` and `PopupSurface` configure recurring Web Awesome surface
geometry without application `::part()` overrides. They do not replace Web
Awesome behavior: the application still owns open state, dismissal policy, ids,
labels, and content. With `@kerfjs/ui/popup-menu/register` imported, a dropdown
inside `PopupSurface` also keeps keyboard item navigation made during its show
animation when Web Awesome completes its initial focus handoff.

Wrap one `wa-dialog` with `DialogSurface`. Choose `size` (`small`, `medium`, or
`large`), `presentation` (`modal`, `side-sheet`, or `fullscreen`), and independent
`bodyInset` / `footerInset` (`none`, `compact`, or `comfortable`). The defaults
match Kerf's medium modal, 8px body, and 16px footer rhythm.

Treat a dialog body as a `List` by default. When its rows or sections own their
standard list geometry, set `bodyInset="none"` so the dialog does not add a
second inset. Bare prose is still a list child: wrap it in `ListInsetText` so its
text edge receives the standard 8px margin + 1px transparent border + 8px
padding and aligns with bordered siblings. Reserve `compact` or `comfortable`
body insets for exceptional content that does not already have list/content-item
geometry.

Wrap one `PopupMenu` (or another single `wa-dropdown`) with `PopupSurface`. `inset="list-zero"` removes menu
padding for a child that already owns row insets, `compact` uses 4px, and
`standard` uses the shared 8px surface inset. Keep the dropdown trigger named and
preserve `data-morph-skip-children` when its upgraded light-DOM items must retain
identity across Kerf rerenders. Import `@kerfjs/ui/popup-menu/register` once for
the focus handoff fix when wrapping a raw `wa-dropdown`.
