import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  join(
    process.cwd(),
    'prisma',
    'migrations',
    '20261111000000_exam_type_taxonomy',
    'migration.sql',
  ),
  'utf8',
)

const eventsAlter = sql.slice(sql.indexOf('ALTER TABLE "exam_events"'))
const eventsStatement = eventsAlter.slice(0, eventsAlter.indexOf(';'))

describe('exam type taxonomy migration for exam_events', () => {
  it('stops before altering when a period is not UTS or UAS', () => {
    const guard = sql.indexOf('RAISE EXCEPTION')

    expect(guard).toBeGreaterThan(-1)
    expect(guard).toBeLessThan(sql.indexOf('ALTER TABLE "exam_events"'))
    expect(sql).toContain(
      'FROM "exam_events" WHERE "type"::text NOT IN (\'UTS\', \'UAS\')',
    )
  })

  it('maps only UTS and UAS for periods and never turns a period into a daily or assignment type', () => {
    expect(eventsStatement).toContain(
      "WHEN 'UTS' THEN 'MIDTERM'::\"ExamType_new\"",
    )
    expect(eventsStatement).toContain(
      "WHEN 'UAS' THEN 'FINAL'::\"ExamType_new\"",
    )
    expect(eventsStatement).not.toContain("'DAILY'")
    expect(eventsStatement).not.toContain("'ASSIGNMENT'")
    expect(eventsStatement).not.toContain('ELSE')
  })
})
