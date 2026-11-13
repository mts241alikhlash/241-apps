import { ConflictException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { ExamSchedule } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import type { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import type { RoomStaffUser } from '../../../../exam-room/application/room-access.service.js'
import type { ExamSession } from '../../../domain/entities/exam-session.entity.js'
import type { SessionRecoveryService } from '../../session-recovery.service.js'
import { ExtendSessionTimeUseCase } from './extend-session-time.use-case.js'

const MS_PER_MINUTE = 60_000
const USER: RoomStaffUser = { id: 'admin-1', permissions: [] }
const ENDS_AT = new Date('2026-11-14T08:00:00.000Z')

function sessionWithDeadline(deadline: Date): ExamSession {
  return {
    id: 'session-1',
    scheduleId: 'schedule-1',
    status: 'IN_PROGRESS',
    extraMinutes: 0,
    deadline,
    finalizeAt: new Date(deadline.getTime() + 10 * MS_PER_MINUTE),
  } as unknown as ExamSession
}

function setup(session: ExamSession, schedule: ExamSchedule | null) {
  const apply = vi.fn((_u, _id, _action, _reason, change) =>
    Promise.resolve({ ...session, ...change(session) }),
  )
  const recovery = {
    load: vi.fn(() => Promise.resolve(session)),
    authorize: vi.fn(() => Promise.resolve(undefined)),
    apply,
  } as unknown as SessionRecoveryService
  const schedules = {
    findById: vi.fn(() => Promise.resolve(schedule)),
  } as unknown as IExamScheduleRepository
  return {
    apply,
    useCase: new ExtendSessionTimeUseCase(recovery, schedules),
  }
}

describe('ExtendSessionTimeUseCase', () => {
  it('refuses an extension that would pass the schedule endsAt', async () => {
    const session = sessionWithDeadline(ENDS_AT)
    const { apply, useCase } = setup(session, {
      endsAt: ENDS_AT,
    } as ExamSchedule)

    await expect(
      useCase.execute(USER, session.id, 1, 'Server lambat'),
    ).rejects.toThrow(
      new ConflictException('Tambahan waktu melewati jendela ujian'),
    )
    expect(apply).not.toHaveBeenCalled()
  })

  it('extends by exactly the requested minutes when inside the window', async () => {
    const deadline = new Date(ENDS_AT.getTime() - 30 * MS_PER_MINUTE)
    const session = sessionWithDeadline(deadline)
    const { apply, useCase } = setup(session, {
      endsAt: ENDS_AT,
    } as ExamSchedule)

    const extended = await useCase.execute(
      USER,
      session.id,
      15,
      'Server lambat',
    )

    expect(apply).toHaveBeenCalledOnce()
    expect(extended.deadline.getTime()).toBe(
      deadline.getTime() + 15 * MS_PER_MINUTE,
    )
  })

  it('refuses when the schedule is missing', async () => {
    const session = sessionWithDeadline(ENDS_AT)
    const { useCase } = setup(session, null)

    await expect(
      useCase.execute(USER, session.id, 1, 'Server lambat'),
    ).rejects.toThrow(new ConflictException('Jadwal ujian tidak ditemukan'))
  })
})
