import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockCore = {
  summary: {
    addRaw: jest.fn().mockReturnThis(),
    write: jest.fn().mockResolvedValue(undefined)
  }
};
jest.unstable_mockModule('@actions/core', () => mockCore);

const { writeListingFailuresSummary } = await import('../src/reports/listingFailures.js');

describe('writeListingFailuresSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([[[]], [undefined], [null]])('writes nothing without failures (%p)', async (failures) => {
    await writeListingFailuresSummary(failures);

    expect(mockCore.summary.addRaw).not.toHaveBeenCalled();
    expect(mockCore.summary.write).not.toHaveBeenCalled();
  });

  it('lists every failed visibility with its reason and writes the summary once', async () => {
    await writeListingFailuresSummary([
      { visibility: 'private', reason: 'Resource not accessible' },
      { visibility: 'internal', reason: 'Not Found' }
    ]);

    const text = mockCore.summary.addRaw.mock.calls.map(c => c[0]).join('');
    expect(text).toContain('Incomplete package listing');
    expect(text).toContain('<strong>private</strong>: Resource not accessible');
    expect(text).toContain('<strong>internal</strong>: Not Found');
    expect(mockCore.summary.write).toHaveBeenCalledTimes(1);
  });
});
