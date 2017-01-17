const _ = require('lodash')

function getBranchPairs(allBranches, startingBranch = allBranches[0], maxPairs = -1) {
  // can't make pair from less than 2 branches and 2 is already a pair
  if (allBranches.length <= 2) {
    return allBranches
  }
  const startingBranchIndex = allBranches.indexOf(startingBranch)
  if (startingBranchIndex === -1) {
    throw new Error(`Branch "${startingBranch}" not found.`)
  }
  return _.range(startingBranchIndex, maxPairs === -1 ? allBranches.length - 1 : startingBranchIndex + maxPairs)
          .map(i => [allBranches[i], allBranches[i + 1]])
          // remove pair if at least one of it's elements is undefined
          .filter(pair => !pair.some(_.isUndefined))
}

module.exports = getBranchPairs
