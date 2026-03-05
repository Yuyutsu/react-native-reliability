// Core provider
export {
  ReliabilityProvider,
  useReliabilityConfig,
} from './core/reliabilityProvider';

// Modules
export { ReliabilityErrorBoundary } from './modules/errorBoundary/ReliabilityErrorBoundary';
export { useNetworkHealth } from './modules/networkHealth/useNetworkHealth';
export { safeAsync, TimeoutError } from './modules/safeAsync/safeAsync';
export { useAppLifecycle } from './modules/lifecycle/useAppLifecycle';
export { useCrashRecovery } from './modules/crashRecovery/useCrashRecovery';

// Types
export type {
  NetworkStatus,
  NetworkHealth,
  LifecycleState,
  AppLifecycle,
  CrashRecoveryState,
  ErrorBoundaryProps,
  SafeAsyncOptions,
  ReliabilityConfig,
  ReliabilityContextValue,
} from './types/reliabilityTypes';
