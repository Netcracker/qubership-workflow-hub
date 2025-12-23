const escapeStringRegexp = require('escape-string-regexp');
const log = require("@netcracker/action-logger");

const MODULE = 'wildcardMatcher.js';

class WildcardMatcher {
  constructor(debug = false, dryRun = false) {
    this.name = 'WildcardMatcher';
    log.setDebug(debug);
    log.setDryRun(dryRun);
  }

  match(tag, pattern) {
    const t = tag.toLowerCase();
    const p = pattern.toLowerCase();
    // Special case for 'semver' -- searching strings like '1.2.3', 'v1.2.3', '1.2.3-alpha', 'v1.2.3-fix'
    let regexPattern;
    if (p === 'semver') {
      regexPattern = '^[v]?\\d+\\.\\d+\\.\\d+[-]?.*';
      const re = new RegExp(regexPattern, 'i');
      return re.test(t);
    }
    // Special case for '?*' — alpha-number only and at least one digit
    if (p === '?*') {
      // /^[a-z0-9]+$/ apha-number only
      // /\d/ at least one digit
      return /^[a-z0-9]+$/.test(t) && /\d/.test(t);
    }

    // No wildcards at all — strict comparison
    if (!p.includes('*') && !p.includes('?')) {
      return t === p;
    }

    log.startGroup(`🔍Wildcard match for tag "${t}" with pattern "${p}"`);
    // General case: build RegExp, escape special characters, then *→.* and ?→.
    log.debug(`Matching tag "${t}" against pattern "${p}"`, MODULE);
    // First replace * and ? with unique markers, then escape, then return them as .*
    const wildcardPattern = p.replace(/\*/g, '__WILDCARD_STAR__').replace(/\?/g, '__WILDCARD_QM__');
    const escaped = escapeStringRegexp(wildcardPattern)
      .replace(/__WILDCARD_STAR__/g, '.*')
      .replace(/__WILDCARD_QM__/g, '.');
    log.debug(`Transformed pattern: ${escaped}`, MODULE);
    log.endGroup();

    const re = new RegExp(`^${escaped}$`, 'i');
    return re.test(t);
  }
}

module.exports = WildcardMatcher;
