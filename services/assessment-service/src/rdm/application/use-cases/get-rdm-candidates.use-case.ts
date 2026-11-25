import { Injectable } from '@nestjs/common'
import {
  IAssessmentItemRepository,
  type AssessmentItemWithDetails,
} from '../../../assessment/domain/repositories/assessment-item.repository.js'
import { IGradingScopeReadPort } from '../../../assessment/domain/repositories/grading-scope-read.port.js'
import { IEmployeeIdentityReadPort } from '../../../platform/employee-identity/employee-identity.port.js'
import { IRdmSettingRepository } from '../../domain/rdm-setting.js'
import { assertTeaches } from '../assert-teaches.js'
import type {
  GetRdmCandidatesInput,
  GetRdmCandidatesResult,
  RdmCandidateItem,
} from '../rdm.types.js'

function toCandidateItem(item: AssessmentItemWithDetails): RdmCandidateItem {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    maxScore: item.maxScore,
    material: item.material,
    kktp: item.kktp,
  }
}

@Injectable()
export class GetRdmCandidatesUseCase {
  constructor(
    private readonly rdmSettingRepository: IRdmSettingRepository,
    private readonly assessmentItemRepository: IAssessmentItemRepository,
    private readonly employeeIdentity: IEmployeeIdentityReadPort,
    private readonly gradingScope: IGradingScopeReadPort,
  ) {}

  async execute(input: GetRdmCandidatesInput): Promise<GetRdmCandidatesResult> {
    await assertTeaches(input.userId, input.teachingAssignmentId, {
      employeeIdentity: this.employeeIdentity,
      gradingScope: this.gradingScope,
    })

    const [setting, items] = await Promise.all([
      this.rdmSettingRepository.get(),
      this.assessmentItemRepository.findAllByTeachingAssignment(
        input.teachingAssignmentId,
      ),
    ])

    const sumatifSet = new Set<string>(setting.sumatifTypes)
    const sasType = `${setting.sasType}`
    const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))

    return {
      sumatif: sorted
        .filter((item) => sumatifSet.has(item.type))
        .map(toCandidateItem),
      sas: sorted.filter((item) => item.type === sasType).map(toCandidateItem),
    }
  }
}
