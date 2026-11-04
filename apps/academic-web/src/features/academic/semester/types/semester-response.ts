export interface RolloverCategoryResult {
  created: number
  skipped: number
}

export interface RolloverSummary {
  classes: RolloverCategoryResult
  enrollments: RolloverCategoryResult
  supervisors: RolloverCategoryResult
  teachingAssignments: RolloverCategoryResult
  schedules: RolloverCategoryResult
}

export type PromotionAction = 'PROMOTE' | 'REPEAT'

export interface PromotionRecommendationItem {
  studentId: string
  studentName: string
  nis: string
  sourceClassroomId: string
  sourceClassroomName: string
  sourceLevel: string
  recommendedAction: PromotionAction
  targetClassroomId?: string
  targetClassroomName?: string
  targetLevel?: string
  averageScore?: number | null
}

export interface PromotionRecommendationResponse {
  items: PromotionRecommendationItem[]
  totalStudents: number
  excludedGraduatingCount: number
}

export interface PromotionStudentDecision {
  studentId: string
  sourceClassroomId: string
  targetClassroomId?: string
  action: PromotionAction
  approved: boolean
  declineReason?: string
}

export interface PromotionPreviewResponse {
  items: { action: PromotionAction; studentCount: number }[]
  totalStudents: number
  promotedCount: number
  repeatedCount: number
}

export interface PromotionResult {
  promoted: number
  repeated: number
  skipped: number
}

export interface RolloverSummaryRow {
  label: string
  created: number
  skipped: number
}
