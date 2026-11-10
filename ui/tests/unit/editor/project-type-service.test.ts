import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  devServerTypeService,
  EDITOR_TYPES_API,
} from '../../../src/editor/project-type-service.js';

afterEach(() => vi.unstubAllGlobals());
describe('project type service transport', () => {
  it('posts compiler requests with the editor-only header and returns diagnostics', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ diagnostics: [], suggestions: [] }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const request = {
      action: 'analyze' as const,
      source: 'views/inbox.kui.json',
      text: 'string',
      cursor: 6,
    };
    expect(await devServerTypeService()(request)).toEqual({
      diagnostics: [],
      suggestions: [],
    });
    expect(fetch).toHaveBeenCalledWith(EDITOR_TYPES_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Kerf-UI-Editor': '1' },
      body: JSON.stringify(request),
    });
  });
  it('preserves a custom endpoint and reports server errors without claiming validation', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('Project unavailable', { status: 503 }),
      )
      .mockResolvedValueOnce(
        new Response('', { status: 404, statusText: 'Not found' }),
      );
    vi.stubGlobal('fetch', fetch);
    const service = devServerTypeService('/custom/types');
    const request = {
      action: 'analyze' as const,
      source: 'inbox.kui.json',
      text: 'string',
    };
    await expect(service(request)).rejects.toThrow('Project unavailable');
    await expect(service(request)).rejects.toThrow('Not found');
    expect(fetch.mock.calls[0][0]).toBe('/custom/types');
  });
});
