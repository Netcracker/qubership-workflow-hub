const escapeStringRegexp = require('escape-string-regexp');

class WildcardMatcher {
  constructor() {
    this.name = 'WildcardMatcher';
  }

  match(tag, pattern) {
    const t = tag.toLowerCase();
    const p = pattern.toLowerCase();
    // Специальный кейс для 'semver' -- ищем строки вида '1.2.3', 'v1.2.3', '1.2.3-alpha', 'v1.2.3-fix'
    let regexPattern;
    if (p === 'semver') {
      regexPattern = '^[v]?\\d+\\.\\d+\\.\\d+[-]?.*';
      const re = new RegExp(regexPattern, 'i');
      return re.test(t);
    }
    // специальный кейс для '?*' — только буквы+цифры и хотя бы одна цифра
    if (p === '?*') {
      // /^[a-z0-9]+$/ соответствует только алфа‑цифре
      // /\d/ проверяет, что есть хотя бы одна цифра
      return /^[a-z0-9]+$/.test(t) && /\d/.test(t);
    }

    // нет ни звёздочки, ни вопроса — строгое сравнение
    if (!p.includes('*') && !p.includes('?')) {
      return t === p;
    }

    // чистый префикс: xxx*
    if (p.endsWith('*') && !p.startsWith('*') && !p.includes('?')) {
      return t.startsWith(escapeStringRegexp(p.slice(0, -1)));
    }

    // чистый суффикс: *xxx
    if (p.startsWith('*') && !p.endsWith('*') && !p.includes('?')) {
      return t.endsWith(escapeStringRegexp(p.slice(1)));
    }

    // contains: *xxx*
    if (p.startsWith('*') && p.endsWith('*') && !p.includes('?')) {
      return t.includes(escapeStringRegexp(p.slice(1, -1)));
    }

    // общий вариант: билдим RegExp, эскейпим спецсимволы, затем *→.* и ?→.
    console.log(`Matching tag "${t}" against pattern "${p}"`);
    console.log(`Escaped pattern: ${escapeStringRegexp(p)}`);
    console.log(`Transformed pattern: ${p.replace(/\\*/g, '.*').replace(/\\?/g, '.')}`);
    const escaped = '^' + escapeStringRegexp(p)
      // превращаем джокеры в RegExp
      .replace(/\\\*/g, '.*')
      .replace(/\\\?/g, '.');

    const re = new RegExp(`^${escaped}$`, 'i');
    return re.test(t);
  }
}

module.exports = WildcardMatcher;
