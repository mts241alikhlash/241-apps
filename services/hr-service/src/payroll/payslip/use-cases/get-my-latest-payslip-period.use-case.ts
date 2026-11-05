import { Injectable } from '@nestjs/common'
import { IPayslipRepository } from '../domain/interfaces/payslip-repository.interface.js'

@Injectable()
export class GetMyLatestPayslipPeriodUseCase {
  constructor(private readonly payslips: IPayslipRepository) {}

  execute(userId: string): Promise<{ year: number; month: number } | null> {
    return this.payslips.findLatestOwnPeriod(userId)
  }
}
