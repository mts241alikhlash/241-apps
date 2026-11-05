import { IInventoryDashboardRepository } from '../domain/inventory-dashboard.repository.js'
import { GetAssetDashboardUseCase } from './get-asset-dashboard.use-case.js'

describe('GetAssetDashboardUseCase', () => {
  it('totals the units and passes both breakdowns through', async () => {
    const repo = {
      countUnitsByStatus: vi.fn().mockResolvedValue([
        { name: 'Tersedia', total: 7 },
        { name: 'Dipinjam', total: 2 },
      ]),
      countUnitsByCondition: vi
        .fn()
        .mockResolvedValue([{ name: 'Baik', total: 9 }]),
    } as unknown as IInventoryDashboardRepository
    expect(await new GetAssetDashboardUseCase(repo).execute()).toEqual({
      total: 9,
      byStatus: [
        { name: 'Tersedia', total: 7 },
        { name: 'Dipinjam', total: 2 },
      ],
      byCondition: [{ name: 'Baik', total: 9 }],
    })
  })
})
