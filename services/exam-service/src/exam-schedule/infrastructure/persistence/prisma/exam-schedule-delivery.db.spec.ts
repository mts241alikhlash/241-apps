import { randomUUID } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../core/database/prisma.service.js'

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
    expect(created.publicationStatus).toBe('PENDING')
    expect(created.publicationAttempts).toBe(0)
    expect(created.rawScore).toBeNull()
    await expect(prisma.examOfflineResult.create({ data })).rejects.toThrow(
      /Unique constraint/,
    )
  })
})
