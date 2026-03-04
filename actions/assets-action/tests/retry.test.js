import { jest } from "@jest/globals";

jest.unstable_mockModule("@netcracker/action-logger", () => ({
  default: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

const { retryAsync } = await import("../src/retry.js");

describe("retryAsync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns result on first successful call", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const result = await retryAsync(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("retries on failure and succeeds on second attempt", async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");
    const result = await retryAsync(fn, { retries: 2, delay: 0 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("throws last error after all retries exhausted", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("always fails"));
    await expect(retryAsync(fn, { retries: 3, delay: 0 })).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test("respects custom retries count", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("fail"));
    await expect(retryAsync(fn, { retries: 5, delay: 0 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(5);
  });

  test("applies factor to delay on each retry", async () => {
    const delays = [];
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = (fn, ms) => { delays.push(ms); return originalSetTimeout(fn, 0); };

    const fn = jest.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");

    // constDelay starts at 100, then *=2 before each sleep: 200, 400
    await retryAsync(fn, { retries: 3, delay: 100, factor: 2 });

    global.setTimeout = originalSetTimeout;
    expect(delays[0]).toBe(200);
    expect(delays[1]).toBe(400);
  });
});
