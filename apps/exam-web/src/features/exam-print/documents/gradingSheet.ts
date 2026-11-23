import type { GradingItem } from '@/features/exam-grading/types'

export interface GradingSheetStudent {
  key: string
  studentId: string
  name: string | null
  participantNumber: string | null
  items: GradingItem[]
}
