---
'@mts241alikhlash/ui': patch
'academic-web': patch
'account-web': patch
'admin-web': patch
'admission-web': patch
'assessment-web': patch
'exam-web': patch
'hr-web': patch
'inventory-web': patch
'portal-web': patch
---

Every web app declares a light colour scheme (meta tag and `color-scheme: light` on `:root`), so a phone in dark mode no longer darkens form controls and scrollbars; dark mode is left for a later phase. The admission landing drops its template comments.
