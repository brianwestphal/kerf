import type { UiDoctorDiagnostic } from './index.mjs';

export function collectProjectGuidanceFiles(
  root: string,
  packageRoot?: string,
): Promise<{ files: string[]; complete: boolean }>;

export function checkProjectGuidance(
  root: string,
  packageRoot?: string,
): Promise<UiDoctorDiagnostic[]>;
