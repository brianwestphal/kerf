import { spawn } from 'node:child_process';
import { open } from 'node:fs/promises';
import { platform } from 'node:os';

/** The OS releases this lock when the holder's stdin closes, even on a crash. */
export async function lockSketchRunner(path) {
  // lockf requires an existing file. Keep its inode across runs so concurrent
  // holders always contend for the same advisory lock.
  const file = await open(path, 'a');
  await file.close();
  const mac = platform() === 'darwin';
  const args = [
    ...(mac ? ['-k', '-t', '0'] : ['-n']),
    path,
    process.execPath,
    '-e',
    "process.stdout.write('locked\\n'); process.stdin.resume(); process.stdin.on('end', () => process.exit(0));",
  ];
  const child = spawn(mac ? '/usr/bin/lockf' : '/usr/bin/flock', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let errors = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (value) => {
    errors += value;
  });
  const exited = new Promise((resolve) => child.once('exit', resolve));
  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', () =>
      reject(
        new Error(
          `Sketch runner is reserved or its advisory lock is unavailable. ${errors.trim()}`,
        ),
      ),
    );
    let handshake = '';
    child.stdout.on('data', (value) => {
      handshake += String(value);
      if (!handshake.includes('\n')) return;
      if (handshake.trim() === 'locked') resolve();
      else reject(new Error('Invalid Sketch lock handshake.'));
    });
  });
  return async () => {
    child.stdin.end();
    await exited;
  };
}
