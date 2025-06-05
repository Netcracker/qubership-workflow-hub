const core = require("@actions/core");

class Report {

    async writeSummary(items, owner, repo, releaseTag) {

        if (!Array.isArray(items) || items.length === 0) {
            core.info("❗️ No assets processed.");
            return;
        }

        core.summary.addRaw(`## 🧪 Report Summary\n\n`);
        core.summary.addRaw(`**Owner:** ${owner}  \n`);
        core.summary.addRaw(`**Repo:** ${repo}  \n`);
        core.summary.addRaw(`**Release Tag:** \`${releaseTag}\`  \n\n`);
        core.summary.addRaw(`---\n\n`);

        const tableData = [
            [
                { data: "Item", header: true },
                { data: "Asset", header: true },
                { data: "Status", header: true },
                { data: "Message", header: true }
            ]
        ];

        let statusCell = '';

         items.forEach(({ itemPath, fileName, success, error }) => {
            const displayName = fileName || "-";
            switch (success) {
                case "Success":
                    statusCell = "✔️ Uploaded";
                    break;
                case "Failed":
                    statusCell = `❗️ Failed`;
                    break;
                case "NotFound":
                    statusCell = "⚠️ NotFound";
                    break;
                default:
                    statusCell = `❗️ Status unknown`;
            }

            tableData.push([itemPath, displayName, statusCell, error || "-"]);
        });

        core.summary.addTable(tableData);
        await core.summary.write();
    }
}

module.exports = Report;
