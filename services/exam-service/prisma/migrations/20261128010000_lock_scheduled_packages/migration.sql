UPDATE "exam_packages"
SET "status" = 'LOCKED', "locked_at" = COALESCE("locked_at", now())
WHERE "status" = 'APPROVED'
  AND "deleted_at" IS NULL
  AND "id" IN (SELECT "package_id" FROM "exam_schedules" WHERE "package_id" IS NOT NULL);
