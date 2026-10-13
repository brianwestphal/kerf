# Composer

`Composer` (`@kerfjs/ui/composer`, CSS `@kerfjs/ui/composer.css`) is the chat
or prompt composer: the place a person writes a message, assistant prompt, or
reply and sends it with a trailing action. It replaces app-owned composer
chrome, such as a `wa-textarea` and a button wrapped in application CSS that
draws a frame, a focus border, and a shadow.

## Contract

```tsx
<Composer
  id="assistant-message"
  name="message"
  label="Message"
  placeholder="Ask about this build"
  hint="Answers use the latest nightly build."
  minRows={1}
  maxRows={8}
  actions={
    <wa-button variant="brand" data-action="send-message">
      Send
    </wa-button>
  }
/>
```

- **Frame.** The root is a raised surface (`--kui-color-surface-raised`) with
  the standard 1px neutral border, the large radius (`--kui-radius-l`), and
  `--kui-shadow-l`. While focus is anywhere within it, including on a trailing
  action, the border turns `--kui-color-brand-border-loud`. The frame owns
  8px padding, so a composer placed 8px from a container edge puts its text on
  the same 17px column as a `List` of content items beside it.
- **Field.** A native, borderless `<textarea>` named by `label`. It sizes to
  its content with `field-sizing: content`, between `minRows` (default 1) and
  `maxRows` (default 8) lines, and scrolls past the maximum. Both bounds are
  positive integers, and `maxRows` is at least `minRows`; otherwise `Composer`
  throws a `RangeError`. In an engine without `field-sizing`, the field keeps
  a fixed height of three lines, clamped to the bounds, and scrolls.
- **Action row.** Below the field: an optional quiet `hint` at the text start
  and the trailing `actions`, normally one brand Send button. With an `id`,
  the hint is the field's accessible description (`<id>-hint`).
- **Value.** `value` seeds the field (a restored draft, or `''`). The app
  reads the textarea in its send action, clears it, and re-renders.
- **Disabled.** `disabled` disables the field; the app disables or marks busy
  its own actions.
- **Placement.** `slot` assigns it to a web component slot, such as a
  `wa-dialog`'s `footer`. `rootAttributes` takes safe `data-*` identity.

The app owns sending, keyboard shortcuts (for example Enter to send), what a
sent message looks like, and where the composer sits.

## In a chat dialog

A chat dialog floats the composer over its transcript. Use a `DialogSurface`
with `bodyLayout="fill-last"` and `footerPresentation="floating"` (and
`footerInset="none"`, since the composer draws its own frame), and slot the
composer into the footer:

```tsx
<DialogSurface height={remify(560)} bodyInset="none" bodyLayout="fill-last" footerPresentation="floating" footerOffset={remify(8)} footerInset="none">
  <wa-dialog id="assistant" label="Assistant">
    <StateBanner title="Answers use the latest nightly build." tone="neutral" />
    <List gap="xs" controlInsets="tb" scrollable>{messages}</List>
    <Composer slot="footer" id="assistant-message" name="message" label="Message" placeholder="Ask about this build" actions={send} />
  </wa-dialog>
</DialogSurface>;
```

The floating footer is transparent, so the composer's own frame and shadow
lift it over the transcript, and the dialog body reserves its measured height
as it grows.

## Do not

- Wrap it in a framed `ContentItem`, card, or bordered container; it owns its
  frame, padding, and shadow.
- Style its field, frame, or action row from application CSS. A variation it
  does not offer is a component gap.
- Use it for an ordinary form field submitted with the rest of a form; use
  `wa-textarea` with a `FieldLabel`.

## Verification

`tests/unit/composer.test.tsx` covers serialization, the hint description,
row bounds, and protected attributes. `tests/browser/composer.spec.ts` covers
the focus-within border, growth up to `maxRows` and then scrolling, the action
row geometry, and the send flow at wide and phone widths;
`tests/browser/surface-scaffold.spec.ts` covers the composer in the floating
footer of the chat dialog.
