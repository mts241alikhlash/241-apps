import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ConfigService } from '@nestjs/config'
import { describe, expect, it } from 'vitest'
import type { Prisma } from '../../../../generated/prisma/client.js'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import { DEFAULT_POLICIES } from '../../../domain/policies/exam-policy.policy.js'

const MIGRATION_PATH = join(
  process.cwd(),
  'prisma',
  'migrations',
  '20261111000000_exam_type_taxonomy',
  'migration.sql',
)

describe('exam type taxonomy migration SQL', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8')

  it('maps UH and QUIZ to DAILY, UTS to MIDTERM, UAS to FINAL, and keeps ASSIGNMENT', () => {
    expect(sql).toContain("WHEN 'UH' THEN 'DAILY'::\"ExamType_new\"")
    expect(sql).toContain("WHEN 'QUIZ' THEN 'DAILY'::\"ExamType_new\"")
    expect(sql).toContain(
      "WHEN 'ASSIGNMENT' THEN 'ASSIGNMENT'::\"ExamType_new\"",
    )
    expect(sql).toContain("WHEN 'UTS' THEN 'MIDTERM'::\"ExamType_new\"")
    expect(sql).toContain("WHEN 'UAS' THEN 'FINAL'::\"ExamType_new\"")
  })

  it('replaces the three old presets with the four exam-type presets and drops is_default', () => {
    for (const preset of ['DAILY', 'ASSIGNMENT', 'MIDTERM', 'FINAL']) {
      expect(sql).toContain(`'${preset}'`)
    }
    expect(sql).toContain('WHERE p."name" = a."type"::text')
    expect(sql).toContain(
      "DELETE FROM \"exam_policy_presets\"\nWHERE \"name\" IN ('UJIAN_KETAT', 'ULANGAN_KELAS', 'TUGAS');",
    )
    expect(sql).toContain(
      'ALTER TABLE "exam_policy_presets" DROP COLUMN "is_default";',
    )
  })
})

const enabled = process.env.EXAM_DB_TESTS === '1'
const suite = enabled ? describe : describe.skip

suite('exam type taxonomy against a real database', () => {
  const prisma = new PrismaService({
    get: (key: string) => process.env[key],
  } as unknown as ConfigService)

  const id = () => randomUUID()
  const activityIds: string[] = []

  afterAll(async () => {
    if (activityIds.length > 0) {
      await prisma.examActivity.deleteMany({
        where: { id: { in: activityIds } },
      })
    }
    await prisma.$disconnect()
  })

  it('seeds the four type presets without is_default', async () => {
    const presets = await prisma.examPolicyPreset.findMany({
      orderBy: { name: 'asc' },
    })

    expect(presets.map((row) => row.name)).toEqual([
      'ASSIGNMENT',
      'DAILY',
      'FINAL',
      'MIDTERM',
    ])
    const byName = new Map(presets.map((row) => [row.name, row.policy]))
    expect(byName.get('MIDTERM')).toEqual(DEFAULT_POLICIES.MIDTERM)
    expect(byName.get('FINAL')).toEqual(DEFAULT_POLICIES.FINAL)
    expect(byName.get('DAILY')).toEqual(DEFAULT_POLICIES.DAILY)
    expect(byName.get('ASSIGNMENT')).toEqual(DEFAULT_POLICIES.ASSIGNMENT)

    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'exam_policy_presets' AND column_name = 'is_default'
    `
    expect(columns).toEqual([])
  })

  it('links each activity to the preset matching its type', async () => {
    const preset = await prisma.examPolicyPreset.findUniqueOrThrow({
      where: { name: 'MIDTERM' },
    })
    const created = await prisma.examActivity.create({
      data: {
        semesterId: id(),
        gradeId: id(),
        subjectId: id(),
        packageId: id(),
        type: 'MIDTERM',
        presetId: preset.id,
        policy: DEFAULT_POLICIES.MIDTERM as unknown as Prisma.InputJsonValue,
        startsAt: new Date('2026-11-10T01:00:00Z'),
        endsAt: new Date('2026-11-10T03:00:00Z'),
        durationMinutes: 90,
        createdById: id(),
      },
      include: { preset: true },
    })
    activityIds.push(created.id)

    expect(created.preset?.name).toBe(created.type)
  })
})
