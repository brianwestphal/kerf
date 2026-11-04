# Button

`Button` renders a native `<button>`, or a link when given `link`. Use it for a standalone action outside a `ToolbarControlGroup`.

## Links

`link` makes a Button an `<a>`: pass a URL string, a `URL` (written as its `.href`), or `{ href, target }` when it opens elsewhere. A link keeps whatever emphasis the Button has, so a link can still look like a filled or outlined button.

```tsx
<Button link="/docs">Docs</Button>
<Button emphasis="secondary" link={{ href: 'https://example.com', target: '_blank' }}>
  Example
</Button>
```

`link` is the preferred form of the older `href` and `target` props, which keep working. Give one form or the other: a Button with `link` and `href` or `target` throws. A link that opens in a new tab (`target: '_blank'`) also gets `rel="noopener noreferrer"`, as a `Chip`'s `external` does, so the opened page can't reach this one through `window.opener` or see it as its referrer. A disabled link drops its destination and reports `aria-disabled="true"`. A link cannot be a toggle (`pressed`), a disclosure control (`expanded`), or a popover invoker (`popoverTarget`). kerf's URL screening applies to the destination as to any `href`, so a `javascript:` URL is dropped.

## Link emphasis

`emphasis="link"` draws any Button as an inline text link: underlined text in its tone's link color (a neutral Button takes the document link color, `--kui-color-text-link`), at the surrounding text's size, weight, and line height, with no fill, border, padding, or control height. It works on a `<button>` with an `action` and on a link alike, so choose it for how the control should look, not for what it does.

```tsx
<Text>
  Published 2 hours ago · <Button emphasis="link" link="#source">Source</Button>
</Text>
<Button emphasis="link" expanded={open} action="toggle-details">
  Show Details
</Button>
```

It keeps the native role and the standard focus ring (drawn around the text), and underlines the label so it never relies on color alone; under the pointer the underline thickens. `size="compact"` sets the small text size. A link-emphasis Button cannot take `pressed`. Because it drops the 44px target, use it inline in content; a navigation row is a `ListItemLink`, and a link in a toolbar is a `ToolbarActionLink`.

## Current step

Use `currentStep` when a Button marks the current position in a setup or progress sequence. It emits `aria-current="step"` on either form. Omit it or set it to `false` on other steps. The marker also remains on a disabled current step; disabled buttons retain their native `disabled` attribute, and disabled links lose their `href` and report `aria-disabled="true"`.

```tsx
<Button action="open-configure" currentStep>Configure</Button>
<Button action="open-review">Review</Button>
<Button link="/setup/finish" currentStep>Finish guide</Button>
```

The application owns the step label and which step is current. `currentStep` adds a semantic marker; it does not change the Button's styling or make a link into a toggle. Use `pressed` for an on/off toggle.
