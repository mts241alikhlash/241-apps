export interface NamedTotal {
  name: string
  total: number
}

export abstract class IInventoryDashboardRepository {
  abstract countUnitsByStatus(): Promise<NamedTotal[]>
  abstract countUnitsByCondition(): Promise<NamedTotal[]>
  abstract countActiveLoans(): Promise<number>
  abstract countLoansDueBefore(day: Date): Promise<number>
}
