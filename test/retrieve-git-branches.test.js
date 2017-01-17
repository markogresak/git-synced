import test from 'ava'
import {expectedBranches, mock} from './mocks/nodegit.mock'

test('retrieveGitBranches', t => {
  mock()
  /* eslint-disable global-require */
  const retrieveGitBranches = require('../src/retrieve-git-branches')
  const msg = 'retrieveGitBranches should return only branches starting with "remotes/origin"'

  return retrieveGitBranches('mock/path').then(actual => {
    // rename branches to match with full ref name
    t.deepEqual(actual, expectedBranches.map(branch => `refs/remotes/${branch}`), msg)
  })
})
