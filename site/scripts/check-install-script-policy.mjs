import { readFile } from 'node:fs/promises';

const expectedPolicy = {
  esbuild: true,
  fsevents: false,
  'file:../..': false,
};

const projects = [
  {
    label: 'site',
    packageJsonUrl: new URL('../package.json', import.meta.url),
    packageLockUrl: new URL('../package-lock.json', import.meta.url),
    expectedInstallers: ['esbuild@0.28.2', 'fsevents@2.3.3'],
  },
  {
    label: 'reactivity demo',
    packageJsonUrl: new URL('../../examples/reactivity-demo/package.json', import.meta.url),
    packageLockUrl: new URL('../../examples/reactivity-demo/package-lock.json', import.meta.url),
    expectedInstallers: ['esbuild@0.25.12', 'fsevents@2.3.3'],
  },
];

for (const project of projects) {
  const packageJson = JSON.parse(await readFile(project.packageJsonUrl, 'utf8'));
  const packageLock = JSON.parse(await readFile(project.packageLockUrl, 'utf8'));
  const actualPolicy = packageJson.allowScripts ?? {};
  if (JSON.stringify(actualPolicy) !== JSON.stringify(expectedPolicy)) {
    throw new Error(`${project.label} allowScripts must be ${JSON.stringify(expectedPolicy)}`);
  }

  const installers = Object.entries(packageLock.packages)
    // A project's root package may have its own lifecycle scripts; only audit
    // dependency installers that npm may execute after the policy check.
    .filter(([path, entry]) => path.startsWith('node_modules/') && entry.hasInstallScript)
    .map(([path, entry]) => `${path.split('node_modules/').at(-1)}@${entry.version}`)
    .sort();

  if (JSON.stringify(installers) !== JSON.stringify(project.expectedInstallers)) {
    throw new Error(`${project.label} install-script packages changed; review and update the policy: ${installers.join(', ')}`);
  }
}

console.log('Site and reactivity-demo install-script policy: approved esbuild; denied fsevents and local Kerf prepare script');
