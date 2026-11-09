import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { cleanup, command } from './verified-worktree-cleanup.mjs';

const slug = 'KF-TEST';
const native = '01M00000000000000000000000';
const connection = 'synthetic-connection';

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'kerf-cleanup-'));
  const project = join(root, 'project');
  const store = join(root, 'store');
  const remote = join(root, 'remote.git');
  const worktree = join(root, 'kerf-kf-test');
  mkdirSync(project);
  mkdirSync(store);
  git(project, 'init', '-b', 'main');
  git(project, 'config', 'user.name', 'Cleanup Test');
  git(project, 'config', 'user.email', 'cleanup@example.invalid');
  writeFileSync(join(project, 'base.txt'), 'base\n');
  git(project, 'add', 'base.txt');
  git(project, 'commit', '-m', 'Base');
  git(root, 'init', '--bare', remote);
  git(project, 'remote', 'add', 'origin', remote);
  git(project, 'push', '-u', 'origin', 'main');
  git(project, 'worktree', 'add', '-b', 'kf-test', worktree);
  writeFileSync(join(worktree, 'ticket.txt'), 'ticket change\n');
  git(worktree, 'add', 'ticket.txt');
  git(worktree, 'commit', '-m', `${slug} Ship tested change`);
  const source = git(worktree, 'rev-parse', 'HEAD');
  git(project, 'cherry-pick', source);
  git(project, 'push', 'origin', 'main');
  const shipping = git(project, 'rev-parse', 'HEAD');
  t.after(() => {
    if (existsSync(worktree))
      git(project, 'worktree', 'remove', '--force', worktree);
    rmSync(root, { recursive: true, force: true });
  });

  let status = 'completed';
  let claimed = false;
  let ciConclusion = 'success';
  let liveHandles = false;
  const run = (binary, args, cwd, input) => {
    if (binary === 'hotsheet-cli') {
      if (args.includes('resolve'))
        return {
          status: 0,
          stdout: JSON.stringify({
            root: project,
            sources: [
              { provider: 'git', locator: store, connection_id: connection },
            ],
          }),
          stderr: '',
        };
      if (args.includes('show'))
        return {
          status: 0,
          stdout: `---\nid: ${native}\nslug: ${slug}\nstatus: ${status}\n${claimed ? 'claimed_by: worker\n' : ''}---\n`,
          stderr: '',
        };
      if (args.includes('status'))
        return {
          status: 0,
          stdout: JSON.stringify({
            state: { assignments: {} },
            live_claims: [],
          }),
          stderr: '',
        };
    }
    if (binary === 'gh')
      return {
        status: 0,
        stdout: JSON.stringify([
          {
            databaseId: 123,
            headSha: shipping,
            headBranch: 'main',
            event: 'push',
            workflowName: 'CI',
            status: 'completed',
            conclusion: ciConclusion,
          },
        ]),
        stderr: '',
      };
    if (binary === 'lsof')
      return {
        status: liveHandles ? 0 : 1,
        stdout: liveHandles ? 'worker\n' : '',
        stderr: '',
      };
    return command(binary, args, cwd, input);
  };
  return {
    project,
    store,
    worktree,
    source,
    shipping,
    run,
    options: { project, store, worktree, ticket: slug, shipping },
    setStatus: (value) => (status = value),
    setClaimed: (value) => (claimed = value),
    setCi: (value) => (ciConclusion = value),
    setHandles: (value) => (liveHandles = value),
  };
}

test('removes only a clean, closed, patch-mapped worktree with exact green CI', (t) => {
  const f = fixture(t);
  const verified = cleanup({ ...f.options, dryRun: true }, { run: f.run });
  assert.equal(verified.state, 'verified');
  assert.equal(verified.mapped.length, 1);
  assert.ok(existsSync(f.worktree));

  const removed = cleanup(f.options, { run: f.run });
  assert.equal(removed.state, 'removed');
  assert.equal(existsSync(f.worktree), false);
  assert.equal(
    git(f.project, 'rev-parse', `refs/kerf/cleanup-source/${f.source}`),
    f.source,
  );
  assert.notEqual(
    spawnSync('git', ['rev-parse', '--verify', 'refs/heads/kf-test'], {
      cwd: f.project,
    }).status,
    0,
  );
  assert.equal(cleanup(f.options, { run: f.run }).state, 'already_removed');
});

test('refuses dirty, claimed, live, or unverified ticket worktrees', (t) => {
  const f = fixture(t);
  const dry = { ...f.options, dryRun: true };
  writeFileSync(join(f.worktree, 'untracked.txt'), 'keep\n');
  assert.throws(
    () => cleanup(dry, { run: f.run }),
    /worktree has tracked or untracked edits/,
  );
  rmSync(join(f.worktree, 'untracked.txt'));

  f.setClaimed(true);
  assert.throws(() => cleanup(dry, { run: f.run }), /active claim/);
  f.setClaimed(false);
  f.setStatus('started');
  assert.throws(
    () => cleanup(dry, { run: f.run }),
    /not completed or verified/,
  );
  f.setStatus('completed');
  f.setCi('failure');
  assert.throws(() => cleanup(dry, { run: f.run }), /no exact green main CI/);
  f.setCi('success');
  f.setHandles(true);
  assert.throws(() => cleanup(dry, { run: f.run }), /live process handles/);
  assert.ok(existsSync(f.worktree));
});
