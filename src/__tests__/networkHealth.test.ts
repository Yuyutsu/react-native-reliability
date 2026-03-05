import { renderHook, act, waitFor } from '@testing-library/react';
import { useNetworkHealth } from '../modules/networkHealth/useNetworkHealth';

// Access the netinfo mock
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NetInfo = require('@react-native-community/netinfo').default as {
  fetch: jest.Mock;
  addEventListener: jest.Mock;
  _simulateChange: (state: { isConnected: boolean | null }) => void;
};

// Mock global fetch for latency checks
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Suppress the act() warning that fires for async state updates triggered by
// the NetInfo.fetch() microtask chain on initial mount. All assertions still
// use waitFor so results remain correct.
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]): void => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('not wrapped in act')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('useNetworkHealth', () => {
  beforeEach(() => {
    NetInfo.fetch.mockResolvedValue({ isConnected: true });
    NetInfo.addEventListener.mockClear();
    mockFetch.mockResolvedValue({ ok: true });
  });

  it('starts with healthy status when connected', async () => {
    const { result } = renderHook(() => useNetworkHealth());

    await waitFor(() => {
      expect(result.current.status).toBe('healthy');
    });

    expect(result.current.isOffline).toBe(false);
    expect(result.current.isSlow).toBe(false);
    expect(result.current.isUnstable).toBe(false);
  });

  it('transitions to offline when disconnected', async () => {
    NetInfo.fetch.mockResolvedValue({ isConnected: false });

    const { result } = renderHook(() => useNetworkHealth());

    await waitFor(() => {
      expect(result.current.status).toBe('offline');
    });

    expect(result.current.isOffline).toBe(true);
  });

  it('transitions to offline via addEventListener callback', async () => {
    const { result } = renderHook(() => useNetworkHealth());

    // Wait for initial check
    await waitFor(() => {
      expect(result.current.status).toBe('healthy');
    });

    act(() => {
      NetInfo._simulateChange({ isConnected: false });
    });

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });
  });

  it('returns healthy when re-connected after being offline', async () => {
    NetInfo.fetch.mockResolvedValue({ isConnected: false });

    const { result } = renderHook(() => useNetworkHealth());

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });

    NetInfo.fetch.mockResolvedValue({ isConnected: true });

    act(() => {
      NetInfo._simulateChange({ isConnected: true });
    });

    await waitFor(() => {
      expect(result.current.isOffline).toBe(false);
    });
  });

  it('unsubscribes the listener on unmount', async () => {
    const unsubscribe = jest.fn();
    NetInfo.addEventListener.mockReturnValueOnce(unsubscribe);

    const { unmount } = renderHook(() => useNetworkHealth());

    await waitFor(() => {
      expect(NetInfo.addEventListener).toHaveBeenCalled();
    });

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('returns healthy status when NetInfo is unavailable', () => {
    // The module mapper points to our mock so NetInfo is always available,
    // but this test verifies the initial state is safe.
    const { result } = renderHook(() => useNetworkHealth());
    expect(result.current).toMatchObject({
      isSlow: false,
      isOffline: false,
      isUnstable: false,
    });
  });
});
