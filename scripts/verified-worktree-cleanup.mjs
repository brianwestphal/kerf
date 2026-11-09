#!/usr/bin/env node
// KF-BFBT16: remove a completed direct-ticket worktree only after its patches
// and the exact shipping commit have been verified on remote main.
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const fullSha = /^[0-9a-f]{40}$/i;
const ticketSlug = /^KF-[A-Z0-9]+$/;
const zeroSha = '0'.repeat(40);

function gitEnvironment() {
  const env = { ...process.env };
  for (const key of [
    'GIT_DIR',
    'GIT_WORK_TREE',
    'GIT_INDEX_FILE',
    'GIT_COMMON_DIR',
    'GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_PREFIX',
  ])
    delete env[key];
  return env;
}

export function command(binary, args, cwd, input) {
  const result = spawnSync(binary, args, {
    cwd,
    encoding: 'utf8',
    env: gitEnvironment(),
    input,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
}

function requireProof(condition, reason) {
  if (!condition) throw new Error(reason);
}

function checked(run, binary, args, cwd, input) {
  const result = run(binary, args, cwd, input);
  requireProof(
    result.status === 0,
    result.stderr?.trim() || `${binary} ${args.join(' ')} failed`,
  );
  return result.stdout.trim();
}

function git(run, cwd, ...args) {
  return checked(run, 'git', args, cwd);
}

function field(frontmatter, name) {
  return new RegExp(`^${name}: (.+)$`, 'm').exec(frontmatter)?.[1];
}

function ticketIdentity(project, store, slug, run) {
  const checkout = JSON.parse(
    checked(run, 'hotsheet-cli', ['checkout', 'resolve', project], project),
  );
  requireProof(
    checkout.root &&
      realpathSync(checkout.root) === project &&
      checkout.sources?.some(
        (source) =>
          source.provider === 'git' && realpathSync(source.locator) === store,
      ),
    'checkout does not own this exact Hot Sheet store',
  );
  const markdown = checked(
    run,
    'hotsheet-cli',
    ['-C', store, 'show', slug],
    project,
  );
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown)?.[1];
  requireProof(frontmatter, 'ticket frontmatter is unavailable');
  requireProof(
    field(frontmatter, 'slug') === slug &&
      /^[0-9A-Z]{26}$/.test(field(frontmatter, 'id') ?? ''),
    'ticket identity does not match the requested slug',
  );
  requireProof(
    ['completed', 'verified', 'archive'].includes(field(frontmatter, 'status')),
    'ticket is not completed or verified',
  );
  requireProof(!field(frontmatter, 'claimed_by'), 'ticket has an active claim');
  const source = checkout.sources.find(
    (item) => item.provider === 'git' && realpathSync(item.locator) === store,
  );
  requireProof(source.connection_id, 'ticket store has no checkout connection');
  const snapshot = JSON.parse(
    checked(
      run,
      'hotsheet-cli',
      ['-C', store, 'coordination', '--project', project, 'status'],
      project,
    ),
  );
  const native = field(frontmatter, 'id');
  const sameTicket = (value) =>
    value?.connection_id === source.connection_id &&
    value?.native_id === native;
  requireProof(
    !snapshot.live_claims?.some((claim) => sameTicket(claim.ticket)),
    'ticket has a live coordination claim',
  );
  requireProof(
    Object.values(snapshot.state?.assignments ?? {})
      .filter((assignment) => sameTicket(assignment.ticket))
      .every(
        (assignment) =>
          assignment.phase === 'done' && !assignment.recovery_note,
      ),
    'ticket has an unfinished handoff or review',
  );
  return native;
}

function worktreeEntry(project, path, run) {
  const entries = git(run, project, 'worktree', 'list', '--porcelain').split(
    '\n\n',
  );
  const entry = entries.find((item) => {
    const listed = /^worktree (.+)$/m.exec(item)?.[1];
    return listed && existsSync(listed) && realpathSync(listed) === path;
  });
  requireProof(entry, 'worktree is not registered in this project');
  requireProof(!/^locked(?: |$)/m.test(entry), 'worktree is locked');
  requireProof(
    !/^prunable(?: |$)/m.test(entry),
    'worktree registration is stale',
  );
  const branch = /^branch refs\/heads\/(.+)$/m.exec(entry)?.[1];
  const head = /^HEAD ([0-9a-f]{40})$/im.exec(entry)?.[1]?.toLowerCase();
  requireProof(
    branch && branch !== 'main' && head,
    'worktree has no ticket branch and HEAD',
  );
  return { branch, head };
}

function patchId(project, commit, run) {
  const patch = git(run, project, 'show', '--format=', '--binary', commit);
  requireProof(patch, 'source commit has no patch');
  const id = checked(
    run,
    'git',
    ['patch-id', '--stable'],
    project,
    `${patch}\n`,
  ).split(/\s+/)[0];
  requireProof(fullSha.test(id), 'commit patch identity is unavailable');
  return id;
}

function shippedCommits(project, slug, head, shipping, run) {
  const subject = git(run, project, 'log', '-1', '--format=%s', head);
  requireProof(
    subject.startsWith(`${slug} `),
    'source HEAD subject does not name the ticket',
  );
  if (
    run('git', ['merge-base', '--is-ancestor', head, shipping], project)
      .status === 0
  )
    return [head];
  const base = git(run, project, 'merge-base', head, shipping);
  const source = git(run, project, 'rev-list', '--reverse', `${base}..${head}`)
    .split('\n')
    .filter(Boolean);
  const candidates = git(
    run,
    project,
    'rev-list',
    '--reverse',
    `${base}..${shipping}`,
  )
    .split('\n')
    .filter(Boolean);
  requireProof(
    source.length > 0 && candidates.length > 0,
    'source commits are unavailable',
  );
  const byPatch = new Map();
  for (const commit of candidates) {
    if (
      !git(run, project, 'log', '-1', '--format=%s', commit).startsWith(
        `${slug} `,
      )
    )
      continue;
    const id = patchId(project, commit, run);
    byPatch.set(id, [...(byPatch.get(id) ?? []), commit]);
  }
  const mapped = source.map((commit) => {
    requireProof(
      git(run, project, 'log', '-1', '--format=%s', commit).startsWith(
        `${slug} `,
      ),
      'source branch contains a commit for another ticket',
    );
    const matches = byPatch.get(patchId(project, commit, run)) ?? [];
    requireProof(
      matches.length === 1,
      'source patch has no unique shipping commit',
    );
    return matches[0];
  });
  requireProof(
    new Set(mapped).size === mapped.length,
    'source patches map ambiguously',
  );
  return mapped;
}

function greenExactCi(project, shipping, run) {
  const runs = JSON.parse(
    checked(
      run,
      'gh',
      [
        'run',
        'list',
        '--branch',
        'main',
        '--workflow',
        'CI',
        '--event',
        'push',
        '--limit',
        '100',
        '--json',
        'databaseId,headSha,headBranch,event,workflowName,status,conclusion,url',
      ],
      project,
    ),
  );
  const matches = runs.filter(
    (item) =>
      item.headSha?.toLowerCase() === shipping &&
      item.headBranch === 'main' &&
      item.event === 'push' &&
      item.workflowName === 'CI' &&
      item.status === 'completed' &&
      item.conclusion === 'success',
  );
  requireProof(
    matches.length > 0,
    'shipping commit has no exact green main CI run',
  );
  return matches[0].databaseId;
}

function remoteMain(project, shipping, run) {
  const line = git(
    run,
    project,
    'ls-remote',
    '--exit-code',
    'origin',
    'refs/heads/main',
  );
  const remote = /^([0-9a-f]{40})\s+refs\/heads\/main$/i
    .exec(line)?.[1]
    ?.toLowerCase();
  requireProof(remote, 'origin/main is unavailable');
  git(run, project, 'cat-file', '-e', `${remote}^{commit}`);
  requireProof(
    run('git', ['merge-base', '--is-ancestor', shipping, remote], project)
      .status === 0,
    'shipping commit is not on remote main',
  );
  return remote;
}

function idleWorktree(project, path, run) {
  requireProof(
    !git(run, path, 'status', '--porcelain=v1', '--untracked-files=all'),
    'worktree has tracked or untracked edits',
  );
  const handles = run('lsof', ['+D', path], project);
  requireProof(
    handles.status === 1 && !handles.stdout.trim() && !handles.stderr.trim(),
    handles.status === 0
      ? 'worktree has live process handles'
      : 'cannot prove the worktree has no live process handles',
  );
}

function parseArgs(values) {
  const options = {};
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === '--dry-run') {
      requireProof(!options.dryRun, 'duplicate --dry-run');
      options.dryRun = true;
      continue;
    }
    const key = values[index];
    requireProof(
      ['--project', '--store', '--ticket', '--worktree', '--shipping'].includes(
        key,
      ) &&
        values[index + 1] &&
        !options[key.slice(2)],
      `invalid cleanup option ${key ?? ''}`,
    );
    options[key.slice(2)] = values[++index];
  }
  for (const key of ['project', 'store', 'ticket', 'worktree', 'shipping'])
    requireProof(options[key], `--${key} is required`);
  return options;
}

export function cleanup(options, { run = command } = {}) {
  requireProof(
    ticketSlug.test(options.ticket ?? ''),
    'KF ticket slug is required',
  );
  requireProof(
    fullSha.test(options.shipping ?? ''),
    'full shipping SHA is required',
  );
  const project = realpathSync(options.project);
  const store = realpathSync(options.store);
  const requested = resolve(options.worktree);
  const path = existsSync(requested)
    ? realpathSync(requested)
    : join(realpathSync(dirname(requested)), basename(requested));
  const shipping = options.shipping.toLowerCase();
  const slug = options.ticket;
  requireProof(path !== project, 'main checkout cannot be cleaned');
  const common = git(
    run,
    project,
    'rev-parse',
    '--path-format=absolute',
    '--git-common-dir',
  );
  const intentPath = join(
    common,
    'kerf-worktree-cleanup',
    `${createHash('sha256').update(`${slug}\n${path}`).digest('hex')}.json`,
  );
  const previous = existsSync(intentPath)
    ? JSON.parse(readFileSync(intentPath, 'utf8'))
    : null;
  if (previous)
    requireProof(
      previous.slug === slug &&
        previous.path === path &&
        previous.shipping === shipping,
      'cleanup intent maps different evidence',
    );
  ticketIdentity(project, store, slug, run);
  const remote = remoteMain(project, shipping, run);
  const ciRun = greenExactCi(project, shipping, run);
  if (!existsSync(path)) {
    requireProof(previous, 'worktree is missing without cleanup intent');
    requireProof(
      git(
        run,
        project,
        'rev-parse',
        '--verify',
        `refs/kerf/cleanup-source/${previous.head}`,
      ) === previous.head,
      'archived source commit is unavailable after cleanup',
    );
    const branchRef = `refs/heads/${previous.branch}`;
    const current = run('git', ['rev-parse', '--verify', branchRef], project);
    if (current.status === 0) {
      requireProof(
        current.stdout.trim() === previous.head,
        'ticket branch changed after cleanup',
      );
      git(run, project, 'update-ref', '-d', branchRef, previous.head);
    }
    return { state: 'already_removed', branch: previous.branch, ciRun };
  }
  const { branch, head } = worktreeEntry(project, path, run);
  requireProof(
    branch === slug.toLowerCase() &&
      [branch, `kerf-${branch}`].includes(basename(path)),
    'branch or worktree path does not identify this ticket',
  );
  requireProof(
    git(run, path, 'rev-parse', 'HEAD') === head,
    'worktree HEAD changed',
  );
  requireProof(
    git(run, project, 'rev-parse', `refs/heads/${branch}`) === head,
    'ticket branch moved',
  );
  idleWorktree(project, path, run);
  const mapped = shippedCommits(project, slug, head, shipping, run);
  requireProof(
    run('git', ['merge-base', '--is-ancestor', shipping, remote], project)
      .status === 0,
    'shipping commit is not on remote main',
  );
  const proof = {
    state: options.dryRun ? 'verified' : 'removed',
    branch,
    head,
    shipping,
    mapped,
    ciRun,
  };
  if (options.dryRun) return proof;
  const intent = {
    version: 1,
    slug,
    path,
    branch,
    head,
    shipping,
    mapped,
    ciRun,
  };
  if (previous)
    requireProof(
      JSON.stringify(previous) === JSON.stringify(intent),
      'cleanup evidence changed',
    );
  else {
    mkdirSync(dirname(intentPath), { recursive: true });
    const temporary = `${intentPath}.${randomUUID()}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(intent)}\n`, {
      flag: 'wx',
      mode: 0o600,
    });
    renameSync(temporary, intentPath);
  }
  const archive = `refs/kerf/cleanup-source/${head}`;
  const existing = run('git', ['rev-parse', '--verify', archive], project);
  if (existing.status === 0)
    requireProof(existing.stdout.trim() === head, 'source archive ref differs');
  else git(run, project, 'update-ref', archive, head, zeroSha);
  git(run, project, 'worktree', 'remove', '--force', path);
  git(run, project, 'update-ref', '-d', `refs/heads/${branch}`, head);
  return proof;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.stdout.write(
      `${JSON.stringify(cleanup(parseArgs(process.argv.slice(2))))}\n`,
    );
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
