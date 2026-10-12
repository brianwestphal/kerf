# Document baseline

Import `@kerfjs/ui/document.css` when an application wants Kerf UI to own its
document-level defaults:

```ts
import "@kerfjs/ui/document.css";
```

```html
<body>
  <div id="app" class="kui-app-root"></div>
</body>
```

The opt-in stylesheet applies `border-box` sizing to every element and
pseudo-element, removes the body margin, and gives the body the foundation
font, foreground, lowered surface, and `1.45` line height. Plain links use the
semantic `--kui-color-text-link` token with zero selector specificity.
Native table cells (`th`, `td`) and form controls (`button`, `input`, `select`,
`textarea`) inherit the surrounding font family, size, and line height through
zero-specificity selectors. Table headers keep their native bold weight and
alignment, and application styles can override the baseline.

Native controls also get semantic cursors, again at zero specificity so a
component's or application's own cursor wins:

- `pointer` on enabled `button`, `a[href]`, `[role="button"]` (unless
  `aria-disabled="true"`), `summary`, `select`, checkbox / radio / color /
  file / button / reset / submit inputs, and a `label` wrapping an enabled
  checkbox or radio;
- `not-allowed` on disabled `button`, `input`, `select`, and `textarea`, on
  `[role="button"][aria-disabled="true"]`, and on a disabled `wa-button`'s
  `base` part (Web Awesome leaves a pointer there);
- `text` on enabled `textarea` and text-like inputs (`text`, `search`,
  `email`, `url`, `tel`, `password`, `number`, and untyped).

Applications no longer need their own global cursor policy for native
controls.

`html`, `body`, and `.kui-app-root` form a definite `height: 100%` chain. Add
`.kui-app-root` to the one direct mount container of a full-height application
whose child is a `Workbench`, `SplitView`, `NavStack`, or another percentage-
height shell. Ordinary document-flow pages can import the baseline without the
class. Do not put `.kui-app-root` on several sibling containers: each requests
the full available document height.
The class sets `height: 100%`, not a viewport minimum; the direct child shell
must also fill its parent (for example with its `fill` prop). If the host page
already supplies a definite height, use that host geometry instead.

`kui-app-root` is the public class of the component catalog's
`document-baseline` entry, so `kerf-ui-doctor` and the
`kerfjs/ui-public-boundaries` ESLint rule accept it (no KUI-L101 finding).

The stylesheet is intentionally absent from `@kerfjs/ui/styles.css` and every
component browser import because its global selectors would otherwise change
consumer documents implicitly. Import it once and load application overrides
after it.
