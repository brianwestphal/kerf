# Library editor UX intake (KF-GPXCZD)

The intake requested decomposition before implementation. Every annotation has
one linked issue; the follow-ups remain outside Up Next pending prioritization.

| Annotation  | Follow-up | Requested change                                                                             |
| ----------- | --------- | -------------------------------------------------------------------------------------------- |
| #1, remove  | KF-MGAP67 | Remove back/single path controls; show lighter gray parent headings moving with each column. |
| #2, comment | KF-7HP7R9 | Clip columns at the dialog edges without the inset.                                          |
| #3, comment | KF-0XRNXD | Keep search geometry stable after selecting all text and pressing Delete.                    |
| #4, comment | KF-1XBJDT | Remove the greater-than-one-second expand/collapse delay.                                    |
| #5, comment | KF-CBA2H7 | Add generic Lucide folder icons and extension/MIME-specific file icons.                      |

Each issue retains its exact shape and normalized region from the canonical
`attachment:review.json`, plus the original relevant capture: #1–2 use
`attachment:capture-1.png`; #3–5 use `attachment:capture-2.png`. These are still
images with no time range. Bundle intent arrays are empty; classifications above
come from the intake's explicit annotation headings.

Verification: read all five annotations and the canonical bundle, inspected
`ui/src/editor/library-popover.tsx`, confirmed five typed follow-up relations,
and copied the original relevant capture and review bundle to each issue.
No UI implementation or replacement capture belongs to this intake. Each
implementation must attach corresponding after evidence.
