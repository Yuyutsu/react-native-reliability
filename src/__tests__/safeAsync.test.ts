import { safeAsync, TimeoutError } from '../modules/safeAsync/safeAsync';

describe('safeAsync', () => {
  it('resolves with the value returned by the async function', async () => {
    const result = await safeAsync(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('rejects when the async function rejects', async () => {
    await expect(
      safeAsync(() => Promise.reject(new Error('fetch failed')))
    ).rejects.toThrow('fetch failed');
  });

  it('calls onError when the async function rejects', async () => {
    const onError = jest.fn();
    await safeAsync(() => Promise.reject(new Error('oops')), {
      onError,
    }).catch(() => {
      /* expected */
    });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('rejects with TimeoutError when the function exceeds the timeout', async () => {
    jest.useFakeTimers();

    const slowFn = (): Promise<never> =>
      new Promise<never>(() => {
        /* never resolves */
      });

    const promise = safeAsync(slowFn, { timeout: 1000 });

    jest.advanceTimersByTime(1001);

    await expect(promise).rejects.toBeInstanceOf(TimeoutError);

    jest.useRealTimers();
  });

  it('does not call onError when the function resolves before timeout', async () => {
    const onError = jest.fn();
    await safeAsync(() => Promise.resolve('ok'), { timeout: 5000, onError });
    expect(onError).not.toHaveBeenCalled();
  });

  it('handles synchronous throws inside the async function', async () => {
    const onError = jest.fn();
    const syncThrower = (): Promise<never> => {
      throw new Error('sync error');
    };
    await expect(safeAsync(syncThrower, { onError })).rejects.toThrow(
      'sync error'
    );
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('does not crash when onError itself throws', async () => {
    const badOnError = jest.fn(() => {
      throw new Error('handler failure');
    });
    await expect(
      safeAsync(() => Promise.reject(new Error('inner')), {
        onError: badOnError,
      })
    ).rejects.toThrow('inner');
    // badOnError was called but its throw was swallowed
    expect(badOnError).toHaveBeenCalled();
  });

  it('TimeoutError has the correct name', async () => {
    jest.useFakeTimers();
    const promise = safeAsync(() => new Promise<never>(() => {}), {
      timeout: 500,
    });
    jest.advanceTimersByTime(501);
    try {
      await promise;
    } catch (e) {
      expect(e).toBeInstanceOf(TimeoutError);
      expect((e as TimeoutError).name).toBe('TimeoutError');
    }
    jest.useRealTimers();
  });
});
