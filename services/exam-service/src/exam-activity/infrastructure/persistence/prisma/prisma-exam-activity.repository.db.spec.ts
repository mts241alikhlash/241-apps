import { randomUUID } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { describe, expect, it } from 'vitest'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import { DEFAULT_POLICIES } from '../../../domain/policies/exam-policy.policy.js'
import { PrismaExamActivityRepository } from './prisma-exam-activity.repository.js'

const enabled = process.env.EXAM_DB_TESTS === '1'
const suite = enabled ? describe : describe.skip

suite('PrismaExamActivityRepository against a real database', () => {
  const prisma = new PrismaService({
    get: (key: string) => process.env[key],
  } as unknown as ConfigService)
  const repo = new PrismaExamActivityRepository(prisma)
  const id = () => randomUUID()
  const activityIds: string[] = []
  const packageIds: string[] = []
  const actorId = id()

  afterAll(async () => {
    await prisma.examSchedule.deleteMany({
      where: { activityId: { in: activityIds } },
    })
    await prisma.examActivityAuditLog.deleteMany({
      where: { activityId: { in: activityIds } },
    })
    await prisma.examActivity.deleteMany({ where: { id: { in: activityIds } } })
    await prisma.examPackage.deleteMany({ where: { id: { in: packageIds } } })
    await prisma.$disconnect()
  })

  async function newActivity(deliveryMode: 'ONLINE' | 'OFFLINE') {
    const created = await repo.create({
      activity: {
        semesterId: id(),
        eventId: null,
        gradeId: id(),
        subjectId: id(),
        packageId: null,
        type: 'DAILY',
        tokenMode: 'STATIC',
        presetId: null,
        policy: { ...DEFAULT_POLICIES.DAILY },
        startsAt: new Date('2026-11-10T01:00:00Z'),
        endsAt: new Date('2026-11-10T03:00:00Z'),
        durationMinutes: 90,
        deliveryMode,
        offlineKind: deliveryMode === 'OFFLINE' ? 'WRITTEN' : null,
        createdById: actorId,
      },
      classroomIds: [],
      actorId,
    })
    activityIds.push(created.id)
    return created
  }

  it('assigns classrooms once, without a package, copying the delivery mode', async () => {
    const activity = await newActivity('OFFLINE')
    const [a, b] = [id(), id()]

    const first = await repo.assignClassrooms({
      activityId: activity.id,
      classroomIds: [a],
      actorId,
    })
    const second = await repo.assignClassrooms({
      activityId: activity.id,
      classroomIds: [a, b, b],
      actorId,
    })

    expect(first).toHaveLength(1)
    expect(second).toHaveLength(2)
    expect(second?.find((row) => row.classroomId === a)?.id).toBe(
      first?.[0]?.id,
    )
    expect(second?.every((row) => row.packageId === null)).toBe(true)
    expect(second?.every((row) => row.deliveryMode === 'OFFLINE')).toBe(true)
    expect(
      await prisma.examSchedule.count({ where: { activityId: activity.id } }),
    ).toBe(2)
    expect(
      await repo.assignClassrooms({
        activityId: id(),
        classroomIds: [a],
        actorId,
      }),
    ).toBeNull()
  })

  it('attaches a package to the existing schedules and creates only the missing one', async () => {
    const activity = await newActivity('ONLINE')
    const [a, b] = [id(), id()]
    await repo.assignClassrooms({
      activityId: activity.id,
      classroomIds: [a],
      actorId,
    })
    const pkg = await prisma.examPackage.create({
      data: {
        title: 'db spec',
        subjectId: id(),
        gradeId: id(),
        status: 'APPROVED',
        createdById: actorId,
      },
    })
    packageIds.push(pkg.id)

    await repo.attachPackage({
      activityId: activity.id,
      packageId: pkg.id,
      classroomIds: [a, b],
      actorId,
    })

    const rows = await prisma.examSchedule.findMany({
      where: { activityId: activity.id },
    })
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.packageId === pkg.id)).toBe(true)
  })
})
