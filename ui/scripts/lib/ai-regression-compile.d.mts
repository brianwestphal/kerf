export interface AiRegressionCompileDiagnostic {
  code: number;
  file?: string;
  line?: number;
  column?: number;
  message: string;
}

export interface AiRegressionCompileEvidence {
  schemaVersion: 1;
  caseId: string | null;
  responseSha256: string;
  compilerOptionsSha256: string;
  typescriptVersion: string;
  packages: Array<{
    name: string;
    version: string;
    declarationSetSha256: string;
  }>;
  compiledFiles: number;
  passed: boolean;
  diagnostics: AiRegressionCompileDiagnostic[];
}

export function compileAiRegressionResponse(
  root: string,
  response: unknown,
  responseText?: string,
): Promise<AiRegressionCompileEvidence>;
