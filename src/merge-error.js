/**
 * @param {String}            message   Custom error message
 *                                        (optional, default = 'Merge Error occured').
 * @param {Array<IndexEntry>} conflicts Array of conflicting IndexEntry (http://www.nodegit.org/api/index_entry/)
 *                                        (optional, default = [])
 */
function MergeError(message = 'Merge Error occured', conflicts = [], {upstream, head}) {
  this.name = 'MergeError'
  this.message = message
  this.conflicts = conflicts
  this.upstream = upstream
  this.head = head
  this.stack = (new Error()).stack
}
MergeError.prototype = Object.create(Error.prototype)
MergeError.prototype.constructor = MergeError

MergeError.prototype.toString = function () {
  const conflictsStr = this.conflicts.map(c => `\t${c.id} ${c.path}`).join('\n')
  return `${this.message}\n${conflictsStr}`
}

module.exports = MergeError
