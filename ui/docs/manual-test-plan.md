# Manual test plan

Checks that automation cannot make truthfully. Run the catalog with
`npm run dev:lan` and open the printed URL on the device (see
[`ux-demo.md`](ux-demo.md)). Record the device, OS, and browser versions and the
result on the tracking ticket.

## DialogSurface bottom sheet: virtual keyboard and safe areas

Route: `?component=surface-scaffold`, example "Resizable Bottom Sheet". Run on
an iPhone (Safari) and an Android phone (Chrome).

1. Open the sheet and focus the Message field. The keyboard pushes the sheet's
   content above it, and the panel runs behind the keyboard with no gap.
2. Rotate the phone, and pinch-zoom while the keyboard is open. The content
   stays clear of the keyboard; while zoomed, the measured overlap is 0 and the
   page relies on `dvh`.
3. Dismiss the keyboard. The bottom padding returns to the home-indicator safe
   area, and the sheet's square bottom edge meets the screen edge.
4. Drag the grabber, with and without the keyboard open. The sheet resizes
   between its minimum height and the screen less the top safe area.

Playwright cannot raise a virtual keyboard; the overlap formula is unit-tested
(`tests/unit/dialog-surface-controller.test.tsx`) and a simulated keyboard is covered
in `tests/browser/dialog-bottom-sheet.spec.ts`.

## Automated coverage summary

Nothing has moved from this plan into automation yet.
