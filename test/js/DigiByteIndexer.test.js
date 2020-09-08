const { expect } = require('chai');
const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const Indexer = require('../../src/Indexer');

describe('DigiByteIndexer', () => {
  let dbPath;
  let instance;

  before(async () => {
    dbPath = await fs.mkdtemp(path.join(os.tmpdir(), 'digibyte-rosetta-tests-'));
    instance = new Indexer({ path: dbPath });
    console.log(`Database initialized in path ${dbPath}`);
  });

  after(async () => {
    console.log('Deleting the test directory...');
    execSync(`rm -rf ${dbPath}`);
    console.log('Done!');
  });

  it('should initialize the instance correctly', async () => {
    await instance.initIndexer();
  });
});
