import { BadRequestException } from '@nestjs/common'
import { FakeExamPackageRepository } from '../../../../exam-package/application/exam-package.repository.fake.js'
import { FakeExamScheduleRepository } from '../../../../exam-schedule/application/exam-schedule.repository.fake.js'
import { FakeQuestionRepository } from '../../../../question/application/question.repository.fake.js'
import { FakeExamProctorSnapshotRepository } from '../../exam-proctor-snapshot.repository.fake.js'
import { FakeExamSessionRepository } from '../../exam-session.repository.fake.js'
import {
  NOW,
  STUDENT_USER,
  choiceSpec,
  schedulePaper,
  sessionFor,
  sessionAccess,
} from '../../exam-session.test-support.js'
import { FakeSessionFinalizer } from '../../session-finalizer.fake.js'
import { fakeStorage } from '../../proctor-snapshot.test-support.js'
import {
  PROCTOR_SNAPSHOT_MAX_BYTES,
  UploadProctorSnapshotUseCase,
  latestSnapshotKey,
} from './upload-proctor-snapshot.use-case.js'

const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(120, 0x00),
])

async function setup() {
  const packages = new FakeExamPackageRepository()
  const schedules = new FakeExamScheduleRepository(packages)
  const questions = new FakeQuestionRepository()
  const sessions = new FakeExamSessionRepository()
  const snapshots = new FakeExamProctorSnapshotRepository()
  const { storage, calls } = fakeStorage()
  const { schedule } = await schedulePaper({ packages, schedules, questions }, [
    choiceSpec('B'),
  ])
  sessions.sessions.set('a', sessionFor(schedule, { id: 'a' }))
  const useCase = new UploadProctorSnapshotUseCase(
    sessionAccess(sessions, new FakeSessionFinalizer(), schedules),
    sessions,
    snapshots,
    storage,
  )
  return { useCase, sessions, snapshots, calls }
}

describe('UploadProctorSnapshotUseCase', () => {
  it('rejects a payload that is not a JPEG', async () => {
    const { useCase, calls } = await setup()

    await expect(
      useCase.execute(
        STUDENT_USER,
        'a',
        {
          buffer: Buffer.from('%PDF-1.7\n'),
          kind: 'LIVE',
          capturedAt: NOW,
        },
        NOW,
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(calls.uploaded).toEqual([])
  })

  it('rejects a JPEG larger than the snapshot limit', async () => {
    const { useCase, calls } = await setup()

    await expect(
      useCase.execute(
        STUDENT_USER,
        'a',
        {
          buffer: Buffer.concat([
            JPEG,
            Buffer.alloc(PROCTOR_SNAPSHOT_MAX_BYTES),
          ]),
          kind: 'LIVE',
          capturedAt: NOW,
        },
        NOW,
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(calls.uploaded).toEqual([])
  })

  it('overwrites latest.jpg on every upload and keeps twelve evidence rows', async () => {
    const { useCase, snapshots, calls } = await setup()

    for (let index = 0; index < 20; index += 1) {
      await useCase.execute(
        STUDENT_USER,
        'a',
        { buffer: JPEG, kind: 'PERIODIC_EVIDENCE', capturedAt: NOW },
        NOW,
      )
    }

    const latestKey = latestSnapshotKey('a')
    expect(calls.uploaded.filter((row) => row.key === latestKey)).toHaveLength(
      20,
    )
    expect(
      calls.uploaded.filter((row) =>
        row.key.startsWith(`exam-proctor/a/evidence/`),
      ),
    ).toHaveLength(12)
    const rows = await snapshots.listBySession('a')
    expect(rows.filter((row) => row.kind !== 'LIVE')).toHaveLength(12)
    expect(rows.filter((row) => row.kind === 'LIVE')).toHaveLength(1)
  })

  it('keeps twelve rows when two non-LIVE uploads race at eleven', async () => {
    const { useCase, snapshots } = await setup()
    for (let index = 0; index < 11; index += 1) {
      snapshots.seed('a', 'PERIODIC_EVIDENCE', new Date(NOW.getTime() + 1))
    }

    await Promise.all([
      useCase.execute(
        STUDENT_USER,
        'a',
        { buffer: JPEG, kind: 'PERIODIC_EVIDENCE', capturedAt: NOW },
        NOW,
      ),
      useCase.execute(
        STUDENT_USER,
        'a',
        { buffer: JPEG, kind: 'VIOLATION_RETURN', capturedAt: NOW },
        NOW,
      ),
    ])

    const rows = await snapshots.listBySession('a')
    expect(rows.filter((row) => row.kind !== 'LIVE')).toHaveLength(12)
  })

  it('stores a LIVE upload without an evidence copy', async () => {
    const { useCase, snapshots, calls } = await setup()

    const result = await useCase.execute(
      STUDENT_USER,
      'a',
      { buffer: JPEG, kind: 'LIVE', capturedAt: NOW },
      NOW,
    )

    expect(result.evidenceId).toBeNull()
    expect(calls.uploaded.map((row) => row.key)).toEqual([
      latestSnapshotKey('a'),
    ])
    expect(await snapshots.listBySession('a')).toHaveLength(1)
  })

  it('records the snapshot on the session and stamps a 48 hour expiry', async () => {
    const { useCase, sessions, snapshots } = await setup()

    await useCase.execute(
      STUDENT_USER,
      'a',
      { buffer: JPEG, kind: 'SESSION_START', capturedAt: NOW },
      NOW,
    )

    expect(sessions.sessions.get('a')?.lastSnapshotAt).toEqual(NOW)
    expect(sessions.sessions.get('a')?.snapshotCount).toBe(1)
    const [row] = await snapshots.listBySession('a')
    expect(row.expiresAt).toEqual(new Date(NOW.getTime() + 48 * 3_600_000))
  })
})
