---
'@mts241alikhlash/web-shared': minor
---

Token refresh now lives in a shared `auth-session` module so any transport can reuse the single in-flight refresh.
