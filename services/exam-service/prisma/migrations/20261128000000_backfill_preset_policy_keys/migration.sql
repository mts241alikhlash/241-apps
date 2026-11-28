UPDATE "exam_policy_presets"
SET "policy" = ('{"violationLimit":3,"focusThresholdMs":10000,"heartbeatIntervalMs":15000,"gapRecordedMs":60000,"gapTokenMs":300000,"gapViolationFrom":2,"tokenSlotSeconds":600,"lateToleranceMinutes":15,"minSubmitMinutes":0,"autoOpenLeadMinutes":5,"autoCloseGraceMinutes":15,"shuffleQuestions":true,"shuffleChoices":true,"allowWeb":true}'::jsonb || "policy") - 'snapshotIntervalMs'
WHERE "name" = 'DAILY';

UPDATE "exam_policy_presets"
SET "policy" = ('{"violationLimit":3,"focusThresholdMs":10000,"heartbeatIntervalMs":15000,"gapRecordedMs":300000,"gapTokenMs":1800000,"gapViolationFrom":3,"tokenSlotSeconds":600,"lateToleranceMinutes":15,"minSubmitMinutes":0,"autoOpenLeadMinutes":5,"autoCloseGraceMinutes":15,"shuffleQuestions":true,"shuffleChoices":true,"allowWeb":true}'::jsonb || "policy") - 'snapshotIntervalMs'
WHERE "name" = 'ASSIGNMENT';

UPDATE "exam_policy_presets"
SET "policy" = ('{"violationLimit":3,"focusThresholdMs":10000,"heartbeatIntervalMs":15000,"gapRecordedMs":60000,"gapTokenMs":300000,"gapViolationFrom":2,"tokenSlotSeconds":600,"lateToleranceMinutes":15,"minSubmitMinutes":0,"autoOpenLeadMinutes":5,"autoCloseGraceMinutes":15,"shuffleQuestions":true,"shuffleChoices":true,"allowWeb":true}'::jsonb || "policy") - 'snapshotIntervalMs'
WHERE "name" = 'MIDTERM';

UPDATE "exam_policy_presets"
SET "policy" = ('{"violationLimit":3,"focusThresholdMs":10000,"heartbeatIntervalMs":15000,"gapRecordedMs":60000,"gapTokenMs":300000,"gapViolationFrom":2,"tokenSlotSeconds":600,"lateToleranceMinutes":15,"minSubmitMinutes":0,"autoOpenLeadMinutes":5,"autoCloseGraceMinutes":15,"shuffleQuestions":true,"shuffleChoices":true,"allowWeb":true}'::jsonb || "policy") - 'snapshotIntervalMs'
WHERE "name" = 'FINAL';
