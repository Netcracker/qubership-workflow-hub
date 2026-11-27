import log from "@qubership/action-logger";
import { createDeletionProgress, recordOutcome } from "./deletionProgress.js";

const _MODULE = 'deleteAction.js';
/**
 *
 * @param {{ wrapper:any, owner:string, packageType:string, packageName:string, versionId:string|number, isOrganization?:boolean }} param0
 */
async function deleteSinglePackageVersion({ wrapper, owner, packageType, packageName, versionId, isOrganization, detail }) {
  log.dim(`Deleting ${owner}/${packageName} (${packageType}) - id: ${versionId}, (${detail})`);
  await wrapper.deletePackageVersion(owner, packageType, packageName, versionId, isOrganization);
  log.lightSuccess(`✓ Deleted ${owner}/${packageName} (${packageType}) - id: ${versionId}, (${detail})`);
}

/**
 *
 * @param {Array<{package:{id,name,type}, versions:Array<{id,name,metadata}>}>} filtered
 * @param {{ wrapper:any, owner:string, isOrganization?:boolean, batchSize?:number, maxErrors?:number dryRun?:boolean, progress?:object }} ctx
 *   `progress` (see createDeletionProgress) is filled while the versions are processed, so the caller keeps the
 *   counters when the run stops with an error.
 */
async function deletePackageVersion(filtered, { wrapper, owner, isOrganization = true, batchSize = 15, maxErrors = 5, dryRun = false, debug = false, progress = createDeletionProgress() } = {}) {
  log.setDebug(debug);
  log.setDryRun(dryRun);

  // Validate before opening the log group, so every early exit leaves the log groups balanced
  if (!Array.isArray(filtered) || filtered.length === 0) {
    log.warn("Nothing to delete.");
    return;
  }
  if (!wrapper || typeof wrapper.deletePackageVersion !== "function") {
    throw new Error("wrapper.deletePackageVersion is required");
  }
  if (!owner) {
    throw new Error("owner is required");
  }
  // A non-positive step would never reach the loop exit condition below
  if (!Number.isSafeInteger(batchSize) || batchSize < 1) {
    throw new Error(`Invalid batchSize: ${batchSize}. Expected a positive integer.`);
  }

  const totalDeletedVersions = filtered.reduce((sum, item) => sum + item.versions.length, 0);
  log.info(`Total packages to process: ${filtered.length}`);
  log.info(`Total versions to delete: ${totalDeletedVersions}`);

  log.startGroup("🚀 Starting package version deletion process");
  try {
    const resultStatus = [];

    const normalizedOwner = owner.toLowerCase();
    let errorCount = 0;

    log.info(`Starting deletion of package versions for owner: ${normalizedOwner}`);

    for (const { package: pkg, versions, unresolvedCandidates = [] } of filtered) {
      const normalizedPackageName = (pkg.name || "").toLowerCase();
      const packageType = pkg.type; // "container" | "maven" ...

      log.debug(`Preparing to delete ${versions.length} versions of ${normalizedOwner}/${normalizedPackageName} (${packageType})`, _MODULE);
      log.dryrun(`[DRY-RUN] ${normalizedOwner}/${normalizedPackageName} (${packageType}) - ${versions.length} versions will NOT be deleted (dry-run mode)`);

      // Images (versions with tags) go first, then the untagged versions. An untagged version may be a layer of an
      // image, so it is deleted only after every image it may belong to was deleted successfully:
      // the images listed in its dependsOn and the images whose manifest could not be fully read.
      const isImage = (version) => (version.metadata?.container?.tags ?? []).length > 0;
      const phases = [versions.filter(isImage), versions.filter(version => !isImage(version))];
      const notDeleted = (id) => progress.outcomes.get(id) !== "deleted";
      const describeIds = (ids) => ids.slice(0, 5).join(", ") + (ids.length > 5 ? `, ... (${ids.length - 5} more)` : "");
      // The images with an unreadable manifest are all tagged, so their outcome is final when the untagged
      // versions start. They are checked once per package and, while any of them is left, they block every
      // untagged version: the text for the log is built once and reused, nothing is copied per version.
      let unresolvedText = null;
      // the images an untagged version still waits for, as a short text, or "" when it may be deleted
      const imagesNotDeleted = (version) => {
        if (unresolvedText === null) {
          const left = unresolvedCandidates.filter(notDeleted);
          unresolvedText = left.length > 0 ? describeIds(left) : "";
        }
        if (unresolvedText !== "") return unresolvedText;
        const own = (version.dependsOn ?? []).filter(notDeleted);
        return own.length > 0 ? describeIds(own) : "";
      };
      const batches = phases.flatMap((phaseVersions) => {
        const chunks = [];
        for (let i = 0; i < phaseVersions.length; i += batchSize) chunks.push(phaseVersions.slice(i, i + batchSize));
        return chunks;
      });

      for (const batch of batches) {

        const promises = batch.map(async (version) => {
          const tags = version.metadata?.container?.tags ?? [];
          const detail = packageType === "maven" ? version.name : (tags.length ? tags.join(", ") : version.name);
          if (dryRun) {
            log.dryrun(`[DRY-RUN] ${normalizedOwner}/${normalizedPackageName} (${packageType}) - version id: ${version.id} (${detail}) will NOT be deleted (dry-run mode)`);
            recordOutcome(progress, version.id, "simulated");
            return { success: true, dryRun: true };
          }

          if (!isImage(version)) {
            const waiting = imagesNotDeleted(version);
            if (waiting !== "") {
              log.warn(`Kept ${normalizedPackageName} v:${version.id} (${detail}) - the image(s) it may belong to were not deleted: ${waiting}`);
              recordOutcome(progress, version.id, "blocked");
              return { success: false, skipped: true, blocked: true };
            }
          }

          try {
            await deleteSinglePackageVersion({
              wrapper,
              owner: normalizedOwner,
              packageType,
              packageName: normalizedPackageName,
              versionId: version.id,
              isOrganization, dryRun, debug, detail
            });
            recordOutcome(progress, version.id, "deleted");
            return { success: true };

          } catch (error) {
            if (isSkippableError(error)) {
              log.warn(`Skipped ${normalizedPackageName} v:${version.id} - ${error.message}`);
              recordOutcome(progress, version.id, "skipped");
              resultStatus.push({ packageName: normalizedPackageName, versionId: version.id, reason: error.message, success: false, critical: false });
              return { success: false, skipped: true };
            }
            if (isCriticalError(error)) {
              recordOutcome(progress, version.id, "failed");
              resultStatus.push({ packageName: normalizedPackageName, versionId: version.id, reason: error.message, success: false, critical: true });
              return { success: false, critical: true, error };
            }
            log.error(`Failed ${normalizedPackageName} v:${version.id} - ${error.message}`);
            recordOutcome(progress, version.id, "failed");
            resultStatus.push({ packageName: normalizedPackageName, versionId: version.id, reason: error.message, success: false, critical: false });
            return { success: false, error };
          }
        });

        const results = await Promise.all(promises);

        const criticalResult = results.find(r => r.critical);
        if (criticalResult) {
          log.error("Rate limit or permission error. Stopping.");
          throw criticalResult.error;
        }

        const newErrors = results.filter(r => !r.success && !r.skipped && !r.critical).length;
        errorCount += newErrors;
        if (errorCount >= maxErrors) {
          log.error(`Too many errors (${errorCount}). Stopping.`);
          throw new Error(`Stopped after ${errorCount} errors`);
        }
        // Finished all versions for this package
      }
      // Finished all packages
    }
    return resultStatus;
  } finally {
    // also closes the group when the deletion stops with an error
    log.endGroup();
  }
}

function isCriticalError(error) {
  const msg = String(error?.message || error);
  return /403|rate.?limit|insufficient permissions/i.test(msg);
}

function isSkippableError(error) {
  const msg = String(error?.message || error);
  return /more than 5000 downloads|404|not found/i.test(msg);
}


export { deletePackageVersion };
