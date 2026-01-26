const core = require("@actions/core");
const log = require("@netcracker/action-logger");

const REF_PATTERN = /^refs\/(heads|tags)\/(.+)$/;

class RefNormalizer {
  extract(ref, replaceSymbol = "-") {
    if (!ref) {
      core.setFailed("❌ No ref provided to RefNormalizer.extract()");
      return { rawName: "", normalizedName: "", isTag: false, isBranch: false, type: "unknown" };
    }

    const match = ref.match(REF_PATTERN);

    let rawName;
    let isBranch = false;
    let isTag = false;

    if (match) {
      const [, refType, name] = match;
      rawName = name;
      isBranch = refType === "heads";
      isTag = refType === "tags";
    } else {
      rawName = ref;
      log.warn(`Cant detect type ref: ${ref}`);
    }

    const normalizedName = rawName.replace(/\//g, replaceSymbol);
    const type = isBranch ? "branch" : isTag ? "tag" : "unknown";

    return { rawName, normalizedName, isTag, isBranch, type };
  }
}

module.exports = RefNormalizer;
