const escapeStringRegexp = require('escape-string-regexp');

class WildcardMatcher {
  constructor() {
    this.name = 'WildcardMatcher';
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

    // General case: build RegExp, escape special characters, then *→.* and ?→.
    console.log(`Matching tag "${t}" against pattern "${p}"`);
    // First replace * and ? with unique markers, then escape, then return them as .*
    const wildcardPattern = p.replace(/\*/g, '__WILDCARD_STAR__').replace(/\?/g, '__WILDCARD_QM__');
    const escaped = escapeStringRegexp(wildcardPattern)
      .replace(/__WILDCARD_STAR__/g, '.*')
      .replace(/__WILDCARD_QM__/g, '.');
    console.log(`Transformed pattern: ${escaped}`);

    const re = new RegExp(`^${escaped}$`, 'i');
    return re.test(t);
  }
}

module.exports = WildcardMatcher;
