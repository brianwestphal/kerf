# Choosing a table or list

Choose by the relationship between items, not by the presence of rows:

| Need                                                    | Use                                                                                                                                             |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Label–value facts about one object                      | `ValueTable` and `ValueTableRow`. Use `density="compact"` when the facts belong in a compact inspector.                                         |
| A framed group of settings or actions with row dividers | `FramedList`.                                                                                                                                   |
| Selectable summaries in a listbox                       | `SummaryRow`; let the owning listbox handle selection and keyboard movement.                                                                    |
| Navigation, actions, or grouped content                 | `List` with the appropriate row component. `List` alone is layout, not an ARIA list or data grid.                                               |
| Repeating records with aligned column headers and cells | A native `<table>` with `<th>` and `<td>`. Import `@kerfjs/ui/document.css` for the opt-in font baseline.                                       |
| Many keyed, independently reactive rows                 | `bindList` from `kerfjs/list` when its row ownership or virtualization solves a measured need; compose the visible row with Kerf UI primitives. |

For a columnar table, keep semantic headers associated with their cells and give the table one horizontal scroll owner when it cannot fit. Preserve the first useful columns and make overflow discoverable; do not shrink labels and hit targets until they are illegible. A sticky header belongs to that scroll container, with an opaque surface over scrolling rows. Test it in WebKit as well as Chromium, including horizontal overflow and focus rings near the clip. At narrow widths, choose a deliberate column priority or an alternate summary presentation rather than hiding data silently.

Selection is application state. Use an ordinary selected row for one-item selection; use multiple-selection controls only when the task genuinely selects a set. Keep row actions in a `PopupMenu` and offer the same actions by context menu when the interaction calls for it. A row that merely navigates should remain a link. Preserve focus and selection through keyed updates, sorting, and filtering; show loading separately from an empty result.

See [component selection](./component-selection.md), [List geometry](./layout.md), [document baseline](./document-baseline.md), and [application testing](./testing-applications.md).
