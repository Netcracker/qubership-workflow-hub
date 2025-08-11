const core = require("@actions/core");

/**
 *
 * @param {Array<{package:{id,name,type}, versions:Array<{id,name,metadata}>}>} filtered
 * @param {{ wrapper:any, owner:string, isOrganization?:boolean, dryRun?:boolean }} ctx
 */
async function deletePackageVersion(filtered, { wrapper, owner, isOrganization = true, dryRun = false } = {}) {
  if (!Array.isArray(filtered) || filtered.length === 0) {
    core.info("Nothing to delete.");
    return;
  }
  if (!wrapper || typeof wrapper.deletePackageVersion !== "function") {
    throw new Error("wrapper.deletePackageVersion is required");
  }
  if (!owner) {
    throw new Error("owner is required");
  }

  const ownerLC = owner.toLowerCase();

  for (const { package: pkg, versions } of filtered) {
    const imageLC = (pkg.name || "").toLowerCase();
    const type = pkg.type; // "container" | "maven" ...

    for (const v of versions) {
      const tags = v.metadata?.container?.tags ?? [];
      const detail = type === "maven" ? v.name : (tags.length ? tags.join(", ") : v.name);

      if (dryRun) {
        core.info(`DRY-RUN: ${ownerLC}/${imageLC} (${type}) — would delete version ${v.id} (${detail})`);
        continue;
      }

      try {
        core.info(`Deleting ${ownerLC}/${imageLC} (${type}) — version ${v.id} (${detail})`);
        await wrapper.deletePackageVersion(ownerLC, type, imageLC, v.id, isOrganization);
      } catch (error) {
        const msg = String(error && error.message || error);

        if (/more than 5000 downloads/i.test(msg)) {
          core.warning(`Skipping ${imageLC} v:${v.id} (${detail}) — too many downloads.`);
          continue;
        }

        if (/404|not found/i.test(msg)) {
          core.warning(`Version not found: ${imageLC} v:${v.id} — probably already deleted.`);
          continue;
        }

        if (/403|rate.?limit|insufficient permissions/i.test(msg)) {
          core.error(`Permission/rate issue for ${imageLC} v:${v.id}: ${msg}`);
          throw error;
        }

        core.error(`Failed to delete ${imageLC} v:${v.id} (${detail}) — ${msg}`);
      }
    }
  }
}

module.exports = { deletePackageVersion };
