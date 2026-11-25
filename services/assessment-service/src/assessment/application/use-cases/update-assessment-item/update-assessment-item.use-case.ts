import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ASSESSMENT_ITEM_NAME_CONFLICT_MESSAGE } from '../../../constants/assessment.constants.js'
import {
  AssessmentItemWithDetails,
  IAssessmentItemRepository,
} from '../../../domain/repositories/assessment-item.repository.js'
import type { UpdateAssessmentItemInput } from './update-assessment-item.input.js'

@Injectable()
export class UpdateAssessmentItemUseCase {
  constructor(
    private readonly assessmentItemRepository: IAssessmentItemRepository,
  ) {}

  async execute(
    id: string,
    input: UpdateAssessmentItemInput,
  ): Promise<AssessmentItemWithDetails> {
    const item = await this.assessmentItemRepository.findById(id)
    if (!item) {
      throw new NotFoundException('Assessment item not found')
    }

    let name: string | undefined
    if (input.name !== undefined) {
      name = input.name.trim()
      const clash = await this.assessmentItemRepository.findNameClash(
        item.teachingAssignmentId,
        name,
        id,
      )
      if (clash) {
        throw new BadRequestException(ASSESSMENT_ITEM_NAME_CONFLICT_MESSAGE)
      }
    }

    return this.assessmentItemRepository.update(id, {
      name,
      type: input.type,
      weight: input.weight,
      maxScore: input.maxScore,
      material: input.material,
      kktp: input.kktp,
    })
  }
}
