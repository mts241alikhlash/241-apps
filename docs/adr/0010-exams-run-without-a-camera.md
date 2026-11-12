# 0010: Exams run without a camera

## Context

The Android app had two flavors, `standard` and `proctor`. Releases shipped only `proctor`, so every student phone ran CameraX and uploaded photos on an interval set by `snapshotIntervalMs`. `exam-service` stored the photos in MinIO with a cleanup job, and `exam-web` showed a camera grid and a photo gallery. The school runs its exams with a room supervisor and does not use the photos, while the camera drained battery, heated cheap phones and used data.

## Decision

Camera proctoring is removed, not switched off. `exam-service` drops the snapshot and camera-blocked endpoints, the snapshot table and the camera columns of a session, and `snapshotIntervalMs` leaves every exam policy. `exam-web` drops the camera tab, the gallery and the photo interval inputs. The Android app (Istiqra) has one variant without CameraX or the camera permission. The code stays in git history if it is ever needed again.

## Consequences

- Supervision rests on the room supervisor, kiosk mode, recorded violations and the absence gap computed from `lastSeenAt` heartbeats.
- Stored photos are deleted from MinIO (`exam-proctor/`) at release, after a database backup; sessions and scores are untouched.
- An APK built before the removal sends requests the service no longer serves and expects a policy field it no longer sends, so the server and the new APK ship together.
