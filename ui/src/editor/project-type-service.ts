// The browser/host boundary for the Node project language service. No compiler
// implementation crosses this boundary or enters a browser bundle.
import type { ViewDiagnostic, ViewDocument, ViewType } from '@kerfjs/ui/view';

export interface TypeSuggestion {
  readonly name: string;
  readonly source?: string;
  readonly text: string;
  readonly cursor: number;
}

export interface TypeExpressionResult {
  readonly type?: ViewType;
  readonly suggestions?: readonly TypeSuggestion[];
  readonly diagnostics: readonly {
    readonly message: string;
    readonly start?: number;
    readonly length?: number;
  }[];
}

export type ProjectTypeRequest =
  | {
      readonly action: 'analyze';
      readonly source: string;
      readonly text: string;
      readonly cursor?: number;
      readonly declared?: ViewType;
    }
  | {
      readonly action: 'validate';
      readonly source: string;
      readonly document: ViewDocument;
    };

export interface ProjectTypeResult extends TypeExpressionResult {
  readonly document?: ViewDocument;
}

/** A host-provided project compiler, normally the editor dev-server endpoint. */
export type ProjectTypeService = (
  request: ProjectTypeRequest,
) => Promise<ProjectTypeResult>;

export const EDITOR_TYPES_API = '/__kerf-ui-editor/api/types';

export const TYPE_SERVICE_REQUIRED: ViewDiagnostic = {
  code: 'KUI-V018',
  path: '$.params',
  message:
    'Project TypeScript validation is unavailable. Connect this editor to its project dev server.',
};

/** The default dev-server transport; custom editor hosts can supply their own. */
export function devServerTypeService(
  api = EDITOR_TYPES_API,
): ProjectTypeService {
  return async (request) => {
    const response = await globalThis.fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Kerf-UI-Editor': '1' },
      body: JSON.stringify(request),
    });
    if (!response.ok)
      throw new Error((await response.text()) || response.statusText);
    return response.json() as Promise<ProjectTypeResult>;
  };
}
