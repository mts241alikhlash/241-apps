import type { AssessmentType } from '@mts241alikhlash/nest-core/domain'

export interface RdmImportScoreRecord {
  enrollmentId: string
  score: number
}

export interface RdmImportCreatePlan {
  sheetName: string
  name: string
  type: AssessmentType
  material: string | null
  kktp: number | null
  scores: RdmImportScoreRecord[]
}

export interface RdmImportUpdatePlan {
  itemId: string
  material?: string
  kktp?: number
  scores: RdmImportScoreRecord[]
}

export interface RdmImportPlan {
  teachingAssignmentId: string
  creates: RdmImportCreatePlan[]
  updates: RdmImportUpdatePlan[]
}

export interface RdmImportResult {
  itemsCreated: number
  itemsUpdated: number
  scoresWritten: number
}

export abstract class IRdmImportRepository {
  abstract apply(
    plan: RdmImportPlan,
    correctedById: string | null,
  ): Promise<RdmImportResult>
}
