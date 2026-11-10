import type { ViewType } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ProjectTypeService } from '../../../src/editor/project-type-service.js';
import { createEditor } from './kerf-catalog.js';

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  document.body.replaceChildren();
});
const typed = (text: string): ViewType => ({
  kind: 'string',
  typescript: { text, source: 'inbox.kui.json', references: [] },
});

function open(service: ProjectTypeService) {
  const root = document.createElement('div');
  document.body.append(root);
  const save = vi.fn();
  const editor = createEditor({ typeService: service, save });
  const stop = mount(root, editor.render);
  const unwire = editor.wire(root);
  dispose = () => {
    unwire();
    stop();
  };
  return {
    root,
    editor,
    save,
    export: () =>
      root
        .querySelector<HTMLElement>('[data-action="editor-export-module"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true })),
  };
}

describe('project parameter integration', () => {
  it('checks project types again at export and refuses failed checks', async () => {
    const service = vi.fn<ProjectTypeService>(async (request) => ({
      document: request.action === 'validate' ? request.document : undefined,
      diagnostics: [],
    }));
    const f = open(service);
    f.editor.document.value = {
      ...f.editor.document.value,
      params: {
        ...f.editor.document.value.params,
        title: { type: typed('string'), default: 'Inbox' },
      },
    };
    await vi.waitFor(() =>
      expect(service).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'validate',
          source: 'inbox.kui.json',
        }),
      ),
    );
    f.export();
    await vi.waitFor(() => expect(f.save).toHaveBeenCalled());
    expect(f.save.mock.calls[0][1]).toContain('readonly title?: string');
    f.save.mockClear();
    service.mockResolvedValueOnce({
      diagnostics: [{ message: 'Project changed: incompatible type' }],
    });
    f.export();
    await vi.waitFor(() =>
      expect(f.root.textContent).toContain(
        'Project changed: incompatible type',
      ),
    );
    expect(f.save).not.toHaveBeenCalled();
  });

  it('commits dialog edits as one undo step and refreshes compiler projections without one', async () => {
    const service = vi.fn<ProjectTypeService>(async (request) =>
      request.action === 'analyze'
        ? { type: typed(request.text), diagnostics: [] }
        : { document: request.document, diagnostics: [] },
    );
    const f = open(service);
    f.root
      .querySelector<HTMLElement>(
        '[role="tab"][data-tab-id="editor-document-areas-params"]',
      )!
      .click();
    f.root
      .querySelector<HTMLElement>('[data-editor-param-row="title"]')!
      .click();
    await vi.waitFor(() =>
      expect(
        f.root.querySelector<HTMLButtonElement>(
          '[data-action="editor-parameter-save"]',
        )!.disabled,
      ).toBe(false),
    );
    const name = f.root.querySelector<HTMLInputElement>(
      '[data-parameter-draft="name"] input',
    )!;
    name.value = 'heading';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    f.root
      .querySelector<HTMLElement>('[data-action="editor-parameter-save"]')!
      .click();
    await vi.waitFor(() =>
      expect(f.editor.document.value.params?.heading).toBeDefined(),
    );
    const current = f.editor.document.value;
    service.mockImplementation(async (request) =>
      request.action === 'validate'
        ? {
            document: {
              ...request.document,
              params: {
                ...request.document.params,
                heading: {
                  ...request.document.params!.heading,
                  type: { ...typed('string'), text: 'refreshed projection' },
                },
              },
            },
            diagnostics: [],
          }
        : { type: typed(request.text), diagnostics: [] },
    );
    window.dispatchEvent(new Event('focus'));
    await vi.waitFor(() => expect(f.editor.document.value).not.toBe(current));
    f.root.querySelector<HTMLElement>('[data-action="editor-undo"]')!.click();
    expect(f.editor.document.value.params?.title).toBeDefined();
    expect(f.editor.document.value.params?.heading).toBeUndefined();
  });
});
