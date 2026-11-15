---
'@mts241alikhlash/platform': minor
'identity-service': patch
'academic-web': patch
'account-web': patch
'admin-web': patch
'admission-web': patch
'assessment-web': patch
'exam-web': minor
'hr-web': patch
'inventory-web': patch
---

exam-web is presented as Istiqra: tab title, login, header, app switcher, exam sheet and favicon carry the Istiqra name and symbol, and the SSO launcher lists it as Istiqra. The auth config takes a logoSrc so an app can show its own logo while the school wordmark stays. Every app drops the leftover Vite favicon for the school logo.
