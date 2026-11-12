import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_POLICIES,
  parsePolicy,
} from '../../../../exam-activity/domain/policies/exam-policy.policy.js'

const MIGRATION_PATH = join(
  process.cwd(),
  'prisma',
  'migrations',
  '20261113000000_remove_proctor_camera',
  'migration.sql',
)

describe('remove proctor camera migration SQL', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8')

  it('drops the snapshot table, its enum and the camera columns', () => {
    expect(sql).toContain('DROP TABLE "exam_proctor_snapshots";')
    expect(sql).toContain('DROP TYPE "SnapshotKind";')
    expect(sql).toContain('DROP COLUMN "last_snapshot_at"')
    expect(sql).toContain('DROP COLUMN "snapshot_count"')
    expect(sql).toContain('DROP COLUMN "camera_blocked"')
  })

  it('strips snapshotIntervalMs from every stored policy', () => {
    for (const table of [
      'exam_policy_presets',
      'exam_activities',
      'exam_sessions',
    ]) {
      expect(sql).toContain(
        `UPDATE "${table}" SET "policy" = "policy" - 'snapshotIntervalMs'`,
      )
    }
  })

  it('reads a stored policy that no longer carries the camera interval', () => {
    const stored = JSON.parse(
      JSON.stringify(DEFAULT_POLICIES.MIDTERM),
    ) as unknown
    expect(parsePolicy(stored)).toEqual(DEFAULT_POLICIES.MIDTERM)
  })
})
