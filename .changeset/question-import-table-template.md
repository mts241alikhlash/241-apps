---
'exam-service': minor
'exam-web': minor
'@mts241alikhlash/exam-api': minor
---

Question import uses one table template (version 2) for Word and Excel with the teacher's NIK, subject and grade in an identity table; a preview checks the file before saving and a save is all or nothing; exam-web shows the preview and the exam service can be previewed through POST /exam-imports/preview.
