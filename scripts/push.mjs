import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  decideCheckSkip,
  isForced,
  readCheckEnvironment,
  readCheckPass,
  readWorktreeState,
  treeOf,
} from './lib/check-pass-cache.mjs';

const DIRTY_HELP =
  'Push requires a clean worktree before verification. Keep unrelated edits in place and push from a clean detached worktree at the exact commit (see docs/25-ticket-timing.md).';

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              `${command} ${args.join(' ')} failed (${signal ?? code})`,
            ),
          ),
    );
  });
}

/** Only refspecs whose source is this checkout's HEAD can reuse its check. */
export async function resolvePushArgs(args, cwd, gitOutput) {
  if (args.length === 0) {
    const upstream = (
      await gitOutput(
        ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'],
        cwd,
      )
    ).trim();
    const slash = upstream.indexOf('/');
    if (slash < 1 || slash === upstream.length - 1)
      throw new Error(
        'No upstream branch. Use `npm run push -- <remote> HEAD:<branch>`.',
      );
    return [
      upstream.slice(0, slash),
      `HEAD:refs/heads/${upstream.slice(slash + 1)}`,
    ];
  }
  if (args.length !== 2 || args.some((arg) => arg.startsWith('-')))
    throw new Error(
      'Use `npm run push -- <remote> <branch|HEAD:branch>` for a single HEAD tree.',
    );
  const [remote, refspec] = args;
  const source = refspec.split(':', 1)[0];
  if (
    !source ||
    refspec.startsWith(':') ||
    refspec.includes('+') ||
    refspec.includes('*')
  )
    throw new Error(
      'Push one local commit source at a time; deletion, force, and wildcard refspecs are unsupported.',
    );
  return [remote, refspec];
}

export async function verifiedPush({
  cwd,
  args,
  env = process.env,
  getState = readWorktreeState,
  getEnvironment = readCheckEnvironment,
  getPass = readCheckPass,
  getTree = treeOf,
  gitOutput,
  check = () => run('npm', ['run', 'check'], cwd),
  push = (pushArgs) => run('git', ['push', ...pushArgs], cwd),
}) {
  const before = await getState(cwd);
  if (!before.clean || !before.tree) throw new Error(DIRTY_HELP);
  if (isForced(env))
    throw new Error(
      'Unset KERF_FORCE_CHECK before `npm run push`; it would rerun the gate inside the SSH connection.',
    );
  const pushArgs = await resolvePushArgs(args, cwd, gitOutput);
  const source = pushArgs[1].split(':', 1)[0];
  if ((await getTree(cwd, source)) !== before.tree)
    throw new Error(
      'The pushed refspec differs from HEAD. Check out that commit in a clean worktree before pushing.',
    );

  await check();
  const current = await getState(cwd);
  const decision = decideCheckSkip({
    force: false,
    cached: await getPass(cwd),
    current: {
      ...current,
      ...(await getEnvironment(cwd)),
      pushedTrees: [await getTree(cwd, source)],
    },
  });
  if (!decision.skip)
    throw new Error(
      `Check passed but the pre-push hook would rerun it (${decision.reason}). Push from a clean worktree with a recorded pass; see docs/25-ticket-timing.md.`,
    );
  await push(pushArgs);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const cwd = process.cwd();
  const gitOutput = (args) =>
    new Promise((resolve, reject) => {
      let output = '';
      const child = spawn('git', args, {
        cwd,
        stdio: ['ignore', 'pipe', 'inherit'],
      });
      child.stdout.on('data', (chunk) => (output += chunk));
      child.once('error', reject);
      child.once('exit', (code) =>
        code === 0
          ? resolve(output)
          : reject(new Error(`git ${args.join(' ')} failed`)),
      );
    });
  verifiedPush({ cwd, args: process.argv.slice(2), gitOutput }).catch(
    (error) => {
      console.error(`[push] ${error.message}`);
      process.exitCode = 1;
    },
  );
}
