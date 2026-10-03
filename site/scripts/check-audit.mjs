import { spawnSync } from 'node:child_process';

import { classifyAudit } from './audit-policy.mjs';

const audit = spawnSync('npm', ['audit', '--include=dev', '--json'], {
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024,
});
if (audit.error || ![0, 1].includes(audit.status)) {
  console.error(audit.error ?? audit.stderr ?? 'npm audit failed');
  process.exit(1);
}

try {
  const { allowed, blocked } = classifyAudit(JSON.parse(audit.stdout));
  if (blocked.length) {
    console.error(`High/critical npm audit findings: ${blocked.join(', ')}`);
    process.exitCode = 1;
  } else if (allowed.length) {
    console.log(
      `Reviewed static-site exception for GHSA-ch52-4w7c-c8xp: ${allowed.join(', ')}`,
    );
  } else {
    console.log('npm audit: no high or critical findings');
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
