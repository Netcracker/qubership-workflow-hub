import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockCore = {
  summary: {
    addRaw: jest.fn().mockReturnThis(),
    write: jest.fn().mockResolvedValue(undefined)
  }
};
jest.unstable_mockModule('@actions/core', () => mockCore);

const { writeBlockedByExclusionSummary } = await import('../src/reports/blockedByExclusion.js');

describe('writeBlockedByExclusionSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([[[]], [undefined], [null]])('writes nothing without blocked packages (%p)', async (blocked) => {
    await writeBlockedByExclusionSummary(blocked);

    expect(mockCore.summary.addRaw).not.toHaveBeenCalled();
    expect(mockCore.summary.write).not.toHaveBeenCalled();
  });

  it('lists every package with the number of protected versions and the responsible patterns', async () => {
    await writeBlockedByExclusionSummary([
      { package: 'lib-a', versions: 3, patterns: ['*.*'] },
      { package: 'lib-b', versions: 1, patterns: ['release*', '1.*'] }
    ]);

    const text = mockCore.summary.addRaw.mock.calls.map(c => c[0]).join('');
    expect(text).toContain('Versions protected by excluded patterns');
    expect(text).toContain('<strong>lib-a</strong>: 3 version(s), excluded by <code>*.*</code>');
    expect(text).toContain('<strong>lib-b</strong>: 1 version(s), excluded by <code>release*</code>, <code>1.*</code>');
    expect(mockCore.summary.write).toHaveBeenCalledTimes(1);
  });
});
