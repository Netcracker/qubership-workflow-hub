import { describe, it, expect } from '@jest/globals';
import { resolveFilters } from '../src/utils/filters.js';
import { parseList } from '../src/utils/inputs.js';

describe('parseList', () => {
  it.each([
    ['a,b', ['a', 'b']],
    [' a , b ,, ,c ', ['a', 'b', 'c']],
    ['latest,release*,*.*', ['latest', 'release*', '*.*']],
    ['', []],
    ['  ', []],
    [',,', []],
    [undefined, []],
    [null, []],
  ])('parses %j', (raw, expected) => {
    expect(parseList(raw)).toEqual(expected);
  });
});

describe('resolveFilters', () => {
  it('merges tags and patterns into one include and one exclude list', () => {
    const result = resolveFilters('container', {
      includedTags: ['dev-*'], includedPatterns: ['semver'],
      excludedTags: ['latest'], excludedPatterns: ['release*'],
    });

    expect(result).toEqual({ included: ['dev-*', 'semver'], excluded: ['latest', 'release*'] });
  });

  it('removes duplicates', () => {
    const result = resolveFilters('container', {
      includedTags: ['dev-*'], includedPatterns: ['dev-*'],
      excludedTags: ['a', 'b'], excludedPatterns: ['b'],
    });

    expect(result).toEqual({ included: ['dev-*'], excluded: ['a', 'b'] });
  });

  it('keeps the container selection open without inclusions', () => {
    expect(resolveFilters('container', {})).toEqual({ included: [], excluded: [] });
    expect(resolveFilters('container')).toEqual({ included: [], excluded: [] });
  });

  it('uses *SNAPSHOT* for maven only when no inclusion is given', () => {
    expect(resolveFilters('maven', {}).included).toEqual(['*SNAPSHOT*']);
    expect(resolveFilters('maven', { excludedPatterns: ['release*'] })).toEqual({ included: ['*SNAPSHOT*'], excluded: ['release*'] });
  });

  it('uses only the explicit inclusions for maven and does not add *SNAPSHOT*', () => {
    expect(resolveFilters('maven', { includedPatterns: ['*SNAPSHOT'] }).included).toEqual(['*SNAPSHOT']);
    expect(resolveFilters('maven', { includedTags: ['1.*-beta'] }).included).toEqual(['1.*-beta']);
  });
});
