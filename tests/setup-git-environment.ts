// KF-9XZ6XQ: no test targets a repository through an inherited Git hook
// variable. Removing them here covers every process a test spawns, which
// copies `process.env`.
import process from 'node:process';

import { REPOSITORY_GIT_ENVIRONMENT } from './helpers/git-environment.js';

for (const name of REPOSITORY_GIT_ENVIRONMENT) delete process.env[name];
