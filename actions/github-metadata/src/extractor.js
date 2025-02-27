const core = require("@actions/core");

class RefExtractor {
    constructor() {

    }
    extract(ref) {
        let name = "";
        let isTag = false;
        if (ref.startsWith("refs/heads/")) {
            this.name = ref.replace("refs/heads/", "").replace(/\//g, "-");
            core.info(`Run-on branch: ${this.name}`);
        } else if (ref.startsWith("refs/tags/")) {
            this.isTag = true;
            this.name = ref.replace("refs/tags/", "").replace(/\//g, "-");
            core.info(`Run-on tag: ${this.name}`);
        } else {
            core.warning(`Cant detect type ref: ${ref}`);
        }
        return { name, isTag };
    }
}

module.exports = RefExtractor;