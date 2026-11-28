import { randomUUID } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import { PrismaExamScheduleRepository } from './prisma-exam-schedule.repository.js'

const enabled = process.env.EXAM_DB_TESTS === '1'
const suite = enabled ? describe : describe.skip

suite('Delivery mode constraints against a real database', () => {
  const prisma = new PrismaService({
    get: (key: string) => process.env[key],
  } as unknown as ConfigService)

  const id = () => randomUUID()
  const userId = id()
  const NOW = new Date('2026-11-27T02:00:00.000Z')
  const packageIds: string[] = []
  const scheduleIds: string[] = []
  const activityIds: string[] = []
  const eventIds: string[] = []

  async function pkg() {
    const row = await prisma.examPackage.create({
      data: {
        title: 'Delivery DB',
        subjectId: id(),
        gradeId: id(),
        createdById: userId,
      },
    })
    packageIds.push(row.id)
    return row.id
  }

  async function schedule(
    deliveryMode: 'ONLINE' | 'OFFLINE',
    packageId: string | null,
  ) {
    const row = await prisma.examSchedule.create({
      data: {
        packageId,
        deliveryMode,
        classroomId: id(),
        semesterId: id(),
        startsAt: NOW,
        endsAt: NOW,
        durationMinutes: 90,
        createdById: userId,
      },
    })
    scheduleIds.push(row.id)
    return row
  }

  async function activity(
    deliveryMode: 'ONLINE' | 'OFFLINE',
    offlineKind: 'WRITTEN' | 'PRACTICAL' | null,
    packageId: string | null = null,
  ) {
    const row = await prisma.examActivity.create({
      data: {
        semesterId: id(),
        gradeId: id(),
        subjectId: id(),
        type: 'DAILY',
        policy: {},
        startsAt: NOW,
        endsAt: NOW,
        durationMinutes: 90,
        createdById: userId,
        deliveryMode,
        offlineKind,
        packageId,
      },
    })
    activityIds.push(row.id)
    return row
  }

  afterAll(async () => {
    await prisma.examOfflineResult.deleteMany({
      where: { scheduleId: { in: scheduleIds } },
    })
    await prisma.examSchedule.deleteMany({ where: { id: { in: scheduleIds } } })
    await prisma.examActivity.deleteMany({ where: { id: { in: activityIds } } })
    await prisma.examPackage.deleteMany({ where: { id: { in: packageIds } } })
    await prisma.examEvent.deleteMany({ where: { id: { in: eventIds } } })
    await prisma.$disconnect()
  })

  it('rejects an offline schedule that has a package', async () => {
    await expect(schedule('OFFLINE', await pkg())).rejects.toThrow(
      /exam_schedules_offline_without_package_check/,
    )
  })

  it('accepts an offline schedule without a package', async () => {
    const row = await schedule('OFFLINE', null)
    expect(row.deliveryMode).toBe('OFFLINE')
    expect(row.packageId).toBeNull()
  })

  it('accepts an online schedule without a package', async () => {
    const row = await schedule('ONLINE', null)
    expect(row.deliveryMode).toBe('ONLINE')
  })

  it('rejects an offline activity without an offline kind', async () => {
    await expect(activity('OFFLINE', null)).rejects.toThrow(
      /exam_activities_offline_kind_check/,
    )
  })

  it('rejects an online activity with an offline kind', async () => {
    await expect(activity('ONLINE', 'WRITTEN')).rejects.toThrow(
      /exam_activities_offline_kind_check/,
    )
  })

  it('rejects an offline activity that has a package', async () => {
    await expect(activity('OFFLINE', 'WRITTEN', await pkg())).rejects.toThrow(
      /exam_activities_offline_without_package_check/,
    )
  })

  it('accepts an offline activity with a kind and applies defaults', async () => {
    const row = await activity('OFFLINE', 'PRACTICAL')
    expect(row.maxScore).toBe(100)
    expect(row.autoStatus).toBe(true)
  })

  it('defaults an activity to online', async () => {
    const row = await activity('ONLINE', null)
    expect(row.deliveryMode).toBe('ONLINE')
  })

  it('stores offline results once per schedule and student', async () => {
    const row = await schedule('OFFLINE', null)
    const data = {
      scheduleId: row.id,
      studentId: id(),
      note: '',
      enteredById: userId,
      enteredAt: NOW,
    }
    const created = await prisma.examOfflineResult.create({ data })
    expect(created.publicationStatus).toBeNull()
    expect(created.publicationAttempts).toBe(0)
    expect(created.rawScore).toBeNull()
    await expect(prisma.examOfflineResult.create({ data })).rejects.toThrow(
      /Unique constraint/,
    )
  })

  it('finds the offline regular schedules of a semester that are not cancelled', async () => {
    const repository = new PrismaExamScheduleRepository(prisma)
    const offline = await schedule('OFFLINE', null)
    const cancelled = await schedule('OFFLINE', null)
    const online = await schedule('ONLINE', null)
    const semesterId = offline.semesterId
    await prisma.examSchedule.updateMany({
      where: { id: { in: [cancelled.id, online.id] } },
      data: { semesterId },
    })
    await prisma.examSchedule.update({
      where: { id: cancelled.id },
      data: { status: 'CANCELLED' },
    })

    const found = await repository.findOfflineBySemester(semesterId)

    expect(found.map((row) => row.id)).toEqual([offline.id])
    expect(found[0]).toMatchObject({ deliveryMode: 'OFFLINE', packageId: null })
  })

  it('stores every offline publication state and refuses any other', async () => {
    const row = await schedule('OFFLINE', null)
    for (const status of ['PENDING', 'SENT', 'FAILED']) {
      const studentId = id()
      await prisma.$executeRaw`
        INSERT INTO exam_offline_results
          (id, schedule_id, student_id, entered_by_id, entered_at, updated_at, publication_status)
        VALUES (${id()}::uuid, ${row.id}::uuid, ${studentId}::uuid, ${userId}::uuid, now(), now(),
          ${status}::"OfflinePublicationStatus")
      `
      const stored = await prisma.examOfflineResult.findUniqueOrThrow({
        where: { scheduleId_studentId: { scheduleId: row.id, studentId } },
      })
      expect(stored.publicationStatus).toBe(status)
    }
    await expect(
      prisma.$executeRaw`
        INSERT INTO exam_offline_results
          (id, schedule_id, student_id, entered_by_id, entered_at, updated_at, publication_status)
        VALUES (${id()}::uuid, ${row.id}::uuid, ${id()}::uuid, ${userId}::uuid, now(), now(),
          ${'QUEUED'}::"OfflinePublicationStatus")
      `,
    ).rejects.toThrow(/invalid input value for enum/)
  })

  it('lists a schedule without a package in its event window with a null title, and keeps it out of grading', async () => {
    const repository = new PrismaExamScheduleRepository(prisma)
    const event = await prisma.examEvent.create({
      data: {
        semesterId: id(),
        name: 'Delivery DB',
        type: 'FINAL',
        startsAt: NOW,
        endsAt: new Date(NOW.getTime() + 7_200_000),
        createdById: userId,
      },
    })
    eventIds.push(event.id)
    const unpackaged = await schedule('OFFLINE', null)
    const packaged = await schedule('ONLINE', await pkg())
    const window = {
      eventId: event.id,
      endsAt: new Date(NOW.getTime() + 3_600_000),
    }
    await prisma.examSchedule.updateMany({
      where: { id: { in: [unpackaged.id, packaged.id] } },
      data: window,
    })

    const listed = await repository.listSchedulesForEventWindow(
      event.id,
      NOW,
      window.endsAt,
    )

    expect(listed.map((row) => row.id).sort()).toEqual(
      [unpackaged.id, packaged.id].sort(),
    )
    expect(listed.find((row) => row.id === unpackaged.id)).toMatchObject({
      deliveryMode: 'OFFLINE',
      packageId: null,
      packageTitle: null,
    })
    expect(listed.find((row) => row.id === packaged.id)).toMatchObject({
      packageTitle: 'Delivery DB',
    })

    const graded = await repository.findForGrading({
      semesterId: unpackaged.semesterId,
      pairs: null,
      now: new Date(window.endsAt.getTime() + 60_000),
      page: 1,
      limit: 10,
    })
    expect(graded).toMatchObject({ data: [], total: 0 })
  })
})
