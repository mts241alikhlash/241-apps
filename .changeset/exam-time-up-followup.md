---
'exam-service': patch
'@mts241alikhlash/exam-api': patch
'exam-web': patch
---

The session heartbeat returns the session deadline, and the student exam follows it, so a staff time extension moves the time-up lock. The time-up dialog keeps sending after a failed manual submit, finishes when the paper load answers `SESSION_LOST`, stops retrying on a lock or token gate, and closes before it leaves for the quit URL.
