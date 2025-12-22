const core = require("@actions/core");
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

        const { deleteStatus } = context;

        if (!filteredPackagesWithVersionsForDelete || filteredPackagesWithVersionsForDelete.length === 0) {
            core.info("❗️No packages or versions to delete.");
            return;
        }

        // Calculate summary statistics.

        const dryRunText = dryRun ? "(Dry Run)" : "";
        const totalPackages = filteredPackagesWithVersionsForDelete.length;
        const totalDeletedVersions = filteredPackagesWithVersionsForDelete.reduce((total, item) => total + item.versions.length, 0);

        const tableData = [
            [
                { data: "Package", header: true },
                { data: "Deleted Versions", header: true }
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
        core.summary.addRaw(`**Total Deleted Versions:** ${totalDeletedVersions}\n\n`);
        core.summary.addRaw(`---\n\n`);
        core.summary.addRaw(`**Parameters:**\n\n`);
        core.summary.addRaw(`- Threshold Days: ${thresholdDays}\n`);
        core.summary.addRaw(`- Threshold Date: ${thresholdDate.toISOString().slice(0, 10)}\n`);

        core.summary.addRaw(`- Included Tags Patterns: ${includedTags.length ? includedTags.map(t => `<code>${t}</code>`).join(", ") : "<code>None</code>"}\n`);
        core.summary.addRaw(`- Excluded Tags Patterns: ${excludedTags.length ? excludedTags.map(t => `<code>${t}</code>`).join(", ") : "<code>None</code>"}\n\n`);


        core.summary.addRaw(`---\n\n`);
        core.summary.addTable(tableData);
        // core.summary.addRaw(`\n\n✅ Cleanup operation completed successfully.`);

        let finalMessage = "✅ Cleanup operation completed successfully.";
        if (deleteStatus && deleteStatus.some(r => r.success === false || r.status === 'error' || r.status === 'critical')) {
            finalMessage = "❗️Cleanup operation completed with errors. See details above.";
        }
        core.summary.addRaw(`\n\n${finalMessage}`);

        await core.summary.write();
    }
}

module.exports = ContainerReport;