import { BadRequestException, Injectable } from '@nestjs/common'
import {
  ASSESSMENT_ITEM_NAME_CONFLICT_MESSAGE,
  ASSESSMENT_ITEM_NAME_REQUIRED_MESSAGE,
} from '../../../constants/assessment.constants.js'
import {
  AssessmentItemWithDetails,
  IAssessmentItemRepository,
} from '../../../domain/repositories/assessment-item.repository.js'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import type { CreateAssessmentItemInput } from './create-assessment-item.input.js'

@Injectable()
export class CreateAssessmentItemUseCase {
  constructor(
    private readonly assessmentItemRepository: IAssessmentItemRepository,
    private readonly academicLookup: IAcademicLookupPort,
  ) {}

  async execute(
    input: CreateAssessmentItemInput,
  ): Promise<AssessmentItemWithDetails> {
    const exists = await this.academicLookup.teachingAssignmentExists(
      input.teachingAssignmentId,
    )
    if (!exists) {
      throw new BadRequestException('Teaching assignment not found')
    }

    const name = input.name.trim()
    if (name.length === 0) {
      throw new BadRequestException(ASSESSMENT_ITEM_NAME_REQUIRED_MESSAGE)
    }
    const clash = await this.assessmentItemRepository.findNameClash(
      input.teachingAssignmentId,
      name,
    )
    if (clash) {
      throw new BadRequestException(ASSESSMENT_ITEM_NAME_CONFLICT_MESSAGE)
    }

    return this.assessmentItemRepository.create({
      teachingAssignmentId: input.teachingAssignmentId,
      name,
      type: input.type,
      weight: input.weight,
      maxScore: input.maxScore,
      material: input.material,
      kktp: input.kktp,
    })
  }
}
