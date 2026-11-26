import * as core from "@actions/core";
import { summarizeDeletion } from "./deletionSummary.js";

class ContainerReport {
    async writeSummary(context) {

        const {
            filteredPackagesWithVersionsForDelete,
            dryRun,
            thresholdDays,
            thresholdDate,
            includedTags,
            excludedTags
        } = context;

        const { deleteStatus = [], incompleteCleanup = [], progress = null, deletionError = null } = context;

        const writeIncompleteCleanup = () => {
            if (incompleteCleanup.length === 0) return;
            core.summary.addRaw(`\n\n### ⚠️ Incomplete cleanup\n\n`);
            core.summary.addRaw(`The manifest of a retained image could not be inspected, so untagged versions of these packages were **not** deleted to avoid breaking retained images:\n\n`);
            incompleteCleanup.forEach(({ package: name, failedTags }) => {
                const tags = failedTags.map(f => `<code>${f.tag}</code>`).join(", ");
                core.summary.addRaw(`- <strong>${name}</strong>: ${tags}\n`);
            });
        };

        if (!filteredPackagesWithVersionsForDelete || filteredPackagesWithVersionsForDelete.length === 0) {
            core.info("❗️No packages or versions to delete.");
            if (incompleteCleanup.length > 0) {
                writeIncompleteCleanup();
                await core.summary.write();
            }
            return;
        }

        // Calculate summary statistics.

        const dryRunText = dryRun ? "(Dry Run)" : "";
        const totalPackages = filteredPackagesWithVersionsForDelete.length;
        const totalSelectedVersions = filteredPackagesWithVersionsForDelete.reduce((total, item) => total + item.versions.length, 0);
        // The selection says what was chosen; what really happened comes from the progress counters.
        const { lines: deletionLines, finalMessage } = summarizeDeletion({
            selected: totalSelectedVersions, progress, dryRun, deleteStatus, deletionError
        });

        const tableData = [
            [
                { data: "Package", header: true },
                { data: "Selected Versions", header: true }
            ]
        ];

        filteredPackagesWithVersionsForDelete.forEach(({ package: pkg, versions }) => {

            const pkgInfo = `<strong>${pkg.name}</strong>&#10;(ID: ${pkg.id})`;

            const versionsInfo = versions
                .map(({ id, name, metadata }) => {
                    const tags = metadata?.container?.tags ?? [];
                    const label = tags.length ? tags.join(', ') : `<em>${name}</em>`;
                    return `• <code>${id}</code> — ${label}`;
                })
                .join('<br>');

            tableData.push([pkgInfo, versionsInfo]);
        });

        core.summary.addRaw(`## 🎯 Container Package Cleanup Summary ${dryRunText}\n\n`);
        core.summary.addRaw(`**Threshold:** versions older than **${thresholdDays} days** (created before **${thresholdDate.toISOString().slice(0, 10)}**)\n\n`);
        core.summary.addRaw(`**Total Packages Processed:** ${totalPackages}  \n`);
        core.summary.addRaw(`${deletionLines.join("  \n")}\n\n`);
        core.summary.addRaw(`---\n\n`);
        core.summary.addRaw(`**Parameters:**\n\n`);
        core.summary.addRaw(`- Threshold Days: ${thresholdDays}\n`);
        core.summary.addRaw(`- Threshold Date: ${thresholdDate.toISOString().slice(0, 10)}\n`);

        core.summary.addRaw(`- Included Tags Patterns: ${includedTags.length ? includedTags.map(t => `<code>${t}</code>`).join(", ") : "<code>None</code>"}\n`);
        core.summary.addRaw(`- Excluded Tags Patterns: ${excludedTags.length ? excludedTags.map(t => `<code>${t}</code>`).join(", ") : "<code>None</code>"}\n\n`);


        core.summary.addRaw(`---\n\n`);
        core.summary.addTable(tableData);
        // core.summary.addRaw(`\n\n✅ Cleanup operation completed successfully.`);

        core.summary.addRaw(`\n\n${finalMessage}`);
        writeIncompleteCleanup();

        await core.summary.write();
    }
}

export default ContainerReport;