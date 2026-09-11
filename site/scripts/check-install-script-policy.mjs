import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));

const expectedPolicy = {
  esbuild: true,
  sharp: true,
  'file:../..': false,
};
const actualPolicy = packageJson.allowScripts ?? {};
if (JSON.stringify(actualPolicy) !== JSON.stringify(expectedPolicy)) {
  throw new Error(`site allowScripts must be ${JSON.stringify(expectedPolicy)}`);
}

const expectedInstallers = ['esbuild@0.27.7', 'sharp@0.33.5', 'sharp@0.34.5'];
const installers = Object.entries(packageLock.packages)
  .filter(([, entry]) => entry.hasInstallScript)
  .map(([path, entry]) => `${path.split('node_modules/').at(-1)}@${entry.version}`)
  .sort();

if (JSON.stringify(installers) !== JSON.stringify(expectedInstallers)) {
  throw new Error(`site install-script packages changed; review and update the policy: ${installers.join(', ')}`);
}

console.log(`Site install-script policy: approved ${expectedInstallers.join(', ')}; denied local Kerf prepare script`);
