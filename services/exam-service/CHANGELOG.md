# exam-service

## 0.1.3

### Patch Changes

- 95c9a83: Give the exam time back when a phone call interrupts a sitting: the app reports the pause, the session deadline and finalize time shift by the paused minutes inside the existing 180 minute allowance, and the pause shows up in the session event history as CALL_SUSPENDED.
- 7d8fbab: Report the device readiness of a sitting — whether Do Not Disturb is granted, whether screen pinning is active, and whether battery optimization is off for the app — and warn on the room monitor when one of them is missing.

## 0.1.2

### Patch Changes

- be376d1: Accept a 1 MB proctoring snapshot instead of 50 KB, and key throttling by signed-in user so a room behind one address is not blocked.
- 552a5cf: Throttle by signed-in user instead of by address, so a room of tablets behind one NAT does not share a single bucket.

## 0.1.1

### Patch Changes

- ba5a860: Let the OpenAPI emit script run without a dev env file.
- ae2f596: Bound the monitor fallback window by the school day.
- Updated dependencies [a6602e2]
  - @mts241alikhlash/nest-core@0.1.1
