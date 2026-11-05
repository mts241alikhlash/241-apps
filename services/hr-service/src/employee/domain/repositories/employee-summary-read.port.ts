export interface NamedTotal {
  name: string
  total: number
}

export abstract class IEmployeeSummaryReadPort {
  abstract countActive(): Promise<number>
  abstract countByEmploymentType(): Promise<NamedTotal[]>
  abstract countByPositionCategory(): Promise<NamedTotal[]>
}
