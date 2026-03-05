import type { SafeAsyncOptions } from '../../types/reliabilityTypes';

const DEFAULT_TIMEOUT = 10_000; // 10 seconds

/**
 * Wraps an async function so that:
 * - Unhandled rejections are caught and forwarded to `options.onError`
 * - The promise is rejected with a `TimeoutError` if it exceeds `options.timeout`
 *
 * The returned promise always either resolves or rejects — it never silently
 * swallows errors.
 *
 * @example
 * ```ts
 * safeAsync(() => fetchUser(id), { timeout: 5000, onError: console.error })
 *   .then(handleUser)
 *   .catch(handleError);
 * ```
 */
export function safeAsync<T>(
  fn: () => Promise<T>,
  options: SafeAsyncOptions = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, onError } = options;

  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      reject(new TimeoutError(`safeAsync timed out after ${timeout}ms`));
    }, timeout);

    // Allow Node.js/RN to exit if this is the only thing keeping it alive
    if (typeof id === 'object' && 'unref' in id) {
      (id as { unref(): void }).unref();
    }
  });

  let result: Promise<T>;
  try {
    result = fn();
  } catch (syncError) {
    const error =
      syncError instanceof Error ? syncError : new Error(String(syncError));
    try {
      onError?.(error);
    } catch {
      /* never let the error handler crash */
    }
    return Promise.reject(error);
  }

  return Promise.race([result, timeoutPromise]).catch((error: unknown) => {
    const err = error instanceof Error ? error : new Error(String(error));
    try {
      onError?.(err);
    } catch {
      /* never let the error handler crash */
    }
    return Promise.reject(err);
  });
}

/** Thrown when a `safeAsync` call exceeds its configured timeout. */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}
