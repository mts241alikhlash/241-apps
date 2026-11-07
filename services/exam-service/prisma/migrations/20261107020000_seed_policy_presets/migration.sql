INSERT INTO "exam_policy_presets" ("id", "name", "policy", "is_default", "created_at", "updated_at")
VALUES
  (
    gen_random_uuid(),
    'UJIAN_KETAT',
    '{"violationLimit":3,"focusThresholdMs":10000,"snapshotIntervalMs":15000,"heartbeatIntervalMs":15000,"gapRecordedMs":60000,"gapTokenMs":300000,"gapViolationFrom":2,"tokenSlotSeconds":600}'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'ULANGAN_KELAS',
    '{"violationLimit":3,"focusThresholdMs":10000,"snapshotIntervalMs":15000,"heartbeatIntervalMs":15000,"gapRecordedMs":60000,"gapTokenMs":300000,"gapViolationFrom":2,"tokenSlotSeconds":600}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'TUGAS',
    '{"violationLimit":3,"focusThresholdMs":10000,"snapshotIntervalMs":30000,"heartbeatIntervalMs":15000,"gapRecordedMs":300000,"gapTokenMs":1800000,"gapViolationFrom":3,"tokenSlotSeconds":600}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("name") DO NOTHING;