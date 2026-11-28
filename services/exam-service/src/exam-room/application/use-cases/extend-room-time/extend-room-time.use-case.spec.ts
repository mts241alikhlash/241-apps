import { ConflictException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { ExamSession } from '../../../../exam-session/domain/entities/exam-session.entity.js'
import type { IExamSessionRepository } from '../../../../exam-session/domain/repositories/exam-session.repository.js'
import type { ISessionRecoveryRepository } from '../../../../exam-session/domain/repositories/session-recovery.port.js'
import type { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import type { ExamSchedule } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import type { RoomAccessService } from '../../room-access.service.js'
import { ExtendRoomTimeUseCase } from './extend-room-time.use-case.js'

const MS_PER_MINUTE = 60_000
const END = new Date('2026-11-02T03:30:00.000Z')

function session(id: string, deadline: Date): ExamSession {
  return {
    id,
    scheduleId: 'schedule-1',
    status: 'IN_PROGRESS',
    extraMinutes: 0,
    deadline,
    finalizeAt: new Date(deadline.getTime() + 10 * MS_PER_MINUTE),
  } as unknown as ExamSession
}

function setup(sessions: ExamSession[]) {
  const recoverRoom = vi.fn(() => Promise.resolve(sessions))
  const useCase = new ExtendRoomTimeUseCase(
    { recoverRoom } as unknown as ISessionRecoveryRepository,
    {
      assertCanActAsTechnician: vi.fn(() => Promise.resolve()),
    } as unknown as RoomAccessService,
    {
      listByRoom: vi.fn(() => Promise.resolve(sessions)),
    } as unknown as IExamSessionRepository,
    {
      findById: vi.fn(() =>
        Promise.resolve({ id: 'schedule-1', endsAt: END } as ExamSchedule),
      ),
    } as unknown as IExamScheduleRepository,
  )
  return { recoverRoom, useCase }
}

const USER = { id: 'tech-1', permissions: [] }
const REASON = 'Listrik padam'

describe('ExtendRoomTimeUseCase past the schedule end', () => {
  it('extends the room within 30 minutes past the schedule end', async () => {
    const { recoverRoom, useCase } = setup([session('a', END)])

    await useCase.execute(USER, 'room-1', 10, REASON)

    expect(recoverRoom).toHaveBeenCalledOnce()
  })

  it('refuses the room when a session would pass 30 minutes after the end', async () => {
    const { recoverRoom, useCase } = setup([
      session('a', END),
      session('b', new Date(END.getTime() + 25 * MS_PER_MINUTE)),
    ])

    await expect(useCase.execute(USER, 'room-1', 10, REASON)).rejects.toThrow(
      new ConflictException(
        'Tambahan waktu melewati batas 30 menit setelah jam selesai ujian',
      ),
    )
    expect(recoverRoom).not.toHaveBeenCalled()
  })
})
