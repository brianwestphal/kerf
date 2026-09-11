import { pathToFileURL } from 'node:url';

const BLOCKING_WARNINGS = [
  /A static route cannot be defined more than once\./i,
  /A dynamic SSR route cannot be defined more than once\./i,
  /A collision will result in a hard error in (?:following|future) versions of Astro\./i,
];

export function findBlockingSiteBuildWarnings(output) {
  return output
    .split(/\r?\n/)
    .filter((line) => BLOCKING_WARNINGS.some((pattern) => pattern.test(line)));
}

async function main() {
  let output = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) output += chunk;
  const warnings = findBlockingSiteBuildWarnings(output);
  if (warnings.length === 0) {
    console.log('Site build warning gate: no route collisions or future hard errors');
    return;
  }

  console.error('Site build warning gate rejected warnings that represent route collisions or future hard errors:');
  for (const warning of warnings) console.error(warning);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
