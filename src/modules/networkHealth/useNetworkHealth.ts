import { useCallback, useEffect, useRef, useState } from 'react';
import type { NetworkHealth, NetworkStatus } from '../../types/reliabilityTypes';
import { useReliabilityConfig } from '../../core/reliabilityProvider';

// Lazily load optional peer dependency at runtime so the module does not
// throw when @react-native-community/netinfo is not installed.
function tryGetNetInfo(): {
  addEventListener: (
    handler: (state: { isConnected: boolean | null }) => void
  ) => () => void;
  fetch: () => Promise<{ isConnected: boolean | null }>;
} | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-community/netinfo').default as {
      addEventListener: (
        handler: (state: { isConnected: boolean | null }) => void
      ) => () => void;
      fetch: () => Promise<{ isConnected: boolean | null }>;
    };
  } catch {
    return null;
  }
}

const INITIAL_STATE: NetworkHealth = {
  status: 'healthy',
  isSlow: false,
  isOffline: false,
  isUnstable: false,
};

/**
 * Monitors network connectivity and quality, returning a structured
 * `NetworkHealth` object.
 *
 * Requires `@react-native-community/netinfo` to be installed.
 * Falls back to `healthy` status when the package is unavailable.
 *
 * @example
 * ```ts
 * const network = useNetworkHealth();
 * if (network.isOffline) { ... }
 * ```
 */
export function useNetworkHealth(): NetworkHealth {
  const config = useReliabilityConfig();
  const [health, setHealth] = useState<NetworkHealth>(INITIAL_STATE);

  const disconnectTimestamps = useRef<number[]>([]);
  const isMounted = useRef(true);

  const computeStatus = useCallback(
    (isConnected: boolean | null, isSlow: boolean): NetworkStatus => {
      if (!isConnected) return 'offline';
      if (isSlow) return 'slow';

      const now = Date.now();
      const recentDisconnects = disconnectTimestamps.current.filter(
        (t) => now - t < 60_000
      );
      disconnectTimestamps.current = recentDisconnects;

      if (recentDisconnects.length >= config.unstableNetworkThreshold) {
        return 'unstable';
      }
      return 'healthy';
    },
    [config.unstableNetworkThreshold]
  );

  const checkLatency = useCallback(async (): Promise<boolean> => {
    const start = Date.now();
    try {
      await fetch(config.networkCheckUrl, {
        method: 'HEAD',
        cache: 'no-store',
      });
      return Date.now() - start > config.slowNetworkThreshold;
    } catch {
      return false;
    }
  }, [config.networkCheckUrl, config.slowNetworkThreshold]);

  useEffect(() => {
    isMounted.current = true;
    const NetInfo = tryGetNetInfo();

    if (!NetInfo) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const handleConnectivityChange = async (state: {
      isConnected: boolean | null;
    }): Promise<void> => {
      if (!isMounted.current) return;

      const connected = state.isConnected ?? false;

      if (!connected) {
        disconnectTimestamps.current.push(Date.now());
      }

      let isSlow = false;
      if (connected) {
        isSlow = await checkLatency();
      }

      if (!isMounted.current) return;

      const status = computeStatus(connected, isSlow);
      setHealth({
        status,
        isSlow: status === 'slow',
        isOffline: status === 'offline',
        isUnstable: status === 'unstable',
      });
    };

    // Check initial state
    NetInfo.fetch()
      .then(handleConnectivityChange)
      .catch(() => {
        /* ignore */
      });

    unsubscribe = NetInfo.addEventListener((state) => {
      handleConnectivityChange(state).catch(() => {
        /* ignore */
      });
    });

    return () => {
      isMounted.current = false;
      unsubscribe?.();
    };
  }, [checkLatency, computeStatus]);

  return health;
}
