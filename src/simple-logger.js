function write(fn, label = '') {
  return (...msg) => fn(`[${(new Date()).toUTCString()}]${label ? ` - ${label}` : ''}: ${msg.join(' ')}`)
}

exports.write = write

/* eslint-disable no-console */
exports.error = write.bind(null, console.error.bind(console))
exports.log = write.bind(null, console.log.bind(console))
/* eslint-enable no-console */
