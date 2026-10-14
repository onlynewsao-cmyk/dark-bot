'use strict';

/**
 * Waits for an operation up to `ms`. If it expires, aborts the associated
 * request when an AbortController is supplied. The timer is always cleared
 * when the operation settles, avoiding one live timer per successful call.
 */
function withTimeout(operation, ms, controller = null) {
  const timeoutMs = Math.max(1, Number(ms) || 1);
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      fn(value);
    };

    timer = setTimeout(() => {
      try {
        if (controller && !controller.signal.aborted) controller.abort();
      } catch {}
      finish(reject, new Error('timeout'));
    }, timeoutMs);

    Promise.resolve(operation).then(
      value => finish(resolve, value),
      error => finish(reject, error)
    );
  });
}

module.exports = { withTimeout };
