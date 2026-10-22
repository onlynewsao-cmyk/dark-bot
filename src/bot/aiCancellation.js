'use strict';
/** Abort the actual request AND settle promptly even if a provider ignores its signal. */
function abortError() { const error = new Error('Operação cancelada'); error.name = 'AbortError'; return error; }
function isAbort(error) { return error?.name === 'AbortError'; }
function throwIfAborted(signal) { if (signal?.aborted) throw abortError(); }
function runAbortable(operation, { signal, timeoutMs = 0 } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const controller = new AbortController();
    let settled = false, timer;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      fn(value);
    };
    const onAbort = () => { controller.abort(); finish(reject, abortError()); };
    signal?.addEventListener('abort', onAbort, { once: true });
    if (timeoutMs > 0) timer = setTimeout(() => {
      controller.abort(); finish(reject, new Error('timeout'));
    }, Math.max(1, Number(timeoutMs) || 1));
    try {
      Promise.resolve(operation(controller.signal)).then(value => finish(resolve, value), error => finish(reject, error));
    } catch (error) { finish(reject, error); }
  });
}
module.exports = { abortError, isAbort, throwIfAborted, runAbortable };
