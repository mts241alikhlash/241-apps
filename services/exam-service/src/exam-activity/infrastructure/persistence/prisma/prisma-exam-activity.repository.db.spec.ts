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

  it('keeps one regular schedule per classroom under concurrent calls', async () => {
    const activity = await newActivity('ONLINE')
    const [a, b] = [id(), id()]
    const pkg = await prisma.examPackage.create({
      data: {
        title: 'db spec race',
        subjectId: id(),
        gradeId: id(),
        status: 'APPROVED',
        createdById: actorId,
      },
    })
    packageIds.push(pkg.id)
    const call = (classroomIds: string[]) =>
      repo.assignClassrooms({ activityId: activity.id, classroomIds, actorId })

    await Promise.all(Array.from({ length: 8 }, () => call([a, b])))
    await Promise.all([
      call([a, b]),
      repo.attachPackage({
        activityId: activity.id,
        packageId: pkg.id,
        classroomIds: [a, b],
        actorId,
      }),
    ])

    const rows = await prisma.examSchedule.findMany({
      where: { activityId: activity.id, kind: 'REGULAR' },
    })
    expect(rows.map((row) => row.classroomId).sort()).toEqual([a, b].sort())
  })

  it('changes status once under compare-and-set and audits only that change', async () => {
    const activity = await newActivity('ONLINE')
    await prisma.examActivity.update({
      where: { id: activity.id },
      data: { status: 'SCHEDULED' },
    })
    const system = '00000000-0000-0000-0000-000000000000'

    const results = await Promise.all([
      repo.updateStatusIf(
        activity.id,
        'SCHEDULED',
        'ACTIVE',
        system,
        'AUTO_OPEN',
      ),
      repo.updateStatusIf(
        activity.id,
        'SCHEDULED',
        'ACTIVE',
        system,
        'AUTO_OPEN',
      ),
    ])
    const stale = await repo.updateStatusIf(
      activity.id,
      'SCHEDULED',
      'ACTIVE',
      system,
      'AUTO_OPEN',
    )

    expect(results.filter(Boolean)).toHaveLength(1)
    expect(stale).toBe(false)
    expect(
      (await prisma.examActivity.findUnique({ where: { id: activity.id } }))
        ?.status,
    ).toBe('ACTIVE')
    const logs = await prisma.examActivityAuditLog.findMany({
      where: { activityId: activity.id, action: 'AUTO_STATUS' },
    })
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      actorId: system,
      before: { status: 'SCHEDULED' },
      after: { status: 'ACTIVE', reason: 'AUTO_OPEN' },
    })
  })

  it('finds only auto scheduled-soon and active-ended activities as due', async () => {
    const now = new Date('2026-11-10T02:00:00Z')
    const scheduled = await newActivity('ONLINE')
    const active = await newActivity('ONLINE')
    const manual = await newActivity('ONLINE')
    const draft = await newActivity('ONLINE')
    await prisma.examActivity.update({
      where: { id: scheduled.id },
      data: { status: 'SCHEDULED' },
    })
    await prisma.examActivity.update({
      where: { id: active.id },
      data: { status: 'ACTIVE', endsAt: new Date('2026-11-10T01:30:00Z') },
    })
    await prisma.examActivity.update({
      where: { id: manual.id },
      data: { status: 'SCHEDULED', autoStatus: false },
    })

    const due = (await repo.findDueForAdvance(now)).map((row) => row.id)

    expect(due).toContain(scheduled.id)
    expect(due).toContain(active.id)
    expect(due).not.toContain(manual.id)
    expect(due).not.toContain(draft.id)
  })
})
