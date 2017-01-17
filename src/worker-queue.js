/* eslint-disable no-param-reassign */

function processMessage(workerInstance) {
  if (workerInstance.processingWorker !== null ||
      workerInstance.queue.length === 0) {
    return
  }

  const {message, onMessageProcessed} = workerInstance.queue.shift()
  const processorPromise = new Promise(resolve => resolve(message.processor(message)))
  const processingWorker = processorPromise.then(() => {
    // reset processingWorker state
    workerInstance.processingWorker = null
    onMessageProcessed()
  })
  workerInstance.processingWorker = processingWorker
}

function loop(workerInstance) {
  if (workerInstance.shouldStop) {
    return
  }

  const nextLoop = loop.bind(null, workerInstance)

  if (workerInstance.processingWorker instanceof Promise) {
    return workerInstance.processingWorker.then(nextLoop)
  }

  processMessage(workerInstance)
  setImmediate(nextLoop)
}

/**
 * Initialize and start a worker queue.
 *
 * @return {object} Instance of worker, exposing addMessage and stop functions.
 */
function startWorkerQueue() {
  const workerInstance = {
    queue: [],
    processingWorker: null,
    shouldStop: false,
  }

  const workerQueue = {
    /**
     * @param {object} message Message to be processed.
     *                         Object define a property of type function `processor`.
     *                         The `processor` will be called with the full `message` object.
     *
     * @return {Promise}       Promise which is resolved when the message is processed.
     */
    addMessage(message) {
      if (typeof message.processor !== 'function') {
        throw TypeError('addMessage argument message.processor must be a function')
      }
      return new Promise(resolve => workerInstance.queue.push({message, onMessageProcessed: resolve}))
    },

    /**
     * Stop the worker loop.
     */
    stop() {
      workerInstance.shouldStop = true
    }
  }

  loop(workerInstance)

  return workerQueue
}

module.exports = startWorkerQueue
