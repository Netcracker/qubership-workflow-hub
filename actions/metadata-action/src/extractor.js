const core = require("@actions/core");
const log = require("./logger");

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
        } else if (isTag) {
            rawName = ref.slice("refs/tags/".length);
        } else {
            rawName = ref;
            log.warn(`Cant detect type ref: ${ref}`);
        }

        const normalizedName = rawName.replace(/\//g, replaceSymbol);
        const type = isBranch ? "branch" : isTag ? "tag" : "unknown";

        return { rawName, normalizedName, isTag, type };
    }
}

module.exports = RefNormalizer;
