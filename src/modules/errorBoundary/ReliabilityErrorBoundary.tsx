import React from 'react';
import type { ErrorBoundaryProps } from '../../types/reliabilityTypes';

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches React render errors in the component tree below, displays a
 * configurable fallback UI and invokes an optional logging callback.
 *
 * @example
 * ```tsx
 * <ReliabilityErrorBoundary
 *   onError={(error, info) => logError(error, info)}
 *   fallback={<Text>Something went wrong</Text>}
 * >
 *   <App />
 * </ReliabilityErrorBoundary>
 * ```
 */
export class ReliabilityErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  State
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    try {
      this.props.onError?.(error, info);
    } catch {
      // Never let the error handler itself crash the boundary
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      return null;
    }
    return this.props.children;
  }
}
