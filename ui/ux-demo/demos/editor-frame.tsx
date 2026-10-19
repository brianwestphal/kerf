import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { rem } from '@kerfjs/ui/css-values';
import { EditorFrame } from '@kerfjs/ui/editor-frame';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

const toolbar = (
  <Toolbar
    label="Markdown Editor Toolbar"
    dividerSides="b"
    leading={<ToolbarText size="small" text="Editing Markdown" />}
  />
);

export function EditorFrameDemo() {
  return (
    <CatalogExampleStack
      label="EditorFrame Variants"
      rootAttributes={{ 'data-demo': 'editor-frame' }}
    >
      <CatalogExample
        label="Framed Source"
        note="The toolbar stays fixed while the native source textarea scrolls within a 320px frame."
      >
        <EditorFrame mode="source" label="Markdown Editor" toolbar={toolbar}>
          <textarea name="editor-frame-source" aria-label="Markdown Source">
            {'# Project Notes\n\n' +
              Array.from(
                { length: 24 },
                (_, index) =>
                  `Line ${index + 1}: A longer Markdown draft remains editable.`,
              ).join('\n')}
          </textarea>
        </EditorFrame>
      </CatalogExample>
      <CatalogExample
        label="Framed Preview"
        note="The preview surface scrolls under the same fixed toolbar."
      >
        <EditorFrame mode="preview" label="Markdown Preview" toolbar={toolbar}>
          <article>
            <h3>Project Notes</h3>
            {Array.from({ length: 18 }, (_, index) => (
              <p>Paragraph {index + 1} stays within the preview scrollport.</p>
            ))}
          </article>
        </EditorFrame>
      </CatalogExample>
      <CatalogExample
        label="Embedded Source"
        note="The host owns the frame; an autosizing native field grows with its draft. Flush removes the text inset."
      >
        <EditorFrame
          mode="source"
          appearance="embedded"
          inset="flush"
          sourceAutosize
          label="Embedded Markdown Editor"
        >
          <textarea
            name="editor-frame-embedded"
            aria-label="Embedded Markdown Source"
          >
            {
              'A recovered draft remains in the native textarea.\nA second line grows the field.'
            }
          </textarea>
        </EditorFrame>
      </CatalogExample>
      <CatalogExample
        label="Restored Source Height"
        note="A host can restore a persisted native textarea height without framing the editor again."
      >
        <EditorFrame
          mode="source"
          appearance="embedded"
          sourceHeight={rem(10)}
          label="Restored Markdown Editor"
        >
          <textarea
            name="editor-frame-restored"
            aria-label="Restored Markdown Source"
          >
            A saved draft starts at its restored height and remains resizable.
          </textarea>
        </EditorFrame>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
