import test from 'ava'
import getBranchPairs from '../src/get-branch-pairs'

const allBranches = [
  'master',
  'preview',
  'sandbox',
  'release/1.17.0',
  'release/1.99.0',
  'release/1.100.0',
  'develop'
]

test('getBranchPairs (first branch)', t => {
  const expected = [
    ['master', 'preview'],
    ['preview', 'sandbox'],
    ['sandbox', 'release/1.17.0'],
    ['release/1.17.0', 'release/1.99.0'],
    ['release/1.99.0', 'release/1.100.0'],
    ['release/1.100.0', 'develop'],
  ]
  const actualWithExplicit = getBranchPairs(allBranches, 'master')
  const actualWithDefault = getBranchPairs(allBranches)
  const msgExplicit = 'when provided first branch, it should return pairs of all branches'
  const msgDefault = 'when no startingBranch is provided, it should default to first and return all pairs'

  t.deepEqual(actualWithExplicit, expected, msgExplicit)
  t.deepEqual(actualWithDefault, expected, msgDefault)
})

test('getBranchPairs (i-th branch)', t => {
  const expected = [
    ['sandbox', 'release/1.17.0'],
    ['release/1.17.0', 'release/1.99.0'],
    ['release/1.99.0', 'release/1.100.0'],
    ['release/1.100.0', 'develop'],
  ]
  const actual = getBranchPairs(allBranches, 'sandbox')
  const msg = 'when provided branch "x", it should return pairs starting with branch "x"'

  t.deepEqual(actual, expected, msg)
})

test('getBranchPairs (last branch)', t => {
  const expected = []
  const actual = getBranchPairs(allBranches, 'develop')
  const msg = 'when provided last branch, it should return no pairs (empty array)'

  t.deepEqual(actual, expected, msg)
})

test('getBranchPairs (unknown branch)', t => {
  t.throws(() => {
    getBranchPairs(allBranches, 'unknown-branch')
  }, Error, 'when provided with unknown branch, it should throw an error')
})

test('getBranchPairs maxPairs limit (default value)', t => {
  const expected = [
    ['master', 'preview'],
    ['preview', 'sandbox'],
    ['sandbox', 'release/1.17.0'],
    ['release/1.17.0', 'release/1.99.0'],
    ['release/1.99.0', 'release/1.100.0'],
    ['release/1.100.0', 'develop'],
  ]
  const actualWithExplicitAll = getBranchPairs(allBranches, 'master', 6)
  const actualWithExplicitBranchOnly = getBranchPairs(allBranches, 'master')
  const actualWithExplicitMaxPairsOnly = getBranchPairs(allBranches, undefined, 6)
  const actualWithDefault = getBranchPairs(allBranches)

  t.deepEqual(actualWithExplicitAll, expected)
  t.deepEqual(actualWithExplicitBranchOnly, expected)
  t.deepEqual(actualWithExplicitMaxPairsOnly, expected)
  t.deepEqual(actualWithDefault, expected)
})

test('getBranchPairs maxPairs limit 3', t => {
  const expected = [
    ['master', 'preview'],
    ['preview', 'sandbox'],
    ['sandbox', 'release/1.17.0'],
  ]
  const actualWithExplicitAll = getBranchPairs(allBranches, 'master', 3)
  const actualWithExplicitMaxPairsOnly = getBranchPairs(allBranches, undefined, 3)

  t.deepEqual(actualWithExplicitAll, expected)
  t.deepEqual(actualWithExplicitMaxPairsOnly, expected)
})

test('getBranchPairs maxPairs limit 1', t => {
  const expected = [
    ['master', 'preview'],
  ]
  const actualWithExplicitAll = getBranchPairs(allBranches, 'master', 1)
  const actualWithExplicitMaxPairsOnly = getBranchPairs(allBranches, undefined, 1)

  t.deepEqual(actualWithExplicitAll, expected)
  t.deepEqual(actualWithExplicitMaxPairsOnly, expected)
})

test('getBranchPairs (i-th branch) maxPairs limit 1', t => {
  const expected = [
    ['sandbox', 'release/1.17.0'],
  ]
  const actual = getBranchPairs(allBranches, 'sandbox', 1)

  t.deepEqual(actual, expected)
})

test('getBranchPairs (last branch) maxPairs limit X', t => {
  const expected = []
  const actualLimit1 = getBranchPairs(allBranches, 'develop', 1)
  const actualLimit3 = getBranchPairs(allBranches, 'develop', 3)

  t.deepEqual(actualLimit1, expected)
  t.deepEqual(actualLimit3, expected)
})
