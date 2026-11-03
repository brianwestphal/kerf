// KF-9XZ6XQ: no test targets a repository through an inherited Git hook
// variable (the ui-doctor and ui-analyzer fixtures run `git init`).
// Removing them here covers every process a test spawns.
import process from 'node:process';

import { REPOSITORY_GIT_ENVIRONMENT } from '../../tests/helpers/git-environment.js';

for (const name of REPOSITORY_GIT_ENVIRONMENT) delete process.env[name];
