import { jest, describe, it, expect } from '@jest/globals';

jest.unstable_mockModule('@qubership/action-logger', () => ({
  default: new Proxy({}, { get: () => jest.fn() })
}));

const { deletePackageVersion } = await import('../src/utils/deleteAction.js');
const { createDeletionProgress, notProcessed } = await import('../src/utils/deletionProgress.js');

const versions = (ids) => ids.map(id => ({ id, name: `sha256:${id}`, metadata: { container: { tags: [] } } }));
const selection = (ids) => [{ package: { id: 1, name: 'image', type: 'container' }, versions: versions(ids) }];
// a wrapper whose delete call rejects with the given message for the listed ids
const wrapperFailing = (failures = {}) => ({
  deletePackageVersion: jest.fn(async (_owner, _type, _name, id) => {
    if (id in failures) throw new Error(failures[id]);
  })
});
// the counters without the per-version outcomes
const counters = ({ selected, deleted, skipped, failed, simulated }) => ({ selected, deleted, skipped, failed, simulated });
const outcomesOf = (progress) => Object.fromEntries(progress.outcomes);
const run = (ids, wrapper, extra = {}) => {
  const progress = createDeletionProgress(ids.length);
  const promise = deletePackageVersion(selection(ids), { wrapper, owner: 'owner', batchSize: 2, maxErrors: 5, progress, ...extra });
  return { progress, promise };
};

describe('deletion progress counters', () => {
  it('counts every deleted version', async () => {
    const { progress, promise } = run([1, 2, 3], wrapperFailing());
    await promise;

    expect(counters(progress)).toEqual({ selected: 3, deleted: 3, skipped: 0, failed: 0, simulated: 0 });
    expect(outcomesOf(progress)).toEqual({ 1: 'deleted', 2: 'deleted', 3: 'deleted' });
    expect(notProcessed(progress)).toBe(0);
  });

  it('counts simulated deletions in a dry run and deletes nothing', async () => {
    const wrapper = wrapperFailing();
    const { progress, promise } = run([1, 2, 3], wrapper, { dryRun: true });
    await promise;

    expect(wrapper.deletePackageVersion).not.toHaveBeenCalled();
    expect(counters(progress)).toEqual({ selected: 3, deleted: 0, skipped: 0, failed: 0, simulated: 3 });
    expect(outcomesOf(progress)).toEqual({ 1: 'simulated', 2: 'simulated', 3: 'simulated' });
  });

  it('counts skippable errors separately from other failures', async () => {
    const { progress, promise } = run([1, 2, 3, 4], wrapperFailing({ 2: '404 not found', 3: 'boom' }));
    const status = await promise;

    expect(counters(progress)).toEqual({ selected: 4, deleted: 2, skipped: 1, failed: 1, simulated: 0 });
    expect(status).toHaveLength(2);
    expect(outcomesOf(progress)).toEqual({ 1: 'deleted', 2: 'skipped', 3: 'failed', 4: 'deleted' });
  });

  it('keeps the counters when a critical error stops the run, and counts what was never reached', async () => {
    const { progress, promise } = run([1, 2, 3, 4, 5], wrapperFailing({ 3: '403 rate limit' }));

    await expect(promise).rejects.toThrow(/403/);
    // batch 1 (1, 2) was deleted, batch 2 (3, 4) ran together: 3 failed, 4 was deleted; 5 was never started
    expect(counters(progress)).toEqual({ selected: 5, deleted: 3, skipped: 0, failed: 1, simulated: 0 });
    expect(notProcessed(progress)).toBe(1);
    // version 5 has no outcome: it was never started
    expect(outcomesOf(progress)).toEqual({ 1: 'deleted', 2: 'deleted', 3: 'failed', 4: 'deleted' });
  });

  it('keeps the counters when the max-errors limit stops the run', async () => {
    const { progress, promise } = run([1, 2, 3, 4, 5, 6], wrapperFailing({ 1: 'boom', 2: 'boom' }), { maxErrors: 2 });

    await expect(promise).rejects.toThrow(/Stopped after 2 errors/);
    expect(counters(progress)).toEqual({ selected: 6, deleted: 0, skipped: 0, failed: 2, simulated: 0 });
    expect(notProcessed(progress)).toBe(4);
    expect(outcomesOf(progress)).toEqual({ 1: 'failed', 2: 'failed' });
  });

  it('works without a progress object', async () => {
    await expect(deletePackageVersion(selection([1, 2]), { wrapper: wrapperFailing(), owner: 'owner' })).resolves.toEqual([]);
  });
});

describe('notProcessed', () => {
  it('never goes below zero', () => {
    expect(notProcessed({ selected: 1, deleted: 2, skipped: 0, failed: 0, simulated: 0 })).toBe(0);
  });
});
