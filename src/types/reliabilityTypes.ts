import React from 'react';

export type NetworkStatus = 'healthy' | 'slow' | 'unstable' | 'offline';
export type LifecycleState = 'active' | 'background' | 'inactive';

export interface NetworkHealth {
  status: NetworkStatus;
  isSlow: boolean;
  isOffline: boolean;
  isUnstable: boolean;
}

export interface AppLifecycle {
  state: LifecycleState;
}

export interface CrashRecoveryState {
  hasRecentCrash: boolean;
  crashCount: number;
  clearCrashHistory: () => Promise<void>;
  recordCrash: (error?: Error) => Promise<void>;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  fallback?: React.ReactNode;
}

export interface SafeAsyncOptions {
  timeout?: number;
  onError?: (error: Error) => void;
}

export interface ReliabilityConfig {
  /** Time window (ms) to count crashes within. Default: 60_000 (1 minute) */
  crashWindow?: number;
  /** Number of crashes in the window to flag hasRecentCrash. Default: 2 */
  crashThreshold?: number;
  /** URL used to measure network latency. Default: 'https://www.google.com' */
  networkCheckUrl?: string;
  /** Response time (ms) above which network is considered slow. Default: 2000 */
  slowNetworkThreshold?: number;
  /** Number of disconnects in networkCheckInterval to flag as unstable. Default: 3 */
  unstableNetworkThreshold?: number;
}

export interface ReliabilityContextValue {
  config: Required<ReliabilityConfig>;
}
