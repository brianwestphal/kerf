// KF-SVM8Z6: a temporary profile alone still reaches Firefox's shared macOS
// app data. Keep automated runs out of the person's protected Firefox data.
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

export function createFirefoxAppData({
  platform = process.platform,
  env = process.env,
} = {}) {
  const environment = { ...env };
  if (
    platform !== 'darwin' ||
    (environment.MOZ_APP_DATA && environment.MOZ_LOCAL_APP_DATA)
  )
    return { env: environment, dispose() {} };

  const root = mkdtempSync(join(tmpdir(), 'kerf-firefox-app-data-'));
  const dispose = () => {
    process.removeListener('exit', dispose);
    rmSync(root, { recursive: true, force: true });
  };
  try {
    environment.MOZ_APP_DATA = join(root, 'data');
    environment.MOZ_LOCAL_APP_DATA = join(root, 'cache');
    mkdirSync(environment.MOZ_APP_DATA);
    mkdirSync(environment.MOZ_LOCAL_APP_DATA);
  } catch (error) {
    dispose();
    throw error;
  }
  process.once('exit', dispose);
  return { env: environment, dispose };
}
