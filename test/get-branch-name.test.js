import test from 'ava'
import _ from 'lodash'
import parseBranchName from '../src/parse-branch-name'

function assertParseBranchName({branch, remote}) {
  test('parse-branch-name (plain branch name)', t => {
    const expected = branch
    const actual = parseBranchName(branch)
    const msg = 'should remain unchanged if there is not ref/remote'

    t.is(actual, expected, msg)
  })

  test('parse-branch-name (with remote)', t => {
    const expected = branch
    const actual = parseBranchName(`${remote}/${branch}`, remote)
    const msg = 'should return branch name, without leading remote'

    t.is(actual, expected, msg)
  })

  test('parse-branch-name (with refs/remote)', t => {
    const expected = branch
    const actual = parseBranchName(`refs/remotes/${remote}/${branch}`, remote)
    const msg = 'should return branch name, without leading refs/remote'

    t.is(actual, expected, msg)
  })

  test('parse-branch-name (with refs/heads)', t => {
    const expected = branch
    const actual = parseBranchName(`refs/heads/${branch}`, remote)
    const actualWithoutRemote = parseBranchName(`refs/heads/${branch}`)
    const msg = 'should return branch name, without leading refs/remote'

    t.is(actual, expected, msg)
    t.is(actualWithoutRemote, expected, msg)
  })
}

const branches = _.flatMap(['master', 'release/1.18.0', 'some/feature/branch'],
                    branch => ['origin', 'upstream'].map(remote => ({branch, remote})))

branches.forEach(assertParseBranchName)
