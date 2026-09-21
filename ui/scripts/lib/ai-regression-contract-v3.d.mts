export interface AiRegressionEvidenceRecordV3 {
  code: string;
  outcome: 'pass' | 'fail' | 'not-applicable' | 'not-recorded';
  rating?: number;
  detail: string;
  diagnosticIds: string[];
  adjudication?:
    'true-positive' | 'false-positive' | 'disputed' | 'not-reviewed';
  adjudicator?: string;
  rationale?: string;
}

export interface AiRegressionEvidenceV3 {
  schemaVersion: 3;
  suiteId: 'kerf-ui-authoring-v3';
  stage: 'static' | 'compile' | 'browser' | 'human-visual';
  attempt: number;
  sourceTool: {
    name: string;
    packageVersion: string;
    reportVersion: number;
    schemaVersion: number;
  };
  records: AiRegressionEvidenceRecordV3[];
  reviewer?: string;
  artifacts?: Array<{ path: string; sha256: string; context?: string }>;
  browserAssertions?: Array<{
    id: string;
    outcome: 'pass' | 'fail';
    detail: string;
  }>;
  [key: string]: unknown;
}

export function validateAiRegressionResponseV3(
  caseDefinition: {
    id: string;
    editableFiles: string[];
  },
  response: {
    caseId?: string;
    files?: Record<string, string>;
  },
): string[];

export function validateAiRegressionEvidenceV3(
  contract: any,
  evidence: AiRegressionEvidenceV3,
): string[];

export function summarizeAiRegressionEvidenceV3(
  contract: any,
  evidenceRecords: AiRegressionEvidenceV3[],
): {
  hardPass: boolean;
  hardChecks: number;
  visualMean: number | null;
  visualDimensions: Record<string, number>;
  visualPass: boolean;
};
export function summarizeAiRegressionCaseV3(
  contract: any,
  caseDefinition: { id: string; requiredDiagnostics: string[] },
  evidenceRecords: AiRegressionEvidenceV3[],
): {
  errors: string[];
  hardPass: boolean;
  hardChecks: number;
  visualMean: number | null;
  visualDimensions: Record<string, number>;
  visualPass: boolean;
};
