import { renderHook, act, waitFor } from '@testing-library/react';
import { useCrashRecovery } from '../modules/crashRecovery/useCrashRecovery';

// Access the AsyncStorage mock
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AsyncStorage = require('@react-native-async-storage/async-storage')
  .default as {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
  _reset: () => void;
};

describe('useCrashRecovery', () => {
  beforeEach(() => {
    AsyncStorage._reset();
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
    AsyncStorage.removeItem.mockClear();
  });

  it('reports no recent crash when storage is empty', async () => {
    const { result } = renderHook(() => useCrashRecovery());

    await waitFor(() => {
      expect(result.current.crashCount).toBe(0);
    });

    expect(result.current.hasRecentCrash).toBe(false);
  });

  it('records a crash and reflects updated state', async () => {
    const { result } = renderHook(() => useCrashRecovery());

    await waitFor(() => {
      expect(result.current.crashCount).toBe(0);
    });

    await act(async () => {
      await result.current.recordCrash(new Error('test crash'));
    });

    expect(result.current.crashCount).toBe(1);
    // Default threshold is 2, so one crash is not yet hasRecentCrash
    expect(result.current.hasRecentCrash).toBe(false);
  });

  it('sets hasRecentCrash to true when crash threshold is reached', async () => {
    const { result } = renderHook(() => useCrashRecovery());

    await waitFor(() => {
      expect(result.current.crashCount).toBe(0);
    });

    await act(async () => {
      await result.current.recordCrash();
    });
    await act(async () => {
      await result.current.recordCrash();
    });

    expect(result.current.crashCount).toBe(2);
    expect(result.current.hasRecentCrash).toBe(true);
  });

  it('clears crash history', async () => {
    const { result } = renderHook(() => useCrashRecovery());

    await act(async () => {
      await result.current.recordCrash();
      await result.current.recordCrash();
    });

    expect(result.current.hasRecentCrash).toBe(true);

    await act(async () => {
      await result.current.clearCrashHistory();
    });

    expect(result.current.crashCount).toBe(0);
    expect(result.current.hasRecentCrash).toBe(false);
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
  });

  it('persists crashes to AsyncStorage', async () => {
    const { result } = renderHook(() => useCrashRecovery());

    await waitFor(() => {
      expect(result.current.crashCount).toBe(0);
    });

    await act(async () => {
      await result.current.recordCrash();
    });

    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('reads pre-existing crashes from AsyncStorage on mount', async () => {
    // Pre-populate storage with 2 recent timestamps
    const now = Date.now();
    const raw = JSON.stringify([now - 1000, now - 2000]);
    AsyncStorage.getItem.mockResolvedValueOnce(raw);

    const { result } = renderHook(() => useCrashRecovery());

    await waitFor(() => {
      expect(result.current.crashCount).toBe(2);
    });

    expect(result.current.hasRecentCrash).toBe(true);
  });

  it('ignores crashes outside the crash window', async () => {
    // Timestamps older than the default 60s window
    const old = Date.now() - 120_000;
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([old, old]));

    const { result } = renderHook(() => useCrashRecovery());

    await waitFor(() => {
      expect(result.current.crashCount).toBe(0);
    });

    expect(result.current.hasRecentCrash).toBe(false);
  });
});
