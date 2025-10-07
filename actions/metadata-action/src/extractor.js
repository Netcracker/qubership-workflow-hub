const core = require("@actions/core");

class RefNormalizer {
    extract(ref, replaceSymbol = "-") {
        if (!ref) {
            core.setFailed("❌ No ref provided to RefNormalizer.extract()");
            return { normalizedName: "", isTag: false, type: "unknown" };
        }

        const isBranch = ref.startsWith("refs/heads/");
        const isTag = ref.startsWith("refs/tags/");
        let rawName;

        if (isBranch) {
            rawName = ref.slice("refs/heads/".length);
            core.info(`Run-on branch: ${rawName}`);
        } else if (isTag) {
            rawName = ref.slice("refs/tags/".length);
            core.info(`Run-on tag: ${rawName}`);
        } else {
            rawName = ref;
            core.warning(`🔸 Cant detect type ref: ${ref}`);
        }

        const normalizedName = rawName.replace(/\//g, replaceSymbol);
        const type = isBranch ? "branch" : isTag ? "tag" : "unknown";

        return { rawName, normalizedName, isTag, type };
    }
}

module.exports = RefNormalizer;
