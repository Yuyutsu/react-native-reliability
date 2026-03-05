// Mock for @react-native-community/netinfo

type NetInfoChangeHandler = (state: { isConnected: boolean | null }) => void;

const handlers: NetInfoChangeHandler[] = [];

const NetInfo = {
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  addEventListener: jest.fn((handler: NetInfoChangeHandler) => {
    handlers.push(handler);
    return () => {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
    };
  }),
  /** Test helper — trigger a connectivity change */
  _simulateChange(state: { isConnected: boolean | null }): void {
    handlers.forEach((h) => h(state));
  },
};

export default NetInfo;
