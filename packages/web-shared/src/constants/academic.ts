export const GRADE_LEVELS = ['VII', 'VIII', 'IX'] as const
export type GradeLevel = (typeof GRADE_LEVELS)[number]
