# Dialog and popup surface scaffolds

`DialogSurface` and `PopupSurface` configure recurring Web Awesome surface
geometry without application `::part()` overrides. They do not replace Web
Awesome behavior: the application still owns open state, focus lifecycle,
dismissal policy, ids, labels, and content.

Wrap one `wa-dialog` with `DialogSurface`. Choose `size` (`small`, `medium`, or
`large`), `presentation` (`modal`, `side-sheet`, or `fullscreen`), and independent
`bodyInset` / `footerInset` (`none`, `compact`, or `comfortable`). The defaults
match Kerf's medium modal, 8px body, and 16px footer rhythm.

Wrap one `wa-dropdown` with `PopupSurface`. `inset="list-zero"` removes menu
padding for a child that already owns row insets, `compact` uses 4px, and
`standard` uses the shared 8px surface inset. Keep the dropdown trigger named and
preserve `data-morph-skip-children` when its upgraded light-DOM items must retain
identity across Kerf rerenders.
