const mock = require('mock-require')

const branches = [
  'sandbox',
  'preview',
  'release/1.100.0',
  'master',
  'release/1.99.0',
  'develop',
  'release/1.17.0',
]

const expectedBranches = branches.map(branch => `origin/${branch}`)

const mockBranches = [
  'refs/heads/test-branch',
  'refs/remotes/ignored-branch',
  'refs/heads/origin/ignored-branch',
  'refs/remotes/upstream/ignored-branch',
  ...(expectedBranches.map(branch => `refs/remotes/${branch}`))
]

function referenceFactory(branch) {
  return {
    isRemote: () => branch.includes('remotes/'),
    name: () => branch,
    shorthand: () => branch.replace(/^refs\/(remotes|heads)\//i, '')
  }
}

exports.expectedBranches = expectedBranches

exports.mock = () => {
  mock('nodegit', {
    Repository: {
      open: () => Promise.resolve({
        getReferences: () => Promise.resolve(mockBranches.map(referenceFactory))
      })
    },
    Reference: {
      TYPE: {
        LISTALL: 3
      }
    }
  })
}

exports.unmock = () => {
  mock.stop('nodegit')
}
