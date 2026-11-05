import { PayrollAuditService } from '../../shared/services/payroll-audit.service.js'
import { IPayslipRepository } from '../domain/interfaces/payslip-repository.interface.js'
import { GetMyLatestPayslipPeriodUseCase } from './get-my-latest-payslip-period.use-case.js'

describe('GetMyLatestPayslipPeriodUseCase', () => {
  it('returns the period of the newest approved run without writing an audit row', async () => {
    const payslips = {
      findLatestOwnPeriod: vi.fn().mockResolvedValue({ year: 2026, month: 10 }),
    } as unknown as IPayslipRepository
    const audit = { record: vi.fn() } as unknown as PayrollAuditService
    const useCase = new GetMyLatestPayslipPeriodUseCase(payslips)
    expect(await useCase.execute('user-1')).toEqual({ year: 2026, month: 10 })
    expect(payslips.findLatestOwnPeriod).toHaveBeenCalledWith('user-1')
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('returns null when no approved payslip exists', async () => {
    const payslips = {
      findLatestOwnPeriod: vi.fn().mockResolvedValue(null),
    } as unknown as IPayslipRepository
    expect(
      await new GetMyLatestPayslipPeriodUseCase(payslips).execute('user-1'),
    ).toBeNull()
  })
})
