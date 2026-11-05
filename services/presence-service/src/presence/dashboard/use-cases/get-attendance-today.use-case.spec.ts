import { ServerClockService } from '../../shared/services/server-clock.service.js'
import { IPresenceDashboardRepository } from '../domain/presence-dashboard-repository.interface.js'
import { GetAttendanceTodayUseCase } from './get-attendance-today.use-case.js'

function setup(now: string, statuses: Record<string, number>, holders: number) {
  const repo = {
    countStatusesOn: vi.fn().mockResolvedValue(statuses),
    countActiveCredentialHolders: vi.fn().mockResolvedValue(holders),
    countPendingLeaveRequests: vi.fn(),
  } as unknown as IPresenceDashboardRepository
  const clock = { now: () => new Date(now) } as ServerClockService
  return { repo, useCase: new GetAttendanceTodayUseCase(repo, clock) }
}

describe('GetAttendanceTodayUseCase', () => {
  it('counts present, late, on leave or duty, and the holders who did not scan', async () => {
    const { useCase } = setup(
      '2026-11-05T03:00:00Z',
      {
        PRESENT: 4,
        LATE: 2,
        ON_LEAVE: 1,
        OFFICIAL_DUTY: 1,
        NOT_EXPECTED: 1,
        ABSENT: 1,
      },
      10,
    )
    expect(await useCase.execute()).toEqual({
      present: 4,
      late: 2,
      onLeave: 2,
      notScanned: 1,
      date: new Date('2026-11-05T00:00:00Z'),
    })
  })

  it('never reports a negative number of people who did not scan', async () => {
    const { useCase } = setup('2026-11-05T03:00:00Z', { PRESENT: 5 }, 3)
    expect((await useCase.execute()).notScanned).toBe(0)
  })

  it('asks for the day a scan at 00:30 local time is keyed to', async () => {
    const { repo, useCase } = setup('2026-11-05T17:30:00Z', {}, 0)
    await useCase.execute()
    expect(repo.countStatusesOn).toHaveBeenCalledWith(
      new Date('2026-11-05T00:00:00Z'),
      'EMPLOYEE',
    )
  })
})
