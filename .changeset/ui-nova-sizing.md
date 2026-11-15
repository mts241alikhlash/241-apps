---
'@mts241alikhlash/ui': minor
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

UI sizing moves from shadcn-vue `mira` to `nova`: controls are 24/28/32/36 px (28/36/40/44 px on phones) with 14 px control text and 16 px icons (15 px on phones), `--text-xs` is 13 px, radius follows the `nova` scale from `--radius: 0.625rem`, and the global sidebar is 17rem with truncating menu labels of at most 26 characters.
