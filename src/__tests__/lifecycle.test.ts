import { renderHook, act } from '@testing-library/react';
import { useAppLifecycle } from '../modules/lifecycle/useAppLifecycle';

// Access the react-native mock
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AppState } = require('react-native') as {
  AppState: {
    currentState: string;
    addEventListener: jest.Mock;
    _simulateChange: (state: string) => void;
  };
};

describe('useAppLifecycle', () => {
  beforeEach(() => {
    AppState.currentState = 'active';
    AppState.addEventListener.mockClear();
  });

  it('returns "active" as the initial state', () => {
    const { result } = renderHook(() => useAppLifecycle());
    expect(result.current.state).toBe('active');
  });

  it('returns "background" when AppState transitions to background', () => {
    const { result } = renderHook(() => useAppLifecycle());

    act(() => {
      AppState._simulateChange('background');
    });

    expect(result.current.state).toBe('background');
  });

  it('returns "inactive" for unknown states', () => {
    AppState.currentState = 'inactive';
    const { result } = renderHook(() => useAppLifecycle());

    expect(result.current.state).toBe('inactive');
  });

  it('transitions through multiple states correctly', () => {
    const { result } = renderHook(() => useAppLifecycle());

    act(() => {
      AppState._simulateChange('background');
    });
    expect(result.current.state).toBe('background');

    act(() => {
      AppState._simulateChange('active');
    });
    expect(result.current.state).toBe('active');
  });

  it('removes the event listener on unmount', () => {
    const removeMock = jest.fn();
    AppState.addEventListener.mockReturnValueOnce({ remove: removeMock });

    const { unmount } = renderHook(() => useAppLifecycle());
    unmount();

    expect(removeMock).toHaveBeenCalled();
  });
});
