/**
 * Strictly parses a non-negative integer action input.
 * Only plain decimal digits are accepted: values such as "", "-1", "1.5" or "7abc" are rejected,
 * so an invalid retention setting can never silently broaden what gets deleted.
 *
 * @param {string} name - input name, used in the error message
 * @param {string} raw - raw input value
 * @returns {number}
 * @throws {Error} if the value is not a non-negative integer
 */
function parseNonNegativeInt(name, raw) {
  const value = String(raw ?? "").trim();
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid '${name}' input: "${value}". Expected a non-negative integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`Invalid '${name}' input: "${value}" is too large.`);
  }
  return parsed;
}

export { parseNonNegativeInt };
