const core = require("@actions/core");

class RefExtractor {
    constructor() {

    }
    extract(ref) {
        let name = "";
        let isTag = false;
        if (ref.startsWith("refs/heads/")) {
            name = ref.replace("refs/heads/", "").replace(/\//g, "-");
            core.info(`Run-on branch: ${name}`);
        } else if (ref.startsWith("refs/tags/")) {
            isTag = true;
            name = ref.replace("refs/tags/", "").replace(/\//g, "-");
            core.info(`Run-on tag: ${name}`);
        } else {
            isTag = false;
            name = ref.replace(/\//g, "-");
            core.warning(`🔸 Cant detect type ref: ${ref}`);
        }
        return { name, isTag };
    }
}

module.exports = RefExtractor;