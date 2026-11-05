import { Injectable } from '@nestjs/common'
import {
  IEmployeeSummaryReadPort,
  NamedTotal,
} from '../../../domain/repositories/employee-summary-read.port.js'

export interface EmployeeSummary {
  activeTotal: number
  byEmploymentType: NamedTotal[]
  byPositionCategory: NamedTotal[]
}

@Injectable()
export class GetEmployeeSummaryUseCase {
  constructor(private readonly summary: IEmployeeSummaryReadPort) {}

  async execute(): Promise<EmployeeSummary> {
    const [activeTotal, byEmploymentType, byPositionCategory] =
      await Promise.all([
        this.summary.countActive(),
        this.summary.countByEmploymentType(),
        this.summary.countByPositionCategory(),
      ])
    return { activeTotal, byEmploymentType, byPositionCategory }
  }
}
