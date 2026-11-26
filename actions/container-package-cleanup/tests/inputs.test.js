import { describe, it, expect } from '@jest/globals';
import { parseNonNegativeInt, parseIntWithDefault, parseBooleanInput } from '../src/utils/inputs.js';

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

describe('parseIntWithDefault', () => {
  it.each([[''], ['   '], [undefined], [null], ['0']])('uses the default for %j', (raw) => {
    expect(parseIntWithDefault('batch-size', raw, 15)).toBe(15);
  });

  it.each([['1', 1], ['7', 7], [' 30 ', 30]])('accepts %j', (raw, expected) => {
    expect(parseIntWithDefault('batch-size', raw, 15)).toBe(expected);
  });

  it.each([['-1'], ['-100'], ['1.5'], ['7abc'], ['abc'], ['1e3'], ['+3']])('rejects %j', (raw) => {
    expect(() => parseIntWithDefault('batch-size', raw, 15)).toThrow(/batch-size/);
  });

  it('rejects values beyond the safe integer range', () => {
    expect(() => parseIntWithDefault('max-errors', '99999999999999999999', 5)).toThrow(/too large/);
  });
});

describe('parseBooleanInput', () => {
  it.each([['true', true], ['TRUE', true], ['True', true], [' true ', true], ['false', false], ['False', false], ['FALSE', false]])('accepts %j', (raw, expected) => {
    expect(parseBooleanInput('dry-run', raw)).toBe(expected);
  });

  it.each([[''], ['   '], [undefined], [null]])('uses the default for %j', (raw) => {
    expect(parseBooleanInput('dry-run', raw)).toBe(false);
    expect(parseBooleanInput('dry-run', raw, true)).toBe(true);
  });

  it.each([['ture'], ['yes'], ['no'], ['y'], ['on'], ['off'], ['1'], ['0'], ['truee'], ['tru']])('rejects %j', (raw) => {
    expect(() => parseBooleanInput('dry-run', raw)).toThrow(/Invalid 'dry-run' input/);
  });
});
