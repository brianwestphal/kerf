# EditorFrame

`EditorFrame` owns the geometry of a bounded writing surface. It keeps a Kerf
`Toolbar` above one scroll owner and gives standalone editors their border,
surface, radius, and inset. The application supplies a native `<textarea>` in
`mode="source"` or rendered content in `mode="preview"`; it retains the draft,
recovery, edit actions, and preview rendering.

```tsx
import { EditorFrame } from '@kerfjs/ui/editor-frame';
import { Toolbar } from '@kerfjs/ui/toolbar';

<EditorFrame
  mode="source"
  label="Markdown Editor"
  toolbar={<Toolbar label="Markdown Editor Toolbar" trailing={actions} />}
>
  <textarea name="markdown-source" aria-label="Markdown Source">
    {draft}
  </textarea>
</EditorFrame>;
```

The framed default is 320px high and at most 672px wide; `height` and `maxWidth`
accept typed `CssLength` values. The toolbar row stays fixed. In source mode,
the native textarea fills the remaining space and scrolls its own text while
the surrounding surface clips overflow. In preview mode, the surface scrolls
around the application's rendered content. No second nested scrollport is
introduced.

Set `appearance="embedded"` when a host already owns the frame. The border,
radius, fill, and fixed height then drop away. The embedded source can use
`sourceHeight` for a restored native textarea height or `sourceAutosize` to
grow with its content; the application still owns persistence and value updates.
Set `inset="flush"` when the host already provides the text inset. These modes
preserve the native textarea's selection, input events, and form behavior.

Set `expanded` to place the same editor in a fixed viewport overlay with a
32px inset and raised shadow. This takes precedence over embedded appearance
while expanded. The application owns the expand control, focus management, and
any modal behavior it needs. `toolbar` accepts a normal Kerf Toolbar and is
omitted when the embedded host supplies its own controls.

Import `@kerfjs/ui/editor-frame.css` when not using the browser export
condition; the browser entry includes its stylesheet automatically. The
component is demonstrated by the EditorFrame UX catalog route, with source,
preview, and embedded variants.
