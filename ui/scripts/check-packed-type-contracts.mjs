import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const temporary = mkdtempSync(resolve(root, '.packed-type-contracts-'));

try {
  const packed = JSON.parse(
    execFileSync(
      'npm',
      ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          npm_config_cache: join(temporary, 'npm-cache'),
        },
      },
    ),
  );
  const tarball = join(temporary, packed[0].filename);
  const packageRoot = join(temporary, 'node_modules', '@kerfjs', 'ui');
  mkdirSync(packageRoot, { recursive: true });
  execFileSync(
    'tar',
    ['-xzf', tarball, '-C', packageRoot, '--strip-components=1'],
    { stdio: 'inherit' },
  );

  cpSync(
    resolve(root, 'node_modules/kerfjs'),
    join(temporary, 'node_modules/kerfjs'),
    {
      recursive: true,
    },
  );
  const fixtures = [
    resolve(root, 'tests/consumer-types/contracts/consumer.ts'),
    resolve(root, 'tests/consumer-types/contracts/semantic-content.tsx'),
  ];
  const consumers = fixtures.map((fixture) => {
    const consumer = join(temporary, basename(fixture));
    copyFileSync(fixture, consumer);
    return consumer;
  });
  writeFileSync(
    join(temporary, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          jsx: 'react-jsx',
          jsxImportSource: 'kerfjs',
          types: [],
        },
        files: consumers.map((consumer) => basename(consumer)),
      },
      null,
      2,
    )}\n`,
  );

  execFileSync(
    process.execPath,
    [resolve(root, 'node_modules/typescript7/bin/tsc'), '-p', temporary],
    { cwd: root, stdio: 'inherit' },
  );
  const packedManifest = JSON.parse(
    readFileSync(join(packageRoot, 'package.json'), 'utf8'),
  );
  console.log(
    `[check-packed-type-contracts] OK — ${packedManifest.name}@${packedManifest.version} declarations preserve 13 active KUI-T contracts.`,
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
