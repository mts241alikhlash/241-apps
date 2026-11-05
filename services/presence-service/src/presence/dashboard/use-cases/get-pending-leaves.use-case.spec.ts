import { IPresenceDashboardRepository } from '../domain/presence-dashboard-repository.interface.js'
import { GetPendingLeavesUseCase } from './get-pending-leaves.use-case.js'

describe('GetPendingLeavesUseCase', () => {
  it('returns the number of requests waiting for a decision', async () => {
    const repo = {
      countPendingLeaveRequests: vi.fn().mockResolvedValue(7),
    } as unknown as IPresenceDashboardRepository
    expect(await new GetPendingLeavesUseCase(repo).execute()).toEqual({
      total: 7,
    })
  })
})
