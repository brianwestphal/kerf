# `ui-preferences`

Reports cataloged components listed in an application UI profile preference's `avoid` set and points to the package-qualified `preferred` component. The stable diagnostic is `KUI-L301`.

A component matches whether it is rendered through an imported export (`<WaButtonGroup />`) or written directly as its custom-element tag (`<wa-dropdown>`), which resolves through the selection catalog's `customElement`. The `@kerfjs/ui` package defaults avoid every `Discouraged` Web Awesome element, so each of these reports and names the Kerf component to render instead:

```tsx
<wa-dropdown>…</wa-dropdown>        // KUI-L301: prefer @kerfjs/ui:popup-menu
<wa-select>…</wa-select>            // KUI-L301: prefer @kerfjs/ui:select
<wa-tab-group>…</wa-tab-group>      // KUI-L301: prefer @kerfjs/ui:tab-bar
<wa-icon name="gear" />             // KUI-L301: prefer @kerfjs/ui:lucide-icon
```

Supported Web Awesome elements (`<wa-button>`, `<wa-dialog>`, the encouraged `<wa-popup>`) and unknown custom elements are not reported. The source file of a component declared in a profile catalog is exempt: that wrapper owns the element it renders, and the preference applies to its callers.

`recommended-ui` treats the rule as a warning; `strict-ui` treats it as an error. Use a narrowly targeted `KUI-L301` profile exception when a documented application boundary cannot follow the preference. Component substitutions are not autofixed because their props and interaction contracts can differ.
