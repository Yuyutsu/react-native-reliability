import React, { createContext, useContext } from 'react';
import type { ReliabilityConfig, ReliabilityContextValue } from '../types/reliabilityTypes';

const DEFAULT_CONFIG: Required<ReliabilityConfig> = {
  crashWindow: 60_000,
  crashThreshold: 2,
  networkCheckUrl: 'https://www.google.com',
  slowNetworkThreshold: 2000,
  unstableNetworkThreshold: 3,
};

const ReliabilityContext = createContext<ReliabilityContextValue>({
  config: DEFAULT_CONFIG,
});

export interface ReliabilityProviderProps {
  children: React.ReactNode;
  config?: ReliabilityConfig;
}

/**
 * Wrap your application in `ReliabilityProvider` to provide shared
 * configuration to all reliability hooks. Each hook also works standalone
 * with sensible defaults — the provider is entirely optional.
 */
export function ReliabilityProvider({
  children,
  config,
}: ReliabilityProviderProps): React.JSX.Element {
  const value: ReliabilityContextValue = {
    config: { ...DEFAULT_CONFIG, ...config },
  };

  return (
    <ReliabilityContext.Provider value={value}>
      {children}
    </ReliabilityContext.Provider>
  );
}

/** Access the merged reliability configuration from context. */
export function useReliabilityConfig(): Required<ReliabilityConfig> {
  return useContext(ReliabilityContext).config;
}
