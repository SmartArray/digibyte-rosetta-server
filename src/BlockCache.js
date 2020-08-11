/* BlockCache.js */

function BlockCache(space = 1000) {
  if (typeof space !== 'number' || space < 0)
    throw new Error('Space must be a positive number');

  let map = {};
  let hashes = new Array();

  this.get = (blockHash) => {
    return map[blockHash];
  }

  this.put = (blockHash, block) => {
    map[blockHash] = block;
    hashes.push(blockHash);
    this._removeEldest();
  }

  this._removeEldest = () => {
    while (hashes.length > space) {
      const hashToBeRemoved = hashes.shift();
      delete map[hashToBeRemoved];
    }
  }
}

module.exports = BlockCache;