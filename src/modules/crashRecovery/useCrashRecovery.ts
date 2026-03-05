import { useCallback, useEffect, useRef, useState } from 'react';
import type { CrashRecoveryState } from '../../types/reliabilityTypes';
import { useReliabilityConfig } from '../../core/reliabilityProvider';

const CRASH_STORAGE_KEY = '@react-native-reliability/crashes';

// Lazily load optional peer dependency at runtime.
function tryGetAsyncStorage(): {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
} | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-async-storage/async-storage').default as {
      getItem(key: string): Promise<string | null>;
      setItem(key: string, value: string): Promise<void>;
      removeItem(key: string): Promise<void>;
    };
  } catch {
    return null;
  }
}

/**
 * Detects crash loops and provides recovery utilities.
 *
 * On each mount it reads persisted crash timestamps (via AsyncStorage) and
 * checks how many occurred within the configured `crashWindow`.  Crashes are
 * recorded by calling `recordCrash()` — typically wired to the
 * `ReliabilityErrorBoundary` `onError` callback.
 *
 * Falls back to in-memory storage when
 * `@react-native-async-storage/async-storage` is not installed (no
 * persistence across app restarts in that case).
 *
 * @example
 * ```tsx
 * const crash = useCrashRecovery();
 *
 * if (crash.hasRecentCrash) {
 *   return <SafeScreen />;
 * }
 * ```
 */
export function useCrashRecovery(): CrashRecoveryState {
  const config = useReliabilityConfig();
  const [crashCount, setCrashCount] = useState(0);
  const [hasRecentCrash, setHasRecentCrash] = useState(false);

  // In-memory fallback when AsyncStorage is unavailable
  const inMemoryCrashes = useRef<number[]>([]);

  const loadCrashes = useCallback(async (): Promise<number[]> => {
    const AsyncStorage = tryGetAsyncStorage();
    if (!AsyncStorage) {
      return inMemoryCrashes.current;
    }
    try {
      const raw = await AsyncStorage.getItem(CRASH_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as number[];
    } catch {
      return [];
    }
  }, []);

  const saveCrashes = useCallback(async (timestamps: number[]): Promise<void> => {
    const AsyncStorage = tryGetAsyncStorage();
    inMemoryCrashes.current = timestamps;
    if (!AsyncStorage) return;
    try {
      await AsyncStorage.setItem(CRASH_STORAGE_KEY, JSON.stringify(timestamps));
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    const all = await loadCrashes();
    const now = Date.now();
    const recent = all.filter((t) => now - t < config.crashWindow);
    await saveCrashes(recent);
    setCrashCount(recent.length);
    setHasRecentCrash(recent.length >= config.crashThreshold);
  }, [config.crashThreshold, config.crashWindow, loadCrashes, saveCrashes]);

  useEffect(() => {
    refresh().catch(() => {
      /* ignore */
    });
  }, [refresh]);

  const recordCrash = useCallback(async (_error?: Error): Promise<void> => {
    const all = await loadCrashes();
    const now = Date.now();
    const updated = [...all.filter((t) => now - t < config.crashWindow), now];
    await saveCrashes(updated);
    setCrashCount(updated.length);
    setHasRecentCrash(updated.length >= config.crashThreshold);
  }, [config.crashThreshold, config.crashWindow, loadCrashes, saveCrashes]);

  const clearCrashHistory = useCallback(async (): Promise<void> => {
    const AsyncStorage = tryGetAsyncStorage();
    inMemoryCrashes.current = [];
    if (AsyncStorage) {
      try {
        await AsyncStorage.removeItem(CRASH_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    setCrashCount(0);
    setHasRecentCrash(false);
  }, []);

  return { hasRecentCrash, crashCount, clearCrashHistory, recordCrash };
}
