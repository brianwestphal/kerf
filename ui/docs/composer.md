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
- **Placement.** Pass it as a `DialogSurface`'s `footer`, or use `slot` to
  assign it to a web component slot. `rootAttributes` takes safe `data-*`
  identity.
- **Enter to send.** `submitOnEnter` opts in to the keyboard contract below;
  it marks the root `data-submit-on-enter="true"` (protected from
  `rootAttributes`) and gives the field `aria-keyshortcuts="Enter"`.

The app owns sending, any other keyboard shortcut, what a sent message looks
like, and where the composer sits.

## Enter to send

Set `submitOnEnter` and call `wireComposers` once over an ancestor of every
such composer; it returns a disposer:

```ts
import { wireComposers } from '@kerfjs/ui/wire-composers';

const stopComposers = wireComposers(app);
```

In an opted-in composer's field:

| Key                                          | Result                                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Enter, Cmd+Enter, Ctrl+Enter                 | Clicks the composer's **first trailing action**; the newline is suppressed.                               |
| Shift+Enter, Alt+Enter                       | Inserts a newline, as in any textarea.                                                                    |
| Enter committing an IME composition          | Left to the input method: `isComposing`, keyCode 229, or between `compositionstart` and `compositionend`. |
| Enter on an empty or whitespace-only message | Nothing: no send and no newline.                                                                          |
| Auto-repeating Enter (key held down)         | Nothing.                                                                                                  |

The first trailing action is the first `wa-button`, `button`, or
`[data-action]` element inside `actions`. Clicking it means the keyboard send
runs the same delegated `data-action` handler as a pointer send, so the app
writes one send handler that reads the field, clears it, and re-renders. The
click does not move focus, so the person keeps typing. Nothing is sent while
the field is `disabled`, or while that action has a `disabled` attribute or
property, a `loading` attribute (a busy `wa-button`), or
`aria-disabled="true"`; the Enter is still suppressed, so a message waiting on
a busy Send does not gain a newline.

Leave `submitOnEnter` off for a long-form prompt where Enter should be a
newline, and send with the action alone. A visible `hint` may also state the
shortcut ("Enter to send, Shift+Enter for a new line") when the audience may
not expect it; `aria-keyshortcuts` already announces it to assistive
technology.

## In a chat dialog

A chat dialog floats the composer over its transcript. Use a `DialogSurface`
with `bodyLayout="fill-last"` and `footerPresentation="floating"` (and
`footerInset="none"`, since the composer draws its own frame), and slot the
composer into the footer:

```tsx
<DialogSurface
  id="assistant"
  label="Assistant"
  height={remify(560)}
  bodyInset="none"
  bodyLayout="fill-last"
  footerPresentation="floating"
  footerOffset={remify(8)}
  footerInset="none"
  footer={<Composer submitOnEnter id="assistant-message" name="message" label="Message" placeholder="Ask about this build" actions={send} />}
>
  <StateBanner title="Answers use the latest nightly build." tone="neutral" />
  <List gap="xs" controlInsets="tb" scrollable scrollClearance="block-end">{messages}</List>
</DialogSurface>;
```

The floating footer is transparent, so the composer's own frame and shadow
lift it over the transcript. The transcript's `scrollClearance="block-end"`
lets messages scroll visibly beneath the composer while the last one still
comes to rest above it, following the composer's measured height as it grows.
Without the opt-in, the dialog body reserves that height below the transcript
instead.

## Do not

- Wrap it in a framed `ContentItem`, card, or bordered container; it owns its
  frame, padding, and shadow.
- Style its field, frame, or action row from application CSS. A variation it
  does not offer is a component gap.
- Use it for an ordinary form field submitted with the rest of a form; use
  `wa-textarea` with a `FieldLabel`.

## Verification

`tests/unit/composer.test.tsx` covers serialization, the hint description,
row bounds, and protected attributes; `tests/unit/wire-composers.test.tsx`
covers the Enter-to-send matrix (modifiers, IME, empty, repeat, disabled
field and actions, first action only, disposal). `tests/browser/composer.spec.ts` covers
the focus-within border, growth up to `maxRows` and then scrolling, the action
row geometry, and the send flow at wide and phone widths, and, in Chromium,
Firefox, and WebKit, Enter, Shift+Enter, Cmd/Ctrl+Enter, empty messages, and
IME composition (dispatched composition events and keyCode 229). In
Chromium it also drives a real IME composition through the DevTools protocol
(`Input.imeSetComposition`, then `Input.insertText` to commit). That test
asserts the engine's own event order: an Enter keydown flagged `isComposing`
while composing, the committing `Process` keydown with keyCode 229, then
`compositionend`. None of those sends, the committed text lands in the field,
and the next Enter sends it;
`tests/browser/surface-scaffold.spec.ts` covers the composer in the floating
footer of the chat dialog, including Enter to send.
