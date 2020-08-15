const { expect } = require('chai');

describe('BlockCache', () => {
  const BlockCache = require('../BlockCache');

  it('should have a default instance', () => {
    const SyncBlockCache = require('../syncBlockCache');
    SyncBlockCache.put('1', 'a');

    const existing = SyncBlockCache.get('1');
    expect(existing).to.equal('a');
  });

  it('should successfully store a block', () => {
    const blockCache = new BlockCache(5);
    blockCache.put('1', 'a');

    const existing = blockCache.get('1');
    expect(existing).to.equal('a');
  });

  it('should wipe the oldest elements', () => {
    const blockCache = new BlockCache(5);
    blockCache.put('1', 'a');
    blockCache.put('2', 'b');
    blockCache.put('3', 'c');
    blockCache.put('4', 'd');
    blockCache.put('5', 'e');
    blockCache.put('6', 'f');

    const nonExisting = blockCache.get('1');
    expect(nonExisting).to.equal(undefined);

    const existing = blockCache.get('3');
    expect(existing).to.equal('c');
  });
});
