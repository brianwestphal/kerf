import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { bundle, directory, inspectSource, typecheck } from './compile.mjs';
import { replay } from './scenarios.mjs';

const root = path.join(directory, 'attempts');
const cells = process.argv.slice(2);
const diagnostic = cells[0] === '--correct-list-import';
if (diagnostic) {
  if (cells.length !== 1)
    throw Error(
      'The diagnostic uses exactly the four original Kerf first passes.',
    );
  cells.splice(
    0,
    1,
    'kerf-current-1',
    'kerf-current-2',
    'kerf-candidate-1',
    'kerf-candidate-2',
  );
}
const browser = await chromium.launch();
try {
  for (const id of cells.length
    ? cells
    : (await readdir(root)).filter((id) => !id.startsWith('.')).sort()) {
    const folder = path.join(root, id);
    const metadata = JSON.parse(
      await readFile(path.join(folder, 'run.json'), 'utf8'),
    );
    const raw = await readFile(path.join(folder, 'response.json'), 'utf8');
    if (
      createHash('sha256').update(raw).digest('hex') !== metadata.responseSha256
    )
      throw Error('Answer hash differs for ' + id);
    let { source, prediction } = JSON.parse(raw);
    if (diagnostic) {
      const before = "import { each } from 'kerfjs/list';";
      if (source.split(before).length !== 2)
        throw Error('The diagnostic expects one exact each import');
      source = source.replace(before, "import { each } from 'kerfjs';");
    }
    const row = {
      id,
      attempt: metadata.attempt,
      browser: browser.version(),
      imports: [],
      build: false,
      compile: null,
      buildError: null,
      tasks: {},
      observed: {},
      calibration: {},
    };
    if (diagnostic)
      row.intervention =
        'Evaluator changed only the each import specifier from kerfjs/list to kerfjs; never an authored attempt.';
    try {
      row.imports = inspectSource(id, metadata.framework, source);
      row.compile = await typecheck(metadata.framework, source);
      const assets = await bundle(metadata.framework, source);
      row.build = true;
      Object.assign(row, await replay(browser, assets));
    } catch (error) {
      row.buildError = (error.errors ?? [{ text: error.message }])
        .map((e) => e.text ?? String(e))
        .join('\n')
        .slice(0, 1200);
    }
    for (const key of [
      'badgeAfterInactiveWrite',
      'titleAfterInactiveWrite',
      'sameFocusedInput',
      'selectionRowCalls',
      'remountCommits',
    ])
      row.calibration[key] = Object.hasOwn(row.observed, key)
        ? row.observed[key] === prediction[key]
        : null;
    await writeFile(
      path.join(
        folder,
        diagnostic ? 'evaluator-import-control.json' : 'outcome.json',
      ),
      JSON.stringify(row, null, 2) + '\n',
    );
    console.log(
      id,
      'ts',
      row.compile?.pass,
      'build',
      row.build,
      'tasks',
      Object.entries(row.tasks)
        .map(([key, value]) => key + '=' + value.pass)
        .join(' '),
    );
  }
} finally {
  await browser.close();
}
