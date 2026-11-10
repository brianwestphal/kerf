# Parameter editor UX intake (KF-MZG2KY)

The intake requested decomposition before implementation. Annotation #1 is
covered by four linked issues:

| Follow-up | Requested change |
| --- | --- |
| KF-26P9FT | Resolve types from the component's owning project. |
| KF-B8YSHV | Show compact name/type fields; edit complex types in a dialog with navstack traversal. |
| KF-MB5FFZ | Accept TypeScript expressions with near-real-time language-service validation. |
| KF-AFW3ZA | Add autocomplete and automatic type formatting. |

All four retain annotation #1's comment intent, rectangle
`x=0 y=3778 w=1305 h=904` (0–10000 coordinates), and the original
`attachment:capture-1.png` and `attachment:review.json`. The still image has no
time range. The canonical bundle's intent array is empty; the intake supplies
the comment classification.

The expression `Array<string | number | MyCustomType>` is the concrete acceptance
example. Creating new named/non-inline types remains explicitly out of scope.
The follow-ups are outside Up Next pending prioritization. No UI behavior changed
in this intake.

Verification: read the full intake and canonical bundle, inspected the current
inline editor in `ui/src/editor/document-params-panel.tsx`, confirmed four typed
follow-up relations on the source ticket, and copied the original evidence to
each follow-up. Implementation tickets require corresponding after captures.
