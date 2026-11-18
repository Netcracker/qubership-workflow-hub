import { describe, it, expect } from '@jest/globals';
import { parseNonNegativeInt } from '../src/utils/inputs.js';

describe('parseNonNegativeInt', () => {
  it.each([['0', 0], ['7', 7], ['14', 14], ['007', 7], [' 30 ', 30]])('accepts %j', (raw, expected) => {
    expect(parseNonNegativeInt('threshold-days', raw)).toBe(expected);
  });

  it.each([[''], ['abc'], ['7abc'], ['-1'], ['1.5'], ['1e3'], ['+3'], [undefined], [null]])('rejects %j', (raw) => {
    expect(() => parseNonNegativeInt('threshold-days', raw)).toThrow(/threshold-days/);
  });

  it('rejects values beyond the safe integer range', () => {
    expect(() => parseNonNegativeInt('threshold-days', '99999999999999999999')).toThrow(/too large/);
  });
});
