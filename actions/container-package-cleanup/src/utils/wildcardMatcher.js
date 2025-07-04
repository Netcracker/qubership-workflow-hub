class WildcardMatcher {
    constructor() {
        this.name = 'WildcardMatcher';
    }

    match(tag, pattern) {
        const t = tag.toLowerCase();
        const p = pattern.toLowerCase();

        if (!p.includes('*')) {
            return t === p;
        }

        if (p.endsWith('*') && !p.startsWith('*')) {
            const prefix = p.slice(0, -1);
            return t.startsWith(prefix);
        }

        if (p.startsWith('*') && !p.endsWith('*')) {
            const suffix = p.slice(1);
            return t.endsWith(suffix);
        }

        if (p.startsWith('*') && p.endsWith('*')) {
            const substr = p.slice(1, -1);
            return t.includes(substr);
        }

        const escaped = p.replace(/[-[\]{}()+?.,\\^$|#\s]/g, '\\$&').replace(/\*/g, '.*');
        const re = new RegExp(`^${escaped}$`, 'i');
        return re.test(tag);
    }
}

module.exports = WildcardMatcher;