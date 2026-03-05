import React from 'react';
import renderer from 'react-test-renderer';
import { ReliabilityErrorBoundary } from '../modules/errorBoundary/ReliabilityErrorBoundary';

// Suppress React's error boundary console.error noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

function ThrowingComponent(): React.JSX.Element {
  throw new Error('Test render error');
}

function NormalComponent(): React.JSX.Element {
  return <React.Fragment>OK</React.Fragment>;
}

describe('ReliabilityErrorBoundary', () => {
  it('renders children when there is no error', () => {
    const tree = renderer.create(
      <ReliabilityErrorBoundary>
        <NormalComponent />
      </ReliabilityErrorBoundary>
    );
    expect(tree.toJSON()).not.toBeNull();
  });

  it('renders null fallback when children throw and no fallback is provided', () => {
    const tree = renderer.create(
      <ReliabilityErrorBoundary>
        <ThrowingComponent />
      </ReliabilityErrorBoundary>
    );
    expect(tree.toJSON()).toBeNull();
  });

  it('renders the provided fallback when children throw', () => {
    const tree = renderer.create(
      <ReliabilityErrorBoundary
        fallback={<React.Fragment>Fallback UI</React.Fragment>}
      >
        <ThrowingComponent />
      </ReliabilityErrorBoundary>
    );
    expect(tree.toJSON()).not.toBeNull();
  });

  it('calls onError with the thrown error and info', () => {
    const onError = jest.fn();
    renderer.create(
      <ReliabilityErrorBoundary onError={onError}>
        <ThrowingComponent />
      </ReliabilityErrorBoundary>
    );
    expect(onError).toHaveBeenCalledTimes(1);
    const [error, info] = onError.mock.calls[0] as [Error, React.ErrorInfo];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test render error');
    expect(info).toHaveProperty('componentStack');
  });

  it('does not crash when onError itself throws', () => {
    const badOnError = jest.fn(() => {
      throw new Error('handler error');
    });
    expect(() => {
      renderer.create(
        <ReliabilityErrorBoundary onError={badOnError}>
          <ThrowingComponent />
        </ReliabilityErrorBoundary>
      );
    }).not.toThrow();
  });

  it('captures the component stack in info', () => {
    const onError = jest.fn();
    renderer.create(
      <ReliabilityErrorBoundary onError={onError}>
        <ThrowingComponent />
      </ReliabilityErrorBoundary>
    );
    const [, info] = onError.mock.calls[0] as [Error, React.ErrorInfo];
    expect(typeof info.componentStack).toBe('string');
    expect(info.componentStack.length).toBeGreaterThan(0);
  });
});
