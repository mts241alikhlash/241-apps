import { SchoolTimeService } from '@mts241alikhlash/nest-core/time'
import type { ConfigService } from '@nestjs/config'
import { IInventoryDashboardRepository } from '../domain/inventory-dashboard.repository.js'
import { GetLoanDashboardUseCase } from './get-loan-dashboard.use-case.js'

const schoolTime = new SchoolTimeService({
  getOrThrow: () => 'Asia/Jakarta',
} as unknown as ConfigService)

function setup(active: number, overdue: number) {
  const repo = {
    countActiveLoans: vi.fn().mockResolvedValue(active),
    countLoansDueBefore: vi.fn().mockResolvedValue(overdue),
  } as unknown as IInventoryDashboardRepository
  return { repo, useCase: new GetLoanDashboardUseCase(repo, schoolTime) }
}

describe('GetLoanDashboardUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-05T09:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('counts a loan due today as active but not overdue: overdue means due before today', async () => {
    const { repo, useCase } = setup(3, 1)
    expect(await useCase.execute()).toEqual({ active: 3, overdue: 1 })
    expect(repo.countLoansDueBefore).toHaveBeenCalledWith(
      new Date('2026-11-05T00:00:00Z'),
    )
  })

  it('uses the local day: 17:00 UTC is already the next day in WIB', async () => {
    vi.setSystemTime(new Date('2026-11-05T17:00:00Z'))
    const { repo, useCase } = setup(1, 1)
    await useCase.execute()
    expect(repo.countLoansDueBefore).toHaveBeenCalledWith(
      new Date('2026-11-06T00:00:00Z'),
    )
  })

  it('a loan due yesterday falls before the boundary passed to the repository', async () => {
    const { repo, useCase } = setup(1, 1)
    await useCase.execute()
    const boundary = vi.mocked(repo.countLoansDueBefore).mock.calls[0][0]
    expect(new Date('2026-11-04T00:00:00Z') < boundary).toBe(true)
    expect(new Date('2026-11-05T00:00:00Z') < boundary).toBe(false)
  })
})
