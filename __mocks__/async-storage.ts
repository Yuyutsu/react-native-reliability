// Mock for @react-native-async-storage/async-storage

const store: Record<string, string> = {};

const AsyncStorage = {
  getItem: jest.fn((key: string): Promise<string | null> => {
    return Promise.resolve(store[key] ?? null);
  }),
  setItem: jest.fn((key: string, value: string): Promise<void> => {
    store[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string): Promise<void> => {
    delete store[key];
    return Promise.resolve();
  }),
  /** Test helper — reset the in-memory store */
  _reset(): void {
    Object.keys(store).forEach((k) => delete store[k]);
  },
};

export default AsyncStorage;
