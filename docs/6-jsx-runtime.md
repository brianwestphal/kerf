# 6. JSX runtime

kerf ships its own JSX runtime at `kerf/jsx-runtime`. JSX renders to `SafeHtml` — a small wrapper around an HTML string. There's no virtual DOM, no element tree, no reconciliation tree. Just strings.

## 6.1 Configuration

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "kerf"
  }
}
```

That's the entire setup. The TypeScript / esbuild / vitest JSX transform looks for `kerf/jsx-runtime` and finds the `jsx`, `jsxs`, `jsxDEV`, and `Fragment` exports there.

## 6.2 What JSX produces

```tsx
const greeting = <p className="hi">Hello, world</p>;
```

The transform calls `jsx('p', { className: 'hi', children: 'Hello, world' })`, which returns a `SafeHtml`:

```ts
greeting.toString();
// → '<p class="hi">Hello, world</p>'
```

`SafeHtml` is just `{ __html: string; toString() }`. Pass it to `mount()`, to `toElement()`, or call `.toString()` and write it into a server response.

## 6.3 Attribute aliases

JSX attributes use camelCase (React convention). The runtime translates the common ones to their HTML / SVG equivalents:

| JSX | Output |
| --- | --- |
| `className` | `class` |
| `htmlFor` | `for` |
| `tabIndex` | `tabindex` |
| `strokeWidth` | `stroke-width` |
| `fillOpacity` | `fill-opacity` |
| `xlinkHref` | `xlink:href` |
| ...many more in `src/jsx-runtime.ts` | |

Anything not in the alias table is passed through verbatim. So `data-action`, `aria-label`, `data-key` all work as expected (JSX-to-HTML uses the literal attribute name).

## 6.4 Boolean attributes

```tsx
<input type="checkbox" checked={isOn} />
```

- `checked={true}` → `checked` (attribute present, no value)
- `checked={false}` → omitted entirely
- `checked={null}` / `checked={undefined}` → omitted entirely

This matches HTML semantics — a boolean attribute is "on" by being present, regardless of its value.

## 6.5 Children

```tsx
<div>
  Static text
  {dynamicString}        {/* HTML-escaped */}
  {42}                   {/* number, no escaping */}
  {someSafeHtml}         {/* injected raw — already escaped by the producer */}
  {[item1, item2]}       {/* arrays joined */}
  {null}{undefined}{false}  {/* nothing rendered */}
</div>
```

**Strings are HTML-escaped automatically.** `<` becomes `&lt;`, `&` becomes `&amp;`, etc. No XSS surface.

**`SafeHtml` children are injected raw.** That's the whole point — a sub-component returns `SafeHtml`, it composes without re-escaping.

**DOM nodes throw.** If you accidentally pass `toElement(...)` (a DOM node) as a child, the runtime throws a descriptive error. The runtime renders to strings; DOM nodes have no string equivalent.

## 6.6 `raw(html)`

For when you have a pre-escaped HTML string (rendered Markdown, sanitised user input, an SVG icon literal):

```ts
import { raw } from 'kerf';

const icon = raw('<svg ...><path d="..."/></svg>');

mount(rootEl, () => (
  <button>
    {icon}
    Click me
  </button>
));
```

`raw()` is `new SafeHtml(html)`. The caller is responsible for ensuring the input is safe.

## 6.7 `Fragment`

```tsx
function MyList() {
  return (
    <>
      <li>one</li>
      <li>two</li>
    </>
  );
}
```

Renders without a wrapper tag. Just concatenates its children's strings.

## 6.8 Function components

A function component is a function that takes props and returns `SafeHtml`:

```tsx
interface ButtonProps { label: string; action: string }

function ActionButton({ label, action }: ButtonProps) {
  return <button data-action={action}>{label}</button>;
}

mount(root, () => (
  <div>
    <ActionButton label="Add" action="add" />
    <ActionButton label="Reset" action="reset" />
  </div>
));
```

The JSX transform invokes the function with the props it gathered; the function returns a `SafeHtml`; the parent JSX inlines it. There's no instance, no lifecycle, no state — components are just JSX-string builders.

If you want stateful behaviour, the state lives in signals/stores OUTSIDE the component, and the component reads them:

```tsx
import { signal } from 'kerf';
const count = signal(0);

function Counter() {
  return <span>{count.value}</span>;
}
```

The `mount()` that hosts `<Counter />` will re-render when `count` changes, which re-runs the component function.

## 6.9 Server-side use

`SafeHtml.toString()` works in any JS environment — Node, Deno, Bun, edge runtimes. There's no DOM dependency. Build your page server-side, write the string into the response, then call `mount()` on the same root in the browser to wire up reactivity.
