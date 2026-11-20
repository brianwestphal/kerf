# `kerfjs/prefer-signal-leaf`

An editor suggestion can move a dependency from a Kerf mount render to one DOM text node or attribute. If a signal is the render's only dependency, subsequent writes update the bound node without running the render again.

```tsx
import { mount, signal } from "kerfjs";

const label = signal("Ready");
mount(root, () => <span>{label.value}</span>);
// Editor suggestion: <span>{label}</span>
```

## Enabling the rule

Add a flat-config entry to the project's existing ESLint configuration. Install `@typescript-eslint/parser` and its supported TypeScript peer. The rule uses the TypeScript program supplied by the parser. All Kerf presets leave it off.

```js
import kerfjs from "eslint-plugin-kerfjs";
import parser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.tsx"],
    languageOptions: { parser, parserOptions: { projectService: true } },
    plugins: { kerfjs },
    rules: { "kerfjs/prefer-signal-leaf": "warn" },
  },
];
```

The file's TypeScript project needs strict null checks, automatic JSX (`react-jsx` or `react-jsxdev`), and `jsxImportSource: "kerfjs"`. An untyped file receives no suggestions. Files with JSX pragmas are skipped.

## Which reads qualify?

- A direct text child containing just `name.value` with a string or number payload, or `title={name.value}` with a string payload.
- `name` is a stable `const` outside the render, initialized by a named `signal` or `computed` import from `kerfjs`. Aliases work. A similarly shaped object, a getter, or a nullable or erased signal type gives insufficient evidence.
- The element is returned directly by an inline callback passed to the imported Kerf `mount`. Its JSX ancestors are fragments or ordinary `div`, `span`, `small`, `em`, or `strong` elements. The narrow list avoids raw-text, form, SVG, parser-sensitive and custom-element contexts. Spreads, content editing and explicit morph ownership can change who controls a node, so those hosts and their descendants are skipped.

Reads used for branching, formatting, custom component props, and list rows need a separate decision about who should subscribe. A signal carrying `SafeHtml` can render markup when read in JSX, whereas a direct text binding would stringify its value.

## Reviewing the suggestion

Review work elsewhere in the mount that relies on a rerender, including effects of calling other functions. Apply the suggestion when the text or title should update independently. Code that observes child-node boundaries, parser normalization of control characters, or mount invocation counts can observe the change. ESLint offers the edit in the editor and leaves the file alone under `--fix`. The runtime `valueOnlyRerender` warning observes actual renders and can surface patterns outside this rule's static checks.
