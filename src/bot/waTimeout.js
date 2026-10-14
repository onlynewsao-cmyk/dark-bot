'use strict';

/** Races an operation against a timeout and always clears the timer. */
function withTimeoutCleanup(operation, timeoutMs, message = 'timeout') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), Math.max(1, Number(timeoutMs) || 1));
  });
  return Promise.race([Promise.resolve(operation), timeout]).finally(() => clearTimeout(timer));
}

module.exports = { withTimeoutCleanup };
