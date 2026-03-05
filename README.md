# react-native-reliability

A lightweight, production-ready toolkit that improves **stability and observability** in React Native apps.

---

## Why?

React Native apps fail silently in production for many common reasons:

| Problem | This toolkit |
|---|---|
| Unhandled async errors | `safeAsync` — wraps promises with timeout & error capture |
| Component render crashes | `ReliabilityErrorBoundary` — safe fallback UI + structured logging |
| Unstable network conditions | `useNetworkHealth` — detects offline / slow / unstable states |
| Silent promise rejections | `safeAsync` — global error callback |
| Background/foreground issues | `useAppLifecycle` — lifecycle state tracking |
| Crash loops | `useCrashRecovery` — detects repeated crashes on startup |

Works with **React Native CLI and Expo**. Every module is fully independent — adopt only what you need.

---

## Installation

```sh
# npm
npm install react-native-reliability

# yarn
yarn add react-native-reliability
```

### Optional peer dependencies

Install these only for the modules you use:

```sh
# useNetworkHealth
npm install @react-native-community/netinfo

# useCrashRecovery (persistent storage across restarts)
npm install @react-native-async-storage/async-storage
```

---

## Quick Start

```tsx
import { ReliabilityProvider } from 'react-native-reliability';

export default function App() {
  return (
    <ReliabilityProvider>
      <MyApp />
    </ReliabilityProvider>
  );
}
```

Individual hooks and components work **without the provider** using sensible defaults.

---

## Modules

### 1 — Error Boundary

Catches React render-tree crashes and renders a fallback UI.

```tsx
import { ReliabilityErrorBoundary } from 'react-native-reliability';

<ReliabilityErrorBoundary
  fallback={<Text>Something went wrong. Please restart the app.</Text>}
  onError={(error, info) => {
    // send to crash analytics, record crash, etc.
    logError(error, info.componentStack);
  }}
>
  <App />
</ReliabilityErrorBoundary>
```

**Props**

| Prop | Type | Description |
|---|---|---|
| `fallback` | `React.ReactNode` | UI shown when the tree crashes. Renders `null` if omitted. |
| `onError` | `(error: Error, info: React.ErrorInfo) => void` | Called when a render error is caught. |
| `children` | `React.ReactNode` | The component tree to protect. |

---

### 2 — Network Health Monitor

Detects degraded connectivity without constant polling.

```ts
import { useNetworkHealth } from 'react-native-reliability';

const network = useNetworkHealth();

switch (network.status) {
  case 'offline':   /* show offline banner */ break;
  case 'slow':      /* show slow-network warning */ break;
  case 'unstable':  /* retry with backoff */ break;
  case 'healthy':   /* proceed normally */ break;
}
```

**Requires** `@react-native-community/netinfo`. Returns `healthy` (no-op) without it.

**Returned object**

| Field | Type | Description |
|---|---|---|
| `status` | `'healthy' \| 'slow' \| 'unstable' \| 'offline'` | Overall network status |
| `isOffline` | `boolean` | No internet connection |
| `isSlow` | `boolean` | High latency detected |
| `isUnstable` | `boolean` | Frequent disconnect/reconnect |

---

### 3 — Safe Async Wrapper

Prevents unhandled promise rejections and adds timeout protection.

```ts
import { safeAsync } from 'react-native-reliability';

safeAsync(
  () => fetchUser(userId),
  {
    timeout: 5000,
    onError: (error) => logError(error),
  }
)
  .then(handleUser)
  .catch(handleFetchError);
```

**Options**

| Option | Type | Default | Description |
|---|---|---|---|
| `timeout` | `number` | `10000` | Milliseconds before a `TimeoutError` is thrown |
| `onError` | `(error: Error) => void` | — | Called for any error (including timeout) |

---

### 4 — App Lifecycle Monitor

Tracks application foreground / background / inactive state transitions.

```ts
import { useAppLifecycle } from 'react-native-reliability';

const lifecycle = useAppLifecycle();

useEffect(() => {
  if (lifecycle.state === 'background') {
    stopNetworkPolling();
    saveUserSession();
  }
  if (lifecycle.state === 'active') {
    resumeNetworkPolling();
  }
}, [lifecycle.state]);
```

**Returned object**

| Field | Type | Description |
|---|---|---|
| `state` | `'active' \| 'background' \| 'inactive'` | Current lifecycle state |

---

### 5 — Crash Recovery Helper

Detects repeated crash loops on startup and lets you recover gracefully.

```tsx
import { useCrashRecovery, ReliabilityErrorBoundary } from 'react-native-reliability';

function Root() {
  const crash = useCrashRecovery();

  if (crash.hasRecentCrash) {
    return (
      <SafeModeScreen
        crashCount={crash.crashCount}
        onReset={crash.clearCrashHistory}
      />
    );
  }

  return (
    <ReliabilityErrorBoundary onError={crash.recordCrash}>
      <App />
    </ReliabilityErrorBoundary>
  );
}
```

**Requires** `@react-native-async-storage/async-storage` for persistence across restarts.  
Falls back to in-memory storage (resets on every restart) when not installed.

**Returned object**

| Field | Type | Description |
|---|---|---|
| `hasRecentCrash` | `boolean` | `true` when crashes ≥ `crashThreshold` within `crashWindow` |
| `crashCount` | `number` | Number of crashes in the current window |
| `recordCrash` | `(error?: Error) => Promise<void>` | Record a crash event |
| `clearCrashHistory` | `() => Promise<void>` | Clear all stored crash data |

---

## Provider Configuration

Override defaults globally with `ReliabilityProvider`:

```tsx
<ReliabilityProvider
  config={{
    crashWindow: 120_000,          // 2 minute window (default: 60_000)
    crashThreshold: 3,             // crashes to trigger hasRecentCrash (default: 2)
    networkCheckUrl: 'https://api.myapp.com/health',
    slowNetworkThreshold: 3000,    // ms (default: 2000)
    unstableNetworkThreshold: 5,   // disconnects/min (default: 3)
  }}
>
  <App />
</ReliabilityProvider>
```

All hooks also accept these values from context automatically when wrapped in the provider.

---

## Full Production Example

```tsx
import React from 'react';
import {
  ReliabilityProvider,
  ReliabilityErrorBoundary,
  useNetworkHealth,
  useAppLifecycle,
  useCrashRecovery,
  safeAsync,
} from 'react-native-reliability';

function AppShell() {
  const network = useNetworkHealth();
  const lifecycle = useAppLifecycle();
  const crash = useCrashRecovery();

  // Show safe mode if crash loop detected
  if (crash.hasRecentCrash) {
    return <SafeModeScreen onReset={crash.clearCrashHistory} />;
  }

  return (
    <ReliabilityErrorBoundary
      onError={crash.recordCrash}
      fallback={<ErrorScreen />}
    >
      {network.isOffline && <OfflineBanner />}
      {lifecycle.state === 'active' && <MainApp />}
    </ReliabilityErrorBoundary>
  );
}

export default function App() {
  return (
    <ReliabilityProvider config={{ crashThreshold: 3 }}>
      <AppShell />
    </ReliabilityProvider>
  );
}
```

---

## Design Philosophy

**Stability, safety, and predictability** — not analytics dashboards.

- **Never crashes the host app** — all handlers are wrapped in try/catch
- **Minimal dependencies** — peer deps are optional; modules work independently
- **No polling** — event-driven where possible; ping on demand
- **Strict TypeScript** — no `any`, full type coverage
- **Works in dev and production** — same API, no build flags

---

## Architecture

```
src/
  core/
    reliabilityProvider.tsx     ← shared config context (optional)
  modules/
    errorBoundary/
      ReliabilityErrorBoundary.tsx
    networkHealth/
      useNetworkHealth.ts
    safeAsync/
      safeAsync.ts
    lifecycle/
      useAppLifecycle.ts
    crashRecovery/
      useCrashRecovery.ts
  hooks/
    useNetworkHealth.ts         ← re-exports
    useAppLifecycle.ts
  types/
    reliabilityTypes.ts
  index.ts
```

---

## License

MIT
