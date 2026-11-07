/** Consistent success/failure lines for repository gate scripts. */
export function fail(prefix, message, code = 1) {
  console.error(`[${prefix}] ${message}`);
  process.exitCode = code;
}

export function ok(prefix, message) {
  console.log(`[${prefix}] ${message}`);
}
