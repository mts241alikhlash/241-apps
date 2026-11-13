# @mts241alikhlash/web-shared

## 0.2.0

### Minor Changes

- d587566: Token refresh now lives in a shared `auth-session` module so any transport can reuse the single in-flight refresh.
- d587566: Add a typed service client with shared auth and unwrap helpers.
