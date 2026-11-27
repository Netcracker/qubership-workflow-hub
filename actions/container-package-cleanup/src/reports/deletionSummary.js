import { notProcessed } from "../utils/deletionProgress.js";

const escapeHtml = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Describes the outcome of the deletion for the job summary.
 * The selection list only says what was chosen; the numbers of what really happened come from `progress`.
 *
 * @param {Object} params
 * @param {number} params.selected - number of versions selected for deletion
 * @param {{ selected: number, deleted: number, skipped: number, failed: number, simulated: number }|null} [params.progress]
 * @param {boolean} [params.dryRun]
 * @param {Array<{ success?: boolean, status?: string }>} [params.deleteStatus]
 * @param {string|null} [params.deletionError] - message of the error that stopped the run
 * @returns {{ lines: string[], finalMessage: string }}
 */
function summarizeDeletion({ selected, progress = null, dryRun = false, deleteStatus = [], deletionError = null }) {
  const lines = [`**Selected Versions:** ${selected}`];

  if (dryRun) {
    lines.push("**Deleted Versions:** 0 (dry run)");
  } else if (progress) {
    lines.push(`**Deleted Versions:** ${progress.deleted}`);
    if (progress.skipped > 0) lines.push(`**Skipped Versions:** ${progress.skipped}`);
    if (progress.failed > 0) lines.push(`**Failed Versions:** ${progress.failed}`);
    const left = notProcessed(progress);
    if (left > 0) lines.push(`**Not Processed Versions:** ${left}`);
  }

  let finalMessage;
  if (deletionError) {
    finalMessage = `❗️Cleanup stopped with an error: ${escapeHtml(deletionError)}. See details above.`;
  } else if (deleteStatus.some(r => r.success === false || r.status === "error" || r.status === "critical")) {
    finalMessage = "❗️Cleanup operation completed with errors. See details above.";
  } else if (dryRun) {
    finalMessage = "✅ Dry run completed. No version was deleted.";
  } else {
    finalMessage = "✅ Cleanup operation completed successfully.";
  }

  return { lines, finalMessage };
}

const OUTCOME_LABELS = {
  deleted: "✅ deleted",
  skipped: "⚠️ skipped",
  blocked: "⏭️ kept: its image was not deleted",
  failed: "❌ failed"
};

/**
 * Label of one version for the report table: what happened to it in a real run.
 * Empty in a dry run and when the run has no per-version information.
 *
 * @param {Object} params
 * @param {{ outcomes?: Map<any, string> }|null} params.progress
 * @param {boolean} [params.dryRun]
 * @param {string|number} params.versionId
 * @returns {string}
 */
function outcomeLabel({ progress, dryRun = false, versionId }) {
  if (dryRun || !progress?.outcomes) return "";
  return OUTCOME_LABELS[progress.outcomes.get(versionId)] ?? "⏳ not processed";
}

export { summarizeDeletion, outcomeLabel };
