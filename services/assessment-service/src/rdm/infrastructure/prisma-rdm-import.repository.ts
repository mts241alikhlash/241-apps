import { Injectable } from '@nestjs/common'
import { upsertScores } from '../../assessment/infrastructure/persistence/prisma/prisma-student-score.roster.js'
import { PrismaService } from '../../core/database/prisma.service.js'
import { RDM_DEFAULT_MAX_SCORE } from '../constants/rdm.constants.js'
import {
  IRdmImportRepository,
  type RdmImportPlan,
  type RdmImportResult,
} from '../domain/rdm-import.repository.js'

@Injectable()
export class PrismaRdmImportRepository extends IRdmImportRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async apply(
    plan: RdmImportPlan,
    correctedById: string | null,
  ): Promise<RdmImportResult> {
    if (plan.creates.length === 0 && plan.updates.length === 0) {
      return { itemsCreated: 0, itemsUpdated: 0, scoresWritten: 0 }
    }

    return this.prisma.$transaction(async (tx) => {
      let itemsCreated = 0
      let itemsUpdated = 0
      let scoresWritten = 0

      for (const item of plan.creates) {
        const created = await tx.assessmentItem.create({
          data: {
            teachingAssignmentId: plan.teachingAssignmentId,
            name: item.name,
            type: item.type,
            maxScore: RDM_DEFAULT_MAX_SCORE,
            material: item.material,
            kktp: item.kktp,
          },
          select: { id: true },
        })
        itemsCreated += 1

        if (item.scores.length > 0) {
          const { saved } = await upsertScores(
            tx,
            created.id,
            item.scores,
            correctedById,
            true,
          )
          scoresWritten += saved
        }
      }

      for (const item of plan.updates) {
        if (item.material !== undefined || item.kktp !== undefined) {
          await tx.assessmentItem.update({
            where: { id: item.itemId },
            data: {
              ...(item.material !== undefined && { material: item.material }),
              ...(item.kktp !== undefined && { kktp: item.kktp }),
            },
          })
          itemsUpdated += 1
        }

        if (item.scores.length > 0) {
          const { saved } = await upsertScores(
            tx,
            item.itemId,
            item.scores,
            correctedById,
            true,
          )
          scoresWritten += saved
        }
      }

      return { itemsCreated, itemsUpdated, scoresWritten }
    })
  }
}
