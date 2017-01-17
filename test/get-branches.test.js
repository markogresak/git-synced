import test from 'ava'
import path from 'path'
import {mock} from './mocks/nodegit.mock'

// based on mockBranches (from nodegit.mock) + sync-config
const expectedBranches = [
  'master',
  'preview',
  'sandbox',
  'release/1.17.0',
  'release/1.99.0',
  'release/1.100.0',
  'develop',
]

mock()
const getSyncConfig = require('../src/get-sync-config')
const getBranches = require('../src/get-branches')

const syncConfig = getSyncConfig(path.resolve(__dirname, './mocks/sync-config.mock.yml'))

test(t => {
  const msg = 'getBranches should return only branches specified in sync-config.yml, in correct order'

  return getBranches(syncConfig.repositories[0]).then(actual => {
    // rename branches to match with full ref name
    t.deepEqual(actual, expectedBranches.map(branch => `refs/remotes/origin/${branch}`), msg)
  })
})
