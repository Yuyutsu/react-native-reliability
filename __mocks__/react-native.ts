// Mock for react-native in Jest tests

type AppStateStatus = 'active' | 'background' | 'inactive';
type AppStateChangeHandler = (state: AppStateStatus) => void;

const listeners: AppStateChangeHandler[] = [];

export const AppState = {
  currentState: 'active' as AppStateStatus,
  addEventListener: jest.fn(
    (_event: string, handler: AppStateChangeHandler) => {
      listeners.push(handler);
      return {
        remove: jest.fn(() => {
          const idx = listeners.indexOf(handler);
          if (idx !== -1) listeners.splice(idx, 1);
        }),
      };
    }
  ),
  /** Test helper — simulate a state change */
  _simulateChange(nextState: AppStateStatus): void {
    AppState.currentState = nextState;
    listeners.forEach((h) => h(nextState));
  },
};

export default {
  AppState,
};
