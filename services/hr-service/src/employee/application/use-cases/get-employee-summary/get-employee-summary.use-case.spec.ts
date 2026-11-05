import { IEmployeeSummaryReadPort } from '../../../domain/repositories/employee-summary-read.port.js'
import { GetEmployeeSummaryUseCase } from './get-employee-summary.use-case.js'

describe('GetEmployeeSummaryUseCase', () => {
  it('returns the active total with both breakdowns', async () => {
    const port = {
      countActive: vi.fn().mockResolvedValue(5),
      countByEmploymentType: vi
        .fn()
        .mockResolvedValue([{ name: 'Tetap', total: 3 }]),
      countByPositionCategory: vi
        .fn()
        .mockResolvedValue([{ name: 'Guru', total: 4 }]),
    } as unknown as IEmployeeSummaryReadPort
    expect(await new GetEmployeeSummaryUseCase(port).execute()).toEqual({
      activeTotal: 5,
      byEmploymentType: [{ name: 'Tetap', total: 3 }],
      byPositionCategory: [{ name: 'Guru', total: 4 }],
    })
  })
})
