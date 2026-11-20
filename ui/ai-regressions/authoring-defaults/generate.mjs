import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
  mkdir,
  rename,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const [framework, condition, replicate, attemptArg = '1', ...extra] =
  process.argv.slice(2);
if (
  !['kerf', 'solid', 'react'].includes(framework) ||
  !['current', 'candidate'].includes(condition) ||
  !['1', '2'].includes(replicate) ||
  !['1', '2', '3'].includes(attemptArg) ||
  extra.length ||
  (framework !== 'kerf' && condition !== 'current')
)
  throw Error(
    'Usage: node generate.mjs <kerf|solid|react> <current|candidate> <1|2> [attempt 1..3]',
  );
const attempt = Number(attemptArg);
const caseId = [framework, condition, replicate].join('-');
const id = attempt === 1 ? caseId : caseId + '-a' + attempt;
const out = path.join(dir, 'attempts', id);
await mkdir(path.dirname(out), { recursive: true });
const answerFile = path.join(out, 'response.json');
try {
  await readFile(answerFile);
  throw Error('Cell already contains an answer');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const model = 'gpt-6.2-sol';
const common = await readFile(path.join(dir, 'prompt.txt'), 'utf8');
let context = await readFile(
  path.join(dir, 'guidance', framework + '.txt'),
  'utf8',
);
if (framework === 'kerf') {
  // Equal byte ceiling, deterministic inert padding for the shorter card.
  const cards = await Promise.all(
    ['current', 'candidate'].map((c) =>
      readFile(path.join(dir, 'guidance', 'kerf-' + c + '.txt'), 'utf8'),
    ),
  );
  const longest = Math.max(...cards.map((c) => Buffer.byteLength(c)));
  const card = cards[condition === 'current' ? 0 : 1];
  context += '\n' + card + ' '.repeat(longest - Buffer.byteLength(card));
}
if (Buffer.byteLength(context) > 1210)
  throw Error('Guidance exceeds the frozen 1,210-byte ceiling');
let prompt =
  common +
  '\n--- Frozen package guidance ---\n' +
  context +
  '\n--- End guidance ---\n';
if (attempt > 1) {
  const policy = JSON.parse(
    await readFile(path.join(dir, '../conditions-v3.json'), 'utf8'),
  );
  if (attempt > policy.maxAttempts)
    throw Error('Attempt exceeds the V3 ceiling');
  const previous = path.join(
    dir,
    'attempts',
    attempt === 2 ? caseId : caseId + '-a2',
  );
  const prior = JSON.parse(
    await readFile(path.join(previous, 'response.json'), 'utf8'),
  );
  const outcome = JSON.parse(
    await readFile(path.join(previous, 'outcome.json'), 'utf8'),
  );
  if (
    outcome.compile?.pass &&
    outcome.build &&
    Object.values(outcome.tasks).every((t) => t.pass)
  )
    throw Error('Passing cell needs no repair');
  const feedback = {
    compile: outcome.compile,
    build: outcome.buildError,
    tasks: Object.fromEntries(
      Object.entries(outcome.tasks).map(([key, t]) => [
        key,
        {
          failedChecks: Object.keys(t.checks).filter((k) => !t.checks[k]),
          errors: t.errors,
        },
      ]),
    ),
  };
  prompt +=
    '\n--- Previous answer ---\n' +
    prior.source +
    '\n--- Normalized compile and browser feedback ---\n' +
    JSON.stringify(feedback) +
    '\nRepair the existing answer and predict the behavior of the revised source. Same interface, limits, and allowed packages.\n';
}
const temp = await mkdtemp(path.join(os.tmpdir(), 'kerf-author-'));
const start = Date.now();
try {
  const schema = path.join(temp, 'response.schema.json');
  await writeFile(
    schema,
    await readFile(path.join(dir, 'response.schema.json')),
  );
  const args = [
    'exec',
    '--ignore-user-config',
    '--ephemeral',
    '--skip-git-repo-check',
    '--disable',
    'shell_tool',
    '--disable',
    'unified_exec',
    '--disable',
    'multi_agent',
    '-c',
    'model_reasoning_effort="low"',
    '-s',
    'read-only',
    '-m',
    model,
    '--output-schema',
    schema,
    '--json',
    '-C',
    temp,
    '-',
  ];
  const child = spawn('codex', args, {
    cwd: temp,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stream = '',
    stderr = '';
  child.stdout.on('data', (d) => (stream += d));
  child.stderr.on('data', (d) => (stderr += d));
  child.stdin.end(prompt);
  const timeout = setTimeout(() => child.kill('SIGTERM'), 240000);
  const code = await new Promise((resolve, reject) => {
    child.on('exit', resolve);
    child.on('error', reject);
  }).finally(() => clearTimeout(timeout));
  const events = stream
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  if (code !== 0) {
    throw Error(
      'Provider unavailable: ' +
        (events.findLast((e) => e.type === 'error')?.message ??
          stderr.slice(-250)),
    );
  }
  const items = events
    .filter((e) => e.type === 'item.completed')
    .map((e) => e.item);
  if (items.some((item) => !['agent_message', 'reasoning'].includes(item.type)))
    throw Error('Tool use invalidated no-tools cell');
  const raw = items.findLast((item) => item.type === 'agent_message')?.text;
  const response = JSON.parse(raw);
  if (
    typeof response.source !== 'string' ||
    Buffer.byteLength(response.source) > 10000
  )
    throw Error('Invalid source budget');
  const sha = (x) => createHash('sha256').update(x).digest('hex');
  const staged = await mkdtemp(path.join(path.dirname(out), '.pending-'));
  try {
    await writeFile(path.join(staged, 'response.json'), raw + '\n', {
      flag: 'wx',
    });
    await writeFile(
      path.join(staged, 'run.json'),
      JSON.stringify(
        {
          id,
          framework,
          condition,
          replicate: Number(replicate),
          model,
          reasoning: 'low',
          effortCeilingSeconds: 240,
          provider: 'Codex CLI 0.170.0 via ChatGPT',
          elapsedMs: Date.now() - start,
          promptBytes: Buffer.byteLength(prompt),
          guidanceBytes: Buffer.byteLength(context),
          promptSha256: sha(prompt),
          responseSha256: sha(raw + '\n'),
          attempt,
          feedbackPolicy:
            attempt === 1 ? 'guidance-only' : 'guidance-static-browser',
          toolsUsed: 0,
          filesReadByModel: 0,
          usage:
            events.findLast((e) => e.type === 'turn.completed')?.usage ?? null,
        },
        null,
        2,
      ) + '\n',
    );
    await rename(staged, out);
  } finally {
    await rm(staged, { recursive: true, force: true });
  }
  console.log('Recorded ' + id);
} finally {
  await rm(temp, { recursive: true, force: true });
}
