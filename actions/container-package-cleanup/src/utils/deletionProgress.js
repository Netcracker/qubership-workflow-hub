/**
 * Counters of one deletion run.
 * The caller creates the object and passes it to `deletePackageVersion`, so the numbers stay available
 * even when the run stops with an error (the thrown error carries no statuses).
 *
 * @param {number} [selected=0] - number of versions selected for deletion
 * @returns {{ selected: number, deleted: number, skipped: number, failed: number, simulated: number }}
 */
function createDeletionProgress(selected = 0) {
  return { selected, deleted: 0, skipped: 0, failed: 0, simulated: 0 };
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

export { createDeletionProgress, notProcessed };
