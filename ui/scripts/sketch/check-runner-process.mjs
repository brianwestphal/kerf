/** A lifecycle check may reuse a user app, but must not leave a test launch open. */
export function requireExistingSketchProcess(processIds) {
  if (!processIds.length)
    throw new Error(
      'Open Sketch before running the lifecycle check. The check does not launch a test-owned app.',
    );
  return processIds;
}
