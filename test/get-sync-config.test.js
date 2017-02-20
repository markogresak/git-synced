import test from 'ava'
import path from 'path'
import semverSort from 'semver-sort'
import getSyncConfig from '../src/get-sync-config'

const syncConfig = getSyncConfig(path.resolve(__dirname, './mocks/sync-config.mock.yml'))
const syncConfigNoGitConfig = getSyncConfig(path.resolve(__dirname, './mocks/sync-config-no-git_config.mock.yml'))

function testSyncConfigKey({branches, releaseIndex}, index) {
  test(`syncConfig.repositories[${index}] sortFn branch release [${releaseIndex}]`, t => {
    const expected = semverSort.asc
    const actual = syncConfig.repositories[index].branches[releaseIndex].sortFn
    const msg = 'should be semverSort.asc'

    t.is(actual, expected, msg)
  })

  test(`syncConfig.repositories[${index}] nameFilterFn with matching names for branch release [${releaseIndex}]`, t => {
    const expected = [true, true, true, true, true, true]
    const actual = [
      'release/1.0.0',
      'release/1.2.3',
      'release/3.2.1',
      'better-release/1.0.0',
      'better-release/1.0.0.0',
      'release/100.200.300',
    ].map(syncConfig.repositories[index].branches[releaseIndex].nameFilterFn)
    const msg = 'should return true for any branch containing "release/"'

    t.deepEqual(actual, expected, msg)
  })

  test(`syncConfig.repositories[${index}] nameFilterFn with non-matching names for branch release [${releaseIndex}]`, t => {
    const expected = [false, false, false]
    const actual = [
      'master',
      'relis/1.0.0',
      'release-better/1.0.0',
    ].map(syncConfig.repositories[index].branches[releaseIndex].nameFilterFn)
    const msg = 'should return false for any branch not containing "release/"'

    t.deepEqual(actual, expected, msg)
  })

  test(`syncConfig.repositories[${index}] should contain a string key remote_url`, t => {
    const expected = 'string'
    const actual = typeof syncConfig.repositories[index].remote_url
    const message = 'syncConfig.repositories[index].remote_url should be of type string'

    t.is(actual, expected, message)
  })

  test(`syncConfig.repositories[${index}] should contain a string key local_path`, t => {
    const expected = 'string'
    const actual = typeof syncConfig.repositories[index].local_path
    const message = 'syncConfig.repositories[index].local_path should be of type string'

    t.is(actual, expected, message)
  })

  function testConstantBranchName([branchIndex, branchName]) {
    test(`syncConfig.repositories[${index}] sortFn for branch ${branchName} should be a function`, t => {
      const expected = 'function'
      const actual = typeof syncConfig.repositories[index].branches[branchIndex].sortFn
      const msg = 'sortFn should be of type function'

      t.is(actual, expected, msg)
    })

    test(`syncConfig.repositories[${index}] nameFilterFn with matching names for branch "${branchName}"`, t => {
      const expected = true
      const actual = syncConfig.repositories[index].branches[branchIndex].nameFilterFn(branchName)
      const msg = `should return true for branchName "${branchName}"`

      t.is(actual, expected, msg)
    })

    test(`syncConfig.repositories[${index}] nameFilterFn with non-matching names for branch "${branchName}"`, t => {
      const expected1 = false
      const actual1 = syncConfig.repositories[index].branches[branchIndex].nameFilterFn('feat/something')
      const msg1 = 'should return false for branchName "feat/something"'

      const expected2 = false
      const actual2 = syncConfig.repositories[index].branches[branchIndex].nameFilterFn('new-branch')
      const msg2 = 'should return false for branchName "new-branch"'

      t.is(actual1, expected1, msg1)
      t.is(actual2, expected2, msg2)
    })
  }

  branches.forEach(testConstantBranchName)
}

const platformBranches = {branches: [[0, 'master'], [1, 'preview'], [2, 'sandbox'], [4, 'develop']], releaseIndex: 3}
const canvasBranches = {branches: [[0, 'master'], [2, 'develop']], releaseIndex: 1}
;[platformBranches, canvasBranches].forEach(testSyncConfigKey)

test('syncConfig.repositories[0]', t => {
  const expected = ['master', 'preview', 'sandbox', 'release', 'develop']
  const actual = syncConfig.repositories[0].branches.map(branch => branch.name)
  const message = 'should contain branches master, preview, sandbox, release (regex) and develop'
  t.deepEqual(actual, expected, message)
})

test('syncConfig.repositories[1]', t => {
  const expected = ['master', 'release', 'develop']
  const actual = syncConfig.repositories[1].branches.map(branch => branch.name)
  const message = 'should contain branches master, release (regex) and develop'
  t.deepEqual(actual, expected, message)
})

test('syncConfig.repositories[0] remote_name (default value)', t => {
  const expected = 'origin'
  const actual = syncConfig.repositories[0].remote_name
  const message = 'if no remote_name is specified, default to origin'

  t.is(actual, expected, message)
})

test('syncConfig.repositories[1] remote_name', t => {
  const expected = 'upstream'
  const actual = syncConfig.repositories[1].remote_name
  const message = 'remote_name should equal to specified name in config (upstream)'

  t.is(actual, expected, message)
})

test('syncConfig local_path should be resolved relative to project root', t => {
  const expected = path.resolve(__dirname, '..', '../tmp/dlabs/repo2')
  const actual = syncConfig.repositories[1].local_path

  t.is(actual, expected)
})

test('syncConfig local_path should remain the same if not relative', t => {
  const expected = '/tmp/dlabs/repo1'
  const actual = syncConfig.repositories[0].local_path

  t.is(actual, expected)
})

test('syncConfig should define repository name', t => {
  const expected = ['repo1', 'repo2']
  const actual = syncConfig.repositories.map(repo => repo.name)

  t.deepEqual(actual, expected)
})

test('syncConfig should parse git_config', t => {
  const expected = [
    {name: 'user.name', value: 'username'},
    {name: 'user.email', value: 'user@example.com'},
  ]
  const actual = syncConfig.gitConfig

  t.deepEqual(expected, actual)
})

test('syncConfig without git_config field should have empty array as gitConfig', t => {
  const expected = []
  const actual = syncConfigNoGitConfig.gitConfig

  t.deepEqual(expected, actual)
})
