import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type { AppLifecycle, LifecycleState } from '../../types/reliabilityTypes';

function toLifecycleState(appStateStatus: AppStateStatus): LifecycleState {
  switch (appStateStatus) {
    case 'active':
      return 'active';
    case 'background':
      return 'background';
    default:
      // covers 'inactive', 'unknown', 'extension' etc.
      return 'inactive';
  }
}

/**
 * Tracks the React Native application lifecycle state.
 *
 * @example
 * ```ts
 * const lifecycle = useAppLifecycle();
 *
 * useEffect(() => {
 *   if (lifecycle.state === 'background') stopPolling();
 *   if (lifecycle.state === 'active') startPolling();
 * }, [lifecycle.state]);
 * ```
 */
export function useAppLifecycle(): AppLifecycle {
  const [state, setState] = useState<LifecycleState>(
    toLifecycleState(AppState.currentState)
  );
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (isMounted.current) {
          setState(toLifecycleState(nextState));
        }
      }
    );

    return () => {
      isMounted.current = false;
      subscription.remove();
    };
  }, []);

  return { state };
}
