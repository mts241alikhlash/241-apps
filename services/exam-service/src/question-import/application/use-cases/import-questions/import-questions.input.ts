import type { QuestionType } from '../../../../question/domain/value-objects/question-content.js'
import type { SheetIdentity } from '../../../domain/import-sheet.js'

export interface ImportQuestionsInput {
  buffer: Buffer
  size: number
  fileName: string
  packageId: string
}

export interface ImportQuestionsResult {
  created: number
  questionIds: string[]
  errors: { row: number; reason: string }[]
}

export interface ImportPreview {
  identity: SheetIdentity
  authorName: string | null
  counts: Record<QuestionType, number>
  totalPoints: number
  total: number
  errors: { row: number; reason: string }[]
  warnings: string[]
  duplicateRows: number[]
  canSave: boolean
}
