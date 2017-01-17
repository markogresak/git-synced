function parseBranchName(refName, remoteName) {
  const matchingRef = refName.includes(remoteName) ? remoteName : 'heads'
  const remoteIndex = refName.indexOf(matchingRef)
  return remoteIndex === -1 ? refName : refName.substr(remoteIndex + matchingRef.length + 1)
}

module.exports = parseBranchName
