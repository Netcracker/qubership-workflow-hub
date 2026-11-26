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

/**
 * Strictly parses an optional positive integer input with a default.
 * An empty value and "0" select the default (kept for backward compatibility);
 * negative, non-integer, non-numeric and out-of-range values are rejected.
 *
 * @param {string} name - input name, used in the error message
 * @param {string} raw - raw input value
 * @param {number} defaultValue - value used for an empty input or "0"
 * @returns {number}
 * @throws {Error} if the value is not a valid non-negative integer
 */
function parseIntWithDefault(name, raw, defaultValue) {
  if (String(raw ?? "").trim() === "") return defaultValue;
  return parseNonNegativeInt(name, raw) || defaultValue;
}

/**
 * Strictly parses a boolean switch input.
 * Only "true" and "false" (any letter case) are accepted. An empty value selects the default,
 * so a mistyped value (for example "ture" or "yes") can never silently select the opposite mode.
 *
 * @param {string} name - input name, used in the error message
 * @param {string} raw - raw input value
 * @param {boolean} [defaultValue=false] - value used for an empty input
 * @returns {boolean}
 * @throws {Error} if the value is neither empty, "true" nor "false"
 */
function parseBooleanInput(name, raw, defaultValue = false) {
  const value = String(raw ?? "").trim();
  if (value === "") return defaultValue;
  const lower = value.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;
  throw new Error(`Invalid '${name}' input: "${value}". Expected "true" or "false".`);
}

/**
 * Parses a comma-separated list input: items are trimmed and empty items are skipped.
 *
 * @param {string} raw - raw input value
 * @returns {string[]}
 */
function parseList(raw) {
  return String(raw ?? "")
    .split(",")
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

export { parseNonNegativeInt, parseIntWithDefault, parseBooleanInput, parseList };
