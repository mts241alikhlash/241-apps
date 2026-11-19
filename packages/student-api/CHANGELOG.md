# @mts241alikhlash/student-api

## 0.3.0

### Minor Changes

- 6d04832: The exam service serves the print pack of an exam event (`GET /exam-events/:id/print-pack`, optional `roomId`) with each room's seated students, supervisors and technician, and the student service answers bulk participant-number lookups (`POST /students/participant-numbers/lookup`).

## 0.2.0

### Minor Changes

- 474bda9: Carry the participant-number lookup and the admin issuance route in the generated client.
