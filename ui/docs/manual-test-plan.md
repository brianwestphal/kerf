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

The feed-card route `?component=content-item`, example "Image-Tinted Feed
Cards", has unit coverage for image state transitions and three-engine browser
coverage for independent timelines, reverse scrolling, image error/recovery,
light/dark tint contrast, reduced motion, increased contrast, and forced
colors. Wide and narrow light/dark captures were inspected for text, controls,
image clipping, and card spacing. A 50/200-card Chromium trace checks node and
listener growth; it uses repeated sample artwork, so a production feed with
unique high-resolution assets still needs its own image-cache profiling.
The composed BackdropImage card has browser checks for its edge geometry,
fade, scrim, and focusable overlay at wide and narrow sizes; inspect the same
states in both captured WebKit views.

The remaining device-only checks above require a real mobile keyboard.
The List View Transitions catalog example has unit coverage for its row edits,
pending-snapshot queue, and clip lifecycle, with browser coverage for real controls, fallback,
reduced motion, and wide/narrow layout. Its animation was visually inspected
at both widths; the browser tests verify names and state after each edit.
The real catalog scroll position is checked during and after all four List
transition actions at wide and narrow viewports. During motion, check that
named rows stay within the visible example and do not cover the catalog footer
or neighboring examples; the browser suite checks the computed transition
clip at wide and narrow viewports. Also check that the catalog header, sidebar,
and surrounding examples remain painted throughout the transition; browser
captures compare a header pixel before and during motion at narrow, medium,
and review-sized viewports.
The row viewport has a fixed height across Reorder, Insert Delta, Remove Last,
and Reset; inspect the disappearing last row within it at wide and narrow sizes.
