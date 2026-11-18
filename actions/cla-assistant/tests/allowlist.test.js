import { beforeEach, describe, expect, jest, test } from "@jest/globals";

const getInput = jest.fn();
jest.unstable_mockModule("@actions/core", () => ({ getInput }));
const { checkAllowList } = await import("../lib/checkAllowList.js");

beforeEach(() => getInput.mockReturnValue(""));

describe("CLA allowlist", () => {
  const alice = { name: "alice", id: 1 };
  const bot = { name: "bot-worker", id: 2 };
  const other = { name: "robot-worker", id: 3 };

  test("retains contributors when the allowlist is empty", () => {
    expect(checkAllowList([alice, bot])).toEqual([alice, bot]);
  });

  test("matches exact names and trims configuration entries", () => {
    getInput.mockReturnValue(" alice , someone ");
    expect(checkAllowList([alice, bot])).toEqual([bot]);
  });

  test("matches the whole username for wildcard entries", () => {
    getInput.mockReturnValue("bot*");
    expect(checkAllowList([alice, bot, other])).toEqual([alice, other]);
  });

  test("treats regular expression characters literally", () => {
    getInput.mockReturnValue("service.*");
    const literal = { name: "service.worker", id: 4 };
    const similar = { name: "service-worker", id: 5 };
    expect(checkAllowList([literal, similar])).toEqual([similar]);
  });

  test("supports a wildcard matching every contributor", () => {
    getInput.mockReturnValue("*");
    expect(checkAllowList([alice, bot])).toEqual([]);
  });
});
