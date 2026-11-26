/**
 * Counters and per-version outcomes of one deletion run.
 * The caller creates the object and passes it to `deletePackageVersion`, so the numbers stay available
 * even when the run stops with an error (the thrown error carries no statuses).
 *
 * `outcomes` maps a version id to "deleted", "skipped", "failed" or "simulated" (dry run).
 * A selected version without an entry was never reached.
 *
 * @param {number} [selected=0] - number of versions selected for deletion
 * @returns {{ selected: number, deleted: number, skipped: number, failed: number, simulated: number, outcomes: Map<any, string> }}
 */
function createDeletionProgress(selected = 0) {
  return { selected, deleted: 0, skipped: 0, failed: 0, simulated: 0, outcomes: new Map() };
}

/**
 * Records what happened to one version: bumps the matching counter and remembers the outcome for the report.
 *
 * @param {ReturnType<typeof createDeletionProgress>} progress
 * @param {string|number} versionId
 * @param {"deleted"|"skipped"|"failed"|"simulated"} outcome
 */
function recordOutcome(progress, versionId, outcome) {
  progress[outcome]++;
  progress.outcomes?.set(versionId, outcome);
}

/**
 * Versions that were selected but never reached: the run stopped before them.
 *
 * @param {{ selected: number, deleted: number, skipped: number, failed: number, simulated: number }} progress
 * @returns {number}
 */
function notProcessed(progress) {
  const handled = progress.deleted + progress.skipped + progress.failed + progress.simulated;
  return Math.max(0, progress.selected - handled);
}

export { createDeletionProgress, recordOutcome, notProcessed };
