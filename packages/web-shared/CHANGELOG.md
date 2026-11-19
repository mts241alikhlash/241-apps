# @mts241alikhlash/web-shared

## 0.2.1

### Patch Changes

- 6d04832: Service outage and timeout errors are recognised by `isOutageMessage` and reported once through the shared error handler, table columns accept `truncate` and a `title` callback, and the reference data form dialog uses the shared control text size.

## 0.2.0

### Minor Changes

- d587566: Token refresh now lives in a shared `auth-session` module so any transport can reuse the single in-flight refresh.
- d587566: Add a typed service client with shared auth and unwrap helpers.
