---
'identity-service': patch
'academic-web': patch
'account-web': patch
'admin-web': patch
'assessment-web': patch
'exam-web': patch
'hr-web': patch
'inventory-web': patch
'portal-web': patch
---

The identity catalog now has `exam-schedules.manage`, which exam-service and exam-web already checked, so the Kegiatan menu and pages open for the roles that schedule exams. The admin-web school unit type menu checks `school-units.read`, the permission its endpoints use. Every web app opens in Indonesian whatever the browser language, as admission-web already did.
