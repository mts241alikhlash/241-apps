import { FakeExamProctorSnapshotRepository } from '../../exam-proctor-snapshot.repository.fake.js'
import { FakeExamSessionRepository } from '../../exam-session.repository.fake.js'
import { fakeStorage } from '../../proctor-snapshot.test-support.js'
import { sessionFor } from '../../exam-session.test-support.js'
import type { ExamSchedule } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import {
  CLEANUP_BATCH,
  CleanupExpiredSnapshotsUseCase,
} from './cleanup-expired-snapshots.use-case.js'

const NOW = new Date('2026-11-04T02:00:00.000Z')
const PAST = new Date('2026-11-01T02:00:00.000Z')
const FUTURE = new Date('2026-11-06T02:00:00.000Z')

function setup() {
  const sessions = new FakeExamSessionRepository()
  const snapshots = new FakeExamProctorSnapshotRepository()
  const { storage, calls } = fakeStorage()
  const schedule = { id: 'sch-1' } as ExamSchedule
  sessions.sessions.set(
    'emptied',
    sessionFor(schedule, {
      id: 'emptied',
      lastSnapshotAt: PAST,
      snapshotCount: 2,
    }),
  )
  sessions.sessions.set(
    'kept',
    sessionFor(schedule, {
      id: 'kept',
      lastSnapshotAt: PAST,
      snapshotCount: 1,
    }),
  )
  const gone = snapshots.seed('emptied', 'SESSION_START', PAST)
  const alsoGone = snapshots.seed('emptied', 'PERIODIC_EVIDENCE', PAST)
  const survivor = snapshots.seed('kept', 'SESSION_START', FUTURE)
  return {
    useCase: new CleanupExpiredSnapshotsUseCase(snapshots, sessions, storage),
    sessions,
    snapshots,
    calls,
    gone,
    alsoGone,
    survivor,
  }
}

describe('CleanupExpiredSnapshotsUseCase', () => {
  it('deletes the expired objects, their rows and clears the emptied session', async () => {
    const { useCase, sessions, snapshots, calls, gone, alsoGone, survivor } =
      setup()

    const result = await useCase.execute(NOW)

    expect(result.deletedCount).toBe(2)
    expect(calls.deleted.sort()).toEqual(
      [gone.storageKey, alsoGone.storageKey].sort(),
    )
    expect(snapshots.rows.has(gone.id)).toBe(false)
    expect(snapshots.rows.has(alsoGone.id)).toBe(false)
    expect(snapshots.rows.has(survivor.id)).toBe(true)
    expect(sessions.sessions.get('emptied')?.lastSnapshotAt).toBeNull()
    expect(sessions.sessions.get('kept')?.lastSnapshotAt).toEqual(PAST)
  })

  it('keeps the row when MinIO refuses the delete so the next run retries', async () => {
    const snapshots = new FakeExamProctorSnapshotRepository()
    const sessions = new FakeExamSessionRepository()
    const expired = snapshots.seed('s1', 'LIVE', PAST)
    const { storage, calls } = fakeStorage([expired.storageKey])
    sessions.sessions.set(
      's1',
      sessionFor({ id: 'sch-1' } as ExamSchedule, { id: 's1' }),
    )

    const result = await new CleanupExpiredSnapshotsUseCase(
      snapshots,
      sessions,
      storage,
    ).execute(NOW)

    expect(result.deletedCount).toBe(0)
    expect(snapshots.rows.has(expired.id)).toBe(true)
    expect(calls.deleted).toEqual([])
  })

  it('deletes one bad object without aborting the rest of the batch', async () => {
    const snapshots = new FakeExamProctorSnapshotRepository()
    const sessions = new FakeExamSessionRepository()
    const bad = snapshots.seed('s1', 'LIVE', PAST)
    const good = snapshots.seed('s2', 'LIVE', PAST)
    const { storage, calls } = fakeStorage([bad.storageKey])
    sessions.sessions.set(
      's1',
      sessionFor({ id: 'sch-1' } as ExamSchedule, { id: 's1' }),
    )
    sessions.sessions.set(
      's2',
      sessionFor({ id: 'sch-1' } as ExamSchedule, { id: 's2' }),
    )

    const result = await new CleanupExpiredSnapshotsUseCase(
      snapshots,
      sessions,
      storage,
    ).execute(NOW)

    expect(result.deletedCount).toBe(1)
    expect(calls.deleted).toEqual([good.storageKey])
    expect(snapshots.rows.has(good.id)).toBe(false)
    expect(snapshots.rows.has(bad.id)).toBe(true)
  })

  it('reports zero on the second run', async () => {
    const { useCase } = setup()

    expect((await useCase.execute(NOW)).deletedCount).toBe(2)
    expect((await useCase.execute(NOW)).deletedCount).toBe(0)
  })

  it('keeps a row refreshed between the read and the delete', async () => {
    const snapshots = new FakeExamProctorSnapshotRepository()
    const sessions = new FakeExamSessionRepository()
    const { storage, calls } = fakeStorage()
    const row = snapshots.seed('s1', 'LIVE', PAST)
    sessions.sessions.set(
      's1',
      sessionFor({ id: 'sch-1' } as ExamSchedule, {
        id: 's1',
        lastSnapshotAt: PAST,
      }),
    )
    const findExpired = snapshots.findExpired.bind(snapshots)
    snapshots.findExpired = async (at: Date, limit: number) => {
      const rows = await findExpired(at, limit)
      snapshots.rows.set(row.id, { ...row, expiresAt: FUTURE })
      return rows
    }

    const result = await new CleanupExpiredSnapshotsUseCase(
      snapshots,
      sessions,
      storage,
    ).execute(NOW)

    expect(result.deletedCount).toBe(0)
    expect(calls.deleted).toEqual([])
    expect(snapshots.rows.has(row.id)).toBe(true)
    expect(sessions.sessions.get('s1')?.lastSnapshotAt).toEqual(PAST)
  })

  it('stops after one round when every object delete fails', async () => {
    const snapshots = new FakeExamProctorSnapshotRepository()
    const sessions = new FakeExamSessionRepository()
    const keys: string[] = []
    for (let index = 0; index < CLEANUP_BATCH; index += 1) {
      keys.push(snapshots.seed(`s${index}`, 'LIVE', PAST).storageKey)
      sessions.sessions.set(
        `s${index}`,
        sessionFor({ id: 'sch-1' } as ExamSchedule, { id: `s${index}` }),
      )
    }
    const { storage } = fakeStorage(keys)
    const findExpired = jest.spyOn(snapshots, 'findExpired')

    const result = await new CleanupExpiredSnapshotsUseCase(
      snapshots,
      sessions,
      storage,
    ).execute(NOW)

    expect(result.deletedCount).toBe(0)
    expect(findExpired).toHaveBeenCalledTimes(1)
    expect(snapshots.rows.size).toBe(CLEANUP_BATCH)
  })

  it('keeps going when restoring a failed row throws', async () => {
    const snapshots = new FakeExamProctorSnapshotRepository()
    const sessions = new FakeExamSessionRepository()
    const bad = snapshots.seed('s1', 'LIVE', PAST)
    const good = snapshots.seed('s2', 'LIVE', PAST)
    const { storage, calls } = fakeStorage([bad.storageKey])
    sessions.sessions.set(
      's1',
      sessionFor({ id: 'sch-1' } as ExamSchedule, {
        id: 's1',
        lastSnapshotAt: PAST,
      }),
    )
    sessions.sessions.set(
      's2',
      sessionFor({ id: 'sch-1' } as ExamSchedule, {
        id: 's2',
        lastSnapshotAt: PAST,
      }),
    )
    const create = snapshots.create.bind(snapshots)
    jest.spyOn(snapshots, 'create').mockImplementation((input) => {
      if (input.id === bad.id) {
        return Promise.reject(new Error('storage_key taken'))
      }
      return create(input)
    })

    const result = await new CleanupExpiredSnapshotsUseCase(
      snapshots,
      sessions,
      storage,
    ).execute(NOW)

    expect(result.deletedCount).toBe(1)
    expect(calls.deleted).toEqual([good.storageKey])
    expect(sessions.sessions.get('s2')?.lastSnapshotAt).toBeNull()
    expect(sessions.sessions.get('s1')?.lastSnapshotAt).toEqual(PAST)
  })

  it('does nothing when nothing has expired', async () => {
    const snapshots = new FakeExamProctorSnapshotRepository()
    const sessions = new FakeExamSessionRepository()
    const { storage, calls } = fakeStorage()
    snapshots.seed('s1', 'LIVE', FUTURE)

    const result = await new CleanupExpiredSnapshotsUseCase(
      snapshots,
      sessions,
      storage,
    ).execute(NOW)

    expect(result.deletedCount).toBe(0)
    expect(calls.deleted).toEqual([])
  })
})
