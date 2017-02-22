const logger = require('./simple-logger')

const log = logger.log('ping')

function initPing(intervalTime = 10000) {
  const interval = setInterval(log, intervalTime)
  return () => clearInterval(interval)
}

module.exports = initPing
