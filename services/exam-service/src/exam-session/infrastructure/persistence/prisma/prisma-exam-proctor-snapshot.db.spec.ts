import { randomUUID } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import { PrismaExamProctorSnapshotRepository } from './prisma-exam-proctor-snapshot.repository.js'

const enabled = process.env.EXAM_DB_TESTS === '1'
const suite = enabled ? describe : describe.skip

suite('PrismaExamProctorSnapshotRepository against a real database', () => {
  const prisma = new PrismaService({
    get: (key: string) => process.env[key],
  } as unknown as ConfigService)
  const snapshots = new PrismaExamProctorSnapshotRepository(prisma)

  const id = () => randomUUID()
  const NOW = new Date('2026-11-04T02:00:00.000Z')
  const LATER = new Date('2026-11-06T02:00:00.000Z')
  const PAST = new Date('2026-11-01T02:00:00.000Z')

  const packageIds: string[] = []
  const scheduleIds: string[] = []
  const sessionIds: string[] = []

  async function session() {
    const pkg = await prisma.examPackage.create({
      data: {
        title: 'Snapshot DB',
        subjectId: id(),
        gradeId: id(),
        createdById: id(),
      },
    })
    packageIds.push(pkg.id)
    const schedule = await prisma.examSchedule.create({
      data: {
        packageId: pkg.id,
        classroomId: id(),
        semesterId: id(),
        startsAt: NOW,
        endsAt: LATER,
        durationMinutes: 90,
        createdById: id(),
      },
    })
    scheduleIds.push(schedule.id)
    const row = await prisma.examSession.create({
      data: {
        scheduleId: schedule.id,
        studentId: id(),
        userId: id(),
        deviceId: 'dev',
        shuffleSeed: 'seed',
        startedAt: NOW,
        deadline: LATER,
        finalizeAt: LATER,
      },
    })
    sessionIds.push(row.id)
    return row.id
  }

  afterAll(async () => {
    await prisma.examProctorSnapshot.deleteMany({
      where: { sessionId: { in: sessionIds } },
    })
    await prisma.examSession.deleteMany({ where: { id: { in: sessionIds } } })
    await prisma.examSchedule.deleteMany({ where: { id: { in: scheduleIds } } })
    await prisma.examPackage.deleteMany({ where: { id: { in: packageIds } } })
    await prisma.$disconnect()
  })

  it('creates a snapshot and reads it back by session', async () => {
    const sessionId = await session()

    const created = await snapshots.create({
      sessionId,
      kind: 'SESSION_START',
      storageKey: `exam-proctor/${sessionId}/evidence/1.jpg`,
      sizeBytes: 12_000,
      capturedAt: NOW,
      expiresAt: LATER,
    })

    const rows = await snapshots.listBySession(sessionId)
    expect(rows).toEqual([created])
    expect(created.kind).toBe('SESSION_START')
    expect(created.sizeBytes).toBe(12_000)
  })

  it('lists a session oldest first and finds the newest as latest', async () => {
    const sessionId = await session()
    const first = await snapshots.create({
      sessionId,
      kind: 'LIVE',
      storageKey: `exam-proctor/${sessionId}/latest.jpg`,
      sizeBytes: 9_000,
      capturedAt: NOW,
      expiresAt: LATER,
    })
    const second = await snapshots.create({
      sessionId,
      kind: 'PERIODIC_EVIDENCE',
      storageKey: `exam-proctor/${sessionId}/evidence/2.jpg`,
      sizeBytes: 11_000,
      capturedAt: new Date(NOW.getTime() + 60_000),
      expiresAt: LATER,
    })

    expect(await snapshots.listBySession(sessionId)).toEqual([first, second])
    expect(await snapshots.findLatest(sessionId)).toEqual(second)
  })

  it('returns null as latest for a session without snapshots', async () => {
    const sessionId = await session()

    expect(await snapshots.findLatest(sessionId)).toBeNull()
    expect(await snapshots.listBySession(sessionId)).toEqual([])
  })

  it('keeps one latest row per key while the object is overwritten', async () => {
    const sessionId = await session()
    const input = {
      sessionId,
      kind: 'LIVE' as const,
      storageKey: `exam-proctor/${sessionId}/latest.jpg`,
      sizeBytes: 9_000,
      capturedAt: NOW,
      expiresAt: LATER,
    }

    const first = await snapshots.upsertLatest(input)
    const second = await snapshots.upsertLatest({
      ...input,
      sizeBytes: 10_500,
      capturedAt: new Date(NOW.getTime() + 15_000),
    })

    expect(second.id).toBe(first.id)
    expect(second.sizeBytes).toBe(10_500)
    expect(await snapshots.listBySession(sessionId)).toHaveLength(1)
  })

  it('caps evidence rows under the session lock', async () => {
    const sessionId = await session()
    const input = (index: number) => ({
      sessionId,
      kind: 'PERIODIC_EVIDENCE' as const,
      storageKey: `exam-proctor/${sessionId}/evidence/${index}.jpg`,
      sizeBytes: 12_000,
      capturedAt: NOW,
      expiresAt: LATER,
    })

    for (let index = 0; index < 12; index += 1) {
      expect(
        await snapshots.createEvidenceWithinCap(input(index), 12),
      ).not.toBeNull()
    }
    const results = await Promise.all([
      snapshots.createEvidenceWithinCap(input(12), 12),
      snapshots.createEvidenceWithinCap(input(13), 12),
    ])

    expect(results).toEqual([null, null])
    expect(
      (await snapshots.listBySession(sessionId)).filter(
        (row) => row.kind !== 'LIVE',
      ),
    ).toHaveLength(12)
  })

  it('leaves a row alone when it was refreshed after the read', async () => {
    const sessionId = await session()
    const row = await snapshots.create({
      sessionId,
      kind: 'LIVE',
      storageKey: `exam-proctor/${sessionId}/latest.jpg`,
      sizeBytes: 9_000,
      capturedAt: NOW,
      expiresAt: LATER,
    })

    const removed = await snapshots.deleteExpired([row.id], NOW)

    expect(removed).toEqual([])
    expect(await snapshots.listBySession(sessionId)).toEqual([row])
  })

  it('returns only the rows the delete statement actually removed', async () => {
    const sessionId = await session()
    const row = await snapshots.create({
      sessionId,
      kind: 'LIVE',
      storageKey: `exam-proctor/${sessionId}/latest.jpg`,
      sizeBytes: 9_000,
      capturedAt: NOW,
      expiresAt: PAST,
    })
    const expired = await snapshots.findExpired(NOW, 100)
    await snapshots.upsertLatest({
      sessionId,
      kind: 'LIVE',
      storageKey: row.storageKey,
      sizeBytes: 9_000,
      capturedAt: NOW,
      expiresAt: LATER,
    })

    const removed = await snapshots.deleteExpired(
      expired.map((snapshot) => snapshot.id),
      NOW,
    )

    expect(removed).toEqual([])
    expect(await snapshots.listBySession(sessionId)).toHaveLength(1)
  })

  it('finds expired rows and deletes them by id', async () => {
    const sessionId = await session()
    const expired = await snapshots.create({
      sessionId,
      kind: 'LIVE',
      storageKey: `exam-proctor/${sessionId}/latest.jpg`,
      sizeBytes: 8_000,
      capturedAt: NOW,
      expiresAt: new Date(NOW.getTime() - 60_000),
    })
    const kept = await snapshots.create({
      sessionId,
      kind: 'SESSION_START',
      storageKey: `exam-proctor/${sessionId}/evidence/1.jpg`,
      sizeBytes: 10_000,
      capturedAt: NOW,
      expiresAt: LATER,
    })

    expect(await snapshots.findExpired(NOW, 100)).toEqual([expired])

    await snapshots.deleteMany([expired.id])

    expect(await snapshots.listBySession(sessionId)).toEqual([kept])
  })
})
