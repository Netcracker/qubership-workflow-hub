import * as core from "@actions/core";
import { summarizeDeletion, outcomeLabel } from "./deletionSummary.js";

class MavenReport {

    /**
   * @param {Array<{package: {id, name, type}, versions: Array<{name, created_at}>}>} filteredPackagesWithVersionsForDelete
   * @param {boolean} dryRun
   * @param {number} thresholdDays    // Number of days 'older' than which versions are deleted
   * @param {Date} thresholdDate      // Threshold date - everything created before it is deleted
   * @param {string[]} includedTags   // Patterns for searching by version name
   */

    async writeSummary(context) {
        const {
            filteredPackagesWithVersionsForDelete,
            dryRun,
            thresholdDays,
            thresholdDate,
            includedTags,
            excludedTags
        } = context;

        const { deleteStatus = [], progress = null, deletionError = null } = context;

        if (!filteredPackagesWithVersionsForDelete || filteredPackagesWithVersionsForDelete.length === 0) {
            core.info("❗️No packages or versions to delete.");
            return;
        }

        const dryRunText = dryRun ? "(Dry Run)" : "";
        const totalPackages = filteredPackagesWithVersionsForDelete.length;
        const totalSelectedVersions = filteredPackagesWithVersionsForDelete.reduce((sum, item) => sum + item.versions.length, 0);
        // The selection says what was chosen; what really happened comes from the progress counters.
        const { lines: deletionLines, finalMessage } = summarizeDeletion({
            selected: totalSelectedVersions, progress, dryRun, deleteStatus, deletionError
        });


        // a result column only makes sense when a real run recorded what happened to each version
        const showOutcome = !dryRun && Boolean(progress?.outcomes);

        const tableData = [
            [
                { data: "Package", header: true },
                { data: "Version", header: true },
                { data: "Created At", header: true },
                ...(showOutcome ? [{ data: "Result", header: true }] : [])
            ]
        ];

        // Prepare table data
        filteredPackagesWithVersionsForDelete.forEach(({ package: pkg, versions }) => {
            versions.forEach(version => {

                const pkgInfo = `<strong>${pkg.name}</strong><br/>(ID: ${pkg.id})`;
                const versionInfo = `<code>${version.name}</code>`;
                const createdAt = new Date(version.created_at).toISOString();
                tableData.push([pkgInfo, versionInfo, createdAt, ...(showOutcome ? [outcomeLabel({ progress, dryRun, versionId: version.id })] : [])]);
            });
        });

        core.summary.addRaw(`## 🎯 Container Package Cleanup Summary ${dryRunText}\n\n`);
        core.summary.addRaw(`**Threshold:** versions older than **${thresholdDays} days** (created before **${thresholdDate.toISOString().slice(0, 10)}**)\n\n`);
        core.summary.addRaw(`**Packages Selected:** ${totalPackages}  \n`);
        core.summary.addRaw(`${deletionLines.join("  \n")}\n\n`);
        core.summary.addRaw(`---\n\n`);
        core.summary.addRaw(`**Parameters:**\n\n`);
        core.summary.addRaw(`- Threshold Days: ${thresholdDays}\n`);
        core.summary.addRaw(`- Threshold Date: ${thresholdDate.toISOString().slice(0, 10)}\n`);

        includedTags.length && core.summary.addRaw(`- Included Patterns: ${includedTags.length ? includedTags.map(t => `<code>${t}</code>`).join(", ") : "None"}\n`);
        excludedTags.length && core.summary.addRaw(`- Excluded Patterns: ${excludedTags.length ? excludedTags.map(t => `<code>${t}</code>`).join(", ") : "None"}\n\n`);

        core.summary.addRaw(`---\n\n`);
        core.summary.addTable(tableData);
        // core.summary.addRaw(`\n\n✅ Cleanup operation completed successfully.`);

        core.summary.addRaw(`\n\n${finalMessage}`);

        await core.summary.write();
    }
}

export default MavenReport;