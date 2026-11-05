import { IDailyPresenceRepository } from '../../daily-record/domain/interfaces/daily-presence-repository.interface.js'
import { ILeaveRepository } from '../../leave/domain/interfaces/leave-repository.interface.js'
import { ServerClockService } from '../../shared/services/server-clock.service.js'
import { GetMyPresenceDashboardUseCase } from './get-my-presence-dashboard.use-case.js'

const clock = {
  now: () => new Date('2026-11-05T03:00:00Z'),
} as ServerClockService

function setup(day: unknown) {
  const presence = {
    findByUserAndDate: vi.fn().mockResolvedValue(day),
  } as unknown as IDailyPresenceRepository
  const leave = {
    findBalances: vi
      .fn()
      .mockResolvedValue([
        { name: 'Cuti Tahunan', remaining: 8, quota: 12, used: 4 },
      ]),
  } as unknown as ILeaveRepository
  return {
    presence,
    leave,
    useCase: new GetMyPresenceDashboardUseCase(presence, leave, clock),
  }
}

describe('GetMyPresenceDashboardUseCase', () => {
  it("returns the caller's day and leave balances", async () => {
    const checkIn = new Date('2026-11-05T01:00:00Z')
    const { useCase, presence } = setup({
      status: 'PRESENT',
      checkInAt: checkIn,
      checkOutAt: null,
    })
    expect(await useCase.execute('user-1', true)).toEqual({
      today: { status: 'PRESENT', clockIn: checkIn, clockOut: null },
      leaveBalance: [{ leaveTypeName: 'Cuti Tahunan', remainingDays: 8 }],
    })
    expect(presence.findByUserAndDate).toHaveBeenCalledWith(
      'user-1',
      new Date('2026-11-05T00:00:00Z'),
    )
  })

  it('answers null for a day without a record', async () => {
    const { useCase } = setup(null)
    expect((await useCase.execute('user-1', true)).today).toBeNull()
  })

  it('leaves the balances out when the caller cannot read leave', async () => {
    const { useCase, leave } = setup(null)
    expect((await useCase.execute('user-1', false)).leaveBalance).toEqual([])
    expect(leave.findBalances).not.toHaveBeenCalled()
  })
})
