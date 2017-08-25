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
  const nextLoop = loop.bind(null, workerInstance)

  if (workerInstance.processingWorker instanceof Promise) {
    return workerInstance.processingWorker.then(nextLoop)
  }

  processMessage(workerInstance)
  setTimeout(nextLoop, 100)
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
  }

  const workerQueue = {
    /**
     * @param {object} message Message to be processed.
     *                         Object define a property of type function `processor`.
     *                         The `processor` will be called with the full `message` object.
     *
     * @return {Promise}       Promise which is resolved when the message is processed.
     */
    addMessage(message, label = '') {
      if (typeof message.processor !== 'function') {
        throw TypeError('addMessage argument message.processor must be a function')
      }
      return new Promise((resolve, reject) => workerInstance.queue.push({
        label,
        message,
        onMessageProcessed: resolve,
        onMessageCanceled: reject,
      }))
    },

    /**
     * Cancel all queued jobs.
     */
    cancelAllPending(cancelLabel = '') {
      // Find messages where the label is matching the `cancelLabel` and call its `onMessageCanceled` callback.
      workerInstance.queue.forEach(({label, onMessageCanceled}) => {
        if (label === cancelLabel) {
          onMessageCanceled()
        }
      })
      // Remove all queue items where the label is matching `cancelLabel`.
      workerInstance.queue = workerInstance.queue.filter(({label}) => label !== cancelLabel)
    },
  }

  loop(workerInstance)

  return workerQueue
}

module.exports = startWorkerQueue
