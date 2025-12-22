const log = require("@netcracker/action-logger");

const _MODULE = 'deleteAction.js';
/**
 *
 * @param {{ wrapper:any, owner:string, packageType:string, packageName:string, versionId:string|number, isOrganization?:boolean }} param0
 */
async function deleteSinglePackageVersion({ wrapper, owner, packageType, packageName, versionId, isOrganization }) {
  log.dim(`Deleting ${owner}/${packageName} (${packageType}) - version ${versionId}`);
  await wrapper.deletePackageVersion(owner, packageType, packageName, versionId, isOrganization);
  log.lightSuccess(`✓ Deleted ${owner}/${packageName} (${packageType}) - version ${versionId}`);
  // try {
  //   log.dim(`Deleting ${owner}/${packageName} (${packageType}) - version ${versionId}`);
  //   await wrapper.deletePackageVersion(owner, packageType, packageName, versionId, isOrganization);
  //   log.lightSuccess(`✓ Deleted ${owner}/${packageName} (${packageType}) - version ${versionId}`);
  // }
  // catch (error) {
  //   const msg = String(error?.message || error);
  //   if (/more than 5000 downloads/i.test(msg)) {
  //     log.warn(`Skipping ${packageName} v:${versionId} - too many downloads.`);
  //     return;
  //   }
  //   if (/404|not found/i.test(msg)) {
  //     log.warn(`Version not found: ${packageName} v:${versionId} - probably already deleted.`);
  //     return;
  //   }
  //   if (/403|rate.?limit|insufficient permissions/i.test(msg)) {
  //     log.warn(`Permission/rate issue for ${packageName} v:${versionId}: ${msg}`);
  //     throw error;
  //   }
  //   log.error(`Failed to delete ${packageName} v:${versionId} - ${msg}`);
  // }
}

/**
 *
 * @param {Array<{package:{id,name,type}, versions:Array<{id,name,metadata}>}>} filtered
 * @param {{ wrapper:any, owner:string, isOrganization?:boolean, batchSize?:number, maxErrors?:number dryRun?:boolean }} ctx
 */
async function deletePackageVersion(filtered, { wrapper, owner, isOrganization = true, batchSize = 15, maxErrors = 5, dryRun = false, debug = false } = {}) {
  log.setDebug(debug);
  log.setDryRun(dryRun);

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

  const normalizedOwner = owner.toLowerCase();
  let errorCount = 0;

  for (const { package: pkg, versions } of filtered) {
    const normalizedPackageName = (pkg.name || "").toLowerCase();
    const packageType = pkg.type; // "container" | "maven" ...

    log.debug(`Preparing to delete ${versions.length} versions of ${normalizedOwner}/${normalizedPackageName} (${packageType})`);
    log.dryrun(`Would delete ${versions.length} versions of ${normalizedOwner}/${normalizedPackageName} (${packageType})`);

    for (let i = 0; i < versions.length; i += batchSize) {
      if (dryRun) {
        log.dryrun(`Would delete ${normalizedPackageName} v:${version.id}`);
        return { success: true, dryRun: true };
      }
      const batch = versions.slice(i, i + batchSize);
      log.debug(`Processing batch ${i / batchSize + 1} for ${normalizedPackageName}`);
      log.dryrun(`Processing batch ${i / batchSize + 1} for ${normalizedPackageName}`);

      const promises = batch.map(async (version) => {
        try {
          await deleteSinglePackageVersion({
            wrapper,
            owner: normalizedOwner,
            packageType,
            packageName: normalizedPackageName,
            versionId: version.id,
            isOrganization, dryRun, debug
          });
          return { success: true };
        } catch (error) {
          if (isSkippableError(error)) {
            log.warn(`Skipped ${normalizedPackageName} v:${version.id} - ${error.message}`);
            return { success: false, skipped: true };
          }
          if (isCriticalError(error)) {
            return { success: false, critical: true, error };
          }
          log.error(`Failed ${normalizedPackageName} v:${version.id} - ${error.message}`);
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
}

function isCriticalError(error) {
  const msg = String(error?.message || error);
  return /403|rate.?limit|insufficient permissions/i.test(msg);
}

function isSkippableError(error) {
  const msg = String(error?.message || error);
  return /more than 5000 downloads|404|not found/i.test(msg);
}


module.exports = { deletePackageVersion };



// const tags = v.metadata?.container?.tags ?? [];
// const detail = packageType === "maven" ? v.name : (tags.length ? tags.join(", ") : v.name);
// log.dryrun(`${normalizedOwner}/${normalizedPackageName} (${packageType}) - would delete version ${v.id} (${detail})`);

