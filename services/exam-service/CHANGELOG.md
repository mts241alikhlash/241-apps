# exam-service

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
