import type { GradingItem } from '@/features/exam-grading/types'

export interface GradingSheetStudent {
  key: string
  studentId: string
  name: string | null
  participantNumber: string | null
  status?: string
  rawScore?: number | null
  maxScore?: number | null
  items: GradingItem[]
}
