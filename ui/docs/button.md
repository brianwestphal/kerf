# Button

`Button` renders a native `<button>`, or a link when given `href`. Use it for a standalone action outside a `ToolbarControlGroup`.

## Current step

Use `currentStep` when a Button marks the current position in a setup or progress sequence. It emits `aria-current="step"` on either form. Omit it or set it to `false` on other steps. The marker also remains on a disabled current step; disabled buttons retain their native `disabled` attribute, and disabled links lose their `href` and report `aria-disabled="true"`.

```tsx
<Button action="open-configure" currentStep>Configure</Button>
<Button action="open-review">Review</Button>
<Button href="/setup/finish" currentStep>Finish guide</Button>
```

The application owns the step label and which step is current. `currentStep` adds a semantic marker; it does not change the Button's styling or make a link into a toggle. Use `pressed` for an on/off toggle.
